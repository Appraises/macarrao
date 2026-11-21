import { expect, test, type Page } from '@playwright/test';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4175';
const games = ['Counter-Strike 2', 'Valorant', 'League of Legends'];
const team = (name: string, logo: string) => ({ name, country: 'br', logo: `/esports/teams/${logo}` });
const furia = team('FURIA', 'furia.svg');
const liquid = team('Team Liquid', 'team-liquid.svg');
const mibr = team('MIBR', 'mibr.png');
const imperial = team('Imperial', 'imperial.svg');
const loud = team('LOUD', 'loud.svg');
const nrg = team('NRG', 'nrg.png');
const keyd = team('Vivo Keyd Stars', 'vivo-keyd-stars.png');
const pain = team('paiN Gaming', 'pain-gaming.svg');

const source = {
  configured: true,
  attribution: { provider: 'Liquipedia', license: 'CC BY-SA 3.0', url: 'https://liquipedia.net/' },
};
const match = {
  game: games[0], competition: 'IEM Rio', stage: 'Fase de grupos', bestOf: 3,
  scheduledAt: '2026-11-07T01:30:00.000Z', teamA: furia, teamB: liquid,
};
const feed = {
  source,
  matches: [
    { ...match, id: 'live-cs-1', status: 'LIVE', scoreA: 1, scoreB: 0 },
    { ...match, id: 'live-cs-2', status: 'LIVE', teamA: mibr, teamB: imperial, scoreA: 0, scoreB: 1 },
    { ...match, id: 'live-val', status: 'LIVE', game: games[1], competition: 'VCT Americas', teamA: loud, teamB: nrg },
    { ...match, id: 'schedule-val', status: 'SCHEDULED', game: games[1], competition: 'VCT Americas', teamA: keyd, teamB: nrg },
    { ...match, id: 'schedule-lol', status: 'SCHEDULED', game: games[2], competition: 'CBLOL', teamA: pain, teamB: loud, scheduledAt: '2026-11-07T22:00:00Z' },
  ],
  results: [{ ...match, id: 'result-cs', status: 'FINISHED', scoreA: 2, scoreB: 0, teamB: { ...liquid, logo: '/missing-esports-logo.png' } }],
  tournaments: [
    { id: 'iem-rio', game: games[0], name: 'IEM Rio', status: 'Live', dates: '6–9 nov.', image: '/esports/games/cs2-cover.webp' },
    { id: 'vct-americas', game: games[1], name: 'VCT Americas', status: 'Group Stage', dates: '5–12 nov.', image: '/esports/games/valorant-cover.jpg' },
    { id: 'cblol', game: games[2], name: 'CBLOL', status: 'Upcoming', dates: '7–14 nov.', image: '/esports/games/lol-cover.webp' },
  ],
  pastTournaments: [],
  rankings: [
    { id: 'furia', rank: 1, team: furia, points: 1840, game: games[0] },
    { id: 'mibr', rank: 2, team: mibr, points: 1420, game: games[0] },
  ],
  news: [
    { id: 'news-cs', slug: 'guia-cs2', game: games[0], headline: 'O que acompanhar na próxima etapa do circuito de CS2', category: 'E-Sports', image: '/esports/games/cs2-cover.webp', timeAgo: '2h atras' },
    { id: 'news-val', slug: 'guia-valorant', game: games[1], headline: 'O calendário das equipes brasileiras no Valorant', category: 'E-Sports', image: '/esports/games/valorant-cover.jpg', timeAgo: '4h atras' },
  ],
};

const mockOverview = (page: Page, response: (game: string | null) => { status?: number; json: unknown }) =>
  page.route(/\/esports\/overview(?:\?.*)?$/, (route) => route.fulfill(response(new URL(route.request().url()).searchParams.get('game'))));

