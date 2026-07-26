import { Prisma } from '@prisma/client';

export const publicMatchInclude = {
    gameRecord: { select: { id: true, name: true, slug: true, image: true } },
    tournament: { select: { id: true, name: true, slug: true, logo: true, status: true } },
    teamA: { select: { id: true, name: true, country: true, logo: true } },
    teamB: { select: { id: true, name: true, country: true, logo: true } },
} satisfies Prisma.EsportsMatchInclude;

export type PublicMatchRecord = Prisma.EsportsMatchGetPayload<{ include: typeof publicMatchInclude }>;

export const toPublicMatch = (match: PublicMatchRecord) => ({
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
    isLive: match.status === 'LIVE',
    bestOf: match.bestOf,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    streamUrl: match.streamUrl,
    vodUrl: match.vodUrl,
    lastSyncedAt: match.lastSyncedAt?.toISOString() || null,
});

export const esportsAttribution = { provider: 'Liquipedia', license: 'CC BY-SA 3.0', url: 'https://liquipedia.net/' };
