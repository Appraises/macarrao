import { createHash } from 'crypto';
import { ContentStatus, EsportsProvider, EsportsSyncRun, EsportsSyncStatus, MatchStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ESPORTS_SYNC_INTERVAL_MINUTES } from '../../utils/config';
import { slugify } from '../../utils/content';
import { rebuildTournamentDerivedData } from './derived';
import { isBrazilFocusedMatch, isBrazilianCountry } from './focus';
import { LiquipediaProvider } from './liquipedia';
import { PandaScoreProvider } from './pandascore';
import { EsportsProviderClient, ProviderMatch, ProviderTeam } from './provider';
import { emitEsportsUpdate } from './realtime';

// PandaScore first: it carries the international S/A tier feed; Liquipedia
// adds deeper Brazilian coverage when its key is configured.
const providers: EsportsProviderClient[] = [new PandaScoreProvider(), new LiquipediaProvider()];
let activeSync: Promise<EsportsSyncRun> | null = null;
const shortHash = (value: string) => createHash('sha1').update(value).digest('hex').slice(0, 10);
const statusLabel = (status: MatchStatus) => status === MatchStatus.LIVE ? 'Live' : status === MatchStatus.FINISHED ? 'Finished' : 'Upcoming';
const bracketPrefix = (client: EsportsProviderClient) => client.key === EsportsProvider.LIQUIPEDIA ? 'lp' : client.slugPrefix;

const findGame = (aliases: string[]) => prisma.game.findFirst({
    where: {
        status: ContentStatus.PUBLISHED,
        OR: [{ slug: { in: aliases } }, ...aliases.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } }))],
    },
    select: { id: true, name: true, slug: true },
});

const upsertTeam = async (client: EsportsProviderClient, team: ProviderTeam) => {
    const key = { provider: client.key, externalId: team.externalId };
    const current = await prisma.esportsTeam.findUnique({
        where: { provider_externalId: key },
        select: { logo: true },
    });
    // Curated local crests (public/esports/teams) win over provider logos.
    const logo = current?.logo?.startsWith('/esports/teams/') ? current.logo : team.logo;

    return prisma.esportsTeam.upsert({
        where: { provider_externalId: key },
        create: {
            provider: client.key,
            externalId: team.externalId,
            sourceUrl: team.sourceUrl,
            name: team.name,
            slug: `${client.slugPrefix}-${slugify(team.name) || 'team'}-${shortHash(team.externalId)}`,
            country: team.country || 'xx',
            isBrazilian: isBrazilianCountry(team.country),
            logo,
            status: ContentStatus.PUBLISHED,
        },
        update: {
            sourceUrl: team.sourceUrl,
            name: team.name,
            country: team.country || 'xx',
            isBrazilian: isBrazilianCountry(team.country),
            logo,
            status: ContentStatus.PUBLISHED,
            archivedAt: null,
        },
    });
};

