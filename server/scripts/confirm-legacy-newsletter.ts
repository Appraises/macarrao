import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { sendPendingNewsletterConfirmations } from '../src/services/newsletter';

sendPendingNewsletterConfirmations()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
