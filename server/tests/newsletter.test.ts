import { NewsletterDeliveryStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
    term: { count: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/utils/config', () => ({
    APP_URL: 'https://dicionariogamer.test',
    EMAIL_FROM: 'Dicionario Gamer <nao-responda@dicionariogamer.test>',
    NEWSLETTER_ENABLED: false,
    NEWSLETTER_TOKEN_SECRET: 'newsletter-test-secret',
    PUBLIC_API_URL: 'https://api.dicionariogamer.test',
    RESEND_API_KEY: '',
    RESEND_WEBHOOK_SECRET: '',
}));

import {
    deliveryToken,
    hashNewsletterToken,
    normalizeNewsletterEmail,
} from '../src/services/newsletter';
import {
    renderNewsletterConfirmationEmail,
    renderNewsletterDailyEmail,
    sanitizeNewsletterProviderError,
} from '../src/services/newsletterEmail';
import {
    resolveNewsletterDeliveryStatus,
    resolveNewsletterSubscriberStatus,
    subscriberBlockStatusForWebhook,
} from '../src/services/newsletterWebhook';
import { dateKeyInSaoPaulo, getTermOfTheDay } from '../src/services/termOfDay';

beforeEach(() => vi.clearAllMocks());

describe('newsletter privacy tokens', () => {
    it('normalizes addresses without retaining display whitespace', () => {
        expect(normalizeNewsletterEmail('  Pessoa@Example.COM ')).toBe('pessoa@example.com');
        expect(normalizeNewsletterEmail(null)).toBe('');
    });

    it('creates stable, purpose-specific opaque delivery tokens', () => {
        const click = deliveryToken('delivery-1', 'click');
        const unsubscribe = deliveryToken('delivery-1', 'unsubscribe');

        expect(click).toBe(deliveryToken('delivery-1', 'click'));
        expect(click).not.toBe(unsubscribe);
        expect(click).not.toContain('delivery-1');
        expect(hashNewsletterToken(click)).toHaveLength(64);
        expect(hashNewsletterToken(click)).not.toContain(click);
    });
});

describe('newsletter email templates', () => {
    it('builds a 24-hour confirmation link and a plain-text fallback', () => {
        const mail = renderNewsletterConfirmationEmail('token com espaço');

        expect(mail.html).toContain('newsletter/confirmar?token=token%20com%20espa%C3%A7o');
        expect(mail.html).toContain('24 horas');
        expect(mail.text).toContain('https://dicionariogamer.test/newsletter/confirmar');
    });

    it('shows the term and visible unsubscribe link without an open pixel', () => {
        const mail = renderNewsletterDailyEmail({
            term: {
                word: 'Gank',
                definition: 'Ataque surpresa contra um adversário em desvantagem.',
                example: 'O caçador preparou um gank.',
                game: 'League of Legends',
                tags: ['MOBA', 'Estratégia'],
            },
            clickUrl: 'https://api.dicionariogamer.test/newsletter/click/click-token',
            unsubscribeUrl: 'https://dicionariogamer.test/newsletter/descadastrar?token=unsubscribe-token',
        });

        expect(mail.subject).toContain('Gank');
        expect(mail.html).toContain('Descadastrar meu e-mail');
        expect(mail.html).toContain('unsubscribe-token');
        expect(mail.text).toContain('Não quer mais receber?');
        expect(mail.html).not.toMatch(/<img|email\/open|tracking-pixel/i);
    });

    it('redacts personal and secret values from provider errors', () => {
        const safe = sanitizeNewsletterProviderError('Falha para pessoa@example.com em https://api.test/email?token=abc123 com re_supersecret');
        expect(safe).not.toContain('pessoa@example.com');
        expect(safe).not.toContain('https://');
        expect(safe).not.toContain('re_supersecret');
        expect(safe).toContain('[email]');
    });
});

describe('Termo do Dia', () => {
    it('uses the calendar date in America/Sao_Paulo', () => {
        expect(dateKeyInSaoPaulo(new Date('2026-08-10T02:30:00.000Z'))).toBe('2026-08-09');
        expect(dateKeyInSaoPaulo(new Date('2026-08-10T03:30:00.000Z'))).toBe('2026-08-10');
    });

    it('selects deterministically from approved, non-archived terms', async () => {
        const selected = { id: '2', word: 'Gank', definition: 'B', examples: [], tags: ['MOBA'], game: { name: 'LoL' } };
        prismaMock.term.count.mockResolvedValue(3);
        prismaMock.term.findFirst.mockResolvedValue(selected);
        const when = new Date('2026-08-10T12:00:00.000Z');

        expect(await getTermOfTheDay(when)).toEqual(selected);
        expect(await getTermOfTheDay(when)).toEqual(selected);
        expect(prismaMock.term.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: { status: 'APPROVED', archivedAt: null },
            orderBy: { id: 'asc' },
            skip: 1,
        }));
    });
});

describe('Resend webhook ordering', () => {
    it('does not let late transient events overwrite a terminal state', () => {
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.DELIVERED, 'email.delivery_delayed'))
            .toBe(NewsletterDeliveryStatus.DELIVERED);
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.BOUNCED, 'email.sent'))
            .toBe(NewsletterDeliveryStatus.BOUNCED);
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.COMPLAINED, 'email.delivered'))
            .toBe(NewsletterDeliveryStatus.COMPLAINED);
    });

    it('promotes accepted messages through delivery and blocking states', () => {
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.SENDING, 'email.sent'))
            .toBe(NewsletterDeliveryStatus.SENT);
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.SENT, 'email.delivered'))
            .toBe(NewsletterDeliveryStatus.DELIVERED);
        expect(resolveNewsletterDeliveryStatus(NewsletterDeliveryStatus.DELIVERED, 'email.complained'))
            .toBe(NewsletterDeliveryStatus.COMPLAINED);
    });

    it('blocks only permanent bounces, complaints and suppressions', () => {
        expect(subscriberBlockStatusForWebhook('email.bounced', { data: { bounce: { type: 'Permanent' } } }))
            .toBe('BOUNCED');
        expect(subscriberBlockStatusForWebhook('email.bounced', { data: { bounce: { type: 'Transient' } } }))
            .toBeUndefined();
        expect(subscriberBlockStatusForWebhook('email.complained', {})).toBe('COMPLAINED');
        expect(subscriberBlockStatusForWebhook('email.suppressed', {})).toBe('SUPPRESSED');
    });

    it('never downgrades an existing complaint when terminal events arrive late', () => {
        expect(resolveNewsletterSubscriberStatus('COMPLAINED', 'email.bounced', { data: { bounce: { type: 'Permanent' } } }))
            .toBe('COMPLAINED');
        expect(resolveNewsletterSubscriberStatus('BOUNCED', 'email.suppressed', {})).toBe('SUPPRESSED');
        expect(resolveNewsletterSubscriberStatus('ACTIVE', 'email.complained', {})).toBe('COMPLAINED');
    });
});
