import axios from 'axios';
import { AnalyticsProvider } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
    APP_URL,
    GOOGLE_PAGESPEED_API_KEY,
    SENTRY_API_TOKEN,
    SENTRY_BACKEND_PROJECT,
    SENTRY_FRONTEND_PROJECT,
    SENTRY_ORG,
} from '../../utils/config';
import { dateInSaoPaulo } from './activity';

const sentryApi = 'https://sentry.io/api/0';

const saveMetric = (input: {
    provider: AnalyticsProvider;
    kind: string;
    value: number;
    unit?: string;
    key?: string;
    device?: string;
    metadata?: object;
}) => prisma.technicalMetricSnapshot.upsert({
    where: {
        provider_date_kind_key_device: {
            provider: input.provider,
            date: dateInSaoPaulo(),
            kind: input.kind,
            key: input.key || 'site',
            device: input.device || 'ALL',
        },
    },
    create: {
        provider: input.provider, date: dateInSaoPaulo(), kind: input.kind,
        key: input.key || 'site', device: input.device || 'ALL', value: input.value,
        unit: input.unit || null, metadata: input.metadata,
    },
    update: { value: input.value, unit: input.unit || null, metadata: input.metadata },
});

export const sentryConfigured = () => Boolean(SENTRY_ORG && SENTRY_API_TOKEN);

