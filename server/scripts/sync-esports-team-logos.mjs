import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { selectTeamLogos } from './esports-team-logos.mjs';

const prisma = new PrismaClient();

const teamWhere = (aliases) => ({
    OR: aliases.map((name) => ({ name: { equals: name, mode: 'insensitive' } })),
});

async function syncEntry(entry, preview) {
    const teams = await prisma.esportsTeam.findMany({
        where: teamWhere(entry.aliases),
        select: { id: true, name: true, logo: true },
    });

    if (preview) return teams.length;
    for (const team of teams) {
        await prisma.$transaction([
            prisma.esportsTeam.update({ where: { id: team.id }, data: { logo: entry.path } }),
            prisma.esportsMatch.updateMany({ where: { teamAId: team.id }, data: { teamALogo: entry.path } }),
            prisma.esportsMatch.updateMany({ where: { teamBId: team.id }, data: { teamBLogo: entry.path } }),
            prisma.tournamentStanding.updateMany({ where: { teamId: team.id }, data: { teamLogo: entry.path } }),
        ]);
    }

    return teams.length;
}

async function main() {
    const args = process.argv.slice(2);
    const preview = args.includes('--dry-run');
    let updated = 0;
    for (const entry of selectTeamLogos(args.filter((arg) => arg !== '--dry-run'))) {
        const count = await syncEntry(entry, preview);
        updated += count;
        console.log(`${entry.key}: ${count} registro(s) ${preview ? 'encontrado(s)' : 'atualizado(s)'} -> ${entry.path}`);
    }
    console.log(`${preview ? 'Previa' : 'Sincronizacao'}: ${updated} registro(s) de equipes.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());

