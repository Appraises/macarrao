import { describe, expect, it } from 'vitest';
import { normalizeTextList, validateCommentPayload, validateProfilePayload } from '../src/utils/userInput';

describe('user-controlled input validation', () => {
    it('sanitizes profile text and accepts only known boolean preferences', () => {
        const result = validateProfilePayload({
            name: '  <b>Jogador</b>  ',
            avatar: 'https://example.com/avatar.png',
            description: '<script>alert(1)</script> Curto jogos competitivos.',
            favoriteGameId: '',
            preferences: { publicProfile: true, emailNotifications: false }
        });

        expect(result.valid).toBe(true);
        if (!result.valid) return;
        expect(result.data.name).toBe('Jogador');
        expect(result.data.description).not.toContain('<script');
        expect(result.data.favoriteGameId).toBeNull();
    });

    it('rejects unsafe avatars and arbitrary preference keys', () => {
        expect(validateProfilePayload({ avatar: 'javascript:alert(1)' }).valid).toBe(false);
        expect(validateProfilePayload({ preferences: { isAdmin: true } }).valid).toBe(false);
    });

    it('normalizes comments to plain text and enforces length', () => {
        const valid = validateCommentPayload({ content: '<strong>Boa noticia!</strong>', newsId: 'news-1' });
        expect(valid).toEqual({ valid: true, data: { content: 'Boa noticia!', newsId: 'news-1' } });
        expect(validateCommentPayload({ content: 'x', newsId: 'news-1' }).valid).toBe(false);
        expect(validateCommentPayload({ content: 'a'.repeat(1001), newsId: 'news-1' }).valid).toBe(false);
    });

    it('deduplicates bounded plain-text lists', () => {
        const result = normalizeTextList([' <b>ace</b> ', 'ace', 'clutch'], 'Tags', { maxItems: 3, maxLength: 20 });
        expect(result).toEqual({ valid: true, data: ['ace', 'clutch'] });
        expect(normalizeTextList(['a', 'b', 'c', 'd'], 'Tags', { maxItems: 3, maxLength: 20 }).valid).toBe(false);
    });
});
