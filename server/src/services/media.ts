import crypto from 'crypto';
import path from 'path';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { GAME_UPLOAD_DIR, MAP_UPLOAD_DIR } from '../utils/uploads';

export type MediaFolder = 'games' | 'maps';

const uploadDirectories: Record<MediaFolder, string> = {
    games: GAME_UPLOAD_DIR,
    maps: MAP_UPLOAD_DIR
};

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

export const storeImage = async (file: Express.Multer.File, folder: MediaFolder) => {
    const detected = detectImageType(file.buffer);
    if (!detected) return null;

    const directory = uploadDirectories[folder];
    await mkdir(directory, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomUUID()}.${detected.extension}`;
    await writeFile(path.join(directory, filename), file.buffer, { flag: 'wx' });

    return {
        pathname: `/uploads/${folder}/${filename}`,
        mimeType: detected.mimeType,
        size: file.size
    };
};

export const removeUploadedMedia = async (mediaUrl: string | null | undefined, folder: MediaFolder) => {
    if (!mediaUrl) return;

    try {
        const pathname = mediaUrl.startsWith('http') ? new URL(mediaUrl).pathname : mediaUrl;
        if (!pathname.startsWith(`/uploads/${folder}/`)) return;
        await unlink(path.join(uploadDirectories[folder], path.basename(pathname)));
    } catch (error: any) {
        if (error?.code !== 'ENOENT') {
            console.error(`[media] Failed to remove ${folder} upload:`, error?.message || error);
        }
    }
};
