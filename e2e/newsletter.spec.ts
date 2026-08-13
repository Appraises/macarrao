import { expect, test, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4175';
const now = '2026-08-10T12:00:00.000Z';
const pagination = { page: 1, pageSize: 20, total: 1, totalPages: 1, hasNext: false, hasPrevious: false };
const campaign = {
  id: 'campaign-1',
  dateKey: '2026-08-10',
  termId: 'term-1',
  termWord: 'Gank',
  termDefinition: 'Ataque surpresa contra um adversário em desvantagem.',
  termExample: 'O caçador preparou um gank.',
  termGame: 'League of Legends',
  termTags: ['MOBA'],
  subject: 'Gank - Termo do Dia',
  status: 'PARTIAL',
  skipReason: null,
  startedAt: now,
  finishedAt: now,
  createdAt: now,
  updatedAt: now,
};

const overview = {
  provider: { configured: true, webhookConfigured: true, automaticSending: true, sendHour: 9, timezone: 'America/Sao_Paulo' },
  subscribers: { ACTIVE: 128, PENDING: 7, UNSUBSCRIBED: 11, BOUNCED: 2, COMPLAINED: 1, SUPPRESSED: 1 },
  campaigns: { COMPLETED: 20, PARTIAL: 1 },
  deliveries: { DELIVERED: 2400, FAILED: 3, BOUNCED: 2, COMPLAINED: 1 },
  estimatedClicks: 420,
  lastCampaign: campaign,
};

const subscriber = {
  id: 'subscriber-1',
  email: 'leitor@example.com',
  source: 'home',
  status: 'ACTIVE',
  consentAt: now,
  confirmationSentAt: now,
  confirmedAt: now,
  unsubscribedAt: null,
  blockedAt: null,
  blockedReason: null,
  lastSentAt: now,
  createdAt: now,
  updatedAt: now,
};

const installAdminMocks = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'newsletter-admin-token');
    localStorage.setItem('user', JSON.stringify({ id: 'admin-e2e', name: 'Admin E2E', role: 'ADMIN', email: 'admin@example.com' }));
  });
  await page.route('**/users/me/notifications**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [], unreadCount: 0, pagination: { ...pagination, total: 0, totalPages: 0 } }),
  }));
  await page.route('**/dashboard/newsletter/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/overview')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) });
    if (path.endsWith('/subscribers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [subscriber], pagination }) });
    if (path.endsWith('/campaigns')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ ...campaign, deliveryCounts: { DELIVERED: 120, FAILED: 3 }, uniqueClicks: 42 }], pagination }) });
    if (path.endsWith('/campaigns/campaign-1')) return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        campaign,
        deliveryCounts: { DELIVERED: 120, FAILED: 3 },
        deliveries: [{ id: 'delivery-1', status: 'FAILED', resendEmailId: null, attempts: 1, lastError: 'Timeout do provedor', sentAt: null, deliveredAt: null, failedAt: now, bouncedAt: null, complainedAt: null, suppressedAt: null, firstClickedAt: null, clickCount: 0, subscriber }],
        pagination,
      }),
    });
    if (path.endsWith('/test')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sent: true }) });
    if (path.endsWith('/retry')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...campaign, status: 'COMPLETED' }) });
    return route.fallback();
  });
};

test('homepage requires consent and reports pending confirmation', async ({ page }) => {
  let payload: Record<string, unknown> | null = null;
  await page.route('**/newsletter/subscribe', async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ message: 'Confirmação enviada.' }) });
  });
  await page.goto(BASE_URL);
  await page.getByLabel('Seu e-mail').fill('leitor@example.com');
  await page.getByRole('button', { name: 'Inscrever' }).click();
  await expect(page.getByText('Marque a caixa para concordar em receber os e-mails.')).toBeVisible();
  await page.getByRole('checkbox').check({ force: true });
  await page.getByRole('button', { name: 'Inscrever' }).click();
  await expect(page.getByText('Confira seu e-mail para confirmar a inscrição.')).toBeVisible();
  expect(payload).toEqual({ email: 'leitor@example.com', consent: true, source: 'home' });
});

test('confirmation and unsubscribe pages use opaque tokens', async ({ page }) => {
  await page.route('**/newsletter/confirm', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ confirmed: true }) }));
  await page.goto(`${BASE_URL}/newsletter/confirmar?token=opaque-confirmation-token`);
  await expect(page.getByRole('heading', { name: 'Inscrição confirmada' })).toBeVisible();

  await page.route('**/newsletter/unsubscribe', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unsubscribed: true }) }));
  await page.goto(`${BASE_URL}/newsletter/descadastrar?token=opaque-unsubscribe-token`);
  await page.getByRole('button', { name: 'Confirmar descadastro' }).click();
  await expect(page.getByRole('heading', { name: 'Descadastro concluído' })).toBeVisible();
});

test('expired confirmation offers a generic resend flow', async ({ page }) => {
  await page.route('**/newsletter/confirm', (route) => route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ error: 'O link expirou.' }) }));
  await page.route('**/newsletter/resend-confirmation', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Solicitação recebida.' }) }));
  await page.goto(`${BASE_URL}/newsletter/confirmar?token=expired-token-value-123456`);
  await expect(page.getByRole('heading', { name: 'Não foi possível confirmar' })).toBeVisible();
  await page.getByLabel('E-mail da inscrição').fill('leitor@example.com');
  await page.getByRole('button', { name: 'Reenviar confirmação' }).click();
  await expect(page.getByText('Se o endereço estiver pendente, enviaremos um novo link.')).toBeVisible();
});

test('admin dashboard exposes campaigns, subscribers, details and test delivery', async ({ page }) => {
  await installAdminMocks(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/dashboard/newsletter`);

  await expect(page.getByRole('heading', { name: 'Newsletter', exact: true })).toBeVisible();
  await expect(page.getByText('2.400', { exact: true })).toBeVisible();
  await expect(page.getByText('Gank', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Detalhes' }).click();
  await expect(page.getByText('Timeout do provedor')).toBeVisible();
  await page.getByRole('button', { name: 'Enviar prévia' }).click();
  await expect(page.getByText('Prévia enviada ao seu e-mail administrativo.')).toBeVisible();

  await page.getByRole('button', { name: 'Inscritos' }).click();
  await expect(page).toHaveURL(/tab=subscribers/);
  await expect(page.getByText('leitor@example.com')).toBeVisible();
});

test('newsletter dashboard does not overflow on mobile', async ({ page }) => {
  await installAdminMocks(page);
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`${BASE_URL}/dashboard/newsletter`);
  await expect(page.getByRole('heading', { name: 'Newsletter', exact: true })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
});
