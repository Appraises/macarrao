import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Prisma, PrivacyRequestStatus, PrivacyRequestType } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { sendPrivacyRequestStatusEmail } from '../../services/email';
import { addPrivacyEvent } from '../../services/privacy';
import { cleanPlainText } from '../../utils/content';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();

const requestInclude = {
    user: { select: { id: true, name: true, email: true, role: true, anonymizedAt: true } },
    assignedTo: { select: { id: true, name: true, email: true } }
} satisfies Prisma.PrivacyRequestInclude;

const detailInclude = {
    ...requestInclude,
    events: {
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    }
} satisfies Prisma.PrivacyRequestInclude;

const transitions: Record<PrivacyRequestStatus, PrivacyRequestStatus[]> = {
    REQUESTED: [PrivacyRequestStatus.REJECTED],
    CONFIRMED: [PrivacyRequestStatus.IN_REVIEW, PrivacyRequestStatus.REJECTED],
    IN_REVIEW: [PrivacyRequestStatus.PROCESSING, PrivacyRequestStatus.REJECTED],
    PROCESSING: [PrivacyRequestStatus.IN_REVIEW, PrivacyRequestStatus.REJECTED],
    COMPLETED: [],
    REJECTED: [],
    CANCELED: []
};

const terminalStatuses: PrivacyRequestStatus[] = [
    PrivacyRequestStatus.COMPLETED,
    PrivacyRequestStatus.REJECTED,
    PrivacyRequestStatus.CANCELED
];

const completableStatuses: PrivacyRequestStatus[] = [
    PrivacyRequestStatus.CONFIRMED,
    PrivacyRequestStatus.IN_REVIEW,
    PrivacyRequestStatus.PROCESSING
];

const anonymizingTypes: PrivacyRequestType[] = [
    PrivacyRequestType.DELETE,
    PrivacyRequestType.ANONYMIZATION
];

const statusLabels: Record<PrivacyRequestStatus, string> = {
    REQUESTED: 'aguardando confirmacao',
    CONFIRMED: 'confirmada',
    IN_REVIEW: 'em analise',
    PROCESSING: 'em processamento',
    COMPLETED: 'concluida',
    REJECTED: 'recusada',
    CANCELED: 'cancelada'
};

const requestAuditSnapshot = (request: {
    protocol: string;
    type: PrivacyRequestType;
    status: PrivacyRequestStatus;
    assignedToId: string | null;
    dueAt: Date;
    completedAt: Date | null;
}) => ({
    protocol: request.protocol,
    type: request.type,
    status: request.status,
    assignedToId: request.assignedToId,
    dueAt: request.dueAt,
    completedAt: request.completedAt
});

