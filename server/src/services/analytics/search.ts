import { Prisma, TermViewSource } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { createSearchToken, hashSearchQuery, parseSearchOrigin, sanitizeSearchQuery, verifySearchToken } from './privacy';
import { engagementBucket } from './viewerIdentity';

export interface SearchCaptureInput {
    query: string;
    origin?: unknown;
    gameId?: string;
    tag?: string;
    letter?: string;
    sort?: string;
    resultCount: number;
}

export const captureInternalSearch = async (input: SearchCaptureInput) => {
    const normalizedQuery = sanitizeSearchQuery(input.query);
    if (!normalizedQuery) return null;

    const event = await prisma.internalSearchEvent.create({
        data: {
            queryHash: hashSearchQuery(input.query),
            normalizedQuery,
            origin: parseSearchOrigin(input.origin),
            gameId: input.gameId || null,
            tag: input.tag?.slice(0, 40) || null,
            letter: input.letter?.slice(0, 1) || null,
            sort: input.sort?.slice(0, 30) || null,
            resultCount: Math.max(0, input.resultCount),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        select: { id: true },
    });
    return createSearchToken(event.id);
};

const viewSource = (value: unknown): TermViewSource => {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase().replace(/-/g, '_') : '';
    return Object.values(TermViewSource).includes(normalized as TermViewSource)
        ? normalized as TermViewSource
        : TermViewSource.UNKNOWN;
};

export const recordTermViewWithSearch = async (input: {
    termId: string;
    viewerHash: string;
    source?: unknown;
    searchToken?: unknown;
    position?: unknown;
    now?: Date;
}) => {
    const searchEventId = typeof input.searchToken === 'string' ? verifySearchToken(input.searchToken) : null;
    const numericPosition = Number(input.position);
    const openedPosition = Number.isInteger(numericPosition) && numericPosition > 0 && numericPosition <= 10000
        ? numericPosition
        : null;

    const now = input.now || new Date();
    const dedupeBucket = engagementBucket(now);

    return prisma.$transaction(async (tx) => {
        let validSearchEventId: string | null = null;
        if (searchEventId) {
            const event = await tx.internalSearchEvent.findFirst({
                where: { id: searchEventId, expiresAt: { gt: now } },
                select: { id: true, openedAt: true },
            });
            if (event) {
                validSearchEventId = event.id;
                if (!event.openedAt) {
                    await tx.internalSearchEvent.update({
                        where: { id: event.id },
                        data: { openedAt: now, openedTermId: input.termId, openedPosition },
                    });
                }
            }
        }

        return tx.termView.upsert({
            where: {
                termId_viewerHash_dedupeBucket: {
                    termId: input.termId,
                    viewerHash: input.viewerHash,
                    dedupeBucket,
                },
            },
            update: {},
            create: {
                termId: input.termId,
                source: viewSource(input.source),
                viewerHash: input.viewerHash,
                dedupeBucket,
                searchEventId: validSearchEventId,
            },
        });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
};

export const redactExpiredSearchText = () => prisma.internalSearchEvent.updateMany({
    where: { normalizedQuery: { not: null }, createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    data: { normalizedQuery: null },
});

