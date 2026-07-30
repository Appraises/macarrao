import crypto from 'crypto';
import { Prisma, PrivacyRequestStatus, PrivacyRequestType } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const hashPrivacyToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const createPrivacyConfirmation = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: hashPrivacyToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
};

export const createPrivacyProtocol = () => {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DG-${day}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const privacyRequestPublicSelect = {
    id: true,
    protocol: true,
    type: true,
    status: true,
    requestNote: true,
    confirmedAt: true,
    dueAt: true,
    resolutionNote: true,
    completedAt: true,
    canceledAt: true,
    createdAt: true,
    updatedAt: true
} satisfies Prisma.PrivacyRequestSelect;

export const addPrivacyEvent = (
    requestId: string,
    eventType: string,
    message: string,
    actorId?: string | null,
    metadata?: Prisma.InputJsonValue,
    client: Pick<Prisma.TransactionClient, 'privacyRequestEvent'> | typeof prisma = prisma
) => client.privacyRequestEvent.create({
    data: {
        requestId,
        actorId: actorId || null,
        eventType,
        message,
        ...(metadata !== undefined ? { metadata } : {})
    }
});

export const buildUserDataExport = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            level: true,
            xp: true,
            badges: true,
            avatar: true,
            emailVerified: true,
            preferences: true,
            termsAcceptedAt: true,
            termsVersion: true,
            privacyAcknowledgedAt: true,
            privacyVersion: true,
            botVerifiedAt: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            favoriteGame: { select: { id: true, name: true, slug: true } },
            terms: {
                orderBy: { createdAt: 'asc' },
                include: {
                    game: { select: { id: true, name: true, slug: true } },
                    moderationEvents: {
                        orderBy: { createdAt: 'asc' },
                        select: {
                            type: true,
                            fromStatus: true,
                            toStatus: true,
                            revision: true,
                            authorMessage: true,
                            rejectionReason: true,
                            snapshot: true,
                            createdAt: true
                        }
                    }
                }
            },
            comments: { orderBy: { createdAt: 'asc' } },
            notifications: {
                orderBy: { createdAt: 'asc' },
                select: {
                    type: true,
                    title: true,
                    message: true,
                    link: true,
                    readAt: true,
                    clickedAt: true,
                    emailStatus: true,
                    emailSentAt: true,
                    createdAt: true
                }
            },
            activityDays: {
                orderBy: { date: 'asc' },
                select: { date: true, firstSeenAt: true, lastSeenAt: true, loginCount: true, requestCount: true }
            },
            brickBreakerBestScore: {
                select: {
                    score: true,
                    bricksDestroyed: true,
                    level: true,
                    durationMs: true,
                    achievedAt: true,
                    createdAt: true,
                    updatedAt: true
                }
            },
            brickBreakerRuns: {
                orderBy: { startedAt: 'desc' },
                take: 50,
                select: {
                    startedAt: true,
                    expiresAt: true,
                    completedAt: true,
                    score: true,
                    bricksDestroyed: true,
                    level: true,
                    durationMs: true
                }
            },
            termVotes: {
                orderBy: { createdAt: 'asc' },
                include: { term: { select: { id: true, word: true } } }
            },
            privacyRequests: {
                orderBy: { createdAt: 'asc' },
                select: {
                    ...privacyRequestPublicSelect,
                    events: {
                        orderBy: { createdAt: 'asc' },
                        select: { eventType: true, message: true, createdAt: true }
                    }
                }
            }
        }
    });

    if (!user) return null;
    return {
        format: 'dicionario-gamer-user-export',
        version: 2,
        generatedAt: new Date().toISOString(),
        dataSubject: user
    };
};

export const activePrivacyStatuses: PrivacyRequestStatus[] = [
    PrivacyRequestStatus.REQUESTED,
    PrivacyRequestStatus.CONFIRMED,
    PrivacyRequestStatus.IN_REVIEW,
    PrivacyRequestStatus.PROCESSING
];

const confirmationRequiredTypes: PrivacyRequestType[] = [
    PrivacyRequestType.DELETE,
    PrivacyRequestType.ANONYMIZATION,
    PrivacyRequestType.CORRECTION
];

export const requiresConfirmation = (type: PrivacyRequestType) => confirmationRequiredTypes.includes(type);
