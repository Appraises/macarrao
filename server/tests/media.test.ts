import { describe, expect, it, vi } from 'vitest';

// Default (local) driver: no S3 config in play.
vi.mock('../src/utils/config', () => ({
    MEDIA_DRIVER: 'local',
    MEDIA_S3_BUCKET: '', MEDIA_S3_REGION: 'auto', MEDIA_S3_ENDPOINT: '',
    MEDIA_S3_ACCESS_KEY_ID: '', MEDIA_S3_SECRET_ACCESS_KEY: '', MEDIA_S3_PUBLIC_URL: '',
}));

import { activeMediaDriver, detectImageType, resolveMediaUrl } from '../src/services/media';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const gif = Buffer.from('GIF89a....', 'ascii');
const webp = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii')]);

describe('image type detection', () => {
    it('identifies formats from their magic bytes, not the filename', () => {
        expect(detectImageType(png)).toMatchObject({ extension: 'png', mimeType: 'image/png' });
        expect(detectImageType(jpg)).toMatchObject({ extension: 'jpg', mimeType: 'image/jpeg' });
        expect(detectImageType(gif)).toMatchObject({ extension: 'gif', mimeType: 'image/gif' });
        expect(detectImageType(webp)).toMatchObject({ extension: 'webp', mimeType: 'image/webp' });
    });

    it('rejects anything else — this is what stops a renamed executable', () => {
        expect(detectImageType(Buffer.from('MZ\x90\x00 fake exe', 'binary'))).toBeNull();
        expect(detectImageType(Buffer.from('<?php echo 1; ?>', 'ascii'))).toBeNull();
        expect(detectImageType(Buffer.alloc(0))).toBeNull();
    });

    it('does not mistake a truncated header for a valid image', () => {
        expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
        expect(detectImageType(Buffer.from('RIFF', 'ascii'))).toBeNull(); // RIFF but no WEBP tag
    });
});

describe('public URL resolution', () => {
    it('prefixes the API origin for local paths', () => {
        expect(resolveMediaUrl('/uploads/terms/a.png', 'https://api.test'))
            .toBe('https://api.test/uploads/terms/a.png');
    });

    it('leaves an already-absolute remote URL untouched', () => {
        // The S3 driver returns the final CDN URL; prefixing it would corrupt it.
        expect(resolveMediaUrl('https://cdn.test/terms/a.png', 'https://api.test'))
            .toBe('https://cdn.test/terms/a.png');
        expect(resolveMediaUrl('http://cdn.test/terms/a.png', 'https://api.test'))
            .toBe('http://cdn.test/terms/a.png');
    });
});

describe('driver selection', () => {
    it('defaults to local storage', () => {
        expect(activeMediaDriver()).toBe('local');
    });
});
