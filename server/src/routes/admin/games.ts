import { ContentStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { validateGamePayload } from '../../utils/games';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { removeUploadedMedia } from '../../services/media';

const router = Router();

const gameInclude = {
    _count: {
        select: {
            terms: true,
            maps: true,
            favoritedBy: true
        }
    }
} satisfies Prisma.GameInclude;

router.get('/', async (req, res) => {
    const { status, genre } = req.query;
    if (status !== undefined && (typeof status !== 'string' || !Object.values(ContentStatus).includes(status as ContentStatus))) {
        return res.status(400).json({ error: 'Status de jogo invalido.' });
    }
    if (genre !== undefined && typeof genre !== 'string') {
        return res.status(400).json({ error: 'genre deve ser um unico texto.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'name', 'genre'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.GameWhereInput = {};
    if (status) where.status = status as ContentStatus;
    if (genre) where.genre = { equals: genre, mode: 'insensitive' };
    if (parsed.value.search) {
        where.OR = [
            { name: { contains: parsed.value.search, mode: 'insensitive' } },
            { genre: { contains: parsed.value.search, mode: 'insensitive' } },
            { description: { contains: parsed.value.search, mode: 'insensitive' } }
        ];
    }

    try {
        const [games, total] = await prisma.$transaction([
            prisma.game.findMany({
                where,
                include: gameInclude,
                orderBy: [
                    { [parsed.value.sort]: parsed.value.order },
                    { id: 'asc' }
                ] as Prisma.GameOrderByWithRelationInput[],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.game.count({ where })
        ]);

        res.json({ items: games, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        console.error('[admin/games] Failed to list games:', error);
        res.status(500).json({ error: 'Falha ao buscar jogos.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const game = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude });
        if (!game) return res.status(404).json({ error: 'Jogo nao encontrado.' });
        res.json(game);
    } catch {
        res.status(500).json({ error: 'Falha ao buscar o jogo.' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    const validation = validateGamePayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    try {
        const game = await prisma.$transaction(async (tx) => {
            const created = await tx.game.create({ data: validation.data, include: gameInclude });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'CREATE',
                entityType: 'Game',
                entityId: created.id,
                after: created
            }, tx);
            return created;
        });
        res.status(201).json(game);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe um jogo com este slug.' });
        }
        console.error('[admin/games] Failed to create game:', error);
        res.status(500).json({ error: 'Falha ao criar o jogo.' });
    }
});

router.put('/:id', async (req: AuthRequest, res) => {
    const validation = validateGamePayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    try {
        const existing = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude });
        if (!existing) return res.status(404).json({ error: 'Jogo nao encontrado.' });

        const game = await prisma.$transaction(async (tx) => {
            const updated = await tx.game.update({
                where: { id: existing.id },
                data: validation.data,
                include: gameInclude
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'UPDATE',
                entityType: 'Game',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        if (existing.image !== game.image) await removeUploadedMedia(existing.image, 'games');
        res.json(game);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe um jogo com este slug.' });
        }
        console.error('[admin/games] Failed to update game:', error);
        res.status(500).json({ error: 'Falha ao atualizar o jogo.' });
    }
});

router.patch('/:id/archive', async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude });
        if (!existing) return res.status(404).json({ error: 'Jogo nao encontrado.' });

        const game = await prisma.$transaction(async (tx) => {
            const updated = await tx.game.update({
                where: { id: existing.id },
                data: { status: ContentStatus.ARCHIVED, archivedAt: new Date() },
                include: gameInclude
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'ARCHIVE',
                entityType: 'Game',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        res.json(game);
    } catch (error) {
        console.error('[admin/games] Failed to archive game:', error);
        res.status(500).json({ error: 'Falha ao arquivar o jogo.' });
    }
});

router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude });
        if (!existing) return res.status(404).json({ error: 'Jogo nao encontrado.' });

        const dependencies = existing._count.terms + existing._count.maps + existing._count.favoritedBy;
        if (dependencies > 0) {
            return res.status(409).json({
                error: 'Este jogo possui termos, mapas ou favoritos vinculados. Arquive-o em vez de excluir.',
                dependencies: existing._count
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.game.delete({ where: { id: existing.id } });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'DELETE',
                entityType: 'Game',
                entityId: existing.id,
                before: existing
            }, tx);
        });
        await removeUploadedMedia(existing.image, 'games');
        res.status(204).send();
    } catch (error) {
        console.error('[admin/games] Failed to delete game:', error);
        res.status(500).json({ error: 'Falha ao excluir o jogo.' });
    }
});

export default router;
