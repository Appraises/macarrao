import { Prisma, TrafficDimensionKind } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ANALYTICS_EVENT_RETENTION_DAYS, ANALYTICS_VISITOR_RETENTION_DAYS } from '../../utils/config';

const DAY = 24 * 60 * 60 * 1000;
const dateOnly = (value: Date) => new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
const dateValue = (value: unknown) => value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

type AggregateRow = {
    date: Date | string;
    value?: string;
    visitors: bigint | number;
    visits: bigint | number;
    pageviews: bigint | number;
    bounceRate?: number | null;
    visitDurationSec?: number | null;
    newVisits?: bigint | number;
    returningVisits?: bigint | number;
};

const asNumber = (value: unknown) => Number(value || 0);
const between = (from: Date, to: Date) => Prisma.sql`
    "occurredAt" >= ${from} AND "occurredAt" <= ${to}
`;

const rollupTraffic = async (from: Date, to: Date) => {
    const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
        WITH pageviews AS (
            SELECT
                DATE("occurredAt") AS date,
                "visitorHash",
                "sessionHash",
                "occurredAt"
            FROM "AnalyticsEvent"
            WHERE "eventName" = 'PAGE_VIEW' AND ${between(from, to)}
        ), sessions AS (
            SELECT "sessionHash", DATE("occurredAt") AS date,
                MIN("occurredAt") AS first_at, MAX("occurredAt") AS last_at,
                COUNT(*) AS page_count
            FROM pageviews
            GROUP BY "sessionHash", DATE("occurredAt")
        ), daily_session_stats AS (
            SELECT date,
                COALESCE(AVG(CASE WHEN page_count = 1 THEN 100 ELSE 0 END), 0)::float AS "bounceRate",
                COALESCE(AVG(EXTRACT(EPOCH FROM (last_at - first_at))), 0)::float AS "visitDurationSec"
            FROM sessions
            GROUP BY date
        )
        SELECT
            p.date,
            COUNT(DISTINCT p."visitorHash")::int AS visitors,
            COUNT(DISTINCT p."sessionHash")::int AS visits,
            COUNT(*)::int AS pageviews,
            s."bounceRate",
            s."visitDurationSec",
            COUNT(DISTINCT CASE WHEN v."firstSeenAt"::date = p.date THEN p."visitorHash" END)::int AS "newVisits",
            COUNT(DISTINCT CASE WHEN v."firstSeenAt"::date < p.date THEN p."visitorHash" END)::int AS "returningVisits"
        FROM pageviews p
        JOIN daily_session_stats s ON s.date = p.date
        LEFT JOIN "AnalyticsVisitor" v ON v."visitorHash" = p."visitorHash"
        GROUP BY p.date, s."bounceRate", s."visitDurationSec"
        ORDER BY p.date ASC
    `);

    await prisma.trafficDailyMetric.deleteMany({ where: { date: { gte: dateOnly(from), lte: dateOnly(to) } } });
    if (rows.length) {
        await prisma.trafficDailyMetric.createMany({
            data: rows.map((row) => ({
                date: dateValue(row.date),
                visitors: asNumber(row.visitors),
                visits: asNumber(row.visits),
                pageviews: asNumber(row.pageviews),
                bounceRate: Number(row.bounceRate || 0),
                visitDurationSec: Number(row.visitDurationSec || 0),
                newVisits: asNumber(row.newVisits),
                returningVisits: asNumber(row.returningVisits),
            })),
        });
    }
    return rows.length;
};

const dimensionColumns: Array<{ kind: TrafficDimensionKind; column: string }> = [
    { kind: 'CHANNEL', column: 'channel' },
    { kind: 'SOURCE', column: 'source' },
    { kind: 'REFERRER', column: 'referrer' },
    { kind: 'PAGE', column: 'path' },
    { kind: 'DEVICE', column: 'device' },
    { kind: 'BROWSER', column: 'browser' },
    { kind: 'OPERATING_SYSTEM', column: 'operatingSystem' },
    { kind: 'CAMPAIGN', column: 'campaign' },
];

const rollupDimension = async (from: Date, to: Date, definition: { kind: TrafficDimensionKind; column: string }) => {
    const column = Prisma.raw(`"${definition.column}"`);
    const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
        SELECT DATE("occurredAt") AS date,
            COALESCE(NULLIF(${column}, ''), '(direto)') AS value,
            COUNT(DISTINCT "visitorHash")::int AS visitors,
            COUNT(DISTINCT "sessionHash")::int AS visits,
            COUNT(*)::int AS pageviews
        FROM "AnalyticsEvent"
        WHERE "eventName" = 'PAGE_VIEW' AND ${between(from, to)}
        GROUP BY DATE("occurredAt"), COALESCE(NULLIF(${column}, ''), '(direto)')
        ORDER BY DATE("occurredAt"), value
    `);

    await prisma.trafficDimensionDaily.deleteMany({ where: { date: { gte: dateOnly(from), lte: dateOnly(to) }, kind: definition.kind } });
    if (rows.length) {
        await prisma.trafficDimensionDaily.createMany({
            data: rows.map((row) => ({
                date: dateValue(row.date),
                kind: definition.kind,
                value: String(row.value || '(direto)').slice(0, 500),
                visitors: asNumber(row.visitors),
                visits: asNumber(row.visits),
                pageviews: asNumber(row.pageviews),
            })),
        });
    }
    return rows.length;
};

