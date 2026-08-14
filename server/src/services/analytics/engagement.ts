import { prisma } from '../../lib/prisma';
import { engagementBucket } from './viewerIdentity';

const shareMethod = (value: unknown) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['native', 'clipboard'].includes(normalized) ? normalized : 'unknown';
};

export const recordTermShare = (input: {
    termId: string;
    viewerHash: string;
    method?: unknown;
    now?: Date;
}) => {
    const now = input.now || new Date();
    const dedupeBucket = engagementBucket(now);
    return prisma.termShare.upsert({
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
            viewerHash: input.viewerHash,
            dedupeBucket,
            method: shareMethod(input.method),
        },
    });
};
