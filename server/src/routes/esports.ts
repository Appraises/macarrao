import { ContentStatus, MatchStatus, NewsStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { currentLiveMatchWhere, esportsAttribution, publicMatchInclude, toPublicMatch } from '../services/esports/dto';
import { brazilFocusDescription } from '../services/esports/focus';
import { isEsportsFeedConfigured } from '../services/esports/sync';
import { esportsGameCatalogQuery, esportsGameScope, isEsportsGameSlug } from '../services/esports/gameScope';
import { sanitizeNewsRecord } from '../utils/news';

const router = Router();
// The synced feeds are already curated (top tiers plus Brazilian coverage),
// so everything published is public; ?focus=br narrows to Brazilian matches.
const publishedMatchWhere = (focus: unknown): Prisma.EsportsMatchWhereInput => ({
    publicationStatus: ContentStatus.PUBLISHED,
    ...(focus === 'br' ? { isBrazilFocused: true } : {}),
});
const publishedTournamentWhere = (focus: unknown): Prisma.TournamentWhereInput => ({
    publicationStatus: ContentStatus.PUBLISHED,
    ...(focus === 'br' ? { isBrazilFocused: true } : {}),
});

const publicNewsInclude = {
    tournament: {
        select: {
            game: true,
            gameRecord: { select: { name: true } },
        },
    },
} satisfies Prisma.NewsInclude;

const publicTournamentGame = { gameRecord: { select: { id: true, name: true, slug: true, image: true } } } satisfies Prisma.TournamentInclude;

type NewsGameContext = {
    headline?: string;
    category?: string;
    content?: string | null;
    tournament?: { game: string; gameRecord?: { name: string } | null } | null;
};

const NEWS_GAME_PATTERNS: Array<[RegExp, string]> = [
    [/counter[ -]?strike|\bcs2\b|cs:go|\bcsgo\b/i, 'Counter-Strike 2'],
    [/\bvalorant\b|\bvct\b/i, 'Valorant'],
    [/league of legends|\blol\b|\bcblol\b|\blta south\b/i, 'League of Legends'],
    [/\bdota(?: 2)?\b/i, 'Dota 2'],
    [/rainbow six|\bsiege\b|\br6\b/i, 'Rainbow Six Siege'],
    [/rocket league/i, 'Rocket League'],
    [/free ?fire/i, 'Free Fire'],
    [/overwatch/i, 'Overwatch'],
    [/\bpok[eé]mon unite\b/i, 'Pokémon UNITE'],
    [/\bfortnite\b/i, 'Fortnite'],
];

const inferNewsGame = (item: NewsGameContext): string | null => {
    const linkedGame = item.tournament?.gameRecord?.name || item.tournament?.game;
    if (linkedGame) return linkedGame;
    const searchable = `${item.headline || ''} ${item.category || ''} ${item.content || ''}`;
    return NEWS_GAME_PATTERNS.find(([pattern]) => pattern.test(searchable))?.[1] || null;
};

const toNews = <T extends NewsGameContext & { publishedAt: Date | null; createdAt: Date }>(item: T) => {
    const hours = Math.max(0, Math.floor((Date.now() - (item.publishedAt || item.createdAt).getTime()) / 3_600_000));
    const sanitized = sanitizeNewsRecord(item);
    const { tournament: _tournament, ...publicItem } = sanitized;
    return {
        ...publicItem,
        game: inferNewsGame(item),
        timeAgo: hours < 1 ? 'Agora' : hours < 24 ? `${hours}h atras` : `${Math.floor(hours / 24)}d atras`,
    };
};

const newsForOverview = async (now: Date, scope?: ReturnType<typeof esportsGameScope>) => {
    const where = {
        status: NewsStatus.PUBLISHED,
        publishedAt: { lte: now },
        category: { equals: 'E-Sports', mode: 'insensitive' as const },
    };
    const orderBy = [{ publishedAt: 'desc' as const }, { id: 'asc' as const }];
    const scopedWhere: Prisma.NewsWhereInput = scope ? {
        ...where,
        OR: [
            { tournament: { is: scope.where } },
            ...(scope.hints.length ? [{ tournamentId: null, OR: scope.hints.flatMap((hint) => {
                const contains = { contains: hint, mode: 'insensitive' as const };
                return [{ headline: contains }, { category: contains }, { content: contains }];
            }) }] : []),
        ],
    } : where;
    const list = (options: { take: number; cursor?: { id: string }; skip?: number }) =>
        prisma.news.findMany({ where: scopedWhere, orderBy, include: publicNewsInclude, ...options });
    if (!scope) {
        const news = await list({ take: 8 });
        return news.length ? news : prisma.news.findMany({
            where: { status: NewsStatus.PUBLISHED, publishedAt: { lte: now } },
            orderBy, include: publicNewsInclude, take: 8,
        });
    }

    // Older articles can be unlinked. Use the same classification as the response,
    // and stop as soon as there are enough stories for the selected game.
    const matches: Awaited<ReturnType<typeof list>> = [];
    let cursor: { id: string } | undefined;
    while (matches.length < 8) {
        const batch = await list({ take: 40, ...(cursor ? { cursor, skip: 1 } : {}) });
        matches.push(...batch.filter((item) => scope.matchesName(inferNewsGame(item))));
        if (batch.length < 40) break;
        cursor = { id: batch[batch.length - 1].id };
    }
    return matches.slice(0, 8);
};

router.get('/overview', async (req, res) => {
    const { game } = req.query;
    if (game !== undefined && !isEsportsGameSlug(game)) {
        return res.status(400).json({ error: 'O filtro de jogo deve ser um slug valido.' });
    }
    try {
        const scope = typeof game === 'string' ? esportsGameScope(game, await prisma.game.findMany(esportsGameCatalogQuery)) : undefined;
        const gameWhere = scope ? { AND: [scope.where] } : {};
        const matchWhere = { ...publishedMatchWhere(req.query.focus), ...gameWhere };
        const tournamentWhere = { ...publishedTournamentWhere(req.query.focus), ...gameWhere };
        const now = new Date();
        const [live, upcoming, results, tournaments, pastTournaments, rankings, news, latestSync] = await Promise.all([
            prisma.esportsMatch.findMany({ where: { ...matchWhere, ...currentLiveMatchWhere(now) }, include: publicMatchInclude, orderBy: { scheduledAt: 'asc' }, take: 12 }),
            prisma.esportsMatch.findMany({ where: { ...matchWhere, status: MatchStatus.SCHEDULED, scheduledAt: { gte: now } }, include: publicMatchInclude, orderBy: { scheduledAt: 'asc' }, take: 16 }),
            prisma.esportsMatch.findMany({ where: { ...matchWhere, status: MatchStatus.FINISHED }, include: publicMatchInclude, orderBy: [{ scheduledAt: 'desc' }, { updatedAt: 'desc' }], take: 12 }),
            prisma.tournament.findMany({ where: { ...tournamentWhere, status: { not: 'Finished' }, OR: [{ endAt: null }, { endAt: { gte: now } }] }, include: publicTournamentGame, orderBy: [{ startAt: 'asc' }, { name: 'asc' }], take: 12 }),
            prisma.tournament.findMany({ where: { ...tournamentWhere, status: 'Finished' }, include: publicTournamentGame, orderBy: [{ endAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }], take: 5 }),
            prisma.teamRanking.findMany({ where: { teamRecord: { isBrazilian: true, status: ContentStatus.PUBLISHED }, ...gameWhere }, include: { teamRecord: true, gameRecord: true }, orderBy: [{ game: 'asc' }, { rank: 'asc' }], take: 20 }),
            newsForOverview(now, scope),
            prisma.esportsSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
        ]);
        res.json({
            matches: [...live, ...upcoming].map((match) => toPublicMatch(match, now)),
            results: results.map((match) => toPublicMatch(match, now)),
            tournaments,
            pastTournaments,
            rankings: rankings.map((item) => ({ id: item.id, rank: item.rank, team: item.teamRecord || { id: item.teamId, name: item.teamName, country: item.teamCountry, logo: null }, points: item.points, trend: item.trend, game: item.gameRecord || { id: item.gameId, name: item.game, slug: null } })),
            news: news.map(toNews),
            source: { attribution: esportsAttribution, configured: isEsportsFeedConfigured(), focus: brazilFocusDescription(), latestSync },
        });
    } catch (error) {
        console.error('[esports] overview:', error);
        res.status(500).json({ error: 'Falha ao carregar o panorama de e-sports.' });
    }
});

router.get('/tournaments', async (req, res) => {
    try {
        const where = publishedTournamentWhere(req.query.focus);
        if (typeof req.query.gameId === 'string' && req.query.gameId) where.gameId = req.query.gameId;
        if (typeof req.query.status === 'string' && req.query.status) where.status = req.query.status;
        const tournaments = await prisma.tournament.findMany({
            where,
            include: { gameRecord: { select: { id: true, name: true, slug: true } }, _count: { select: { teams: true, matches: true } } },
            orderBy: [{ startAt: 'desc' }, { name: 'asc' }],
        });
        res.json(tournaments);
    } catch (error) {
        console.error('[esports] tournaments:', error);
        res.status(500).json({ error: 'Falha ao carregar campeonatos.' });
    }
});

router.get('/tournaments/:idOrSlug', async (req, res) => {
    try {
        const tournament = await prisma.tournament.findFirst({
            where: { publicationStatus: ContentStatus.PUBLISHED, OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }] },
            include: {
                gameRecord: { select: { id: true, name: true, slug: true, image: true } },
                teams: { include: { team: true }, orderBy: { name: 'asc' } },
                standings: { orderBy: { rank: 'asc' } },
                bracket: { orderBy: [{ round: 'asc' }, { date: 'asc' }] },
                stats: true,
                matches: { where: { publicationStatus: ContentStatus.PUBLISHED }, include: publicMatchInclude, orderBy: { scheduledAt: 'asc' } },
                news: { where: { status: NewsStatus.PUBLISHED, publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: 20 },
            },
        });
        if (!tournament) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        res.json({
            ...tournament,
            teams: tournament.teams.map((item) => item.team || { id: item.teamId, name: item.name, country: item.country, logo: null }),
            standings: tournament.standings.map((item) => ({ id: item.id, rank: item.rank, teamId: item.teamId, team: { id: item.teamId, name: item.teamName, country: item.teamCountry, logo: item.teamLogo }, played: item.played, wins: item.wins, losses: item.losses, points: item.points, diff: item.diff, streak: item.streak })),
            bracket: tournament.bracket.map((item) => ({ id: item.id, matchId: item.esportsMatchId, matchKey: item.matchKey, round: item.round, teamA: { id: item.teamAId, name: item.teamAName, score: item.teamAScore, isWinner: item.teamAWinner }, teamB: { id: item.teamBId, name: item.teamBName, score: item.teamBScore, isWinner: item.teamBWinner }, date: item.date, status: item.status })),
            matches: tournament.matches.map((match) => toPublicMatch(match)),
            news: tournament.news.map((item) => toNews({ ...item, tournament: { game: tournament.game, gameRecord: tournament.gameRecord } })),
            attribution: tournament.provider === 'LIQUIPEDIA' ? esportsAttribution : null,
        });
    } catch (error) {
        console.error('[esports] tournament detail:', error);
        res.status(500).json({ error: 'Falha ao carregar o campeonato.' });
    }
});

