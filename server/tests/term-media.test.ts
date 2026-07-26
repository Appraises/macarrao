import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TermMediaKind, TermStatus } from '@prisma/client';

const mocks = vi.hoisted(() => ({
    termFindUnique: vi.fn(),
    termFindFirst: vi.fn(),
    termUpdate: vi.fn(),
    mediaFindFirst: vi.fn(),
    mediaFindUnique: vi.fn(),
    mediaFindMany: vi.fn(),
    mediaCreate: vi.fn(),
    mediaUpdate: vi.fn(),
    mediaDelete: vi.fn(),
    reportCreate: vi.fn(),
    reportFindFirst: vi.fn(),
    reportUpdateMany: vi.fn(),
    storeImage: vi.fn(),
    removeUploadedMedia: vi.fn(),
    screenImage: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => {
    const prisma: any = {
        term: { findUnique: mocks.termFindUnique, findFirst: mocks.termFindFirst, update: mocks.termUpdate },
        termMedia: {
            findFirst: mocks.mediaFindFirst,
            findUnique: mocks.mediaFindUnique,
            findMany: mocks.mediaFindMany,
            create: mocks.mediaCreate,
            update: mocks.mediaUpdate,
            delete: mocks.mediaDelete,
        },
        report: { create: mocks.reportCreate, findFirst: mocks.reportFindFirst, updateMany: mocks.reportUpdateMany },
    };
    prisma.$transaction = vi.fn(async (callback: any) => callback(prisma));
    return { prisma };
});

vi.mock('../src/services/media', () => ({
    storeImage: mocks.storeImage,
    removeUploadedMedia: mocks.removeUploadedMedia,
    // Local driver behaviour: a relative path gets the API origin in front.
    resolveMediaUrl: (pathname: string, baseUrl: string) =>
        /^https?:\/\//.test(pathname) ? pathname : `${baseUrl}${pathname}`,
}));

vi.mock('../src/services/imageModeration', () => ({ screenImage: mocks.screenImage }));

import {
    acceptMedia,
    declineMedia,
    getTermCurators,
    proposeOrigin,
    reportMedia,
    setOriginHidden,
    submitImage,
    syncTermOrigin,
    TermMediaError,
} from '../src/services/termMedia';

const file = { buffer: Buffer.from('fake'), mimetype: 'image/png' } as any;

beforeEach(() => {
    vi.clearAllMocks();
    mocks.termUpdate.mockResolvedValue({ id: 'term-1' });
    mocks.screenImage.mockResolvedValue({ safe: true });
    mocks.storeImage.mockResolvedValue({ pathname: '/uploads/terms/a.png', mimeType: 'image/png', size: 10 });
    mocks.mediaCreate.mockResolvedValue({ id: 'media-1', status: TermStatus.PENDING });
    mocks.removeUploadedMedia.mockResolvedValue(undefined);
    mocks.reportUpdateMany.mockResolvedValue({ count: 0 });
});

describe('who may curate a term', () => {
    it('includes the term author and the authors of approved senses', async () => {
        mocks.termFindUnique.mockResolvedValue({
            authorId: 'owner',
            meanings: [{ authorId: 'sense-author' }, { authorId: null }],
        });

        const curators = await getTermCurators('term-1');

        expect(curators).toEqual(new Set(['owner', 'sense-author']));
    });

    it('is empty for an admin-seeded term, so only admins can curate it', async () => {
        mocks.termFindUnique.mockResolvedValue({ authorId: null, meanings: [] });

        expect(await getTermCurators('term-1')).toEqual(new Set());
    });
});

describe('origin notes', () => {
    it('rejects a note shorter than the minimum', async () => {
        await expect(proposeOrigin('term-1', 'user-1', 'curto')).rejects.toMatchObject({ status: 400 });
    });

    it('refuses when the term is marked as needing no origin', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1', originHidden: true });

        await expect(proposeOrigin('term-1', 'user-1', 'Uma explicacao suficientemente longa da origem.'))
            .rejects.toMatchObject({ status: 400 });
    });

    it('blocks a second pending note from the same author', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1', originHidden: false });
        mocks.mediaFindFirst.mockResolvedValue({ id: 'pending' });

        await expect(proposeOrigin('term-1', 'user-1', 'Uma explicacao suficientemente longa da origem.'))
            .rejects.toMatchObject({ status: 409 });
    });

    it('denormalizes the approved note onto the term, and clears it when gone', async () => {
        mocks.mediaFindFirst.mockResolvedValueOnce({ content: 'Vem do tenis.' });
        await syncTermOrigin('term-1');
        expect(mocks.termUpdate.mock.calls[0][0].data).toEqual({ origin: 'Vem do tenis.' });

        mocks.mediaFindFirst.mockResolvedValueOnce(null);
        await syncTermOrigin('term-1');
        expect(mocks.termUpdate.mock.calls[1][0].data).toEqual({ origin: null });
    });
});

