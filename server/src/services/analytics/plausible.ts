import axios from 'axios';
import { TrafficDimensionKind } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { PLAUSIBLE_SITE_ID, PLAUSIBLE_STATS_API_KEY, PLAUSIBLE_STATS_API_URL } from '../../utils/config';

interface PlausibleRow { dimensions: string[]; metrics: Array<number | null>; }
interface PlausibleResponse { results?: PlausibleRow[]; }

const dateText = (value: Date) => value.toISOString().slice(0, 10);
const dateValue = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

const queryPlausible = async (query: Record<string, unknown>) => {
    const response = await axios.post<PlausibleResponse>(PLAUSIBLE_STATS_API_URL, {
        site_id: PLAUSIBLE_SITE_ID,
        ...query,
    }, {
        headers: { Authorization: `Bearer ${PLAUSIBLE_STATS_API_KEY}` },
        timeout: 20_000,
    });
    return response.data.results || [];
};

const dimensionQueries: Array<{
    kind: TrafficDimensionKind;
    dimension: string;
    metrics: string[];
}> = [
    { kind: 'CHANNEL', dimension: 'visit:channel', metrics: ['visitors', 'visits', 'bounce_rate', 'visit_duration'] },
    { kind: 'SOURCE', dimension: 'visit:source', metrics: ['visitors', 'visits', 'bounce_rate', 'visit_duration'] },
    { kind: 'REFERRER', dimension: 'visit:referrer', metrics: ['visitors', 'visits'] },
    { kind: 'ENTRY_PAGE', dimension: 'visit:entry_page', metrics: ['visitors', 'visits', 'bounce_rate', 'visit_duration'] },
    { kind: 'EXIT_PAGE', dimension: 'visit:exit_page', metrics: ['visitors', 'visits'] },
    { kind: 'PAGE', dimension: 'event:page', metrics: ['visitors', 'pageviews'] },
    { kind: 'COUNTRY', dimension: 'visit:country_name', metrics: ['visitors', 'visits'] },
    { kind: 'DEVICE', dimension: 'visit:device', metrics: ['visitors', 'visits'] },
    { kind: 'BROWSER', dimension: 'visit:browser', metrics: ['visitors', 'visits'] },
    { kind: 'OPERATING_SYSTEM', dimension: 'visit:os', metrics: ['visitors', 'visits'] },
    { kind: 'CAMPAIGN', dimension: 'visit:utm_campaign', metrics: ['visitors', 'visits'] },
];

const metricAt = (row: PlausibleRow, metrics: string[], name: string) => {
    const index = metrics.indexOf(name);
    return index >= 0 ? Number(row.metrics[index] || 0) : 0;
};

export const plausibleConfigured = () => Boolean(PLAUSIBLE_SITE_ID && PLAUSIBLE_STATS_API_KEY);

