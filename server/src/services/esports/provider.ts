import { EsportsProvider, MatchStatus } from '@prisma/client';

export interface ProviderTeam {
    externalId: string;
    name: string;
    country: string;
    logo?: string | null;
    sourceUrl?: string | null;
}

export interface ProviderTournament {
    externalId: string;
    gameWiki: string;
    name: string;
    slugSeed: string;
    sourceUrl: string;
    startAt?: Date | null;
    endAt?: Date | null;
    location?: string | null;
    logo?: string | null;
    prizePool?: string | null;
    tier?: string | null;
    region?: string | null;
}

export interface ProviderMatch {
    externalId: string;
    gameWiki: string;
    gameName: string;
    /** Slugs or names our Game table may use for this title. */
    gameAliases: string[];
    tournament: ProviderTournament;
    teamA: ProviderTeam;
    teamB: ProviderTeam;
    scheduledAt: Date;
    status: MatchStatus;
    scoreA: number | null;
    scoreB: number | null;
    bestOf: number | null;
    stage?: string | null;
    round?: string | null;
    streamUrl?: string | null;
    vodUrl?: string | null;
    sourceUrl: string;
}

export interface ProviderSnapshot {
    fetched: number;
    matches: ProviderMatch[];
    /** Partial failures that did not abort the whole snapshot. */
    warnings?: string[];
}

export interface EsportsProviderClient {
    readonly key: EsportsProvider;
    readonly label: string;
    /** Prefix for generated slugs and bracket keys, unique per provider. */
    readonly slugPrefix: string;
    readonly games: string[];
    readonly configured: boolean;
    /** Editorial filter applied before anything is stored. */
    accepts(match: ProviderMatch): boolean;
    fetchSnapshot(): Promise<ProviderSnapshot>;
}
