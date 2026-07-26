import { Prisma, SearchConsoleDimensionKind, TrafficDimensionKind } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { GOOGLE_SEARCH_CONSOLE_SITE_URL, PLAUSIBLE_SITE_ID, SENTRY_ORG } from '../../utils/config';
import { analyticsProviderConfigured } from './sync';

const DAY = 24 * 60 * 60 * 1000;
const dateOnly = (value: Date) => new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
const endOfDay = (value: Date) => new Date(dateOnly(value).getTime() + DAY - 1);

export interface AnalyticsRange {
    from: Date;
    to: Date;
    previousFrom: Date;
    previousTo: Date;
    days: number;
}

export const parseAnalyticsRange = (query: Record<string, unknown>): AnalyticsRange | { error: string } => {
    const defaultTo = dateOnly(new Date());
    const defaultFrom = new Date(defaultTo.getTime() - 27 * DAY);
    const from = typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? new Date(`${query.from}T00:00:00.000Z`) : defaultFrom;
    const toDate = typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? new Date(`${query.to}T00:00:00.000Z`) : defaultTo;
    if (Number.isNaN(from.getTime()) || Number.isNaN(toDate.getTime()) || from > toDate) return { error: 'Periodo invalido.' };
    const days = Math.floor((toDate.getTime() - from.getTime()) / DAY) + 1;
    if (days > 500) return { error: 'O periodo maximo e de 500 dias.' };
    const previousToDate = new Date(from.getTime() - DAY);
    return { from, to: endOfDay(toDate), previousFrom: new Date(previousToDate.getTime() - (days - 1) * DAY), previousTo: endOfDay(previousToDate), days };
};

export const metric = (value: number, previous: number) => ({
    value,
    previous,
    deltaPercent: previous === 0 ? (value === 0 ? 0 : 100) : ((value - previous) / previous) * 100,
});
const countWhere = (from: Date, to: Date) => ({ gte: from, lte: to });
const number = (value: unknown) => Number(value || 0);
export const percentile = (values: number[], percent: number) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(percent * sorted.length) - 1)];
};

export const analyticsStatus = async () => {
    const providers = ['PLAUSIBLE', 'SEARCH_CONSOLE', 'SENTRY', 'CRUX', 'PAGESPEED'] as const;
    const thresholds: Record<typeof providers[number], number> = { PLAUSIBLE: 2, SEARCH_CONSOLE: 48, SENTRY: 1, CRUX: 48, PAGESPEED: 24 * 8 };
    return Promise.all(providers.map(async (provider) => {
        const configured = analyticsProviderConfigured(provider);
        const latest = await prisma.analyticsSyncRun.findFirst({ where: { provider }, orderBy: { startedAt: 'desc' } });
        let state: 'READY' | 'STALE' | 'NOT_CONFIGURED' | 'ERROR' = 'READY';
        if (!configured) state = 'NOT_CONFIGURED';
        else if (latest?.status === 'FAILED') state = 'ERROR';
        else if (!latest?.finishedAt || Date.now() - latest.finishedAt.getTime() > thresholds[provider] * 60 * 60 * 1000) state = 'STALE';
        const dashboardUrl = provider === 'PLAUSIBLE' && PLAUSIBLE_SITE_ID
            ? `https://plausible.io/${encodeURIComponent(PLAUSIBLE_SITE_ID)}`
            : provider === 'SEARCH_CONSOLE' && GOOGLE_SEARCH_CONSOLE_SITE_URL
                ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(GOOGLE_SEARCH_CONSOLE_SITE_URL)}`
                : provider === 'SENTRY' && SENTRY_ORG
                    ? `https://sentry.io/organizations/${encodeURIComponent(SENTRY_ORG)}/issues/`
                    : null;
        return { provider, configured, state, lastSyncedAt: latest?.finishedAt || null, lastStatus: latest?.status || null, message: latest?.error || null, dashboardUrl };
    }));
};

const trafficTotals = (from: Date, to: Date) => prisma.trafficDailyMetric.aggregate({
    where: { date: countWhere(from, to) },
    _sum: { visitors: true, visits: true, pageviews: true, newVisits: true, returningVisits: true },
    _avg: { bounceRate: true, visitDurationSec: true },
});

export type OverviewAttentionSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type OverviewAttentionTab = 'traffic' | 'seo' | 'dictionary' | 'community' | 'quality';

export interface OverviewAttentionAlert {
    id: string;
    severity: OverviewAttentionSeverity;
    title: string;
    value: string;
    description: string;
    action: { kind: 'TAB' | 'ROUTE'; target: string; label: string };
}

export interface OverviewAttentionInput {
    providers: Array<{ provider: string; state: 'READY' | 'STALE' | 'NOT_CONFIGURED' | 'ERROR' }>;
    technical: { uptimeIncidents: number; apiP95Ms: number; mobileLcpMs: number };
    searches: { total: number; zeroResultRate: number; previousZeroResultRate: number };
    pageChanges: Array<{ key: string; clicks: number; previousClicks: number; changePercent: number }>;
    ctrOpportunities: Array<{ key: string; impressions: number; ctr: number; position: number }>;
    pending: { count: number; oldestHours: number };
}

const ATTENTION_ORDER: Record<OverviewAttentionSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
const providerTab = (provider: string): OverviewAttentionTab => provider === 'SEARCH_CONSOLE'
    ? 'seo'
    : provider === 'PLAUSIBLE' ? 'traffic' : 'quality';

