import { AnalyticsProvider, AnalyticsSyncStatus, AnalyticsSyncTrigger, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ANALYTICS_SYNC_ENABLED } from '../../utils/config';
import { redactExpiredSearchText } from './search';
import { plausibleConfigured, syncPlausible } from './plausible';
import { searchConsoleConfigured, syncSearchConsole, syncUrlInspections } from './searchConsole';
import { qualityConfigured, sentryConfigured, syncCrux, syncPageSpeed, syncSentry } from './quality';

const DAY = 24 * 60 * 60 * 1000;
const startOfUtcDate = (value: Date) => new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
const daysAgo = (days: number) => startOfUtcDate(new Date(Date.now() - days * DAY));

export const analyticsProviderConfigured = (provider: AnalyticsProvider) => {
    if (provider === 'PLAUSIBLE') return plausibleConfigured();
    if (provider === 'SEARCH_CONSOLE') return searchConsoleConfigured();
    if (provider === 'SENTRY') return sentryConfigured();
    return qualityConfigured();
};

const providerRunner = async (provider: AnalyticsProvider) => {
    if (provider === 'PLAUSIBLE') return syncPlausible(daysAgo(7), daysAgo(0));
    if (provider === 'SEARCH_CONSOLE') {
        const metrics = await syncSearchConsole(daysAgo(9), daysAgo(2));
        const inspections = await syncUrlInspections();
        return { rows: metrics.rows + inspections.rows, warnings: [...metrics.warnings, ...inspections.warnings] };
    }
    if (provider === 'SENTRY') return syncSentry(daysAgo(1), daysAgo(0));
    if (provider === 'CRUX') return syncCrux();
    return syncPageSpeed();
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const withRetry = async <T>(operation: () => Promise<T>, attempts = 3): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) await wait(1000 * (4 ** attempt));
        }
    }
    throw lastError;
};

const executeAnalyticsSync = async (provider: AnalyticsProvider, trigger: AnalyticsSyncTrigger, actorId?: string) => {
    await prisma.analyticsSyncRun.updateMany({
        where: { provider, status: 'RUNNING', startedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        data: { status: 'FAILED', finishedAt: new Date(), error: 'Sincronizacao interrompida por timeout.' },
    });
    let run;
    try {
        run = await prisma.analyticsSyncRun.create({
            data: { provider, trigger, actorId: actorId || null, rangeStart: daysAgo(provider === 'SEARCH_CONSOLE' ? 9 : 7), rangeEnd: daysAgo(provider === 'SEARCH_CONSOLE' ? 2 : 0) },
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { skipped: true, reason: 'Ja existe uma sincronizacao em andamento.' };
        }
        throw error;
    }
    if (!analyticsProviderConfigured(provider)) {
        await prisma.analyticsSyncRun.update({ where: { id: run.id }, data: { status: 'SKIPPED', finishedAt: new Date(), error: 'Provedor nao configurado.' } });
        return { skipped: true, reason: 'Provedor nao configurado.' };
    }
    try {
        const result = await withRetry(() => providerRunner(provider));
        const status: AnalyticsSyncStatus = result.warnings.length ? 'PARTIAL' : 'SUCCEEDED';
        await prisma.analyticsSyncRun.update({
            where: { id: run.id },
            data: { status, rowsProcessed: result.rows, finishedAt: new Date(), error: result.warnings.length ? result.warnings.join(' | ').slice(0, 1000) : null },
        });
        return { skipped: false, status, ...result };
    } catch (error) {
        const message = (error instanceof Error ? error.message : 'Erro desconhecido').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 1000);
        await prisma.analyticsSyncRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), error: message } });
        throw error;
    }
};

export const runAnalyticsSync = async (provider: AnalyticsProvider, trigger: AnalyticsSyncTrigger = 'SCHEDULED', actorId?: string) => prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
        SELECT pg_try_advisory_xact_lock(hashtext(${`dicionario-gamer:analytics:${provider}`})) AS locked
    `);
    if (!lock?.locked) return { skipped: true, reason: 'Ja existe uma sincronizacao em andamento.' };
    return executeAnalyticsSync(provider, trigger, actorId);
}, { maxWait: 5_000, timeout: 15 * 60 * 1000 });

const scheduleState = new Map<string, string>();
const timeParts = () => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date()).map((part) => [part.type, part.value]));

const runOnce = (key: string, period: string, providers: AnalyticsProvider[]) => {
    if (scheduleState.get(key) === period) return;
    scheduleState.set(key, period);
    for (const provider of providers) void runAnalyticsSync(provider).catch((error) => console.error(`[analytics] ${provider} sync failed:`, error));
};

const schedulerTick = () => {
    const parts = timeParts();
    const day = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = Number(parts.hour || 0);
    const quarter = `${day}-${parts.hour}-${Math.floor(new Date().getMinutes() / 15)}`;
    runOnce('sentry', quarter, ['SENTRY']);
    runOnce('plausible', `${day}-${parts.hour}`, ['PLAUSIBLE']);
    if (hour === 5) runOnce('search-console', day, ['SEARCH_CONSOLE']);
    if (hour === 6 && parts.weekday === 'Mon') runOnce('quality', day, ['CRUX', 'PAGESPEED']);
    if (hour === 4 && scheduleState.get('retention') !== day) {
        scheduleState.set('retention', day);
        void redactExpiredSearchText().catch((error) => console.error('[analytics] Search retention cleanup failed:', error));
    }
};

export const startAnalyticsScheduler = () => {
    if (!ANALYTICS_SYNC_ENABLED) {
        console.info('[analytics] Scheduler disabled. Set ANALYTICS_SYNC_ENABLED=true to enable it.');
        return;
    }
    setTimeout(schedulerTick, 10_000);
    setInterval(schedulerTick, 15 * 60 * 1000);
};
