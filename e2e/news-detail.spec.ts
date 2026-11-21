import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4175';
test.use({ timezoneId: 'Asia/Tokyo' });

const dynamicArticle = {
  id: 'news-after-static-build',
  slug: 'noticia-publicada-depois-do-build',
  headline: 'Noticia publicada depois do build',
  category: 'Teste',
  image: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22/%3E',
  content: '<p><strong>Resumo:</strong> Esta noticia nao existe no manifesto estatico.</p><p>Fallback da API confirmado.</p><h2>Subtitulo preservado</h2><p>Corpo editorial sem caixa.</p>',
  author: 'Equipe DG',
  status: 'PUBLISHED',
  createdAt: '2026-11-05T15:00:00.000Z',
  updatedAt: '2026-11-08T00:08:28.253Z',
  publishedAt: '2026-11-08T00:08:28.253Z',
};

test('news published after the static build loads from the API without crashing', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === `/news/${dynamicArticle.slug}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dynamicArticle),
      });
      return;
    }

    if (url.pathname === '/news' && url.searchParams.has('page')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [dynamicArticle],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto(`${BASE_URL}/noticias`);
  const newsLogo = page.locator('img[src="/dg-control-logo.svg"]');
  await expect(newsLogo).toBeVisible();
  await expect.poll(() => newsLogo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.getByRole('link', { name: dynamicArticle.headline }).first().click();

  await expect(page).toHaveURL(new RegExp(`/noticias/${dynamicArticle.slug}/?$`));
  await expect(page.getByRole('heading', { name: dynamicArticle.headline, exact: true })).toBeVisible();
  await expect(page.locator('article header img[src="/dg-control-logo.svg"]')).toBeVisible();
  const published = page.locator('article header time');
  await expect(published).toHaveText('7 de novembro de 2026 às 21:08');
  await expect(published).toHaveAttribute('datetime', dynamicArticle.publishedAt);
  await expect(page.getByText('Fallback da API confirmado.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Subtitulo preservado', exact: true })).toBeVisible();
  await expect(page.locator('.news-article-content')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByText('Esta noticia nao existe no manifesto estatico.')).toHaveCount(1);
  expect(pageErrors).toEqual([]);
});

test('news cards display Brasília publication dates instead of raw timestamps', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const items = [
    ...Array.from({ length: 4 }, (_, index) => ({ ...dynamicArticle, id: `featured-${index}`, slug: `featured-${index}`, headline: `Destaque ${index}` })),
    dynamicArticle,
    { ...dynamicArticle, id: 'fallback', slug: 'fallback', headline: 'Notícia sem data de publicação', publishedAt: null },
    { ...dynamicArticle, id: 'invalid', slug: 'invalid', headline: 'Notícia com data inválida', publishedAt: 'inválida', createdAt: '' },
  ];
  await page.route(/\/news\?/, (route) => route.fulfill({ json: {
    items, pagination: { page: 1, pageSize: 12, total: items.length, totalPages: 1 },
  } }));
  await page.goto(`${BASE_URL}/noticias`);

  await expect(page.locator('img[src="/dg-control-logo.svg"]')).toBeVisible();
  const published = page.getByRole('link', { name: new RegExp(dynamicArticle.headline) }).locator('time');
  await expect(published).toHaveText('7 de nov. de 2026, 21:08', { timeout: 15_000 });
  await expect(published).toHaveAttribute('datetime', dynamicArticle.publishedAt);
  await expect(page.getByRole('link', { name: /Notícia sem data de publicação/ }).locator('time')).toHaveText('5 de nov. de 2026, 12:00');
  await expect(page.getByRole('link', { name: /Notícia com data inválida/ }).locator('time')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
