import crypto from 'crypto';
import {
    NewsletterBatchStatus,
    NewsletterCampaignStatus,
    NewsletterDeliveryStatus,
    NewsletterSubscriberStatus,
    Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
    APP_URL,
    NEWSLETTER_ENABLED,
    NEWSLETTER_TOKEN_SECRET,
    PUBLIC_API_URL,
    RESEND_API_KEY,
} from '../utils/config';
import { validateEmail } from '../utils/validation';
import { dateKeyInSaoPaulo, getTermOfTheDay } from './termOfDay';
import {
    NewsletterTermSnapshot,
    sendNewsletterBatch,
    sendNewsletterConfirmationEmail,
    sendNewsletterTestEmail,
} from './newsletterEmail';

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const CONFIRMATION_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 100;
const LOCK_KEY = 1_349_907_421;

type Db = Prisma.TransactionClient | typeof prisma;

export class NewsletterError extends Error {
    constructor(message: string, readonly status = 400) {
        super(message);
    }
}

export const normalizeNewsletterEmail = (value: unknown): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

export const hashNewsletterToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export const randomNewsletterToken = (): string => crypto.randomBytes(32).toString('base64url');

export const deliveryToken = (deliveryId: string, purpose: 'click' | 'unsubscribe'): string =>
    crypto.createHmac('sha256', NEWSLETTER_TOKEN_SECRET).update(`${purpose}:${deliveryId}`).digest('base64url');

const safeSource = (source: unknown): string | null => {
    if (typeof source !== 'string') return null;
    const clean = source.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    return clean || null;
};

const blockedStatuses: NewsletterSubscriberStatus[] = [
    NewsletterSubscriberStatus.BOUNCED,
    NewsletterSubscriberStatus.COMPLAINED,
    NewsletterSubscriberStatus.SUPPRESSED,
];

const issueConfirmation = async (subscriberId: string): Promise<boolean> => {
    const token = randomNewsletterToken();
    const now = new Date();
    const subscriber = await prisma.newsletterSubscriber.update({
        where: { id: subscriberId },
        data: {
            status: NewsletterSubscriberStatus.PENDING,
            confirmationTokenHash: hashNewsletterToken(token),
            confirmationExpiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
            confirmationSentAt: now,
            confirmedAt: null,
            unsubscribedAt: null,
        },
        select: { id: true, email: true },
    });
    const result = await sendNewsletterConfirmationEmail({ subscriberId, to: subscriber.email, token });
    return result.sent;
};

export const requestNewsletterSubscription = async (emailValue: unknown, sourceValue: unknown) => {
    const email = normalizeNewsletterEmail(emailValue);
    if (!validateEmail(email) || email.length > 254) throw new NewsletterError('Informe um e-mail válido.');

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.status === NewsletterSubscriberStatus.ACTIVE || (existing && blockedStatuses.includes(existing.status))) {
        return { accepted: true, confirmationSent: false };
    }
    if (existing?.status === NewsletterSubscriberStatus.PENDING
        && existing.confirmationSentAt
        && Date.now() - existing.confirmationSentAt.getTime() < CONFIRMATION_COOLDOWN_MS) {
        return { accepted: true, confirmationSent: false };
    }

    let id = existing?.id;
    if (!id) {
        try {
            const created = await prisma.newsletterSubscriber.create({
                data: { email, source: safeSource(sourceValue), status: NewsletterSubscriberStatus.PENDING },
                select: { id: true },
            });
            id = created.id;
        } catch (error: any) {
            if (error?.code !== 'P2002') throw error;
            id = (await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;
        }
    } else {
        await prisma.newsletterSubscriber.update({
            where: { id },
            data: { consentAt: new Date(), source: safeSource(sourceValue) || existing?.source, blockedAt: null, blockedReason: null },
        });
    }
    return { accepted: true, confirmationSent: await issueConfirmation(id) };
};

export const resendNewsletterConfirmation = async (emailValue: unknown) => {
    const email = normalizeNewsletterEmail(emailValue);
    if (!validateEmail(email) || email.length > 254) return { accepted: true, confirmationSent: false };
    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (!subscriber || subscriber.status !== NewsletterSubscriberStatus.PENDING) {
        return { accepted: true, confirmationSent: false };
    }
    if (subscriber.confirmationSentAt && Date.now() - subscriber.confirmationSentAt.getTime() < CONFIRMATION_COOLDOWN_MS) {
        return { accepted: true, confirmationSent: false };
    }
    return { accepted: true, confirmationSent: await issueConfirmation(subscriber.id) };
};

