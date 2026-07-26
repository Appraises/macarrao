import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    userCount: vi.fn(),
    termCount: vi.fn(),
    termFindFirst: vi.fn(),
    termFindMany: vi.fn(),
    commentCount: vi.fn(),
    meaningCount: vi.fn(),
    badgeFindMany: vi.fn(),
    badgeCreateMany: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: { findUnique: mocks.userFindUnique, count: mocks.userCount },
        term: { count: mocks.termCount, findFirst: mocks.termFindFirst, findMany: mocks.termFindMany },
        comment: { count: mocks.commentCount },
        termMeaning: { count: mocks.meaningCount },
        userBadge: { findMany: mocks.badgeFindMany, createMany: mocks.badgeCreateMany },
    },
}));

import { BADGES, collectBadgeStats, evaluateBadges } from '../src/services/badges';

/** Baseline: a brand-new account that has done nothing. */
const blankStats = () => {
    mocks.userFindUnique.mockResolvedValue({ level: 1, createdAt: new Date('2026-01-01') });
    mocks.termCount.mockResolvedValue(0);
    mocks.termFindFirst.mockResolvedValue(null);
    mocks.termFindMany.mockResolvedValue([]);
    mocks.commentCount.mockResolvedValue(0);
    mocks.meaningCount.mockResolvedValue(0);
    mocks.userCount.mockResolvedValue(5_000); // far from being an early member
};

beforeEach(() => {
    vi.clearAllMocks();
    blankStats();
    mocks.badgeFindMany.mockResolvedValue([]);
    mocks.badgeCreateMany.mockResolvedValue({ count: 0 });
});

describe('badge catalog', () => {
    it('has unique ids — duplicates would break the unique(userId, badgeId) grant', () => {
        const ids = BADGES.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('gives a brand-new account nothing to show', () => {
        const stats = {
            approvedTerms: 0, topTermUpvotes: 0, distinctGames: 0, comments: 0,
            hasInflections: false, hasRegister: false, addedSecondarySense: false,
            level: 1, isPioneer: false,
        };
        expect(BADGES.filter((b) => b.earned(stats))).toHaveLength(0);
    });

    it('unlocks tiers cumulatively as contributions grow', () => {
        const at = (approvedTerms: number) => BADGES
            .filter((b) => b.earned({
                approvedTerms, topTermUpvotes: 0, distinctGames: 0, comments: 0,
                hasInflections: false, hasRegister: false, addedSecondarySense: false,
                level: 1, isPioneer: false,
            }))
            .map((b) => b.id);

        expect(at(1)).toContain('estreante');
        expect(at(10)).toEqual(expect.arrayContaining(['estreante', 'colaborador']));
        expect(at(100)).toEqual(expect.arrayContaining(['estreante', 'colaborador', 'autor', 'lexicografo']));
    });
});

describe('collectBadgeStats', () => {
    it('counts distinct games and ignores terms with no game', async () => {
        mocks.termFindMany.mockResolvedValue([
            { gameId: 'a' }, { gameId: 'a' }, { gameId: 'b' }, { gameId: null },
        ]);

        const stats = await collectBadgeStats('user-1');

        expect(stats.distinctGames).toBe(2);
    });

    it('marks early accounts as pioneers and later ones not', async () => {
        mocks.userCount.mockResolvedValue(3);
        expect((await collectBadgeStats('user-1')).isPioneer).toBe(true);

        mocks.userCount.mockResolvedValue(500);
        expect((await collectBadgeStats('user-1')).isPioneer).toBe(false);
    });

    it('reads the top term score for the popularity badges', async () => {
        mocks.termFindFirst.mockResolvedValue({ upvotes: 512 });

        expect((await collectBadgeStats('user-1')).topTermUpvotes).toBe(512);
    });
});

describe('evaluateBadges', () => {
    it('grants only what is newly qualified and skips what is already owned', async () => {
        mocks.termCount.mockResolvedValue(10);           // estreante + colaborador
        mocks.badgeFindMany.mockResolvedValue([{ badgeId: 'estreante' }]);

        const granted = await evaluateBadges('user-1');

        expect(granted).toEqual(['colaborador']);
        expect(mocks.badgeCreateMany).toHaveBeenCalledWith({
            data: [{ userId: 'user-1', badgeId: 'colaborador' }],
            skipDuplicates: true,
        });
    });

    it('is a no-op when nothing new was earned', async () => {
        mocks.termCount.mockResolvedValue(1);
        mocks.badgeFindMany.mockResolvedValue([{ badgeId: 'estreante' }]);

        expect(await evaluateBadges('user-1')).toEqual([]);
        expect(mocks.badgeCreateMany).not.toHaveBeenCalled();
    });

    it('unlocks the linguistic badges from approved senses', async () => {
        // hasInflections, hasRegister and addedSecondarySense all read termMeaning.count
        mocks.meaningCount.mockResolvedValue(1);

        const granted = await evaluateBadges('user-1');

        expect(granted).toEqual(expect.arrayContaining(['gramatico', 'etiquetador', 'multifacetado']));
    });
});
