import { AnalyticsProvider } from '@prisma/client';
import { Router } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { writeAuditLog } from '../../services/audit';
import {
    analyticsStatus,
    communityReport,
    dictionaryReport,
    overviewReport,
    parseAnalyticsRange,
    qualityReport,
    seoReport,
    trafficReport,
} from '../../services/analytics/reporting';
import { runAnalyticsSync } from '../../services/analytics/sync';

const router = Router();
const providers = Object.values(AnalyticsProvider);

const withRange = (handler: (range: Exclude<ReturnType<typeof parseAnalyticsRange>, { error: string }>) => Promise<unknown>) => async (req: any, res: any) => {
    const range = parseAnalyticsRange(req.query);
    if ('error' in range) return res.status(400).json({ error: range.error });
    try {
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.json(await handler(range));
    } catch (error) {
        console.error('[analytics] Failed to build report:', error);
        res.status(500).json({ error: 'Falha ao montar o relatorio de analytics.' });
    }
};

router.get('/status', async (_req, res) => {
    try { res.json(await analyticsStatus()); }
    catch { res.status(500).json({ error: 'Falha ao consultar os provedores.' }); }
});
router.get('/overview', withRange(overviewReport));
router.get('/traffic', withRange(trafficReport));
router.get('/seo', withRange(seoReport));
router.get('/dictionary', withRange(dictionaryReport));
router.get('/community', withRange(communityReport));
router.get('/quality', withRange(qualityReport));

router.get('/export.csv', async (req, res) => {
    const range = parseAnalyticsRange(req.query);
    if ('error' in range) return res.status(400).json({ error: range.error });
    const section = typeof req.query.section === 'string' ? req.query.section : 'dictionary';
    let rows: any[] = [];
    if (section === 'overview') {
        const report = await overviewReport(range);
        rows = Object.entries(report.metrics).map(([name, value]) => ({ metric: name, ...value }));
    } else if (section === 'seo') rows = (await seoReport(range)).queries;
    else if (section === 'traffic') rows = (await trafficReport(range)).pages;
    else if (section === 'community') rows = (await communityReport(range)).topContributors;
    else if (section === 'quality') rows = (await qualityReport(range)).latest;
    else if (section === 'dictionary') rows = (await dictionaryReport(range)).topQueries;
    else return res.status(400).json({ error: 'Secao invalida.' });
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${section}.csv"`);
    res.send(`\ufeff${csv}`);
});

router.post('/sync', async (req: AuthRequest, res) => {
    const requested = typeof req.body?.provider === 'string' ? req.body.provider.toUpperCase() : 'ALL';
    if (requested !== 'ALL' && !providers.includes(requested as AnalyticsProvider)) {
        return res.status(400).json({ error: 'Provedor invalido.' });
    }
    const selected = requested === 'ALL' ? providers : [requested as AnalyticsProvider];
    const recent = await prisma.analyticsSyncRun.findFirst({
        where: { trigger: 'MANUAL', provider: { in: selected }, startedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
        orderBy: { startedAt: 'desc' },
    });
    if (recent) return res.status(429).json({ error: 'Aguarde cinco minutos antes de sincronizar novamente.' });
    await writeAuditLog({ actorId: req.user?.id, action: 'SYNC', entityType: 'Analytics', entityId: requested, metadata: { providers: selected } });
    for (const provider of selected) {
        void runAnalyticsSync(provider, 'MANUAL', req.user?.id).catch((error) => console.error(`[analytics] Manual ${provider} sync failed:`, error));
    }
    res.status(202).json({ accepted: true, providers: selected });
});

export default router;
