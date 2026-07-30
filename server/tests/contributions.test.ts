import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ContributionRejectionReason,
    NotificationEmailStatus,
    TermModerationEventType,
    TermStatus
} from '@prisma/client';

const mocks = vi.hoisted(() => ({
    gameFindUnique: vi.fn(),
    termCreate: vi.fn(),
    termFindFirst: vi.fn(),
    termFindUnique: vi.fn(),
    termFindUniqueOrThrow: vi.fn(),
    termUpdateMany: vi.fn(),
    meaningCreate: vi.fn(),
    meaningUpdate: vi.fn(),
    meaningUpdateMany: vi.fn(),
    meaningFindFirst: vi.fn(),
    meaningFindMany: vi.fn(),
    termUpdate: vi.fn(),
    eventCreate: vi.fn(),
    notificationCreate: vi.fn(),
    notificationUpdate: vi.fn(),
    userUpdate: vi.fn(),
    auditCreate: vi.fn(),
    sendEmail: vi.fn(),
    emitNotification: vi.fn(),
    emitQueueUpdate: vi.fn()
    ,rateLimitUpsert: vi.fn()
    ,queryRaw: vi.fn()
    ,executeRaw: vi.fn()
}));

vi.mock('../src/lib/prisma', () => {
    const prisma: any = {
        game: { findUnique: mocks.gameFindUnique },
        term: {
            create: mocks.termCreate,
            findFirst: mocks.termFindFirst,
            findUnique: mocks.termFindUnique,
            findUniqueOrThrow: mocks.termFindUniqueOrThrow,
            updateMany: mocks.termUpdateMany,
            update: mocks.termUpdate
        },
        // A contribution now seeds the term's first sense and moves it along with
        // the term's moderation status.
        termMeaning: {
            create: mocks.meaningCreate,
            update: mocks.meaningUpdate,
            updateMany: mocks.meaningUpdateMany,
            findFirst: mocks.meaningFindFirst,
            findMany: mocks.meaningFindMany
        },
        termModerationEvent: { create: mocks.eventCreate },
        notification: { create: mocks.notificationCreate, update: mocks.notificationUpdate },
        user: { update: mocks.userUpdate },
        adminAuditLog: { create: mocks.auditCreate }
        ,rateLimitBucket: { upsert: mocks.rateLimitUpsert }
        ,$queryRaw: mocks.queryRaw
        ,$executeRaw: mocks.executeRaw
    };
    prisma.$transaction = vi.fn(async (callback: any) => callback(prisma));
    return { prisma };
});

vi.mock('../src/services/email', () => ({
    sendContributionDecisionEmail: mocks.sendEmail
}));

vi.mock('../src/services/realtime', () => ({
    emitUserNotification: mocks.emitNotification,
    emitContributionQueueUpdate: mocks.emitQueueUpdate
}));

import {
    ContributionError,
    createContribution,
    moderateContribution,
    updateOwnContribution
} from '../src/services/contributions';

const content = {
    word: 'Gank',
    definition: 'Emboscada coordenada contra um adversario.',
    gameId: 'game-1',
    examples: ['O jungler preparou um gank.'],
    tags: ['Estrategia']
};

const baseTerm = {
    id: 'term-1',
    ...content,
    status: TermStatus.PENDING,
    revision: 1,
    authorId: 'user-1',
    upvotes: 0,
    downvotes: 0,
    phonetic: null,
    pronunciationGuide: null,
    relatedTerms: null,
    moderatedAt: null,
    createdAt: new Date('2026-07-14T12:00:00.000Z'),
    updatedAt: new Date('2026-07-14T12:00:00.000Z'),
    game: { id: 'game-1', name: 'League of Legends', slug: 'lol' },
    moderationEvents: []
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.gameFindUnique.mockResolvedValue({ id: 'game-1' });
    mocks.termUpdateMany.mockResolvedValue({ count: 1 });
    mocks.eventCreate.mockResolvedValue({ id: 'event-1' });
    mocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
    mocks.notificationUpdate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue(true);
    mocks.queryRaw.mockResolvedValue([]);
    mocks.executeRaw.mockResolvedValue(1);
    mocks.meaningCreate.mockResolvedValue({ id: 'meaning-1' });
    mocks.meaningUpdate.mockResolvedValue({ id: 'meaning-1' });
    mocks.meaningUpdateMany.mockResolvedValue({ count: 1 });
    mocks.meaningFindFirst.mockResolvedValue({ id: 'meaning-1' });
    mocks.meaningFindMany.mockResolvedValue([]);
    mocks.rateLimitUpsert.mockResolvedValue({ count: 1 });
    mocks.termUpdate.mockResolvedValue({ id: 'term-1' });
});

