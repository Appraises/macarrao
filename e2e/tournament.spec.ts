import { expect, test } from '@playwright/test';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:4175';
const teamA = { id: 'dk', name: 'Dplus KIA', logo: '/esports/teams/lol/dplus-kia.png' };
const teamB = { id: 'blg', name: 'Bilibili Gaming', logo: '/esports/teams/lol/bilibili-gaming.png' };
const finished = {
    id: 'quarter', game: 'League of Legends', competition: 'Worlds 2026', status: 'FINISHED',
    scoreA: 0, scoreB: 3, scheduledAt: '2026-11-05T22:00:00Z', teamA, teamB,
};

for (const width of [1440, 393]) {
    test(`tournament: bracket, prizes and results are separate at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 920 });
        const loserLogo = width === 393 ? '/missing-bracket-logo.png' : teamA.logo;
        await page.route('**/missing-bracket-logo.png', (route) => route.fulfill({ status: 404 }));
        await page.route('**/esports/tournaments/worlds-2026', (route) => route.fulfill({ json: {
            id: 'worlds', slug: 'worlds-2026', name: 'Worlds 2026', game: 'League of Legends',
            status: 'Playoffs', dates: '15 out. a 14 nov. 2026',
            standings: [{ rank: 1, team: teamB, played: 1, wins: 1, losses: 0 }],
            matches: [{ ...finished, teamA: { ...teamA, logo: loserLogo } }, { ...finished, id: 'scheduled', teamA: { id: 't1', name: 'T1' }, status: 'SCHEDULED', scoreA: null, scoreB: null }],
            bracket: [
                { id: 'final', round: 'Grand Final', teamA: { name: 'Vencedor da semifinal 1' }, teamB: { name: 'Vencedor da semifinal 2' }, date: '2026-11-14T19:00:00Z' },
                { id: 'qf3', matchId: 'quarter', matchKey: 'qf3', round: 'Quarterfinals', status: 'Finished', teamA: { id: 'dk', name: teamA.name, score: 0 }, teamB: { id: 'blg', name: teamB.name, score: 3, isWinner: true } },
            ],
        } }));
        await page.route('**/esports/pickem/worlds-2026/leaderboard', (route) => route.fulfill({ json: [] }));
        await page.goto(`${base}/esports/tournament/worlds-2026`);
        await expect(page.getByRole('heading', { name: 'Worlds 2026', exact: true })).toBeVisible({ timeout: 15_000 });

        const prizes = page.getByRole('region', { name: 'Premiação', exact: true });
        await expect(prizes.getByText(/5\.000\.000/)).toBeVisible();
        await expect(prizes.getByRole('row')).toHaveCount(11);
        await expect(prizes.getByRole('link', { name: 'Fonte da premiação' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Classificação', exact: true })).toBeVisible();

        const bracket = page.getByRole('region', { name: 'Rodadas do chaveamento' });
        await expect(bracket.getByText('Vencedor da semifinal 1')).toBeVisible();
        const match = bracket.getByRole('link', { name: /Dplus KIA 0 Bilibili Gaming 3/ });
        await expect(match).toHaveAttribute('href', '/esports/match/quarter');
        await expect(match.locator('img')).toHaveCount(width === 393 ? 1 : 2);
        await expect(match.locator('svg.lucide-shield')).toHaveCount(width === 393 ? 1 : 0);
        await expect(match.getByText('DP', { exact: true })).toHaveCount(0);
        await expect.poll(() => match.locator('img').first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        const results = page.getByRole('region', { name: 'Últimos resultados' });
        await expect(results.getByText('T1', { exact: true })).toHaveCount(0);
        await expect(results.locator('img')).toHaveCount(width === 393 ? 1 : 2);
        await expect(results.locator('svg.lucide-shield')).toHaveCount(width === 393 ? 1 : 0);
        await expect.poll(() => results.locator('img').first().evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        await page.getByRole('button', { name: 'Ver todas as partidas' }).click();
        await expect(page.getByText('T1', { exact: true })).toBeVisible();
    });
}
