import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { NewsStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { PUBLIC_API_URL } from '../utils/config';
import { sanitizeNewsRecord, validateNewsPayload } from '../utils/news';
import { removeUploadedMedia, resolveMediaUrl, storeImage } from '../services/media';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { writeAuditLog } from '../services/audit';

const router = Router();

const publishDueNews = async () => {
    const where: Prisma.NewsWhereInput = {
        status: NewsStatus.SCHEDULED,
        scheduledAt: { lte: new Date() }
    };
    const due = await prisma.news.findMany({ where, select: { id: true } });
    if (due.length === 0) return;

    const publishedAt = new Date();
    await prisma.$transaction([
        prisma.news.updateMany({
            where: { id: { in: due.map((item) => item.id) } },
            data: { status: NewsStatus.PUBLISHED, publishedAt }
        }),
        prisma.adminAuditLog.createMany({
            data: due.map((item) => ({
                action: 'PUBLISH_SCHEDULED',
                entityType: 'News',
                entityId: item.id,
                after: { status: NewsStatus.PUBLISHED, publishedAt: publishedAt.toISOString() }
            }))
        })
    ]);
};

const publicNewsWhere = (now = new Date()): Prisma.NewsWhereInput => ({
    status: NewsStatus.PUBLISHED,
    publishedAt: { lte: now }
});

const withCommentCounts = async <T extends { id: string }>(records: T[]) => {
    if (records.length === 0) return records.map((record) => ({ ...record, commentsCount: 0 }));

    const counts = await prisma.comment.groupBy({
        by: ['newsId'],
        where: { newsId: { in: records.map((record) => record.id) } },
        _count: { _all: true }
    });
    const countByNewsId = new Map(counts.map((item) => [item.newsId, item._count._all]));

    return records.map((record) => ({
        ...record,
        commentsCount: countByNewsId.get(record.id) ?? 0
    }));
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

const acceptSingleImage = (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'A imagem deve ter no maximo 5 MB.'
                : 'Nao foi possivel processar o upload.';
            return res.status(400).json({ error: message });
        }
        if (error) return res.status(400).json({ error: 'Arquivo de imagem invalido.' });
        next();
    });
};

