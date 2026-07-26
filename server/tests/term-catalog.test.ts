import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    queryRaw: vi.fn(),
    termFindMany: vi.fn()
}));

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        $queryRaw: mocks.queryRaw,
        term: { findMany: mocks.termFindMany }
    }
}));

import { getCatalogMeta, listCatalogTerms, normalizeCatalogSearch } from '../src/services/termCatalog';

const sqlText = (callIndex: number) => {
    const query = mocks.queryRaw.mock.calls[callIndex][0] as { strings?: readonly string[] } | readonly string[];
    if (Array.isArray(query)) return query.join('?');
    return query.strings?.join('?') || '';
};

beforeEach(() => vi.clearAllMocks());

describe('term catalog search', () => {
    it('normalizes accents, case and repeated whitespace', () => {
        expect(normalizeCatalogSearch('  ESTRATÉGIA   TÁTICA  ')).toBe('estrategia tatica');
    });

    it('builds ranked fuzzy search with combined filters and preserves SQL order', async () => {
        mocks.queryRaw
            .mockResolvedValueOnce([{ id: 'term-b', relevance: 800 }, { id: 'term-a', relevance: 400 }])
            .mockResolvedValueOnce([{ count: 2 }]);
        mocks.termFindMany.mockResolvedValue([
            { id: 'term-a', word: 'Eco', game: null },
            { id: 'term-b', word: 'Estratégia', game: null }
        ]);

        const result = await listCatalogTerms({
            search: 'estrategiaa',
            gameId: 'game-1',
            tag: 'TÁTICA',
            letter: 'E',
            sort: 'relevance',
            order: 'desc',
            skip: 0,
            take: 24
        });

        expect(result.items.map((item) => item.id)).toEqual(['term-b', 'term-a']);
        expect(result.total).toBe(2);
        expect(sqlText(0)).toContain('CASE');
        expect(sqlText(0)).toContain('similarity');
        expect(sqlText(0)).toContain('ORDER BY');
        expect(sqlText(0)).toContain('"archivedAt" IS NULL');
        expect(sqlText(1)).toContain('>= 0.30');
        expect(mocks.queryRaw.mock.calls[1][0].values).toEqual(expect.arrayContaining([
            'game-1', 'tatica', 'e', 'estrategiaa'
        ]));
    });

    it('does not enable fuzzy matching for searches shorter than three characters', async () => {
        mocks.queryRaw
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ count: 0 }]);

        await listCatalogTerms({
            search: 'gg',
            sort: 'relevance',
            order: 'desc',
            skip: 0,
            take: 6
        });

        expect(sqlText(1)).not.toContain('similarity');
        expect(mocks.termFindMany).not.toHaveBeenCalled();
    });

    it('returns public catalog metadata from approved aggregates', async () => {
        mocks.queryRaw
            .mockResolvedValueOnce([{ count: 4 }])
            .mockResolvedValueOnce([{ count: 2 }])
            .mockResolvedValueOnce([{ id: 'game-1', name: 'Valorant', slug: 'valorant', count: 2 }])
            .mockResolvedValueOnce([{ name: 'Estratégia', count: 1 }])
            .mockResolvedValueOnce([{ letter: 'E', count: 1 }]);

        await expect(getCatalogMeta()).resolves.toEqual({
            total: 4,
            contributors: 2,
            games: [{ id: 'game-1', name: 'Valorant', slug: 'valorant', count: 2 }],
            tags: [{ name: 'Estratégia', count: 1 }],
            letters: [{ letter: 'E', count: 1 }]
        });
        expect(sqlText(0)).toContain('"archivedAt" IS NULL');
        expect(sqlText(1)).toContain('"archivedAt" IS NULL');
        expect(sqlText(2)).toContain('"archivedAt" IS NULL');
        expect(sqlText(3)).toContain('"archivedAt" IS NULL');
        expect(sqlText(4)).toContain('"archivedAt" IS NULL');
    });
});