export const buildOverviewAttention = (input: OverviewAttentionInput): OverviewAttentionAlert[] => {
    const alerts: Array<OverviewAttentionAlert & { priority: number }> = [];
    const add = (alert: OverviewAttentionAlert, priority: number) => alerts.push({ ...alert, priority });

    input.providers.filter((provider) => provider.state === 'ERROR').forEach((provider) => add({
        id: `provider-error-${provider.provider.toLowerCase()}`,
        severity: 'CRITICAL',
        title: `${provider.provider.replace(/_/g, ' ')} com erro`,
        value: 'Sincronização interrompida',
        description: 'Os dados anteriores continuam disponíveis, mas este provedor precisa de atenção.',
        action: { kind: 'TAB', target: providerTab(provider.provider), label: 'Ver dados do provedor' },
    }, 10));

    if (input.technical.uptimeIncidents > 0) add({
        id: 'uptime-incidents', severity: 'CRITICAL', title: 'Incidente de disponibilidade',
        value: `${input.technical.uptimeIncidents} no período`,
        description: 'A aplicação registrou indisponibilidade e deve ter os incidentes revisados.',
        action: { kind: 'TAB', target: 'quality', label: 'Investigar qualidade' },
    }, 20);

    if (input.technical.apiP95Ms > 1_000) {
        const critical = input.technical.apiP95Ms > 2_000;
        add({
            id: 'api-p95', severity: critical ? 'CRITICAL' : 'WARNING', title: 'API lenta no p95',
            value: `${(input.technical.apiP95Ms / 1_000).toFixed(1)} s`,
            description: critical ? 'O p95 ultrapassou dois segundos e pode comprometer fluxos principais.' : 'O p95 ultrapassou um segundo e merece acompanhamento.',
            action: { kind: 'TAB', target: 'quality', label: 'Ver rotas lentas' },
        }, 30);
    }

    if (input.technical.mobileLcpMs > 2_500) {
        const critical = input.technical.mobileLcpMs > 4_000;
        add({
            id: 'mobile-lcp', severity: critical ? 'CRITICAL' : 'WARNING', title: 'LCP mobile acima da meta',
            value: `${(input.technical.mobileLcpMs / 1_000).toFixed(1)} s`,
            description: critical ? 'A principal renderização mobile está na faixa ruim dos Core Web Vitals.' : 'A principal renderização mobile precisa melhorar para atingir a faixa recomendada.',
            action: { kind: 'TAB', target: 'quality', label: 'Ver Core Web Vitals' },
        }, 40);
    }

    const zeroRateIncrease = input.searches.zeroResultRate - input.searches.previousZeroResultRate;
    const criticalZeroResults = input.searches.total >= 50 && input.searches.zeroResultRate > 35;
    const warningZeroResults = input.searches.total >= 20 && (input.searches.zeroResultRate > 20 || zeroRateIncrease >= 10);
    if (criticalZeroResults || warningZeroResults) add({
        id: 'zero-result-rate', severity: criticalZeroResults ? 'CRITICAL' : 'WARNING', title: 'Muitas buscas sem resultado',
        value: `${input.searches.zeroResultRate.toFixed(1)}% das buscas`,
        description: zeroRateIncrease >= 10
            ? `A taxa subiu ${zeroRateIncrease.toFixed(1)} pontos percentuais contra o período anterior.`
            : 'Há demanda recorrente por conteúdo que o dicionário ainda não está atendendo.',
        action: { kind: 'TAB', target: 'dictionary', label: 'Ver buscas sem resultado' },
    }, 50);

    const oldestPageDrop = input.pageChanges
        .filter((page) => page.previousClicks >= 20 && page.changePercent <= -30)
        .sort((a, b) => a.changePercent - b.changePercent)[0];
    if (oldestPageDrop) add({
        id: `page-drop-${oldestPageDrop.key}`, severity: oldestPageDrop.changePercent <= -50 ? 'CRITICAL' : 'WARNING',
        title: 'Página perdeu cliques orgânicos', value: `${Math.abs(oldestPageDrop.changePercent).toFixed(0)}% de queda`,
        description: `${oldestPageDrop.key} caiu de ${oldestPageDrop.previousClicks} para ${oldestPageDrop.clicks} cliques.`,
        action: { kind: 'TAB', target: 'seo', label: 'Analisar página' },
    }, 60);

    const ctrOpportunities = input.ctrOpportunities.filter((item) => item.impressions >= 500);
    if (ctrOpportunities.length) add({
        id: 'ctr-opportunity', severity: 'WARNING', title: 'Oportunidade de CTR',
        value: `${ctrOpportunities.length} ${ctrOpportunities.length === 1 ? 'consulta' : 'consultas'}`,
        description: `${ctrOpportunities[0].key} tem ${Math.round(ctrOpportunities[0].impressions)} impressões e CTR abaixo da mediana da posição.`,
        action: { kind: 'TAB', target: 'seo', label: 'Ver oportunidades' },
    }, 70);

    if (input.pending.count > 0 && input.pending.oldestHours > 24) {
        const critical = input.pending.oldestHours > 48;
        add({
            id: 'pending-contribution', severity: critical ? 'CRITICAL' : 'WARNING', title: 'Contribuição aguardando moderação',
            value: `${Math.floor(input.pending.oldestHours)} h na fila`,
            description: `${input.pending.count} ${input.pending.count === 1 ? 'contribuição aguarda' : 'contribuições aguardam'} uma decisão.`,
            action: { kind: 'ROUTE', target: '/dashboard/contributions?status=PENDING', label: 'Abrir fila de moderação' },
        }, 80);
    }

    input.providers.filter((provider) => provider.state === 'STALE').forEach((provider) => add({
        id: `provider-stale-${provider.provider.toLowerCase()}`, severity: 'WARNING',
        title: `${provider.provider.replace(/_/g, ' ')} desatualizado`, value: 'Dados antigos',
        description: 'A última sincronização ultrapassou a janela esperada para este provedor.',
        action: { kind: 'TAB', target: providerTab(provider.provider), label: 'Ver atualização' },
    }, 90));

    const notConfigured = input.providers.filter((provider) => provider.state === 'NOT_CONFIGURED');
    if (notConfigured.length) add({
        id: 'providers-not-configured', severity: 'INFO', title: 'Integrações ainda não configuradas',
        value: `${notConfigured.length} ${notConfigured.length === 1 ? 'provedor' : 'provedores'}`,
        description: notConfigured.map((provider) => provider.provider.replace(/_/g, ' ')).join(', '),
        action: { kind: 'TAB', target: 'quality', label: 'Ver integrações' },
    }, 100);

    return alerts.sort((a, b) => ATTENTION_ORDER[a.severity] - ATTENTION_ORDER[b.severity] || a.priority - b.priority)
        .slice(0, 6).map(({ priority: _priority, ...alert }) => alert);
};

