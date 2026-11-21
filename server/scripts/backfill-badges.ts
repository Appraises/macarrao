// Grants earned badges to every existing user, so people who contributed before the
// badge system shipped get what they already qualify for. Idempotent (evaluateBadges
// skips badges a user already has), so it's safe to re-run.
// Run: npx ts-node scripts/backfill-badges.ts
//
// This file is JS but pulls the TS service through ts-node's require hook when run as
// `npx ts-node scripts/backfill-badges.mjs`. If run with plain node it won't resolve
// the .ts import, so prefer ts-node.
import { PrismaClient } from '@prisma/client';
import { evaluateBadges } from '../src/services/badges';

const prisma = new PrismaClient();

const run = async () => {
    const users = await prisma.user.findMany({ where: { anonymizedAt: null }, select: { id: true, name: true } });
    let granted = 0;
    for (const user of users) {
        const newBadges = await evaluateBadges(user.id);
        if (newBadges.length) {
            granted += newBadges.length;
            console.log(`  ${user.name}: ${newBadges.join(', ')}`);
        }
    }
    console.log(`\nAvaliados ${users.length} usuarios, ${granted} badge(s) concedida(s).`);
};

run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
