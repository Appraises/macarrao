// Seeds the game catalog from scripts/.games-resolved.json (produced by
// resolve-games.mjs, which verifies every Steam app ID and its header art).
// Descriptions are pulled from Steam in pt-BR, with a graceful fallback to none.
// Idempotent: existing games are skipped, never overwritten.
// Run:    node scripts/seed-games.mjs
// Remove: node scripts/seed-games.mjs --remove
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

// Resolved to a different, unrelated game on Steam (SC2 lives on Battle.net).
const EXCLUDE = new Set(['StarCraft II']);

const slugify = (name) => name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchDescription = async (appid) => {
    try {
        const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=portuguese&cc=br`);
        if (!res.ok) return null;
        const data = await res.json();
        const text = data?.[appid]?.data?.short_description;
        return typeof text === 'string' && text.trim() ? text.trim().slice(0, 500) : null;
    } catch { return null; }
};

const load = () => {
    const raw = JSON.parse(readFileSync(join(here, '.games-resolved.json'), 'utf8'));
    return raw.resolved.filter((g) => !EXCLUDE.has(g.name));
};

async function remove() {
    const games = load();
    const slugs = games.map((g) => slugify(g.name));
    // Never delete a game that already has terms attached to it.
    const withTerms = await prisma.game.findMany({
        where: { slug: { in: slugs }, terms: { some: {} } },
        select: { slug: true, name: true },
    });
    const keep = new Set(withTerms.map((g) => g.slug));
    if (keep.size) console.log(`Mantidos (tem termos): ${withTerms.map((g) => g.name).join(', ')}`);
    const res = await prisma.game.deleteMany({ where: { slug: { in: slugs.filter((s) => !keep.has(s)) } } });
    console.log(`Removed ${res.count} game(s).`);
}

async function seed() {
    const games = load();
    let created = 0;
    let skipped = 0;

    for (const game of games) {
        const slug = slugify(game.name);
        const exists = await prisma.game.findFirst({
            where: { OR: [{ slug }, { name: { equals: game.name, mode: 'insensitive' } }] },
            select: { id: true },
        });
        if (exists) { skipped++; continue; }

        const description = await fetchDescription(game.appid);
        await prisma.game.create({
            data: {
                name: game.name,
                slug,
                genre: game.genre,
                image: game.image,
                description,
                status: 'PUBLISHED',
            },
        });
        created++;
        console.log(`  + ${game.name} (${game.genre})${description ? '' : '  [sem descricao]'}`);
        await sleep(200);
    }

    const total = await prisma.game.count();
    console.log(`\nSeeded ${created} game(s), skipped ${skipped} ja existentes. Catalogo agora: ${total}.`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
