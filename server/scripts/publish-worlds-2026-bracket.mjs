import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--apply')) throw new Error('Use --apply to publish, or no argument to preview.');
const apply = args[0] === '--apply';
const prisma = new PrismaClient();
const sourceUrl = 'https://lolesports.com/pt-BR';
const prizeSourceUrl = 'https://bo3.gg/lol/p/worlds-2026';
const pairs = [
    ['qf1', 'Quarterfinals', 'Invictus Gaming', 'Top Esports'],
    ['qf2', 'Quarterfinals', 'Gen.G', 'LYON'],
    ['qf3', 'Quarterfinals', 'Dplus KIA', 'Bilibili Gaming'],
    ['qf4', 'Quarterfinals', 'T1', 'Karmine Corp'],
    ['sf1', 'Semifinals', 'Gen.G', 'Invictus Gaming'],
];

try {
    const summary = await prisma.$transaction(async (db) => {
        const tournament = await db.tournament.findUnique({
            where: { slug: 'worlds-2026' },
            include: { bracket: true, matches: { where: { publicationStatus: 'PUBLISHED' } } },
        });
        if (!tournament || tournament.provider !== 'MANUAL' || tournament.publicationStatus !== 'PUBLISHED') {
            throw new Error('Expected the published editorial Worlds 2026 tournament.');
        }
        const matches = new Map();
        for (const [key, , a, b] of pairs) {
            const found = tournament.matches.filter(({ teamAName, teamBName }) =>
                (teamAName === a && teamBName === b) || (teamAName === b && teamBName === a));
            if (found.length !== 1 || !found[0].scheduledAt || !found[0].teamAId || !found[0].teamBId) {
                throw new Error(`Expected one published fixture with a time and linked teams for ${key}.`);
            }
            matches.set(key, found[0]);
        }

        const quarter = matches.get('qf3');
        const dplusFirst = quarter.teamAName === 'Dplus KIA';
        const score = { scoreA: dplusFirst ? 0 : 3, scoreB: dplusFirst ? 3 : 0 };
        const needsResult = quarter.status !== 'FINISHED';
        if (Date.now() <= quarter.scheduledAt.getTime() || quarter.status === 'CANCELED'
            || (!needsResult && (quarter.scoreA !== score.scoreA || quarter.scoreB !== score.scoreB))) {
            throw new Error('The published result for Dplus KIA vs Bilibili Gaming conflicts with this update.');
        }
        const winnerId = dplusFirst ? quarter.teamBId : quarter.teamAId;
        if (needsResult) matches.set('qf3', { ...quarter, ...score, status: 'FINISHED' });
        const nodes = pairs.map(([matchKey, round]) => {
            const match = matches.get(matchKey);
            const finished = match.status === 'FINISHED';
            return {
                matchKey, round, esportsMatchId: match.id,
                teamAId: match.teamAId, teamAName: match.teamAName, teamAScore: match.scoreA,
                teamBId: match.teamBId, teamBName: match.teamBName, teamBScore: match.scoreB,
                teamAWinner: finished && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB,
                teamBWinner: finished && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA,
                date: match.scheduledAt.toISOString(), status: finished ? 'Finished' : match.status === 'LIVE' ? 'Live' : match.status === 'CANCELED' ? 'Canceled' : 'Scheduled',
            };
        });
        nodes.push({ matchKey: 'sf2', round: 'Semifinals', teamAId: winnerId, teamAName: 'Bilibili Gaming', teamBName: 'Vencedor das quartas 4', date: '2026-11-08T22:00:00.000Z', status: 'Scheduled' });
        nodes.push({ matchKey: 'gf', round: 'Grand Final', teamAName: 'Vencedor da semifinal 1', teamBName: 'Vencedor da semifinal 2', date: '2026-11-14T19:00:00.000Z', status: 'Scheduled' });

        const alreadyPublished = tournament.bracket.length > 0;
        if (alreadyPublished && (tournament.bracket.length !== nodes.length || nodes.some((node) => !tournament.bracket.some((row) => row.matchKey === node.matchKey)))) {
            throw new Error('The existing bracket does not match this editorial import; leave it untouched.');
        }
        if (apply && !alreadyPublished) {
            if (needsResult) {
                await db.esportsMatch.update({ where: { id: quarter.id }, data: { ...score, status: 'FINISHED', isLive: false } });
                const predictions = await db.esportsPickemPrediction.findMany({ where: { matchId: quarter.id }, select: { id: true, entryId: true, predictedTeamId: true } });
                const settledAt = new Date();
                for (const prediction of predictions) await db.esportsPickemPrediction.update({ where: { id: prediction.id }, data: { settledAt, points: prediction.predictedTeamId === winnerId ? 10 : 0 } });
                for (const id of new Set(predictions.map(({ entryId }) => entryId))) {
                    const where = { entryId: id };
                    const aggregate = await db.esportsPickemPrediction.aggregate({ where, _count: { id: true }, _sum: { points: true } });
                    const correctPicks = await db.esportsPickemPrediction.count({ where: { ...where, points: { gt: 0 } } });
                    await db.esportsPickemEntry.update({ where: { id }, data: { score: aggregate._sum.points || 0, totalPicks: aggregate._count.id, correctPicks } });
                }
            }
            await db.bracketMatch.createMany({ data: nodes.map((node) => ({ ...node, tournamentId: tournament.id })) });
            await db.tournament.update({ where: { id: tournament.id }, data: { prizePool: 'US$ 5.000.000' } });
            await db.adminAuditLog.create({ data: {
                action: 'UPDATE', entityType: 'Tournament', entityId: tournament.id,
                before: { prizePool: tournament.prizePool, bracket: 0, quarterfinalStatus: quarter.status },
                after: { prizePool: 'US$ 5.000.000', bracket: nodes.length, quarterfinalStatus: 'FINISHED', quarterfinalScore: score },
                metadata: { operation: 'editorial-worlds-2026-bracket', sourceUrl, prizeSourceUrl },
            } });
        }
        return { mode: apply ? 'apply' : 'preview', bracketToCreate: alreadyPublished ? 0 : nodes.length, resultToUpdate: !alreadyPublished && needsResult, existing: tournament.bracket.length };
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    console.log(JSON.stringify(summary));
} finally {
    await prisma.$disconnect();
}
