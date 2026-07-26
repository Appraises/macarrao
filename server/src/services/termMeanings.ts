import { Prisma, Register, TermStatus, WordClass } from '@prisma/client';
import { evaluateBadges } from './badges';
import { prisma } from '../lib/prisma';
import { cleanPlainText } from '../utils/content';
import { normalizeTextList } from '../utils/userInput';

export class TermMeaningError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'TermMeaningError';
    }
}

/** One labelled inflected form, e.g. { label: 'particípio', form: 'gankado' }. */
export interface Inflection { label: string; form: string }

export interface MeaningContent {
    definition: string;
    examples: string[];
    gameId: string | null;
    context: string | null;
    wordClass: WordClass | null;
    inflections: Inflection[];
    register: Register | null;
}

const WORD_CLASSES = Object.values(WordClass) as string[];
const REGISTERS = Object.values(Register) as string[];

/** Prisma needs the Json column typed explicitly; the rest of the content passes through. */
const toPrismaData = (content: MeaningContent) => ({
    ...content,
    inflections: content.inflections as unknown as Prisma.InputJsonValue,
});

// Labels we suggest per class; anything else the contributor types is kept as-is,
// since slang morphology does not always fit a textbook table.
const MAX_INFLECTIONS = 12;

export const parseInflections = (value: unknown): Inflection[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: Inflection[] = [];
    for (const entry of value) {
        if (!entry || typeof entry !== 'object') continue;
        const form = cleanPlainText((entry as any).form).slice(0, 60);
        const label = cleanPlainText((entry as any).label).slice(0, 40);
        if (!form) continue;
        const key = form.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ label: label || 'forma', form });
        if (result.length >= MAX_INFLECTIONS) break;
    }
    return result;
};

export const parseWordClass = (value: unknown): WordClass | null => {
    const raw = cleanPlainText(value).toUpperCase();
    return WORD_CLASSES.includes(raw) ? (raw as WordClass) : null;
};

export const parseRegister = (value: unknown): Register | null => {
    const raw = cleanPlainText(value).toUpperCase();
    return REGISTERS.includes(raw) ? (raw as Register) : null;
};

type Tx = Prisma.TransactionClient;

/** Ranking rule for senses: score first, then the original numbering, then age. */
const byRank = <T extends { upvotes: number; downvotes: number; order: number; createdAt: Date }>(a: T, b: T) =>
    (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes) || a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime();

/**
 * Keeps the denormalized columns on "Term" in step with its meanings:
 * definition/examples/gameId mirror the leading sense (what catalog cards, meta
 * descriptions and OG images read), and gameIds lists every game across senses so
 * game filters find a term through any of its meanings.
 * Never blanks the term when no sense is approved yet.
 */
export const syncTermFromMeanings = async (termId: string, tx: Tx = prisma) => {
    const approved = await tx.termMeaning.findMany({ where: { termId, status: TermStatus.APPROVED } });
    // gameIds drives the catalog game filter, so it lists only games with a PUBLISHED
    // sense — a pending proposal must not surface the term under its game yet.
    const gameIds = Array.from(new Set(approved.map((m) => m.gameId).filter((id): id is string => !!id)));

    const leading = [...approved].sort(byRank)[0];
    await tx.term.update({
        where: { id: termId },
        data: {
            gameIds,
            ...(leading
                ? {
                    definition: leading.definition,
                    examples: leading.examples as Prisma.InputJsonValue,
                    gameId: leading.gameId,
                    // Mirror the leading sense's score so the catalog "mais votados"
                    // sort keeps working off "Term".
                    upvotes: leading.upvotes,
                    downvotes: leading.downvotes,
                }
                : {}),
        },
    });
};

/**
 * Toggle a user's vote on one sense, recompute that sense's counts from the votes
 * table (source of truth), then resync the term so the leading sense can change.
 */
export const voteOnMeaning = async (meaningId: string, userId: string, value: 1 | -1) =>
    prisma.$transaction(async (tx) => {
        const meaning = await tx.termMeaning.findFirst({
            where: { id: meaningId, status: TermStatus.APPROVED, term: { status: TermStatus.APPROVED, archivedAt: null } },
            select: { id: true, termId: true },
        });
        if (!meaning) throw new TermMeaningError(404, 'Significado nao encontrado.');

        const existing = await tx.termVote.findUnique({ where: { meaningId_userId: { meaningId, userId } } });
        let myVote: number = value;
        if (existing && existing.value === value) {
            await tx.termVote.delete({ where: { id: existing.id } }); // same click undoes
            myVote = 0;
        } else if (existing) {
            await tx.termVote.update({ where: { id: existing.id }, data: { value } });
        } else {
            await tx.termVote.create({ data: { meaningId, termId: meaning.termId, userId, value } });
        }

        const [upvotes, downvotes] = await Promise.all([
            tx.termVote.count({ where: { meaningId, value: 1 } }),
            tx.termVote.count({ where: { meaningId, value: -1 } }),
        ]);
        await tx.termMeaning.update({ where: { id: meaningId }, data: { upvotes, downvotes } });
        await syncTermFromMeanings(meaning.termId, tx);

        return { upvotes, downvotes, score: upvotes - downvotes, myVote };
    });

/** The signed-in user's votes across a term's senses: { [meaningId]: 1 | -1 }. */
export const getMyMeaningVotes = async (termId: string, userId: string) => {
    const votes = await prisma.termVote.findMany({ where: { termId, userId }, select: { meaningId: true, value: true } });
    return votes.reduce<Record<string, number>>((map, vote) => {
        map[vote.meaningId] = vote.value;
        return map;
    }, {});
};

