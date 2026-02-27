import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = Router();

// Apply middleware to all routes in this router
router.use(authenticateToken, requireAdmin);

router.get('/stats', async (req, res) => {
    try {
        const [userCount, termCount, gameCount, newsCount] = await Promise.all([
            prisma.user.count(),
            prisma.term.count(),
            prisma.game.count(),
            prisma.news.count()
        ]);

        res.json({
            users: userCount,
            terms: termCount,
            games: gameCount,
            news: newsCount
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                level: true,
                avatar: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
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
            GROUP BY month
            ORDER BY month ASC
        `;

        // Categories: Terms per Game Genre
        const categoriesRaw = await prisma.$queryRaw`
            SELECT g.genre, COUNT(t.id)::int as count 
            FROM "Term" t 
            JOIN "Game" g ON t."gameId" = g.id 
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

export default router;
