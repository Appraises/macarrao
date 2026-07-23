import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type CatalogSort = 'relevance' | 'word' | 'upvotes' | 'createdAt' | 'updatedAt';

export interface CatalogListInput {
    search?: string;
    gameId?: string;
    tag?: string;
    letter?: string;
    sort: CatalogSort;
    order: 'asc' | 'desc';
    skip: number;
    take: number;
}

type CatalogIdRow = { id: string; relevance: number };
type CountRow = { count: number };
type GameMetaRow = { id: string; name: string; slug: string; count: number };
type TagMetaRow = { name: string; count: number };
type LetterMetaRow = { letter: string; count: number };

export const normalizeCatalogSearch = (value: string): string => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();

const normalizedWord = Prisma.sql`public.dicionario_normalize(t."word")`;
const normalizedDefinition = Prisma.sql`public.dicionario_normalize(t."definition")`;
const normalizedTags = Prisma.sql`
    SELECT public.dicionario_normalize(tag.value)
    FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(t."tags") = 'array' THEN t."tags" ELSE '[]'::jsonb END
    ) AS tag(value)
`;

const tagMatches = (value: string, exact = false) => exact
    ? Prisma.sql`EXISTS (${normalizedTags} WHERE public.dicionario_normalize(tag.value) = ${value})`
    : Prisma.sql`EXISTS (${normalizedTags} WHERE public.dicionario_normalize(tag.value) LIKE ${`%${value}%`})`;

const normalizedAliases = Prisma.sql`
    SELECT public.dicionario_normalize(alias.value)
    FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(t."aliases") = 'array' THEN t."aliases" ELSE '[]'::jsonb END
    ) AS alias(value)
`;

const aliasMatches = (value: string, exact = false) => exact
    ? Prisma.sql`EXISTS (${normalizedAliases} WHERE public.dicionario_normalize(alias.value) = ${value})`
    : Prisma.sql`EXISTS (${normalizedAliases} WHERE public.dicionario_normalize(alias.value) LIKE ${`%${value}%`})`;

const searchCondition = (search: string) => {
    const contains = `%${search}%`;
    const basic = Prisma.sql`
        ${normalizedWord} LIKE ${contains}
        OR ${normalizedDefinition} LIKE ${contains}
        OR ${tagMatches(search)}
        OR ${aliasMatches(search)}
    `;

    if (search.length < 3) return Prisma.sql`(${basic})`;
    return Prisma.sql`(${basic} OR similarity(${normalizedWord}, ${search}) >= 0.30)`;
};

const relevanceScore = (search?: string) => {
    if (!search) return Prisma.sql`0`;
    const prefix = `${search}%`;
    const contains = `%${search}%`;
    return Prisma.sql`
        CASE
            WHEN ${normalizedWord} = ${search} THEN 1000
            WHEN ${aliasMatches(search, true)} THEN 900
            WHEN ${normalizedWord} LIKE ${prefix} THEN 800
            WHEN ${normalizedWord} LIKE ${contains} THEN 600
            WHEN ${aliasMatches(search)} THEN 500
            WHEN ${tagMatches(search)} THEN 400
            WHEN ${normalizedDefinition} LIKE ${contains} THEN 200
            ELSE CAST(similarity(${normalizedWord}, ${search}) * 100 AS integer)
        END
    `;
};

const orderClause = (sort: CatalogSort, order: 'asc' | 'desc', hasSearch: boolean) => {
    if (sort === 'relevance' && hasSearch) {
        return Prisma.sql`relevance DESC, t."upvotes" DESC, ${normalizedWord} ASC, t."id" ASC`;
    }
    if (sort === 'upvotes') {
        return order === 'asc'
            ? Prisma.sql`t."upvotes" ASC, ${normalizedWord} ASC, t."id" ASC`
            : Prisma.sql`t."upvotes" DESC, ${normalizedWord} ASC, t."id" ASC`;
    }
    if (sort === 'createdAt' || sort === 'updatedAt') {
        const column = sort === 'createdAt' ? Prisma.sql`t."createdAt"` : Prisma.sql`t."updatedAt"`;
        return order === 'asc'
            ? Prisma.sql`${column} ASC, ${normalizedWord} ASC, t."id" ASC`
            : Prisma.sql`${column} DESC, ${normalizedWord} ASC, t."id" ASC`;
    }
    return order === 'desc'
        ? Prisma.sql`${normalizedWord} DESC, t."id" ASC`
        : Prisma.sql`${normalizedWord} ASC, t."id" ASC`;
};

