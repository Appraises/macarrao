import { describe, expect, it, vi } from 'vitest';
import {
    consumeRateLimit,
    resolveContributionProtection,
} from '../src/services/abuseProtection';

describe('abuse protection', () => {
    it('stores only a HMAC subject and enforces the fixed-window limit', async () => {
        const upsert = vi.fn().mockResolvedValue({ count: 6 });
        const now = new Date('2026-07-26T15:17:42.000Z');

        const result = await consumeRateLimit({
            scope: 'CONTRIBUTION_IP',
            subject: '203.0.113.42',
            limit: 5,
            windowMs: 30 * 60_000,
            client: { rateLimitBucket: { upsert } } as any,
            now,
        });

        expect(result.allowed).toBe(false);
        expect(result.retryAfterSeconds).toBe(738);
        const call = upsert.mock.calls[0][0];
        expect(call.create.subjectHash).toMatch(/^[a-f0-9]{64}$/);
        expect(JSON.stringify(call)).not.toContain('203.0.113.42');
        expect(call.create.windowStartedAt).toEqual(new Date('2026-07-26T15:00:00.000Z'));
    });

    it('trusts a recently verified account without another challenge', () => {
        const now = new Date('2026-07-26T15:00:00.000Z');
        const result = resolveContributionProtection({
            enabled: true,
            createdAt: new Date('2026-07-26T14:00:00.000Z'),
            botVerifiedAt: new Date('2026-07-26T14:45:00.000Z'),
            recentContributions: 4,
            dailyContributions: 9,
            now,
            trustMinutes: 30,
        });

        expect(result).toMatchObject({
            challengeRequired: false,
            reason: 'RECENTLY_VERIFIED',
        });
    });

    it('requires a challenge for new accounts and accelerated activity', () => {
        const now = new Date('2026-07-26T15:00:00.000Z');
        const fresh = resolveContributionProtection({
            enabled: true,
            createdAt: new Date('2026-07-26T14:00:00.000Z'),
            botVerifiedAt: null,
            recentContributions: 0,
            dailyContributions: 0,
            now,
            newAccountHours: 24,
        });
        const accelerated = resolveContributionProtection({
            enabled: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            botVerifiedAt: null,
            recentContributions: 2,
            dailyContributions: 2,
            now,
            recentThreshold: 2,
            dailyThreshold: 5,
        });

        expect(fresh).toMatchObject({ challengeRequired: true, reason: 'NEW_ACCOUNT' });
        expect(accelerated).toMatchObject({ challengeRequired: true, reason: 'ACCELERATED_ACTIVITY' });
    });
});