router.get('/matches', async (req, res) => {
    try {
        const where = publishedMatchWhere(req.query.focus);
        const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
        const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
        const now = new Date();
        if (filter === 'live') where.status = MatchStatus.LIVE;
        else if (filter === 'upcoming') where.status = MatchStatus.SCHEDULED;
        else if (Object.values(MatchStatus).includes(status as MatchStatus)) where.status = status as MatchStatus;
        if (typeof req.query.gameId === 'string' && req.query.gameId) where.gameId = req.query.gameId;
        if (typeof req.query.tournamentId === 'string' && req.query.tournamentId) where.tournamentId = req.query.tournamentId;
        if (where.status === MatchStatus.LIVE) Object.assign(where, currentLiveMatchWhere(now));
        const matches = await prisma.esportsMatch.findMany({ where, include: publicMatchInclude, orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }], take: 100 });
        res.json(matches.map((match) => toPublicMatch(match, now)));
    } catch (error) {
        console.error('[esports] matches:', error);
        res.status(500).json({ error: 'Falha ao carregar partidas.' });
    }
});

router.get('/matches/:idOrExternalId', async (req, res) => {
    try {
        const match = await prisma.esportsMatch.findFirst({
            where: { publicationStatus: ContentStatus.PUBLISHED, OR: [{ id: req.params.idOrExternalId }, { externalId: req.params.idOrExternalId }] },
            include: publicMatchInclude,
        });
        if (!match) return res.status(404).json({ error: 'Partida nao encontrada.' });
        res.json(toPublicMatch(match));
    } catch (error) {
        console.error('[esports] match detail:', error);
        res.status(500).json({ error: 'Falha ao carregar a partida.' });
    }
});