export interface OverviewFunnelStep {
    key: string;
    label: string;
    value: number;
    conversionRate: number;
    abandonment: number;
    abandonmentRate: number;
}

export const buildOverviewFunnel = (steps: Array<{ key: string; label: string; value: number }>): OverviewFunnelStep[] => steps.map((step, index) => {
    const previous = index ? steps[index - 1].value : step.value;
    return {
        ...step,
        conversionRate: index === 0 ? 100 : previous ? (step.value / previous) * 100 : 0,
        abandonment: index === 0 ? 0 : Math.max(0, previous - step.value),
        abandonmentRate: index === 0 || !previous ? 0 : (Math.max(0, previous - step.value) / previous) * 100,
    };
});

export const buildZeroResultRanking = (
    current: Array<{ queryHash: string; query: string | null; count: number }>,
    previous: Array<{ queryHash: string; count: number }>,
) => {
    const previousMap = new Map(previous.map((row) => [row.queryHash, row.count]));
    return current.filter((row) => row.query && row.count >= 3).map((row) => ({
        query: row.query!, count: row.count, previousCount: previousMap.get(row.queryHash) || 0,
        deltaPercent: metric(row.count, previousMap.get(row.queryHash) || 0).deltaPercent,
    })).sort((a, b) => b.count - a.count).slice(0, 5);
};

const moderationHours = (from: Date, to: Date) => prisma.$queryRaw<Array<{ hours: number }>>(Prisma.sql`
    SELECT EXTRACT(EPOCH FROM (decision."decidedAt" - t."createdAt")) / 3600 AS hours
    FROM "Term" t
    JOIN LATERAL (
        SELECT MIN(e."createdAt") AS "decidedAt" FROM "TermModerationEvent" e
        WHERE e."termId" = t.id AND e.type IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
    ) decision ON decision."decidedAt" IS NOT NULL
    WHERE t."authorId" IS NOT NULL AND decision."decidedAt" BETWEEN ${from} AND ${to}
      AND decision."decidedAt" >= t."createdAt"`);

const toDateKey = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
const productTrend = (
    range: AnalyticsRange,
    organicRows: Array<{ date: Date; visitors: number }>,
    searchRows: Array<{ date: Date; count: bigint }>,
    openedRows: Array<{ date: Date; count: bigint }>,
) => {
    const points = new Map<string, { date: string; organicVisitors: number; searches: number; termsOpened: number }>();
    for (let cursor = dateOnly(range.from); cursor <= range.to; cursor = new Date(cursor.getTime() + DAY)) {
        const key = toDateKey(cursor);
        points.set(key, { date: key, organicVisitors: 0, searches: 0, termsOpened: 0 });
    }
    organicRows.forEach((row) => { const item = points.get(toDateKey(row.date)); if (item) item.organicVisitors += row.visitors; });
    searchRows.forEach((row) => { const item = points.get(toDateKey(row.date)); if (item) item.searches += Number(row.count); });
    openedRows.forEach((row) => { const item = points.get(toDateKey(row.date)); if (item) item.termsOpened += Number(row.count); });
    return [...points.values()];
};

