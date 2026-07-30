import { Prisma, TermStatus } from '@prisma/client';
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import {
    ContributionError,
    contributionPublicDetailInclude,
    contributionSummaryInclude,
    createContribution,
    updateOwnContribution
} from '../services/contributions';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { parseTermPayload } from '../utils/terms';
import {
    enforceContributionProtection,
    publicContributionProtectionStatus,
} from '../services/contributionProtection';

const router = Router();
router.use(authenticateToken);

const handleContributionError = (error: unknown, res: any) => {
    if (error instanceof ContributionError) {
        if (error.retryAfterSeconds) res.setHeader('Retry-After', String(error.retryAfterSeconds));
        return res.status(error.statusCode).json({
            error: error.message,
            ...(error.code ? { code: error.code } : {}),
            ...(error.retryAfterSeconds ? { retryAfter: error.retryAfterSeconds } : {}),
        });
    }
    console.error('[contributions] Request failed:', error);
    return res.status(500).json({ error: 'Falha ao processar a contribuicao.' });
};

const parseDate = (value: unknown, endOfDay = false): Date | undefined => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

router.get('/protection', async (req: AuthRequest, res) => {
    try {
        res.json(await publicContributionProtectionStatus(req.user));
    } catch (error) {
        console.error('[contributions] Protection status failed:', error);
        res.status(503).json({ error: 'Nao foi possivel consultar a protecao anti-bot.' });
    }
});

router.post('/', async (req: AuthRequest, res) => {
    if (!req.user?.emailVerified) {
        return res.status(403).json({ error: 'Confirme seu email antes de sugerir termos.' });
    }
    try {
        if (!await enforceContributionProtection(req, res)) return;
    } catch (error) {
        console.error('[contributions] Protection check failed:', error);
        return res.status(503).json({ error: 'A protecao anti-bot esta temporariamente indisponivel.' });
    }
    const validation = parseTermPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    try {
        const item = await createContribution(req.user.id, validation.data);
        res.status(201).json(item);
    } catch (error) {
        handleContributionError(error, res);
    }
});

router.get('/mine', async (req: AuthRequest, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !Object.values(TermStatus).includes(status as TermStatus)) {
        return res.status(400).json({ error: 'Status de contribuicao invalido.' });
    }
    const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;
    if (gameId && gameId.length > 100) return res.status(400).json({ error: 'Jogo invalido.' });
    if (req.query.from !== undefined && !parseDate(req.query.from)) {
        return res.status(400).json({ error: 'Data inicial invalida.' });
    }
    if (req.query.to !== undefined && !parseDate(req.query.to, true)) {
        return res.status(400).json({ error: 'Data final invalida.' });
    }
    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'word'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        defaultPageSize: 12
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.TermWhereInput = {
        authorId: req.user!.id,
        ...(status ? { status: status as TermStatus } : {}),
        ...(gameId ? { gameId } : {}),
        ...((req.query.from || req.query.to) ? {
            createdAt: {
                ...(parseDate(req.query.from) ? { gte: parseDate(req.query.from) } : {}),
                ...(parseDate(req.query.to, true) ? { lte: parseDate(req.query.to, true) } : {})
            }
        } : {})
    };
    try {
        const [items, total] = await prisma.$transaction([
            prisma.term.findMany({
                where,
                include: contributionSummaryInclude,
                orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.term.count({ where })
        ]);
        res.json({ items, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        handleContributionError(error, res);
    }
});

router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const item = await prisma.term.findFirst({
            where: {
                id: req.params.id,
                ...(req.user?.role === 'ADMIN' ? {} : { authorId: req.user?.id })
            },
            include: contributionPublicDetailInclude
        });
        if (!item) return res.status(404).json({ error: 'Contribuicao nao encontrada.' });
        res.json(item);
    } catch (error) {
        handleContributionError(error, res);
    }
});

router.patch('/:id', async (req: AuthRequest, res) => {
    const expectedRevision = Number(req.body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return res.status(400).json({ error: 'expectedRevision deve ser um inteiro positivo.' });
    }
    const validation = parseTermPayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    try {
        const item = await updateOwnContribution({
            termId: req.params.id,
            authorId: req.user!.id,
            expectedRevision,
            content: validation.data
        });
        res.json(item);
    } catch (error) {
        handleContributionError(error, res);
    }
});

export default router;
