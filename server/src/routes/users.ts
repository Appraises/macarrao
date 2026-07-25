import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PrivacyRequestStatus, PrivacyRequestType, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { sendPrivacyRequestConfirmationEmail, sendPrivacyRequestStatusEmail } from '../services/email';
import {
    activePrivacyStatuses,
    addPrivacyEvent,
    buildUserDataExport,
    createPrivacyConfirmation,
    createPrivacyProtocol,
    hashPrivacyToken,
    privacyRequestPublicSelect
} from '../services/privacy';
import { cleanPlainText } from '../utils/content';
import { validatePassword } from '../utils/validation';
import { validateProfilePayload } from '../utils/userInput';
import { getEarnedBadges } from '../services/badges';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

const router = Router();
const userManagedPrivacyTypes: PrivacyRequestType[] = [
    PrivacyRequestType.DELETE,
    PrivacyRequestType.CORRECTION,
    PrivacyRequestType.ANONYMIZATION
];
const privacyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas solicitacoes. Aguarde alguns minutos.' }
});

// Public contributor leaderboard — top users by approved (non-archived) terms.
router.get('/leaderboard', async (_req, res) => {
    try {
        const grouped = await prisma.term.groupBy({
            by: ['authorId'],
            where: { status: TermStatus.APPROVED, archivedAt: null, authorId: { not: null } },
            _count: { authorId: true },
            orderBy: { _count: { authorId: 'desc' } },
            take: 8
        });
        const ids = grouped.map((g) => g.authorId).filter((id): id is string => Boolean(id));
        if (ids.length === 0) return res.json([]);

        const users = await prisma.user.findMany({
            where: { id: { in: ids }, anonymizedAt: null },
            select: { id: true, name: true, avatar: true, level: true }
        });
        const byId = new Map(users.map((u) => [u.id, u]));

        const leaderboard = grouped
            .map((g) => {
                const u = g.authorId ? byId.get(g.authorId) : undefined;
                return u ? { id: u.id, name: u.name, avatar: u.avatar, level: u.level, terms: g._count.authorId } : null;
            })
            .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        res.json(leaderboard);
    } catch (error) {
        console.error('[users] Leaderboard failed:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

router.post('/privacy-requests/confirm', privacyLimiter, async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    if (!token) return res.status(400).json({ error: 'Token de confirmacao obrigatorio.' });
    try {
        const request = await prisma.privacyRequest.findFirst({
            where: {
                confirmationToken: hashPrivacyToken(token),
                confirmationExpiresAt: { gt: new Date() },
                status: PrivacyRequestStatus.REQUESTED
            },
            include: { user: { select: { name: true } } }
        });
        if (!request) return res.status(400).json({ error: 'Link invalido, expirado ou ja utilizado.' });
        const updated = await prisma.$transaction(async (tx) => {
            const confirmedAt = new Date();
            const claimed = await tx.privacyRequest.updateMany({
                where: {
                    id: request.id,
                    status: PrivacyRequestStatus.REQUESTED,
                    confirmationToken: hashPrivacyToken(token),
                    confirmationExpiresAt: { gt: confirmedAt }
                },
                data: {
                    status: PrivacyRequestStatus.CONFIRMED,
                    confirmedAt,
                    dueAt: new Date(confirmedAt.getTime() + 15 * 24 * 60 * 60 * 1000),
                    confirmationToken: null,
                    confirmationExpiresAt: null
                }
            });
            if (claimed.count !== 1) return null;
            const item = await tx.privacyRequest.findUnique({ where: { id: request.id }, select: privacyRequestPublicSelect });
            if (!item) return null;
            await addPrivacyEvent(item.id, 'CONFIRMED', 'Solicitacao confirmada pelo titular por email.', request.userId, undefined, tx);
            return item;
        });
        if (!updated) return res.status(400).json({ error: 'Link invalido, expirado ou ja utilizado.' });
        // Aviso ao titular: a confirmacao ja foi persistida, entao uma falha de email nao
        // invalida a operacao — mas precisa aparecer no log/Sentry em vez de sumir.
        const notified = await sendPrivacyRequestStatusEmail(request.requesterEmail, request.user?.name || 'usuario', request.protocol, 'confirmada', 'Sua solicitacao foi confirmada e aguarda analise.');
        if (!notified) console.error(`[privacy] Solicitacao ${request.protocol} confirmada, mas o aviso por email nao foi entregue.`);
        res.json(updated);
    } catch (error) {
        console.error('[privacy] Confirmation failed:', error);
        res.status(500).json({ error: 'Falha ao confirmar a solicitacao.' });
    }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                level: true,
                role: true,
                description: true,
                preferences: true,
                createdAt: true,
                _count: {
                    select: {
                        terms: true,
                        comments: true
                    }
                },
                favoriteGame: true
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const badges = await getEarnedBadges(user.id);
        res.json({ ...user, badges });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Public contributor profile: identity + the approved terms they authored. Open to
// anyone (this is what the leaderboard and per-sense authorship link to). Never
// exposes email or preferences, and anonymized users (LGPD) are treated as gone.
router.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findFirst({
            where: { id: req.params.id, anonymizedAt: null },
            select: {
                id: true,
                name: true,
                avatar: true,
                level: true,
                description: true,
                createdAt: true,
                favoriteGame: { select: { id: true, name: true, slug: true, image: true } },
            },
        });
        if (!user) return res.status(404).json({ error: 'Perfil nao encontrado.' });

        const [terms, commentsCount, badges] = await Promise.all([
            prisma.term.findMany({
                where: { authorId: user.id, status: TermStatus.APPROVED, archivedAt: null },
                include: { game: { select: { id: true, name: true, slug: true } } },
                orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
                take: 60,
            }),
            prisma.comment.count({ where: { userId: user.id } }),
            getEarnedBadges(user.id),
        ]);

        res.json({ ...user, terms, termsCount: terms.length, commentsCount, badges });
    } catch (error) {
        console.error('[users] Public profile failed:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get User Activity (Terms and Comments)
router.get('/me/activity', authenticateToken, async (req: any, res) => {
    try {
        const [terms, comments] = await Promise.all([
            prisma.term.findMany({
                where: { authorId: req.user.id, status: TermStatus.APPROVED, archivedAt: null },
                include: { game: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.comment.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Parse JSON fields for terms
        const formattedTerms = terms.map(t => ({
            ...t
        }));

        res.json({ terms: formattedTerms, comments });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

router.get('/me/notifications', authenticateToken, async (req: AuthRequest, res) => {
    if (req.query.unreadOnly !== undefined && req.query.unreadOnly !== 'true' && req.query.unreadOnly !== 'false') {
        return res.status(400).json({ error: 'unreadOnly deve ser true ou false.' });
    }
    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
        defaultPageSize: 20
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where = {
        userId: req.user!.id,
        ...(req.query.unreadOnly === 'true' ? { readAt: null } : {})
    };
    try {
        const [items, total, unreadCount] = await prisma.$transaction([
            prisma.notification.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                skip: parsed.value.skip,
                take: parsed.value.take
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId: req.user!.id, readAt: null } })
        ]);
        res.json({ items, unreadCount, pagination: buildPaginationMeta(total, parsed.value) });
    } catch (error) {
        console.error('[notifications] Failed to list:', error);
        res.status(500).json({ error: 'Falha ao carregar notificacoes.' });
    }
});

router.get('/me/notifications/unread-count', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const count = await prisma.notification.count({ where: { userId: req.user!.id, readAt: null } });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao carregar notificacoes.' });
    }
});

router.patch('/me/notifications/read-all', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const result = await prisma.notification.updateMany({
            where: { userId: req.user!.id, readAt: null },
            data: { readAt: new Date() }
        });
        res.json({ updated: result.count });
    } catch (error) {
        res.status(500).json({ error: 'Falha ao atualizar notificacoes.' });
    }
});

router.patch('/me/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const updated = await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.user!.id },
            data: { readAt: new Date() }
        });
        if (updated.count !== 1) return res.status(404).json({ error: 'Notificacao nao encontrada.' });
        const item = await prisma.notification.findUnique({ where: { id: req.params.id } });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao atualizar notificacao.' });
    }
});

router.patch('/me/notifications/:id/clicked', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const now = new Date();
        const updated = await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.user!.id },
            data: { readAt: now, clickedAt: now }
        });
        if (updated.count !== 1) return res.status(404).json({ error: 'Notificacao nao encontrada.' });
        const item = await prisma.notification.findUnique({ where: { id: req.params.id } });
        res.json(item);
    } catch {
        res.status(500).json({ error: 'Falha ao registrar abertura da notificacao.' });
    }
});

