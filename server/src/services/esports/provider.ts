import { MatchStatus } from '@prisma/client';

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
}

export interface ProviderMatch {
    externalId: string;
    gameWiki: string;
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
}

export interface EsportsProviderClient {
    readonly configured: boolean;
    fetchSnapshot(): Promise<ProviderSnapshot>;
}
