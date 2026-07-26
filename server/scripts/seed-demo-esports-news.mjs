// Dev-only demo data: seeds a few "E-Sports" news so the Esports page ticker
// ("Live News") has content. The ticker on /esports prioritizes this category
// and only falls back to general news when none exist. Idempotent.
// Run:    node scripts/seed-demo-esports-news.mjs
// Remove: node scripts/seed-demo-esports-news.mjs --remove
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEWS = [
    {
        slug: 'furia-vaga-major-cs2-demo',
        headline: 'FURIA garante vaga no próximo Major de CS2 após virada épica',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        author: 'Redação e-Sports',
        content: '<p>A FURIA confirmou presença no próximo Major após uma virada dramática nas eliminatórias regionais.</p>',
    },
    {
        slug: 'loud-final-valorant-champions-demo',
        headline: 'LOUD chega à final do Valorant Champions e mira o bicampeonato',
        image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=800&auto=format&fit=crop',
        author: 'Redação e-Sports',
        content: '<p>Com uma campanha sólida, a LOUD avançou à decisão e coloca o Brasil novamente no topo do Valorant mundial.</p>',
    },
    {
        slug: 'cblol-recorde-audiencia-demo',
        headline: 'CBLOL bate recorde de audiência na abertura do split',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop',
        author: 'Redação e-Sports',
        content: '<p>A liga brasileira de League of Legends registrou o maior pico de espectadores de sua história na estreia.</p>',
    },
    {
        slug: 'pain-classificada-major-dota-demo',
        headline: 'paiN Gaming se classifica para o Major de Dota 2 pela primeira vez',
        image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=800&auto=format&fit=crop',
        author: 'Redação e-Sports',
        content: '<p>Em temporada histórica, a paiN carimbou a vaga inédita no principal campeonato de Dota 2 do ano.</p>',
    },
];

const SLUGS = NEWS.map((n) => n.slug);

async function remove() {
    const res = await prisma.news.deleteMany({ where: { slug: { in: SLUGS } } });
    console.log(`Removed ${res.count} demo e-sports news.`);
}

async function seed() {
    const now = Date.now();
    let created = 0;
    for (let i = 0; i < NEWS.length; i++) {
        const item = NEWS[i];
        const exists = await prisma.news.findUnique({ where: { slug: item.slug }, select: { id: true } });
        if (exists) continue;
        await prisma.news.create({
            data: {
                headline: item.headline,
                slug: item.slug,
                category: 'E-Sports',
                image: item.image,
                content: item.content,
                author: item.author,
                status: 'PUBLISHED',
                // Escalona no tempo para o "há X h atrás" da faixa variar.
                publishedAt: new Date(now - (i + 1) * 3 * 3_600_000),
            },
        });
        created++;
    }
    console.log(`Seeded ${created} demo e-sports news (skipped ${NEWS.length - created} already present).`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