router.get('/me/privacy-requests', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const items = await prisma.privacyRequest.findMany({
            where: { userId: req.user.id },
            select: privacyRequestPublicSelect,
            orderBy: { createdAt: 'desc' }
        });
        res.json(items);
    } catch {
        res.status(500).json({ error: 'Falha ao buscar solicitacoes.' });
    }
});

router.post('/me/export', authenticateToken, privacyLimiter, async (req: AuthRequest, res) => {
    try {
        const request = await prisma.$transaction(async (tx) => {
            const item = await tx.privacyRequest.create({
                data: {
                    protocol: createPrivacyProtocol(),
                    type: PrivacyRequestType.EXPORT,
                    status: PrivacyRequestStatus.COMPLETED,
                    userId: req.user.id,
                    requesterEmail: req.user.email,
                    dueAt: new Date(),
                    confirmedAt: new Date(),
                    completedAt: new Date()
                }
            });
            await addPrivacyEvent(item.id, 'EXPORT_GENERATED', 'Exportacao gerada e entregue ao titular autenticado.', req.user.id, undefined, tx);
            return item;
        });
        const data = await buildUserDataExport(req.user.id);
        if (!data) return res.status(404).json({ error: 'Conta nao encontrada.' });
        res.setHeader('Cache-Control', 'no-store, private');
        res.setHeader('Content-Disposition', `attachment; filename="dicionario-gamer-${request.protocol}.json"`);
        res.json(data);
    } catch (error) {
        console.error('[privacy] Export failed:', error);
        res.status(500).json({ error: 'Falha ao gerar a exportacao.' });
    }
});

