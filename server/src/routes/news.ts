import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const news = await prisma.news.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

router.post('/', async (req, res) => {
    const { headline, category, image, content, author } = req.body;
    try {
        const news = await prisma.news.create({
            data: { headline, category, image, content, author }
        });
        res.status(201).json(news);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create news' });
    }
});

export default router;
