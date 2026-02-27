import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Checking for duplicate maps...');

    // Find the old map by ID 'map1'
    const oldMap = await prisma.gameMap.findUnique({
        where: { id: 'map1' }
    });

    if (oldMap) {
        console.log(`Found old map: ${oldMap.name} (ID: ${oldMap.id})`);
        await prisma.gameMap.delete({
            where: { id: 'map1' }
        });
        console.log('Deleted old map.');
    } else {
        console.log('Old map (map1) not found.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
