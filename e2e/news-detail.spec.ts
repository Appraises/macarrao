import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4175';

const dynamicArticle = {
  id: 'news-after-static-build',
  slug: 'noticia-publicada-depois-do-build',
  headline: 'Noticia publicada depois do build',
  category: 'Teste',
  image: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22/%3E',
  content: '<p><strong>Resumo:</strong> Esta noticia nao existe no manifesto estatico.</p><p>Fallback da API confirmado.</p><h2>Subtitulo preservado</h2><p>Corpo editorial sem caixa.</p>',
  author: 'Equipe DG',
  status: 'PUBLISHED',
  createdAt: '2026-08-12T12:00:00.000Z',
  updatedAt: '2026-08-12T12:00:00.000Z',
  publishedAt: '2026-08-12T12:00:00.000Z',
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

  await page.goto(`${BASE_URL}/news`);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.getByRole('link', { name: dynamicArticle.headline }).first().click();

  await expect(page).toHaveURL(new RegExp(`/news/${dynamicArticle.slug}/?$`));
  await expect(page.getByRole('heading', { name: dynamicArticle.headline, exact: true })).toBeVisible();
  await expect(page.getByText('Fallback da API confirmado.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Subtitulo preservado', exact: true })).toBeVisible();
  await expect(page.locator('.news-article-content')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByText('Esta noticia nao existe no manifesto estatico.')).toHaveCount(1);
  expect(pageErrors).toEqual([]);
});