router.get('/news', async (req, res) => {
    try {
        const where: Prisma.NewsWhereInput = { status: NewsStatus.PUBLISHED, publishedAt: { lte: new Date() }, category: { equals: 'E-Sports', mode: 'insensitive' } };
        if (typeof req.query.tournamentId === 'string' && req.query.tournamentId) where.tournamentId = req.query.tournamentId;
        const news = await prisma.news.findMany({ where, include: publicNewsInclude, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], take: 30 });
        res.json(news.map(toNews));
    } catch (error) {
        console.error('[esports] news:', error);
        res.status(500).json({ error: 'Falha ao carregar noticias de e-sports.' });
    }
});

router.get('/rankings', async (req, res) => {
    try {
        const where: Prisma.TeamRankingWhereInput = { gameRecord: { status: ContentStatus.PUBLISHED }, teamRecord: { status: ContentStatus.PUBLISHED } };
        if (req.query.focus !== 'all') where.teamRecord = { status: ContentStatus.PUBLISHED, isBrazilian: true };
        if (typeof req.query.gameId === 'string' && req.query.gameId) where.gameId = req.query.gameId;
        const rankings = await prisma.teamRanking.findMany({ where, include: { teamRecord: true, gameRecord: true }, orderBy: [{ game: 'asc' }, { rank: 'asc' }] });
        res.json(rankings.map((item) => ({ id: item.id, rank: item.rank, team: item.teamRecord || { id: item.teamId, name: item.teamName, country: item.teamCountry, logo: null }, points: item.points, trend: item.trend, game: item.gameRecord || { id: item.gameId, name: item.game, slug: null } })));
    } catch (error) {
        console.error('[esports] rankings:', error);
        res.status(500).json({ error: 'Falha ao carregar rankings.' });
    }
});