export const overviewReport = async (range: AnalyticsRange) => {
    const [
        traffic, previousTraffic, searches, previousSearches, users, previousUsers, contributions, previousContributions,
        active1, active7, active30, providers, opened, previousOpened, found, previousFound, seriesTraffic,
        searchSeries, signupSeries, openedSeries, visitorTypes, previousVisitorTypes, organicChannels, previousOrganicChannels,
        topTerms, zeroSearches, previousZeroSearches, pageRows, previousPageRows, queryRows, technicalSnapshots,
        pendingCount, oldestPending, currentModerationTimes, previousModerationTimes, decisionRows,
    ] = await Promise.all([
        trafficTotals(range.from, range.to), trafficTotals(range.previousFrom, range.previousTo),
        prisma.internalSearchEvent.aggregate({ where: { createdAt: countWhere(range.from, range.to) }, _count: { id: true } }),
        prisma.internalSearchEvent.aggregate({ where: { createdAt: countWhere(range.previousFrom, range.previousTo) }, _count: { id: true } }),
        prisma.user.count({ where: { createdAt: countWhere(range.from, range.to) } }),
        prisma.user.count({ where: { createdAt: countWhere(range.previousFrom, range.previousTo) } }),
        prisma.term.count({ where: { authorId: { not: null }, createdAt: countWhere(range.from, range.to) } }),
        prisma.term.count({ where: { authorId: { not: null }, createdAt: countWhere(range.previousFrom, range.previousTo) } }),
        prisma.userActivityDay.count({ where: { date: { gte: dateOnly(new Date()) } } }),
        prisma.userActivityDay.groupBy({ by: ['userId'], where: { date: { gte: new Date(dateOnly(new Date()).getTime() - 6 * DAY) } } }).then((rows) => rows.length),
        prisma.userActivityDay.groupBy({ by: ['userId'], where: { date: { gte: new Date(dateOnly(new Date()).getTime() - 29 * DAY) } } }).then((rows) => rows.length),
        analyticsStatus(),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.from, range.to), openedAt: { not: null } } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.previousFrom, range.previousTo), openedAt: { not: null } } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.from, range.to), resultCount: { gt: 0 } } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.previousFrom, range.previousTo), resultCount: { gt: 0 } } }),
        prisma.trafficDailyMetric.findMany({ where: { date: countWhere(range.from, range.to) }, orderBy: { date: 'asc' } }),
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(Prisma.sql`SELECT DATE("createdAt") date, COUNT(*) count FROM "InternalSearchEvent" WHERE "createdAt" BETWEEN ${range.from} AND ${range.to} GROUP BY DATE("createdAt") ORDER BY date`),
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(Prisma.sql`SELECT DATE("createdAt") date, COUNT(*) count FROM "User" WHERE "createdAt" BETWEEN ${range.from} AND ${range.to} GROUP BY DATE("createdAt") ORDER BY date`),
        prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(Prisma.sql`SELECT DATE("openedAt") date, COUNT(*) count FROM "InternalSearchEvent" WHERE "openedAt" BETWEEN ${range.from} AND ${range.to} GROUP BY DATE("openedAt") ORDER BY date`),
        prisma.trafficDimensionDaily.findMany({ where: { kind: 'EVENT', date: countWhere(range.from, range.to), value: { startsWith: 'VISITOR_TYPE::' } } }),
        prisma.trafficDimensionDaily.findMany({ where: { kind: 'EVENT', date: countWhere(range.previousFrom, range.previousTo), value: { startsWith: 'VISITOR_TYPE::' } } }),
        prisma.trafficDimensionDaily.findMany({ where: { kind: 'CHANNEL', date: countWhere(range.from, range.to), value: { equals: 'Organic Search', mode: 'insensitive' } } }),
        prisma.trafficDimensionDaily.findMany({ where: { kind: 'CHANNEL', date: countWhere(range.previousFrom, range.previousTo), value: { equals: 'Organic Search', mode: 'insensitive' } } }),
        prisma.$queryRaw<Array<{ id: string; word: string; game: string | null; views: bigint }>>(Prisma.sql`
            SELECT t.id, t.word, g.name game, COUNT(v.id) views FROM "TermView" v
            JOIN "Term" t ON t.id = v."termId" LEFT JOIN "Game" g ON g.id = t."gameId"
            WHERE v."createdAt" BETWEEN ${range.from} AND ${range.to} AND t.status = 'APPROVED' AND t."archivedAt" IS NULL
            GROUP BY t.id, t.word, g.name ORDER BY views DESC, t.word ASC LIMIT 5`),
        prisma.internalSearchEvent.groupBy({ by: ['queryHash', 'normalizedQuery'], where: { createdAt: countWhere(range.from, range.to), resultCount: 0 }, _count: { id: true } }),
        prisma.internalSearchEvent.groupBy({ by: ['queryHash'], where: { createdAt: countWhere(range.previousFrom, range.previousTo), resultCount: 0 }, _count: { id: true } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'PAGE', date: countWhere(range.from, range.to) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'PAGE', date: countWhere(range.previousFrom, range.previousTo) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'QUERY', date: countWhere(range.from, range.to) } }),
        prisma.technicalMetricSnapshot.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 }),
        prisma.term.count({ where: { status: 'PENDING' } }),
        prisma.term.findFirst({ where: { status: 'PENDING' }, orderBy: { updatedAt: 'asc' }, select: { updatedAt: true } }),
        moderationHours(range.from, range.to), moderationHours(range.previousFrom, range.previousTo),
        prisma.termModerationEvent.groupBy({ by: ['type'], where: { type: { in: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] }, createdAt: countWhere(range.from, range.to) }, _count: { id: true } }),
    ]);
    const searchCount = searches._count.id;
    const previousSearchCount = previousSearches._count.id;
    const organicReturnRate = (rows: typeof visitorTypes) => {
        const organic = rows.filter((row) => row.value.split('::')[2]?.toLowerCase() === 'organic search');
        const returning = organic.filter((row) => row.value.split('::')[1] === 'returning').reduce((sum, row) => sum + row.visits, 0);
        const total = organic.reduce((sum, row) => sum + row.visits, 0);
        return { rate: total ? (returning / total) * 100 : 0, returning, total };
    };
    const organicReturn = organicReturnRate(visitorTypes);
    const previousOrganicReturn = organicReturnRate(previousVisitorTypes);
    const organicVisits = organicChannels.reduce((sum, row) => sum + row.visits, 0);
    const organicVisitors = organicChannels.reduce((sum, row) => sum + row.visitors, 0);
    const previousOrganicVisitors = previousOrganicChannels.reduce((sum, row) => sum + row.visitors, 0);
    const currentMedianModeration = percentile(currentModerationTimes.map((row) => number(row.hours)).filter(Number.isFinite), 0.5);
    const previousMedianModeration = percentile(previousModerationTimes.map((row) => number(row.hours)).filter(Number.isFinite), 0.5);
    const signupConversion = number(traffic._sum.visitors) ? (users / number(traffic._sum.visitors)) * 100 : 0;
    const previousSignupConversion = number(previousTraffic._sum.visitors) ? (previousUsers / number(previousTraffic._sum.visitors)) * 100 : 0;
    const pages = aggregateSeo(pageRows).sort((a, b) => b.clicks - a.clicks);
    const previousPages = new Map(aggregateSeo(previousPageRows).map((row) => [row.key, row]));
    const pageChanges = pages.map((row) => {
        const previousClicks = previousPages.get(row.key)?.clicks || 0;
        return { ...row, previousClicks, changePercent: previousClicks ? ((row.clicks - previousClicks) / previousClicks) * 100 : row.clicks ? 100 : 0 };
    }).filter((row) => row.previousClicks >= 20).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const ctrOpportunities = findSeoOpportunities(aggregateSeo(queryRows), 100);
    const latestTechnical = [...new Map([...technicalSnapshots].reverse().map((item) => [`${item.provider}:${item.kind}:${item.key}:${item.device}`, item])).values()];
    const technicalValue = (kind: string, device = 'ALL') => latestTechnical.find((item) => item.kind === kind && item.device === device)?.value || 0;
    const zeroResultRate = searchCount ? ((searchCount - found) / searchCount) * 100 : 0;
    const previousZeroResultRate = previousSearchCount ? ((previousSearchCount - previousFound) / previousSearchCount) * 100 : 0;
    const zeroResultRanking = buildZeroResultRanking(
        zeroSearches.map((row) => ({ queryHash: row.queryHash, query: row.normalizedQuery, count: row._count.id })),
        previousZeroSearches.map((row) => ({ queryHash: row.queryHash, count: row._count.id })),
    );
    const decisions = Object.fromEntries(decisionRows.map((row) => [row.type, row._count.id]));
    const approved = number(decisions.APPROVED); const rejected = number(decisions.REJECTED);
    const oldestPendingHours = oldestPending ? Math.max(0, (Date.now() - oldestPending.updatedAt.getTime()) / (60 * 60 * 1000)) : 0;
    const attention = buildOverviewAttention({
        providers, technical: { uptimeIncidents: technicalValue('uptime_incidents'), apiP95Ms: technicalValue('request_p95'), mobileLcpMs: technicalValue('lcp', 'MOBILE') },
        searches: { total: searchCount, zeroResultRate, previousZeroResultRate }, pageChanges, ctrOpportunities,
        pending: { count: pendingCount, oldestHours: oldestPendingHours },
    });
    const funnel = buildOverviewFunnel([
        { key: 'organic', label: 'Entrada orgânica', value: organicVisitors },
        { key: 'search', label: 'Busca', value: searchCount }, { key: 'result', label: 'Resultado', value: found },
        { key: 'term', label: 'Termo', value: opened }, { key: 'signup', label: 'Cadastro', value: users },
        { key: 'contribution', label: 'Contribuição', value: contributions },
    ]);
    const generatedAt = new Date().toISOString();
    return {
        generatedAt,
        coreMetrics: {
            organicVisitors: metric(organicVisitors, previousOrganicVisitors),
            searchSuccessRate: metric(searchCount ? (opened / searchCount) * 100 : 0, previousSearchCount ? (previousOpened / previousSearchCount) * 100 : 0),
            organicReturnRate: metric(organicReturn.rate, previousOrganicReturn.rate),
            signupConversionRate: metric(signupConversion, previousSignupConversion),
            contributions: metric(contributions, previousContributions),
            medianModerationHours: metric(currentMedianModeration, previousMedianModeration),
        },
        attention,
        productTrend: productTrend(range, organicChannels, searchSeries, openedSeries),
        funnel,
        rankings: {
            terms: topTerms.map((item) => ({ id: item.id, word: item.word, game: item.game, views: Number(item.views) })),
            zeroResults: zeroResultRanking,
            pages: pageChanges.slice(0, 5),
        },
        communitySummary: {
            pending: pendingCount, approved, rejected, changesRequested: number(decisions.CHANGES_REQUESTED),
            approvalRate: approved + rejected ? (approved / (approved + rejected)) * 100 : 0,
            medianDecisionHours: currentMedianModeration,
        },
        providers,
        metrics: {
            visitors: metric(number(traffic._sum.visitors), number(previousTraffic._sum.visitors)),
            visits: metric(number(traffic._sum.visits), number(previousTraffic._sum.visits)),
            pageviews: metric(number(traffic._sum.pageviews), number(previousTraffic._sum.pageviews)),
            searches: metric(searchCount, previousSearchCount),
            resultRate: metric(searchCount ? (found / searchCount) * 100 : 0, previousSearchCount ? (previousFound / previousSearchCount) * 100 : 0),
            successRate: metric(searchCount ? (opened / searchCount) * 100 : 0, previousSearchCount ? (previousOpened / previousSearchCount) * 100 : 0),
            organicReturnRate: metric(organicReturn.rate, previousOrganicReturn.rate),
            signups: metric(users, previousUsers), contributions: metric(contributions, previousContributions),
        },
        activeUsers: { today: active1, days7: active7, days30: active30 },
        funnels: {
            anonymous: { organicVisits, searches: searchCount, results: found, termsOpened: opened, signups: users, contributions },
        },
        returning: {
            newVisits: number(traffic._sum.newVisits),
            returningVisits: number(traffic._sum.returningVisits),
            organicVisits: organicReturn.total,
            organicReturningVisits: organicReturn.returning,
            estimatedByBrowser: true,
        },
        series: {
            traffic: seriesTraffic.map((item) => ({ date: item.date, visitors: item.visitors, visits: item.visits, pageviews: item.pageviews })),
            searches: searchSeries.map((item) => ({ date: item.date, value: Number(item.count) })),
            signups: signupSeries.map((item) => ({ date: item.date, value: Number(item.count) })),
        },
    };
};

