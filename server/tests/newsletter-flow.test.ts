import {
    NewsletterCampaignStatus,
    NewsletterDeliveryStatus,
    NewsletterSubscriberStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    subscriberFindUnique: vi.fn(),
    subscriberFindUniqueOrThrow: vi.fn(),
    subscriberCreate: vi.fn(),
    subscriberUpdate: vi.fn(),
    subscriberFindMany: vi.fn(),
    deliveryFindUnique: vi.fn(),
    deliveryFindMany: vi.fn(),
    deliveryCreateMany: vi.fn(),
    deliveryUpdateMany: vi.fn(),
    deliveryUpdate: vi.fn(),
    deliveryGroupBy: vi.fn(),
    campaignFindUnique: vi.fn(),
    campaignFindUniqueOrThrow: vi.fn(),
    campaignCreate: vi.fn(),
    campaignUpdate: vi.fn(),
    campaignUpsert: vi.fn(),
    batchCount: vi.fn(),
    batchCreate: vi.fn(),
    batchUpdate: vi.fn(),
    termCount: vi.fn(),
    termFindFirst: vi.fn(),
    queryRaw: vi.fn(),
    transaction: vi.fn(),
    sendConfirmation: vi.fn(),
    sendBatch: vi.fn(),
    sendTest: vi.fn(),
}));

vi.mock('../src/utils/config', () => ({
    APP_URL: 'https://dicionariogamer.test',
    NEWSLETTER_ENABLED: true,
    NEWSLETTER_TOKEN_SECRET: 'newsletter-flow-secret',
    PUBLIC_API_URL: 'https://api.dicionariogamer.test',
    RESEND_API_KEY: 're_test',
}));

vi.mock('../src/services/newsletterEmail', () => ({
    sendNewsletterConfirmationEmail: mocks.sendConfirmation,
    sendNewsletterBatch: mocks.sendBatch,
    sendNewsletterTestEmail: mocks.sendTest,
}));

vi.mock('../src/lib/prisma', () => {
    const prisma: any = {
        newsletterSubscriber: {
            findUnique: mocks.subscriberFindUnique,
            findUniqueOrThrow: mocks.subscriberFindUniqueOrThrow,
            create: mocks.subscriberCreate,
            update: mocks.subscriberUpdate,
            findMany: mocks.subscriberFindMany,
        },
        newsletterDelivery: {
            findUnique: mocks.deliveryFindUnique,
            findMany: mocks.deliveryFindMany,
            createMany: mocks.deliveryCreateMany,
            updateMany: mocks.deliveryUpdateMany,
            update: mocks.deliveryUpdate,
            groupBy: mocks.deliveryGroupBy,
        },
        newsletterCampaign: {
            findUnique: mocks.campaignFindUnique,
            findUniqueOrThrow: mocks.campaignFindUniqueOrThrow,
            create: mocks.campaignCreate,
            update: mocks.campaignUpdate,
            upsert: mocks.campaignUpsert,
        },
        newsletterDispatchBatch: {
            count: mocks.batchCount,
            create: mocks.batchCreate,
            update: mocks.batchUpdate,
        },
        term: { count: mocks.termCount, findFirst: mocks.termFindFirst },
        $queryRaw: mocks.queryRaw,
    };
    mocks.transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.$transaction = mocks.transaction;
    return { prisma };
});

import {
    confirmNewsletterSubscription,
    requestNewsletterSubscription,
    sendDailyNewsletter,
    unsubscribeNewsletter,
} from '../src/services/newsletter';

beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendConfirmation.mockResolvedValue({ sent: true, emailId: 'email-confirmation' });
    mocks.subscriberCreate.mockResolvedValue({ id: 'subscriber-1' });
    mocks.subscriberUpdate.mockResolvedValue({ id: 'subscriber-1', email: 'leitor@example.com' });
    mocks.deliveryUpdate.mockResolvedValue({});
    mocks.deliveryUpdateMany.mockResolvedValue({ count: 0 });
    mocks.batchCreate.mockResolvedValue({});
    mocks.batchUpdate.mockResolvedValue({});
    mocks.batchCount.mockResolvedValue(0);
    mocks.campaignUpdate.mockImplementation(async ({ data }: any) => ({ id: 'campaign-1', ...data }));
});

