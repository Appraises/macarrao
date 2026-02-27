import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Get maps for a specific game
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const maps = await prisma.gameMap.findMany({
            where: { gameId },
            include: {
                callouts: true
            }
        });
        res.json(maps);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

// Create a new map (Admin only - for future use)
router.post('/', async (req, res) => {
    try {
        const { gameId, name, image, tacticalImage, callouts } = req.body;

        const map = await prisma.gameMap.create({
            data: {
                gameId,
                name,
                image,
                tacticalImage,
                callouts: {
                    create: callouts
                }
            },
            include: {
                callouts: true
            }
        });

        res.status(201).json(map);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create map' });
    }
});

export default router;