const resolveTournament = (idOrSlug: string) => prisma.tournament.findFirst({ where: { publicationStatus: ContentStatus.PUBLISHED, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }, select: { id: true } });

router.get('/pickem/:tournamentId/leaderboard', async (req, res) => {
    try {
        const tournament = await resolveTournament(req.params.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const entries = await prisma.esportsPickemEntry.findMany({ where: { tournamentId: tournament.id }, include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: [{ score: 'desc' }, { correctPicks: 'desc' }, { updatedAt: 'asc' }], take: 100 });
        res.json(entries.map((entry, index) => ({ rank: index + 1, user: entry.user, points: entry.score, correctPicks: entry.correctPicks, totalPicks: entry.totalPicks })));
    } catch (error) {
        console.error('[esports] pickem leaderboard:', error);
        res.status(500).json({ error: 'Falha ao carregar o ranking do Pick em.' });
    }
});

router.get('/pickem/:tournamentId/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tournament = await resolveTournament(req.params.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const entry = await prisma.esportsPickemEntry.findUnique({
            where: { userId_tournamentId: { userId: req.user.id, tournamentId: tournament.id } },
            include: { predictions: { include: { predictedTeam: { select: { id: true, name: true, logo: true } }, match: { include: publicMatchInclude } }, orderBy: { createdAt: 'asc' } } },
        });
        res.json(entry ? { ...entry, predictions: entry.predictions.map((prediction) => ({ ...prediction, match: toPublicMatch(prediction.match) })) } : null);
    } catch (error) {
        console.error('[esports] my pickem:', error);
        res.status(500).json({ error: 'Falha ao carregar seus palpites.' });
    }
});

