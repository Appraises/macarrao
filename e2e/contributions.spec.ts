import { expect, test, type Page } from '@playwright/test';
import bcrypt from '../server/node_modules/bcryptjs/index.js';
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
import { config } from '../server/node_modules/dotenv/lib/main.js';

config({ path: 'server/.env', quiet: true });

const BASE_URL = 'http://localhost:4175';
const API_URL = 'http://localhost:3001';
const prisma = new PrismaClient();

interface Session {
  token: string;
  user: Record<string, unknown>;
}

const setSession = async (page: Page, session: Session) => {
  await page.goto(BASE_URL);
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, session);
  await page.reload();
};

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('complete contribution, revision, approval, rejection and notification flow', async ({ page, request }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 1000 });

  const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-contributions-${marker}@example.com`;
  const password = 'E2eContributions123!';
  const approvedWord = `Termo E2E ${marker}`;
  const rejectedWord = `Termo Rejeitado ${marker}`;
  const revisionMessage = 'Inclua uma explicação mais precisa sobre o contexto competitivo.';
  const approvalMessage = 'Agora a definição está clara e pronta para publicação.';
  const rejectionMessage = 'A definição apresenta uma informação incorreta e não pode ser publicada.';
  const privateNote = `nota-interna-${marker}`;
  let userId = '';

  try {
    const user = await prisma.user.create({
      data: {
        name: 'Usuário E2E',
        email,
        password: await bcrypt.hash(password, 10),
        emailVerified: true,
        preferences: { emailNotifications: false },
      },
    });
    userId = user.id;

    const userLogin = await request.post(`${API_URL}/auth/login`, { data: { email, password } });
    expect(userLogin.ok()).toBeTruthy();
    const userSession = await userLogin.json() as Session;

    const adminLogin = await request.post(`${API_URL}/auth/login`, {
      data: { email: 'admin@dicionariogamer.com', password: 'admin' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminSession = await adminLogin.json() as Session;

    await page.route('**/ai/validate-contribution', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ isValid: true }) });
    });

    await setSession(page, userSession);
    await page.goto(`${BASE_URL}/contribuir`);
    await page.getByLabel('Palavra ou expressão').fill(approvedWord);
    await page.getByLabel('Definição detalhada').fill('Uma estratégia usada para controlar o ritmo de uma partida competitiva.');
    await page.getByLabel(/Exemplos de uso/).fill('O time aplicou a estratégia durante a rodada decisiva.');
    await page.getByText('Estratégia', { exact: true }).click();

    const createdResponse = page.waitForResponse((response) => response.url() === `${API_URL}/contributions` && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Enviar contribuição' }).click();
    const created = await createdResponse;
    const createdBody = await created.json() as { id?: string; error?: string };
    expect(created.status(), createdBody.error || JSON.stringify(createdBody)).toBe(201);
    const approvedContribution = createdBody as { id: string };
    const publicTermUrl = `${API_URL}/terms/${encodeURIComponent(approvedWord)}`;
    expect((await request.get(publicTermUrl)).status()).toBe(404);

    await expect(page.getByRole('heading', { name: 'Contribuição enviada' })).toBeVisible();
    await page.getByRole('button', { name: /Acompanhar contribuição/ }).click();
    await expect(page).toHaveURL(new RegExp(`/minhas-contribuicoes/${approvedContribution.id}$`));
    await expect(page.getByText('Pendente', { exact: true })).toBeVisible();

    await setSession(page, adminSession);
    await page.goto(`${BASE_URL}/dashboard/contributions`);
    await page.getByRole('textbox', { name: 'Buscar contribuição' }).fill(approvedWord);
    const queueItem = page.getByRole('button').filter({ hasText: approvedWord });
    await expect(queueItem).toBeVisible();
    await queueItem.click();

    let dialog = page.getByRole('dialog', { name: 'Detalhes da contribuição' });
    await page.screenshot({ path: 'test-results/contributions-admin.png', fullPage: true });
    await dialog.getByLabel('Ação').selectOption('REQUEST_CHANGES');
    await dialog.getByLabel(/Mensagem ao autor/).fill(revisionMessage);
    await dialog.getByLabel(/Nota interna/).fill(privateNote);
    await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
    await expect(dialog.getByText('Revisão solicitada', { exact: true }).first()).toBeVisible();
    expect((await request.get(publicTermUrl)).status()).toBe(404);

    await setSession(page, userSession);
    await page.goto(`${BASE_URL}/minhas-contribuicoes/${approvedContribution.id}`);
    await expect(page.getByText(revisionMessage, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/contributions-desktop.png', fullPage: true });

    const notificationButton = page.locator('button[aria-label^="Notificações"]:visible').first();
    await expect(notificationButton).toHaveAttribute('aria-label', /1 não lida/);
    await notificationButton.click();
    await expect(page.getByText('Revisao solicitada', { exact: true })).toBeVisible();
    await notificationButton.click();

    await page.getByRole('button', { name: 'Corrigir e reenviar' }).click();
    await page.getByLabel('Definição detalhada').fill('Estratégia competitiva usada para controlar o ritmo, os recursos e o posicionamento durante uma rodada decisiva.');
    await page.getByRole('button', { name: 'Reenviar correção' }).click();
    await expect(page.getByText('Pendente', { exact: true })).toBeVisible();
    await expect(page.getByText(/Revisão 2/)).toBeVisible();
    await expect(page.getByText('Correção reenviada', { exact: true })).toBeVisible();

    await setSession(page, adminSession);
    await page.goto(`${BASE_URL}/dashboard/contributions`);
    await page.getByRole('textbox', { name: 'Buscar contribuição' }).fill(approvedWord);
    await page.getByRole('button').filter({ hasText: approvedWord }).click();
    dialog = page.getByRole('dialog', { name: 'Detalhes da contribuição' });
    await dialog.getByLabel(/Mensagem ao autor/).fill(approvalMessage);
    page.once('dialog', (confirmation) => confirmation.accept());
    await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
    await expect(dialog.getByText('Aprovada', { exact: true }).first()).toBeVisible();
    expect((await request.get(publicTermUrl)).status()).toBe(200);

    const rejectedCreate = await request.post(`${API_URL}/contributions`, {
      headers: { Authorization: `Bearer ${userSession.token}` },
      data: {
        word: rejectedWord,
        definition: 'Uma definição propositalmente inadequada para validar a rejeição.',
        gameId: null,
        examples: [],
        tags: ['Outros'],
      },
    });
    expect(rejectedCreate.status()).toBe(201);
    const rejectedContribution = await rejectedCreate.json() as { id: string };

    await page.getByRole('button', { name: 'Fechar' }).click();
    await page.getByRole('textbox', { name: 'Buscar contribuição' }).fill(rejectedWord);
    await page.getByRole('button').filter({ hasText: rejectedWord }).click();
    dialog = page.getByRole('dialog', { name: 'Detalhes da contribuição' });
    await dialog.getByLabel('Ação').selectOption('REJECT');
    await dialog.getByLabel('Motivo').selectOption('INACCURATE');
    await dialog.getByLabel(/Mensagem ao autor/).fill(rejectionMessage);
    await dialog.getByLabel(/Nota interna/).fill(privateNote);
    await dialog.getByRole('button', { name: 'Confirmar decisão' }).click();
    await expect(dialog.getByText('Rejeitada', { exact: true }).first()).toBeVisible();

    await setSession(page, userSession);
    await page.goto(`${BASE_URL}/minhas-contribuicoes/${rejectedContribution.id}`);
    await expect(page.getByText('Rejeitada', { exact: true })).toBeVisible();
    await expect(page.getByText('Informação incorreta', { exact: true })).toBeVisible();
    await expect(page.getByText(rejectionMessage, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar|Corrigir/ })).toHaveCount(0);
    await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);

    await page.goto(`${BASE_URL}/minhas-contribuicoes/${approvedContribution.id}`);
    await expect(page.getByText('Aprovada', { exact: true })).toBeVisible();
    await expect(page.getByText(approvalMessage, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Ver termo publicado/ }).click();
    await expect(page).toHaveURL(new RegExp(`/term/${encodeURIComponent(approvedWord)}$`));
    await expect(page.getByRole('heading', { name: approvedWord, exact: true })).toBeVisible();
    await expect(page.getByText(/controlar o ritmo, os recursos e o posicionamento/)).toBeVisible();
  } finally {
    if (userId) {
      await prisma.term.deleteMany({ where: { authorId: userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  }
});

test('my contributions remains usable without horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  const now = new Date().toISOString();

  await page.route('**/users/me/notifications**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [], unreadCount: 0, pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } }),
  }));
  await page.route('**/games**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/contributions/mine**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'mobile-item', word: 'Clutch mobile', definition: 'Vitória em situação de desvantagem.', gameId: null, game: null, examples: [], tags: ['Competitivo'], status: 'PENDING', revision: 1, moderatedAt: null, upvotes: 0, downvotes: 0, authorId: 'mobile-user', author: 'Usuário mobile', createdAt: now, updatedAt: now, moderationEvents: [] }],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1, hasNext: false, hasPrevious: false },
    }),
  }));

  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.setItem('token', 'mobile-token');
    localStorage.setItem('user', JSON.stringify({ id: 'mobile-user', name: 'Usuário mobile', email: 'mobile@example.com', role: 'USER', emailVerified: true, level: 1, xp: 0, createdAt: new Date().toISOString() }));
  });
  await page.goto(`${BASE_URL}/minhas-contribuicoes`);

  await expect(page.getByRole('heading', { name: 'Minhas contribuições' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clutch mobile' })).toBeVisible();
  const descriptionMetrics = await page.getByText('Acompanhe decisões, orientações e correções em um só lugar.').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement?.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      parentRight: parentRect?.right,
      whiteSpace: getComputedStyle(element).whiteSpace,
    };
  });
  expect(descriptionMetrics.right, JSON.stringify(descriptionMetrics)).toBeLessThanOrEqual(393);
  expect(descriptionMetrics.scrollWidth, JSON.stringify(descriptionMetrics)).toBe(descriptionMetrics.clientWidth);
  await page.screenshot({ path: 'test-results/contributions-mobile.png', fullPage: true });
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBe(dimensions.width);
});
