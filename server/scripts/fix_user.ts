
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'lopeesbs@gmail.com';
    const newPassword = 'password'; // Simple password for recovery

    console.log(`Fixing account for: ${email}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
        where: { email },
        data: {
            emailVerified: true, // Verify the account
            password: hashedPassword, // Reset password
            verificationToken: null,
            resetPasswordToken: null
        }
    });

    console.log('Success!');
    console.log(`User ${user.name} is now VERIFIED.`);
    console.log(`Password reset to: ${newPassword}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