export const confirmNewsletterSubscription = async (tokenValue: unknown) => {
    if (typeof tokenValue !== 'string' || tokenValue.length < 20 || tokenValue.length > 256) {
        throw new NewsletterError('Link de confirmação inválido.', 400);
    }
    const now = new Date();
    const subscriber = await prisma.newsletterSubscriber.findUnique({
        where: { confirmationTokenHash: hashNewsletterToken(tokenValue) },
    });
    if (!subscriber || subscriber.status !== NewsletterSubscriberStatus.PENDING || !subscriber.confirmationExpiresAt || subscriber.confirmationExpiresAt < now) {
        throw new NewsletterError('O link de confirmação é inválido ou expirou.', 410);
    }
    await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: {
            status: NewsletterSubscriberStatus.ACTIVE,
            confirmedAt: now,
            confirmationTokenHash: null,
            confirmationExpiresAt: null,
            blockedAt: null,
            blockedReason: null,
            unsubscribedAt: null,
        },
    });
    return { confirmed: true };
};

export const unsubscribeNewsletter = async (tokenValue: unknown) => {
    if (typeof tokenValue !== 'string' || tokenValue.length < 20 || tokenValue.length > 256) {
        return { unsubscribed: true };
    }
    const delivery = await prisma.newsletterDelivery.findUnique({
        where: { unsubscribeTokenHash: hashNewsletterToken(tokenValue) },
        select: { subscriberId: true },
    });
    if (delivery?.subscriberId) {
        await prisma.newsletterSubscriber.update({
            where: { id: delivery.subscriberId },
            data: {
                status: NewsletterSubscriberStatus.UNSUBSCRIBED,
                unsubscribedAt: new Date(),
                confirmationTokenHash: null,
                confirmationExpiresAt: null,
            },
        });
    }
    return { unsubscribed: true };
};

export const recordNewsletterClick = async (tokenValue: unknown): Promise<string> => {
    if (typeof tokenValue !== 'string' || tokenValue.length < 20 || tokenValue.length > 256) return `${APP_URL}/dicionario`;
    const delivery = await prisma.newsletterDelivery.findUnique({
        where: { clickTokenHash: hashNewsletterToken(tokenValue) },
        include: { campaign: { select: { termWord: true } } },
    });
    if (!delivery) return `${APP_URL}/dicionario`;
    const now = new Date();
    await prisma.newsletterDelivery.update({
        where: { id: delivery.id },
        data: {
            firstClickedAt: delivery.firstClickedAt || now,
            lastClickedAt: now,
            clickCount: { increment: 1 },
        },
    });
    return `${APP_URL}/term/${encodeURIComponent(delivery.campaign.termWord)}`;
};

export const termSnapshot = (term: NonNullable<Awaited<ReturnType<typeof getTermOfTheDay>>>): NewsletterTermSnapshot => {
    const examples = Array.isArray(term.examples) ? term.examples.filter((value): value is string => typeof value === 'string') : [];
    const tags = Array.isArray(term.tags) ? term.tags.filter((value): value is string => typeof value === 'string') : [];
    return { word: term.word, definition: term.definition, example: examples[0] || null, game: term.game?.name || null, tags };
};

const campaignStatus = async (db: Db, campaignId: string): Promise<NewsletterCampaignStatus> => {
    const groups = await db.newsletterDelivery.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } });
    const counts = new Map(groups.map((row) => [row.status, row._count._all]));
    const accepted = [NewsletterDeliveryStatus.SENT, NewsletterDeliveryStatus.DELIVERED, NewsletterDeliveryStatus.DELAYED]
        .reduce((total, status) => total + (counts.get(status) || 0), 0);
    const unresolved = [NewsletterDeliveryStatus.QUEUED, NewsletterDeliveryStatus.SENDING, NewsletterDeliveryStatus.FAILED]
        .reduce((total, status) => total + (counts.get(status) || 0), 0);
    if (unresolved === 0) return NewsletterCampaignStatus.COMPLETED;
    return accepted > 0 ? NewsletterCampaignStatus.PARTIAL : NewsletterCampaignStatus.FAILED;
};

