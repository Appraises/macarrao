import { ContributionRejectionReason, Prisma, TermStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import {
    ContributionError,
    contributionAdminDetailInclude,
    contributionSummaryInclude,
    moderateContribution,
    ModerationAction
} from '../../services/contributions';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();
const actions: ModerationAction[] = ['APPROVE', 'REJECT', 'REQUEST_CHANGES'];

const handleError = (error: unknown, res: any) => {
    if (error instanceof ContributionError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[dashboard/contributions] Request failed:', error);
    return res.status(500).json({ error: 'Falha ao processar a moderacao.' });
};

router.get('/', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (status && !Object.values(TermStatus).includes(status as TermStatus)) {
        return res.status(400).json({ error: 'Status de contribuicao invalido.' });
    }
    const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;
    if (gameId && gameId.length > 100) return res.status(400).json({ error: 'Jogo invalido.' });
    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'word'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'asc',
        defaultPageSize: 20
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.TermWhereInput = {
        ...(status ? { status: status as TermStatus } : {}),
        ...(gameId ? { gameId } : {}),
        ...(parsed.value.search ? {
            OR: [
                { word: { contains: parsed.value.search, mode: 'insensitive' } },
                { definition: { contains: parsed.value.search, mode: 'insensitive' } },
                { author: { name: { contains: parsed.value.search, mode: 'insensitive' } } },
                { author: { email: { contains: parsed.value.search, mode: 'insensitive' } } }
            ]
        } : {})
    };
    try {
        const [items, total, pending, changesRequested, approved, rejected] = await prisma.$transaction([
            prisma.term.findMany({
                where,
                include: {
                    ...contributionSummaryInclude,
                    author: { select: { id: true, name: true, email: true, avatar: true } }
                },
                orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.term.count({ where }),
            prisma.term.count({ where: { status: TermStatus.PENDING } }),
            prisma.term.count({ where: { status: TermStatus.CHANGES_REQUESTED } }),
            prisma.term.count({ where: { status: TermStatus.APPROVED } }),
            prisma.term.count({ where: { status: TermStatus.REJECTED } })
        ]);
        const counts = {
            [TermStatus.PENDING]: pending,
            [TermStatus.CHANGES_REQUESTED]: changesRequested,
            [TermStatus.APPROVED]: approved,
            [TermStatus.REJECTED]: rejected
        };
        res.json({ items, counts, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        handleError(error, res);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await prisma.term.findUnique({
            where: { id: req.params.id },
            include: contributionAdminDetailInclude
        });
        if (!item) return res.status(404).json({ error: 'Contribuicao nao encontrada.' });
        res.json(item);
    } catch (error) {
        handleError(error, res);
    }
});

router.post('/:id/decisions', async (req: AuthRequest, res) => {
    const action = req.body?.action as ModerationAction;
    if (!actions.includes(action)) return res.status(400).json({ error: 'Acao de moderacao invalida.' });
    const expectedRevision = Number(req.body?.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return res.status(400).json({ error: 'expectedRevision deve ser um inteiro positivo.' });
    }
    const rejectionReason = req.body?.rejectionReason as ContributionRejectionReason | undefined;
    if (rejectionReason && !Object.values(ContributionRejectionReason).includes(rejectionReason)) {
        return res.status(400).json({ error: 'Motivo de rejeicao invalido.' });
    }
    try {
        const item = await moderateContribution({
            termId: req.params.id,
            moderatorId: req.user!.id,
            expectedRevision,
            action,
            authorMessage: req.body?.authorMessage,
            internalNote: req.body?.internalNote,
            rejectionReason
        });
        res.json(item);
    } catch (error) {
        handleError(error, res);
    }
});

export default router;