const trafficBreakdown = async (kind: TrafficDimensionKind, range: AnalyticsRange, take = 20) => prisma.trafficDimensionDaily.groupBy({
    by: ['value'], where: { kind, date: countWhere(range.from, range.to) },
    _sum: { visitors: true, visits: true, pageviews: true }, _avg: { bounceRate: true, visitDurationSec: true },
    orderBy: { _sum: { visitors: 'desc' } }, take,
}).then((rows) => rows.map((row) => ({ key: row.value, visitors: number(row._sum.visitors), visits: number(row._sum.visits), pageviews: number(row._sum.pageviews), bounceRate: number(row._avg.bounceRate), visitDurationSec: number(row._avg.visitDurationSec) })));

export const trafficReport = async (range: AnalyticsRange) => {
    const [daily, channels, sources, referrers, landingPages, exitPages, pages, countries, devices, browsers, operatingSystems, campaigns] = await Promise.all([
        prisma.trafficDailyMetric.findMany({ where: { date: countWhere(range.from, range.to) }, orderBy: { date: 'asc' } }),
        trafficBreakdown('CHANNEL', range), trafficBreakdown('SOURCE', range), trafficBreakdown('REFERRER', range),
        trafficBreakdown('ENTRY_PAGE', range), trafficBreakdown('EXIT_PAGE', range), trafficBreakdown('PAGE', range),
        trafficBreakdown('COUNTRY', range), trafficBreakdown('DEVICE', range), trafficBreakdown('BROWSER', range),
        trafficBreakdown('OPERATING_SYSTEM', range), trafficBreakdown('CAMPAIGN', range),
    ]);
    return { daily, channels, sources, referrers, landingPages, exitPages, pages, countries, devices, browsers, operatingSystems, campaigns };
};