describe('contribution lifecycle', () => {
    it('creates one pending Term and an immutable submitted event', async () => {
        mocks.termCreate.mockResolvedValue(baseTerm);
        mocks.termFindUniqueOrThrow.mockResolvedValue(baseTerm);

        const result = await createContribution('user-1', content);

        expect(result.status).toBe(TermStatus.PENDING);
        expect(mocks.termCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ authorId: 'user-1', status: TermStatus.PENDING, revision: 1 })
        }));
        expect(mocks.eventCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                termId: 'term-1',
                actorId: 'user-1',
                type: TermModerationEventType.SUBMITTED,
                toStatus: TermStatus.PENDING,
                revision: 1
            })
        });
    });

    it('rejects a sixth contribution inside the account window before creating content', async () => {
        mocks.rateLimitUpsert.mockResolvedValue({ count: 6 });

        await expect(createContribution('user-1', content)).rejects.toMatchObject<Partial<ContributionError>>({
            statusCode: 429,
            code: 'CONTRIBUTION_ACCOUNT_RATE_LIMITED',
        });
        expect(mocks.termCreate).not.toHaveBeenCalled();
        expect(mocks.eventCreate).not.toHaveBeenCalled();
    });

    it('turns requested changes back into pending when the author resubmits', async () => {
        mocks.termFindFirst.mockResolvedValue({ ...baseTerm, status: TermStatus.CHANGES_REQUESTED });
        mocks.termFindUniqueOrThrow.mockResolvedValue({ ...baseTerm, revision: 2 });

        await updateOwnContribution({
            termId: 'term-1',
            authorId: 'user-1',
            expectedRevision: 1,
            content: { ...content, definition: 'Definicao corrigida e mais detalhada.' }
        });

        expect(mocks.termUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: TermStatus.PENDING, revision: { increment: 1 } })
        }));
        expect(mocks.eventCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: TermModerationEventType.RESUBMITTED,
                fromStatus: TermStatus.CHANGES_REQUESTED,
                toStatus: TermStatus.PENDING,
                revision: 2
            })
        });
    });

    it('returns a conflict before writing when the author has a stale revision', async () => {
        mocks.termFindFirst.mockResolvedValue({ ...baseTerm, revision: 3 });

        await expect(updateOwnContribution({
            termId: 'term-1',
            authorId: 'user-1',
            expectedRevision: 2,
            content
        })).rejects.toMatchObject<Partial<ContributionError>>({ statusCode: 409 });
        expect(mocks.termUpdateMany).not.toHaveBeenCalled();
        expect(mocks.eventCreate).not.toHaveBeenCalled();
    });

    it('approves transactionally, grants XP once and creates a persisted notification', async () => {
        mocks.termFindUnique.mockResolvedValue({
            ...baseTerm,
            author: { id: 'user-1', name: 'Player', email: 'player@example.com', preferences: { emailNotifications: true } }
        });
        mocks.userUpdate
            .mockResolvedValueOnce({ id: 'user-1', xp: 50, level: 1, badges: [] })
            .mockResolvedValueOnce({ id: 'user-1', xp: 50, level: 1, badges: [] });
        mocks.notificationCreate.mockResolvedValue({
            id: 'notification-1', userId: 'user-1', termId: 'term-1',
            type: 'CONTRIBUTION_APPROVED', title: 'Contribuicao aprovada', message: 'Aprovada',
            link: '/minhas-contribuicoes/term-1', data: {}, readAt: null,
            emailStatus: NotificationEmailStatus.PENDING, emailSentAt: null, emailError: null,
            createdAt: new Date(), updatedAt: new Date()
        });
        mocks.termFindUniqueOrThrow.mockResolvedValue({ ...baseTerm, status: TermStatus.APPROVED });

        const result = await moderateContribution({
            termId: 'term-1', moderatorId: 'admin-1', expectedRevision: 1, action: 'APPROVE'
        });

        expect(result.status).toBe(TermStatus.APPROVED);
        expect(mocks.userUpdate).toHaveBeenCalledTimes(2);
        expect(mocks.eventCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ type: TermModerationEventType.APPROVED, internalNote: null })
        });
        expect(mocks.notificationCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ emailStatus: NotificationEmailStatus.PENDING })
        });
        expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
        expect(mocks.emitNotification).toHaveBeenCalledTimes(1);
        expect(mocks.notificationUpdate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ emailStatus: NotificationEmailStatus.SENT })
        }));
    });

    it('stores rejection reason and internal note while notifying with only the author message', async () => {
        mocks.termFindUnique.mockResolvedValue({
            ...baseTerm,
            author: { id: 'user-1', name: 'Player', email: 'player@example.com', preferences: {} }
        });
        mocks.notificationCreate.mockResolvedValue({
            id: 'notification-2', userId: 'user-1', termId: 'term-1',
            type: 'CONTRIBUTION_REJECTED', title: 'Contribuicao rejeitada', message: 'Ja existe no catalogo.',
            link: '/minhas-contribuicoes/term-1', data: {}, readAt: null,
            emailStatus: NotificationEmailStatus.PENDING, emailSentAt: null, emailError: null,
            createdAt: new Date(), updatedAt: new Date()
        });
        mocks.termFindUniqueOrThrow.mockResolvedValue({ ...baseTerm, status: TermStatus.REJECTED });

        await moderateContribution({
            termId: 'term-1', moderatorId: 'admin-1', expectedRevision: 1,
            action: 'REJECT', authorMessage: 'Este termo ja existe no catalogo.',
            internalNote: 'Comparado com o registro principal.',
            rejectionReason: ContributionRejectionReason.DUPLICATE
        });

        expect(mocks.eventCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                rejectionReason: ContributionRejectionReason.DUPLICATE,
                internalNote: 'Comparado com o registro principal.'
            })
        });
        expect(mocks.notificationCreate).toHaveBeenCalledWith({
            data: expect.not.objectContaining({ internalNote: expect.anything() })
        });
        expect(mocks.sendEmail).toHaveBeenCalledWith(expect.not.objectContaining({
            message: expect.stringContaining('Comparado')
        }));
    });

    it('does not approve an already approved contribution or duplicate XP', async () => {
        mocks.termFindUnique.mockResolvedValue({
            ...baseTerm,
            status: TermStatus.APPROVED,
            author: { id: 'user-1', name: 'Player', email: 'player@example.com', preferences: {} }
        });

        await expect(moderateContribution({
            termId: 'term-1', moderatorId: 'admin-1', expectedRevision: 1, action: 'APPROVE'
        })).rejects.toMatchObject<Partial<ContributionError>>({ statusCode: 409 });
        expect(mocks.userUpdate).not.toHaveBeenCalled();
        expect(mocks.notificationCreate).not.toHaveBeenCalled();
    });

    it('always persists the in-app notification and skips email when disabled', async () => {
        mocks.termFindUnique.mockResolvedValue({
            ...baseTerm,
            author: { id: 'user-1', name: 'Player', email: 'player@example.com', preferences: { emailNotifications: false } }
        });
        mocks.notificationCreate.mockResolvedValue({
            id: 'notification-3', userId: 'user-1', termId: 'term-1',
            type: 'CONTRIBUTION_CHANGES_REQUESTED', title: 'Revisao solicitada', message: 'Inclua um exemplo pratico.',
            link: '/minhas-contribuicoes/term-1', data: {}, readAt: null,
            emailStatus: NotificationEmailStatus.SKIPPED, emailSentAt: null, emailError: null,
            createdAt: new Date(), updatedAt: new Date()
        });
        mocks.termFindUniqueOrThrow.mockResolvedValue({ ...baseTerm, status: TermStatus.CHANGES_REQUESTED });

        await moderateContribution({
            termId: 'term-1', moderatorId: 'admin-1', expectedRevision: 1,
            action: 'REQUEST_CHANGES', authorMessage: 'Inclua um exemplo pratico.'
        });

        expect(mocks.notificationCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ emailStatus: NotificationEmailStatus.SKIPPED })
        });
        expect(mocks.emitNotification).toHaveBeenCalledTimes(1);
        expect(mocks.sendEmail).not.toHaveBeenCalled();
    });
});
