import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get comments for a news item
router.get('/:newsId', async (req, res) => {
    try {
        const { newsId } = req.params;
        const comments = await prisma.comment.findMany({
            where: { newsId },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

import { awardXp } from '../services/leveling';

// Create a new comment
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const { content, newsId } = req.body;
        // Fix: user.id is usually available on req.user, check auth middleware if needed. 
        // Based on other files, it seems to be req.user.id
        const userId = req.user.id;

        if (!content || !newsId) {
            return res.status(400).json({ error: 'Content and newsId are required' });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                newsId,
                userId
            },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        await awardXp(userId, 10); // Award 10 XP for commenting

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

export default router;
