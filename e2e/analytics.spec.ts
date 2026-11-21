import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4175';
const now = new Date().toISOString();
const metric = (value: number, previous = Math.max(0, value - 10)) => ({ value, previous, deltaPercent: previous ? ((value - previous) / previous) * 100 : 100 });
const breakdown = (key: string, value = 100) => ({ key, visitors: value, visits: value + 10, pageviews: value + 30, bounceRate: 31.5, visitDurationSec: 96 });
const seoRow = (key: string, clicks = 30) => ({ key, clicks, impressions: 500, ctr: clicks / 500, position: 7.2 });

const providers = [
  { provider: 'INTERNAL', configured: true, state: 'READY', lastSyncedAt: now, lastStatus: 'SUCCEEDED', dashboardUrl: null },
  { provider: 'SEARCH_CONSOLE', configured: true, state: 'STALE', lastSyncedAt: now, lastStatus: 'SUCCEEDED' },
  { provider: 'SENTRY', configured: false, state: 'NOT_CONFIGURED', lastSyncedAt: null, lastStatus: null },
  { provider: 'CRUX', configured: true, state: 'READY', lastSyncedAt: now, lastStatus: 'SUCCEEDED' },
  { provider: 'PAGESPEED', configured: true, state: 'READY', lastSyncedAt: now, lastStatus: 'SUCCEEDED' },
];

const overview = {
  generatedAt: now,
  coreMetrics: {
    organicVisitors: metric(730, 640), searchSuccessRate: metric(61, 55), organicReturnRate: metric(34, 29),
    signupConversionRate: metric(6.6, 6.1), contributions: metric(24, 18), medianModerationHours: metric(5.2, 7.4),
  },
  attention: [
    { id: 'pending-contribution', severity: 'CRITICAL', title: 'Contribuição aguardando moderação', value: '52 h na fila', description: '8 contribuições aguardam uma decisão.', action: { kind: 'ROUTE', target: '/dashboard/contributions?status=PENDING', label: 'Abrir fila de moderação' } },
    { id: 'zero-result-rate', severity: 'WARNING', title: 'Muitas buscas sem resultado', value: '23,0% das buscas', description: 'Há demanda recorrente por conteúdo ainda não atendido.', action: { kind: 'TAB', target: 'dictionary', label: 'Ver buscas sem resultado' } },
  ],
  productTrend: [
    { date: '2026-07-12', organicVisitors: 70, searches: 30, termsOpened: 18 },
    { date: '2026-07-13', organicVisitors: 86, searches: 42, termsOpened: 27 },
  ],
  funnel: [
    { key: 'organic', label: 'Entrada orgânica', value: 730, conversionRate: 100, abandonment: 0, abandonmentRate: 0 },
    { key: 'search', label: 'Busca', value: 420, conversionRate: 57.5, abandonment: 310, abandonmentRate: 42.5 },
    { key: 'result', label: 'Resultado', value: 365, conversionRate: 86.9, abandonment: 55, abandonmentRate: 13.1 },
    { key: 'term', label: 'Termo', value: 256, conversionRate: 70.1, abandonment: 109, abandonmentRate: 29.9 },
    { key: 'signup', label: 'Cadastro', value: 82, conversionRate: 32, abandonment: 174, abandonmentRate: 68 },
    { key: 'contribution', label: 'Contribuição', value: 24, conversionRate: 29.3, abandonment: 58, abandonmentRate: 70.7 },
  ],
  rankings: {
    terms: [{ id: 'term-1', word: 'Gank', game: 'League of Legends', views: 220 }, { id: 'term-2', word: 'Clutch', game: 'Valorant', views: 180 }],
    zeroResults: [{ query: 'termo ausente', count: 8, previousCount: 3, deltaPercent: 166.7 }],
    pages: [{ ...seoRow('/term/Gank', 80), previousClicks: 40, changePercent: 100 }, { ...seoRow('/term/Nerf', 18), previousClicks: 42, changePercent: -57.1 }],
  },
  communitySummary: { pending: 8, approved: 20, rejected: 4, changesRequested: 3, approvalRate: 83.3, medianDecisionHours: 5.2 },
  providers,
  metrics: {
    visitors: metric(1240, 1100), visits: metric(1530, 1400), pageviews: metric(3400, 3100), searches: metric(420, 360),
    resultRate: metric(87, 84), successRate: metric(61, 55), organicReturnRate: metric(34, 29), signups: metric(82, 70), contributions: metric(24, 18),
  },
  activeUsers: { today: 32, days7: 180, days30: 470 },
  funnels: { anonymous: { organicVisits: 730, searches: 420, results: 365, termsOpened: 256, signups: 82, contributions: 24 } },
  returning: { newVisits: 1010, returningVisits: 520, organicVisits: 730, organicReturningVisits: 248, estimatedByBrowser: true },
  series: {
    traffic: [{ date: '2026-07-12', visitors: 90, visits: 110, pageviews: 230 }, { date: '2026-07-13', visitors: 105, visits: 130, pageviews: 280 }],
    searches: [{ date: '2026-07-12', value: 30 }], signups: [{ date: '2026-07-12', value: 8 }],
  },
};

