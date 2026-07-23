import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 393, height: 851 }]) {
  test(`esports smoke ${viewport.width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', (request) => errors.push(`request: ${request.url()}`));
    await page.setViewportSize(viewport);
    await page.goto('http://localhost:4175/esports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'E-sports', exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBe(dimensions.width);
    expect(errors).toEqual([]);
  });
}
