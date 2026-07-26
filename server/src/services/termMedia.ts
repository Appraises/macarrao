import { Prisma, TermMediaKind, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cleanPlainText } from '../utils/content';
import { removeUploadedMedia, resolveMediaUrl, storeImage } from './media';
import { screenImage } from './imageModeration';

export class TermMediaError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'TermMediaError';
    }
}

type Tx = Prisma.TransactionClient;

/**
 * Who may curate a term's contributed media: the term author plus the authors of its
 * approved meanings. Admins bypass this entirely. A term with no such authors (e.g.
 * admin-seeded) falls to admin only.
 */
export const getTermCurators = async (termId: string, tx: Tx = prisma): Promise<Set<string>> => {
    const term = await tx.term.findUnique({
        where: { id: termId },
        select: { authorId: true, meanings: { where: { status: TermStatus.APPROVED }, select: { authorId: true } } },
    });
    const ids = new Set<string>();
    if (term?.authorId) ids.add(term.authorId);
    term?.meanings.forEach((m) => { if (m.authorId) ids.add(m.authorId); });
    return ids;
};

const assertCanCurate = async (termId: string, userId: string, isAdmin: boolean, tx: Tx = prisma) => {
    if (isAdmin) return;
    const curators = await getTermCurators(termId, tx);
    if (!curators.has(userId)) throw new TermMediaError(403, 'Apenas quem contribuiu com este termo pode curar suas midias.');
};

/** Denormalize the approved origin note onto the term (or clear it). */
export const syncTermOrigin = async (termId: string, tx: Tx = prisma) => {
    const latest = await tx.termMedia.findFirst({
        where: { termId, kind: TermMediaKind.ORIGIN, status: TermStatus.APPROVED },
        orderBy: { updatedAt: 'desc' },
        select: { content: true },
    });
    await tx.term.update({ where: { id: termId }, data: { origin: latest?.content ?? null } });
};

/* --------------------------------- Origin --------------------------------- */

export const proposeOrigin = async (termId: string, authorId: string, rawContent: unknown) => {
    const content = cleanPlainText(rawContent);
    if (content.length < 15) throw new TermMediaError(400, 'A origem deve ter pelo menos 15 caracteres.');
    if (content.length > 1500) throw new TermMediaError(400, 'A origem deve ter no maximo 1500 caracteres.');

    return prisma.$transaction(async (tx) => {
        const term = await tx.term.findFirst({
            where: { id: termId, status: TermStatus.APPROVED, archivedAt: null },
            select: { id: true, originHidden: true },
        });
        if (!term) throw new TermMediaError(404, 'Termo nao encontrado.');
        if (term.originHidden) throw new TermMediaError(400, 'Este termo esta marcado como sem origem.');

        const pending = await tx.termMedia.findFirst({
            where: { termId, kind: TermMediaKind.ORIGIN, authorId, status: TermStatus.PENDING },
            select: { id: true },
        });
        if (pending) throw new TermMediaError(409, 'Voce ja tem uma origem aguardando curadoria para este termo.');

        return tx.termMedia.create({ data: { termId, authorId, kind: TermMediaKind.ORIGIN, content, status: TermStatus.PENDING } });
    });
};

/** Curator (or admin) marks a term as needing no origin — hides the whole panel. */
export const setOriginHidden = async (termId: string, userId: string, isAdmin: boolean, hidden: boolean) =>
    prisma.$transaction(async (tx) => {
        const term = await tx.term.findFirst({ where: { id: termId, archivedAt: null }, select: { id: true } });
        if (!term) throw new TermMediaError(404, 'Termo nao encontrado.');
        await assertCanCurate(termId, userId, isAdmin, tx);
        await tx.term.update({ where: { id: termId }, data: { originHidden: hidden } });
    });

/* --------------------------------- Images --------------------------------- */

export const submitImage = async (
    termId: string,
    authorId: string,
    file: Express.Multer.File,
    rawCaption: unknown,
    baseUrl: string,
) => {
    const term = await prisma.term.findFirst({
        where: { id: termId, status: TermStatus.APPROVED, archivedAt: null },
        select: { id: true },
    });
    if (!term) throw new TermMediaError(404, 'Termo nao encontrado.');

    const caption = cleanPlainText(rawCaption).slice(0, 140) || null;

    // Pre-screen BEFORE persisting: a flagged image is held for admin, not the owner.
    const screen = await screenImage(file.buffer, file.mimetype);

    const stored = await storeImage(file, 'terms');
    if (!stored) throw new TermMediaError(400, 'Use uma imagem PNG, JPEG, GIF ou WebP valida.');

    return prisma.termMedia.create({
        data: {
            termId,
            authorId,
            kind: TermMediaKind.IMAGE,
            url: resolveMediaUrl(stored.pathname, baseUrl),
            content: caption,
            status: TermStatus.PENDING,
            flagged: !screen.safe,
            flagReason: screen.safe ? null : screen.reason ?? null,
        },
    });
};

/* ------------------------------- Moderation ------------------------------- */

// Images live on disk; text-only origins have nothing to clean.
const deleteMediaFile = (media: { kind: TermMediaKind; url: string | null }) => {
    if (media.kind === TermMediaKind.IMAGE) return removeUploadedMedia(media.url, 'terms');
    return Promise.resolve();
};

