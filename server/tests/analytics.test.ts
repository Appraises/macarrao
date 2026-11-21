import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    analyticsEnabled,
    createSearchToken,
    hashSearchQuery,
    normalizeSearchQuery,
    parseSearchOrigin,
    sanitizeSearchQuery,
    verifySearchToken,
} from '../src/services/analytics/privacy';
import {
    aggregateSeo,
    buildOverviewAttention,
    buildOverviewFunnel,
    buildZeroResultRanking,
    metric,
    parseAnalyticsRange,
    percentile,
    type OverviewAttentionInput,
} from '../src/services/analytics/reporting';
import { analyticsSessionHash, engagementBucket } from '../src/services/analytics/viewerIdentity';

afterEach(() => vi.useRealTimers());

describe('analytics search privacy', () => {
    it('normalizes casing, accents, unicode and whitespace', () => {
        expect(normalizeSearchQuery('  GÁNK\u00a0  Rápido  ')).toBe('gank rapido');
    });

    it('redacts common personal and secret values', () => {
        const sanitized = sanitizeSearchQuery('email Foo@Test.com tel (11) 99999-8888 https://example.com eyJaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbb.cccccccccccc');
        expect(sanitized).toContain('[email]');
        expect(sanitized).toContain('[telefone]');
        expect(sanitized).toContain('[url]');
        expect(sanitized).toContain('[token]');
        expect(sanitized).not.toContain('foo@test.com');
    });

    it('generates a stable opaque hash without exposing the query', () => {
        const first = hashSearchQuery('Gánk');
        expect(first).toBe(hashSearchQuery('gank'));
        expect(first).not.toContain('gank');
        expect(first).toHaveLength(64);
    });

    it('signs and rejects tampered search tokens', () => {
        const token = createSearchToken('search-event-id');
        expect(verifySearchToken(token)).toBe('search-event-id');
        expect(verifySearchToken(`${token.slice(0, -1)}x`)).toBeNull();
    });

    it('expires search tokens after thirty minutes', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
        const token = createSearchToken('expiring-search');
        vi.advanceTimersByTime(30 * 60 * 1000 + 1);
        expect(verifySearchToken(token)).toBeNull();
    });

    it('requires explicit analytics consent and validates origins', () => {
        expect(analyticsEnabled({ get: () => 'true' } as any)).toBe(true);
        expect(analyticsEnabled({ get: () => 'TRUE' } as any)).toBe(false);
        expect(analyticsEnabled({ get: () => undefined } as any)).toBe(false);
        expect(parseSearchOrigin('not-found')).toBe('NOT_FOUND');
        expect(parseSearchOrigin('unknown-value')).toBe('UNKNOWN');
    });

    it('limits retained text even after redaction', () => {
        expect(sanitizeSearchQuery('x'.repeat(120))).toHaveLength(80);
        expect(sanitizeSearchQuery('550e8400-e29b-41d4-a716-446655440000')).toBe('[identificador]');
    });
});

describe('first-party analytics identity', () => {
    it('keeps sessions deterministic inside a bucket and opaque', () => {
        const now = new Date('2026-10-01T12:14:00.000Z');
        const hash = analyticsSessionHash('a'.repeat(64), now);
        expect(hash).toBe(analyticsSessionHash('a'.repeat(64), new Date('2026-10-01T12:29:59.000Z')));
        expect(hash).not.toContain('a'.repeat(20));
        expect(hash).toHaveLength(64);
        expect(engagementBucket(now, 30).toISOString()).toBe('2026-10-01T12:00:00.000Z');
    });
});

describe('analytics reporting ranges', () => {
    it('builds an inclusive period and the immediately previous comparison', () => {
        const range = parseAnalyticsRange({ from: '2026-07-01', to: '2026-07-07' });
        expect('error' in range).toBe(false);
        if ('error' in range) return;
        expect(range.days).toBe(7);
        expect(range.previousFrom.toISOString().slice(0, 10)).toBe('2026-06-24');
        expect(range.previousTo.toISOString().slice(0, 10)).toBe('2026-06-30');
    });

    it('rejects reversed and excessive periods', () => {
        expect(parseAnalyticsRange({ from: '2026-07-08', to: '2026-07-01' })).toHaveProperty('error');
        expect(parseAnalyticsRange({ from: '2024-01-01', to: '2026-07-01' })).toHaveProperty('error');
    });

    it('combines Search Console position weighted by impressions', () => {
        const [row] = aggregateSeo([
            { value: '/term/gank', clicks: 10, impressions: 100, position: 2 },
            { value: '/term/gank', clicks: 5, impressions: 300, position: 10 },
        ]);
        expect(row.clicks).toBe(15);
        expect(row.impressions).toBe(400);
        expect(row.ctr).toBeCloseTo(0.0375);
        expect(row.position).toBeCloseTo(8);
    });

    it('calculates stable median and p95 moderation times', () => {
        expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
        expect(percentile([1, 2, 3, 4, 100], 0.95)).toBe(100);
        expect(percentile([], 0.95)).toBe(0);
    });
});

const attentionInput = (): OverviewAttentionInput => ({
    providers: [],
    technical: { uptimeIncidents: 0, apiP95Ms: 0, mobileLcpMs: 0 },
    searches: { total: 0, zeroResultRate: 0, previousZeroResultRate: 0 },
    pageChanges: [],
    ctrOpportunities: [],
    pending: { count: 0, oldestHours: 0 },
});

