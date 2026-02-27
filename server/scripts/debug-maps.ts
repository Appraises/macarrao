import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Debugging Maps ---');

    // 1. Fetch Game by Slug 'valorant'
    const slug = 'valorant';
    console.log(`Fetching game with slug: ${slug}`);
    const game = await prisma.game.findUnique({
        where: { slug }
    });

    if (!game) {
        console.error('Game not found!');
        return;
    }

    console.log(`Game found: ${game.name} (ID: ${game.id})`);

    // 2. Fetch Maps for this Game
    console.log(`Fetching maps for Game ID: ${game.id}`);
    const maps = await prisma.gameMap.findMany({
        where: { gameId: game.id },
        include: { callouts: true }
    });

    console.log(`Found ${maps.length} maps.`);
    if (maps.length > 0) {
        console.log('First map:', maps[0].name);
        console.log('Callouts count:', maps[0].callouts.length);
    } else {
        console.log('No maps found in DB for this game.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