const traffic = {
  daily: overview.series.traffic,
  channels: [breakdown('Organic Search', 730)], sources: [breakdown('Google', 690)], referrers: [breakdown('reddit.com', 80)],
  landingPages: [breakdown('/term/Gank', 210)], exitPages: [breakdown('/dicionario', 95)], pages: [breakdown('/dicionario', 440)],
  countries: [breakdown('Brasil', 1100)], devices: [breakdown('Mobile', 760)], browsers: [breakdown('Chrome', 880)],
  operatingSystems: [breakdown('Android', 650)], campaigns: [breakdown('lancamento', 90)],
};

const seo = {
  daily: [{ date: '2026-07-12', clicks: 100, impressions: 2100, ctr: 0.047, position: 8.1 }],
  totals: { clicks: 720, impressions: 15600, ctr: 0.046, position: 8.4 },
  queries: [seoRow('o que é clutch')], pages: [seoRow('/term/Clutch', 54)], devices: [seoRow('mobile', 510)], countries: [seoRow('bra', 680)],
  pageChanges: [{ ...seoRow('/term/Gank', 80), previousClicks: 40, changePercent: 100 }], opportunities: [seoRow('eco round valorant', 18)],
  inspections: [{ id: 'inspection-1', url: 'https://dicionariogamer.test/term/Gank', verdict: 'PASS', coverageState: 'Submitted and indexed', inspectedAt: now }],
};

const dictionary = {
  totals: { searches: 420, resultRate: 87, successRate: 61, votes: 190, reports: 3 },
  topQueries: Array.from({ length: 12 }, (_, index) => ({ query: `consulta ${index + 1}`, count: 20 - index, averageResults: index + 1 })),
  zeroResults: [{ query: 'termo ausente', count: 8, averageResults: 0 }], origins: [{ key: 'CATALOG', value: 310 }],
  terms: [{ id: 'term-1', word: 'Gank', game: 'League of Legends', views: 220 }], games: [{ id: 'game-1', name: 'Valorant', searches: 160 }],
  filters: [{ key: 'tag:FPS', value: 77 }, { key: 'letra:G', value: 34 }],
  events: [{ ...breakdown('Term Shared', 44), visits: 44 }, { ...breakdown('404', 12), visits: 12 }],
};

const community = {
  statuses: { PENDING: 8, CHANGES_REQUESTED: 3, APPROVED: 20, REJECTED: 4 }, contributors: 18, approvalRate: 83.3,
  moderation: { medianHours: 5.2, p95Hours: 25.4, averageRevisions: 1.4, decisions: 24 },
  rejectionReasons: [{ key: 'DUPLICATE', value: 2 }], topContributors: [{ id: 'user-1', name: 'Contribuidor teste', contributions: 12 }],
  engagement: { newsComments: 31, notifications: 80, notificationsRead: 62, notificationsClicked: 27, favoriteGameProfiles: 140 },
  retention: { cohort: 82, d7: 42, d30: 24 }, funnel: { accounts: 82, firstContribution: 24, decisions: 18, retainedD7: 34, retainedD30: 20 },
};

const technical = (kind: string, value: number, key = 'site', device = 'ALL', metadata?: Record<string, unknown>) => ({ id: `${kind}-${key}-${device}`, provider: kind.startsWith('page_speed') ? 'PAGESPEED' : kind === 'lcp' ? 'CRUX' : 'SENTRY', date: now, kind, key, device, value, unit: 'millisecond', metadata, updatedAt: now });
const quality = {
  snapshots: [],
  latest: [
    technical('frontend_errors', 4), technical('backend_errors', 2), technical('unresolved_issues', 3), technical('request_p95', 280),
    technical('availability', 100), technical('uptime_incidents', 0), technical('lcp', 2100, 'site', 'MOBILE'), technical('lcp', 1700, 'site', 'DESKTOP'),
    technical('slow_page', 920, '/dicionario', 'ALL', { count: 80 }), technical('slow_route', 640, 'GET /terms', 'ALL', { count: 110 }),
    technical('page_speed_performance', 91, '/', 'MOBILE'),
  ],
};

const installMocks = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'analytics-admin-token');
    localStorage.setItem('user', JSON.stringify({ id: 'admin-e2e', name: 'Admin E2E', role: 'ADMIN', email: 'admin@example.com' }));
  });
  await page.route('**/users/me/notifications**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], unreadCount: 0, pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } }) }));
  await page.route('**/dashboard/analytics/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/export.csv')) return route.fulfill({ status: 200, contentType: 'text/csv', headers: { 'Content-Disposition': 'attachment; filename="analytics.csv"' }, body: 'metric,value\nsearches,420\n' });
    if (pathname.endsWith('/sync')) return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ accepted: true }) });
    const response = pathname.endsWith('/traffic') ? traffic : pathname.endsWith('/seo') ? seo : pathname.endsWith('/dictionary') ? dictionary : pathname.endsWith('/community') ? community : pathname.endsWith('/quality') ? quality : overview;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
};