export const syncSentry = async (from: Date, to: Date) => {
    if (!sentryConfigured()) return { rows: 0, warnings: ['Sentry nao configurado.'] };
    const headers = { Authorization: `Bearer ${SENTRY_API_TOKEN}` };
    const start = from.toISOString();
    const end = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
    let processed = 0;
    const warnings: string[] = [];

    try {
        const stats = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/stats_v2/`, {
            params: { field: 'sum(times_seen)', category: 'error', groupBy: 'outcome', start, end, interval: '1d' },
            headers, timeout: 20_000,
        });
        const accepted = (stats.data.groups || []).filter((group: any) => group.by?.outcome === 'accepted')
            .reduce((sum: number, group: any) => sum + Number(group.totals?.['sum(times_seen)'] || 0), 0);
        await saveMetric({ provider: 'SENTRY', kind: 'errors', value: accepted, unit: 'count' });
        processed += 1;
    } catch (error) {
        warnings.push(`Contagem de erros indisponivel: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    try {
        const issues = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/issues/`, {
            params: { query: 'is:unresolved', limit: 100, sort: 'freq' }, headers, timeout: 20_000,
        });
        await saveMetric({ provider: 'SENTRY', kind: 'unresolved_issues', value: (issues.data || []).length, unit: 'count' });
        processed += 1;
    } catch (error) {
        warnings.push(`Issues do Sentry indisponiveis: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    try {
        const performanceParams = new URLSearchParams();
        performanceParams.append('dataset', 'transactions');
        performanceParams.append('field', 'p95(transaction.duration)');
        performanceParams.append('field', 'count()');
        performanceParams.append('start', start);
        performanceParams.append('end', end);
        performanceParams.append('query', 'event.type:transaction');
        const performance = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/events/`, {
            params: performanceParams,
            headers, timeout: 20_000,
        });
        const row = performance.data.data?.[0] || {};
        const p95 = Number(row['p95(transaction.duration)'] || row['p95()'] || 0);
        await saveMetric({ provider: 'SENTRY', kind: 'request_p95', value: p95, unit: 'millisecond' });
        processed += 1;
    } catch (error) {
        warnings.push(`Performance do Sentry indisponivel: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    for (const [project, errorKind, slowKind] of [
        [SENTRY_FRONTEND_PROJECT, 'frontend_errors', 'slow_page'],
        [SENTRY_BACKEND_PROJECT, 'backend_errors', 'slow_route'],
    ] as const) {
        if (!project) continue;
        try {
            const errorParams = new URLSearchParams();
            errorParams.append('dataset', 'errors');
            errorParams.append('field', 'count()');
            errorParams.append('start', start);
            errorParams.append('end', end);
            errorParams.append('query', `project:${project} event.type:error`);
            const errors = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/events/`, { params: errorParams, headers, timeout: 20_000 });
            await saveMetric({ provider: 'SENTRY', kind: errorKind, value: Number(errors.data.data?.[0]?.['count()'] || 0), unit: 'count' });

            const slowParams = new URLSearchParams();
            slowParams.append('dataset', 'transactions');
            slowParams.append('field', 'transaction');
            slowParams.append('field', 'p95(transaction.duration)');
            slowParams.append('field', 'count()');
            slowParams.append('sort', '-p95(transaction.duration)');
            slowParams.append('start', start);
            slowParams.append('end', end);
            slowParams.append('query', `project:${project} event.type:transaction`);
            slowParams.append('per_page', '20');
            const slow = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/events/`, { params: slowParams, headers, timeout: 20_000 });
            for (const row of slow.data.data || []) {
                await saveMetric({
                    provider: 'SENTRY', kind: slowKind, key: String(row.transaction || '(desconhecido)').slice(0, 500),
                    value: Number(row['p95(transaction.duration)'] || 0), unit: 'millisecond', metadata: { count: Number(row['count()'] || 0) },
                });
            }
            processed += 2 + (slow.data.data || []).length;
        } catch (error) {
            warnings.push(`Projeto Sentry ${project}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
    }

    try {
        const monitors = await axios.get(`${sentryApi}/organizations/${encodeURIComponent(SENTRY_ORG)}/detectors/`, {
            headers, timeout: 20_000,
        });
        const uptimeIncidents = (monitors.data || []).filter((item: any) => item.type === 'uptime_domain_failure' && item.openIssues > 0).length;
        await saveMetric({ provider: 'SENTRY', kind: 'uptime_incidents', value: uptimeIncidents, unit: 'count' });
        await saveMetric({ provider: 'SENTRY', kind: 'availability', value: uptimeIncidents ? 0 : 100, unit: 'percent' });
        processed += 2;
    } catch (error) {
        warnings.push(`Uptime do Sentry indisponivel: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    return { rows: processed, warnings };
};

export const qualityConfigured = () => Boolean(GOOGLE_PAGESPEED_API_KEY && APP_URL.startsWith('http'));

const p75 = (metrics: any, key: string) => Number(metrics?.[key]?.percentiles?.p75 || 0);

export const syncCrux = async () => {
    if (!qualityConfigured()) return { rows: 0, warnings: ['CrUX/PageSpeed nao configurado.'] };
    let processed = 0;
    const warnings: string[] = [];
    for (const [formFactor, device] of [['PHONE', 'MOBILE'], ['DESKTOP', 'DESKTOP']] as const) {
        try {
            const response = await axios.post(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(GOOGLE_PAGESPEED_API_KEY)}`, {
                origin: APP_URL, formFactor,
                metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'],
            }, { timeout: 30_000 });
            const metrics = response.data.record?.metrics || {};
            await Promise.all([
                saveMetric({ provider: 'CRUX', kind: 'lcp', value: p75(metrics, 'largest_contentful_paint'), unit: 'millisecond', device }),
                saveMetric({ provider: 'CRUX', kind: 'inp', value: p75(metrics, 'interaction_to_next_paint'), unit: 'millisecond', device }),
                saveMetric({ provider: 'CRUX', kind: 'cls', value: p75(metrics, 'cumulative_layout_shift'), unit: 'score', device }),
            ]);
            processed += 3;
        } catch (error) {
            warnings.push(`CrUX ${device}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
    }
    return { rows: processed, warnings };
};

export const syncPageSpeed = async () => {
    if (!qualityConfigured()) return { rows: 0, warnings: ['CrUX/PageSpeed nao configurado.'] };
    const topPages = await prisma.trafficDimensionDaily.groupBy({
        by: ['value'], where: { kind: 'PAGE', date: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) } },
        _sum: { pageviews: true }, orderBy: { _sum: { pageviews: 'desc' } }, take: 10,
    });
    const urls = Array.from(new Set([
        APP_URL, `${APP_URL}/dicionario`,
        ...topPages.map((page) => page.value.startsWith('http') ? page.value : `${APP_URL}${page.value.startsWith('/') ? '' : '/'}${page.value}`),
    ])).slice(0, 12);
    let processed = 0;
    const warnings: string[] = [];
    for (const url of urls) {
        for (const strategy of ['mobile', 'desktop'] as const) {
            try {
                const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
                    params: { url, strategy, key: GOOGLE_PAGESPEED_API_KEY, category: ['PERFORMANCE', 'SEO'] },
                    timeout: 90_000,
                });
                const categories = response.data.lighthouseResult?.categories || {};
                await Promise.all([
                    saveMetric({ provider: 'PAGESPEED', kind: 'performance_score', value: Number(categories.performance?.score || 0) * 100, unit: 'score', key: url, device: strategy.toUpperCase() }),
                    saveMetric({ provider: 'PAGESPEED', kind: 'seo_score', value: Number(categories.seo?.score || 0) * 100, unit: 'score', key: url, device: strategy.toUpperCase() }),
                ]);
                processed += 2;
            } catch (error) {
                warnings.push(`PageSpeed ${strategy} ${url}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
            }
        }
    }
    return { rows: processed, warnings };
};
