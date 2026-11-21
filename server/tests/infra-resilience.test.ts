import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/config', () => ({ RESEND_API_KEY: '', RESEND_WEBHOOK_SECRET: '' }));
vi.mock('../src/lib/prisma', () => ({ prisma: {} }));

import { shouldRetryUnmatchedWebhook } from '../src/services/newsletterWebhook';

describe('unmatched Resend webhook events', () => {
    const now = Date.parse('2026-11-20T12:00:00.000Z');
    const recent = new Date(now - 60_000);

    it('asks for redelivery of a recent newsletter event that raced the dispatcher', () => {
        const event = { data: { tags: { category: 'newsletter-daily', campaign: '2026-11-20' } } };
        expect(shouldRetryUnmatchedWebhook(event, recent, now)).toBe(true);
    });

    it('accepts the array tag shape as well', () => {
        const event = { data: { tags: [{ name: 'category', value: 'newsletter-daily' }] } };
        expect(shouldRetryUnmatchedWebhook(event, recent, now)).toBe(true);
    });

    it('drops events of other email categories so they are not retried forever', () => {
        const event = { data: { tags: { category: 'newsletter-confirmation' } } };
        expect(shouldRetryUnmatchedWebhook(event, recent, now)).toBe(false);
    });

    it('stops retrying once the event is older than the retry window', () => {
        const old = new Date(now - 7 * 60 * 60 * 1000);
        expect(shouldRetryUnmatchedWebhook({ data: {} }, old, now)).toBe(false);
    });
});

// lib/prisma is mocked above for the webhook service; load the real helper.
describe('database pool defaults', () => {
    it('adds explicit pool size and timeout when the URL has none', async () => {
        const { withPoolDefaults: apply } = await vi.importActual<typeof import('../src/lib/prisma')>('../src/lib/prisma');
        const url = new URL(apply('postgresql://u:p%40ss@localhost:5432/db?schema=public', {})!);
        expect(url.searchParams.get('connection_limit')).toBe('10');
        expect(url.searchParams.get('pool_timeout')).toBe('20');
        expect(url.searchParams.get('schema')).toBe('public');
        expect(url.password).toBe('p%40ss');
    });

    it('keeps values already set in DATABASE_URL and honours overrides', async () => {
        const { withPoolDefaults: apply } = await vi.importActual<typeof import('../src/lib/prisma')>('../src/lib/prisma');
        const url = new URL(apply('postgresql://u:p@h/db?connection_limit=3', { DATABASE_POOL_TIMEOUT: '45' })!);
        expect(url.searchParams.get('connection_limit')).toBe('3');
        expect(url.searchParams.get('pool_timeout')).toBe('45');
    });
});