describe('images', () => {
    it('is held PENDING so nothing unreviewed is ever public', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });

        await submitImage('term-1', 'user-1', file, 'legenda', 'http://api');

        const data = mocks.mediaCreate.mock.calls[0][0].data;
        expect(data.status).toBe(TermStatus.PENDING);
        expect(data.flagged).toBe(false);
        expect(data.url).toBe('http://api/uploads/terms/a.png');
    });

    it('routes a SafeSearch-flagged image to admins instead of the term owner', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });
        mocks.screenImage.mockResolvedValue({ safe: false, reason: 'adult:VERY_LIKELY' });

        await submitImage('term-1', 'user-1', file, null, 'http://api');

        const data = mocks.mediaCreate.mock.calls[0][0].data;
        expect(data.flagged).toBe(true);
        expect(data.flagReason).toBe('adult:VERY_LIKELY');
    });

    it('rejects a file the image detector does not recognise', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });
        mocks.storeImage.mockResolvedValue(null);

        await expect(submitImage('term-1', 'user-1', file, null, 'http://api'))
            .rejects.toMatchObject({ status: 400 });
    });
});

describe('curation permissions', () => {
    it('refuses a user who did not contribute to the term', async () => {
        mocks.mediaFindUnique.mockResolvedValue({ id: 'm', termId: 'term-1', kind: TermMediaKind.IMAGE, flagged: false });
        mocks.termFindUnique.mockResolvedValue({ authorId: 'owner', meanings: [] });

        await expect(acceptMedia('m', 'estranho', false)).rejects.toMatchObject({ status: 403 });
    });

    it('lets the term owner accept', async () => {
        mocks.mediaFindUnique.mockResolvedValue({ id: 'm', termId: 'term-1', kind: TermMediaKind.IMAGE, flagged: false });
        mocks.termFindUnique.mockResolvedValue({ authorId: 'owner', meanings: [] });
        mocks.mediaUpdate.mockResolvedValue({ id: 'm', status: TermStatus.APPROVED });

        await acceptMedia('m', 'owner', false);

        expect(mocks.mediaUpdate.mock.calls[0][0].data).toMatchObject({ status: TermStatus.APPROVED, flagged: false });
    });

    it('keeps a flagged image away from the owner — admin only', async () => {
        mocks.mediaFindUnique.mockResolvedValue({ id: 'm', termId: 'term-1', kind: TermMediaKind.IMAGE, flagged: true });

        await expect(acceptMedia('m', 'owner', false)).rejects.toMatchObject({ status: 403 });
    });

    it('deletes the file from disk when an image is declined', async () => {
        mocks.mediaFindUnique.mockResolvedValue({
            id: 'm', termId: 'term-1', kind: TermMediaKind.IMAGE,
            url: 'http://api/uploads/terms/a.png', flagged: false, status: TermStatus.PENDING,
        });
        mocks.termFindUnique.mockResolvedValue({ authorId: 'owner', meanings: [] });

        await declineMedia('m', 'owner', false);

        expect(mocks.mediaDelete).toHaveBeenCalledWith({ where: { id: 'm' } });
        expect(mocks.removeUploadedMedia).toHaveBeenCalledWith('http://api/uploads/terms/a.png', 'terms');
    });

    it('only admins may hide the origin panel of a term they do not own', async () => {
        mocks.termFindFirst.mockResolvedValue({ id: 'term-1' });
        mocks.termFindUnique.mockResolvedValue({ authorId: 'owner', meanings: [] });

        await expect(setOriginHidden('term-1', 'estranho', false, true)).rejects.toMatchObject({ status: 403 });

        await setOriginHidden('term-1', 'quem-quer-que-seja', true, true);
        expect(mocks.termUpdate).toHaveBeenCalledWith({ where: { id: 'term-1' }, data: { originHidden: true } });
    });
});

describe('reporting published media', () => {
    it('flags the item but leaves it visible — one report must not take content down', async () => {
        mocks.mediaFindFirst.mockResolvedValue({ id: 'm', termId: 'term-1' });
        mocks.reportFindFirst.mockResolvedValue(null);
        mocks.reportCreate.mockResolvedValue({ id: 'r1', status: 'PENDING' });

        await reportMedia('m', 'ofensivo', 'detalhe', 'user-1');

        expect(mocks.mediaUpdate.mock.calls[0][0].data).toMatchObject({ flagged: true });
        // status stays APPROVED — nothing sets it back to PENDING
        expect(mocks.mediaUpdate.mock.calls[0][0].data.status).toBeUndefined();
    });

    it('rejects an unknown reason', async () => {
        await expect(reportMedia('m', 'motivo-inventado', null, 'user-1')).rejects.toMatchObject({ status: 400 });
    });

    it('stops the same signed-in user from reporting twice', async () => {
        mocks.mediaFindFirst.mockResolvedValue({ id: 'm', termId: 'term-1' });
        mocks.reportFindFirst.mockResolvedValue({ id: 'existing' });

        await expect(reportMedia('m', 'spam', null, 'user-1')).rejects.toMatchObject({ status: 409 });
    });

    it('dismisses open reports when a moderator keeps the item', async () => {
        mocks.mediaFindUnique.mockResolvedValue({ id: 'm', termId: 'term-1', kind: TermMediaKind.IMAGE, flagged: true });
        mocks.mediaUpdate.mockResolvedValue({ id: 'm', status: TermStatus.APPROVED });

        await acceptMedia('m', 'admin', true);

        expect(mocks.reportUpdateMany).toHaveBeenCalledWith({
            where: { mediaId: 'm', status: 'PENDING' },
            data: { status: 'DISMISSED' },
        });
    });
});