export interface SeoAggregate { key: string; clicks: number; impressions: number; ctr: number; position: number; }
export const aggregateSeo = (rows: Array<{ value: string; clicks: number; impressions: number; position: number }>): SeoAggregate[] => {
    const map = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();
    for (const row of rows) {
        const item = map.get(row.value) || { clicks: 0, impressions: 0, weightedPosition: 0 };
        item.clicks += row.clicks; item.impressions += row.impressions; item.weightedPosition += row.position * row.impressions;
        map.set(row.value, item);
    }
    return [...map].map(([key, item]) => ({ key, clicks: item.clicks, impressions: item.impressions, ctr: item.impressions ? item.clicks / item.impressions : 0, position: item.impressions ? item.weightedPosition / item.impressions : 0 }));
};

export const findSeoOpportunities = (queries: SeoAggregate[], minimumImpressions = 100) => {
    const buckets = [[1, 3], [4, 10], [11, 20]] as const;
    const medians = buckets.map(([min, max]) => {
        const values = queries.filter((row) => row.position >= min && row.position <= max).map((row) => row.ctr).sort((a, b) => a - b);
        return { min, max, median: values.length ? values[Math.floor(values.length / 2)] : 0 };
    });
    return queries.filter((row) => row.impressions >= minimumImpressions && row.position >= 1 && row.position <= 20)
        .filter((row) => row.ctr < (medians.find((item) => row.position >= item.min && row.position <= item.max)?.median || 0))
        .sort((a, b) => b.impressions - a.impressions);
};

