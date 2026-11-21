import { EsportsProvider, MatchStatus, Prisma } from '@prisma/client';
import { ESPORTS_SYNC_INTERVAL_MINUTES } from '../../utils/config';

export const publicMatchInclude = {
    gameRecord: { select: { id: true, name: true, slug: true, image: true } },
    tournament: { select: { id: true, name: true, slug: true, logo: true, status: true } },
    teamA: { select: { id: true, name: true, country: true, logo: true } },
    teamB: { select: { id: true, name: true, country: true, logo: true } },
} satisfies Prisma.EsportsMatchInclude;

export type PublicMatchRecord = Prisma.EsportsMatchGetPayload<{ include: typeof publicMatchInclude }>;

const LIVE_FRESHNESS_MS = 2 * ESPORTS_SYNC_INTERVAL_MINUTES * 60_000;

export const currentLiveMatchWhere = (now: Date): Prisma.EsportsMatchWhereInput => ({
    status: MatchStatus.LIVE,
    OR: [
        { provider: EsportsProvider.MANUAL },
        // Synced providers only stay live while their feed keeps refreshing.
        { provider: { not: EsportsProvider.MANUAL }, lastSyncedAt: { gt: new Date(now.getTime() - LIVE_FRESHNESS_MS) } },
    ],
});

const publicLiveStatus = (match: Pick<PublicMatchRecord, 'status' | 'provider' | 'lastSyncedAt'>, now: Date) => {
    if (match.status !== MatchStatus.LIVE) return { isLive: false, liveStatusExpiresAt: null };
    if (match.provider === EsportsProvider.MANUAL) return { isLive: true, liveStatusExpiresAt: null };
    const expiresAt = match.lastSyncedAt && new Date(match.lastSyncedAt.getTime() + LIVE_FRESHNESS_MS);
    return { isLive: expiresAt !== null && expiresAt > now, liveStatusExpiresAt: expiresAt?.toISOString() ?? null };
};

export const toPublicMatch = (match: PublicMatchRecord, now = new Date()) => ({
    id: match.id,
    externalId: match.externalId,
    provider: match.provider,
    sourceUrl: match.sourceUrl,
    gameId: match.gameId,
    game: match.gameRecord || { id: match.gameId, name: match.game, slug: null, image: null },
    tournamentId: match.tournamentId,
    tournament: match.tournament,
    competition: match.competition,
    stage: match.stage,
    round: match.round,
    region: match.region,
    isBrazilFocused: match.isBrazilFocused,
    teamA: match.teamA || { id: match.teamAId, name: match.teamAName, country: match.teamACountry, logo: match.teamALogo },
    teamB: match.teamB || { id: match.teamBId, name: match.teamBName, country: match.teamBCountry, logo: match.teamBLogo },
    scheduledAt: match.scheduledAt?.toISOString() || null,
    status: match.status,
    ...publicLiveStatus(match, now),
    bestOf: match.bestOf,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    streamUrl: match.streamUrl,
    vodUrl: match.vodUrl,
    lastSyncedAt: match.lastSyncedAt?.toISOString() || null,
});

export const esportsAttribution = { provider: 'Liquipedia', license: 'CC BY-SA 3.0', url: 'https://liquipedia.net/' };
export const pandaScoreAttribution = { provider: 'PandaScore', license: 'Source: PandaScore', url: 'https://pandascore.co/' };
