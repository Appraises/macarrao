import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const term = await prisma.term.upsert({
        where: { id: 'term-jogo' }, // Using a fixed ID to avoid duplicates if re-run
        update: {},
        create: {
            id: 'term-jogo',
            word: 'JOGO',
            definition: 'Atividade recreativa física ou mental, com regras definidas, onde os participantes buscam objetivos específicos, geralmente envolvendo competição ou cooperação.',
            examples: JSON.stringify([
                "Vamos jogar um jogo?",
                "O jogo acabou.",
                "Perdi o jogo (The Game)."
            ]),
            tags: 'Geral,Conceito',
            status: 'APPROVED'
        }
    });

    console.log({ term });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
