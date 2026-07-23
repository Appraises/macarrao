import { TermStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { cleanPlainText } from '../utils/content';
import { CatalogSort, getCatalogMeta, listCatalogTerms } from '../services/termCatalog';
import { ContributionError, createContribution } from '../services/contributions';
import { parseTermPayload } from '../utils/terms';
import { AdminTermError, permanentlyDeleteAdminTerm, updateAdminTerm } from '../services/adminTerms';
import { analyticsEnabled } from '../services/analytics/privacy';
import { captureInternalSearch, recordTermViewWithSearch } from '../services/analytics/search';

const router = Router();

// Get terms with optional filters. Calls without pagination parameters keep the
// legacy array response during the frontend migration.
router.get('/', async (req, res) => {
    const { gameId, tag, letter } = req.query;
    if (gameId !== undefined && typeof gameId !== 'string') {
        return res.status(400).json({ error: 'gameId deve ser um unico texto.' });
    }
    if (typeof gameId === 'string' && gameId.length > 100) {
        return res.status(400).json({ error: 'gameId deve ter no maximo 100 caracteres.' });
    }
    if (req.query.verified !== undefined || req.query.includeUnverified !== undefined) {
        return res.status(400).json({ error: 'Use as rotas de contribuicoes para consultar conteudo em moderacao.' });
    }
    if (tag !== undefined && (typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 40)) {
        return res.status(400).json({ error: 'tag deve ser um texto entre 1 e 40 caracteres.' });
    }
    if (letter !== undefined && (typeof letter !== 'string' || !/^[a-z#]$/i.test(letter))) {
        return res.status(400).json({ error: 'letter deve ser uma letra de A a Z ou #.' });
    }

    const requestedSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const requestedSort = typeof req.query.sort === 'string' ? req.query.sort : '';
    const defaultSort: CatalogSort = requestedSearch ? 'relevance' : 'word';
    const effectiveSort = (requestedSort || defaultSort) as CatalogSort;
    const defaultOrder = ['relevance', 'upvotes', 'createdAt', 'updatedAt'].includes(effectiveSort) ? 'desc' : 'asc';

    const parsed = parsePagination(req.query, {
        allowedSorts: ['relevance', 'upvotes', 'createdAt', 'updatedAt', 'word'] as const,
        defaultSort,
        defaultOrder,
        defaultPageSize: 24
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    try {
        if (Object.keys(req.query).length === 0) {
            const terms = await prisma.term.findMany({
                where: { status: TermStatus.APPROVED, archivedAt: null },
                include: { game: true },
                orderBy: [{ word: 'asc' }, { id: 'asc' }]
            });
            res.setHeader('Deprecation', 'true');
            res.setHeader('X-Pagination-Deprecated', 'true');
            return res.json(terms);
        }

        const result = await listCatalogTerms({
            search: parsed.value.search,
            gameId: typeof gameId === 'string' && gameId ? gameId : undefined,
            tag: typeof tag === 'string' ? tag.trim() : undefined,
            letter: typeof letter === 'string' ? letter.toUpperCase() : undefined,
            sort: parsed.value.sort,
            order: parsed.value.order,
            skip: parsed.value.skip,
            take: parsed.value.take
        });

        let searchToken: string | null = null;
        if (requestedSearch && analyticsEnabled(req)) {
            try {
                searchToken = await captureInternalSearch({
                    query: requestedSearch,
                    origin: req.get('X-Search-Origin'),
                    gameId: typeof gameId === 'string' ? gameId : undefined,
                    tag: typeof tag === 'string' ? tag.trim() : undefined,
                    letter: typeof letter === 'string' ? letter.toUpperCase() : undefined,
                    sort: parsed.value.sort,
                    resultCount: result.total,
                });
            } catch (analyticsError) {
                console.error('[analytics] Failed to capture internal search:', analyticsError);
            }
        }

        res.json({
            items: result.items,
            pagination: buildPaginationMeta(result.total, parsed.value),
            analytics: searchToken ? { searchToken } : undefined,
        });
    } catch (error) {
        console.error('[terms] Failed to fetch catalog:', error);
        res.status(500).json({ error: 'Failed to fetch terms' });
    }
});

// Search Terms (Autocomplete)
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
        return res.json([]);
    }
    if (q.length > 100) return res.status(400).json({ error: 'q deve ter no maximo 100 caracteres.' });

    try {
        const result = await listCatalogTerms({
            search: q,
            sort: 'relevance',
            order: 'desc',
            skip: 0,
            take: 6
        });
        res.json(result.items.map((term) => ({
            id: term.id,
            word: term.word,
            definition: term.definition,
            tags: Array.isArray(term.tags) ? term.tags : [],
            game: term.game ? { id: term.game.id, name: term.game.name, slug: term.game.slug } : null
        })));
    } catch (error) {
        console.error('[terms] Autocomplete failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/catalog-meta', async (_req, res) => {
    try {
        res.json(await getCatalogMeta());
    } catch (error) {
        console.error('[terms] Catalog metadata failed:', error);
        res.status(500).json({ error: 'Failed to fetch catalog metadata' });
    }
});

// Term of the day — deterministic pick that is stable within a day (BRT) and
// rotates at local midnight. Must be declared before "/:idOrSlug".
router.get('/term-of-the-day', async (req, res) => {
    try {
        const count = await prisma.term.count({ where: { status: TermStatus.APPROVED, archivedAt: null } });
        if (count === 0) return res.status(404).json({ error: 'No terms available' });

        // Use the current date in Brasília (UTC-3) as the seed.
        const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const seed = brt.getUTCFullYear() * 10000 + (brt.getUTCMonth() + 1) * 100 + brt.getUTCDate();
        const skip = seed % count;

        const term = await prisma.term.findFirst({
            where: { status: TermStatus.APPROVED, archivedAt: null },
            orderBy: { id: 'asc' },
            skip,
            include: { game: true },
        });
        if (!term) return res.status(404).json({ error: 'No term available' });

        res.json({
            ...term,
            tags: Array.isArray(term.tags) ? term.tags : [],
            relatedTerms: Array.isArray(term.relatedTerms) ? term.relatedTerms : [],
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch term of the day' });
    }
});

// Deprecated lightweight index of public terms.
router.get('/index', async (req, res) => {
    try {
        const terms = await prisma.term.findMany({
            where: { status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true, word: true, definition: true, tags: true },
            orderBy: { upvotes: 'desc' },
        });
        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', 'Wed, 14 Oct 2026 00:00:00 GMT');
        res.setHeader('Link', '</terms/search>; rel="successor-version"');
        res.json(terms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to build index' });
    }
});

// Get term by ID or Slug
router.get('/:idOrSlug', async (req, res) => {
    const idOrSlug = req.params.idOrSlug.trim();
    try {
        let term;

        // Check if input is a valid UUID to prevent Postgres errors
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlug);

        const withRelations = {
            game: true,
            author: { select: { id: true, name: true, avatar: true, level: true } }
        } as const;

        if (isUuid) {
            term = await prisma.term.findFirst({
                where: { id: idOrSlug, status: TermStatus.APPROVED, archivedAt: null },
                include: withRelations
            });
        }

        // Existing URLs use the displayed word as their slug.
        if (!term) {
            term = await prisma.term.findFirst({
                where: {
                    word: { equals: idOrSlug, mode: 'insensitive' },
                    status: TermStatus.APPROVED,
                    archivedAt: null
                },
                include: withRelations
            });
        }

        // Resolve by alias (alternate spelling) — case/accent-insensitive.
        // The page canonicalizes to the term's word, so aliases don't create
        // duplicate indexable URLs.
        if (!term) {
            const rows = await prisma.$queryRaw<{ id: string }[]>`
                SELECT t."id" FROM "Term" t
                WHERE t."status" = 'APPROVED'::"TermStatus" AND t."archivedAt" IS NULL
                  AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(
                        CASE WHEN jsonb_typeof(t."aliases") = 'array' THEN t."aliases" ELSE '[]'::jsonb END
                    ) AS alias(value)
                    WHERE public.dicionario_normalize(alias.value) = public.dicionario_normalize(${idOrSlug})
                  )
                LIMIT 1
            `;
            if (rows[0]) {
                term = await prisma.term.findUnique({ where: { id: rows[0].id }, include: withRelations });
            }
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
                        { status: TermStatus.APPROVED },
                        { archivedAt: null },
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
            relatedTerms: parsedRelatedTerms,
            aliases: Array.isArray(term.aliases) ? term.aliases : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch term' });
    }
});

// Deprecated contribution alias. New clients use POST /contributions.
router.post('/', authenticateToken, async (req: any, res: any) => {
    const user = req.user;

    if (!user.emailVerified) {
        return res.status(403).json({ error: 'Confirme seu email antes de sugerir termos.' });
    }

    const validation = parseTermPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    try {
        const term = await createContribution(user.id, validation.data);
        res.setHeader('Deprecation', 'true');
        res.setHeader('Sunset', 'Wed, 14 Oct 2026 00:00:00 GMT');
        res.setHeader('Link', '</contributions>; rel="successor-version"');
        res.status(201).json(term);
    } catch (error) {
        if (error instanceof ContributionError) return res.status(error.statusCode).json({ error: error.message });
        res.status(500).json({ error: 'Falha ao criar contribuicao.' });
    }
});

// Permanent administrative deletion. Rejections use the moderation decision API.
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Wed, 14 Oct 2026 00:00:00 GMT');
    res.setHeader('Link', '</dashboard/terms>; rel="successor-version"');
    try {
        const confirmation = typeof req.body?.confirmation === 'string' ? req.body.confirmation : '';
        const deleted = await permanentlyDeleteAdminTerm(req.params.id, confirmation, req.user!.id);
        res.json({ message: 'Termo excluido definitivamente.', ...deleted });
    } catch (error) {
        if (error instanceof AdminTermError) return res.status(error.statusCode).json({ error: error.message, details: error.details });
        res.status(500).json({ error: 'Falha ao excluir termo.' });
    }
});

// Vote (authenticated, deduplicated: one vote per user, click again to undo)
router.post('/:id/vote', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'up' | 'down'
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Login required to vote.' });
    if (type !== 'up' && type !== 'down') return res.status(400).json({ error: 'Invalid vote type.' });

    const value = type === 'up' ? 1 : -1;

    try {
        const term = await prisma.term.findFirst({
            where: { id, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true },
        });
        if (!term) return res.status(404).json({ error: 'Termo nao encontrado.' });

        const existing = await prisma.termVote.findUnique({
            where: { termId_userId: { termId: id, userId } },
        });

        let myVote = value;
        if (existing && existing.value === value) {
            await prisma.termVote.delete({ where: { id: existing.id } }); // same click -> undo
            myVote = 0;
        } else if (existing) {
            await prisma.termVote.update({ where: { id: existing.id }, data: { value } });
        } else {
            await prisma.termVote.create({ data: { termId: id, userId, value } });
        }

        // Recompute counts from the votes table (source of truth) and persist.
        const [upvotes, downvotes] = await Promise.all([
            prisma.termVote.count({ where: { termId: id, value: 1 } }),
            prisma.termVote.count({ where: { termId: id, value: -1 } }),
        ]);
        await prisma.term.update({ where: { id }, data: { upvotes, downvotes } });

        res.json({ upvotes, downvotes, myVote });
    } catch (error) {
        res.status(400).json({ error: 'Vote failed' });
    }
});

// Current user's vote for a term: { myVote: 1 | -1 | 0 }
router.get('/:id/my-vote', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required.' });
    try {
        const term = await prisma.term.findFirst({
            where: { id, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true },
        });
        if (!term) return res.status(404).json({ error: 'Termo nao encontrado.' });

        const vote = await prisma.termVote.findUnique({
            where: { termId_userId: { termId: id, userId } },
        });
        res.json({ myVote: vote?.value ?? 0 });
    } catch (error) {
        res.status(400).json({ error: 'Failed to fetch vote.' });
    }
});

// Report a term (public — anyone can flag bad content for moderation)
const REPORT_REASONS = ['incorreto', 'ofensivo', 'spam', 'duplicado', 'outro'];
router.post('/:id/report', async (req, res) => {
    const { id } = req.params;
    const { reason, details } = req.body;

    if (!reason || !REPORT_REASONS.includes(reason)) {
        return res.status(400).json({ error: 'Motivo inválido.' });
    }
    try {
        const term = await prisma.term.findFirst({
            where: { id, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true },
        });
        if (!term) return res.status(404).json({ error: 'Termo não encontrado.' });

        const report = await prisma.report.create({
            data: {
                termId: id,
                reason,
                details: cleanPlainText(details).slice(0, 500) || null,
            },
        });
        res.status(201).json({ id: report.id, status: report.status });
    } catch (error) {
        res.status(400).json({ error: 'Falha ao registrar denúncia.' });
    }
});

// Update Term
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    const validation = parseTermPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const expectedRevision = Number(req.body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return res.status(400).json({ error: 'expectedRevision deve ser um inteiro positivo.' });
    }
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Wed, 14 Oct 2026 00:00:00 GMT');
    res.setHeader('Link', '</dashboard/terms>; rel="successor-version"');
    try {
        res.json(await updateAdminTerm(req.params.id, validation.data, expectedRevision, req.user!.id));
    } catch (error) {
        if (error instanceof AdminTermError) return res.status(error.statusCode).json({ error: error.message, details: error.details });
        res.status(500).json({ error: 'Falha ao atualizar termo.' });
    }
});

// Record View
router.post('/:id/view', async (req, res) => {
    const { id } = req.params;
    try {
        const term = await prisma.term.findFirst({
            where: { id, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true },
        });
        if (!term) return res.status(404).json({ error: 'Termo nao encontrado.' });

        await recordTermViewWithSearch({
            termId: id,
            source: req.body?.source,
            searchToken: req.body?.searchToken,
            position: req.body?.position,
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
                    status: TermStatus.APPROVED,
                    archivedAt: null
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
            where: { id: { in: termIds }, status: TermStatus.APPROVED, archivedAt: null },
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
