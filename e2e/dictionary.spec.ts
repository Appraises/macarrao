import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:4175';

test('catalog search is tolerant and persists in the URL', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dicionario`);

  await expect(page.getByRole('heading', { name: 'Dicionário', exact: true })).toBeVisible();
  await expect(page.getByText('5 termos verificados')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gank', exact: true })).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Buscar no dicionário' });
  await search.fill('gankk');
  await expect(page).toHaveURL(/\/dicionario\?q=gankk/);
  await expect(page.getByRole('heading', { name: 'Gank', exact: true })).toBeVisible();
  await expect(page.getByText('1 resultado', { exact: true })).toBeVisible();

  await page.reload();
  await expect(search).toHaveValue('gankk');
  await expect(page.getByRole('heading', { name: 'Gank', exact: true })).toBeVisible();
});

test('catalog combines accent-insensitive search, tag and letter filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dicionario?q=estrategia`);
  await expect(page.getByRole('heading', { name: 'Gank', exact: true })).toBeVisible();

  await page.goto(`${BASE_URL}/dicionario?tag=FPS&letter=E&sort=word`);
  await expect(page.getByRole('heading', { name: 'Eco Round', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spike', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Categoria').first()).toHaveValue('FPS');
  await expect(page.getByRole('button', { name: 'E', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('home search uses server autocomplete with keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE_URL);

  const input = page.getByRole('combobox', { name: /Busque um termo/i });
  await input.fill('gankk');
  await expect(page.getByRole('option', { name: /Gank/ })).toBeVisible();
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/term\/Gank$/);

  await page.goto(BASE_URL);
  await page.getByRole('combobox', { name: /Busque um termo/i }).fill('eco errado');
  await page.getByTitle('Buscar no dicionário').click();
  await expect(page).toHaveURL(/\/dicionario\?q=eco%20errado/);
});

test('mobile catalog has a dedicated filter panel and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/dicionario`);

  await page.getByRole('button', { name: /Filtros/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Filtros do dicionário' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Categoria').selectOption('FPS');
  await dialog.getByRole('button', { name: 'Ver resultados' }).click();

  await expect(page).toHaveURL(/tag=FPS/);
  await expect(page.getByRole('heading', { name: 'Eco Round', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Spike', exact: true })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
});

test('catalog exposes a useful empty state', async ({ page }) => {
  await page.goto(`${BASE_URL}/dicionario?q=termo-que-nao-existe-123`);
  await expect(page.getByRole('heading', { name: 'Nenhum termo encontrado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limpar filtros' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sugerir termo' })).toBeVisible();
});
