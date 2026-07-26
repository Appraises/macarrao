import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TermStatus } from '@prisma/client';

const mocks = vi.hoisted(() => ({
    termFindUnique: vi.fn(),
    termFindFirst: vi.fn(),
    termUpdate: vi.fn(),
    meaningFindMany: vi.fn(),
    meaningFindFirst: vi.fn(),
    meaningFindUnique: vi.fn(),
    meaningCreate: vi.fn(),
    meaningUpdate: vi.fn(),
    meaningDelete: vi.fn(),
    meaningCount: vi.fn(),
    voteFindUnique: vi.fn(),
    voteCreate: vi.fn(),
    voteUpdate: vi.fn(),
    voteDelete: vi.fn(),
    voteCount: vi.fn(),
    voteFindMany: vi.fn(),
    gameFindUnique: vi.fn(),
    evaluateBadges: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => {
    const prisma: any = {
        term: { findUnique: mocks.termFindUnique, findFirst: mocks.termFindFirst, update: mocks.termUpdate },
        termMeaning: {
            findMany: mocks.meaningFindMany,
            findFirst: mocks.meaningFindFirst,
            findUnique: mocks.meaningFindUnique,
            create: mocks.meaningCreate,
            update: mocks.meaningUpdate,
            delete: mocks.meaningDelete,
            count: mocks.meaningCount,
        },
        termVote: {
            findUnique: mocks.voteFindUnique,
            create: mocks.voteCreate,
            update: mocks.voteUpdate,
            delete: mocks.voteDelete,
            count: mocks.voteCount,
            findMany: mocks.voteFindMany,
        },
        game: { findUnique: mocks.gameFindUnique },
    };
    prisma.$transaction = vi.fn(async (callback: any) => callback(prisma));
    return { prisma };
});

vi.mock('../src/services/badges', () => ({ evaluateBadges: mocks.evaluateBadges }));

import {
    parseInflections,
    parseMeaningPayload,
    parseRegister,
    parseWordClass,
    proposeTermMeaning,
    syncTermFromMeanings,
    voteOnMeaning,
    TermMeaningError,
} from '../src/services/termMeanings';

const meaning = (over: Partial<any> = {}) => ({
    id: 'm1', termId: 'term-1', definition: 'Emboscar um inimigo com ajuda de aliados.',
    examples: [], gameId: 'game-1', context: null, order: 1,
    upvotes: 0, downvotes: 0, status: TermStatus.APPROVED, authorId: 'user-1',
    wordClass: null, register: null, inflections: [],
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), ...over,
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.gameFindUnique.mockResolvedValue({ id: 'game-1' });
    mocks.termUpdate.mockResolvedValue({ id: 'term-1' });
    mocks.meaningFindMany.mockResolvedValue([]);
    mocks.evaluateBadges.mockResolvedValue([]);
});

describe('parsing the linguistic layer', () => {
    it('keeps only well-formed inflections and drops duplicates', () => {
        const result = parseInflections([
            { label: 'infinitivo', form: 'gankar' },
            { label: 'passado', form: 'GANKAR' }, // same form, different case
            { label: 'sem forma', form: '   ' },  // empty
            'lixo',                                // not an object
            { form: 'gankado' },                   // missing label
        ]);
        expect(result).toEqual([
            { label: 'infinitivo', form: 'gankar' },
            { label: 'forma', form: 'gankado' },
        ]);
    });

    it('rejects unknown word classes and registers instead of trusting the client', () => {
        expect(parseWordClass('VERBO')).toBe('VERBO');
        expect(parseWordClass('verbo')).toBe('VERBO');
        expect(parseWordClass('SUBSTANTIVO_FALSO')).toBeNull();
        expect(parseRegister('OFENSIVO')).toBe('OFENSIVO');
        expect(parseRegister('qualquer')).toBeNull();
    });

    it('requires a definition long enough to be useful', () => {
        expect(() => parseMeaningPayload({ definition: 'curto' })).toThrow(TermMeaningError);
    });
});

describe('term denormalization', () => {
    it('mirrors the top-voted approved sense onto the term', async () => {
        mocks.meaningFindMany.mockResolvedValue([
            meaning({ id: 'm1', definition: 'Sentido menos votado', upvotes: 2, gameId: 'game-1' }),
            meaning({ id: 'm2', definition: 'Sentido campeao', upvotes: 40, order: 2, gameId: 'game-2' }),
        ]);

        await syncTermFromMeanings('term-1');

        const data = mocks.termUpdate.mock.calls[0][0].data;
        expect(data.definition).toBe('Sentido campeao');
        expect(data.upvotes).toBe(40);
        // Every game across senses, so the catalog filter finds the term by any of them.
        expect(new Set(data.gameIds)).toEqual(new Set(['game-1', 'game-2']));
    });

    it('never blanks the term when no sense is approved yet', async () => {
        mocks.meaningFindMany.mockResolvedValue([]);

        await syncTermFromMeanings('term-1');

        const data = mocks.termUpdate.mock.calls[0][0].data;
        expect(data).not.toHaveProperty('definition');
        expect(data.gameIds).toEqual([]);
    });
});

describe('proposing a sense', () => {
    const content = {
        definition: 'Atacar cedo demais para encerrar a partida.',
        examples: [], gameId: 'game-1', context: null,
        wordClass: null, register: null, inflections: [],
    };

    it('lands as PENDING so the published term is untouched', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });
        mocks.meaningFindFirst
            .mockResolvedValueOnce(null)            // no duplicate pending proposal
            .mockResolvedValueOnce({ order: 2 });   // highest existing order
        mocks.meaningCreate.mockResolvedValue(meaning({ status: TermStatus.PENDING }));

        await proposeTermMeaning('term-1', 'user-2', content);

        const data = mocks.meaningCreate.mock.calls[0][0].data;
        expect(data.status).toBe(TermStatus.PENDING);
        expect(data.order).toBe(3);
        expect(data.authorId).toBe('user-2');
    });

    it('blocks a second pending proposal from the same author', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });
        mocks.meaningFindFirst.mockResolvedValueOnce({ id: 'pending-1' });

        await expect(proposeTermMeaning('term-1', 'user-2', content))
            .rejects.toMatchObject({ status: 409 });
        expect(mocks.meaningCreate).not.toHaveBeenCalled();
    });

    it('refuses a term that is not published', async () => {
        mocks.termFindFirst.mockResolvedValue(null);

        await expect(proposeTermMeaning('ghost', 'user-2', content))
            .rejects.toMatchObject({ status: 404 });
    });
});