const dispatch = async (db: Db, campaignId: string, deliveryIds?: string[]) => {
    const campaign = await db.newsletterCampaign.findUniqueOrThrow({ where: { id: campaignId } });
    const deliveries = await db.newsletterDelivery.findMany({
        where: {
            campaignId,
            ...(deliveryIds ? { id: { in: deliveryIds } } : {}),
            status: { in: [NewsletterDeliveryStatus.QUEUED, NewsletterDeliveryStatus.FAILED] },
            resendEmailId: null,
            attempts: { lt: MAX_ATTEMPTS },
            subscriber: { is: { status: NewsletterSubscriberStatus.ACTIVE } },
        },
        include: { subscriber: { select: { id: true, email: true } } },
        orderBy: { id: 'asc' },
    });
    const term: NewsletterTermSnapshot = {
        word: campaign.termWord,
        definition: campaign.termDefinition,
        example: campaign.termExample,
        game: campaign.termGame,
        tags: Array.isArray(campaign.termTags) ? campaign.termTags.filter((value): value is string => typeof value === 'string') : [],
    };
    const existingBatches = await db.newsletterDispatchBatch.count({ where: { campaignId } });
    for (let offset = 0; offset < deliveries.length; offset += BATCH_SIZE) {
        const chunk = deliveries.slice(offset, offset + BATCH_SIZE);
        const batchId = crypto.randomUUID();
        const sequence = existingBatches + Math.floor(offset / BATCH_SIZE) + 1;
        const recipientFingerprint = crypto
            .createHash('sha256')
            .update(chunk.map((item) => item.subscriberId).join(':'))
            .digest('hex')
            .slice(0, 32);
        const idempotencyKey = `newsletter/${campaign.dateKey}/${recipientFingerprint}`;
        await db.newsletterDispatchBatch.create({
            data: {
                id: batchId,
                campaignId,
                sequence,
                idempotencyKey,
                deliveryIds: chunk.map((item) => item.id),
                status: NewsletterBatchStatus.SENDING,
                attempts: 1,
                startedAt: new Date(),
            },
        });
        await db.newsletterDelivery.updateMany({
            where: { id: { in: chunk.map((item) => item.id) } },
            data: { batchId, status: NewsletterDeliveryStatus.SENDING, attempts: { increment: 1 }, lastError: null },
        });
        const result = await sendNewsletterBatch({
            campaignId,
            dateKey: campaign.dateKey,
            idempotencyKey,
            term,
            recipients: chunk.map((item) => ({
                deliveryId: item.id,
                to: item.subscriber!.email,
                clickToken: deliveryToken(item.id, 'click'),
                unsubscribeToken: deliveryToken(item.id, 'unsubscribe'),
            })),
        });
        const now = new Date();
        if (result.requestError) {
            await db.newsletterDispatchBatch.update({
                where: { id: batchId },
                data: { status: NewsletterBatchStatus.UNKNOWN, lastError: result.requestError.slice(0, 500), finishedAt: now },
            });
            await db.newsletterDelivery.updateMany({
                where: { id: { in: chunk.map((item) => item.id) } },
                data: { lastError: 'Resultado do provedor indeterminado; retentativa automática bloqueada.' },
            });
            continue;
        }
        for (const success of result.ids) {
            const delivery = chunk[success.index];
            if (!delivery) continue;
            await db.newsletterDelivery.update({
                where: { id: delivery.id },
                data: { status: NewsletterDeliveryStatus.SENT, resendEmailId: success.id, sentAt: now },
            });
            if (delivery.subscriberId) {
                await db.newsletterSubscriber.update({ where: { id: delivery.subscriberId }, data: { lastSentAt: now } });
            }
        }
        for (const failure of result.errors) {
            const delivery = chunk[failure.index];
            if (!delivery) continue;
            await db.newsletterDelivery.update({
                where: { id: delivery.id },
                data: { status: NewsletterDeliveryStatus.FAILED, failedAt: now, lastError: failure.message.slice(0, 500) },
            });
        }
        await db.newsletterDispatchBatch.update({
            where: { id: batchId },
            data: {
                status: result.errors.length ? NewsletterBatchStatus.FAILED : NewsletterBatchStatus.SENT,
                lastError: result.errors.length ? `${result.errors.length} entrega(s) recusada(s).` : null,
                finishedAt: now,
            },
        });
    }
    const status = await campaignStatus(db, campaignId);
    return db.newsletterCampaign.update({ where: { id: campaignId }, data: { status, finishedAt: new Date() } });
};

