import { Prisma, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const TRENDING_CACHE_TTL_MS = 15 * 60 * 1000;
const RESULT_LIMIT = 8;

export interface TrendSignals {
    uniqueViews6h: number;
    uniqueViews24h: number;
    successfulSearches24h: number;
    recentUpvotes24h: number;
    uniqueShares24h: number;
    previousUniqueViews6h: number;
}

type AggregateRow = { termId: string; count: number | bigint };

const number = (value: number | bigint | undefined) => Number(value || 0);

export const calculateTrendScore = (signals: TrendSignals) => {
    const growth = Math.max(0, signals.uniqueViews6h - signals.previousUniqueViews6h);
    return (
        signals.uniqueViews6h * 4
        + signals.successfulSearches24h * 5
        + signals.uniqueViews24h * 2
        + signals.recentUpvotes24h * 2
        + signals.uniqueShares24h * 3
        + growth * 2
    );
};

export const trendDirection = (signals: TrendSignals): 'up' | 'down' | 'stable' => {
    const delta = signals.uniqueViews6h - signals.previousUniqueViews6h;
    if (delta === 0) return 'stable';
    if (signals.previousUniqueViews6h === 0) return signals.uniqueViews6h > 0 ? 'up' : 'stable';
    const change = delta / signals.previousUniqueViews6h;
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
};

export interface RankedTrend {
    id: string;
    word: string;
    trendScore: number;
    trendSignals: TrendSignals;
}

export const compareTrendingTerms = (left: RankedTrend, right: RankedTrend) => (
    right.trendScore - left.trendScore
    || right.trendSignals.uniqueViews24h - left.trendSignals.uniqueViews24h
    || right.trendSignals.successfulSearches24h - left.trendSignals.successfulSearches24h
    || left.word.localeCompare(right.word, 'pt-BR', { sensitivity: 'base' })
    || left.id.localeCompare(right.id)
);

const rowsToMap = (rows: AggregateRow[]) => new Map(rows.map((row) => [row.termId, number(row.count)]));

const emptySignals = (): TrendSignals => ({
    uniqueViews6h: 0,
    uniqueViews24h: 0,
    successfulSearches24h: 0,
    recentUpvotes24h: 0,
    uniqueShares24h: 0,
    previousUniqueViews6h: 0,
});

const queryUniqueViews = (from: Date, to: Date) => prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    SELECT "termId", COUNT(DISTINCT "viewerHash")::int AS "count"
    FROM "TermView"
    WHERE "viewerHash" IS NOT NULL
      AND "createdAt" >= (${from} AT TIME ZONE 'UTC')
      AND "createdAt" < (${to} AT TIME ZONE 'UTC')
    GROUP BY "termId"
`);

const querySuccessfulSearches = (from: Date, to: Date) => prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    SELECT "openedTermId" AS "termId", COUNT(*)::int AS "count"
    FROM "InternalSearchEvent"
    WHERE "openedTermId" IS NOT NULL
      AND "openedAt" >= (${from} AT TIME ZONE 'UTC')
      AND "openedAt" < (${to} AT TIME ZONE 'UTC')
    GROUP BY "openedTermId"
`);

const queryRecentUpvotes = (from: Date, to: Date) => prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    SELECT "termId", COUNT(*)::int AS "count"
    FROM "TermVote"
    WHERE "value" = 1
      AND "updatedAt" >= (${from} AT TIME ZONE 'UTC')
      AND "updatedAt" < (${to} AT TIME ZONE 'UTC')
    GROUP BY "termId"
`);

const queryUniqueShares = (from: Date, to: Date) => prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    SELECT "termId", COUNT(DISTINCT "viewerHash")::int AS "count"
    FROM "TermShare"
    WHERE "createdAt" >= (${from} AT TIME ZONE 'UTC')
      AND "createdAt" < (${to} AT TIME ZONE 'UTC')
    GROUP BY "termId"
`);

const buildTrendingTerms = async (now: Date) => {
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [views6hRows, previousViews6hRows, views24hRows, searchRows, voteRows, shareRows, fallbackTerms] = await Promise.all([
        queryUniqueViews(sixHoursAgo, now),
        queryUniqueViews(twelveHoursAgo, sixHoursAgo),
        queryUniqueViews(twentyFourHoursAgo, now),
        querySuccessfulSearches(twentyFourHoursAgo, now),
        queryRecentUpvotes(twentyFourHoursAgo, now),
        queryUniqueShares(twentyFourHoursAgo, now),
        prisma.term.findMany({
            where: { status: TermStatus.APPROVED, archivedAt: null },
            orderBy: [{ upvotes: 'desc' }, { word: 'asc' }, { id: 'asc' }],
            take: RESULT_LIMIT,
            select: { id: true },
        }),
    ]);

    const maps = {
        views6h: rowsToMap(views6hRows),
        previousViews6h: rowsToMap(previousViews6hRows),
        views24h: rowsToMap(views24hRows),
        searches: rowsToMap(searchRows),
        votes: rowsToMap(voteRows),
        shares: rowsToMap(shareRows),
    };
    const candidateIds = new Set<string>(fallbackTerms.map((term) => term.id));
    for (const map of Object.values(maps)) for (const termId of map.keys()) candidateIds.add(termId);

    const terms = await prisma.term.findMany({
        where: { id: { in: [...candidateIds] }, status: TermStatus.APPROVED, archivedAt: null },
        include: { game: true },
    });

    return terms.map((term) => {
        const trendSignals: TrendSignals = {
            ...emptySignals(),
            uniqueViews6h: maps.views6h.get(term.id) || 0,
            uniqueViews24h: maps.views24h.get(term.id) || 0,
            successfulSearches24h: maps.searches.get(term.id) || 0,
            recentUpvotes24h: maps.votes.get(term.id) || 0,
            uniqueShares24h: maps.shares.get(term.id) || 0,
            previousUniqueViews6h: maps.previousViews6h.get(term.id) || 0,
        };
        return {
            ...term,
            trend: trendDirection(trendSignals),
            trendScore: calculateTrendScore(trendSignals),
            trendSignals,
        };
    }).sort(compareTrendingTerms).slice(0, RESULT_LIMIT);
};

type TrendingResult = Awaited<ReturnType<typeof buildTrendingTerms>>;
let cache: { expiresAt: number; value: TrendingResult } | null = null;
let inFlight: Promise<TrendingResult> | null = null;

export const getTrendingTerms = async () => {
    const nowMs = Date.now();
    if (cache && cache.expiresAt > nowMs) return cache.value;
    if (inFlight) return inFlight;

    inFlight = buildTrendingTerms(new Date(nowMs))
        .then((value) => {
            cache = { expiresAt: nowMs + TRENDING_CACHE_TTL_MS, value };
            return value;
        })
        .finally(() => { inFlight = null; });
    return inFlight;
};

export const clearTrendingCacheForTests = () => {
    cache = null;
    inFlight = null;
};
