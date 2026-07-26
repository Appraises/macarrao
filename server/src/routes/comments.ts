import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { NewsStatus } from '@prisma/client';
import { validateCommentPayload } from '../utils/userInput';

const router = Router();

/**
 * Each comment is worth 10 XP, and XP drives levels, the leaderboard and badges. With no
 * limit here the only ceiling was the global one, so a loop could mint ~1000 XP every 15
 * minutes. Twenty an hour is far above what a person writing real comments needs.
 */
const commentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitos comentarios em pouco tempo. Tente novamente mais tarde.' }
});

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
router.post('/', commentLimiter, authenticateToken, async (req: any, res) => {
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
