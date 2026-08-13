import {
    NewsletterCampaignStatus,
    NewsletterDeliveryStatus,
    NewsletterSubscriberStatus,
    Prisma,
} from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../middleware/auth';
import { writeAuditLog } from '../../services/audit';
import { NewsletterError, retryNewsletterCampaign, sendCurrentNewsletterPreview } from '../../services/newsletter';
import { NEWSLETTER_ENABLED, PUBLIC_API_URL, RESEND_API_KEY, RESEND_WEBHOOK_SECRET } from '../../utils/config';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

const router = Router();
const subscriberStatuses = Object.values(NewsletterSubscriberStatus);
const campaignStatuses = Object.values(NewsletterCampaignStatus);
const deliveryStatuses = Object.values(NewsletterDeliveryStatus);

const dateBoundary = (value: unknown, endOfDay = false): Date | undefined => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 || calendarCheck.getUTCDate() !== day) {
        return undefined;
    }
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const providerStatus = () => ({
    configured: Boolean(RESEND_API_KEY && PUBLIC_API_URL),
    webhookConfigured: Boolean(RESEND_WEBHOOK_SECRET),
    automaticSending: NEWSLETTER_ENABLED,
    sendHour: 9,
    timezone: 'America/Sao_Paulo',
});

router.get('/status', async (_req, res) => {
    const lastCampaign = await prisma.newsletterCampaign.findFirst({ orderBy: [{ startedAt: 'desc' }, { id: 'desc' }] });
    res.json({ provider: providerStatus(), lastCampaign });
});

router.get('/overview', async (_req, res) => {
    const [subscriberGroups, campaignGroups, deliveryGroups, estimatedClicks, lastCampaign] = await Promise.all([
        prisma.newsletterSubscriber.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.newsletterCampaign.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.newsletterDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.newsletterDelivery.count({ where: { firstClickedAt: { not: null } } }),
        prisma.newsletterCampaign.findFirst({ orderBy: [{ startedAt: 'desc' }, { id: 'desc' }] }),
    ]);
    res.json({
        provider: providerStatus(),
        subscribers: Object.fromEntries(subscriberGroups.map((row) => [row.status, row._count._all])),
        campaigns: Object.fromEntries(campaignGroups.map((row) => [row.status, row._count._all])),
        deliveries: Object.fromEntries(deliveryGroups.map((row) => [row.status, row._count._all])),
        estimatedClicks,
        lastCampaign,
    });
});