describe('analytics decision overview', () => {
    it('calculates stable comparison, conversion and abandonment values', () => {
        expect(metric(120, 100)).toEqual({ value: 120, previous: 100, deltaPercent: 20 });
        const funnel = buildOverviewFunnel([
            { key: 'organic', label: 'Entrada', value: 100 },
            { key: 'search', label: 'Busca', value: 60 },
            { key: 'term', label: 'Termo', value: 30 },
        ]);
        expect(funnel[1]).toMatchObject({ conversionRate: 60, abandonment: 40, abandonmentRate: 40 });
        expect(funnel[2]).toMatchObject({ conversionRate: 50, abandonment: 30, abandonmentRate: 50 });
    });

    it('applies warning and critical performance thresholds without firing on the boundary', () => {
        const boundary = attentionInput();
        boundary.technical = { uptimeIncidents: 0, apiP95Ms: 1_000, mobileLcpMs: 2_500 };
        expect(buildOverviewAttention(boundary)).toHaveLength(0);

        const warning = attentionInput();
        warning.technical = { uptimeIncidents: 0, apiP95Ms: 1_001, mobileLcpMs: 2_501 };
        expect(buildOverviewAttention(warning).map((item) => [item.id, item.severity])).toEqual([
            ['api-p95', 'WARNING'], ['mobile-lcp', 'WARNING'],
        ]);

        const critical = attentionInput();
        critical.technical = { uptimeIncidents: 1, apiP95Ms: 2_001, mobileLcpMs: 4_001 };
        expect(buildOverviewAttention(critical).map((item) => item.severity)).toEqual(['CRITICAL', 'CRITICAL', 'CRITICAL']);
    });

    it('detects absolute and period-over-period zero-result deterioration', () => {
        const byRate = attentionInput();
        byRate.searches = { total: 20, zeroResultRate: 20.1, previousZeroResultRate: 19 };
        expect(buildOverviewAttention(byRate)[0]).toMatchObject({ id: 'zero-result-rate', severity: 'WARNING' });

        const byIncrease = attentionInput();
        byIncrease.searches = { total: 20, zeroResultRate: 18, previousZeroResultRate: 8 };
        expect(buildOverviewAttention(byIncrease)[0]).toMatchObject({ id: 'zero-result-rate', severity: 'WARNING' });

        const critical = attentionInput();
        critical.searches = { total: 50, zeroResultRate: 35.1, previousZeroResultRate: 30 };
        expect(buildOverviewAttention(critical)[0]).toMatchObject({ id: 'zero-result-rate', severity: 'CRITICAL' });
    });

    it('creates actionable SEO and moderation alerts at their defined thresholds', () => {
        const input = attentionInput();
        input.pageChanges = [{ key: '/term/Gank', clicks: 10, previousClicks: 20, changePercent: -50 }];
        input.ctrOpportunities = [{ key: 'gank significado', impressions: 500, ctr: 0.01, position: 5 }];
        input.pending = { count: 3, oldestHours: 49 };
        const alerts = buildOverviewAttention(input);
        expect(alerts).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'page-drop-/term/Gank', severity: 'CRITICAL', action: expect.objectContaining({ target: 'seo' }) }),
            expect.objectContaining({ id: 'ctr-opportunity', severity: 'WARNING' }),
            expect.objectContaining({ id: 'pending-contribution', severity: 'CRITICAL', action: expect.objectContaining({ kind: 'ROUTE' }) }),
        ]));
    });

    it('groups unconfigured providers, orders by severity and returns at most six alerts', () => {
        const grouped = attentionInput();
        grouped.providers = [
            { provider: 'SENTRY', state: 'NOT_CONFIGURED' },
            { provider: 'CRUX', state: 'NOT_CONFIGURED' },
        ];
        expect(buildOverviewAttention(grouped)).toEqual([
            expect.objectContaining({ id: 'providers-not-configured', severity: 'INFO', value: '2 provedores' }),
        ]);

        const crowded = attentionInput();
        crowded.providers = [
            { provider: 'INTERNAL', state: 'ERROR' },
            { provider: 'SEARCH_CONSOLE', state: 'ERROR' },
            { provider: 'SENTRY', state: 'STALE' },
            { provider: 'CRUX', state: 'NOT_CONFIGURED' },
        ];
        crowded.technical = { uptimeIncidents: 2, apiP95Ms: 2_500, mobileLcpMs: 4_500 };
        crowded.searches = { total: 60, zeroResultRate: 40, previousZeroResultRate: 10 };
        crowded.pageChanges = [{ key: '/term/Nerf', clicks: 8, previousClicks: 30, changePercent: -73.3 }];
        crowded.ctrOpportunities = [{ key: 'nerf', impressions: 900, ctr: 0.01, position: 4 }];
        crowded.pending = { count: 4, oldestHours: 60 };
        const alerts = buildOverviewAttention(crowded);
        expect(alerts).toHaveLength(6);
        expect(alerts.every((item) => item.severity === 'CRITICAL')).toBe(true);
    });

    it('never exposes zero-result queries below the privacy threshold', () => {
        const ranking = buildZeroResultRanking([
            { queryHash: 'private', query: 'apenas duas vezes', count: 2 },
            { queryHash: 'public', query: 'termo ausente', count: 3 },
            { queryHash: 'expired', query: null, count: 20 },
        ], [{ queryHash: 'public', count: 1 }]);
        expect(ranking).toEqual([
            { query: 'termo ausente', count: 3, previousCount: 1, deltaPercent: 200 },
        ]);
    });
});
