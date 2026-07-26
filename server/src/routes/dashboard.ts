import { Router } from 'express';
import { Prisma, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import adminGamesRouter from './admin/games';
import adminMapsRouter from './admin/maps';
import adminNewsRouter from './admin/news';
import adminUploadsRouter from './admin/uploads';
import adminTournamentsRouter from './admin/tournaments';
import adminEsportsRouter from './admin/esports';
import adminPrivacyRouter from './admin/privacy';
import adminContributionsRouter from './admin/contributions';
import adminAnalyticsRouter from './admin/analytics';
import adminTermsRouter from './admin/terms';

const router = Router();

// Apply middleware to all routes in this router
router.use(authenticateToken, requireAdmin);
router.use('/games', adminGamesRouter);
router.use('/maps', adminMapsRouter);
router.use('/news', adminNewsRouter);
router.use('/uploads', adminUploadsRouter);
router.use('/tournaments', adminTournamentsRouter);
router.use('/esports', adminEsportsRouter);
router.use('/privacy-requests', adminPrivacyRouter);
router.use('/contributions', adminContributionsRouter);
router.use('/analytics', adminAnalyticsRouter);
router.use('/terms', adminTermsRouter);

router.get('/stats', async (req, res) => {
    try {
        const [userCount, termCount, contributionCount, gameCount, newsCount] = await Promise.all([
            prisma.user.count(),
            prisma.term.count({ where: { status: TermStatus.APPROVED, archivedAt: null } }),
            prisma.term.count({ where: { status: { in: [TermStatus.PENDING, TermStatus.CHANGES_REQUESTED] } } }),
            prisma.game.count(),
            prisma.news.count()
        ]);

        res.json({
            users: userCount,
            terms: termCount,
            contributions: contributionCount,
            games: gameCount,
            news: newsCount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/users', async (req, res) => {
    const { role } = req.query;
    if (role !== undefined && role !== 'ADMIN' && role !== 'USER') {
        return res.status(400).json({ error: 'role deve ser ADMIN ou USER.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'name', 'email', 'level'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    try {
        const where: Prisma.UserWhereInput = {};
        if (role) where.role = role;
        if (parsed.value.search) {
            where.OR = [
                { name: { contains: parsed.value.search, mode: 'insensitive' } },
                { email: { contains: parsed.value.search, mode: 'insensitive' } }
            ];
        }

        const select: Prisma.UserSelect = {
            id: true,
            name: true,
            email: true,
            role: true,
            level: true,
            avatar: true,
            createdAt: true
        };
        const orderBy = [
            { [parsed.value.sort]: parsed.value.order },
            { id: 'asc' }
        ] as Prisma.UserOrderByWithRelationInput[];

        if (!parsed.value.requested) {
            const users = await prisma.user.findMany({ where, select, orderBy });
            res.setHeader('Deprecation', 'true');
            res.setHeader('X-Pagination-Deprecated', 'true');
            return res.json(users);
        }

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                select,
                orderBy,
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            items: users,
            pagination: buildPaginationMeta(total, parsed.value)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


router.get('/charts', async (req, res) => {
    try {
        // Activity: Terms created per month for the current year
        const currentYear = new Date().getFullYear();
        const activityRaw = await prisma.$queryRaw`
            SELECT EXTRACT(MONTH FROM "createdAt") as month, COUNT(id)::int as count 
            FROM "Term" 
            WHERE EXTRACT(YEAR FROM "createdAt") = ${currentYear}
              AND "status" = 'APPROVED'::"TermStatus"
              AND "archivedAt" IS NULL
            GROUP BY month
            ORDER BY month ASC
        `;

        // Categories: Terms per Game Genre
        const categoriesRaw = await prisma.$queryRaw`
            SELECT g.genre, COUNT(t.id)::int as count 
            FROM "Term" t 
            JOIN "Game" g ON t."gameId" = g.id
            WHERE t."status" = 'APPROVED'::"TermStatus" AND t."archivedAt" IS NULL
            GROUP BY g.genre 
            ORDER BY count DESC
            LIMIT 5
        `;

        // Process activity to match array format [Jan, Feb, ..., Dec]
        const activity = new Array(12).fill(0);
        (activityRaw as any[]).forEach((item: any) => {
            // month is 1-indexed
            if (item.month >= 1 && item.month <= 12) {
                activity[item.month - 1] = item.count;
            }
        });

        // Process categories
        const categories = (categoriesRaw as any[]).map((item: any) => ({
            label: item.genre,
            val: item.count
        }));

        res.json({
            activity,
            categories
        });
    } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// ---- Content reports / moderation (admin only, via router.use above) ----

router.get('/reports', async (req, res) => {
    try {
        const { status, termId } = req.query;
        if (status !== undefined && (typeof status !== 'string' || !['PENDING', 'RESOLVED', 'DISMISSED'].includes(status))) {
            return res.status(400).json({ error: 'Status de denuncia invalido.' });
        }
        if (termId !== undefined && (typeof termId !== 'string' || termId.length > 100)) {
            return res.status(400).json({ error: 'termId invalido.' });
        }
        const where: any = {};
        if (status && typeof status === 'string') where.status = status;
        if (termId && typeof termId === 'string') where.termId = termId;
        const reports = await prisma.report.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { term: { select: { id: true, word: true, status: true, archivedAt: true } } },
        });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

router.patch('/reports/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // PENDING | RESOLVED | DISMISSED
    if (!['PENDING', 'RESOLVED', 'DISMISSED'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
    }
    try {
        const report = await prisma.report.update({ where: { id }, data: { status } });
        res.json(report);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update report' });
    }
});

export default router;
