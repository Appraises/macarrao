import crypto from 'crypto';
import path from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { GAME_UPLOAD_DIR, MAP_UPLOAD_DIR, NEWS_UPLOAD_DIR, TERM_UPLOAD_DIR } from '../utils/uploads';
import {
    MEDIA_DRIVER, MEDIA_S3_ACCESS_KEY_ID, MEDIA_S3_BUCKET, MEDIA_S3_ENDPOINT,
    MEDIA_S3_PUBLIC_URL, MEDIA_S3_REGION, MEDIA_S3_SECRET_ACCESS_KEY,
} from '../utils/config';

export type MediaFolder = 'games' | 'maps' | 'news' | 'terms';

const uploadDirectories: Record<MediaFolder, string> = {
    games: GAME_UPLOAD_DIR,
    maps: MAP_UPLOAD_DIR,
    news: NEWS_UPLOAD_DIR,
    terms: TERM_UPLOAD_DIR
};

/* --------------------------- Type detection ------------------------------- */

/** Trust the bytes, never the client-sent mimetype or the filename. */
export const detectImageType = (buffer: Buffer): { extension: string; mimeType: string } | null => {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return { extension: 'png', mimeType: 'image/png' };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { extension: 'jpg', mimeType: 'image/jpeg' };
    }
    if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
        return { extension: 'gif', mimeType: 'image/gif' };
    }
    if (
        buffer.length >= 12
        && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return { extension: 'webp', mimeType: 'image/webp' };
    }
    return null;
};

/* ------------------------------- Drivers ---------------------------------- */

export interface StoredMedia {
    /** Path appended to the API base for local, or an absolute URL for remote. */
    pathname: string;
    mimeType: string;
    size: number;
}

interface StorageDriver {
    readonly name: string;
    put(key: string, body: Buffer, mimeType: string): Promise<string>;
    remove(key: string): Promise<void>;
}

/**
 * Files on the server's own disk. Fine for a VPS with persistent storage, but on an
 * ephemeral host (Vercel/Render/Railway containers) every deploy wipes them, and with
 * more than one instance an upload only exists on the machine that received it.
 */
const localDriver: StorageDriver = {
    name: 'local',
    async put(key, body) {
        const [folder, filename] = key.split('/');
        const directory = uploadDirectories[folder as MediaFolder];
        await mkdir(directory, { recursive: true });
        await writeFile(path.join(directory, filename), body, { flag: 'wx' });
        return `/uploads/${key}`;
    },
    async remove(key) {
        const [folder, filename] = key.split('/');
        await unlink(path.join(uploadDirectories[folder as MediaFolder], filename));
    },
};

/**
 * Any S3-compatible bucket — AWS S3, Cloudflare R2, Backblaze B2, MinIO. Survives
 * deploys and is shared across instances, which is what makes horizontal scaling
 * possible. Set MEDIA_S3_ENDPOINT for non-AWS providers.
 */
const createS3Driver = (): StorageDriver => {
    // Imported lazily so the SDK is never loaded when running on local storage.
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
        region: MEDIA_S3_REGION,
        ...(MEDIA_S3_ENDPOINT ? { endpoint: MEDIA_S3_ENDPOINT, forcePathStyle: true } : {}),
        credentials: { accessKeyId: MEDIA_S3_ACCESS_KEY_ID, secretAccessKey: MEDIA_S3_SECRET_ACCESS_KEY },
    });
    const base = MEDIA_S3_PUBLIC_URL.replace(/\/$/, '');

    return {
        name: 's3',
        async put(key, body, mimeType) {
            await client.send(new PutObjectCommand({
                Bucket: MEDIA_S3_BUCKET,
                Key: key,
                Body: body,
                ContentType: mimeType,
                CacheControl: 'public, max-age=31536000, immutable',
            }));
            return `${base}/${key}`;
        },
        async remove(key) {
            await client.send(new DeleteObjectCommand({ Bucket: MEDIA_S3_BUCKET, Key: key }));
        },
    };
};

let driver: StorageDriver | null = null;
const getDriver = (): StorageDriver => {
    if (!driver) driver = MEDIA_DRIVER === 's3' ? createS3Driver() : localDriver;
    return driver;
};

/** Which backend is in use — surfaced at boot so the choice is never a surprise. */
export const activeMediaDriver = () => (MEDIA_DRIVER === 's3' ? 's3' : 'local');

/* -------------------------------- Public ---------------------------------- */

/**
 * Final public URL for a stored file. The local driver returns a path that still
 * needs the API origin in front; the S3 driver already returns an absolute URL.
 * Callers use this instead of concatenating, so switching drivers changes nothing
 * for them.
 */
export const resolveMediaUrl = (pathname: string, baseUrl: string) =>
    /^https?:\/\//.test(pathname) ? pathname : `${baseUrl}${pathname}`;

export const storeImage = async (file: Express.Multer.File, folder: MediaFolder): Promise<StoredMedia | null> => {
    const detected = detectImageType(file.buffer);
    if (!detected) return null;

    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${detected.extension}`;
    const pathname = await getDriver().put(key, file.buffer, detected.mimeType);

    return { pathname, mimeType: detected.mimeType, size: file.size };
};

export const removeUploadedMedia = async (mediaUrl: string | null | undefined, folder: MediaFolder) => {
    if (!mediaUrl) return;

    try {
        // Works for both shapes: a local "/uploads/<folder>/<file>" path and an
        // absolute remote URL that ends in "<folder>/<file>".
        const pathname = mediaUrl.startsWith('http') ? new URL(mediaUrl).pathname : mediaUrl;
        const filename = path.basename(pathname);
        if (!filename || !pathname.includes(`/${folder}/`)) return;
        // Only delete files this app stored: an external cover URL that happens
        // to contain "/<folder>/" must never map to one of our objects.
        const s3Base = MEDIA_S3_PUBLIC_URL.replace(/\/$/, '');
        const ownLocal = pathname.startsWith(`/uploads/${folder}/`);
        const ownRemote = Boolean(s3Base) && mediaUrl.startsWith(`${s3Base}/${folder}/`);
        if (!ownLocal && !ownRemote) return;
        await getDriver().remove(`${folder}/${filename}`);
    } catch (error: any) {
        // A file that is already gone is not a failure worth shouting about.
        if (error?.code !== 'ENOENT' && error?.name !== 'NoSuchKey') {
            console.error(`[media] Failed to remove ${folder} upload:`, error?.message || error);
        }
    }
};
