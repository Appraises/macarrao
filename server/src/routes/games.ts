import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all games
router.get('/', async (req, res) => {
    try {
        const games = await prisma.game.findMany();
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Get game by slug
router.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const game = await prisma.game.findUnique({
            where: { slug },
            include: { terms: true }
        });
        if (!game) return res.status(404).json({ error: 'Game not found' });
        res.json(game);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch game' });
    }
});

export default router;