router.get('/subscribers', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status as NewsletterSubscriberStatus : undefined;
    const source = typeof req.query.source === 'string' ? req.query.source.trim().slice(0, 40) : undefined;
    const from = dateBoundary(req.query.from);
    const to = dateBoundary(req.query.to, true);
    if (status && !subscriberStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    if ((req.query.from && !from) || (req.query.to && !to) || (from && to && from > to)) {
        return res.status(400).json({ error: 'Período inválido.' });
    }
    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'confirmedAt', 'lastSentAt', 'email', 'status'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.NewsletterSubscriberWhereInput = {
        ...(status ? { status } : {}),
        ...(source ? { source } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(parsed.value.search ? { email: { contains: parsed.value.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await prisma.$transaction([
        prisma.newsletterSubscriber.findMany({
            where,
            select: { id: true, email: true, source: true, status: true, consentAt: true, confirmationSentAt: true, confirmedAt: true, unsubscribedAt: true, blockedAt: true, blockedReason: true, lastSentAt: true, createdAt: true, updatedAt: true },
            orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.NewsletterSubscriberOrderByWithRelationInput[],
            skip: parsed.value.skip,
            take: parsed.value.take,
        }),
        prisma.newsletterSubscriber.count({ where }),
    ]);
    res.json({ items, pagination: buildPaginationMeta(total, parsed.value) });
});

const campaignRows = async (where: Prisma.NewsletterCampaignWhereInput, skip: number, take: number) => {
    const items = await prisma.newsletterCampaign.findMany({ where, orderBy: [{ startedAt: 'desc' }, { id: 'asc' }], skip, take });
    const ids = items.map((item) => item.id);
    const [counts, clicks] = ids.length ? await Promise.all([
        prisma.newsletterDelivery.groupBy({ by: ['campaignId', 'status'], where: { campaignId: { in: ids } }, _count: { _all: true } }),
        prisma.newsletterDelivery.groupBy({ by: ['campaignId'], where: { campaignId: { in: ids }, firstClickedAt: { not: null } }, _count: { _all: true } }),
    ]) : [[], []];
    return items.map((item) => ({
        ...item,
        deliveryCounts: Object.fromEntries(counts.filter((row) => row.campaignId === item.id).map((row) => [row.status, row._count._all])),
        uniqueClicks: clicks.find((row) => row.campaignId === item.id)?._count._all || 0,
    }));
};

router.get('/campaigns', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status as NewsletterCampaignStatus : undefined;
    if (status && !campaignStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    const parsed = parsePagination(req.query, {
        allowedSorts: ['startedAt', 'dateKey', 'status', 'termWord'] as const,
        defaultSort: 'startedAt',
        defaultOrder: 'desc',
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const where: Prisma.NewsletterCampaignWhereInput = {
        ...(status ? { status } : {}),
        ...(parsed.value.search ? { OR: [
            { termWord: { contains: parsed.value.search, mode: 'insensitive' } },
            { dateKey: { contains: parsed.value.search } },
        ] } : {}),
    };
    const [items, total] = await Promise.all([
        campaignRows(where, parsed.value.skip, parsed.value.take),
        prisma.newsletterCampaign.count({ where }),
    ]);
    res.json({ items, pagination: buildPaginationMeta(total, parsed.value) });
});

router.get('/campaigns/:id', async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status as NewsletterDeliveryStatus : undefined;
    if (status && !deliveryStatuses.includes(status)) return res.status(400).json({ error: 'Status de entrega inválido.' });
    const parsed = parsePagination(req.query, {
        allowedSorts: ['createdAt', 'status', 'sentAt', 'deliveredAt'] as const,
        defaultSort: 'createdAt',
        defaultOrder: 'asc',
    });
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada.' });
    const where: Prisma.NewsletterDeliveryWhereInput = {
        campaignId: campaign.id,
        ...(status ? { status } : {}),
        ...(parsed.value.search ? { subscriber: { is: { email: { contains: parsed.value.search, mode: 'insensitive' } } } } : {}),
    };
    const [deliveries, total, counts] = await Promise.all([
        prisma.newsletterDelivery.findMany({
            where,
            include: { subscriber: { select: { id: true, email: true, source: true, status: true } } },
            orderBy: [{ [parsed.value.sort]: parsed.value.order }, { id: 'asc' }] as Prisma.NewsletterDeliveryOrderByWithRelationInput[],
            skip: parsed.value.skip,
            take: parsed.value.take,
        }),
        prisma.newsletterDelivery.count({ where }),
        prisma.newsletterDelivery.groupBy({ by: ['status'], where: { campaignId: campaign.id }, _count: { _all: true } }),
    ]);
    res.json({ campaign, deliveryCounts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])), deliveries, pagination: buildPaginationMeta(total, parsed.value) });
});

router.post('/test', async (req: AuthRequest, res) => {
    try {
        const result = await sendCurrentNewsletterPreview(req.user!.email);
        await writeAuditLog({ actorId: req.user?.id, action: 'SEND_TEST', entityType: 'Newsletter', entityId: 'daily', metadata: { recipient: 'current-admin' } });
        res.json(result);
    } catch (error) {
        if (error instanceof NewsletterError) return res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: 'Falha ao enviar a prévia.' });
    }
});

router.post('/campaigns/:id/retry', async (req: AuthRequest, res) => {
    const recent = await prisma.adminAuditLog.findFirst({
        where: { actorId: req.user?.id, action: 'RETRY', entityType: 'NewsletterCampaign', entityId: req.params.id, createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });
    if (recent) return res.status(429).json({ error: 'Aguarde cinco minutos antes de tentar novamente.' });
    try {
        const campaign = await retryNewsletterCampaign(req.params.id);
        await writeAuditLog({ actorId: req.user?.id, action: 'RETRY', entityType: 'NewsletterCampaign', entityId: req.params.id, after: { status: campaign.status } });
        res.json(campaign);
    } catch (error) {
        if (error instanceof NewsletterError) return res.status(error.status).json({ error: error.message });
        console.error('[newsletter-admin] Retry failed:', error);
        res.status(500).json({ error: 'Falha ao retentar a campanha.' });
    }
});

export default router;