const upsertMatch = async (client: EsportsProviderClient, match: ProviderMatch) => {
    const game = await findGame(match.gameAliases);
    if (!game) return null;
    const brazilFocused = isBrazilFocusedMatch(match);
    const [teamA, teamB] = await Promise.all([upsertTeam(client, match.teamA), upsertTeam(client, match.teamB)]);
    const now = new Date();
    const tournamentKey = { provider: client.key, externalId: match.tournament.externalId };
    const previous = await prisma.tournament.findUnique({
        where: { provider_externalId: tournamentKey },
        select: { startAt: true, endAt: true, isBrazilFocused: true },
    });
    const startAt = match.tournament.startAt
        ?? (!previous?.startAt || match.scheduledAt < previous.startAt ? match.scheduledAt : previous.startAt);
    const endAt = match.tournament.endAt
        ?? (!previous?.endAt || match.scheduledAt > previous.endAt ? match.scheduledAt : previous.endAt);
    // One Brazilian match is enough to mark the event as Brazilian coverage.
    const tournamentBrazilian = brazilFocused || Boolean(previous?.isBrazilFocused);
    const region = tournamentBrazilian ? 'BR' : match.tournament.region || 'GLOBAL';
    const shared = {
        sourceUrl: match.tournament.sourceUrl || null,
        name: match.tournament.name,
        gameId: game.id,
        game: game.name,
        region,
        country: tournamentBrazilian ? 'br' : 'xx',
        isBrazilFocused: tournamentBrazilian,
        logo: match.tournament.logo,
        image: match.tournament.logo,
        status: statusLabel(match.status),
        dates: `${startAt.toISOString().slice(0, 10)} - ${endAt.toISOString().slice(0, 10)}`,
        startAt,
        endAt,
        publicationStatus: ContentStatus.PUBLISHED,
        location: match.tournament.location,
        lastSyncedAt: now,
        ...(match.tournament.prizePool ? { prizePool: match.tournament.prizePool } : {}),
    };
    const tournament = await prisma.tournament.upsert({
        where: { provider_externalId: tournamentKey },
        create: {
            provider: client.key,
            externalId: match.tournament.externalId,
            slug: `${client.slugPrefix}-${slugify(match.tournament.slugSeed) || shortHash(match.tournament.externalId)}`,
            description: tournamentBrazilian ? `Cobertura brasileira de ${match.tournament.name}.` : `Cobertura de ${match.tournament.name}.`,
            ...shared,
        },
        update: { ...shared, archivedAt: null },
    });
    await prisma.tournamentTeam.createMany({
        data: [
            { tournamentId: tournament.id, teamId: teamA.id, name: teamA.name, country: teamA.country },
            { tournamentId: tournament.id, teamId: teamB.id, name: teamB.name, country: teamB.country },
        ],
        skipDuplicates: true,
    });

    const data = {
        sourceUrl: match.sourceUrl || null,
        gameId: game.id,
        tournamentId: tournament.id,
        game: game.name,
        competition: tournament.name,
        stage: match.stage,
        round: match.round,
        region: brazilFocused ? 'BR' : match.tournament.region || 'GLOBAL',
        isBrazilFocused: brazilFocused,
        teamAId: teamA.id,
        teamAName: teamA.name,
        teamACountry: teamA.country,
        teamALogo: teamA.logo,
        teamBId: teamB.id,
        teamBName: teamB.name,
        teamBCountry: teamB.country,
        teamBLogo: teamB.logo,
        scheduledAt: match.scheduledAt,
        date: match.scheduledAt.toISOString().slice(0, 10),
        time: match.scheduledAt.toISOString().slice(11, 16),
        status: match.status,
        isLive: match.status === MatchStatus.LIVE,
        publicationStatus: ContentStatus.PUBLISHED,
        archivedAt: null,
        bestOf: match.bestOf,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        streamUrl: match.streamUrl,
        vodUrl: match.vodUrl,
        lastSyncedAt: now,
    };
    const saved = await prisma.esportsMatch.upsert({
        where: { provider_externalId: { provider: client.key, externalId: match.externalId } },
        create: { provider: client.key, externalId: match.externalId, ...data },
        update: data,
    });

    if (match.round || match.stage) {
        const winnerA = match.status === MatchStatus.FINISHED && (match.scoreA || 0) > (match.scoreB || 0);
        const winnerB = match.status === MatchStatus.FINISHED && (match.scoreB || 0) > (match.scoreA || 0);
        const bracketData = {
            esportsMatchId: saved.id,
            round: match.round || match.stage || 'Partida',
            teamAId: teamA.id,
            teamAName: teamA.name,
            teamAScore: match.scoreA,
            teamAWinner: winnerA,
            teamBId: teamB.id,
            teamBName: teamB.name,
            teamBScore: match.scoreB,
            teamBWinner: winnerB,
            date: match.scheduledAt.toISOString(),
            status: statusLabel(match.status),
        };
        const matchKey = `${bracketPrefix(client)}-${shortHash(match.externalId)}`;
        await prisma.bracketMatch.upsert({
            where: { tournamentId_matchKey: { tournamentId: tournament.id, matchKey } },
            create: { tournamentId: tournament.id, matchKey, ...bracketData },
            update: bracketData,
        });
    }
    return { tournamentId: tournament.id };
};

