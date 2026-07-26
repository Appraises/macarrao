import { createHash } from 'crypto';
import { ContentStatus, EsportsProvider, EsportsSyncRun, EsportsSyncStatus, MatchStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ESPORTS_SYNC_INTERVAL_MINUTES, ESPORTS_SYNC_WIKIS } from '../../utils/config';
import { slugify } from '../../utils/content';
import { rebuildTournamentDerivedData } from './derived';
import { isBrazilFocusedMatch, isBrazilianCountry } from './focus';
import { aliasesForLiquipediaWiki, LiquipediaProvider } from './liquipedia';
import { ProviderMatch, ProviderTeam } from './provider';
import { emitEsportsUpdate } from './realtime';

const provider = new LiquipediaProvider();
let activeSync: Promise<EsportsSyncRun> | null = null;
const shortHash = (value: string) => createHash('sha1').update(value).digest('hex').slice(0, 10);
const statusLabel = (status: MatchStatus) => status === MatchStatus.LIVE ? 'Live' : status === MatchStatus.FINISHED ? 'Finished' : 'Upcoming';

const findGame = (wiki: string) => {
    const aliases = aliasesForLiquipediaWiki(wiki);
    return prisma.game.findFirst({
        where: {
            status: ContentStatus.PUBLISHED,
            OR: [{ slug: { in: aliases } }, ...aliases.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } }))],
        },
        select: { id: true, name: true, slug: true },
    });
};

const upsertTeam = (team: ProviderTeam) => prisma.esportsTeam.upsert({
    where: { provider_externalId: { provider: EsportsProvider.LIQUIPEDIA, externalId: team.externalId } },
    create: {
        provider: EsportsProvider.LIQUIPEDIA,
        externalId: team.externalId,
        sourceUrl: team.sourceUrl,
        name: team.name,
        slug: `liquipedia-${slugify(team.name) || 'team'}-${shortHash(team.externalId)}`,
        country: team.country || 'xx',
        isBrazilian: isBrazilianCountry(team.country),
        logo: team.logo,
        status: ContentStatus.PUBLISHED,
    },
    update: {
        sourceUrl: team.sourceUrl,
        name: team.name,
        country: team.country || 'xx',
        isBrazilian: isBrazilianCountry(team.country),
        logo: team.logo,
        status: ContentStatus.PUBLISHED,
        archivedAt: null,
    },
});

