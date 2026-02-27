
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'lopeesbs@gmail.com';
    console.log(`Checking user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (user) {
        console.log('User found:');
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.name}`);
        console.log(`Email Verified: ${user.emailVerified}`);
        console.log('Password hash exists:', !!user.password);
    } else {
        console.log('User NOT found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
