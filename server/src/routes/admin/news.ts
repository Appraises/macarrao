import { NewsStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { sanitizeNewsRecord } from '../../utils/news';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();

const includeCreator = {
    createdBy: { select: { id: true, name: true, email: true } }
} satisfies Prisma.NewsInclude;

router.get('/', async (req, res) => {
    const { status, category, author, dateFrom, dateTo } = req.query;
    if (status !== undefined && (typeof status !== 'string' || !Object.values(NewsStatus).includes(status as NewsStatus))) {
        return res.status(400).json({ error: 'Status editorial invalido.' });
    }
    if (category !== undefined && typeof category !== 'string') {
        return res.status(400).json({ error: 'category deve ser um unico texto.' });
    }
    if (author !== undefined && typeof author !== 'string') {
        return res.status(400).json({ error: 'author deve ser um unico texto.' });
    }
    const startDate = typeof dateFrom === 'string' && dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
    const endDate = typeof dateTo === 'string' && dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
    if ((dateFrom && (!startDate || Number.isNaN(startDate.getTime()))) || (dateTo && (!endDate || Number.isNaN(endDate.getTime())))) {
        return res.status(400).json({ error: 'Periodo invalido.' });
    }
    if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({ error: 'A data inicial deve ser anterior a data final.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'headline', 'category', 'publishedAt', 'scheduledAt'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.NewsWhereInput = {};
    if (status) where.status = status as NewsStatus;
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (author) where.author = { contains: author, mode: 'insensitive' };
    if (startDate || endDate) {
        where.createdAt = {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {})
        };
    }
    if (parsed.value.search) {
        where.OR = [
            { headline: { contains: parsed.value.search, mode: 'insensitive' } },
            { slug: { contains: parsed.value.search, mode: 'insensitive' } },
            { author: { contains: parsed.value.search, mode: 'insensitive' } },
            { content: { contains: parsed.value.search, mode: 'insensitive' } }
        ];
    }

    try {
        const [news, total] = await prisma.$transaction([
            prisma.news.findMany({
                where,
                include: includeCreator,
                orderBy: [
                    { [parsed.value.sort]: parsed.value.order },
                    { id: 'asc' }
                ] as Prisma.NewsOrderByWithRelationInput[],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.news.count({ where })
        ]);
        res.json({
            items: news.map(sanitizeNewsRecord),
            pagination: buildPaginationMeta(total, parsed.value)
        });
    } catch (error) {
        console.error('[admin/news] Failed to list news:', error);
        res.status(500).json({ error: 'Falha ao buscar noticias.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const news = await prisma.news.findUnique({
            where: { id: req.params.id },
            include: includeCreator
        });
        if (!news) return res.status(404).json({ error: 'Noticia nao encontrada.' });
        res.json(sanitizeNewsRecord(news));
    } catch (error) {
        console.error('[admin/news] Failed to load news:', error);
        res.status(500).json({ error: 'Falha ao buscar a noticia.' });
    }
});

export default router;