export const syncPlausible = async (from: Date, to: Date) => {
    if (!plausibleConfigured()) return { rows: 0, warnings: ['Plausible nao configurado.'] };
    const dateRange = [dateText(from), dateText(to)];
    let processed = 0;
    const warnings: string[] = [];

    const dailyMetrics = ['visitors', 'visits', 'pageviews', 'bounce_rate', 'visit_duration'];
    const dailyRows = await queryPlausible({ metrics: dailyMetrics, dimensions: ['time:day'], date_range: dateRange });
    for (const row of dailyRows) {
        await prisma.trafficDailyMetric.upsert({
            where: { date: dateValue(row.dimensions[0]) },
            create: {
                date: dateValue(row.dimensions[0]),
                visitors: metricAt(row, dailyMetrics, 'visitors'),
                visits: metricAt(row, dailyMetrics, 'visits'),
                pageviews: metricAt(row, dailyMetrics, 'pageviews'),
                bounceRate: metricAt(row, dailyMetrics, 'bounce_rate'),
                visitDurationSec: metricAt(row, dailyMetrics, 'visit_duration'),
            },
            update: {
                visitors: metricAt(row, dailyMetrics, 'visitors'),
                visits: metricAt(row, dailyMetrics, 'visits'),
                pageviews: metricAt(row, dailyMetrics, 'pageviews'),
                bounceRate: metricAt(row, dailyMetrics, 'bounce_rate'),
                visitDurationSec: metricAt(row, dailyMetrics, 'visit_duration'),
            },
        });
        processed += 1;
    }

    for (const definition of dimensionQueries) {
        try {
            const rows = await queryPlausible({
                metrics: definition.metrics,
                dimensions: ['time:day', definition.dimension],
                date_range: dateRange,
                pagination: { limit: 10000, offset: 0 },
            });
            await prisma.trafficDimensionDaily.deleteMany({
                where: { date: { gte: from, lte: to }, kind: definition.kind },
            });
            if (rows.length) {
                await prisma.trafficDimensionDaily.createMany({
                    data: rows.map((row) => ({
                        date: dateValue(row.dimensions[0]),
                        kind: definition.kind,
                        value: String(row.dimensions[1] || '(desconhecido)').slice(0, 500),
                        visitors: metricAt(row, definition.metrics, 'visitors'),
                        visits: metricAt(row, definition.metrics, 'visits'),
                        pageviews: metricAt(row, definition.metrics, 'pageviews'),
                        bounceRate: definition.metrics.includes('bounce_rate') ? metricAt(row, definition.metrics, 'bounce_rate') : null,
                        visitDurationSec: definition.metrics.includes('visit_duration') ? metricAt(row, definition.metrics, 'visit_duration') : null,
                    })),
                });
            }
            processed += rows.length;
        } catch (error) {
            warnings.push(`Falha ao sincronizar ${definition.kind}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
    }

    try {
        const rows = await queryPlausible({
            metrics: ['events', 'visitors'],
            dimensions: ['time:day', 'event:goal'],
            date_range: dateRange,
        });
        await prisma.trafficDimensionDaily.deleteMany({ where: { date: { gte: from, lte: to }, kind: 'EVENT' } });
        if (rows.length) {
            await prisma.trafficDimensionDaily.createMany({
                data: rows.map((row) => ({
                    date: dateValue(row.dimensions[0]), kind: 'EVENT', value: String(row.dimensions[1] || '(evento)').slice(0, 500),
                    visitors: Number(row.metrics[1] || 0), visits: Number(row.metrics[0] || 0), pageviews: 0,
                })),
            });
        }
        processed += rows.length;
    } catch (error) {
        warnings.push(`Eventos Plausible indisponiveis: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    try {
        const rows = await queryPlausible({
            metrics: ['events'],
            dimensions: ['time:day', 'event:props:visitor_type', 'visit:channel'],
            filters: [['is', 'event:goal', ['Visit Classified']]],
            date_range: dateRange,
            pagination: { limit: 10000, offset: 0 },
        });
        const daily = new Map<string, { newVisits: number; returningVisits: number }>();
        const dimensions = rows.map((row) => {
            const date = row.dimensions[0];
            const visitorType = String(row.dimensions[1] || 'unknown').toLowerCase();
            const channel = String(row.dimensions[2] || '(desconhecido)');
            const events = Number(row.metrics[0] || 0);
            const totals = daily.get(date) || { newVisits: 0, returningVisits: 0 };
            if (visitorType === 'new') totals.newVisits += events;
            if (visitorType === 'returning') totals.returningVisits += events;
            daily.set(date, totals);
            return {
                date: dateValue(date),
                kind: 'EVENT' as const,
                value: `VISITOR_TYPE::${visitorType}::${channel}`.slice(0, 500),
                visitors: events,
                visits: events,
                pageviews: 0,
            };
        });
        if (dimensions.length) await prisma.trafficDimensionDaily.createMany({ data: dimensions, skipDuplicates: true });
        for (const [date, totals] of daily) {
            await prisma.trafficDailyMetric.upsert({
                where: { date: dateValue(date) },
                create: { date: dateValue(date), ...totals },
                update: totals,
            });
        }
        processed += rows.length;
    } catch (error) {
        warnings.push(`Classificacao de visitas indisponivel: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
    }

    return { rows: processed, warnings };
};
