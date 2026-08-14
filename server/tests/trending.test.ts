import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    calculateTrendScore,
    compareTrendingTerms,
    trendDirection,
    type RankedTrend,
    type TrendSignals,
} from '../src/services/trendingTerms';
import {
    consumeEngagementBudget,
    engagementBucket,
    hasClientEvent,
    isLikelyAutomatedRequest,
    resetEngagementBudgetsForTests,
    resolveViewerHash,
} from '../src/services/analytics/viewerIdentity';

const signals = (overrides: Partial<TrendSignals> = {}): TrendSignals => ({
    uniqueViews6h: 0,
    uniqueViews24h: 0,
    successfulSearches24h: 0,
    recentUpvotes24h: 0,
    uniqueShares24h: 0,
    previousUniqueViews6h: 0,
    ...overrides,
});

beforeEach(() => {
    vi.useRealTimers();
    resetEngagementBudgetsForTests();
});

describe('trending score', () => {
    it('combines recent signals and rewards absolute six-hour growth', () => {
        expect(calculateTrendScore(signals({
            uniqueViews6h: 10,
            uniqueViews24h: 14,
            successfulSearches24h: 3,
            recentUpvotes24h: 2,
            uniqueShares24h: 1,
            previousUniqueViews6h: 6,
        }))).toBe(98);
    });

    it('does not award a negative growth bonus', () => {
        expect(calculateTrendScore(signals({ uniqueViews6h: 2, previousUniqueViews6h: 8 }))).toBe(8);
        expect(trendDirection(signals({ uniqueViews6h: 2, previousUniqueViews6h: 8 }))).toBe('down');
    });

    it('uses stable score, view, search, word and id tie breakers', () => {
        const row = (id: string, word: string, score: number, values: Partial<TrendSignals> = {}): RankedTrend => ({
            id, word, trendScore: score, trendSignals: signals(values),
        });
        const rows = [
            row('b', 'Zerar', 20, { uniqueViews24h: 4 }),
            row('c', 'Ace', 20, { uniqueViews24h: 4, successfulSearches24h: 2 }),
            row('a', 'Buff', 20, { uniqueViews24h: 4, successfulSearches24h: 2 }),
            row('d', 'Carry', 30),
        ];
        expect(rows.sort(compareTrendingTerms).map((item) => item.id)).toEqual(['d', 'c', 'a', 'b']);
    });
});

describe('anonymous engagement identity', () => {
    it('uses stable thirty-minute UTC buckets', () => {
        expect(engagementBucket(new Date('2026-08-14T12:44:59.000Z')).toISOString()).toBe('2026-08-14T12:30:00.000Z');
    });

    it('reuses a valid signed cookie without exposing the raw id as its hash', () => {
        const appended: string[] = [];
        const firstReq = { get: (name: string) => name.toLowerCase() === 'cookie' ? undefined : 'Mozilla/5.0' } as any;
        const res = { append: (_name: string, value: string) => { appended.push(value); } } as any;
        const firstHash = resolveViewerHash(firstReq, res);
        const cookie = appended[0].split(';')[0];
        const secondReq = { get: (name: string) => name.toLowerCase() === 'cookie' ? cookie : 'Mozilla/5.0' } as any;
        const secondHash = resolveViewerHash(secondReq, { append: vi.fn() } as any);
        expect(secondHash).toBe(firstHash);
        expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
        expect(cookie).not.toContain(firstHash);
    });

    it('requires the browser event header, rejects bots and limits bursts per anonymous hash', () => {
        const browser = { get: (name: string) => ({
            'x-client-event': 'term-view',
            'user-agent': 'Mozilla/5.0 Chrome/140',
        } as Record<string, string>)[name.toLowerCase()] } as any;
        const bot = { get: (name: string) => name.toLowerCase() === 'user-agent' ? 'Googlebot/2.1' : undefined } as any;
        expect(hasClientEvent(browser, 'term-view')).toBe(true);
        expect(isLikelyAutomatedRequest(browser)).toBe(false);
        expect(isLikelyAutomatedRequest(bot)).toBe(true);
        expect(consumeEngagementBudget('hash', 'term-view', 2, 1_000, 0)).toBe(true);
        expect(consumeEngagementBudget('hash', 'term-view', 2, 1_000, 1)).toBe(true);
        expect(consumeEngagementBudget('hash', 'term-view', 2, 1_000, 2)).toBe(false);
        expect(consumeEngagementBudget('hash', 'term-view', 2, 1_000, 1_001)).toBe(true);
    });
});