const executeDaily = async (db: Db, value = new Date()) => {
    const dateKey = dateKeyInSaoPaulo(value);
    const existing = await db.newsletterCampaign.findUnique({ where: { dateKey } });
    if (existing && (existing.status === NewsletterCampaignStatus.COMPLETED || existing.status === NewsletterCampaignStatus.SKIPPED)) return existing;

    const term = await getTermOfTheDay(value);
    if (!term) {
        return db.newsletterCampaign.upsert({
            where: { dateKey },
            create: { dateKey, termWord: 'Indisponível', termDefinition: 'Nenhum termo público disponível.', subject: 'Termo do Dia', status: NewsletterCampaignStatus.SKIPPED, skipReason: 'Nenhum termo público disponível.', finishedAt: new Date() },
            update: { status: NewsletterCampaignStatus.SKIPPED, skipReason: 'Nenhum termo público disponível.', finishedAt: new Date() },
        });
    }
    const snapshot = termSnapshot(term);
    const campaign = existing || await db.newsletterCampaign.create({
        data: {
            dateKey,
            termId: term.id,
            termWord: snapshot.word,
            termDefinition: snapshot.definition,
            termExample: snapshot.example,
            termGame: snapshot.game,
            termTags: snapshot.tags,
            subject: `${snapshot.word} - Termo do Dia`,
        },
    });
    const subscribers = await db.newsletterSubscriber.findMany({
        where: { status: NewsletterSubscriberStatus.ACTIVE },
        select: { id: true },
        orderBy: { id: 'asc' },
    });
    if (subscribers.length === 0) {
        return db.newsletterCampaign.update({
            where: { id: campaign.id },
            data: { status: NewsletterCampaignStatus.SKIPPED, skipReason: 'Nenhum inscrito ativo.', finishedAt: new Date() },
        });
    }
    const existingDeliveries = new Set((await db.newsletterDelivery.findMany({ where: { campaignId: campaign.id }, select: { subscriberId: true } })).map((item) => item.subscriberId));
    const rows = subscribers.filter((item) => !existingDeliveries.has(item.id)).map((subscriber) => {
        const id = crypto.randomUUID();
        return {
            id,
            campaignId: campaign.id,
            subscriberId: subscriber.id,
            clickTokenHash: hashNewsletterToken(deliveryToken(id, 'click')),
            unsubscribeTokenHash: hashNewsletterToken(deliveryToken(id, 'unsubscribe')),
        };
    });
    if (rows.length) await db.newsletterDelivery.createMany({ data: rows, skipDuplicates: true });
    return dispatch(db, campaign.id);
};

export const sendDailyNewsletter = async (value = new Date()) => {
    if (!NEWSLETTER_ENABLED || !RESEND_API_KEY || !PUBLIC_API_URL) {
        return { skipped: true, reason: 'Newsletter desativada ou provedor incompleto.' };
    }
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
        if (!rows[0]?.locked) return { skipped: true, reason: 'Outro disparo está em andamento.' };
        return executeDaily(tx, value);
    }, { maxWait: 5_000, timeout: 20 * 60 * 1000 });
};

export const retryNewsletterCampaign = async (campaignId: string) => prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
    if (!rows[0]?.locked) throw new NewsletterError('Outro disparo está em andamento.', 409);
    const eligible = await tx.newsletterDelivery.findMany({
        where: { campaignId, status: NewsletterDeliveryStatus.FAILED, resendEmailId: null, attempts: { lt: MAX_ATTEMPTS } },
        select: { id: true },
    });
    if (!eligible.length) throw new NewsletterError('Não há falhas elegíveis para retentativa.', 409);
    return dispatch(tx, campaignId, eligible.map((item) => item.id));
}, { maxWait: 5_000, timeout: 20 * 60 * 1000 });

export const sendCurrentNewsletterPreview = async (adminEmail: string) => {
    const term = await getTermOfTheDay();
    if (!term) throw new NewsletterError('Nenhum termo público disponível.', 409);
    const sent = await sendNewsletterTestEmail({ to: adminEmail, term: termSnapshot(term) });
    if (!sent) throw new NewsletterError('O provedor não entregou a prévia.', 503);
    return { sent: true };
};

export const sendPendingNewsletterConfirmations = async () => {
    const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { status: NewsletterSubscriberStatus.PENDING, confirmationSentAt: null },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
    });
    let sent = 0;
    for (const subscriber of subscribers) {
        if (await issueConfirmation(subscriber.id)) sent += 1;
        await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return { total: subscribers.length, sent, failed: subscribers.length - sent };
};
