import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGames() {
    console.log('Checking games in database...');
    try {
        const games = await prisma.game.findMany();
        console.log(`Found ${games.length} games:`);
        games.forEach(g => console.log(`- ${g.name} (slug: ${g.slug}, id: ${g.id})`));
    } catch (error) {
        console.error('Error fetching games:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkGames();
