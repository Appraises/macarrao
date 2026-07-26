import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4175';
const now = new Date().toISOString();
const pagination = { page: 1, pageSize: 20, total: 2, totalPages: 1, hasNext: false, hasPrevious: false };
const row = {
  id: 'term-1', word: 'Gank', definition: 'Ataque coordenado contra um adversario fora de posicao.',
  game: { id: 'game-1', name: 'League of Legends', slug: 'league-of-legends' },
  tags: ['Estrategia', 'MOBA'], examples: ['Vamos gankar a rota superior.'], revision: 3,
  archivedAt: null, upvotes: 18, downvotes: 2, voteBalance: 16, viewsTotal: 430, views28d: 128,
  pendingReports: 1, quality: { missingTags: false, missingExamples: false, reported: true, needsAttention: true },
  createdAt: now, updatedAt: now,
};
const listResponse = {
  items: [row, { ...row, id: 'term-2', word: 'Eco Round', definition: 'Rodada de economia.', game: { id: 'game-2', name: 'Valorant', slug: 'valorant' }, tags: [], examples: [], revision: 1, pendingReports: 0, quality: { missingTags: true, missingExamples: true, reported: false, needsAttention: true }, views28d: 45 }],
  summary: { active: 184, archived: 12, views28d: 9230, pendingReports: 4, needsAttention: 17 }, pagination,
};
const detail = {
  ...row, gameId: 'game-1', phonetic: '/gank/', pronunciationGuide: 'guenque', relatedTerms: ['Roaming'],
  status: 'APPROVED', moderatedAt: now, authorId: null,
  metrics: { viewsTotal: 430, views28d: 128, pendingReports: 1, voteBalance: 16 },
  reports: [{ id: 'report-1', reason: 'incorreto', details: 'Exemplo pode ser melhor.', status: 'PENDING', createdAt: now }],
};

const installMocks = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'admin-terms-e2e');
    localStorage.setItem('user', JSON.stringify({ id: 'admin-e2e', name: 'Admin E2E', email: 'admin@example.com', role: 'ADMIN' }));
  });
  await page.route('**/users/me/notifications**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], count: 0, unreadCount: 0, pagination }) }));
  await page.route('**/games', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'game-1', name: 'League of Legends', slug: 'league-of-legends', image: '', genre: 'MOBA' }, { id: 'game-2', name: 'Valorant', slug: 'valorant', image: '', genre: 'FPS' }]) }));
  await page.route('http://localhost:3001/dashboard/terms**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    if (pathname.endsWith('/duplicates')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (pathname.endsWith('/history')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'audit-1', source: 'EDITORIAL', action: 'TERM_UPDATE', actor: { id: 'admin-e2e', name: 'Admin E2E' }, createdAt: now }]) });
    if (pathname.endsWith('/archive') || pathname.endsWith('/restore')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
    if (pathname === '/dashboard/terms/term-1' && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
    if (pathname === '/dashboard/terms/term-1' && request.method() === 'PUT') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...detail, ...request.postDataJSON(), revision: 4 }) });
    if (pathname === '/dashboard/terms' && request.method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...detail, id: 'new-term' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listResponse) });
  });
};

test.beforeEach(async ({ page }) => installMocks(page));

test('admin catalog supports editorial scanning, URL filters and dedicated editing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dashboard/terms`);
  await expect(page.getByRole('heading', { name: 'Catálogo de termos' })).toBeVisible();
  await expect(page.getByText('184', { exact: true })).toBeVisible();
  await expect(page.getByText('9.230', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gank', exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Sem tags', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-terms-desktop.png', fullPage: true });

  await page.getByLabel('Filtrar por jogo').selectOption('game-1');
  await expect.poll(() => new URL(page.url()).searchParams.get('gameId')).toBe('game-1');
  await page.getByLabel('Filtrar por atencao').selectOption('REPORTED');
  await expect.poll(() => new URL(page.url()).searchParams.get('attention')).toBe('REPORTED');

  await page.getByLabel('Editar Gank').click();
  await expect(page).toHaveURL(/\/dashboard\/terms\/term-1$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Gank', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Conteudo' })).toBeVisible();
  await expect(page.getByText('Preview publico')).toBeVisible();
  await expect(page.getByText('128')).toBeVisible();

  let updatePayload: any = null;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/dashboard/terms/term-1') updatePayload = request.postDataJSON();
  });
  await page.getByLabel('Definicao *').fill('Ataque coordenado de dois ou mais jogadores contra um adversario fora de posicao.');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Alteracoes salvas e publicadas.')).toBeVisible();
  expect(updatePayload.expectedRevision).toBe(3);
  await page.screenshot({ path: 'test-results/admin-term-editor-desktop.png', fullPage: true });
});

test('admin catalog stays contained and usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/dashboard/terms`);
  await expect(page.getByRole('heading', { name: 'Catálogo de termos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filtros' })).toBeVisible();
  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBe(layout.width);
  await page.screenshot({ path: 'test-results/admin-terms-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Gank', exact: true }).click();
  await expect(page.getByText('Preview publico')).toBeVisible();
  const editorLayout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(editorLayout.scrollWidth).toBe(editorLayout.width);
});