describe('voting on a sense', () => {
    beforeEach(() => {
        mocks.meaningFindFirst.mockResolvedValue({ id: 'm1', termId: 'term-1' });
        mocks.meaningUpdate.mockResolvedValue(meaning());
    });

    it('creates the vote and recomputes counts from the votes table', async () => {
        mocks.voteFindUnique.mockResolvedValue(null);
        mocks.voteCount.mockResolvedValueOnce(5).mockResolvedValueOnce(1);

        const result = await voteOnMeaning('m1', 'user-9', 1);

        expect(mocks.voteCreate).toHaveBeenCalled();
        expect(result).toMatchObject({ upvotes: 5, downvotes: 1, score: 4, myVote: 1 });
    });

    it('undoes the vote when the same direction is clicked again', async () => {
        mocks.voteFindUnique.mockResolvedValue({ id: 'v1', value: 1 });
        mocks.voteCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

        const result = await voteOnMeaning('m1', 'user-9', 1);

        expect(mocks.voteDelete).toHaveBeenCalledWith({ where: { id: 'v1' } });
        expect(result.myVote).toBe(0);
    });

    it('flips the vote instead of duplicating it', async () => {
        mocks.voteFindUnique.mockResolvedValue({ id: 'v1', value: -1 });
        mocks.voteCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

        const result = await voteOnMeaning('m1', 'user-9', 1);

        expect(mocks.voteUpdate).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { value: 1 } });
        expect(mocks.voteCreate).not.toHaveBeenCalled();
        expect(result.myVote).toBe(1);
    });

    it('refuses to vote on a sense that is not published', async () => {
        mocks.meaningFindFirst.mockResolvedValue(null);

        await expect(voteOnMeaning('m1', 'user-9', 1)).rejects.toMatchObject({ status: 404 });
    });
});
