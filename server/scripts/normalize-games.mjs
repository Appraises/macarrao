// One-off tidy-up of the game catalog:
//  1. Genre labels were a mix of English (older rows) and Portuguese (newer ones),
//     which split the category filter into duplicates. Normalize to pt-BR.
//  2. Backfill missing descriptions from Steam for rows whose art is a Steam header
//     (the app ID is right there in the URL).
// Idempotent and safe to re-run.
// Run: node scripts/normalize-games.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GENRE_PT = {
    Fighting: 'Luta',
    Sports: 'Esporte',
    Strategy: 'Estratégia',
    Survival: 'Sobrevivência',
    Racing: 'Corrida',
    Horror: 'Terror',
    Adventure: 'Aventura',
    Simulation: 'Simulação',
    Puzzle: 'Puzzle',
};

const appIdFrom = (image) => {
    const match = /steam\/apps\/(\d+)\//.exec(image || '');
    return match ? match[1] : null;
};

const fetchDescription = async (appid) => {
    try {
        const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=portuguese&cc=br`);
        if (!res.ok) return null;
        const data = await res.json();
        const text = data?.[appid]?.data?.short_description;
        return typeof text === 'string' && text.trim() ? text.trim().slice(0, 500) : null;
    } catch { return null; }
};

const run = async () => {
    const games = await prisma.game.findMany({ select: { id: true, name: true, genre: true, image: true, description: true } });

    let renamed = 0;
    for (const game of games) {
        const target = GENRE_PT[game.genre];
        if (!target) continue;
        await prisma.game.update({ where: { id: game.id }, data: { genre: target } });
        console.log(`  genero: ${game.name}  ${game.genre} -> ${target}`);
        renamed++;
    }

    let described = 0;
    for (const game of games) {
        if (game.description) continue;
        const appid = appIdFrom(game.image);
        if (!appid) { console.log(`  sem descricao (nao e Steam): ${game.name}`); continue; }
        const description = await fetchDescription(appid);
        if (!description) { console.log(`  descricao nao encontrada: ${game.name}`); continue; }
        await prisma.game.update({ where: { id: game.id }, data: { description } });
        console.log(`  descricao: ${game.name}`);
        described++;
        await new Promise((r) => setTimeout(r, 200));
    }

    const genres = await prisma.game.groupBy({ by: ['genre'], _count: true, orderBy: { _count: { genre: 'desc' } } });
    console.log(`\nGeneros normalizados: ${renamed} | descricoes preenchidas: ${described}`);
    console.log('Generos finais:', genres.map((g) => `${g.genre} (${g._count})`).join(', '));
};

run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