router.post('/me/privacy-requests', authenticateToken, privacyLimiter, async (req: AuthRequest, res) => {
    const type = req.body?.type as PrivacyRequestType;
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const requestNote = cleanPlainText(req.body?.requestNote).slice(0, 2000);
    if (!userManagedPrivacyTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo de solicitacao invalido.' });
    }
    if (!password) return res.status(400).json({ error: 'Confirme sua senha para abrir a solicitacao.' });
    if (type === PrivacyRequestType.CORRECTION && requestNote.length < 10) {
        return res.status(400).json({ error: 'Descreva a correcao solicitada.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Senha atual incorreta.' });
        }
        const active = await prisma.privacyRequest.findFirst({
            where: { userId: user.id, type, status: { in: activePrivacyStatuses } },
            select: privacyRequestPublicSelect
        });
        if (active) return res.status(409).json({ error: 'Ja existe uma solicitacao ativa deste tipo.', request: active });

        const confirmation = createPrivacyConfirmation();
        const item = await prisma.$transaction(async (tx) => {
            const created = await tx.privacyRequest.create({
                data: {
                    protocol: createPrivacyProtocol(),
                    type,
                    status: PrivacyRequestStatus.REQUESTED,
                    userId: user.id,
                    requesterEmail: user.email,
                    requestNote: requestNote || null,
                    confirmationToken: confirmation.hash,
                    confirmationExpiresAt: confirmation.expiresAt,
                    dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                },
                select: privacyRequestPublicSelect
            });
            await addPrivacyEvent(created.id, 'REQUESTED', 'Solicitacao aberta pelo titular. Confirmacao por email pendente.', user.id, { type }, tx);
            return created;
        });
        const emailSent = await sendPrivacyRequestConfirmationEmail(user.email, user.name, item.protocol, confirmation.token);
        res.status(201).json({ request: item, emailSent });
    } catch (error) {
        console.error('[privacy] Request creation failed:', error);
        res.status(500).json({ error: 'Falha ao abrir a solicitacao.' });
    }
});

