import { ContentStatus, MatchStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { rebuildTournamentDerivedData } from '../../services/esports/derived';
import { emitEsportsUpdate } from '../../services/esports/realtime';
import { isLiquipediaConfigured, syncEsports } from '../../services/esports/sync';
import { MatchPayload, RankingPayload, validateMatchPayload, validatePlayerPayload, validateRankingPayload, validateTeamPayload } from '../../utils/esports';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();
const statusIsValid = (value: unknown) => typeof value === 'string' && Object.values(ContentStatus).includes(value as ContentStatus);
const errorMessage = (entity: string, action: string) => `Falha ao ${action} ${entity}.`;

const teamInclude = { _count: { select: { players: true, tournamentEntries: true, standings: true, matchesAsTeamA: true, matchesAsTeamB: true, rankings: true } } } satisfies Prisma.EsportsTeamInclude;
const playerInclude = { team: { select: { id: true, name: true, slug: true } }, _count: { select: { stats: true } } } satisfies Prisma.EsportsPlayerInclude;
const matchInclude = { gameRecord: { select: { id: true, name: true, slug: true } }, tournament: { select: { id: true, name: true, slug: true } }, teamA: { select: { id: true, name: true, country: true, logo: true } }, teamB: { select: { id: true, name: true, country: true, logo: true } } } satisfies Prisma.EsportsMatchInclude;
const rankingInclude = { gameRecord: { select: { id: true, name: true, slug: true } }, teamRecord: { select: { id: true, name: true, country: true, logo: true } } } satisfies Prisma.TeamRankingInclude;

router.get('/sync', async (_req, res) => {
    try {
        const runs = await prisma.esportsSyncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
        res.json({ configured: isLiquipediaConfigured(), runs });
    } catch {
        res.status(500).json({ error: 'Falha ao consultar as sincronizacoes.' });
    }
});

router.post('/sync', async (_req, res) => {
    try {
        const run = await syncEsports();
        res.status(run.status === 'SKIPPED' ? 409 : 200).json(run);
    } catch (error) {
        res.status(502).json({ error: error instanceof Error ? error.message : 'Falha ao sincronizar e-sports.' });
    }
});

router.get('/teams', async (req, res) => {
    const status = req.query.status; if (status !== undefined && !statusIsValid(status)) return res.status(400).json({ error: 'Estado da equipe invalido.' });
    const parsed = parsePagination(req.query, { allowedSorts: ['createdAt', 'updatedAt', 'name', 'country'] as const, defaultSort: 'name', defaultOrder: 'asc' }); if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.EsportsTeamWhereInput = {}; if (status) where.status = status as ContentStatus; if (parsed.value.search) where.OR = [{ name: { contains: parsed.value.search, mode: 'insensitive' } }, { country: { contains: parsed.value.search, mode: 'insensitive' } }];
    try { const [items, total] = await prisma.$transaction([prisma.esportsTeam.findMany({ where, include: teamInclude, orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.EsportsTeamOrderByWithRelationInput[], skip: parsed.value.skip, take: parsed.value.take }), prisma.esportsTeam.count({ where })]); res.json({ items, pagination: buildPaginationMeta(total, parsed.value) }); }
    catch (error) { console.error('[admin/esports/teams] List failed:', error); res.status(500).json({ error: errorMessage('equipes', 'buscar') }); }
});

router.get('/teams/:id', async (req, res) => { try { const item = await prisma.esportsTeam.findUnique({ where: { id: req.params.id }, include: teamInclude }); if (!item) return res.status(404).json({ error: 'Equipe nao encontrada.' }); res.json(item); } catch { res.status(500).json({ error: errorMessage('a equipe', 'buscar') }); } });

router.post('/teams', async (req: AuthRequest, res) => {
    const validation = validateTeamPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error });
    try { const item = await prisma.$transaction(async (tx) => { const created = await tx.esportsTeam.create({ data: validation.data, include: teamInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'CREATE', entityType: 'EsportsTeam', entityId: created.id, after: created }, tx); return created; }); res.status(201).json(item); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Ja existe uma equipe com este slug.' }); res.status(500).json({ error: errorMessage('a equipe', 'criar') }); }
});