export const parseMeaningPayload = (body: unknown): MeaningContent => {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};

    const definition = cleanPlainText(input.definition);
    if (definition.length < 15) throw new TermMeaningError(400, 'A definicao deve ter pelo menos 15 caracteres.');
    if (definition.length > 2000) throw new TermMeaningError(400, 'A definicao deve ter no maximo 2000 caracteres.');

    const examples = normalizeTextList(input.examples, 'Exemplos', { maxItems: 10, maxLength: 300 });
    if (!examples.valid) throw new TermMeaningError(400, examples.error);

    const gameId = cleanPlainText(input.gameId) || null;
    if (gameId && gameId.length > 100) throw new TermMeaningError(400, 'Jogo invalido.');

    const context = cleanPlainText(input.context) || null;
    if (context && context.length > 60) throw new TermMeaningError(400, 'O contexto deve ter no maximo 60 caracteres.');

    return {
        definition,
        examples: examples.data,
        gameId,
        context,
        wordClass: parseWordClass(input.wordClass),
        inflections: parseInflections(input.inflections),
        register: parseRegister(input.register),
    };
};

const ensureGame = async (gameId: string | null, tx: Tx) => {
    if (!gameId) return;
    const game = await tx.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) throw new TermMeaningError(400, 'O jogo selecionado nao existe.');
};

/**
 * Anyone signed in may propose a sense; it lands as PENDING so the term stays
 * untouched until moderation approves it.
 */
export const proposeTermMeaning = async (termId: string, authorId: string, content: MeaningContent) =>
    prisma.$transaction(async (tx) => {
        const term = await tx.term.findFirst({
            where: { id: termId, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true },
        });
        if (!term) throw new TermMeaningError(404, 'Termo nao encontrado.');
        await ensureGame(content.gameId, tx);

        const duplicate = await tx.termMeaning.findFirst({
            where: { termId, authorId, status: TermStatus.PENDING },
            select: { id: true },
        });
        if (duplicate) throw new TermMeaningError(409, 'Voce ja tem um significado aguardando moderacao para este termo.');

        const last = await tx.termMeaning.findFirst({ where: { termId }, orderBy: { order: 'desc' }, select: { order: true } });
        const meaning = await tx.termMeaning.create({
            data: { ...toPrismaData(content), termId, authorId, order: (last?.order || 0) + 1, status: TermStatus.PENDING },
        });
        await syncTermFromMeanings(termId, tx);
        return meaning;
    });

/** Admin adds a sense straight to the published entry, skipping the queue. */
export const createTermMeaning = async (termId: string, content: MeaningContent) =>
    prisma.$transaction(async (tx) => {
        const term = await tx.term.findUnique({ where: { id: termId }, select: { id: true } });
        if (!term) throw new TermMeaningError(404, 'Termo nao encontrado.');
        await ensureGame(content.gameId, tx);
        const last = await tx.termMeaning.findFirst({ where: { termId }, orderBy: { order: 'desc' }, select: { order: true } });
        const meaning = await tx.termMeaning.create({
            data: { ...toPrismaData(content), termId, order: (last?.order || 0) + 1, status: TermStatus.APPROVED },
        });
        await syncTermFromMeanings(termId, tx);
        return meaning;
    });

export const moderateTermMeaning = async (meaningId: string, status: TermStatus) => {
    const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.termMeaning.findUnique({ where: { id: meaningId }, select: { id: true, termId: true, authorId: true } });
        if (!existing) throw new TermMeaningError(404, 'Significado nao encontrado.');
        const meaning = await tx.termMeaning.update({ where: { id: meaningId }, data: { status } });
        await syncTermFromMeanings(existing.termId, tx);
        return { meaning, authorId: existing.authorId };
    });
    // Approving may unlock the linguistic badges (flexões, tom, novo significado).
    if (status === TermStatus.APPROVED && result.authorId) {
        await evaluateBadges(result.authorId).catch((error) => console.error('[badges] evaluate after meaning approval failed:', error));
    }
    return result.meaning;
};

export const updateTermMeaning = async (meaningId: string, content: MeaningContent) =>
    prisma.$transaction(async (tx) => {
        const existing = await tx.termMeaning.findUnique({ where: { id: meaningId }, select: { id: true, termId: true } });
        if (!existing) throw new TermMeaningError(404, 'Significado nao encontrado.');
        await ensureGame(content.gameId, tx);
        const meaning = await tx.termMeaning.update({ where: { id: meaningId }, data: toPrismaData(content) });
        await syncTermFromMeanings(existing.termId, tx);
        return meaning;
    });

export const deleteTermMeaning = async (meaningId: string) =>
    prisma.$transaction(async (tx) => {
        const existing = await tx.termMeaning.findUnique({ where: { id: meaningId }, select: { id: true, termId: true } });
        if (!existing) throw new TermMeaningError(404, 'Significado nao encontrado.');
        const remaining = await tx.termMeaning.count({ where: { termId: existing.termId } });
        if (remaining <= 1) throw new TermMeaningError(400, 'Um termo precisa manter ao menos um significado.');
        await tx.termMeaning.delete({ where: { id: meaningId } });
        await syncTermFromMeanings(existing.termId, tx);
    });

export const listPendingMeanings = () =>
    prisma.termMeaning.findMany({
        where: { status: TermStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        include: {
            term: { select: { id: true, word: true } },
            game: { select: { id: true, name: true } },
            author: { select: { id: true, name: true, avatar: true, level: true } },
        },
    });
