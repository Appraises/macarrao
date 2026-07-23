// Dev-only demo data: creates a few sample contributors and assigns authorship
// of existing approved terms so the homepage leaderboard shows real data.
// Idempotent. Run: node scripts/seed-demo-contributors.mjs
// Remove later with: node scripts/seed-demo-contributors.mjs --remove
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_DOMAIN = 'demo.dicionariogamer.local';
const DEMO = [
    { name: 'sAsA', level: 12 },
    { name: 'biazera', level: 8 },
    { name: 'DoctorMid', level: 5 },
];

const emailFor = (name) => `${name.toLowerCase()}@${DEMO_DOMAIN}`;

async function remove() {
    const deleted = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
    console.log(`Removed ${deleted.count} demo contributor(s). (Their terms revert to no author.)`);
}

async function seed() {
    const password = await bcrypt.hash('demo-only-not-a-login', 10);
    const users = [];
    for (const d of DEMO) {
        const user = await prisma.user.upsert({
            where: { email: emailFor(d.name) },
            update: { level: d.level },
            create: {
                name: d.name,
                email: emailFor(d.name),
                password,
                level: d.level,
                xp: d.level * 100,
                emailVerified: true,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}`,
            },
        });
        users.push(user);
    }

    // Distribute existing approved terms across the demo users (round-robin).
    const terms = await prisma.term.findMany({
        where: { status: 'APPROVED', archivedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });
    // Weight the first user a bit so the podium isn't a flat tie.
    const order = [users[0], users[0], users[1], users[2]];
    let i = 0;
    for (const term of terms) {
        const author = order[i % order.length];
        await prisma.term.update({ where: { id: term.id }, data: { authorId: author.id } });
        i++;
    }
    console.log(`Seeded ${users.length} demo contributors and assigned authorship of ${terms.length} terms.`);
}

const run = process.argv.includes('--remove') ? remove : seed;
run()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
