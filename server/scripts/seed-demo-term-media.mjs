// Dev-only demo data for the term Origin/Images panels, so the feature can be seen
// end to end: published origin notes, a published image gallery, and one pending
// image to exercise the owner-curation UI ("Aguardando você") and the admin queue.
// Images point at external URLs, so nothing is written to uploads/.
// Run:    node scripts/seed-demo-term-media.mjs
// Remove: node scripts/seed-demo-term-media.mjs --remove
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARK = '[demo]'; // stored in flagReason of demo rows so removal is exact

const ORIGINS = [
    {
        word: 'Gank',
        content: 'Encurtamento de "gang kill": a ideia de atacar em bando, vinda dos MUDs e MMOs dos anos 90. O League of Legends popularizou o termo no Brasil a partir de 2012, quando o jungler virou peça central do meta.',
    },
    {
        word: 'Smurf',
        content: 'Nasceu no Warcraft II, em 1996: dois jogadores de altissimo nivel criaram contas chamadas "PapaSmurf" e "Smurfette" para conseguir partidas, ja que ninguem aceitava jogar contra eles. O apelido pegou e virou padrao.',
    },
];

const IMAGES = [
    {
        word: 'Gank',
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        caption: 'Jungler saindo do mato para o gank no mid',
        status: 'APPROVED',
    },
    {
        word: 'Gank',
        url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
        caption: 'Visao do river: ponto classico de emboscada',
        status: 'APPROVED',
    },
    {
        // Pending on purpose: shows the owner-curation panel and the admin queue.
        word: 'Smurf',
        url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=800&auto=format&fit=crop',
        caption: 'Perfil de conta secundaria em elo baixo',
        status: 'PENDING',
    },
];

async function remove() {
    const res = await prisma.termMedia.deleteMany({ where: { flagReason: MARK } });
    // Recompute the denormalized origin on any term that had a demo origin.
    const words = [...new Set(ORIGINS.map((o) => o.word))];
    for (const word of words) {
        const term = await prisma.term.findFirst({ where: { word }, select: { id: true } });
        if (!term) continue;
        const latest = await prisma.termMedia.findFirst({
            where: { termId: term.id, kind: 'ORIGIN', status: 'APPROVED' },
            orderBy: { updatedAt: 'desc' },
            select: { content: true },
        });
        await prisma.term.update({ where: { id: term.id }, data: { origin: latest?.content ?? null } });
    }
    console.log(`Removed ${res.count} demo media.`);
}

async function seed() {
    // Attribute demo contributions to a real user other than the term owner, so the
    // "por <alguem>" credit and the curation flow look realistic.
    const contributor = await prisma.user.findFirst({
        where: { role: 'USER', anonymizedAt: null },
        select: { id: true, name: true },
    });

    let created = 0;
    for (const item of ORIGINS) {
        const term = await prisma.term.findFirst({ where: { word: item.word }, select: { id: true } });
        if (!term) continue;
        const exists = await prisma.termMedia.findFirst({ where: { termId: term.id, kind: 'ORIGIN', flagReason: MARK } });
        if (exists) continue;
        await prisma.termMedia.create({
            data: {
                termId: term.id, kind: 'ORIGIN', content: item.content,
                status: 'APPROVED', authorId: contributor?.id ?? null, flagReason: MARK,
            },
        });
        await prisma.term.update({ where: { id: term.id }, data: { origin: item.content } });
        created++;
    }

    for (const [index, item] of IMAGES.entries()) {
        const term = await prisma.term.findFirst({ where: { word: item.word }, select: { id: true } });
        if (!term) continue;
        const exists = await prisma.termMedia.findFirst({ where: { termId: term.id, url: item.url, flagReason: MARK } });
        if (exists) continue;
        await prisma.termMedia.create({
            data: {
                termId: term.id, kind: 'IMAGE', url: item.url, content: item.caption,
                order: index, status: item.status, authorId: contributor?.id ?? null, flagReason: MARK,
            },
        });
        created++;
    }

    console.log(`Seeded ${created} demo media (autor: ${contributor?.name || 'sem autor'}).`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