const rollupEntryExit = async (from: Date, to: Date) => {
    let processed = 0;
    for (const [kind, order] of [['ENTRY_PAGE', 'ASC'], ['EXIT_PAGE', 'DESC']] as const) {
        const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
            WITH ranked AS (
                SELECT DATE("occurredAt") AS date, "visitorHash", "sessionHash", "path",
                    ROW_NUMBER() OVER (PARTITION BY DATE("occurredAt"), "sessionHash" ORDER BY "occurredAt" ${Prisma.raw(order)}) AS rank
                FROM "AnalyticsEvent"
                WHERE "eventName" = 'PAGE_VIEW' AND ${between(from, to)}
            )
            SELECT date, COALESCE(NULLIF(path, ''), '/') AS value,
                COUNT(DISTINCT "visitorHash")::int AS visitors,
                COUNT(DISTINCT "sessionHash")::int AS visits,
                COUNT(*)::int AS pageviews
            FROM ranked WHERE rank = 1
            GROUP BY date, COALESCE(NULLIF(path, ''), '/')
            ORDER BY date, value
        `);
        await prisma.trafficDimensionDaily.deleteMany({ where: { date: { gte: dateOnly(from), lte: dateOnly(to) }, kind } });
        if (rows.length) {
            await prisma.trafficDimensionDaily.createMany({
                data: rows.map((row) => ({
                    date: dateValue(row.date), kind,
                    value: String(row.value || '/').slice(0, 500),
                    visitors: asNumber(row.visitors), visits: asNumber(row.visits), pageviews: asNumber(row.pageviews),
                })),
            });
        }
        processed += rows.length;
    }
    return processed;
};

const rollupEvents = async (from: Date, to: Date) => {
    const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
        SELECT DATE("occurredAt") AS date, "eventName" AS value,
            COUNT(DISTINCT "visitorHash")::int AS visitors,
            COUNT(DISTINCT "sessionHash")::int AS visits,
            COUNT(*)::int AS pageviews
        FROM "AnalyticsEvent"
        WHERE "eventName" <> 'PAGE_VIEW' AND ${between(from, to)}
        GROUP BY DATE("occurredAt"), "eventName"
        ORDER BY DATE("occurredAt"), value
    `);
    await prisma.trafficDimensionDaily.deleteMany({ where: { date: { gte: dateOnly(from), lte: dateOnly(to) }, kind: 'EVENT' } });
    if (rows.length) {
        await prisma.trafficDimensionDaily.createMany({
            data: rows.map((row) => ({
                date: dateValue(row.date), kind: 'EVENT',
                value: String(row.value || '(evento)').slice(0, 500),
                visitors: asNumber(row.visitors), visits: asNumber(row.visits), pageviews: 0,
            })),
        });
    }
    return rows.length;
};

export const syncLocalAnalytics = async (from: Date, to: Date) => {
    // Sequential on purpose: each rollup scans the raw events of the whole
    // window, and running them all at once would take most of the API's
    // connection pool every 15 minutes.
    const daily = await rollupTraffic(from, to);
    const dimensions: number[] = [];
    for (const definition of dimensionColumns) dimensions.push(await rollupDimension(from, to, definition));
    dimensions.push(await rollupEntryExit(from, to));
    dimensions.push(await rollupEvents(from, to));

    const eventCutoff = new Date(Date.now() - ANALYTICS_EVENT_RETENTION_DAYS * DAY);
    const visitorCutoff = new Date(Date.now() - ANALYTICS_VISITOR_RETENTION_DAYS * DAY);
    await prisma.analyticsEvent.deleteMany({ where: { occurredAt: { lt: eventCutoff } } });
    await prisma.analyticsVisitor.deleteMany({ where: { lastSeenAt: { lt: visitorCutoff } } });

    return { rows: daily + dimensions.reduce((sum, value) => sum + value, 0), warnings: [] as string[] };
};
