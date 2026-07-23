// Dev-only demo data: seeds a handful of common gaming terms so the dictionary,
// recommendations and trending sections feel populated. Idempotent.
// Run:    node scripts/seed-demo-terms.mjs
// Remove: node scripts/seed-demo-terms.mjs --remove
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TERMS = [
    { word: 'Rush', def: 'Avançar de forma agressiva e em grupo para um objetivo, pegando o inimigo de surpresa.', game: 'counter', tags: ['FPS', 'Estratégia'], ex: ['Vamos rushar o bomb B agora!'] },
    { word: 'Clutch', def: 'Vencer uma rodada sozinho em desvantagem numérica, geralmente decidindo o round.', game: 'counter', tags: ['FPS', 'Habilidade'], ex: ['Ele deu um clutch de 1v3 pra fechar o mapa.'] },
    { word: 'Ace', def: 'Eliminar todos os cinco jogadores do time adversário em uma única rodada.', game: 'valorant', tags: ['FPS', 'Objetivo'], ex: ['Que ace absurdo com a Jett!'] },
    { word: 'Feed', def: 'Morrer repetidamente para o inimigo, entregando ouro e experiência de graça.', game: 'league', tags: ['MOBA', 'Geral'], ex: ['Para de feedar, o top já está gigante.'] },
    { word: 'Carry', def: 'Jogador que "carrega" o time, concentrando o maior impacto na partida.', game: 'league', tags: ['MOBA', 'Habilidade'], ex: ['O ADC carregou a partida sozinho.'] },
    { word: 'Smurf', def: 'Conta secundária de um jogador experiente para enfrentar oponentes de nível inferior.', game: null, tags: ['Geral', 'Ranked'], ex: ['Esse cara é smurf, joga bem demais pro elo.'] },
    { word: 'Buff', def: 'Fortalecimento de um personagem, item ou habilidade feito pelos desenvolvedores.', game: null, tags: ['Balanceamento', 'Geral'], ex: ['O novo patch deu um buff forte no suporte.'] },
];

const WORDS = TERMS.map((t) => t.word);

async function remove() {
    const res = await prisma.term.deleteMany({ where: { word: { in: WORDS } } });
    console.log(`Removed ${res.count} demo term(s).`);
}

async function seed() {
    const games = await prisma.game.findMany({ select: { id: true, name: true, slug: true } });
    const findGame = (needle) => needle && games.find((g) => g.slug.toLowerCase().includes(needle) || g.name.toLowerCase().includes(needle));
    const authors = await prisma.user.findMany({ where: { email: { endsWith: '@demo.dicionariogamer.local' } }, select: { id: true } });

    let created = 0;
    for (let i = 0; i < TERMS.length; i++) {
        const t = TERMS[i];
        const exists = await prisma.term.findFirst({ where: { word: { equals: t.word, mode: 'insensitive' } }, select: { id: true } });
        if (exists) continue;
        const game = findGame(t.game);
        await prisma.term.create({
            data: {
                word: t.word,
                definition: t.def,
                status: 'APPROVED',
                tags: t.tags,
                examples: t.ex,
                upvotes: 40 + Math.floor(Math.random() * 900),
                gameId: game ? game.id : null,
                authorId: authors.length ? authors[i % authors.length].id : null,
            },
        });
        created++;
    }
    console.log(`Seeded ${created} demo term(s) (skipped ${TERMS.length - created} already present).`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
