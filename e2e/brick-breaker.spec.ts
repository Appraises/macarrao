import { expect, test } from '@playwright/test';

const BASE_URL = 'http://localhost:4175';
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

test('the Jogo panels become an in-page Brick Breaker and return intact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/term/Jogo`);
  const heading = page.getByRole('heading', { name: 'Jogo', exact: true }).first();
  await expect(heading).toBeVisible();
  await expect(page.locator('[data-arcade-panel]')).not.toHaveCount(0);
  const termCardColor = await page.locator('[data-arcade-panel="term-card"]').evaluate((panel) => {
    const surfaces = Array.from(panel.querySelectorAll<HTMLElement>('*'))
      .map((element) => ({ rect: element.getBoundingClientRect(), style: getComputedStyle(element) }))
      .filter(({ style }) => style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none')
      .sort((left, right) => right.rect.width * right.rect.height - left.rect.width * left.rect.height);
    return surfaces[0]?.style.backgroundColor || '';
  });

  for (const key of KONAMI) await page.keyboard.press(key);
  const morph = page.getByTestId('panel-morph-layer');
  await expect(morph).toBeVisible();
  await expect(morph).toHaveAttribute('data-stage', 'target', { timeout: 1_000 });

  const arcade = page.getByTestId('brick-breaker');
  await expect(arcade).toBeVisible({ timeout: 3_000 });
  await expect(page.getByTestId('brick-breaker-overlay')).toBeVisible();
  await expect(arcade.getByText('Painéis convertidos')).toBeVisible();
  await expect(arcade.getByRole('button', { name: 'Lançar' })).toBeVisible();
  await expect(arcade.locator('canvas')).toBeVisible();
  const capturedPalette = (await arcade.locator('canvas').getAttribute('data-brick-palette'))?.split('|') || [];
  expect(capturedPalette).toContain(termCardColor);
  expect(new Set(capturedPalette).size).toBeGreaterThan(2);
  await arcade.getByRole('button', { name: 'Lançar' }).click();
  await expect(arcade.getByRole('button', { name: 'Pausar partida' })).toBeVisible();
  await expect.poll(async () => Number((await arcade.getByTestId('brick-score').textContent())?.replace(/\D/g, '') || 0), {
    timeout: 8_000,
  }).toBeGreaterThan(0);
  const brightCanvasPixels = await arcade.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 225 && pixels[index + 1] > 225 && pixels[index + 2] > 225 && pixels[index + 3] > 180) {
        count += 1;
      }
    }
    return count;
  });
  expect(brightCanvasPixels).toBeGreaterThan(40);

  const reboundedFromPaddle = await arcade.evaluate((root) => new Promise<boolean>((resolve) => {
    const canvas = root.querySelector('canvas');
    const lives = root.querySelector('[data-testid="brick-lives"]');
    let descendedAfterHit = false;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const x = Number(canvas.dataset.ballX);
      const y = Number(canvas.dataset.ballY);
      const velocityY = Number(canvas.dataset.ballVelocityY);
      root.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: x,
        clientY: y,
      }));
      if (velocityY > 0 && y > root.clientHeight * 0.64) descendedAfterHit = true;
      if (descendedAfterHit && velocityY < 0) {
        window.clearInterval(timer);
        resolve(lives?.textContent === '3');
      } else if (Date.now() - startedAt > 10_000) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 16);
  }));
  expect(reboundedFromPaddle).toBe(true);

  const scoreAfterFirstBounce = Number(
    (await arcade.getByTestId('brick-score').textContent())?.replace(/\D/g, '') || 0,
  );
  await expect.poll(async () => Number(
    (await arcade.getByTestId('brick-score').textContent())?.replace(/\D/g, '') || 0,
  ), { timeout: 8_000 }).toBeGreaterThan(scoreAfterFirstBounce);

  const lostExactlyOneLife = await arcade.evaluate((root) => new Promise<boolean>((resolve) => {
    const canvas = root.querySelector('canvas');
    const lives = root.querySelector('[data-testid="brick-lives"]');
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const x = Number(canvas.dataset.ballX);
      const y = Number(canvas.dataset.ballY);
      const velocityY = Number(canvas.dataset.ballVelocityY);
      if (velocityY > 0) {
        root.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: x < root.clientWidth / 2 ? root.clientWidth - 1 : 1,
          clientY: y,
        }));
      }
      if (lives?.textContent === '2') {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - startedAt > 10_000) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 16);
  }));
  expect(lostExactlyOneLife).toBe(true);

  await arcade.getByRole('button', { name: 'Fechar Brick Breaker' }).click();
  await expect(arcade).toBeHidden({ timeout: 2_000 });
  await expect(heading).toBeVisible();
  await expect(page.locator('[data-arcade-panel="term-card"]')).toBeVisible();
});

test('the secret stays restricted to Jogo and ignores editable fields', async ({ page }) => {
  await page.goto(`${BASE_URL}/term/Gank`);
  for (const key of KONAMI) await page.keyboard.press(key);
  await expect(page.getByTestId('brick-breaker')).toHaveCount(0);

  await page.goto(`${BASE_URL}/term/Jogo`);
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Campo de teste');
    document.body.appendChild(input);
    input.focus();
  });
  for (const key of KONAMI) await page.keyboard.press(key);
  await expect(page.getByTestId('brick-breaker')).toHaveCount(0);
});

test('touch gestures unlock the responsive game without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/term/Jogo`);
  await expect(page.getByRole('heading', { name: 'Jogo', exact: true }).first()).toBeVisible();
  await page.evaluate(() => {
    const send = (type: string, x: number, y: number) => document.body.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 1,
      buttons: type === 'pointerdown' ? 1 : 0,
      clientX: x,
      clientY: y,
    }));
    const swipe = (x1: number, y1: number, x2: number, y2: number) => {
      send('pointerdown', x1, y1);
      send('pointerup', x2, y2);
    };
    const tap = (x: number, y: number) => {
      send('pointerdown', x, y);
      send('pointerup', x, y);
    };
    swipe(190, 500, 190, 420);
    swipe(190, 500, 190, 420);
    swipe(190, 420, 190, 500);
    swipe(190, 420, 190, 500);
    swipe(250, 460, 170, 460);
    swipe(150, 460, 230, 460);
    swipe(250, 460, 170, 460);
    swipe(150, 460, 230, 460);
    tap(90, 460);
    tap(300, 460);
  });

  const arcade = page.getByTestId('brick-breaker');
  await expect(arcade).toBeVisible({ timeout: 3_000 });
  await expect(arcade.getByText(/Arraste para mover/i)).toBeVisible();
  await expect(arcade.getByRole('button', { name: /Placar/i })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
});
