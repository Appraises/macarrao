import { Prisma, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from './audit';
import { normalizeCatalogSearch } from './termCatalog';
import { termSnapshot } from '../utils/terms';

export type AdminTermState = 'ACTIVE' | 'ARCHIVED';
export type AdminTermAttention = 'ANY' | 'REPORTED' | 'MISSING_TAGS' | 'MISSING_EXAMPLES';
export type AdminTermSort = 'word' | 'views28d' | 'upvotes' | 'pendingReports' | 'createdAt' | 'updatedAt';

export interface AdminTermListInput {
    search?: string;
    gameId?: string;
    tag?: string;
    letter?: string;
    state: AdminTermState;
    attention?: AdminTermAttention;
    sort: AdminTermSort;
    order: 'asc' | 'desc';
    skip: number;
    take: number;
}

export interface AdminTermContent {
    word: string;
    definition: string;
    gameId: string | null;
    examples: string[];
    tags: string[];
    phonetic: string | null;
    pronunciationGuide: string | null;
    relatedTerms: string[];
    aliases: string[];
}

type AdminTermRowRaw = {
    id: string;
    word: string;
    definition: string;
    gameId: string | null;
    gameName: string | null;
    gameSlug: string | null;
    tags: unknown;
    examples: unknown;
    revision: number;
    archivedAt: Date | null;
    upvotes: number;
    downvotes: number;
    createdAt: Date;
    updatedAt: Date;
    totalViews: number;
    views28d: number;
    pendingReports: number;
};

type CountRow = { count: number };
type SummaryRow = {
    active: number;
    archived: number;
    views28d: number;
    pendingReports: number;
    needsAttention: number;
};

export class AdminTermError extends Error {
    constructor(message: string, public statusCode = 400, public details?: unknown) {
        super(message);
    }
}

const normalizedWordSql = Prisma.sql`public.dicionario_normalize(t."word")`;
const jsonArray = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const publicContentWhere: Prisma.TermWhereInput = { status: TermStatus.APPROVED };

const ensureGame = async (gameId: string | null, client: Prisma.TransactionClient | typeof prisma = prisma) => {
    if (!gameId) return;
    const game = await client.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new AdminTermError('O jogo selecionado nao existe.');
};

const acquireWordLock = async (client: Prisma.TransactionClient, normalizedWord: string) => {
    await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedWord}))`;
};

const ensureUniqueWord = async (
    word: string,
    excludeId: string | undefined,
    client: Prisma.TransactionClient,
) => {
    const normalized = normalizeCatalogSearch(word);
    await acquireWordLock(client, normalized);
    const rows = await client.$queryRaw<Array<{ id: string; word: string }>>(Prisma.sql`
        SELECT "id", "word"
        FROM "Term"
        WHERE "status" = 'APPROVED'::"TermStatus"
          AND public.dicionario_normalize("word") = ${normalized}
          ${excludeId ? Prisma.sql`AND "id" <> ${excludeId}` : Prisma.empty}
        LIMIT 1
    `);
    if (rows[0]) {
        throw new AdminTermError(`Ja existe um termo publicado com a palavra "${rows[0].word}".`, 409, {
            code: 'EXACT_DUPLICATE',
            term: rows[0],
        });
    }
};

const qualityFor = (term: { tags: unknown; examples: unknown; pendingReports: number }) => {
    const missingTags = jsonArray(term.tags).length === 0;
    const missingExamples = jsonArray(term.examples).length === 0;
    return {
        missingTags,
        missingExamples,
        reported: term.pendingReports > 0,
        needsAttention: term.pendingReports > 0 || missingTags || missingExamples,
    };
};

const listConditions = (input: AdminTermListInput) => {
    const conditions: Prisma.Sql[] = [Prisma.sql`t."status" = 'APPROVED'::"TermStatus"`];
    conditions.push(input.state === 'ARCHIVED'
        ? Prisma.sql`t."archivedAt" IS NOT NULL`
        : Prisma.sql`t."archivedAt" IS NULL`);
    if (input.search) {
        const search = `%${normalizeCatalogSearch(input.search)}%`;
        conditions.push(Prisma.sql`(
            ${normalizedWordSql} LIKE ${search}
            OR public.dicionario_normalize(t."definition") LIKE ${search}
        )`);
    }
    if (input.gameId) conditions.push(Prisma.sql`t."gameId" = ${input.gameId}`);
    if (input.tag) {
        const tag = normalizeCatalogSearch(input.tag);
        conditions.push(Prisma.sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(t."tags") = 'array' THEN t."tags" ELSE '[]'::jsonb END
            ) tag(value)
            WHERE public.dicionario_normalize(tag.value) = ${tag}
        )`);
    }
    if (input.letter === '#') {
        conditions.push(Prisma.sql`LEFT(${normalizedWordSql}, 1) !~ '^[a-z]$'`);
    } else if (input.letter) {
        conditions.push(Prisma.sql`LEFT(${normalizedWordSql}, 1) = ${normalizeCatalogSearch(input.letter)}`);
    }
    if (input.attention === 'ANY') {
        conditions.push(Prisma.sql`(metrics."pendingReports" > 0 OR jsonb_array_length(CASE WHEN jsonb_typeof(t."tags") = 'array' THEN t."tags" ELSE '[]'::jsonb END) = 0 OR jsonb_array_length(CASE WHEN jsonb_typeof(t."examples") = 'array' THEN t."examples" ELSE '[]'::jsonb END) = 0)`);
    } else if (input.attention === 'REPORTED') {
        conditions.push(Prisma.sql`metrics."pendingReports" > 0`);
    } else if (input.attention === 'MISSING_TAGS') {
        conditions.push(Prisma.sql`jsonb_array_length(CASE WHEN jsonb_typeof(t."tags") = 'array' THEN t."tags" ELSE '[]'::jsonb END) = 0`);
    } else if (input.attention === 'MISSING_EXAMPLES') {
        conditions.push(Prisma.sql`jsonb_array_length(CASE WHEN jsonb_typeof(t."examples") = 'array' THEN t."examples" ELSE '[]'::jsonb END) = 0`);
    }
    return Prisma.join(conditions, ' AND ');
};