router.post('/me/privacy-requests/:id/resend', authenticateToken, privacyLimiter, async (req: AuthRequest, res) => {
    try {
        const request = await prisma.privacyRequest.findFirst({ where: { id: req.params.id, userId: req.user.id, status: PrivacyRequestStatus.REQUESTED } });
        if (!request) return res.status(404).json({ error: 'Solicitacao pendente nao encontrada.' });
        const confirmation = createPrivacyConfirmation();
        const resent = await prisma.$transaction(async (tx) => {
            const claimed = await tx.privacyRequest.updateMany({
                where: { id: request.id, userId: req.user.id, status: PrivacyRequestStatus.REQUESTED },
                data: { confirmationToken: confirmation.hash, confirmationExpiresAt: confirmation.expiresAt }
            });
            if (claimed.count !== 1) return false;
            await addPrivacyEvent(request.id, 'CONFIRMATION_RESENT', 'Email de confirmacao reenviado.', req.user.id, undefined, tx);
            return true;
        });
        if (!resent) return res.status(409).json({ error: 'A solicitacao ja foi processada.' });
        const emailSent = await sendPrivacyRequestConfirmationEmail(req.user.email, req.user.name, request.protocol, confirmation.token);
        res.json({ message: 'Confirmacao processada.', emailSent });
    } catch { res.status(500).json({ error: 'Falha ao reenviar a confirmacao.' }); }
});

router.post('/me/privacy-requests/:id/cancel', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const request = await prisma.privacyRequest.findFirst({
            where: { id: req.params.id, userId: req.user.id, status: { in: [PrivacyRequestStatus.REQUESTED, PrivacyRequestStatus.CONFIRMED, PrivacyRequestStatus.IN_REVIEW] } }
        });
        if (!request) return res.status(409).json({ error: 'A solicitacao nao pode mais ser cancelada.' });
        const item = await prisma.$transaction(async (tx) => {
            const claimed = await tx.privacyRequest.updateMany({
                where: {
                    id: request.id,
                    userId: req.user.id,
                    status: { in: [PrivacyRequestStatus.REQUESTED, PrivacyRequestStatus.CONFIRMED, PrivacyRequestStatus.IN_REVIEW] }
                },
                data: { status: PrivacyRequestStatus.CANCELED, canceledAt: new Date(), confirmationToken: null, confirmationExpiresAt: null }
            });
            if (claimed.count !== 1) return null;
            const updated = await tx.privacyRequest.findUnique({ where: { id: request.id }, select: privacyRequestPublicSelect });
            if (!updated) return null;
            await addPrivacyEvent(request.id, 'CANCELED', 'Solicitacao cancelada pelo titular.', req.user.id, undefined, tx);
            return updated;
        });
        if (!item) return res.status(409).json({ error: 'A solicitacao ja foi processada.' });
        res.json(item);
    } catch { res.status(500).json({ error: 'Falha ao cancelar a solicitacao.' }); }
});

// Update User Profile
router.put('/me', authenticateToken, async (req: any, res) => {
    const validation = validateProfilePayload(req.body);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    try {
        if (validation.data.favoriteGameId) {
            const game = await prisma.game.findUnique({ where: { id: validation.data.favoriteGameId }, select: { id: true } });
            if (!game) return res.status(400).json({ error: 'O jogo favorito selecionado nao existe.' });
        }
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: validation.data,
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                level: true,
                role: true,
                description: true,
                preferences: true,
                favoriteGame: true
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});



// Change Password
router.put('/me/password', authenticateToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return res.status(400).json({ error: passwordValidation.message });

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                password: hashedPassword,
                sessionVersion: { increment: 1 }
            }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

export default router;
