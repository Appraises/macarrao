import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { NewsStatus } from '@prisma/client';
import { validateCommentPayload } from '../utils/userInput';

const router = Router();

// Get comments for a news item
router.get('/:newsId', async (req, res) => {
    try {
        const { newsId } = req.params;
        const news = await prisma.news.findFirst({ where: { id: newsId, status: NewsStatus.PUBLISHED }, select: { id: true } });
        if (!news) return res.status(404).json({ error: 'Noticia publicada nao encontrada.' });
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
import { evaluateBadges } from '../services/badges';

// Create a new comment
router.post('/', authenticateToken, async (req: any, res) => {
    const validation = validateCommentPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    try {
        const userId = req.user.id;
        const news = await prisma.news.findFirst({ where: { id: validation.data.newsId, status: NewsStatus.PUBLISHED }, select: { id: true } });
        if (!news) return res.status(404).json({ error: 'Noticia publicada nao encontrada.' });

        const comment = await prisma.comment.create({
            data: {
                content: validation.data.content,
                newsId: validation.data.newsId,
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

        try {
            await awardXp(userId, 10);
            await evaluateBadges(userId);
        } catch (error) {
            console.error('[comments] Comment persisted, but XP/badge award failed:', error);
        }

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

export default router;
