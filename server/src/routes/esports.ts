import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /esports/tournaments — List all tournaments
router.get('/tournaments', async (req, res) => {
    try {
        const tournaments = await prisma.tournament.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
});

// GET /esports/tournaments/:id — Tournament detail with teams, standings, bracket
router.get('/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                teams: true,
                standings: { orderBy: { rank: 'asc' } },
                bracket: true,
                stats: true,
            }
        });
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Map to match TournamentDetail frontend type
        const detail = {
            ...tournament,
            teams: tournament.teams.map(t => ({ name: t.name, country: t.country })),
            standings: tournament.standings.map(s => ({
                rank: s.rank,
                team: { name: s.teamName, country: s.teamCountry },
                played: s.played,
                wins: s.wins,
                losses: s.losses,
                points: s.points,
                diff: s.diff,
                streak: s.streak,
            })),
            bracket: tournament.bracket.map(b => ({
                id: b.matchKey,
                round: b.round,
                teamA: { name: b.teamAName, score: b.teamAScore, isWinner: b.teamAWinner },
                teamB: { name: b.teamBName, score: b.teamBScore, isWinner: b.teamBWinner },
                date: b.date,
                status: b.status,
            })),
        };
        res.json(detail);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tournament details' });
    }
});

// GET /esports/matches — List esports matches with optional filter
router.get('/matches', async (req, res) => {
    const filter = req.query.filter as string || 'all';
    try {
        let where: any = {};
        if (filter === 'live') where.isLive = true;
        else if (filter === 'upcoming') where.isLive = false;

        const matches = await prisma.esportsMatch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        // Map to Match frontend type
        const mapped = matches.map(m => ({
            id: m.id,
            game: m.game,
            competition: m.competition,
            teamA: { name: m.teamAName, country: m.teamACountry },
            teamB: { name: m.teamBName, country: m.teamBCountry },
            time: m.time,
            date: m.date,
            isLive: m.isLive,
            scoreA: m.scoreA,
            scoreB: m.scoreB,
            oddsA: m.oddsA,
            oddsB: m.oddsB,
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

// GET /esports/news — List esports news
router.get('/news', async (req, res) => {
    try {
        const news = await prisma.esportsNews.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch esports news' });
    }
});

// GET /esports/rankings — Global team rankings
router.get('/rankings', async (req, res) => {
    try {
        const rankings = await prisma.teamRanking.findMany({
            orderBy: [{ game: 'asc' }, { rank: 'asc' }],
        });
        // Map to TeamRanking frontend type
        const mapped = rankings.map(r => ({
            rank: r.rank,
            team: { name: r.teamName, country: r.teamCountry },
            points: r.points,
            trend: r.trend,
            game: r.game,
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rankings' });
    }
});

// GET /esports/pickem/leaderboard — Pick'em leaderboard
router.get('/pickem/leaderboard', async (req, res) => {
    try {
        const leaderboard = await prisma.pickemUser.findMany({
            orderBy: { rank: 'asc' },
        });
        // Map to PickemUser frontend type
        const mapped = leaderboard.map(p => ({
            rank: p.rank,
            user: p.username,
            points: p.points,
            percentile: p.percentile,
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /esports/stats/:tournamentId — Player stats for a tournament
router.get('/stats/:tournamentId', async (req, res) => {
    const { tournamentId } = req.params;
    try {
        const stats = await prisma.playerStat.findMany({
            where: { tournamentId },
        });
        // Map to PlayerStat frontend type
        const mapped = stats.map(s => ({
            id: s.id,
            name: s.name,
            team: s.team,
            country: s.country,
            role: s.role,
            photo: s.photo,
            stats: s.stats,
        }));
        res.json({ players: mapped });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
