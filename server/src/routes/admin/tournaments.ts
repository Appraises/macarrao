import { ContentStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { TournamentPayload, validateTournamentPayload } from '../../utils/esports';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();

const tournamentInclude = {
    gameRecord: { select: { id: true, name: true, slug: true } },
    teams: { orderBy: { name: 'asc' as const } },
    standings: { orderBy: { rank: 'asc' as const } },
    bracket: { orderBy: [{ round: 'asc' as const }, { matchKey: 'asc' as const }] },
    stats: { orderBy: { name: 'asc' as const } },
    _count: { select: { matches: true } }
} satisfies Prisma.TournamentInclude;

const generalData = (data: TournamentPayload) => {
    const { teams, standings, bracket, stats, ...general } = data;
    return { general, teams, standings, bracket, stats };
};

const validateReferences = async (data: { gameId: string; teams: Array<{ teamId: string | null }>; standings: Array<{ teamId: string | null }>; bracket: Array<{ teamAId: string | null; teamBId: string | null }>; stats: Array<{ playerId: string | null }> }) => {
    const [game, teamCount, playerCount] = await Promise.all([
        prisma.game.findUnique({ where: { id: data.gameId }, select: { id: true } }),
        (() => {
            const ids = [...data.teams.map((item) => item.teamId), ...data.standings.map((item) => item.teamId), ...data.bracket.flatMap((item) => [item.teamAId, item.teamBId])].filter(Boolean) as string[];
            return ids.length ? prisma.esportsTeam.count({ where: { id: { in: Array.from(new Set(ids)) } } }).then((count) => ({ count, expected: new Set(ids).size })) : Promise.resolve({ count: 0, expected: 0 });
        })(),
        (() => {
            const ids = data.stats.map((item) => item.playerId).filter(Boolean) as string[];
            return ids.length ? prisma.esportsPlayer.count({ where: { id: { in: Array.from(new Set(ids)) } } }).then((count) => ({ count, expected: new Set(ids).size })) : Promise.resolve({ count: 0, expected: 0 });
        })()
    ]);
    if (!game) return 'O jogo selecionado nao existe.';
    if (teamCount.count !== teamCount.expected) return 'Uma das equipes selecionadas nao existe.';
    if (playerCount.count !== playerCount.expected) return 'Um dos jogadores selecionados nao existe.';
    return null;
};

router.get('/', async (req, res) => {
    const { publicationStatus, gameId, status } = req.query;
    if (publicationStatus !== undefined && (typeof publicationStatus !== 'string' || !Object.values(ContentStatus).includes(publicationStatus as ContentStatus))) return res.status(400).json({ error: 'Estado de publicacao invalido.' });
    if (gameId !== undefined && typeof gameId !== 'string') return res.status(400).json({ error: 'gameId invalido.' });
    if (status !== undefined && typeof status !== 'string') return res.status(400).json({ error: 'status invalido.' });
    const parsed = parsePagination(req.query, { allowedSorts: ['createdAt', 'updatedAt', 'name', 'startAt', 'endAt'] as const, defaultSort: 'createdAt', defaultOrder: 'desc' });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.TournamentWhereInput = {};
    if (publicationStatus) where.publicationStatus = publicationStatus as ContentStatus;
    if (gameId) where.gameId = gameId as string;
    if (status) where.status = status as string;
    if (parsed.value.search) where.OR = [{ name: { contains: parsed.value.search, mode: 'insensitive' } }, { organizer: { contains: parsed.value.search, mode: 'insensitive' } }, { location: { contains: parsed.value.search, mode: 'insensitive' } }];
    try {
        const [items, total] = await prisma.$transaction([
            prisma.tournament.findMany({ where, include: tournamentInclude, orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.TournamentOrderByWithRelationInput[], skip: parsed.value.skip, take: parsed.value.take }),
            prisma.tournament.count({ where })
        ]);
        res.json({ items, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) { console.error('[admin/tournaments] List failed:', error); res.status(500).json({ error: 'Falha ao buscar campeonatos.' }); }
});

router.get('/:id', async (req, res) => {
    try { const item = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: tournamentInclude }); if (!item) return res.status(404).json({ error: 'Campeonato nao encontrado.' }); res.json(item); }
    catch (error) { console.error('[admin/tournaments] Detail failed:', error); res.status(500).json({ error: 'Falha ao buscar o campeonato.' }); }
});

router.post('/', async (req: AuthRequest, res) => {
    const validation = validateTournamentPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error });
    const referenceError = await validateReferences(validation.data); if (referenceError) return res.status(400).json({ error: referenceError });
    const { general, teams, standings, bracket, stats } = generalData(validation.data);
    try {
        const created = await prisma.$transaction(async (tx) => {
            const item = await tx.tournament.create({ data: { ...general, teams: { create: teams }, standings: { create: standings }, bracket: { create: bracket }, stats: { create: stats.map((stat) => ({ ...stat, stats: stat.stats as Prisma.InputJsonValue })) } }, include: tournamentInclude });
            await writeAuditLog({ actorId: req.user?.id, action: 'CREATE', entityType: 'Tournament', entityId: item.id, after: item }, tx); return item;
        });
        res.status(201).json(created);
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Slug, equipe, posicao ou chave duplicada.' }); console.error('[admin/tournaments] Create failed:', error); res.status(500).json({ error: 'Falha ao criar o campeonato.' }); }
});