test.beforeEach(async ({ page }) => installMocks(page));

test('main dashboard overview is decision-oriented and links to detailed analytics', async ({ page }) => {
  let overviewRequests = 0;
  page.on('request', (request) => { if (new URL(request.url()).pathname.endsWith('/dashboard/analytics/overview')) overviewRequests += 1; });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dashboard/overview`);

  await expect(page.getByRole('heading', { name: 'Visão Geral', exact: true })).toBeVisible();
  await expect(page.getByText('Visitantes orgânicos', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atenção necessária' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funil agregado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rankings rápidos' })).toBeVisible();
  await expect(page.getByText('Conexões agora', { exact: true })).toBeVisible();
  await expect(page.locator('.recharts-line-curve')).toHaveCount(3);
  await expect.poll(() => overviewRequests).toBe(1);
  await page.screenshot({ path: 'test-results/dashboard-overview-desktop.png', fullPage: true });

  await page.getByRole('button', { name: '7d', exact: true }).click();
  await expect(page).toHaveURL(/days=7/);
  await page.getByRole('button', { name: 'Ver buscas sem resultado', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/analytics\?.*tab=dictionary/);
});

test('main dashboard overview remains contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/dashboard/overview`);
  await expect(page.getByRole('heading', { name: 'Visão Geral', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funil agregado' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 60), right: Math.round(element.getBoundingClientRect().right) }))
      .filter((item) => item.right > document.documentElement.clientWidth + 1)
      .slice(0, 12),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions.overflowing)).toBe(dimensions.width);
  await page.screenshot({ path: 'test-results/dashboard-overview-mobile.png', fullPage: true });
});

test('analytics dashboard keeps periods in the URL and exposes complete reports', async ({ page }) => {
  let overviewRequests = 0;
  page.on('request', (request) => { if (new URL(request.url()).pathname.endsWith('/dashboard/analytics/overview')) overviewRequests += 1; });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dashboard/analytics`);

  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
  await expect(page.getByText('Retorno orgânico', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atenção necessária' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funil de utilidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rankings rápidos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumo da comunidade' })).toBeVisible();
  await expect(page.locator('.recharts-line-curve')).toHaveCount(3);
  await expect(page.getByText('12/07', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('13/07', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Analytics próprio', { exact: true })).toBeVisible();
  await expect.poll(() => overviewRequests).toBe(1);
  await page.screenshot({ path: 'test-results/analytics-overview-desktop.png', fullPage: true });

  await page.getByRole('button', { name: '7d' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(new URL(page.url()).searchParams.get('to')).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await page.getByRole('button', { name: 'Ver buscas sem resultado', exact: true }).click();
  await expect(page).toHaveURL(/tab=dictionary/);
  await expect(page.getByText('consulta 1', { exact: true })).toBeVisible();
  await expect(page.getByText('consulta 11', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Próxima página' }).first().click();
  await expect(page.getByText('consulta 11', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Filtros e ordenações' })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByTitle('Exportar CSV').click();
  expect((await download).suggestedFilename()).toBe('analytics-dictionary.csv');

  await page.getByTitle('Sincronizar provedores').click();
  await page.getByRole('button', { name: 'SEO', exact: true }).click();
  await expect(page.getByText('o que é clutch', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Oportunidades de CTR' })).toBeVisible();
  await page.screenshot({ path: 'test-results/analytics-desktop.png', fullPage: true });
});

test('analytics dashboard is usable without page overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/dashboard/analytics?from=2026-07-01&to=2026-07-14`);

  await expect(page.getByRole('heading', { name: 'Atenção necessária' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Funil de utilidade' })).toBeVisible();
  await expect(page.getByText('Visitantes orgânicos', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu administrativo' }).click();
  await expect(page.getByRole('link', { name: 'Analytics', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
  await page.waitForTimeout(250);

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 60), right: Math.round(element.getBoundingClientRect().right), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }))
      .filter((item) => item.right > document.documentElement.clientWidth + 1)
      .slice(0, 12),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions.overflowing)).toBe(dimensions.width);
  await page.screenshot({ path: 'test-results/analytics-overview-mobile.png', fullPage: true });

  await page.getByRole('button', { name: 'Qualidade', exact: true }).click();
  await expect(page.getByText('Erros frontend', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Páginas lentas' })).toBeVisible();
});

test('overview alerts open route actions and the healthy state is explicit', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/dashboard/analytics`);
  await page.getByRole('button', { name: 'Abrir fila de moderação', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/contributions\?status=PENDING/);

  await page.route('**/dashboard/analytics/overview**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...overview, attention: [] }) }));
  await page.goto(`${BASE_URL}/dashboard/analytics`);
  await expect(page.getByText('Operação sem alertas no período', { exact: true })).toBeVisible();
});
