// Dev-only demo data for the Esports page: Brazilian teams, tournaments, live/
// upcoming/finished matches and rankings across CS2, Valorant and LoL so the
// reorganized page (game filter + live band + agenda + results) looks alive.
// Everything is tagged with a "demo-esports-" marker and fully reversible.
// Run:    node scripts/seed-demo-esports.mjs
// Remove: node scripts/seed-demo-esports.mjs --remove
import { PrismaClient } from '@prisma/client';
import { teamLogoByKey } from './esports-team-logos.mjs';

const prisma = new PrismaClient();
const MARK = 'demo-esports-';

const TEAMS = [
    { key: 'furia', name: 'FURIA', country: 'br', br: true },
    { key: 'loud', name: 'LOUD', country: 'br', br: true },
    { key: 'mibr', name: 'MIBR', country: 'br', br: true },
    { key: 'pain', name: 'paiN Gaming', country: 'br', br: true },
    { key: 'imperial', name: 'Imperial', country: 'br', br: true },
    { key: 'red', name: 'RED Canids', country: 'br', br: true },
    { key: 'fluxo', name: 'Fluxo', country: 'br', br: true },
    { key: 'keyd', name: 'Vivo Keyd Stars', country: 'br', br: true },
    { key: 'liquid', name: 'Team Liquid', country: 'us', br: false },
    { key: 'nrg', name: 'NRG', country: 'us', br: false },
    { key: 'g2', name: 'G2 Esports', country: 'eu', br: false },
];

const CS2 = 'Counter-Strike 2';
const VALORANT = 'Valorant';
const LOL = 'League of Legends';

const TOURNAMENTS = [
    { slug: `${MARK}iem-rio`, name: 'IEM Rio 2026', game: CS2, status: 'Live', dates: 'Jul 2026', prizePool: 'US$ 250.000' },
    { slug: `${MARK}vct-americas`, name: 'VCT Americas 2026', game: VALORANT, status: 'Group Stage', dates: 'Jul 2026', prizePool: 'US$ 500.000' },
    { slug: `${MARK}cblol`, name: 'CBLOL 2026 · 2º Split', game: LOL, status: 'Playoffs', dates: 'Jul 2026', prizePool: 'R$ 500.000' },
];

const H = 3_600_000;
// t = horas relativas a agora (negativo = passado).
const MATCHES = [
    // Ao vivo
    { game: CS2, comp: 'IEM Rio 2026', a: 'furia', b: 'liquid', status: 'LIVE', sa: 13, sb: 11, t: -0.5, bo: 3, stream: 'https://twitch.tv/furiatv' },
    { game: CS2, comp: 'IEM Rio 2026', a: 'mibr', b: 'imperial', status: 'LIVE', sa: 7, sb: 9, t: -0.4, bo: 3, stream: 'https://twitch.tv/mibr' },
    { game: VALORANT, comp: 'VCT Americas 2026', a: 'loud', b: 'nrg', status: 'LIVE', sa: 1, sb: 0, t: -0.3, bo: 3, stream: 'https://twitch.tv/loud' },
    // Agenda (futuro)
    { game: CS2, comp: 'IEM Rio 2026', a: 'furia', b: 'g2', status: 'SCHEDULED', t: 3, bo: 3 },
    { game: LOL, comp: 'CBLOL 2026 · 2º Split', a: 'pain', b: 'fluxo', status: 'SCHEDULED', t: 5, bo: 5 },
    { game: VALORANT, comp: 'VCT Americas 2026', a: 'keyd', b: 'nrg', status: 'SCHEDULED', t: 26, bo: 3 },
    { game: LOL, comp: 'CBLOL 2026 · 2º Split', a: 'loud', b: 'red', status: 'SCHEDULED', t: 28, bo: 5 },
    { game: CS2, comp: 'IEM Rio 2026', a: 'imperial', b: 'liquid', status: 'SCHEDULED', t: 30, bo: 3 },
    // Resultados (passado)
    { game: VALORANT, comp: 'VCT Americas 2026', a: 'loud', b: 'g2', status: 'FINISHED', sa: 2, sb: 1, t: -20, bo: 3 },
    { game: LOL, comp: 'CBLOL 2026 · 2º Split', a: 'fluxo', b: 'red', status: 'FINISHED', sa: 0, sb: 3, t: -26, bo: 5 },
    { game: CS2, comp: 'IEM Rio 2026', a: 'pain', b: 'mibr', status: 'FINISHED', sa: 2, sb: 0, t: -30, bo: 3 },
];

const RANKINGS = {
    [CS2]: ['furia', 'mibr', 'imperial', 'pain', 'fluxo'],
    [VALORANT]: ['loud', 'keyd', 'furia', 'red'],
    [LOL]: ['pain', 'loud', 'red', 'fluxo'],
};

