// Dados de demonstracao: cria contribuintes de exemplo e distribui a autoria dos termos
// aprovados, para que perfil publico, badges e ranking tenham o que mostrar.
//
// Rodar:   node scripts/seed-demo-contributors.mjs
// Remover: node scripts/seed-demo-contributors.mjs --remove
//
// ATENCAO: sao contas ficticias. O `--remove` apaga todas de uma vez e os termos voltam
// a ficar sem autor (conteudo da casa) — use isso antes de abrir o site pra comunidade,
// senao um visitante clica num perfil e descobre que a pessoa nao existe.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_DOMAIN = 'demo.dicionariogamer.local';

// Niveis variados de proposito: ranking achatado nao mostra a progressao do sistema.
const DEMO = [
    { name: 'sAsA', level: 14, desc: 'Jogo CS desde a 1.6. Se a giria e de tiro, provavelmente fui eu que escrevi.' },
    { name: 'biazera', level: 11, desc: 'Suporte main. Coleciono termo de MOBA que ninguem sabe explicar direito.' },
    { name: 'DoctorMid', level: 9, desc: 'Mid laner e chato com definicao. Se estiver errado, eu corrijo.' },
    { name: 'kaduzin', level: 8, desc: 'Valorant e um pouco de tudo. Entrei pelas badges e fiquei pelo resto.' },
    { name: 'nanda.exe', level: 7, desc: 'Falo mais de RPG e souls-like. Morrer faz parte.' },
    { name: 'Trovao', level: 6, desc: 'Battle royale e queda quente. Documentando as girias antes que sumam.' },
    { name: 'mHigor', level: 6, desc: 'Luta. Frame data e poesia.' },
    { name: 'lelezinha', level: 5, desc: 'Minecraft e sobrevivencia. Construo mais do que jogo.' },
    { name: 'Rafa_TG', level: 5, desc: 'Curioso por etimologia. Gosto de achar de onde a giria veio.' },
    { name: 'vinny7', level: 4, desc: 'Entrei ontem, ja viciei em adicionar termo.' },
    { name: 'Pandinha', level: 3, desc: 'MMO de raid pesada. Healer sofrido.' },
    { name: 'gustavo.bit', level: 2, desc: 'Chegando agora. Corrigindo exemplo dos outros por enquanto.' },
];

const emailFor = (name) => `${name.toLowerCase()}@${DEMO_DOMAIN}`;

async function remove() {
    const deleted = await prisma.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
    console.log(`Removidos ${deleted.count} contribuinte(s) de demonstracao.`);
    console.log('Os termos deles ficaram sem autor — continuam publicados como conteudo da casa.');
}

async function seed() {
    const password = await bcrypt.hash('demo-only-not-a-login', 10);
    const users = [];
    for (const d of DEMO) {
        const user = await prisma.user.upsert({
            where: { email: emailFor(d.name) },
            update: { level: d.level, xp: d.level * 100, description: d.desc },
            create: {
                name: d.name,
                email: emailFor(d.name),
                password,
                level: d.level,
                xp: d.level * 100,
                description: d.desc,
                emailVerified: true,
                // Sem avatar de proposito: a interface desenha um identicon a partir do nome.
                avatar: null,
            },
        });
        users.push(user);
    }

    // Distribui os termos existentes entre eles, com peso decrescente — assim o ranking
    // tem um topo claro em vez de empate geral.
    const terms = await prisma.term.findMany({
        where: { status: 'APPROVED', archivedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });

    const ordem = [];
    users.forEach((u, i) => {
        const peso = Math.max(1, users.length - i);
        for (let k = 0; k < peso; k++) ordem.push(u);
    });

    let i = 0;
    for (const term of terms) {
        const autor = ordem[i % ordem.length];
        await prisma.term.update({ where: { id: term.id }, data: { authorId: autor.id } });
        await prisma.termMeaning.updateMany({
            where: { termId: term.id, authorId: null },
            data: { authorId: autor.id },
        });
        i++;
    }

    console.log(`${users.length} contribuinte(s) criados; autoria distribuida entre ${terms.length} termo(s).`);
    console.log('Rode scripts/backfill-badges.ts depois, para que as badges sejam calculadas.');
}

const run = process.argv.includes('--remove') ? remove : seed;
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