const upsertMatch = async (match: ProviderMatch) => {
    const game = await findGame(match.gameWiki);
    if (!game) return null;
    const [teamA, teamB] = await Promise.all([upsertTeam(match.teamA), upsertTeam(match.teamB)]);
    const now = new Date();
    const previous = await prisma.tournament.findUnique({
        where: { provider_externalId: { provider: EsportsProvider.LIQUIPEDIA, externalId: match.tournament.externalId } },
        select: { startAt: true, endAt: true },
    });
    const startAt = !previous?.startAt || match.scheduledAt < previous.startAt ? match.scheduledAt : previous.startAt;
    const endAt = !previous?.endAt || match.scheduledAt > previous.endAt ? match.scheduledAt : previous.endAt;
    const tournament = await prisma.tournament.upsert({
        where: { provider_externalId: { provider: EsportsProvider.LIQUIPEDIA, externalId: match.tournament.externalId } },
        create: {
            provider: EsportsProvider.LIQUIPEDIA,
            externalId: match.tournament.externalId,
            sourceUrl: match.tournament.sourceUrl,
            name: match.tournament.name,
            slug: `liquipedia-${slugify(match.tournament.slugSeed) || shortHash(match.tournament.externalId)}`,
            gameId: game.id,
            game: game.name,
            region: 'BR',
            country: 'br',
            isBrazilFocused: true,
            logo: match.tournament.logo,
            image: match.tournament.logo,
            status: statusLabel(match.status),
            dates: `${startAt.toISOString().slice(0, 10)} - ${endAt.toISOString().slice(0, 10)}`,
            startAt,
            endAt,
            publicationStatus: ContentStatus.PUBLISHED,
            location: match.tournament.location,
            description: `Cobertura brasileira de ${match.tournament.name}.`,
            lastSyncedAt: now,
        },
        update: {
            sourceUrl: match.tournament.sourceUrl,
            name: match.tournament.name,
            gameId: game.id,
            game: game.name,
            region: 'BR',
            country: 'br',
            isBrazilFocused: true,
            logo: match.tournament.logo,
            image: match.tournament.logo,
            status: statusLabel(match.status),
            dates: `${startAt.toISOString().slice(0, 10)} - ${endAt.toISOString().slice(0, 10)}`,
            startAt,
            endAt,
            publicationStatus: ContentStatus.PUBLISHED,
            archivedAt: null,
            location: match.tournament.location,
            lastSyncedAt: now,
        },
    });
    await prisma.tournamentTeam.createMany({
        data: [
            { tournamentId: tournament.id, teamId: teamA.id, name: teamA.name, country: teamA.country },
            { tournamentId: tournament.id, teamId: teamB.id, name: teamB.name, country: teamB.country },
        ],
        skipDuplicates: true,
    });

    const data = {
        sourceUrl: match.sourceUrl,
        gameId: game.id,
        tournamentId: tournament.id,
        game: game.name,
        competition: tournament.name,
        stage: match.stage,
        round: match.round,
        region: 'BR',
        isBrazilFocused: true,
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
        where: { provider_externalId: { provider: EsportsProvider.LIQUIPEDIA, externalId: match.externalId } },
        create: { provider: EsportsProvider.LIQUIPEDIA, externalId: match.externalId, ...data },
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
        const matchKey = `lp-${shortHash(match.externalId)}`;
        await prisma.bracketMatch.upsert({
            where: { tournamentId_matchKey: { tournamentId: tournament.id, matchKey } },
            create: { tournamentId: tournament.id, matchKey, ...bracketData },
            update: bracketData,
        });
    }
    return { tournamentId: tournament.id };
};

const performSync = async () => {
    const run = await prisma.esportsSyncRun.create({ data: { provider: EsportsProvider.LIQUIPEDIA, games: ESPORTS_SYNC_WIKIS } });
    if (!provider.configured) return prisma.esportsSyncRun.update({
        where: { id: run.id },
        data: { status: EsportsSyncStatus.SKIPPED, error: 'LIQUIPEDIA_API_KEY nao configurada.', finishedAt: new Date() },
    });

    try {
        const snapshot = await provider.fetchSnapshot();
        const accepted = snapshot.matches.filter(isBrazilFocusedMatch);
        const tournaments = new Set<string>();
        const teams = new Set<string>();
        let matchesUpserted = 0;
        for (const match of accepted) {
            const saved = await upsertMatch(match);
            if (!saved) continue;
            matchesUpserted += 1;
            tournaments.add(saved.tournamentId);
            teams.add(match.teamA.externalId);
            teams.add(match.teamB.externalId);
        }
        for (const tournamentId of tournaments) await rebuildTournamentDerivedData(tournamentId);
        const result = await prisma.esportsSyncRun.update({
            where: { id: run.id },
            data: {
                status: EsportsSyncStatus.SUCCEEDED,
                fetched: snapshot.fetched,
                accepted: accepted.length,
                tournamentsUpserted: tournaments.size,
                teamsUpserted: teams.size,
                matchesUpserted,
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
        throw Object.assign(new Error(message), { syncRun: result });
    }
};

export const syncEsports = () => {
    if (activeSync) return activeSync;
    activeSync = performSync().finally(() => { activeSync = null; });
    return activeSync;
};

export const startEsportsSyncScheduler = () => {
    const interval = setInterval(() => void syncEsports().catch((error) => console.error('[esports-sync]', error.message)), ESPORTS_SYNC_INTERVAL_MINUTES * 60_000);
    interval.unref();
    const startup = setTimeout(() => void syncEsports().catch((error) => console.error('[esports-sync]', error.message)), 2_000);
    startup.unref();
};

export const isLiquipediaConfigured = () => provider.configured;