const performSync = async (client: EsportsProviderClient) => {
    const run = await prisma.esportsSyncRun.create({ data: { provider: client.key, games: client.games } });
    try {
        const snapshot = await client.fetchSnapshot();
        const accepted = snapshot.matches.filter((match) => client.accepts(match));
        const tournaments = new Set<string>();
        const teams = new Set<string>();
        let matchesUpserted = 0;
        for (const match of accepted) {
            const saved = await upsertMatch(client, match);
            if (!saved) continue;
            matchesUpserted += 1;
            tournaments.add(saved.tournamentId);
            teams.add(match.teamA.externalId);
            teams.add(match.teamB.externalId);
        }
        for (const tournamentId of tournaments) await rebuildTournamentDerivedData(tournamentId);
        const warnings = snapshot.warnings?.length ? snapshot.warnings.join(' | ').slice(0, 1000) : null;
        const result = await prisma.esportsSyncRun.update({
            where: { id: run.id },
            data: {
                status: EsportsSyncStatus.SUCCEEDED,
                fetched: snapshot.fetched,
                accepted: accepted.length,
                tournamentsUpserted: tournaments.size,
                teamsUpserted: teams.size,
                matchesUpserted,
                error: warnings,
                finishedAt: new Date(),
            },
        });
        emitEsportsUpdate({ type: 'sync-complete', runId: result.id, matches: matchesUpserted });
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'Erro desconhecido na sincronizacao.';
        const result = await prisma.esportsSyncRun.update({
            where: { id: run.id },
            data: { status: EsportsSyncStatus.FAILED, error: message, finishedAt: new Date() },
        });
        throw Object.assign(new Error(`${client.label}: ${message}`), { syncRun: result });
    }
};

const syncAll = async (): Promise<EsportsSyncRun> => {
    const configured = providers.filter((client) => client.configured);
    if (!configured.length) {
        const run = await prisma.esportsSyncRun.create({ data: { provider: providers[0].key, games: providers[0].games } });
        return prisma.esportsSyncRun.update({
            where: { id: run.id },
            data: { status: EsportsSyncStatus.SKIPPED, error: 'Nenhum provedor configurado (PANDASCORE_TOKEN ou LIQUIPEDIA_API_KEY).', finishedAt: new Date() },
        });
    }
    // Each provider gets its own run; one failing does not stop the others.
    let lastRun: EsportsSyncRun | null = null;
    let firstError: unknown = null;
    for (const client of configured) {
        try {
            lastRun = await performSync(client);
        } catch (error) {
            firstError ??= error;
        }
    }
    if (!lastRun) throw firstError;
    if (firstError) console.error('[esports-sync]', firstError instanceof Error ? firstError.message : firstError);
    return lastRun;
};

export const syncEsports = () => {
    if (activeSync) return activeSync;
    activeSync = syncAll().finally(() => { activeSync = null; });
    return activeSync;
};

export const startEsportsSyncScheduler = () => {
    const interval = setInterval(() => void syncEsports().catch((error) => console.error('[esports-sync]', error.message)), ESPORTS_SYNC_INTERVAL_MINUTES * 60_000);
    interval.unref();
    const startup = setTimeout(() => void syncEsports().catch((error) => console.error('[esports-sync]', error.message)), 2_000);
    startup.unref();
};

export const isEsportsFeedConfigured = () => providers.some((client) => client.configured);
export const configuredEsportsProviders = () => providers.filter((client) => client.configured).map((client) => client.label);