router.get('/', async (req, res) => {
    const status = req.query.status as PrivacyRequestStatus | undefined;
    const type = req.query.type as PrivacyRequestType | undefined;
    const assignedToId = typeof req.query.assignedToId === 'string' ? req.query.assignedToId : undefined;
    if (status && !Object.values(PrivacyRequestStatus).includes(status)) {
        return res.status(400).json({ error: 'Status LGPD invalido.' });
    }
    if (type && !Object.values(PrivacyRequestType).includes(type)) {
        return res.status(400).json({ error: 'Tipo de solicitacao invalido.' });
    }

    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'updatedAt', 'dueAt', 'status', 'type'] as const,
        defaultSort: 'dueAt',
        defaultOrder: 'asc'
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });

    const where: Prisma.PrivacyRequestWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (assignedToId === 'unassigned') where.assignedToId = null;
    else if (assignedToId) where.assignedToId = assignedToId;
    if (parsed.value.search) {
        where.OR = [
            { protocol: { contains: parsed.value.search, mode: 'insensitive' } },
            { requesterEmail: { contains: parsed.value.search, mode: 'insensitive' } },
            { user: { is: { name: { contains: parsed.value.search, mode: 'insensitive' } } } }
        ];
    }

    try {
        const [items, total] = await prisma.$transaction([
            prisma.privacyRequest.findMany({
                where,
                include: requestInclude,
                orderBy: [
                    { [parsed.value.sort]: parsed.value.order },
                    { id: 'asc' }
                ] as Prisma.PrivacyRequestOrderByWithRelationInput[],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.privacyRequest.count({ where })
        ]);
        res.json({ items, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        console.error('[admin/privacy] List failed:', error);
        res.status(500).json({ error: 'Falha ao buscar solicitacoes LGPD.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const request = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, include: detailInclude });
        if (!request) return res.status(404).json({ error: 'Solicitacao nao encontrada.' });
        res.json(request);
    } catch {
        res.status(500).json({ error: 'Falha ao buscar a solicitacao.' });
    }
});

router.patch('/:id', async (req: AuthRequest, res) => {
    const requestedStatus = req.body?.status as PrivacyRequestStatus | undefined;
    const hasAssignee = Object.prototype.hasOwnProperty.call(req.body || {}, 'assignedToId');
    const hasResolution = Object.prototype.hasOwnProperty.call(req.body || {}, 'resolutionNote');
    const assignedToId = req.body?.assignedToId === null ? null : cleanPlainText(req.body?.assignedToId);
    const resolutionNote = cleanPlainText(req.body?.resolutionNote).slice(0, 4000);

    if (requestedStatus && !Object.values(PrivacyRequestStatus).includes(requestedStatus)) {
        return res.status(400).json({ error: 'Status LGPD invalido.' });
    }
    if (!requestedStatus && !hasAssignee && !hasResolution) {
        return res.status(400).json({ error: 'Informe uma alteracao.' });
    }
    if (hasAssignee && assignedToId !== null && !assignedToId) {
        return res.status(400).json({ error: 'Responsavel invalido.' });
    }

    try {
        const existing = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, include: requestInclude });
        if (!existing) return res.status(404).json({ error: 'Solicitacao nao encontrada.' });
        if (terminalStatuses.includes(existing.status)) {
            return res.status(409).json({ error: 'Solicitacoes encerradas nao podem ser alteradas.' });
        }
        if (requestedStatus) {
            if (requestedStatus === PrivacyRequestStatus.COMPLETED) {
                return res.status(400).json({ error: 'Use a acao de conclusao para encerrar a solicitacao.' });
            }
            if (!transitions[existing.status].includes(requestedStatus)) {
                return res.status(409).json({ error: `Transicao de ${existing.status} para ${requestedStatus} nao permitida.` });
            }
            if (requestedStatus === PrivacyRequestStatus.REJECTED && resolutionNote.length < 10) {
                return res.status(400).json({ error: 'Explique a recusa com pelo menos 10 caracteres.' });
            }
        }
        if (hasAssignee && assignedToId) {
            const assignee = await prisma.user.findFirst({ where: { id: assignedToId, role: 'ADMIN', anonymizedAt: null }, select: { id: true } });
            if (!assignee) return res.status(400).json({ error: 'O responsavel deve ser um administrador ativo.' });
        }

        const data: Prisma.PrivacyRequestUpdateManyMutationInput = {};
        if (requestedStatus) data.status = requestedStatus;
        if (hasResolution) data.resolutionNote = resolutionNote || null;
        if (requestedStatus === PrivacyRequestStatus.REJECTED) {
            data.confirmationToken = null;
            data.confirmationExpiresAt = null;
        }

        const updated = await prisma.$transaction(async (tx) => {
            const claimed = await tx.privacyRequest.updateMany({
                where: { id: existing.id, status: existing.status },
                data: { ...data, updatedAt: new Date() }
            });
            if (claimed.count !== 1) return null;
            if (hasAssignee) {
                await tx.privacyRequest.update({
                    where: { id: existing.id },
                    data: { assignedTo: assignedToId ? { connect: { id: assignedToId } } : { disconnect: true } }
                });
            }
            const item = await tx.privacyRequest.findUnique({ where: { id: existing.id }, include: requestInclude });
            if (!item) return null;
            const changes: string[] = [];
            if (requestedStatus) changes.push(`status alterado para ${statusLabels[requestedStatus]}`);
            if (hasAssignee) changes.push(assignedToId ? 'responsavel atribuido' : 'responsavel removido');
            if (hasResolution) changes.push('observacao de resolucao atualizada');
            await addPrivacyEvent(item.id, requestedStatus ? 'STATUS_CHANGED' : 'ADMIN_UPDATED', changes.join('; '), req.user?.id, {
                previousStatus: existing.status,
                status: item.status,
                assignedToId: item.assignedToId
            }, tx);
            await writeAuditLog({
                actorId: req.user?.id,
                action: requestedStatus === PrivacyRequestStatus.REJECTED ? 'REJECT' : 'UPDATE',
                entityType: 'PrivacyRequest',
                entityId: item.id,
                before: requestAuditSnapshot(existing),
                after: requestAuditSnapshot(item)
            }, tx);
            return item;
        });

        if (!updated) return res.status(409).json({ error: 'A solicitacao foi alterada por outra operacao. Recarregue a fila.' });

        if (requestedStatus) {
            // A mudanca de estado ja foi gravada; o aviso ao titular e best-effort, mas a
            // falha precisa ficar rastreavel (log + Sentry) para a equipe reenviar.
            const notified = await sendPrivacyRequestStatusEmail(existing.requesterEmail, existing.user?.name || 'usuario', existing.protocol, statusLabels[requestedStatus], resolutionNote || 'O estado da sua solicitacao foi atualizado.');
            if (!notified) console.error(`[admin/privacy] Solicitacao ${existing.protocol} atualizada, mas o aviso por email nao foi entregue.`);
        }
        res.json(updated);
    } catch (error) {
        console.error('[admin/privacy] Update failed:', error);
        res.status(500).json({ error: 'Falha ao atualizar a solicitacao.' });
    }
});

router.post('/:id/complete', async (req: AuthRequest, res) => {
    const resolutionNote = cleanPlainText(req.body?.resolutionNote).slice(0, 4000);
    if (resolutionNote.length < 10) {
        return res.status(400).json({ error: 'Registre a resolucao com pelo menos 10 caracteres.' });
    }

    try {
        const existing = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, include: requestInclude });
        if (!existing) return res.status(404).json({ error: 'Solicitacao nao encontrada.' });
        if (!completableStatuses.includes(existing.status)) {
            return res.status(409).json({ error: 'A solicitacao precisa estar confirmada e aberta para ser concluida.' });
        }
        if (anonymizingTypes.includes(existing.type) && !existing.user) {
            return res.status(409).json({ error: 'A conta vinculada nao esta disponivel para anonimizacao.' });
        }
        if (anonymizingTypes.includes(existing.type) && existing.user?.role === 'ADMIN') {
            const adminCount = await prisma.user.count({ where: { role: 'ADMIN', anonymizedAt: null } });
            if (adminCount <= 1) return res.status(409).json({ error: 'O ultimo administrador ativo nao pode ter a conta removida.' });
        }

        const completedAt = new Date();
        // The erased account must become unreachable, so the replacement has to be
        // unguessable. Math.random is predictable by design and has no business
        // standing between an anonymized account and whoever wants back into it.
        const replacementPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
        const recipientEmail = existing.requesterEmail;
        const recipientName = existing.user?.name || 'usuario';
        const anonymize = anonymizingTypes.includes(existing.type);

        const completed = await prisma.$transaction(async (tx) => {
            const claimed = await tx.privacyRequest.updateMany({
                where: { id: existing.id, status: existing.status },
                data: { status: PrivacyRequestStatus.PROCESSING }
            });
            if (claimed.count !== 1) return null;
            if (anonymize && existing.user) {
                const votes = await tx.termVote.findMany({ where: { userId: existing.user.id }, select: { termId: true, value: true } });
                const voteTotals = new Map<string, { up: number; down: number }>();
                for (const vote of votes) {
                    const total = voteTotals.get(vote.termId) || { up: 0, down: 0 };
                    if (vote.value > 0) total.up += 1;
                    else if (vote.value < 0) total.down += 1;
                    voteTotals.set(vote.termId, total);
                }
                for (const [termId, totals] of voteTotals) {
                    const term = await tx.term.findUnique({ where: { id: termId }, select: { upvotes: true, downvotes: true } });
                    if (term) {
                        await tx.term.update({
                            where: { id: termId },
                            data: {
                                upvotes: Math.max(0, term.upvotes - totals.up),
                                downvotes: Math.max(0, term.downvotes - totals.down)
                            }
                        });
                    }
                }
                await tx.termVote.deleteMany({ where: { userId: existing.user.id } });
                await tx.notification.deleteMany({ where: { userId: existing.user.id } });
                await (tx as any).userActivityDay?.deleteMany({ where: { userId: existing.user.id } });
                await (tx as any).brickBreakerRun?.deleteMany({ where: { userId: existing.user.id } });
                await (tx as any).brickBreakerBestScore?.deleteMany({ where: { userId: existing.user.id } });
                await tx.report.updateMany({ where: { reporterId: existing.user.id }, data: { reporterId: null } });

                const requests = await tx.privacyRequest.findMany({ where: { userId: existing.user.id }, select: { id: true, protocol: true } });
                for (const request of requests) {
                    await tx.privacyRequest.update({
                        where: { id: request.id },
                        data: {
                            requesterEmail: `deleted+${request.protocol.toLowerCase()}@invalid.local`,
                            requestNote: null,
                            confirmationToken: null,
                            confirmationExpiresAt: null
                        }
                    });
                }

                await tx.user.update({
                    where: { id: existing.user.id },
                    data: {
                        name: 'Usuario removido',
                        email: `deleted+${existing.protocol.toLowerCase()}@invalid.local`,
                        password: replacementPassword,
                        role: 'USER',
                        level: 1,
                        xp: 0,
                        badges: [],
                        avatar: null,
                        emailVerified: false,
                        verificationToken: null,
                        verificationTokenExpires: null,
                        preferences: {},
                        resetPasswordToken: null,
                        resetPasswordExpires: null,
                        termsAcceptedAt: null,
                        termsVersion: null,
                        privacyAcknowledgedAt: null,
                        privacyVersion: null,
                        botVerifiedAt: null,
                        description: null,
                        favoriteGame: { disconnect: true },
                        sessionVersion: { increment: 1 },
                        anonymizedAt: completedAt
                    }
                });
                // Earned badges are personal data too — clear them on anonymization.
                await tx.userBadge.deleteMany({ where: { userId: existing.user.id } });
            }

            const item = await tx.privacyRequest.update({
                where: { id: existing.id },
                data: {
                    status: PrivacyRequestStatus.COMPLETED,
                    assignedToId: existing.assignedToId || req.user?.id || null,
                    resolutionNote,
                    completedAt,
                    confirmationToken: null,
                    confirmationExpiresAt: null
                },
                include: requestInclude
            });
            await addPrivacyEvent(item.id, 'COMPLETED', anonymize ? 'Conta anonimizada e solicitacao concluida.' : 'Solicitacao concluida pela equipe.', req.user?.id, { type: item.type }, tx);
            await writeAuditLog({
                actorId: req.user?.id,
                action: anonymize ? 'ANONYMIZE_ACCOUNT' : 'COMPLETE',
                entityType: 'PrivacyRequest',
                entityId: item.id,
                before: requestAuditSnapshot(existing),
                after: requestAuditSnapshot(item),
                metadata: { protocol: item.protocol, type: item.type, userAnonymized: anonymize }
            }, tx);
            return item;
        });

        if (!completed) return res.status(409).json({ error: 'A solicitacao foi alterada por outra operacao. Recarregue a fila.' });

        // Conclusao ja persistida (inclusive anonimizacao); o aviso e best-effort e a falha
        // precisa ser rastreavel, porque nao ha como reemitir o estado depois.
        const notified = await sendPrivacyRequestStatusEmail(recipientEmail, recipientName, existing.protocol, 'concluida', resolutionNote);
        if (!notified) console.error(`[admin/privacy] Solicitacao ${existing.protocol} concluida, mas o aviso por email nao foi entregue.`);
        res.json(completed);
    } catch (error) {
        console.error('[admin/privacy] Completion failed:', error);
        res.status(500).json({ error: 'Falha ao concluir a solicitacao.' });
    }
});

export default router;