const catalogConditions = (input: CatalogListInput, search?: string) => {
    const conditions: Prisma.Sql[] = [
        Prisma.sql`t."status" = 'APPROVED'::"TermStatus"`,
        Prisma.sql`t."archivedAt" IS NULL`
    ];
    if (input.gameId) conditions.push(Prisma.sql`t."gameId" = ${input.gameId}`);
    if (input.tag) conditions.push(tagMatches(normalizeCatalogSearch(input.tag), true));
    if (input.letter === '#') {
        conditions.push(Prisma.sql`LEFT(${normalizedWord}, 1) !~ '^[a-z]$'`);
    } else if (input.letter) {
        conditions.push(Prisma.sql`LEFT(${normalizedWord}, 1) = ${normalizeCatalogSearch(input.letter)}`);
    }
    if (search) conditions.push(searchCondition(search));
    return conditions.length ? Prisma.join(conditions, ' AND ') : Prisma.sql`TRUE`;
};

export const listCatalogTerms = async (input: CatalogListInput) => {
    const search = input.search ? normalizeCatalogSearch(input.search) : undefined;
    const where = catalogConditions(input, search);
    const score = relevanceScore(search);
    const ordering = orderClause(input.sort, input.order, Boolean(search));

    const [idRows, countRows] = await Promise.all([
        prisma.$queryRaw<CatalogIdRow[]>(Prisma.sql`
            SELECT t."id", ${score} AS relevance
            FROM "Term" AS t
            WHERE ${where}
            ORDER BY ${ordering}
            LIMIT ${input.take} OFFSET ${input.skip}
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
            SELECT COUNT(*)::integer AS count
            FROM "Term" AS t
            WHERE ${where}
        `)
    ]);

    const ids = idRows.map((row) => row.id);
    const records = ids.length
        ? await prisma.term.findMany({ where: { id: { in: ids } }, include: { game: true } })
        : [];
    const byId = new Map(records.map((record) => [record.id, record]));

    return {
        items: ids.map((id) => byId.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
        total: countRows[0]?.count || 0
    };
};

export const getCatalogMeta = async () => {
    const [totalRows, contributorRows, games, tags, letters] = await Promise.all([
        prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::integer AS count FROM "Term" WHERE "status" = 'APPROVED'::"TermStatus" AND "archivedAt" IS NULL`,
        prisma.$queryRaw<CountRow[]>`SELECT COUNT(DISTINCT "authorId")::integer AS count FROM "Term" WHERE "status" = 'APPROVED'::"TermStatus" AND "archivedAt" IS NULL AND "authorId" IS NOT NULL`,
        prisma.$queryRaw<GameMetaRow[]>`
            SELECT g."id", g."name", g."slug", COUNT(t."id")::integer AS count
            FROM "Game" AS g
            INNER JOIN "Term" AS t ON t."gameId" = g."id" AND t."status" = 'APPROVED'::"TermStatus" AND t."archivedAt" IS NULL
            WHERE g."status" = 'PUBLISHED'
            GROUP BY g."id", g."name", g."slug"
            ORDER BY g."name" ASC
        `,
        prisma.$queryRaw<TagMetaRow[]>`
            SELECT MIN(tag.value) AS name, COUNT(*)::integer AS count
            FROM "Term" AS t
            CROSS JOIN LATERAL jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(t."tags") = 'array' THEN t."tags" ELSE '[]'::jsonb END
            ) AS tag(value)
            WHERE t."status" = 'APPROVED'::"TermStatus" AND t."archivedAt" IS NULL AND BTRIM(tag.value) <> ''
            GROUP BY public.dicionario_normalize(tag.value)
            ORDER BY MIN(tag.value) ASC
        `,
        prisma.$queryRaw<LetterMetaRow[]>`
            SELECT
                CASE
                    WHEN LEFT(public.dicionario_normalize("word"), 1) ~ '^[a-z]$'
                    THEN UPPER(LEFT(public.dicionario_normalize("word"), 1))
                    ELSE '#'
                END AS letter,
                COUNT(*)::integer AS count
            FROM "Term"
            WHERE "status" = 'APPROVED'::"TermStatus" AND "archivedAt" IS NULL
            GROUP BY letter
            ORDER BY letter ASC
        `
    ]);

    return {
        total: totalRows[0]?.count || 0,
        contributors: contributorRows[0]?.count || 0,
        games,
        tags,
        letters
    };
};
