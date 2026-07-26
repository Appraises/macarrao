import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { SearchConsoleDimensionKind, TermStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { APP_URL, GOOGLE_SEARCH_CONSOLE_SITE_URL, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 } from '../../utils/config';

interface SearchRow { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number; }

const dateText = (value: Date) => value.toISOString().slice(0, 10);
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

const credentials = () => {
    if (!GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) return null;
    return JSON.parse(Buffer.from(GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8'));
};

const accessToken = async () => {
    const parsed = credentials();
    if (!parsed) throw new Error('Credenciais Google nao configuradas.');
    const auth = new GoogleAuth({ credentials: parsed, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error('Google nao retornou um access token.');
    return token.token;
};

const querySearchAnalytics = async (token: string, from: Date, to: Date, dimensions: string[]) => {
    const rows: SearchRow[] = [];
    let startRow = 0;
    do {
        const response = await axios.post(
            `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GOOGLE_SEARCH_CONSOLE_SITE_URL)}/searchAnalytics/query`,
            { startDate: dateText(from), endDate: dateText(to), dimensions, rowLimit: 25000, startRow, dataState: 'all' },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 },
        );
        const page = (response.data.rows || []) as SearchRow[];
        rows.push(...page);
        if (page.length < 25000) break;
        startRow += page.length;
    } while (startRow < 100000);
    return rows;
};

export const searchConsoleConfigured = () => Boolean(GOOGLE_SEARCH_CONSOLE_SITE_URL && GOOGLE_SERVICE_ACCOUNT_JSON_BASE64);

export const syncSearchConsole = async (from: Date, to: Date) => {
    if (!searchConsoleConfigured()) return { rows: 0, warnings: ['Search Console nao configurado.'] };
    const token = await accessToken();
    let processed = 0;
    const daily = await querySearchAnalytics(token, from, to, ['date']);
    for (const row of daily) {
        const date = dateValue(row.keys?.[0] || dateText(from));
        const data = { clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 };
        await prisma.searchConsoleDailyMetric.upsert({ where: { date }, create: { date, ...data }, update: data });
        processed += 1;
    }

    const dimensions: Array<[SearchConsoleDimensionKind, string]> = [
        ['QUERY', 'query'], ['PAGE', 'page'], ['DEVICE', 'device'], ['COUNTRY', 'country'],
    ];
    for (const [kind, apiDimension] of dimensions) {
        const rows = await querySearchAnalytics(token, from, to, ['date', apiDimension]);
        await prisma.searchConsoleDimensionDaily.deleteMany({ where: { date: { gte: from, lte: to }, kind } });
        if (rows.length) {
            await prisma.searchConsoleDimensionDaily.createMany({
                data: rows.map((row) => ({
                    date: dateValue(row.keys?.[0] || dateText(from)), kind,
                    value: String(row.keys?.[1] || '(desconhecido)').slice(0, 1000),
                    clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0,
                })),
            });
        }
        processed += rows.length;
    }
    return { rows: processed, warnings: [] as string[] };
};

export const syncUrlInspections = async (limit = 200) => {
    if (!searchConsoleConfigured()) return { rows: 0, warnings: ['Search Console nao configurado.'] };
    const token = await accessToken();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [organicPages, recentTerms] = await Promise.all([
        prisma.searchConsoleDimensionDaily.groupBy({
            by: ['value'], where: { kind: 'PAGE', date: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) } },
            _sum: { clicks: true }, orderBy: { _sum: { clicks: 'desc' } }, take: 120,
        }),
        prisma.term.findMany({ where: { status: TermStatus.APPROVED, archivedAt: null }, orderBy: { updatedAt: 'desc' }, select: { word: true }, take: 120 }),
    ]);
    const candidates = Array.from(new Set([
        ...organicPages.map((item) => item.value),
        ...recentTerms.map((term) => `${APP_URL}/term/${encodeURIComponent(term.word)}`),
    ])).filter((url) => url.startsWith('http')).slice(0, limit * 2);
    let processed = 0;
    const inspectionDate = dateValue(dateText(new Date()));

    for (const url of candidates) {
        if (processed >= limit) break;
        const recent = await prisma.urlInspectionSnapshot.findFirst({ where: { url, inspectedAt: { gte: sevenDaysAgo } }, select: { id: true } });
        if (recent) continue;
        const response = await axios.post('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
            inspectionUrl: url, siteUrl: GOOGLE_SEARCH_CONSOLE_SITE_URL, languageCode: 'pt-BR',
        }, { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });
        const result = response.data.inspectionResult || {};
        const index = result.indexStatusResult || {};
        const issues = [result.mobileUsabilityResult, ...(result.richResultsResult?.detectedItems || [])].filter(Boolean);
        await prisma.urlInspectionSnapshot.upsert({
            where: { url_inspectionDate: { url, inspectionDate } },
            create: {
                url, inspectionDate, verdict: index.verdict || 'UNKNOWN', coverageState: index.coverageState || null,
                indexingState: index.indexingState || null, robotsTxtState: index.robotsTxtState || null,
                pageFetchState: index.pageFetchState || null, lastCrawlTime: index.lastCrawlTime ? new Date(index.lastCrawlTime) : null, issues,
            },
            update: {
                verdict: index.verdict || 'UNKNOWN', coverageState: index.coverageState || null,
                indexingState: index.indexingState || null, robotsTxtState: index.robotsTxtState || null,
                pageFetchState: index.pageFetchState || null, lastCrawlTime: index.lastCrawlTime ? new Date(index.lastCrawlTime) : null,
                issues, inspectedAt: new Date(),
            },
        });
        processed += 1;
    }
    return { rows: processed, warnings: [] as string[] };
};