describe('newsletter subscription lifecycle', () => {
    it('creates a pending subscriber and stores only the confirmation hash', async () => {
        mocks.subscriberFindUnique.mockResolvedValue(null);

        const result = await requestNewsletterSubscription(' Leitor@Example.com ', 'home');

        expect(result).toEqual({ accepted: true, confirmationSent: true });
        expect(mocks.subscriberCreate).toHaveBeenCalledWith({
            data: { email: 'leitor@example.com', source: 'home', status: NewsletterSubscriberStatus.PENDING },
            select: { id: true },
        });
        const confirmationUpdate = mocks.subscriberUpdate.mock.calls.at(-1)?.[0];
        const rawToken = mocks.sendConfirmation.mock.calls[0][0].token;
        expect(confirmationUpdate.data.confirmationTokenHash).toHaveLength(64);
        expect(confirmationUpdate.data.confirmationTokenHash).not.toBe(rawToken);
        expect(confirmationUpdate.data.confirmationExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('does not reactivate active or blocked addresses', async () => {
        for (const status of [NewsletterSubscriberStatus.ACTIVE, NewsletterSubscriberStatus.BOUNCED, NewsletterSubscriberStatus.COMPLAINED, NewsletterSubscriberStatus.SUPPRESSED]) {
            vi.clearAllMocks();
            mocks.subscriberFindUnique.mockResolvedValue({ id: 'subscriber-1', status });
            expect(await requestNewsletterSubscription('leitor@example.com', 'home'))
                .toEqual({ accepted: true, confirmationSent: false });
            expect(mocks.sendConfirmation).not.toHaveBeenCalled();
        }
    });

    it('does not resend a recent pending confirmation through repeated signup', async () => {
        mocks.subscriberFindUnique.mockResolvedValue({
            id: 'subscriber-1',
            status: NewsletterSubscriberStatus.PENDING,
            confirmationSentAt: new Date(),
        });

        await expect(requestNewsletterSubscription('leitor@example.com', 'home'))
            .resolves.toEqual({ accepted: true, confirmationSent: false });
        expect(mocks.sendConfirmation).not.toHaveBeenCalled();
    });

    it('confirms a valid token once and rejects reuse', async () => {
        mocks.subscriberFindUnique
            .mockResolvedValueOnce({ id: 'subscriber-1', status: NewsletterSubscriberStatus.PENDING, confirmationExpiresAt: new Date(Date.now() + 60_000) })
            .mockResolvedValueOnce(null);

        await expect(confirmNewsletterSubscription('a'.repeat(32))).resolves.toEqual({ confirmed: true });
        expect(mocks.subscriberUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'subscriber-1' },
            data: expect.objectContaining({ status: NewsletterSubscriberStatus.ACTIVE, confirmationTokenHash: null }),
        }));
        await expect(confirmNewsletterSubscription('a'.repeat(32))).rejects.toMatchObject({ status: 410 });
    });

    it('unsubscribes idempotently through an opaque delivery token', async () => {
        mocks.deliveryFindUnique.mockResolvedValue({ subscriberId: 'subscriber-1' });

        await expect(unsubscribeNewsletter('u'.repeat(32))).resolves.toEqual({ unsubscribed: true });
        expect(mocks.subscriberUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'subscriber-1' },
            data: expect.objectContaining({ status: NewsletterSubscriberStatus.UNSUBSCRIBED, confirmationTokenHash: null }),
        }));
        mocks.deliveryFindUnique.mockResolvedValue(null);
        await expect(unsubscribeNewsletter('u'.repeat(32))).resolves.toEqual({ unsubscribed: true });
    });
});

describe('daily newsletter dispatch', () => {
    it('stops immediately when another worker owns the advisory lock', async () => {
        mocks.queryRaw.mockResolvedValue([{ locked: false }]);

        await expect(sendDailyNewsletter(new Date('2026-08-10T12:00:00.000Z')))
            .resolves.toEqual({ skipped: true, reason: 'Outro disparo está em andamento.' });
        expect(mocks.campaignFindUnique).not.toHaveBeenCalled();
    });

    it('creates every delivery before sending a deterministic batch', async () => {
        const createdRows: any[] = [];
        mocks.queryRaw.mockResolvedValue([{ locked: true }]);
        mocks.campaignFindUnique.mockResolvedValue(null);
        mocks.termCount.mockResolvedValue(1);
        mocks.termFindFirst.mockResolvedValue({
            id: 'term-1',
            word: 'Gank',
            definition: 'Ataque surpresa.',
            examples: ['O caçador preparou um gank.'],
            tags: ['MOBA'],
            game: { name: 'League of Legends' },
        });
        mocks.campaignCreate.mockImplementation(async ({ data }: any) => ({ id: 'campaign-1', ...data }));
        mocks.campaignFindUniqueOrThrow.mockResolvedValue({
            id: 'campaign-1',
            dateKey: '2026-08-10',
            termWord: 'Gank',
            termDefinition: 'Ataque surpresa.',
            termExample: 'O caçador preparou um gank.',
            termGame: 'League of Legends',
            termTags: ['MOBA'],
        });
        mocks.subscriberFindMany.mockResolvedValue([{ id: 'subscriber-1' }, { id: 'subscriber-2' }]);
        mocks.deliveryFindMany
            .mockResolvedValueOnce([])
            .mockImplementationOnce(async () => createdRows.map((row) => ({
                ...row,
                status: NewsletterDeliveryStatus.QUEUED,
                attempts: 0,
                resendEmailId: null,
                subscriber: { id: row.subscriberId, email: `${row.subscriberId}@example.com` },
            })));
        mocks.deliveryCreateMany.mockImplementation(async ({ data }: any) => {
            createdRows.push(...data);
            return { count: data.length };
        });
        mocks.sendBatch.mockResolvedValue({
            ids: [{ index: 0, id: 'resend-1' }, { index: 1, id: 'resend-2' }],
            errors: [],
        });
        mocks.deliveryGroupBy.mockResolvedValue([{ status: NewsletterDeliveryStatus.SENT, _count: { _all: 2 } }]);

        await sendDailyNewsletter(new Date('2026-08-10T12:00:00.000Z'));

        expect(mocks.deliveryCreateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([
            expect.objectContaining({ subscriberId: 'subscriber-1', campaignId: 'campaign-1' }),
            expect.objectContaining({ subscriberId: 'subscriber-2', campaignId: 'campaign-1' }),
        ]) }));
        expect(mocks.deliveryCreateMany.mock.invocationCallOrder[0]).toBeLessThan(mocks.sendBatch.mock.invocationCallOrder[0]);
        const batch = mocks.sendBatch.mock.calls[0][0];
        expect(batch.recipients).toHaveLength(2);
        expect(batch.idempotencyKey).toMatch(/^newsletter\/2026-08-10\/[0-9a-f]{32}$/);
        expect(mocks.campaignUpdate).toHaveBeenLastCalledWith({
            where: { id: 'campaign-1' },
            data: { status: NewsletterCampaignStatus.COMPLETED, finishedAt: expect.any(Date) },
        });
    });
});