export const acceptMedia = async (mediaId: string, userId: string, isAdmin: boolean) =>
    prisma.$transaction(async (tx) => {
        const media = await tx.termMedia.findUnique({ where: { id: mediaId }, select: { id: true, termId: true, kind: true, flagged: true } });
        if (!media) throw new TermMediaError(404, 'Midia nao encontrada.');
        // Flagged items are admin-only; owners never handle potentially unsafe images.
        if (media.flagged && !isAdmin) throw new TermMediaError(403, 'Esta imagem esta em revisao da moderacao.');
        await assertCanCurate(media.termId, userId, isAdmin, tx);
        const updated = await tx.termMedia.update({ where: { id: mediaId }, data: { status: TermStatus.APPROVED, flagged: false } });
        // Keeping the media resolves whatever was reported against it.
        await tx.report.updateMany({ where: { mediaId, status: 'PENDING' }, data: { status: 'DISMISSED' } });
        if (media.kind === TermMediaKind.ORIGIN) await syncTermOrigin(media.termId, tx);
        return updated;
    });

const MEDIA_REPORT_REASONS = ['ofensivo', 'irrelevante', 'spam', 'direitos', 'outro'];

/**
 * Report a published image/origin. Anyone may report (logged in or not). The item is
 * flagged so it surfaces in the admin queue; it stays visible until a moderator acts,
 * since a single report must not be enough to hide someone else's contribution.
 */
export const reportMedia = async (mediaId: string, reason: string, rawDetails: unknown, reporterId?: string) => {
    if (!MEDIA_REPORT_REASONS.includes(reason)) throw new TermMediaError(400, 'Motivo invalido.');
    return prisma.$transaction(async (tx) => {
        const media = await tx.termMedia.findFirst({
            where: { id: mediaId, status: TermStatus.APPROVED },
            select: { id: true, termId: true },
        });
        if (!media) throw new TermMediaError(404, 'Midia nao encontrada.');

        if (reporterId) {
            const existing = await tx.report.findFirst({ where: { mediaId, reporterId, status: 'PENDING' }, select: { id: true } });
            if (existing) throw new TermMediaError(409, 'Voce ja denunciou esta imagem.');
        }

        const report = await tx.report.create({
            data: {
                termId: media.termId,
                mediaId,
                reason,
                details: cleanPlainText(rawDetails).slice(0, 500) || null,
                reporterId: reporterId ?? null,
            },
        });
        await tx.termMedia.update({ where: { id: mediaId }, data: { flagged: true, flagReason: `reportado:${reason}` } });
        return report;
    });
};

export const declineMedia = async (mediaId: string, userId: string, isAdmin: boolean) => {
    const result = await prisma.$transaction(async (tx) => {
        const media = await tx.termMedia.findUnique({ where: { id: mediaId }, select: { id: true, termId: true, kind: true, url: true, flagged: true, status: true } });
        if (!media) throw new TermMediaError(404, 'Midia nao encontrada.');
        if (media.flagged && !isAdmin) throw new TermMediaError(403, 'Esta imagem esta em revisao da moderacao.');
        await assertCanCurate(media.termId, userId, isAdmin, tx);
        await tx.termMedia.delete({ where: { id: mediaId } });
        if (media.status === TermStatus.APPROVED && media.kind === TermMediaKind.ORIGIN) await syncTermOrigin(media.termId, tx);
        return media;
    });
    await deleteMediaFile(result); // remove the file outside the transaction
    return { removed: true };
};

/* --------------------------------- Reads ---------------------------------- */

export const listApprovedImages = (termId: string) =>
    prisma.termMedia.findMany({
        where: { termId, kind: TermMediaKind.IMAGE, status: TermStatus.APPROVED },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, url: true, content: true, author: { select: { id: true, name: true, avatar: true } } },
    });

const pendingInclude = {
    term: { select: { id: true, word: true } },
    author: { select: { id: true, name: true, avatar: true, level: true } },
} as const;

/** Media a given user may curate: pending, unflagged, on terms they own. */
export const listPendingForCurator = (userId: string) =>
    prisma.termMedia.findMany({
        where: {
            status: TermStatus.PENDING,
            flagged: false,
            term: { OR: [{ authorId: userId }, { meanings: { some: { status: TermStatus.APPROVED, authorId: userId } } }] },
        },
        orderBy: { createdAt: 'asc' },
        include: pendingInclude,
    });

/**
 * Curation view for one term from the viewer's angle: whether they may curate it,
 * and the items awaiting them. Owners never see flagged images (admin-only).
 */
export const getCurationView = async (termId: string, userId: string, isAdmin: boolean) => {
    const curators = await getTermCurators(termId);
    const canCurate = isAdmin || curators.has(userId);
    if (!canCurate) return { canCurate: false, pending: [] as unknown[] };
    const pending = await prisma.termMedia.findMany({
        where: { termId, status: TermStatus.PENDING, ...(isAdmin ? {} : { flagged: false }) },
        orderBy: [{ flagged: 'desc' }, { createdAt: 'asc' }],
        include: pendingInclude,
    });
    return { canCurate: true, pending };
};

/**
 * The admin queue: everything still pending (including SafeSearch-flagged) plus
 * already-published media that someone reported, which only an admin can take down.
 */
export const listPendingForAdmin = () =>
    prisma.termMedia.findMany({
        where: {
            OR: [
                { status: TermStatus.PENDING },
                { status: TermStatus.APPROVED, reports: { some: { status: 'PENDING' } } },
            ],
        },
        orderBy: [{ flagged: 'desc' }, { createdAt: 'asc' }],
        include: {
            ...pendingInclude,
            reports: {
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
                select: { id: true, reason: true, details: true, createdAt: true },
            },
        },
    });