for (const viewport of [{ width: 1440, height: 1000 }, { width: 393, height: 851 }, { width: 320, height: 800 }]) {
  test(`esports: visual and coverage flow at ${viewport.width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mockOverview(page, () => ({ json: feed }));
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${base}/esports`);
    const matches = page.getByTestId('featured-match');
    await expect(page.getByRole('heading', { name: 'E-sports', exact: true })).toHaveCount(1);
    await expect(matches).toHaveCount(5);
    await expect(page.getByTestId('spotlight-match')).toContainText('FURIA');
    await expect(page.getByTestId('spotlight-match').getByLabel('Placar: 1 a 0')).toBeVisible();
    const logos = page.locator('[data-testid="featured-match"] img[src*="/esports/teams/"], nav[aria-label="Jogos"] img');
    await expect(logos).toHaveCount(13);
    await expect.poll(() => logos.evaluateAll((images) => images.every((node) => (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(page.getByRole('link', { name: /IEM Rio.*Em andamento/ })).toHaveAttribute('href', '/esports/tournament/iem-rio');
    await expect(matches.first()).toHaveAttribute('href', '/esports/match/live-cs-1');
    const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(width.scroll).toBe(width.client);
    await page.screenshot({ path: testInfo.outputPath('panorama.png'), fullPage: true, animations: 'disabled' });

    await expect(matches.nth(2).getByLabel('Placar indisponível')).toBeVisible();
    await page.getByRole('button', { name: 'Agenda', exact: true }).click();
    await expect(matches).toHaveCount(2);
    await expect(matches.first().locator('time')).toHaveText('22:30');
    await expect(matches.nth(1).locator('time')).toHaveText('19:00');
    await expect(page.getByRole('heading', { name: /6 de nov/ })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('agenda.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Resultados' }).click();
    await expect(matches.first().getByLabel('Placar: 2 a 0')).toBeVisible();
    await expect(matches.first().getByText('TL', { exact: true })).toBeVisible();

    await expect(page.getByTestId('esports-news-feature')).toHaveAttribute('href', '/noticias/guia-cs2');
    await expect(page.getByRole('link', { name: /calendário das equipes brasileiras/ })).toHaveAttribute('href', '/noticias/guia-valorant');

    await page.getByRole('button', { name: 'Valorant, 1 ao vivo' }).click();
    await expect(page).toHaveURL(/jogo=valorant/);
    await expect(page.getByRole('heading', { name: 'Notícias de Valorant' })).toBeVisible();
    await expect(page.getByText('IEM Rio', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Nenhum resultado disponível.')).toBeVisible();
    await page.getByRole('button', { name: /Ao vivo/ }).last().click();
    await expect(matches).toHaveCount(2);
    await expect(matches.first()).toContainText('LOUD');
    await expect(matches.last()).toContainText('Vivo Keyd Stars');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Valorant, 1 ao vivo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(matches).toHaveCount(2);
    expect(errors).toEqual([]);
  });
}

test('empty feed, API retry and refresh retain usable states', async ({ page }) => {
  let failure = true;
  let payload = { ...feed, matches: [], results: [], tournaments: [], rankings: [], news: [{ ...feed.news[0], category: 'Indústria', headline: 'Matéria fora da cobertura competitiva' }] };
  await mockOverview(page, () => failure ? { status: 503, json: {} } : { json: payload });
  await page.goto(`${base}/esports`);
  await expect(page.getByText('Partidas indisponíveis.')).toBeVisible();
  failure = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhuma partida agendada no momento.')).toBeVisible();
  await expect(page.getByText('Nenhum campeonato nesta seleção.')).toBeVisible();
  await expect(page.getByText('Nenhuma notícia nesta seleção.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'CS2', exact: true })).toBeVisible();
  payload = feed;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('featured-match')).toHaveCount(5);
  failure = true;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Não foi possível atualizar as partidas.')).toBeVisible();
  await expect(page.getByTestId('featured-match')).toHaveCount(5);
});

test('scoreboard picks up a new score on the next refresh', async ({ page }) => {
  let payload = feed;
  await page.clock.install();
  await mockOverview(page, () => ({ json: payload }));
  await page.goto(`${base}/esports?jogo=cs2&partidas=live`);
  const match = page.getByTestId('featured-match').first();
  await expect(match.getByLabel('Placar: 1 a 0')).toBeVisible();
  payload = {
    ...feed,
    matches: feed.matches.map((row) => row.id === 'live-cs-1' ? { ...row, scoreA: 2 } : row),
  };
  await page.clock.fastForward(30_001);
  await expect(match.getByLabel('Placar: 2 a 0')).toBeVisible();
  await expect(page).toHaveURL(/jogo=cs2&partidas=live/);
});

test('an expired feed loses its live badge even if refresh fails', async ({ page }) => {
  const now = new Date('2026-11-05T19:00:00Z');
  await page.clock.install({ time: now });
  let unavailable = false;
  const match = {
    ...feed.matches[0], provider: 'LIQUIPEDIA', isLive: true,
    sourceUrl: 'https://pro.eslgaming.com/tour/cs/beijing/',
    liveStatusExpiresAt: new Date(now.getTime() + 20_000).toISOString(),
  };
  await mockOverview(page, () => unavailable ? { status: 503, json: {} } : { json: { ...feed, matches: [match] } });
  await page.goto(`${base}/esports?jogo=cs2&partidas=live`);
  await expect(page.getByTestId('featured-match')).toHaveCount(1);
  unavailable = true;
  await page.clock.fastForward(30_001);
  await expect(page.getByTestId('featured-match')).toHaveCount(0);
  await expect(page.getByText('Não foi possível atualizar as partidas.')).toBeVisible();
  const agendas = page.getByRole('navigation', { name: 'Agendas oficiais' });
  await expect(agendas.getByRole('link')).toHaveCount(1);
  await expect(agendas.getByRole('link', { name: 'CS2' })).toHaveAttribute('href', 'https://blast.tv/cs/tournaments');

  await page.route('**/esports/matches/live-cs-1', (route) => route.fulfill({ json: { ...match, isLive: false } }));
  await page.goto(`${base}/esports/match/live-cs-1`);
  await expect(page.getByText('STATUS NÃO CONFIRMADO')).toBeVisible();
  await expect(page.getByText('Último placar registrado')).toBeVisible();
  await expect(page.getByText('AO VIVO', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Fonte da partida' })).toHaveAttribute('href', match.sourceUrl);
});

test('game selection loads coverage outside the general snapshot', async ({ page }) => {
  const general = {
    ...feed, matches: Array.from({ length: 16 }, (_, index) => ({ ...match, id: `cs-${index}`, status: 'SCHEDULED' })),
    tournaments: [feed.tournaments[0]], news: [feed.news[0]], rankings: [feed.rankings[0]],
  };
  const valorant = {
    ...feed, matches: [feed.matches[3]], tournaments: [feed.tournaments[1]],
    news: [{ ...feed.news[1], image: '/missing-esports-cover.jpg' }],
    pastTournaments: [{ ...feed.tournaments[1], id: 'vct-masters', name: 'VCT Masters', status: 'Finished' }],
    rankings: [{ ...feed.rankings[0], id: 'rank-val', game: games[1], team: loud }],
  };
  await mockOverview(page, (game) => ({ json: game === 'valorant' ? valorant : general }));
  await page.goto(`${base}/esports`);
  await expect(page.getByTestId('featured-match').first()).toContainText('FURIA');
  const scopedRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get('game') === 'valorant');
  await page.getByRole('button', { name: 'Valorant', exact: true }).click();
  await scopedRequest;
  await expect(page.getByTestId('featured-match')).toHaveCount(1);
  await expect(page.getByTestId('featured-match').first()).toContainText('Vivo Keyd Stars');
  await expect(page.getByRole('complementary').getByText('VCT Americas')).toBeVisible();
  await page.getByRole('complementary').getByRole('button', { name: /Encerrados/ }).click();
  await expect(page.getByRole('complementary').getByText('VCT Masters')).toBeVisible();
  await expect(page.getByRole('complementary').getByText('LOUD')).toBeVisible();
  await expect(page.getByTestId('esports-news-feature')).toHaveAttribute('href', '/noticias/guia-valorant');
  const cover = page.getByTestId('esports-news-feature').locator('img');
  await expect(cover).toHaveAttribute('src', '/esports/games/valorant-cover.jpg');
  await expect.poll(() => cover.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText('IEM Rio', { exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByTestId('featured-match').first()).toContainText('FURIA');
});

test('championship history works with the legacy overview response', async ({ page }) => {
  const { pastTournaments: _omitted, ...legacyFeed } = feed;
    await mockOverview(page, () => ({ json: {
        ...legacyFeed,
        news: legacyFeed.news.map(({ game: _game, ...item }, index) => ({ ...item, tournamentId: index === 0 ? 'iem-rio' : 'vct-masters' })),
    } }));
  await page.route(/\/esports\/tournaments\?status=Finished$/, (route) => route.fulfill({ json: [
    { ...feed.tournaments[1], id: 'vct-masters', name: 'VCT Masters', status: 'Finished' },
  ] }));
  await page.goto(`${base}/esports?jogo=valorant`);
  const tournaments = page.getByRole('complementary');
  await expect(tournaments.getByText('VCT Americas')).toBeVisible();
  await tournaments.getByRole('button', { name: /Encerrados/ }).click();
  await expect(tournaments.getByText('VCT Masters')).toBeVisible();
  await expect(tournaments.getByText('IEM Rio')).toHaveCount(0);
    await expect(page.getByTestId('esports-news-feature')).toHaveAttribute('href', '/noticias/guia-valorant');
});
