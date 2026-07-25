import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const XP_TABLE = [
    0,      // Level 1
    100,    // Level 2
    300,    // Level 3
    600,    // Level 4
    1000,   // Level 5
    1500,   // Level 6
    2100,   // Level 7
    2800,   // Level 8
    3600,   // Level 9
    4500    // Level 10
];

// Badges moved to their own system (services/badges.ts) — awardXp only handles XP
// and level now. Call evaluateBadges after the milestone event to grant badges.

export const awardXp = async (
    userId: string,
    amount: number,
    client: Pick<Prisma.TransactionClient, 'user'> | typeof prisma = prisma
) => {
    const user = await client.user.update({
        where: { id: userId },
        data: { xp: { increment: amount } }
    });
    if (!user) return;

    const newXp = user.xp || 0;
    let newLevel = user.level;

    // Check for level up
    // Find the highest level where XP requirement is met
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
        if (newXp >= XP_TABLE[i]) {
            // Levels are 1-indexed, so index 0 is Level 1, index 1 is Level 2...
            // Actually, let's say index 0 is required for Level 2.
            // Simpler: Level N requires XP_TABLE[N-1]
            // Level 1: 0 XP
            // Level 2: 100 XP
            // Level 3: 300 XP
            if (i + 1 > newLevel) {
                newLevel = i + 1;
            }
            break;
        }
    }

    await client.user.update({
        where: { id: userId },
        data: { level: newLevel }
    });

    return { newLevel, newXp, leveledUp: newLevel > user.level };
};
