import { NewsletterDeliveryStatus, NewsletterSubscriberStatus, Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma';
import { RESEND_API_KEY, RESEND_WEBHOOK_SECRET } from '../utils/config';

const supported = new Set([
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.failed',
    'email.bounced',
    'email.complained',
    'email.suppressed',
]);

const rank: Record<NewsletterDeliveryStatus, number> = {
    QUEUED: 10,
    SENDING: 20,
    DELAYED: 30,
    SENT: 40,
    FAILED: 45,
    DELIVERED: 50,
    SUPPRESSED: 80,
    BOUNCED: 90,
    COMPLAINED: 100,
};

const statusByEvent: Record<string, NewsletterDeliveryStatus> = {
    'email.sent': NewsletterDeliveryStatus.SENT,
    'email.delivered': NewsletterDeliveryStatus.DELIVERED,
    'email.delivery_delayed': NewsletterDeliveryStatus.DELAYED,
    'email.failed': NewsletterDeliveryStatus.FAILED,
    'email.bounced': NewsletterDeliveryStatus.BOUNCED,
    'email.complained': NewsletterDeliveryStatus.COMPLAINED,
    'email.suppressed': NewsletterDeliveryStatus.SUPPRESSED,
};

export const resolveNewsletterDeliveryStatus = (
    current: NewsletterDeliveryStatus,
    eventType: string,
): NewsletterDeliveryStatus => {
    const next = statusByEvent[eventType];
    if (!next) return current;
    return rank[next] >= rank[current] ? next : current;
};

export const subscriberBlockStatusForWebhook = (
    eventType: string,
    event: any,
): NewsletterSubscriberStatus | undefined => {
    if (eventType === 'email.complained') return NewsletterSubscriberStatus.COMPLAINED;
    if (eventType === 'email.suppressed') return NewsletterSubscriberStatus.SUPPRESSED;
    if (eventType === 'email.bounced' && String(event?.data?.bounce?.type || '').toLowerCase() === 'permanent') {
        return NewsletterSubscriberStatus.BOUNCED;
    }
    return undefined;
};

const subscriberBlockRank: Partial<Record<NewsletterSubscriberStatus, number>> = {
    [NewsletterSubscriberStatus.BOUNCED]: 10,
    [NewsletterSubscriberStatus.SUPPRESSED]: 20,
    [NewsletterSubscriberStatus.COMPLAINED]: 30,
};

export const resolveNewsletterSubscriberStatus = (
    current: NewsletterSubscriberStatus,
    eventType: string,
    event: any,
): NewsletterSubscriberStatus => {
    const incoming = subscriberBlockStatusForWebhook(eventType, event);
    if (!incoming) return current;
    return (subscriberBlockRank[incoming] || 0) >= (subscriberBlockRank[current] || 0) ? incoming : current;
};

export const verifyNewsletterWebhook = (payload: string, headers: { id: string; timestamp: string; signature: string }) => {
    if (!RESEND_API_KEY || !RESEND_WEBHOOK_SECRET) throw new Error('Webhook do Resend não configurado.');
    return new Resend(RESEND_API_KEY).webhooks.verify({ payload, headers, webhookSecret: RESEND_WEBHOOK_SECRET }) as any;
};

export const processNewsletterWebhook = async (eventId: string, event: any) => {
    const type = typeof event?.type === 'string' ? event.type : '';
    const resendEmailId = typeof event?.data?.email_id === 'string' ? event.data.email_id : null;
    const occurredAt = new Date(event?.created_at || Date.now());
    if (!supported.has(type) || !resendEmailId || Number.isNaN(occurredAt.getTime())) return { ignored: true };

    try {
        return await prisma.$transaction(async (tx) => {
            await tx.newsletterWebhookEvent.create({ data: { id: eventId, type, resendEmailId, occurredAt } });
            const delivery = await tx.newsletterDelivery.findUnique({
                where: { resendEmailId },
                include: { subscriber: { select: { status: true, blockedAt: true, blockedReason: true } } },
            });
            if (!delivery) return { ignored: true };

            const status = resolveNewsletterDeliveryStatus(delivery.status, type);
            const data: Prisma.NewsletterDeliveryUpdateInput = { status };
            if (type === 'email.sent') data.sentAt = delivery.sentAt || occurredAt;
            if (type === 'email.delivered') data.deliveredAt = delivery.deliveredAt || occurredAt;
            if (type === 'email.delivery_delayed') data.delayedAt = delivery.delayedAt || occurredAt;
            if (type === 'email.failed') data.failedAt = delivery.failedAt || occurredAt;
            if (type === 'email.bounced') data.bouncedAt = delivery.bouncedAt || occurredAt;
            if (type === 'email.complained') data.complainedAt = delivery.complainedAt || occurredAt;
            if (type === 'email.suppressed') data.suppressedAt = delivery.suppressedAt || occurredAt;
            await tx.newsletterDelivery.update({ where: { id: delivery.id }, data });

            const subscriber = delivery.subscriber;
            const block = subscriber
                ? resolveNewsletterSubscriberStatus(subscriber.status, type, event)
                : undefined;
            if (block && delivery.subscriberId && subscriber && block !== subscriber.status) {
                await tx.newsletterSubscriber.update({
                    where: { id: delivery.subscriberId },
                    data: {
                        status: block,
                        blockedAt: subscriber.blockedAt || occurredAt,
                        blockedReason: type,
                    },
                });
            }
            return { processed: true };
        });
    } catch (error: any) {
        if (error?.code === 'P2002') return { duplicate: true };
        throw error;
    }
};