const orderClause = (sort: AdminTermSort, order: 'asc' | 'desc') => {
    const direction = order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const column = sort === 'views28d' ? Prisma.sql`metrics."views28d"`
        : sort === 'pendingReports' ? Prisma.sql`metrics."pendingReports"`
            : sort === 'upvotes' ? Prisma.sql`t."upvotes"`
                : sort === 'createdAt' ? Prisma.sql`t."createdAt"`
                    : sort === 'updatedAt' ? Prisma.sql`t."updatedAt"`
                        : normalizedWordSql;
    return Prisma.sql`${column} ${direction}, ${normalizedWordSql} ASC, t."id" ASC`;
};

export const listAdminTerms = async (input: AdminTermListInput) => {
    const where = listConditions(input);
    const order = orderClause(input.sort, input.order);
    const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const metrics = Prisma.sql`
        LEFT JOIN LATERAL (
            SELECT
                (SELECT COUNT(*)::integer FROM "TermView" v WHERE v."termId" = t.id) AS "totalViews",
                (SELECT COUNT(*)::integer FROM "TermView" v WHERE v."termId" = t.id AND v."createdAt" >= ${since}) AS "views28d",
                (SELECT COUNT(*)::integer FROM "Report" r WHERE r."termId" = t.id AND r."status" = 'PENDING') AS "pendingReports"
        ) metrics ON TRUE
    `;

    const [rows, counts, summaries] = await Promise.all([
        prisma.$queryRaw<AdminTermRowRaw[]>(Prisma.sql`
            SELECT t."id", t."word", t."definition", t."gameId", g."name" AS "gameName", g."slug" AS "gameSlug",
                t."tags", t."examples", t."revision", t."archivedAt", t."upvotes", t."downvotes", t."createdAt", t."updatedAt",
                metrics."totalViews", metrics."views28d", metrics."pendingReports"
            FROM "Term" t
            LEFT JOIN "Game" g ON g.id = t."gameId"
            ${metrics}
            WHERE ${where}
            ORDER BY ${order}
            LIMIT ${input.take} OFFSET ${input.skip}
        `),
        prisma.$queryRaw<CountRow[]>(Prisma.sql`
            SELECT COUNT(*)::integer count FROM "Term" t ${metrics} WHERE ${where}
        `),
        prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
            SELECT
                COUNT(DISTINCT t.id) FILTER (WHERE t."archivedAt" IS NULL)::integer active,
                COUNT(DISTINCT t.id) FILTER (WHERE t."archivedAt" IS NOT NULL)::integer archived,
                COUNT(DISTINCT v.id) FILTER (WHERE v."createdAt" >= ${since} AND t."archivedAt" IS NULL)::integer AS "views28d",
                COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'PENDING')::integer AS "pendingReports",
                COUNT(DISTINCT t.id) FILTER (WHERE r.id IS NOT NULL
                    OR jsonb_array_length(CASE WHEN jsonb_typeof(t.tags) = 'array' THEN t.tags ELSE '[]'::jsonb END) = 0
                    OR jsonb_array_length(CASE WHEN jsonb_typeof(t.examples) = 'array' THEN t.examples ELSE '[]'::jsonb END) = 0
                )::integer AS "needsAttention"
            FROM "Term" t
            LEFT JOIN "TermView" v ON v."termId" = t.id
            LEFT JOIN "Report" r ON r."termId" = t.id AND r.status = 'PENDING'
            WHERE t.status = 'APPROVED'::"TermStatus"
        `),
    ]);

    return {
        items: rows.map((row) => {
            const pendingReports = Number(row.pendingReports || 0);
            return {
                id: row.id,
                word: row.word,
                definition: row.definition,
                game: row.gameId ? { id: row.gameId, name: row.gameName || 'Jogo removido', slug: row.gameSlug } : null,
                tags: jsonArray(row.tags),
                examples: jsonArray(row.examples),
                revision: row.revision,
                archivedAt: row.archivedAt,
                upvotes: row.upvotes,
                downvotes: row.downvotes,
                voteBalance: row.upvotes - row.downvotes,
                viewsTotal: Number(row.totalViews || 0),
                views28d: Number(row.views28d || 0),
                pendingReports,
                quality: qualityFor({ tags: row.tags, examples: row.examples, pendingReports }),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
        }),
        total: Number(counts[0]?.count || 0),
        summary: summaries[0] || { active: 0, archived: 0, views28d: 0, pendingReports: 0, needsAttention: 0 },
    };
};

export const getAdminTerm = async (id: string) => {
    const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const [term, viewsTotal, views28d, reports] = await Promise.all([
        prisma.term.findFirst({
            where: { id, ...publicContentWhere },
            include: { game: true, author: { select: { id: true, name: true, email: true } } },
        }),
        prisma.termView.count({ where: { termId: id } }),
        prisma.termView.count({ where: { termId: id, createdAt: { gte: since } } }),
        prisma.report.findMany({ where: { termId: id }, orderBy: { createdAt: 'desc' } }),
    ]);
    if (!term) throw new AdminTermError('Termo nao encontrado no catalogo.', 404);
    const pendingReports = reports.filter((report) => report.status === 'PENDING').length;
    return {
        ...term,
        tags: jsonArray(term.tags),
        examples: jsonArray(term.examples),
        relatedTerms: jsonArray(term.relatedTerms),
        aliases: jsonArray(term.aliases),
        metrics: { viewsTotal, views28d, pendingReports, voteBalance: term.upvotes - term.downvotes },
        quality: qualityFor({ tags: term.tags, examples: term.examples, pendingReports }),
        reports,
    };
};

export const findAdminTermDuplicates = async (word: string, excludeId?: string) => {
    const normalized = normalizeCatalogSearch(word);
    if (!normalized) return [];
    const rows = await prisma.$queryRaw<Array<{ id: string; word: string; gameId: string | null; gameName: string | null; score: number }>>(Prisma.sql`
        SELECT t.id, t.word, t."gameId", g.name AS "gameName",
            similarity(public.dicionario_normalize(t.word), ${normalized})::float AS score
        FROM "Term" t
        LEFT JOIN "Game" g ON g.id = t."gameId"
        WHERE t.status = 'APPROVED'::"TermStatus"
          ${excludeId ? Prisma.sql`AND t.id <> ${excludeId}` : Prisma.empty}
          AND (public.dicionario_normalize(t.word) = ${normalized}
            OR similarity(public.dicionario_normalize(t.word), ${normalized}) >= 0.42)
        ORDER BY (public.dicionario_normalize(t.word) = ${normalized}) DESC, score DESC, t.word ASC
        LIMIT 6
    `);
    return rows.map((row) => ({
        id: row.id,
        word: row.word,
        game: row.gameId ? { id: row.gameId, name: row.gameName || 'Jogo removido' } : null,
        score: Number(row.score),
        exact: normalizeCatalogSearch(row.word) === normalized,
    }));
};

export const createAdminTerm = async (content: AdminTermContent, actorId: string) => prisma.$transaction(async (tx) => {
    await ensureGame(content.gameId, tx);
    await ensureUniqueWord(content.word, undefined, tx);
    const term = await tx.term.create({
        data: {
            ...content,
            examples: content.examples,
            tags: content.tags,
            relatedTerms: content.relatedTerms,
            aliases: content.aliases,
            status: TermStatus.APPROVED,
            moderatedAt: new Date(),
            authorId: null,
            revision: 1,
            archivedAt: null,
        },
        include: { game: true },
    });
    await writeAuditLog({ actorId, action: 'TERM_CREATE', entityType: 'TERM', entityId: term.id, after: termSnapshot(term) }, tx);
    return term;
});

export const updateAdminTerm = async (
    id: string,
    content: AdminTermContent,
    expectedRevision: number,
    actorId: string,
) => prisma.$transaction(async (tx) => {
    const existing = await tx.term.findFirst({ where: { id, ...publicContentWhere } });
    if (!existing) throw new AdminTermError('Termo nao encontrado no catalogo.', 404);
    if (existing.revision !== expectedRevision) {
        throw new AdminTermError('Este termo foi alterado por outra pessoa. Recarregue a versao atual.', 409, {
            code: 'REVISION_CONFLICT',
            currentRevision: existing.revision,
        });
    }
    await ensureGame(content.gameId, tx);
    await ensureUniqueWord(content.word, id, tx);
    const updated = await tx.term.update({
        where: { id },
        data: {
            ...content,
            examples: content.examples,
            tags: content.tags,
            relatedTerms: content.relatedTerms,
            aliases: content.aliases,
            revision: { increment: 1 },
        },
        include: { game: true },
    });
    await writeAuditLog({
        actorId,
        action: 'TERM_UPDATE',
        entityType: 'TERM',
        entityId: id,
        before: termSnapshot(existing),
        after: termSnapshot(updated),
        metadata: { previousRevision: existing.revision, revision: updated.revision },
    }, tx);
    return updated;
});

const changeArchiveState = async (id: string, archive: boolean, actorId: string) => prisma.$transaction(async (tx) => {
    const existing = await tx.term.findFirst({ where: { id, ...publicContentWhere } });
    if (!existing) throw new AdminTermError('Termo nao encontrado no catalogo.', 404);
    if (archive === Boolean(existing.archivedAt)) {
        throw new AdminTermError(archive ? 'O termo ja esta arquivado.' : 'O termo ja esta ativo.', 409);
    }
    const updated = await tx.term.update({
        where: { id },
        data: { archivedAt: archive ? new Date() : null, revision: { increment: 1 } },
    });
    await writeAuditLog({
        actorId,
        action: archive ? 'TERM_ARCHIVE' : 'TERM_RESTORE',
        entityType: 'TERM',
        entityId: id,
        before: { archivedAt: existing.archivedAt, revision: existing.revision },
        after: { archivedAt: updated.archivedAt, revision: updated.revision },
    }, tx);
    return updated;
});

export const archiveAdminTerm = (id: string, actorId: string) => changeArchiveState(id, true, actorId);
export const restoreAdminTerm = (id: string, actorId: string) => changeArchiveState(id, false, actorId);

export const permanentlyDeleteAdminTerm = async (id: string, confirmation: string, actorId: string) => prisma.$transaction(async (tx) => {
    const existing = await tx.term.findFirst({ where: { id, ...publicContentWhere } });
    if (!existing) throw new AdminTermError('Termo nao encontrado no catalogo.', 404);
    if (!existing.archivedAt) throw new AdminTermError('Arquive o termo antes de exclui-lo definitivamente.', 409);
    if (confirmation !== existing.word) throw new AdminTermError('A confirmacao deve ser exatamente a palavra do termo.');
    await writeAuditLog({
        actorId,
        action: 'TERM_DELETE',
        entityType: 'TERM',
        entityId: id,
        before: { ...termSnapshot(existing), archivedAt: existing.archivedAt, revision: existing.revision },
    }, tx);
    await tx.term.delete({ where: { id } });
    return { id, word: existing.word };
});

export const getAdminTermHistory = async (id: string) => {
    const exists = await prisma.term.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new AdminTermError('Termo nao encontrado.', 404);
    const [moderation, editorial] = await Promise.all([
        prisma.termModerationEvent.findMany({
            where: { termId: id },
            include: { actor: { select: { id: true, name: true, email: true } } },
        }),
        prisma.adminAuditLog.findMany({
            where: { entityType: 'TERM', entityId: id },
            include: { actor: { select: { id: true, name: true, email: true } } },
        }),
    ]);
    return [
        ...moderation.map((entry) => ({ source: 'MODERATION' as const, ...entry })),
        ...editorial.map((entry) => ({ source: 'EDITORIAL' as const, ...entry })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