router.put('/teams/:id', async (req: AuthRequest, res) => {
    const validation = validateTeamPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error });
    try { const existing = await prisma.esportsTeam.findUnique({ where: { id: req.params.id }, include: teamInclude }); if (!existing) return res.status(404).json({ error: 'Equipe nao encontrada.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsTeam.update({ where: { id: existing.id }, data: validation.data, include: teamInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE', entityType: 'EsportsTeam', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Ja existe uma equipe com este slug.' }); res.status(500).json({ error: errorMessage('a equipe', 'atualizar') }); }
});

router.patch('/teams/:id/archive', async (req: AuthRequest, res) => {
    try { const existing = await prisma.esportsTeam.findUnique({ where: { id: req.params.id }, include: teamInclude }); if (!existing) return res.status(404).json({ error: 'Equipe nao encontrada.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsTeam.update({ where: { id: existing.id }, data: { status: ContentStatus.ARCHIVED, archivedAt: new Date() }, include: teamInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'ARCHIVE', entityType: 'EsportsTeam', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); }
    catch { res.status(500).json({ error: errorMessage('a equipe', 'arquivar') }); }
});

router.delete('/teams/:id', async (req: AuthRequest, res) => {
    try { const existing = await prisma.esportsTeam.findUnique({ where: { id: req.params.id }, include: teamInclude }); if (!existing) return res.status(404).json({ error: 'Equipe nao encontrada.' }); const dependencies = Object.values(existing._count).reduce((sum, value) => sum + value, 0); if (dependencies) return res.status(409).json({ error: 'A equipe possui jogadores, campeonatos, partidas ou rankings. Arquive-a.', dependencies: existing._count }); await prisma.$transaction(async (tx) => { await tx.esportsTeam.delete({ where: { id: existing.id } }); await writeAuditLog({ actorId: req.user?.id, action: 'DELETE', entityType: 'EsportsTeam', entityId: existing.id, before: existing }, tx); }); res.status(204).send(); }
    catch { res.status(500).json({ error: errorMessage('a equipe', 'excluir') }); }
});

router.get('/players', async (req, res) => {
    const { status, teamId } = req.query; if (status !== undefined && !statusIsValid(status)) return res.status(400).json({ error: 'Estado do jogador invalido.' });
    const parsed = parsePagination(req.query, { allowedSorts: ['createdAt', 'updatedAt', 'name', 'nickname', 'country'] as const, defaultSort: 'nickname', defaultOrder: 'asc' }); if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.EsportsPlayerWhereInput = {}; if (status) where.status = status as ContentStatus; if (typeof teamId === 'string' && teamId) where.teamId = teamId; if (parsed.value.search) where.OR = [{ name: { contains: parsed.value.search, mode: 'insensitive' } }, { nickname: { contains: parsed.value.search, mode: 'insensitive' } }];
    try { const [items, total] = await prisma.$transaction([prisma.esportsPlayer.findMany({ where, include: playerInclude, orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.EsportsPlayerOrderByWithRelationInput[], skip: parsed.value.skip, take: parsed.value.take }), prisma.esportsPlayer.count({ where })]); res.json({ items, pagination: buildPaginationMeta(total, parsed.value) }); }
    catch { res.status(500).json({ error: errorMessage('jogadores', 'buscar') }); }
});

router.post('/players', async (req: AuthRequest, res) => {
    const validation = validatePlayerPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); if (validation.data.teamId && !(await prisma.esportsTeam.findUnique({ where: { id: validation.data.teamId }, select: { id: true } }))) return res.status(400).json({ error: 'A equipe selecionada nao existe.' });
    try { const item = await prisma.$transaction(async (tx) => { const created = await tx.esportsPlayer.create({ data: validation.data, include: playerInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'CREATE', entityType: 'EsportsPlayer', entityId: created.id, after: created }, tx); return created; }); res.status(201).json(item); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Ja existe um jogador com este slug.' }); res.status(500).json({ error: errorMessage('o jogador', 'criar') }); }
});

router.put('/players/:id', async (req: AuthRequest, res) => {
    const validation = validatePlayerPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); if (validation.data.teamId && !(await prisma.esportsTeam.findUnique({ where: { id: validation.data.teamId }, select: { id: true } }))) return res.status(400).json({ error: 'A equipe selecionada nao existe.' });
    try { const existing = await prisma.esportsPlayer.findUnique({ where: { id: req.params.id }, include: playerInclude }); if (!existing) return res.status(404).json({ error: 'Jogador nao encontrado.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsPlayer.update({ where: { id: existing.id }, data: validation.data, include: playerInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE', entityType: 'EsportsPlayer', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Ja existe um jogador com este slug.' }); res.status(500).json({ error: errorMessage('o jogador', 'atualizar') }); }
});

router.patch('/players/:id/archive', async (req: AuthRequest, res) => { try { const existing = await prisma.esportsPlayer.findUnique({ where: { id: req.params.id }, include: playerInclude }); if (!existing) return res.status(404).json({ error: 'Jogador nao encontrado.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsPlayer.update({ where: { id: existing.id }, data: { status: ContentStatus.ARCHIVED, archivedAt: new Date() }, include: playerInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'ARCHIVE', entityType: 'EsportsPlayer', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); } catch { res.status(500).json({ error: errorMessage('o jogador', 'arquivar') }); } });

router.delete('/players/:id', async (req: AuthRequest, res) => { try { const existing = await prisma.esportsPlayer.findUnique({ where: { id: req.params.id }, include: playerInclude }); if (!existing) return res.status(404).json({ error: 'Jogador nao encontrado.' }); if (existing._count.stats) return res.status(409).json({ error: 'O jogador possui estatisticas vinculadas. Arquive-o.' }); await prisma.$transaction(async (tx) => { await tx.esportsPlayer.delete({ where: { id: existing.id } }); await writeAuditLog({ actorId: req.user?.id, action: 'DELETE', entityType: 'EsportsPlayer', entityId: existing.id, before: existing }, tx); }); res.status(204).send(); } catch { res.status(500).json({ error: errorMessage('o jogador', 'excluir') }); } });

router.get('/matches', async (req, res) => {
    const { publicationStatus, status, gameId, tournamentId } = req.query; if (publicationStatus !== undefined && !statusIsValid(publicationStatus)) return res.status(400).json({ error: 'Estado de publicacao invalido.' }); if (status !== undefined && (typeof status !== 'string' || !Object.values(MatchStatus).includes(status as MatchStatus))) return res.status(400).json({ error: 'Estado da partida invalido.' });
    const parsed = parsePagination(req.query, { allowedSorts: ['createdAt', 'updatedAt', 'scheduledAt', 'competition'] as const, defaultSort: 'scheduledAt', defaultOrder: 'desc' }); if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.EsportsMatchWhereInput = {}; if (publicationStatus) where.publicationStatus = publicationStatus as ContentStatus; if (status) where.status = status as MatchStatus; if (typeof gameId === 'string' && gameId) where.gameId = gameId; if (typeof tournamentId === 'string' && tournamentId) where.tournamentId = tournamentId; if (parsed.value.search) where.OR = [{ competition: { contains: parsed.value.search, mode: 'insensitive' } }, { teamAName: { contains: parsed.value.search, mode: 'insensitive' } }, { teamBName: { contains: parsed.value.search, mode: 'insensitive' } }];
    try { const [items, total] = await prisma.$transaction([prisma.esportsMatch.findMany({ where, include: matchInclude, orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.EsportsMatchOrderByWithRelationInput[], skip: parsed.value.skip, take: parsed.value.take }), prisma.esportsMatch.count({ where })]); res.json({ items, pagination: buildPaginationMeta(total, parsed.value) }); }
    catch { res.status(500).json({ error: errorMessage('partidas', 'buscar') }); }
});

const hydrateMatch = async (data: MatchPayload, excludeId?: string) => {
    const [game, teamA, teamB, tournament] = await Promise.all([prisma.game.findUnique({ where: { id: data.gameId }, select: { id: true, name: true } }), prisma.esportsTeam.findUnique({ where: { id: data.teamAId }, select: { id: true, name: true, country: true, logo: true } }), prisma.esportsTeam.findUnique({ where: { id: data.teamBId }, select: { id: true, name: true, country: true, logo: true } }), data.tournamentId ? prisma.tournament.findUnique({ where: { id: data.tournamentId }, select: { id: true, name: true } }) : Promise.resolve(null)]);
    if (!game || !teamA || !teamB || (data.tournamentId && !tournament)) return { error: 'Jogo, equipe ou campeonato selecionado nao existe.' };
    const conflict = await prisma.esportsMatch.findFirst({ where: { id: excludeId ? { not: excludeId } : undefined, scheduledAt: data.scheduledAt, status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] }, OR: [{ teamAId: { in: [data.teamAId, data.teamBId] } }, { teamBId: { in: [data.teamAId, data.teamBId] } }] }, select: { id: true } });
    if (conflict) return { error: 'Uma das equipes ja possui partida nesse horario.' };
    return { data: { ...data, game: game.name, competition: tournament?.name || data.competition, teamAName: teamA.name, teamACountry: teamA.country, teamALogo: teamA.logo, teamBName: teamB.name, teamBCountry: teamB.country, teamBLogo: teamB.logo } };
};

router.post('/matches', async (req: AuthRequest, res) => {
    const validation = validateMatchPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); const hydrated = await hydrateMatch(validation.data); if ('error' in hydrated) return res.status(409).json({ error: hydrated.error });
    try { const item = await prisma.$transaction(async (tx) => { const created = await tx.esportsMatch.create({ data: hydrated.data!, include: matchInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'CREATE', entityType: 'EsportsMatch', entityId: created.id, after: created }, tx); return created; }); if (item.tournamentId) await rebuildTournamentDerivedData(item.tournamentId); emitEsportsUpdate({ type: 'match-created', matchId: item.id }); res.status(201).json(item); } catch { res.status(500).json({ error: errorMessage('a partida', 'criar') }); }
});

router.put('/matches/:id', async (req: AuthRequest, res) => {
    const validation = validateMatchPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); const hydrated = await hydrateMatch(validation.data, req.params.id); if ('error' in hydrated) return res.status(409).json({ error: hydrated.error });
    try { const existing = await prisma.esportsMatch.findUnique({ where: { id: req.params.id }, include: matchInclude }); if (!existing) return res.status(404).json({ error: 'Partida nao encontrada.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsMatch.update({ where: { id: existing.id }, data: hydrated.data!, include: matchInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE', entityType: 'EsportsMatch', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); if (item.tournamentId) await rebuildTournamentDerivedData(item.tournamentId); emitEsportsUpdate({ type: 'match-updated', matchId: item.id }); res.json(item); } catch { res.status(500).json({ error: errorMessage('a partida', 'atualizar') }); }
});

router.patch('/matches/:id/score', async (req: AuthRequest, res) => {
    const scoreA = Number(req.body?.scoreA); const scoreB = Number(req.body?.scoreB); const status = req.body?.status as MatchStatus; if (!Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0 || !Object.values(MatchStatus).includes(status)) return res.status(400).json({ error: 'Placar ou estado invalido.' });
    try { const existing = await prisma.esportsMatch.findUnique({ where: { id: req.params.id }, include: matchInclude }); if (!existing) return res.status(404).json({ error: 'Partida nao encontrada.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.esportsMatch.update({ where: { id: existing.id }, data: { scoreA, scoreB, status, isLive: status === MatchStatus.LIVE, time: status === MatchStatus.LIVE ? 'Live' : status === MatchStatus.FINISHED ? 'Completed' : existing.time }, include: matchInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE_SCORE', entityType: 'EsportsMatch', entityId: existing.id, before: { scoreA: existing.scoreA, scoreB: existing.scoreB, status: existing.status }, after: { scoreA, scoreB, status } }, tx); return updated; }); if (item.tournamentId) await rebuildTournamentDerivedData(item.tournamentId); emitEsportsUpdate({ type: 'score-updated', matchId: item.id, status: item.status }); res.json(item); } catch { res.status(500).json({ error: errorMessage('o placar', 'atualizar') }); }
});

router.delete('/matches/:id', async (req: AuthRequest, res) => { try { const existing = await prisma.esportsMatch.findUnique({ where: { id: req.params.id }, include: matchInclude }); if (!existing) return res.status(404).json({ error: 'Partida nao encontrada.' }); await prisma.$transaction(async (tx) => { await tx.esportsMatch.delete({ where: { id: existing.id } }); await writeAuditLog({ actorId: req.user?.id, action: 'DELETE', entityType: 'EsportsMatch', entityId: existing.id, before: existing }, tx); }); res.status(204).send(); } catch { res.status(500).json({ error: errorMessage('a partida', 'excluir') }); } });

router.get('/rankings', async (req, res) => {
    const parsed = parsePagination(req.query, { allowedSorts: ['rank', 'points', 'updatedAt'] as const, defaultSort: 'rank', defaultOrder: 'asc' }); if (!parsed.valid) return res.status(400).json({ error: parsed.error }); const where: Prisma.TeamRankingWhereInput = {}; if (typeof req.query.gameId === 'string' && req.query.gameId) where.gameId = req.query.gameId; if (parsed.value.search) where.teamName = { contains: parsed.value.search, mode: 'insensitive' };
    try { const [items, total] = await prisma.$transaction([prisma.teamRanking.findMany({ where, include: rankingInclude, orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.TeamRankingOrderByWithRelationInput[], skip: parsed.value.skip, take: parsed.value.take }), prisma.teamRanking.count({ where })]); res.json({ items, pagination: buildPaginationMeta(total, parsed.value) }); } catch { res.status(500).json({ error: errorMessage('rankings', 'buscar') }); }
});

const hydrateRanking = async (data: RankingPayload) => { const [game, team] = await Promise.all([prisma.game.findUnique({ where: { id: data.gameId }, select: { name: true } }), prisma.esportsTeam.findUnique({ where: { id: data.teamId }, select: { name: true, country: true } })]); return game && team ? { ...data, game: game.name, teamName: team.name, teamCountry: team.country } : null; };

router.post('/rankings', async (req: AuthRequest, res) => { const validation = validateRankingPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); const data = await hydrateRanking(validation.data); if (!data) return res.status(400).json({ error: 'Jogo ou equipe nao existe.' }); try { const item = await prisma.$transaction(async (tx) => { const created = await tx.teamRanking.create({ data, include: rankingInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'CREATE', entityType: 'TeamRanking', entityId: created.id, after: created }, tx); return created; }); res.status(201).json(item); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Posicao ou equipe duplicada para este jogo.' }); res.status(500).json({ error: errorMessage('o ranking', 'criar') }); } });

router.put('/rankings/:id', async (req: AuthRequest, res) => { const validation = validateRankingPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error }); const data = await hydrateRanking(validation.data); if (!data) return res.status(400).json({ error: 'Jogo ou equipe nao existe.' }); try { const existing = await prisma.teamRanking.findUnique({ where: { id: req.params.id }, include: rankingInclude }); if (!existing) return res.status(404).json({ error: 'Ranking nao encontrado.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.teamRanking.update({ where: { id: existing.id }, data, include: rankingInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE', entityType: 'TeamRanking', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Posicao ou equipe duplicada para este jogo.' }); res.status(500).json({ error: errorMessage('o ranking', 'atualizar') }); } });

router.delete('/rankings/:id', async (req: AuthRequest, res) => { try { const existing = await prisma.teamRanking.findUnique({ where: { id: req.params.id }, include: rankingInclude }); if (!existing) return res.status(404).json({ error: 'Ranking nao encontrado.' }); await prisma.$transaction(async (tx) => { await tx.teamRanking.delete({ where: { id: existing.id } }); await writeAuditLog({ actorId: req.user?.id, action: 'DELETE', entityType: 'TeamRanking', entityId: existing.id, before: existing }, tx); }); res.status(204).send(); } catch { res.status(500).json({ error: errorMessage('o ranking', 'excluir') }); } });

export default router;
