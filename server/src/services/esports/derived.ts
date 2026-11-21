import { EsportsProvider, MatchStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const pickemPoints = (predictedTeamId: string | null, winnerTeamId: string | null) =>
    predictedTeamId && winnerTeamId && predictedTeamId === winnerTeamId ? 10 : 0;

export const settlePickemForMatch = async (matchId: string) => {
    const match = await prisma.esportsMatch.findUnique({
        where: { id: matchId },
        select: { status: true, scoreA: true, scoreB: true, teamAId: true, teamBId: true },
    });
    if (!match || match.status !== MatchStatus.FINISHED || match.scoreA === null || match.scoreB === null) return;

    const winnerId = match.scoreA === match.scoreB ? null : match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
    const predictions = await prisma.esportsPickemPrediction.findMany({
        where: { matchId },
        select: { id: true, entryId: true, predictedTeamId: true },
    });
    if (!predictions.length) return;

    const settledAt = new Date();
    await prisma.$transaction(predictions.map((prediction) => prisma.esportsPickemPrediction.update({
        where: { id: prediction.id },
        data: { points: pickemPoints(prediction.predictedTeamId, winnerId), settledAt },
    })));

    for (const entryId of [...new Set(predictions.map((prediction) => prediction.entryId))]) {
        const [aggregate, correctPicks] = await Promise.all([
            prisma.esportsPickemPrediction.aggregate({ where: { entryId }, _count: { id: true }, _sum: { points: true } }),
            prisma.esportsPickemPrediction.count({ where: { entryId, points: { gt: 0 } } }),
        ]);
        await prisma.esportsPickemEntry.update({
            where: { id: entryId },
            data: { score: aggregate._sum.points || 0, totalPicks: aggregate._count.id, correctPicks },
        });
    }
};

export const rebuildTournamentDerivedData = async (tournamentId: string) => {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { provider: true } });
    if (!tournament) return;
    const matches = await prisma.esportsMatch.findMany({ where: { tournamentId }, orderBy: { scheduledAt: 'asc' } });

    for (const match of matches) {
        const bracket = await prisma.bracketMatch.findUnique({ where: { esportsMatchId: match.id } });
        if (bracket) await prisma.bracketMatch.update({
            where: { id: bracket.id },
            data: {
                teamAId: match.teamAId,
                teamAName: match.teamAName,
                teamAScore: match.scoreA,
                teamAWinner: match.status === MatchStatus.FINISHED && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB,
                teamBId: match.teamBId,
                teamBName: match.teamBName,
                teamBScore: match.scoreB,
                teamBWinner: match.status === MatchStatus.FINISHED && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA,
                date: match.scheduledAt?.toISOString() || null,
                status: match.status === MatchStatus.LIVE ? 'Live' : match.status === MatchStatus.FINISHED ? 'Finished' : match.status === MatchStatus.CANCELED ? 'Canceled' : 'Scheduled',
            },
        });
        if (match.status === MatchStatus.FINISHED) await settlePickemForMatch(match.id);
    }

    const status = matches.some((match) => match.status === MatchStatus.LIVE)
        ? 'Live'
        : matches.length && matches.every((match) => match.status === MatchStatus.FINISHED || match.status === MatchStatus.CANCELED) ? 'Finished' : 'Upcoming';
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status } });

    if (tournament.provider === EsportsProvider.MANUAL) return;
    const finished = matches.filter((match) => match.status === MatchStatus.FINISHED && match.scoreA !== null && match.scoreB !== null && match.teamAId && match.teamBId);
    if (!finished.length) return;

    type Row = { teamId: string; teamName: string; teamCountry: string; teamLogo: string | null; played: number; wins: number; losses: number; points: number; diff: number };
    const rows = new Map<string, Row>();
    const ensure = (id: string, name: string, country: string, logo: string | null) => {
        if (!rows.has(id)) rows.set(id, { teamId: id, teamName: name, teamCountry: country, teamLogo: logo, played: 0, wins: 0, losses: 0, points: 0, diff: 0 });
        return rows.get(id)!;
    };
    for (const match of finished) {
        const a = ensure(match.teamAId!, match.teamAName, match.teamACountry, match.teamALogo);
        const b = ensure(match.teamBId!, match.teamBName, match.teamBCountry, match.teamBLogo);
        a.played += 1; b.played += 1;
        a.diff += match.scoreA! - match.scoreB!; b.diff += match.scoreB! - match.scoreA!;
        if (match.scoreA! > match.scoreB!) { a.wins += 1; a.points += 3; b.losses += 1; }
        else if (match.scoreB! > match.scoreA!) { b.wins += 1; b.points += 3; a.losses += 1; }
        else { a.points += 1; b.points += 1; }
    }
    const ordered = [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || b.diff - a.diff || a.teamName.localeCompare(b.teamName));
    await prisma.$transaction([
        prisma.tournamentStanding.deleteMany({ where: { tournamentId } }),
        prisma.tournamentStanding.createMany({ data: ordered.map((row, index) => ({ ...row, tournamentId, rank: index + 1, streak: null })) }),
    ]);
};
