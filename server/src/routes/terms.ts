import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Get all terms (with optional gameId and verified filter)
router.get('/', async (req, res) => {
    const { gameId, verified } = req.query;
    try {
        const where: any = {};
        if (gameId) where.gameId = String(gameId);
        if (verified !== undefined) where.verified = verified === 'true';

        const terms = await prisma.term.findMany({
            where,
            include: { game: true },
            orderBy: { upvotes: 'desc' }
        });

        res.json(terms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch terms' });
    }
});

// Search Terms (Autocomplete)
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.json([]);
    }

    try {
        const terms = await prisma.term.findMany({
            where: {
                word: {
                    contains: q,
                    mode: 'insensitive'
                },
                verified: true
            },
            take: 5,
            select: {
                id: true,
                word: true,
                definition: true,
                tags: true
            }
        });

        // Also search games? For now just terms as requested
        res.json(terms);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get term by ID or Slug
router.get('/:idOrSlug', async (req, res) => {
    const { idOrSlug } = req.params;
    try {
        let term;

        // Check if input is a valid UUID to prevent Postgres errors
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);

        if (isUuid) {
            term = await prisma.term.findUnique({
                where: { id: idOrSlug },
                include: { game: true }
            });
        }

        // If not found by ID (or not a UUID), try finding by Word (Slug)
        if (!term) {
            // 1. Try exact match (insensitive)
            term = await prisma.term.findFirst({
                where: { word: { equals: idOrSlug, mode: 'insensitive' } },
                include: { game: true }
            });
        }

        // 2. Fallback: Try match with trimmed input (handle spaces)
        if (!term) {
            term = await prisma.term.findFirst({
                where: { word: { equals: idOrSlug.trim(), mode: 'insensitive' } },
                include: { game: true }
            });
        }

        // 3. Last resort: Try 'contains' for partial matches (careful with this, verify verified=true)
        if (!term) {
            term = await prisma.term.findFirst({
                where: {
                    word: { contains: idOrSlug.trim(), mode: 'insensitive' },
                    verified: true
                },
                include: { game: true }
            });
        }

        if (!term) return res.status(404).json({ error: 'Term not found' });

        const tags = Array.isArray(term.tags) ? term.tags as string[] : [];

        // Fetch related terms (keywords) that share at least one tag
        let keywords: string[] = [];
        if (tags.length > 0) {
            const relatedTerms = await prisma.term.findMany({
                where: {
                    AND: [
                        { id: { not: term.id } }, // Exclude current term
                        {
                            OR: tags.map((tag: string) => ({
                                tags: { array_contains: tag }
                            }))
                        }
                    ]
                },
                select: { word: true }
            });
            keywords = relatedTerms.map(t => t.word);
        }

        const parsedRelatedTerms = Array.isArray(term.relatedTerms) ? term.relatedTerms : [];

        res.json({
            ...term,
            tags: tags,
            keywords,
            relatedTerms: parsedRelatedTerms
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch term' });
    }
});

import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateTermContent } from '../utils/validator';
import { requireAdmin } from '../middleware/roles';

// ... (existing code)

// Create Term (Contribution)
router.post('/', authenticateToken, async (req: any, res: any) => {
    const { word, definition, gameId, examples, tags } = req.body;
    const user = req.user;

    if (!user.emailVerified) {
        return res.status(403).json({ error: 'You must verify your email to suggest terms.' });
    }

    // Validation Step
    const validation = validateTermContent(word, definition);
    if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
    }

    try {
        const term = await prisma.term.create({
            data: {
                word,
                definition,
                gameId,
                examples: examples || [],
                tags: Array.isArray(tags) ? tags : [],
                verified: false, // Default to unverified
                authorId: user.id
            }
        });
        res.status(201).json(term);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create term' });
    }
});

import { awardXp } from '../services/leveling';

// Verify Term (Accept Contribution)
router.patch('/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const term = await prisma.term.update({
            where: { id },
            data: { verified: true }
        });

        if (term.authorId) {
            await awardXp(term.authorId, 50); // Award 50 XP for approved term
        }

        res.json(term);
    } catch (error) {
        res.status(400).json({ error: 'Failed to verify term' });
    }
});

// Delete Term (Reject Contribution)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.term.delete({ where: { id } });
        res.json({ message: 'Term deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete term' });
    }
});

// Vote
router.post('/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'up' or 'down'

    try {
        const update = type === 'up' ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } };
        const term = await prisma.term.update({
            where: { id },
            data: update
        });
        res.json(term);
    } catch (error) {
        res.status(400).json({ error: 'Vote failed' });
    }
});

// Update Term
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { word, definition, gameId, examples, tags, verified } = req.body;

    try {
        const term = await prisma.term.update({
            where: { id },
            data: {
                word,
                definition,
                gameId,
                examples: examples || [],
                tags: Array.isArray(tags) ? tags : [],
                verified
            }
        });
        res.json(term);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update term' });
    }
});

// Record View
router.post('/:id/view', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.termView.create({
            data: { termId: id }
        });
        res.status(200).json({ message: 'View recorded' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to record view' });
    }
});

// Get Trending Terms
router.get('/trending/now', async (req, res) => {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // Get views in last 24h
        const recentViews = await prisma.termView.groupBy({
            by: ['termId'],
            where: {
                createdAt: { gte: twentyFourHoursAgo }
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 8
        });

        let termIds = recentViews.map((v: { termId: string }) => v.termId);

        // FALLBACK: If we don't have enough trending terms, fill with top upvoted terms
        if (termIds.length < 8) {
            const needed = 8 - termIds.length;
            const topTerms = await prisma.term.findMany({
                where: {
                    id: { notIn: termIds },
                    verified: true
                },
                orderBy: { upvotes: 'desc' },
                take: needed
            });
            termIds = [...termIds, ...topTerms.map(t => t.id)];
        }

        // Get views in previous 24h (for trend calculation)
        const previousViews = await prisma.termView.groupBy({
            by: ['termId'],
            where: {
                createdAt: {
                    gte: fortyEightHoursAgo,
                    lt: twentyFourHoursAgo
                }
            },
            _count: {
                id: true
            }
        });

        const previousViewsMap = new Map(previousViews.map((v: { termId: string, _count: { id: number } }) => [v.termId, v._count.id]));

        // Fetch full term details
        const terms = await prisma.term.findMany({
            where: { id: { in: termIds } },
            include: { game: true }
        });

        const formattedTerms = terms.map(term => {
            const recentCount = recentViews.find((v: { termId: string, _count: { id: number } }) => v.termId === term.id)?._count.id || 0;
            const previousCount = previousViewsMap.get(term.id) || 0;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (previousCount === 0) {
                trend = recentCount > 0 ? 'up' : 'stable';
            } else {
                const change = (recentCount - previousCount) / previousCount;
                if (change > 0.1) trend = 'up';
                else if (change < -0.1) trend = 'down';
            }

            return {
                ...term,
                trend
            };
        });

        // Sort: Trending first (by view count), then by upvotes (fallback ones)
        formattedTerms.sort((a, b) => {
            const countA = recentViews.find((v: { termId: string, _count: { id: number } }) => v.termId === a.id)?._count.id || 0;
            const countB = recentViews.find((v: { termId: string, _count: { id: number } }) => v.termId === b.id)?._count.id || 0;

            if (countA !== countB) {
                return countB - countA; // Sort by views
            }
            return b.upvotes - a.upvotes; // Sort by upvotes if views are equal (or 0)
        });

        res.json(formattedTerms);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch trending terms' });
    }
});

export default router;