export const seoReport = async (range: AnalyticsRange) => {
    const [daily, queryRows, pageRows, previousPageRows, devices, countries, inspections] = await Promise.all([
        prisma.searchConsoleDailyMetric.findMany({ where: { date: countWhere(range.from, range.to) }, orderBy: { date: 'asc' } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'QUERY', date: countWhere(range.from, range.to) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'PAGE', date: countWhere(range.from, range.to) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'PAGE', date: countWhere(range.previousFrom, range.previousTo) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'DEVICE', date: countWhere(range.from, range.to) } }),
        prisma.searchConsoleDimensionDaily.findMany({ where: { kind: 'COUNTRY', date: countWhere(range.from, range.to) } }),
        prisma.urlInspectionSnapshot.findMany({ orderBy: { inspectedAt: 'desc' }, take: 500 }),
    ]);
    const queries = aggregateSeo(queryRows).sort((a, b) => b.clicks - a.clicks);
    const pages = aggregateSeo(pageRows).sort((a, b) => b.clicks - a.clicks);
    const previous = new Map(aggregateSeo(previousPageRows).map((row) => [row.key, row]));
    const pageChanges = pages.map((row) => {
        const before = previous.get(row.key)?.clicks || 0;
        return { ...row, previousClicks: before, changePercent: before ? ((row.clicks - before) / before) * 100 : row.clicks ? 100 : 0 };
    }).filter((row) => row.previousClicks >= 20).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const opportunities = findSeoOpportunities(queries);
    const latestInspections = [...new Map(inspections.map((item) => [item.url, item])).values()];
    const totals = daily.reduce((sum, row) => ({ clicks: sum.clicks + row.clicks, impressions: sum.impressions + row.impressions, weighted: sum.weighted + row.position * row.impressions }), { clicks: 0, impressions: 0, weighted: 0 });
    return { daily, totals: { clicks: totals.clicks, impressions: totals.impressions, ctr: totals.impressions ? totals.clicks / totals.impressions : 0, position: totals.impressions ? totals.weighted / totals.impressions : 0 }, queries: queries.slice(0, 100), pages: pages.slice(0, 100), devices: aggregateSeo(devices), countries: aggregateSeo(countries).slice(0, 30), pageChanges: pageChanges.slice(0, 40), opportunities: opportunities.slice(0, 40), inspections: latestInspections.slice(0, 200) };
};

export const dictionaryReport = async (range: AnalyticsRange) => {
    const [searches, origins, termViews, gameSearches, votes, reports, events, tags, letters, sorts] = await Promise.all([
        prisma.internalSearchEvent.groupBy({ by: ['queryHash', 'normalizedQuery'], where: { createdAt: countWhere(range.from, range.to) }, _count: { id: true }, _sum: { resultCount: true } }),
        prisma.internalSearchEvent.groupBy({ by: ['origin'], where: { createdAt: countWhere(range.from, range.to) }, _count: { id: true } }),
        prisma.termView.groupBy({ by: ['termId'], where: { createdAt: countWhere(range.from, range.to) }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 50 }),
        prisma.internalSearchEvent.groupBy({ by: ['gameId'], where: { createdAt: countWhere(range.from, range.to), gameId: { not: null } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 30 }),
        prisma.termVote.count({ where: { createdAt: countWhere(range.from, range.to) } }),
        prisma.report.count({ where: { createdAt: countWhere(range.from, range.to) } }),
        trafficBreakdown('EVENT', range, 100),
        prisma.internalSearchEvent.groupBy({ by: ['tag'], where: { createdAt: countWhere(range.from, range.to), tag: { not: null } }, _count: { id: true } }),
        prisma.internalSearchEvent.groupBy({ by: ['letter'], where: { createdAt: countWhere(range.from, range.to), letter: { not: null } }, _count: { id: true } }),
        prisma.internalSearchEvent.groupBy({ by: ['sort'], where: { createdAt: countWhere(range.from, range.to), sort: { not: null } }, _count: { id: true } }),
    ]);
    const [terms, games, total, found, opened] = await Promise.all([
        prisma.term.findMany({ where: { id: { in: termViews.map((row) => row.termId) }, status: 'APPROVED', archivedAt: null }, select: { id: true, word: true, game: { select: { name: true } } } }),
        prisma.game.findMany({ where: { id: { in: gameSearches.map((row) => row.gameId!).filter(Boolean) } }, select: { id: true, name: true } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.from, range.to) } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.from, range.to), resultCount: { gt: 0 } } }),
        prisma.internalSearchEvent.count({ where: { createdAt: countWhere(range.from, range.to), openedAt: { not: null } } }),
    ]);
    const termMap = new Map(terms.map((item) => [item.id, item]));
    const gameMap = new Map(games.map((item) => [item.id, item.name]));
    const eligible = searches.filter((row) => row.normalizedQuery && row._count.id >= 3).map((row) => ({ query: row.normalizedQuery!, count: row._count.id, averageResults: row._count.id ? number(row._sum.resultCount) / row._count.id : 0 }));
    return {
        totals: { searches: total, resultRate: total ? (found / total) * 100 : 0, successRate: total ? (opened / total) * 100 : 0, votes, reports },
        topQueries: eligible.sort((a, b) => b.count - a.count).slice(0, 50),
        zeroResults: eligible.filter((item) => item.averageResults === 0).sort((a, b) => b.count - a.count).slice(0, 50),
        origins: origins.map((row) => ({ key: row.origin, value: row._count.id })),
        terms: termViews.filter((row) => termMap.has(row.termId)).map((row) => ({ id: row.termId, word: termMap.get(row.termId)!.word, game: termMap.get(row.termId)?.game?.name || null, views: row._count.id })),
        games: gameSearches.map((row) => ({ id: row.gameId, name: gameMap.get(row.gameId || '') || 'Jogo removido', searches: row._count.id })),
        filters: [
            ...tags.map((row) => ({ key: `tag:${row.tag}`, value: row._count.id })),
            ...letters.map((row) => ({ key: `letra:${row.letter}`, value: row._count.id })),
            ...sorts.map((row) => ({ key: `ordem:${row.sort}`, value: row._count.id })),
        ].sort((a, b) => b.value - a.value),
        events,
    };
};

