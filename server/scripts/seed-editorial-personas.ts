import { PrismaClient } from '@prisma/client';
import { EDITORIAL_PERSONAS } from '../src/config/editorialPersonas';
import { upsertEditorialPersonas } from '../src/services/editorialPersonas';

const prisma = new PrismaClient();

const main = async () => {
    await upsertEditorialPersonas(prisma);
    console.log(`✅ ${EDITORIAL_PERSONAS.length} personas editoriais criadas/atualizadas.`);
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
