import { describe, expect, it } from 'vitest';
import { sanitizeNewsHtml, validateNewsPayload } from '../src/utils/news';

describe('news HTML security', () => {
    it('removes scripts, event handlers and unsafe URLs', () => {
        const html = sanitizeNewsHtml(`
            <h2 onclick="alert(1)">Titulo</h2>
            <script>alert('xss')</script>
            <a href="javascript:alert(1)" target="_blank">link</a>
            <img src="https://example.com/image.png" onerror="alert(1)">
        `);

        expect(html).toContain('<h2>Titulo</h2>');
        expect(html).toContain('https://example.com/image.png');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('onclick');
        expect(html).not.toContain('onerror');
        expect(html).not.toContain('javascript:');
    });

    it('normalizes fields and sanitizes content before persistence', () => {
        const result = validateNewsPayload({
            headline: '<strong>  Atualizacao importante  </strong>',
            category: ' Geral ',
            author: ' Admin ',
            image: 'https://example.com/cover.webp',
            content: '<p>Conteudo editorial suficientemente longo.</p><iframe src="https://evil.example"></iframe>'
        }, 'Fallback');

        expect(result.valid).toBe(true);
        if (!result.valid) return;
        expect(result.data.headline).toBe('Atualizacao importante');
        expect(result.data.category).toBe('Geral');
        expect(result.data.content).not.toContain('iframe');
    });

    it('rejects non-HTTP cover URLs', () => {
        const result = validateNewsPayload({
            headline: 'Titulo valido',
            category: 'Geral',
            author: 'Admin',
            image: 'javascript:alert(1)',
            content: '<p>Conteudo editorial suficientemente longo.</p>'
        }, 'Fallback');

        expect(result.valid).toBe(false);
    });

    it('requires a future date for scheduled news', () => {
        const result = validateNewsPayload({
            headline: 'Noticia programada valida',
            category: 'Geral',
            author: 'Admin',
            content: '<p>Conteudo editorial suficientemente longo.</p>',
            status: 'SCHEDULED',
            scheduledAt: new Date(Date.now() - 60_000).toISOString()
        }, 'Fallback');

        expect(result.valid).toBe(false);
    });

    it('normalizes slug and publication state', () => {
        const result = validateNewsPayload({
            headline: 'Atualizacao de Verao',
            category: 'Geral',
            content: '<p>Conteudo editorial suficientemente longo.</p>',
            status: 'PUBLISHED'
        }, 'Equipe');

        expect(result.valid).toBe(true);
        if (!result.valid) return;
        expect(result.data.slug).toBe('atualizacao-de-verao');
        expect(result.data.status).toBe('PUBLISHED');
        expect(result.data.publishedAt).toBeInstanceOf(Date);
    });
});