// Public news feed. Content is sanitized again on read to protect against legacy rows.
// Calls without pagination parameters keep the legacy array response temporarily.
router.get('/', async (req, res) => {
    const { category } = req.query;
    if (category !== undefined && typeof category !== 'string') {
        return res.status(400).json({ error: 'category deve ser um unico texto.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'headline', 'category', 'publishedAt'] as const,
        defaultSort: 'publishedAt',
        defaultOrder: 'desc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    try {
        await publishDueNews();
        const where: Prisma.NewsWhereInput = publicNewsWhere();
        if (category) where.category = { equals: category, mode: 'insensitive' };
        if (parsed.value.search) {
            where.OR = [
                { headline: { contains: parsed.value.search, mode: 'insensitive' } },
                { content: { contains: parsed.value.search, mode: 'insensitive' } },
                { author: { contains: parsed.value.search, mode: 'insensitive' } }
            ];
        }

        const orderBy = parsed.value.sort === 'publishedAt'
            ? [
                { publishedAt: parsed.value.order },
                { createdAt: parsed.value.order },
                { id: 'asc' }
            ] as Prisma.NewsOrderByWithRelationInput[]
            : [
                { [parsed.value.sort]: parsed.value.order },
                { id: 'asc' }
            ] as Prisma.NewsOrderByWithRelationInput[];

        if (!parsed.value.requested) {
            const news = await prisma.news.findMany({ where, orderBy });
            res.setHeader('Deprecation', 'true');
            res.setHeader('X-Pagination-Deprecated', 'true');
            return res.json((await withCommentCounts(news)).map(sanitizeNewsRecord));
        }

        const [news, total] = await prisma.$transaction([
            prisma.news.findMany({
                where,
                orderBy,
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.news.count({ where })
        ]);

        res.json({
            items: (await withCommentCounts(news)).map(sanitizeNewsRecord),
            pagination: buildPaginationMeta(total, parsed.value)
        });
    } catch {
        res.status(500).json({ error: 'Falha ao buscar noticias.' });
    }
});

// Admin-only image upload. The file extension is derived from its binary signature.
router.post(
    '/upload',
    authenticateToken,
    requireAdmin,
    acceptSingleImage,
    async (req: AuthRequest, res) => {
        if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem.' });

        try {
            // Same storage path as every other upload, so MEDIA_DRIVER=s3 also
            // moves news covers off the VPS disk.
            const stored = await storeImage(req.file, 'news');
            if (!stored) {
                return res.status(400).json({ error: 'Use uma imagem PNG, JPEG, GIF ou WebP valida.' });
            }

            const baseUrl = PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
            res.status(201).json({
                url: resolveMediaUrl(stored.pathname, baseUrl),
                mimeType: stored.mimeType,
                size: stored.size
            });
        } catch (error) {
            console.error('[news] Upload failed:', error);
            res.status(500).json({ error: 'Falha ao salvar a imagem.' });
        }
    }
);

router.get('/:idOrSlug', async (req, res) => {
    try {
        await publishDueNews();
        const news = await prisma.news.findFirst({
            where: {
                ...publicNewsWhere(),
                OR: [
                    { id: req.params.idOrSlug },
                    { slug: req.params.idOrSlug }
                ]
            }
        });
        if (!news) return res.status(404).json({ error: 'Noticia nao encontrada.' });
        const commentsCount = await prisma.comment.count({ where: { newsId: news.id } });
        res.json(sanitizeNewsRecord({ ...news, commentsCount }));
    } catch {
        res.status(500).json({ error: 'Falha ao buscar a noticia.' });
    }
});

router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const validation = validateNewsPayload(req.body, req.user?.name || 'Equipe Dicionario Gamer');
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    try {
        if (validation.data.tournamentId && !(await prisma.tournament.findUnique({ where: { id: validation.data.tournamentId }, select: { id: true } }))) return res.status(400).json({ error: 'O campeonato selecionado nao existe.' });
        const news = await prisma.$transaction(async (tx) => {
            const created = await tx.news.create({
                data: { ...validation.data, createdById: req.user?.id }
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'CREATE',
                entityType: 'News',
                entityId: created.id,
                after: created
            }, tx);
            return created;
        });
        res.status(201).json(sanitizeNewsRecord(news));
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe uma noticia com este slug.' });
        }
        console.error('[news] Failed to create news:', error);
        res.status(500).json({ error: 'Falha ao publicar a noticia.' });
    }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const validation = validateNewsPayload(req.body, req.user?.name || 'Equipe Dicionario Gamer');
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    try {
        if (validation.data.tournamentId && !(await prisma.tournament.findUnique({ where: { id: validation.data.tournamentId }, select: { id: true } }))) return res.status(400).json({ error: 'O campeonato selecionado nao existe.' });
        const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Noticia nao encontrada.' });

        const news = await prisma.$transaction(async (tx) => {
            const updated = await tx.news.update({
                where: { id: req.params.id },
                data: validation.data
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'UPDATE',
                entityType: 'News',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        if (existing.image !== news.image) await removeUploadedMedia(existing.image, 'news');
        res.json(sanitizeNewsRecord(news));
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Ja existe uma noticia com este slug.' });
        }
        console.error('[news] Failed to update news:', error);
        res.status(500).json({ error: 'Falha ao atualizar a noticia.' });
    }
});

router.patch('/:id/archive', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Noticia nao encontrada.' });

        const news = await prisma.$transaction(async (tx) => {
            const updated = await tx.news.update({
                where: { id: existing.id },
                data: {
                    status: NewsStatus.ARCHIVED,
                    archivedAt: new Date(),
                    scheduledAt: null
                }
            });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'ARCHIVE',
                entityType: 'News',
                entityId: existing.id,
                before: existing,
                after: updated
            }, tx);
            return updated;
        });
        res.json(sanitizeNewsRecord(news));
    } catch (error) {
        console.error('[news] Failed to archive news:', error);
        res.status(500).json({ error: 'Falha ao arquivar a noticia.' });
    }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'Noticia nao encontrada.' });

        await prisma.$transaction(async (tx) => {
            await tx.comment.deleteMany({ where: { newsId: existing.id } });
            await tx.news.delete({ where: { id: existing.id } });
            await writeAuditLog({
                actorId: req.user?.id,
                action: 'DELETE',
                entityType: 'News',
                entityId: existing.id,
                before: existing
            }, tx);
        });
        await removeUploadedMedia(existing.image, 'news');
        res.status(204).send();
    } catch (error) {
        console.error('[news] Failed to delete news:', error);
        res.status(500).json({ error: 'Falha ao excluir a noticia.' });
    }
});

export default router;
