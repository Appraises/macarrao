import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const [flag, ...extra] = process.argv.slice(2);
if ((flag && flag !== '--apply') || extra.length) throw new Error('Use no arguments to preview, or --apply to publish.');
const apply = flag === '--apply';
const sourceUrl = 'https://lolesports.com/en-US/leagues/worlds';
const fixtures = [
    { key: 'qf4', a: 't1', b: 'karmine-corp', date: '2026-11-06T22:00:00.000Z', score: [3, 1], round: 'Quartas de final' },
    { key: 'sf1', a: 'geng', b: 'invictus-gaming', date: '2026-11-07T22:00:00.000Z', score: [3, 0], round: 'Semifinal' },
    { key: 'sf2', a: 'bilibili-gaming', b: 't1', date: '2026-11-08T22:00:00.000Z', score: [3, 1], round: 'Semifinal' },
    { key: 'gf', a: 'geng', b: 'bilibili-gaming', date: '2026-11-14T19:00:00.000Z', round: 'Grande final' },
];

const prisma = new PrismaClient();

async function settlePicks(db, matchId, winnerId) {
    const predictions = await db.esportsPickemPrediction.findMany({ where: { matchId }, select: { id: true, entryId: true, predictedTeamId: true } });
    const settledAt = new Date();
    for (const { id, predictedTeamId } of predictions) {
        await db.esportsPickemPrediction.update({ where: { id }, data: { settledAt, points: predictedTeamId === winnerId ? 10 : 0 } });
    }
    for (const id of new Set(predictions.map(({ entryId }) => entryId))) {
        const where = { entryId: id };
        const summary = await db.esportsPickemPrediction.aggregate({ where, _sum: { points: true }, _count: { id: true } });
        const correctPicks = await db.esportsPickemPrediction.count({ where: { ...where, points: { gt: 0 } } });
        await db.esportsPickemEntry.update({ where: { id }, data: { score: summary._sum.points || 0, totalPicks: summary._count.id, correctPicks } });
    }
}

try {
    const result = await prisma.$transaction(async (db) => {
        const tournament = await db.tournament.findUnique({ where: { slug: 'worlds-2026' }, include: { bracket: { include: { esportsMatch: true } } } });
        if (tournament?.publicationStatus !== 'PUBLISHED' || tournament.provider !== 'MANUAL') throw new Error('Worlds 2026 is not a published editorial tournament.');
        const teams = await db.esportsTeam.findMany({ where: { slug: { in: fixtures.flatMap(({ a, b }) => [a, b]) }, status: 'PUBLISHED' } });
        const changes = [];
        for (const fixture of fixtures) {
            const { key, date, round, score } = fixture;
            const a = teams.find(({ slug }) => slug === fixture.a);
            const b = teams.find(({ slug }) => slug === fixture.b);
            const node = tournament.bracket.find(({ matchKey }) => matchKey === key);
            if (!node || !a || !b) throw new Error(`Missing bracket slot or team for ${key}.`);
            if (Boolean(score) !== (Date.parse(date) < Date.now())) throw new Error(`Recheck the published status of ${key}.`);
            const current = node.esportsMatch ?? await db.esportsMatch.findFirst({ where: {
                tournamentId: tournament.id, scheduledAt: date,
                OR: [{ teamAId: a.id, teamBId: b.id }, { teamAId: b.id, teamBId: a.id }],
            } });
            if (current && (current.tournamentId !== tournament.id || current.publicationStatus !== 'PUBLISHED' || current.provider !== 'MANUAL'
                || current.teamAId !== a.id || current.teamBId !== b.id || current.status === 'CANCELED'
                || (current.status === 'FINISHED' && (current.scoreA !== score?.[0] || current.scoreB !== score?.[1]))
                || (!score && current.status !== 'SCHEDULED'))) throw new Error(`Conflicting match for ${key}.`);

            const matchStatus = score ? 'FINISHED' : 'SCHEDULED';
            const bracketStatus = score ? 'Finished' : 'Scheduled';
            if (current?.status === matchStatus && node.esportsMatchId === current.id && node.status === bracketStatus
                && node.teamAId === a.id && node.teamBId === b.id && node.teamAScore === (score?.[0] ?? null)
                && node.teamBScore === (score?.[1] ?? null) && node.date === date) continue;
            changes.push({ key, teams: [a.name, b.name], status: matchStatus, score });
            if (!apply) continue;

            const matchData = { status: matchStatus, scoreA: score?.[0] ?? null, scoreB: score?.[1] ?? null, isLive: false };
            const match = current
                ? await db.esportsMatch.update({ where: { id: current.id }, data: matchData })
                : await db.esportsMatch.create({ data: {
                    ...matchData, tournamentId: tournament.id, gameId: tournament.gameId, game: tournament.game,
                    competition: tournament.name, stage: 'Playoffs', round, region: tournament.region, isBrazilFocused: true,
                    teamAId: a.id, teamAName: a.name, teamACountry: a.country, teamALogo: a.logo,
                    teamBId: b.id, teamBName: b.name, teamBCountry: b.country, teamBLogo: b.logo,
                    sourceUrl, scheduledAt: date, bestOf: 5, publicationStatus: 'PUBLISHED',
                    externalId: `editorial:worlds-2026:${key}`,
                } });
            await db.bracketMatch.update({ where: { id: node.id }, data: {
                esportsMatchId: match.id, date, status: bracketStatus,
                teamAId: a.id, teamAName: a.name, teamAScore: matchData.scoreA, teamAWinner: !!score && score[0] > score[1],
                teamBId: b.id, teamBName: b.name, teamBScore: matchData.scoreB, teamBWinner: !!score && score[1] > score[0],
            } });
            if (score && current?.status !== 'FINISHED') await settlePicks(db, match.id, score[0] > score[1] ? a.id : b.id);
        }
        if (apply && changes.length) await db.adminAuditLog.create({ data: {
            action: 'UPDATE', entityType: 'Tournament', entityId: tournament.id,
            after: { fixtures: changes.map(({ score, ...row }) => ({ ...row, score: score ?? null })) },
            metadata: { operation: 'editorial-worlds-2026-finals', sourceUrl },
        } });
        return changes;
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', changes: result }, null, 2));
} finally {
    await prisma.$disconnect();
}
