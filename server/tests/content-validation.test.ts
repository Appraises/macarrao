import { describe, expect, it } from 'vitest';
import { validateGamePayload } from '../src/utils/games';
import { validateMapPayload } from '../src/utils/maps';

describe('admin content validation', () => {
    it('normalizes a game and rejects unsafe media URLs', () => {
        const valid = validateGamePayload({
            name: 'Counter Strike 2',
            genre: 'FPS',
            image: 'https://example.com/cs2.webp',
            status: 'PUBLISHED'
        });
        expect(valid.valid).toBe(true);
        if (valid.valid) expect(valid.data.slug).toBe('counter-strike-2');

        const invalid = validateGamePayload({
            name: 'CS2', genre: 'FPS', image: 'javascript:alert(1)', status: 'PUBLISHED'
        });
        expect(invalid.valid).toBe(false);
    });

    it('validates map callout coordinates and types', () => {
        const base = {
            gameId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Mirage',
            image: 'https://example.com/mirage.webp',
            status: 'DRAFT'
        };

        expect(validateMapPayload({
            ...base,
            callouts: [{ name: 'Bomb A', x: 42.5, y: 18, type: 'Site' }]
        }).valid).toBe(true);

        expect(validateMapPayload({
            ...base,
            callouts: [{ name: 'Fora', x: 101, y: 18, type: 'Site' }]
        }).valid).toBe(false);

        expect(validateMapPayload({
            ...base,
            callouts: [{ name: 'Tipo', x: 10, y: 18, type: 'Danger' }]
        }).valid).toBe(false);
    });
});