router.put('/:id', async (req: AuthRequest, res) => {
    const validation = validateTournamentPayload(req.body); if (!validation.valid) return res.status(400).json({ error: validation.error });
    const referenceError = await validateReferences(validation.data); if (referenceError) return res.status(400).json({ error: referenceError });
    const { general, teams, standings, bracket, stats } = generalData(validation.data);
    try {
        const existing = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: tournamentInclude }); if (!existing) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const updated = await prisma.$transaction(async (tx) => {
            await Promise.all([tx.tournamentTeam.deleteMany({ where: { tournamentId: existing.id } }), tx.tournamentStanding.deleteMany({ where: { tournamentId: existing.id } }), tx.bracketMatch.deleteMany({ where: { tournamentId: existing.id } }), tx.playerStat.deleteMany({ where: { tournamentId: existing.id } })]);
            const item = await tx.tournament.update({ where: { id: existing.id }, data: { ...general, teams: { create: teams }, standings: { create: standings }, bracket: { create: bracket }, stats: { create: stats.map((stat) => ({ ...stat, stats: stat.stats as Prisma.InputJsonValue })) } }, include: tournamentInclude });
            await writeAuditLog({ actorId: req.user?.id, action: 'UPDATE', entityType: 'Tournament', entityId: item.id, before: existing, after: item }, tx); return item;
        });
        res.json(updated);
    } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'Slug, equipe, posicao ou chave duplicada.' }); console.error('[admin/tournaments] Update failed:', error); res.status(500).json({ error: 'Falha ao atualizar o campeonato.' }); }
});

router.post('/:id/duplicate', async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: tournamentInclude }); if (!existing) return res.status(404).json({ error: 'Campeonato nao encontrado.' });
        const suffix = Date.now().toString(36); const { id, createdAt, updatedAt, _count, gameRecord, teams, standings, bracket, stats, ...general } = existing;
        const created = await prisma.$transaction(async (tx) => {
            const item = await tx.tournament.create({ data: { ...general, name: `${general.name} (copia)`, slug: `${general.slug}-copia-${suffix}`, publicationStatus: ContentStatus.DRAFT, startAt: null, endAt: null, dates: null, archivedAt: null, teams: { create: teams.map(({ id, tournamentId, ...team }) => team) }, standings: { create: standings.map(({ id, tournamentId, ...row }) => row) }, bracket: { create: bracket.map(({ id, tournamentId, ...match }) => match) }, stats: { create: stats.map(({ id, tournamentId, stats, ...row }) => ({ ...row, stats: stats as Prisma.InputJsonValue })) } }, include: tournamentInclude });
            await writeAuditLog({ actorId: req.user?.id, action: 'DUPLICATE', entityType: 'Tournament', entityId: item.id, metadata: { sourceId: existing.id }, after: item }, tx); return item;
        });
        res.status(201).json(created);
    } catch (error) { console.error('[admin/tournaments] Duplicate failed:', error); res.status(500).json({ error: 'Falha ao duplicar o campeonato.' }); }
});

router.patch('/:id/archive', async (req: AuthRequest, res) => {
    try { const existing = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: tournamentInclude }); if (!existing) return res.status(404).json({ error: 'Campeonato nao encontrado.' }); const item = await prisma.$transaction(async (tx) => { const updated = await tx.tournament.update({ where: { id: existing.id }, data: { publicationStatus: ContentStatus.ARCHIVED, archivedAt: new Date() }, include: tournamentInclude }); await writeAuditLog({ actorId: req.user?.id, action: 'ARCHIVE', entityType: 'Tournament', entityId: existing.id, before: existing, after: updated }, tx); return updated; }); res.json(item); }
    catch (error) { console.error('[admin/tournaments] Archive failed:', error); res.status(500).json({ error: 'Falha ao arquivar o campeonato.' }); }
});

router.delete('/:id', async (req: AuthRequest, res) => {
    try { const existing = await prisma.tournament.findUnique({ where: { id: req.params.id }, include: tournamentInclude }); if (!existing) return res.status(404).json({ error: 'Campeonato nao encontrado.' }); if (existing._count.matches > 0) return res.status(409).json({ error: 'O campeonato possui partidas vinculadas. Arquive-o em vez de excluir.' }); await prisma.$transaction(async (tx) => { await tx.tournament.delete({ where: { id: existing.id } }); await writeAuditLog({ actorId: req.user?.id, action: 'DELETE', entityType: 'Tournament', entityId: existing.id, before: existing }, tx); }); res.status(204).send(); }
    catch (error) { console.error('[admin/tournaments] Delete failed:', error); res.status(500).json({ error: 'Falha ao excluir o campeonato.' }); }
});

export default router;
