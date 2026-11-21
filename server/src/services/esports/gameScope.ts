import { ContentStatus, Prisma } from '@prisma/client';

const aliases: Record<string, string[]> = {
    cs2: ['CS2', 'Counter-Strike 2', 'Counter Strike 2', 'Counter-Strike', 'Counterstrike', 'CS:GO', 'CSGO'],
    lol: ['LoL', 'League of Legends', 'Leagueoflegends'],
    valorant: ['Valorant', 'Valo'],
    r6: ['R6', 'Rainbow Six', 'Rainbow Six Siege', 'Tom Clancy\'s Rainbow Six Siege'],
    'dota-2': ['Dota', 'Dota 2', 'Dota2'],
    'free-fire': ['Free Fire', 'Freefire', 'Garena Free Fire'],
    overwatch: ['Overwatch', 'Overwatch 2'],
};

const editorialHints: Record<string, string[]> = {
    cs2: ['Counter-Strike', 'Counter Strike', 'Counterstrike', 'CS2', 'CS:GO', 'CSGO'],
    valorant: ['Valorant', 'VCT'],
    lol: ['League of Legends', 'LoL', 'CBLOL', 'LTA South'],
    'dota-2': ['Dota'],
    r6: ['Rainbow Six', 'Siege', 'R6'],
    'rocket-league': ['Rocket League'],
    'free-fire': ['Free Fire', 'Freefire'],
    overwatch: ['Overwatch'],
    'pokemon-unite': ['Pokémon UNITE', 'Pokemon UNITE'],
    fortnite: ['Fortnite'],
};

export const esportsGameSlug = (name: string) => name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const isEsportsGameSlug = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const lookup = (table: Record<string, string[]>, key: string) =>
    Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;

export const esportsGameScope = (slug: string, catalog: { id: string; name: string; slug: string }[]) => {
    const key = Object.keys(aliases).find((candidate) => candidate === slug || aliases[candidate].some((name) => esportsGameSlug(name) === slug)) ?? slug;
    const names = lookup(aliases, key) ?? [slug, slug.replace(/-/g, ' ')];
    const keys = new Set([slug, key, ...names.map(esportsGameSlug)]);
    const records = catalog.filter((game) => keys.has(game.slug) || keys.has(esportsGameSlug(game.name)));
    for (const game of records) keys.add(esportsGameSlug(game.name));
    const catalogIds = records.map((game) => game.id);
    const gameNames = [...new Set([...names, ...records.map((game) => game.name)])];
    const matchesName = (name: string | null) => !!name && keys.has(esportsGameSlug(name));
    const where = {
        OR: [
            { gameId: { in: catalogIds } },
            { gameId: null, game: { in: gameNames, mode: 'insensitive' as const } },
        ],
    };
    const hints = lookup(editorialHints, key) ?? [];
    return { where, matchesName, hints };
};

export const esportsGameCatalogQuery = {
    where: { status: ContentStatus.PUBLISHED },
    select: { id: true, name: true, slug: true },
} satisfies Prisma.GameFindManyArgs;
