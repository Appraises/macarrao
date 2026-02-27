
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'sasabybyele@gmail.com';
    const newPassword = 'password';

    console.log(`Fixing account for: ${email}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
        where: { email },
        data: {
            emailVerified: true,
            password: hashedPassword,
            verificationToken: null,
            resetPasswordToken: null
        }
    });

    console.log('Success!');
    console.log(`User ${user.name} is now fixed (Verified + Password Reset).`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