export const communityReport = async (range: AnalyticsRange) => {
    const [statusRows, contributors, rejectionRows, decided, topContributors, comments, notifications, favoriteGames, moderationTimes] = await Promise.all([
        prisma.term.groupBy({ by: ['status'], where: { authorId: { not: null }, createdAt: countWhere(range.from, range.to) }, _count: { id: true } }),
        prisma.term.groupBy({ by: ['authorId'], where: { authorId: { not: null }, createdAt: countWhere(range.from, range.to) } }),
        prisma.termModerationEvent.groupBy({ by: ['rejectionReason'], where: { type: 'REJECTED', createdAt: countWhere(range.from, range.to) }, _count: { id: true } }),
        prisma.termModerationEvent.aggregate({ where: { type: { in: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] }, createdAt: countWhere(range.from, range.to) }, _count: { id: true }, _avg: { revision: true } }),
        prisma.term.groupBy({ by: ['authorId'], where: { authorId: { not: null }, createdAt: countWhere(range.from, range.to) }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 }),
        prisma.comment.count({ where: { createdAt: countWhere(range.from, range.to) } }),
        prisma.notification.aggregate({ where: { createdAt: countWhere(range.from, range.to) }, _count: { id: true, readAt: true, clickedAt: true } }),
        prisma.user.count({ where: { favoriteGameId: { not: null } } }),
        prisma.$queryRaw<Array<{ hours: number }>>(Prisma.sql`
            SELECT EXTRACT(EPOCH FROM (MIN(e."createdAt") - t."createdAt")) / 3600 AS hours
            FROM "Term" t JOIN "TermModerationEvent" e ON e."termId" = t.id
            WHERE t."authorId" IS NOT NULL AND e.type IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
              AND e."createdAt" BETWEEN ${range.from} AND ${range.to}
            GROUP BY t.id, t."createdAt" HAVING MIN(e."createdAt") >= t."createdAt"`),
    ]);
    const authorIds = topContributors.map((item) => item.authorId!).filter(Boolean);
    const authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } });
    const authorMap = new Map(authors.map((item) => [item.id, item.name]));
    const status = Object.fromEntries(statusRows.map((row) => [row.status, row._count.id]));
    const approved = number(status.APPROVED); const rejected = number(status.REJECTED);
    const hours = moderationTimes.map((row) => Number(row.hours)).filter(Number.isFinite);
    const retention = await prisma.$queryRaw<Array<{ cohort: bigint; d7: bigint; d30: bigint }>>(Prisma.sql`
        SELECT COUNT(*) cohort,
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "UserActivityDay" a WHERE a."userId" = u.id AND a.date > DATE(u."createdAt") AND a.date <= DATE(u."createdAt") + 7)) d7,
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "UserActivityDay" a WHERE a."userId" = u.id AND a.date > DATE(u."createdAt") AND a.date <= DATE(u."createdAt") + 30)) d30
        FROM "User" u WHERE u."createdAt" BETWEEN ${range.from} AND ${range.to}`);
    const cohort = Number(retention[0]?.cohort || 0);
    return {
        statuses: status, contributors: contributors.length,
        approvalRate: approved + rejected ? (approved / (approved + rejected)) * 100 : 0,
        moderation: { medianHours: percentile(hours, 0.5), p95Hours: percentile(hours, 0.95), averageRevisions: number(decided._avg.revision), decisions: decided._count.id },
        rejectionReasons: rejectionRows.map((row) => ({ key: row.rejectionReason || 'OTHER', value: row._count.id })),
        topContributors: topContributors.map((row) => ({ id: row.authorId, name: authorMap.get(row.authorId || '') || 'Conta removida', contributions: row._count.id })),
        engagement: { newsComments: comments, notifications: notifications._count.id, notificationsRead: notifications._count.readAt, notificationsClicked: notifications._count.clickedAt, favoriteGameProfiles: favoriteGames },
        retention: { cohort, d7: cohort ? Number(retention[0]?.d7 || 0) / cohort * 100 : 0, d30: cohort ? Number(retention[0]?.d30 || 0) / cohort * 100 : 0 },
        funnel: { accounts: cohort, firstContribution: contributors.length, decisions: decided._count.id, retainedD7: Number(retention[0]?.d7 || 0), retainedD30: Number(retention[0]?.d30 || 0) },
    };
};

export const qualityReport = async (range: AnalyticsRange) => {
    const snapshots = await prisma.technicalMetricSnapshot.findMany({ where: { date: countWhere(range.from, range.to) }, orderBy: [{ date: 'asc' }, { updatedAt: 'asc' }] });
    const latest = [...new Map([...snapshots].reverse().map((item) => [`${item.provider}:${item.kind}:${item.key}:${item.device}`, item])).values()];
    return { snapshots, latest };
};
