import { ContentStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { validateMapPayload } from '../../utils/maps';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { removeUploadedMedia } from '../../services/media';

const router = Router();

const mapInclude = {
    game: { select: { id: true, name: true, slug: true } },
    callouts: { orderBy: { name: 'asc' as const } }
} satisfies Prisma.GameMapInclude;

router.get('/', async (req, res) => {
    const { status, gameId } = req.query;
    if (status !== undefined && (typeof status !== 'string' || !Object.values(ContentStatus).includes(status as ContentStatus))) {
        return res.status(400).json({ error: 'Status de mapa invalido.' });
    }
    if (gameId !== undefined && typeof gameId !== 'string') {
        return res.status(400).json({ error: 'gameId deve ser um unico texto.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'name'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.GameMapWhereInput = {};
    if (status) where.status = status as ContentStatus;
    if (gameId) where.gameId = gameId;
    if (parsed.value.search) {
        where.OR = [
            { name: { contains: parsed.value.search, mode: 'insensitive' } },
            { game: { name: { contains: parsed.value.search, mode: 'insensitive' } } }
        ];
    }

    try {
        const [maps, total] = await prisma.$transaction([
            prisma.gameMap.findMany({
                where,
                include: mapInclude,
                orderBy: [
                    { [parsed.value.sort]: parsed.value.order },
                    { id: 'asc' }
                ] as Prisma.GameMapOrderByWithRelationInput[],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.gameMap.count({ where })
        ]);
        res.json({ items: maps, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        console.error('[admin/maps] Failed to list maps:', error);
        res.status(500).json({ error: 'Falha ao buscar mapas.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const map = await prisma.gameMap.findUnique({ where: { id: req.params.id }, include: mapInclude });
        if (!map) return res.status(404).json({ error: 'Mapa nao encontrado.' });
        res.json(map);
    } catch {
        res.status(500).json({ error: 'Falha ao buscar o mapa.' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    const validation = validateMapPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { callouts, ...mapData } = validation.data;
    try {
        const game = await prisma.game.findUnique({ where: { id: mapData.gameId }, select: { id: true } });
        if (!game) return res.status(400).json({ error: 'O jogo selecionado nao existe.' });

        const map = await prisma.$transaction(async (tx) => {
            const created = await tx.gameMap.create({
                data: { ...mapData, callouts: { create: callouts } },
                include: mapInclude
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'CREATE',
                entityType: 'GameMap',
                entityId: created.id,
                after: created
            }, tx);
            return created;
        });
        res.status(201).json(map);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe um mapa com este nome para o jogo.' });
        }
        console.error('[admin/maps] Failed to create map:', error);
        res.status(500).json({ error: 'Falha ao criar o mapa.' });
    }
});

router.put('/:id', async (req: AuthRequest, res) => {
    const validation = validateMapPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { callouts, ...mapData } = validation.data;
    try {
        const existing = await prisma.gameMap.findUnique({ where: { id: req.params.id }, include: mapInclude });
        if (!existing) return res.status(404).json({ error: 'Mapa nao encontrado.' });
        const game = await prisma.game.findUnique({ where: { id: mapData.gameId }, select: { id: true } });
        if (!game) return res.status(400).json({ error: 'O jogo selecionado nao existe.' });

        const map = await prisma.$transaction(async (tx) => {
            await tx.mapCallout.deleteMany({ where: { mapId: existing.id } });
            const updated = await tx.gameMap.update({
                where: { id: existing.id },
                data: { ...mapData, callouts: { create: callouts } },
                include: mapInclude
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'UPDATE',
                entityType: 'GameMap',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        if (existing.image !== map.image) await removeUploadedMedia(existing.image, 'maps');
        if (existing.tacticalImage !== map.tacticalImage) await removeUploadedMedia(existing.tacticalImage, 'maps');
        res.json(map);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe um mapa com este nome para o jogo.' });
        }
        console.error('[admin/maps] Failed to update map:', error);
        res.status(500).json({ error: 'Falha ao atualizar o mapa.' });
    }
});

router.patch('/:id/archive', async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.gameMap.findUnique({ where: { id: req.params.id }, include: mapInclude });
        if (!existing) return res.status(404).json({ error: 'Mapa nao encontrado.' });

        const map = await prisma.$transaction(async (tx) => {
            const updated = await tx.gameMap.update({
                where: { id: existing.id },
                data: { status: ContentStatus.ARCHIVED, archivedAt: new Date() },
                include: mapInclude
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'ARCHIVE',
                entityType: 'GameMap',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        res.json(map);
    } catch (error) {
        console.error('[admin/maps] Failed to archive map:', error);
        res.status(500).json({ error: 'Falha ao arquivar o mapa.' });
    }
});

router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.gameMap.findUnique({ where: { id: req.params.id }, include: mapInclude });
        if (!existing) return res.status(404).json({ error: 'Mapa nao encontrado.' });

        await prisma.$transaction(async (tx) => {
            await tx.gameMap.delete({ where: { id: existing.id } });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'DELETE',
                entityType: 'GameMap',
                entityId: existing.id,
                before: existing
            }, tx);
        });
        await Promise.all([
            removeUploadedMedia(existing.image, 'maps'),
            removeUploadedMedia(existing.tacticalImage, 'maps')
        ]);
        res.status(204).send();
    } catch (error) {
        console.error('[admin/maps] Failed to delete map:', error);
        res.status(500).json({ error: 'Falha ao excluir o mapa.' });
    }
});

export default router;