async function remove() {
    const teams = await prisma.esportsTeam.findMany({ where: { slug: { startsWith: MARK } }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    const m = await prisma.esportsMatch.deleteMany({ where: { externalId: { startsWith: MARK } } });
    const r = teamIds.length ? await prisma.teamRanking.deleteMany({ where: { teamId: { in: teamIds } } }) : { count: 0 };
    const to = await prisma.tournament.deleteMany({ where: { slug: { startsWith: MARK } } });
    const te = await prisma.esportsTeam.deleteMany({ where: { slug: { startsWith: MARK } } });
    console.log(`Removed ${m.count} matches, ${r.count} rankings, ${to.count} tournaments, ${te.count} teams.`);
}

async function seed() {
    const games = await prisma.game.findMany({ select: { id: true, name: true, slug: true } });
    const gameId = (name) => {
        const n = name.toLowerCase();
        const hit = games.find((g) => g.name.toLowerCase() === n
            || (n.includes('counter') && /counter|cs/i.test(g.slug + g.name))
            || (n.includes('valorant') && /valorant/i.test(g.slug + g.name))
            || (n.includes('league') && /league|lol/i.test(g.slug + g.name)));
        return hit ? hit.id : null;
    };

    const teamId = {};
    for (const team of TEAMS) {
        const slug = `${MARK}${team.key}`;
        const row = await prisma.esportsTeam.upsert({
            where: { slug },
            update: { name: team.name, country: team.country, isBrazilian: team.br, logo: teamLogoByKey(team.key), status: 'PUBLISHED' },
            create: { slug, name: team.name, country: team.country, isBrazilian: team.br, logo: teamLogoByKey(team.key), status: 'PUBLISHED' },
        });
        teamId[team.key] = row.id;
    }

    for (const t of TOURNAMENTS) {
        await prisma.tournament.upsert({
            where: { slug: t.slug },
            update: {},
            create: {
                slug: t.slug, name: t.name, game: t.game, gameId: gameId(t.game),
                status: t.status, dates: t.dates, prizePool: t.prizePool,
                isBrazilFocused: true, publicationStatus: 'PUBLISHED', region: 'AMERICAS', country: 'br',
            },
        });
    }

    let matchCount = 0;
    for (let i = 0; i < MATCHES.length; i++) {
        const m = MATCHES[i];
        const externalId = `${MARK}${i}`;
        const teamA = TEAMS.find((t) => t.key === m.a);
        const teamB = TEAMS.find((t) => t.key === m.b);
        const scheduledAt = new Date(Date.now() + m.t * H);
        await prisma.esportsMatch.upsert({
            where: { provider_externalId: { provider: 'MANUAL', externalId } },
            update: {},
            create: {
                provider: 'MANUAL', externalId,
                game: m.game, gameId: gameId(m.game),
                competition: m.comp, isBrazilFocused: true, publicationStatus: 'PUBLISHED', region: 'AMERICAS',
                teamAId: teamId[m.a], teamAName: teamA.name, teamACountry: teamA.country, teamALogo: teamLogoByKey(m.a),
                teamBId: teamId[m.b], teamBName: teamB.name, teamBCountry: teamB.country, teamBLogo: teamLogoByKey(m.b),
                status: m.status, isLive: m.status === 'LIVE',
                scoreA: m.sa ?? null, scoreB: m.sb ?? null, bestOf: m.bo ?? null,
                streamUrl: m.stream ?? null, scheduledAt,
            },
        });
        matchCount++;
    }

    let rankCount = 0;
    for (const [game, keys] of Object.entries(RANKINGS)) {
        const gid = gameId(game);
        for (let i = 0; i < keys.length; i++) {
            const team = TEAMS.find((t) => t.key === keys[i]);
            const data = {
                rank: i + 1, points: 1000 - i * 120, trend: i === 0 ? 'up' : i === keys.length - 1 ? 'down' : 'stable',
                game, gameId: gid, teamId: teamId[keys[i]], teamName: team.name, teamCountry: team.country,
            };
            // Unique on [gameId, rank] and [gameId, teamId]; upsert by teamId keeps it idempotent.
            const existing = await prisma.teamRanking.findFirst({ where: { teamId: data.teamId, game } });
            if (existing) await prisma.teamRanking.update({ where: { id: existing.id }, data });
            else await prisma.teamRanking.create({ data });
            rankCount++;
        }
    }

    console.log(`Seeded ${TEAMS.length} teams, ${TOURNAMENTS.length} tournaments, ${matchCount} matches, ${rankCount} rankings.`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
