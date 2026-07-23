import { ContentStatus } from '@prisma/client';
import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get maps for a specific game
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const maps = await prisma.gameMap.findMany({
            where: {
                gameId,
                status: ContentStatus.PUBLISHED,
                game: { status: ContentStatus.PUBLISHED }
            },
            include: {
                callouts: true
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }]
        });
        res.json(maps);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

export default router;
