import { readFile } from 'node:fs/promises';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const [file, flag, ...extra] = process.argv.slice(2);
if (!file || (flag && flag !== '--apply') || extra.length) {
    throw new Error('Usage: node scripts/import-editorial-esports.mjs <file.json> [--apply]');
}

const apply = flag === '--apply';
const { tournaments, teams, matches } = JSON.parse(await readFile(file, 'utf8'));
const games = {
    cs2: { name: 'CS2', slugs: ['cs2', 'counter-strike-2', 'counter-strike'] },
    lol: { name: 'League of Legends', slugs: ['league-of-legends', 'lol'] },
    valorant: { name: 'Valorant', slugs: ['valorant'] },
};

function check(condition, message) {
    if (!condition) throw new Error(message);
}

const validUrl = (value) => typeof value === 'string' && URL.canParse(value) && new URL(value).protocol === 'https:';
const validDate = (value) => typeof value === 'string' && /T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const now = Date.now();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tournamentBySlug = new Map();
const matchKeys = new Set();
const matchSources = new Set();

for (const tournament of tournaments) {
    const { slug, name, game, sourceUrl, startAt, endAt, status } = tournament;
    check(slugPattern.test(slug) && !tournamentBySlug.has(slug) && name && Object.hasOwn(games, game) && validUrl(sourceUrl), `Invalid tournament: ${slug}`);
    check(validDate(startAt) && validDate(endAt) && Date.parse(startAt) < Date.parse(endAt), `Invalid tournament dates: ${slug}`);
    check((status === 'Finished' && Date.parse(endAt) < now) || (status === 'Upcoming' && Date.parse(startAt) > now)
        || (status === 'Playoffs' && Date.parse(startAt) <= now && Date.parse(endAt) >= now), `Check tournament status: ${slug}`);
    tournamentBySlug.set(slug, tournament);
}

for (const [slug, { name, country, logo }] of Object.entries(teams)) {
    check(slugPattern.test(slug) && name && /^[a-z]{2}$/.test(country) && (!logo || validUrl(logo)), `Invalid team: ${slug}`);
}

for (const match of matches) {
    const { tournament, teamA, teamB, sourceUrl, bestOf, scheduledAt, status, score } = match;
    const event = tournamentBySlug.get(tournament);
    const start = Date.parse(scheduledAt);
    const key = `${tournament}/${[teamA, teamB].sort().join('/')}/${start}`;
    check(event && teamA !== teamB && Object.hasOwn(teams, teamA) && Object.hasOwn(teams, teamB)
        && validUrl(sourceUrl) && validDate(scheduledAt) && !matchKeys.has(key) && !matchSources.has(sourceUrl)
        && start >= Date.parse(event.startAt) && start <= Date.parse(event.endAt)
        && [1, 3, 5, 7].includes(bestOf), `Invalid match: ${key}`);
    const wins = Math.ceil(bestOf / 2);
    check((status === 'SCHEDULED' && start > now && score === undefined)
        || (status === 'FINISHED' && start <= now && Array.isArray(score) && score.length === 2
            && score.every((n) => Number.isInteger(n) && n >= 0 && n <= wins)
            && Math.max(...score) === wins && score[0] !== score[1]), `Check match status or score: ${key}`);
    matchKeys.add(key);
    matchSources.add(sourceUrl);
}

const prisma = new PrismaClient();
const counts = { tournaments: { new: 0, existing: 0 }, teams: { new: 0, existing: 0 }, matches: { new: 0, existing: 0 } };
const record = (kind, existing) => { counts[kind][existing ? 'existing' : 'new']++; };

async function audit(db, entityType, item) {
    await db.adminAuditLog.create({ data: {
        action: 'CREATE', entityType, entityId: item.id, metadata: { operation: 'editorial-esports-import', sourceUrl: item.sourceUrl },
    } });
}

try {
    await prisma.$transaction(async (db) => {
        const gameRows = await db.game.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, id: true } });
        const teamIds = new Map();
        const tournamentIds = new Map();
        const gameId = (key) => games[key].slugs.map((slug) => gameRows.find((row) => row.slug === slug)?.id).find(Boolean) ?? null;

        for (const [slug, team] of Object.entries(teams)) {
            const existing = await db.esportsTeam.findUnique({ where: { slug } });
            check(!existing || existing.status === 'PUBLISHED', `Team is not public: ${slug}`);
            record('teams', existing);
            const row = existing ?? (apply ? await db.esportsTeam.create({
                data: { slug, ...team, isBrazilian: team.country === 'br' },
            }) : null);
            if (apply && !existing) await audit(db, 'EsportsTeam', row);
            teamIds.set(slug, row?.id);
        }

        for (const { game, ...tournament } of tournaments) {
            const existing = await db.tournament.findUnique({ where: { slug: tournament.slug } });
            check(!existing || (existing.publicationStatus === 'PUBLISHED' && existing.isBrazilFocused), `Tournament is not public in this scope: ${tournament.slug}`);
            record('tournaments', existing);
            const row = existing ?? (apply ? await db.tournament.create({ data: {
                ...tournament, game: games[game].name, gameId: gameId(game), isBrazilFocused: true,
            } }) : null);
            if (apply && !existing) await audit(db, 'Tournament', row);
            tournamentIds.set(tournament.slug, row?.id);
        }

        for (const { tournament, teamA, teamB, sourceUrl, score, ...match } of matches) {
            const event = tournamentBySlug.get(tournament);
            const tournamentId = tournamentIds.get(tournament);
            const a = teams[teamA];
            const b = teams[teamB];
            const externalId = `editorial:${tournament}:${[teamA, teamB].sort().join(':')}:${new Date(match.scheduledAt).toISOString()}`;
            const existing = await db.esportsMatch.findFirst({ where: { OR: [
                { provider: 'MANUAL', externalId },
                { sourceUrl },
                ...(tournamentId ? [{ tournamentId, scheduledAt: match.scheduledAt, OR: [
                    { teamAName: { equals: a.name, mode: 'insensitive' }, teamBName: { equals: b.name, mode: 'insensitive' } },
                    { teamAName: { equals: b.name, mode: 'insensitive' }, teamBName: { equals: a.name, mode: 'insensitive' } },
                ] }] : []),
            ] } });
            check(!existing || (existing.publicationStatus === 'PUBLISHED' && existing.isBrazilFocused), `Match is not public in this scope: ${sourceUrl}`);
            record('matches', existing);
            if (!apply || existing) continue;
            const row = await db.esportsMatch.create({ data: {
                ...match, externalId, sourceUrl, tournamentId, competition: event.name, region: event.region,
                game: games[event.game].name, gameId: gameId(event.game), isBrazilFocused: true,
                teamAId: teamIds.get(teamA), teamAName: a.name, teamACountry: a.country, teamALogo: a.logo,
                teamBId: teamIds.get(teamB), teamBName: b.name, teamBCountry: b.country, teamBLogo: b.logo,
                scoreA: score?.[0], scoreB: score?.[1],
            } });
            await audit(db, 'EsportsMatch', row);
        }
    }, { isolationLevel: 'Serializable', timeout: 30_000 });
    console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', ...counts }, null, 2));
} finally {
    await prisma.$disconnect();
}