router.put('/pickem/:tournamentId/predictions/:matchId', authenticateToken, async (req: AuthRequest, res) => {
    const predictedTeamId = typeof req.body?.predictedTeamId === 'string' ? req.body.predictedTeamId : '';
    if (!predictedTeamId) return res.status(400).json({ error: 'Escolha uma equipe.' });
    try {
        const tournament = await resolveTournament(req.params.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const match = await prisma.esportsMatch.findFirst({ where: { id: req.params.matchId, tournamentId: tournament.id, publicationStatus: ContentStatus.PUBLISHED } });
        if (!match) return res.status(404).json({ error: 'Partida nao encontrada neste campeonato.' });
        if (match.status !== MatchStatus.SCHEDULED || !match.scheduledAt || match.scheduledAt <= new Date()) return res.status(409).json({ error: 'Os palpites desta partida ja estao encerrados.' });
        if (![match.teamAId, match.teamBId].includes(predictedTeamId)) return res.status(400).json({ error: 'A equipe escolhida nao disputa esta partida.' });
        const predictedTeamName = predictedTeamId === match.teamAId ? match.teamAName : match.teamBName;
        const entry = await prisma.esportsPickemEntry.upsert({
            where: { userId_tournamentId: { userId: req.user.id, tournamentId: tournament.id } },
            create: { userId: req.user.id, tournamentId: tournament.id },
            update: {},
        });
        const prediction = await prisma.esportsPickemPrediction.upsert({
            where: { entryId_matchId: { entryId: entry.id, matchId: match.id } },
            create: { entryId: entry.id, matchId: match.id, predictedTeamId, predictedTeamName },
            update: { predictedTeamId, predictedTeamName, points: 0, settledAt: null },
        });
        const totalPicks = await prisma.esportsPickemPrediction.count({ where: { entryId: entry.id } });
        await prisma.esportsPickemEntry.update({ where: { id: entry.id }, data: { totalPicks } });
        res.json(prediction);
    } catch (error) {
        console.error('[esports] save pickem:', error);
        res.status(500).json({ error: 'Falha ao salvar o palpite.' });
    }
});

router.delete('/pickem/:tournamentId/predictions/:matchId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tournament = await resolveTournament(req.params.tournamentId);
        if (!tournament) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const match = await prisma.esportsMatch.findFirst({ where: { id: req.params.matchId, tournamentId: tournament.id } });
        if (!match) return res.status(404).json({ error: 'Partida nao encontrada.' });
        if (match.status !== MatchStatus.SCHEDULED || !match.scheduledAt || match.scheduledAt <= new Date()) return res.status(409).json({ error: 'Os palpites desta partida ja estao encerrados.' });
        const entry = await prisma.esportsPickemEntry.findUnique({ where: { userId_tournamentId: { userId: req.user.id, tournamentId: tournament.id } } });
        if (!entry) return res.status(204).send();
        await prisma.esportsPickemPrediction.deleteMany({ where: { entryId: entry.id, matchId: match.id } });
        const totalPicks = await prisma.esportsPickemPrediction.count({ where: { entryId: entry.id } });
        await prisma.esportsPickemEntry.update({ where: { id: entry.id }, data: { totalPicks } });
        res.status(204).send();
    } catch (error) {
        console.error('[esports] delete pickem:', error);
        res.status(500).json({ error: 'Falha ao remover o palpite.' });
    }
});

router.get('/stats/:tournamentId', async (req, res) => {
    try {
        const stats = await prisma.playerStat.findMany({ where: { tournamentId: req.params.tournamentId, tournament: { publicationStatus: ContentStatus.PUBLISHED } }, include: { player: true } });
        res.json({ players: stats.map((item) => ({ id: item.id, playerId: item.playerId, name: item.name, team: item.team, country: item.country, role: item.role, photo: item.photo, stats: item.stats })) });
    } catch (error) {
        console.error('[esports] stats:', error);
        res.status(500).json({ error: 'Falha ao carregar estatisticas.' });
    }
});

export default router;
