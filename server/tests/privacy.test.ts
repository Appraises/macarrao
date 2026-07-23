import express, { Router } from 'express';
import { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivacyRequestStatus, PrivacyRequestType } from '@prisma/client';

const mocks = vi.hoisted(() => ({
    privacyFindFirst: vi.fn(),
    privacyFindUnique: vi.fn(),
    privacyFindMany: vi.fn(),
    privacyCount: vi.fn(),
    privacyUpdate: vi.fn(),
    privacyUpdateMany: vi.fn(),
    privacyCreate: vi.fn(),
    eventCreate: vi.fn(),
    userFindUnique: vi.fn(),
    userFindFirst: vi.fn(),
    userCount: vi.fn(),
    userUpdate: vi.fn(),
    voteFindMany: vi.fn(),
    voteDeleteMany: vi.fn(),
    termFindUnique: vi.fn(),
    termUpdate: vi.fn(),
    reportUpdateMany: vi.fn(),
    notificationDeleteMany: vi.fn(),
    auditCreate: vi.fn(),
    sendStatusEmail: vi.fn()
}));

vi.mock('../src/lib/prisma', () => {
    const prisma: any = {
        privacyRequest: {
            findFirst: mocks.privacyFindFirst,
            findUnique: mocks.privacyFindUnique,
            findMany: mocks.privacyFindMany,
            count: mocks.privacyCount,
            update: mocks.privacyUpdate,
            updateMany: mocks.privacyUpdateMany,
            create: mocks.privacyCreate
        },
        privacyRequestEvent: { create: mocks.eventCreate },
        user: {
            findUnique: mocks.userFindUnique,
            findFirst: mocks.userFindFirst,
            count: mocks.userCount,
            update: mocks.userUpdate
        },
        termVote: { findMany: mocks.voteFindMany, deleteMany: mocks.voteDeleteMany },
        term: { findUnique: mocks.termFindUnique, update: mocks.termUpdate },
        report: { updateMany: mocks.reportUpdateMany },
        notification: { deleteMany: mocks.notificationDeleteMany },
        adminAuditLog: { create: mocks.auditCreate }
    };
    prisma.$transaction = vi.fn(async (input: any) => Array.isArray(input) ? Promise.all(input) : input(prisma));
    return { prisma };
});

vi.mock('../src/services/email', () => ({
    sendPrivacyRequestStatusEmail: mocks.sendStatusEmail,
    sendPrivacyRequestConfirmationEmail: vi.fn()
}));

import privacyRouter from '../src/routes/admin/privacy';
import { buildUserDataExport, createPrivacyConfirmation, createPrivacyProtocol, hashPrivacyToken } from '../src/services/privacy';

const request = async (router: Router, method: 'GET' | 'PATCH' | 'POST', path: string, body?: unknown) => {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
        req.user = { id: 'admin-id', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' };
        next();
    });
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
        const address = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
        const responseBody = response.status === 204 ? null : await response.json();
        return { response, body: responseBody };
    } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
};

const baseRequest = {
    id: 'privacy-1',
    protocol: 'DG-20260713-ABC12345',
    type: PrivacyRequestType.DELETE,
    status: PrivacyRequestStatus.CONFIRMED,
    userId: 'user-1',
    requesterEmail: 'person@example.com',
    requestNote: null,
    confirmationToken: null,
    confirmationExpiresAt: null,
    confirmedAt: new Date('2026-07-13T12:00:00.000Z'),
    dueAt: new Date('2026-07-28T12:00:00.000Z'),
    assignedToId: null,
    assignedTo: null,
    resolutionNote: null,
    completedAt: null,
    canceledAt: null,
    createdAt: new Date('2026-07-13T11:00:00.000Z'),
    updatedAt: new Date('2026-07-13T12:00:00.000Z'),
    user: { id: 'user-1', name: 'Pessoa', email: 'person@example.com', role: 'USER', anonymizedAt: null }
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventCreate.mockResolvedValue({ id: 'event-1' });
    mocks.auditCreate.mockResolvedValue({ id: 'audit-1' });
    mocks.sendStatusEmail.mockResolvedValue(true);
    mocks.userCount.mockResolvedValue(2);
    mocks.userUpdate.mockResolvedValue({});
    mocks.voteFindMany.mockResolvedValue([]);
    mocks.voteDeleteMany.mockResolvedValue({ count: 0 });
    mocks.reportUpdateMany.mockResolvedValue({ count: 0 });
    mocks.privacyFindMany.mockResolvedValue([]);
    mocks.privacyCount.mockResolvedValue(0);
    mocks.privacyUpdateMany.mockResolvedValue({ count: 1 });
});

describe('privacy request primitives', () => {
    it('stores only a hash for confirmation tokens', () => {
        const confirmation = createPrivacyConfirmation();
        expect(confirmation.token).toHaveLength(64);
        expect(confirmation.hash).toBe(hashPrivacyToken(confirmation.token));
        expect(confirmation.hash).not.toBe(confirmation.token);
        expect(confirmation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('generates non-identifying protocols', () => {
        expect(createPrivacyProtocol()).toMatch(/^DG-\d{8}-[A-F0-9]{8}$/);
    });

    it('exports explicit user fields without credentials or session tokens', async () => {
        mocks.userFindUnique.mockResolvedValue({
            id: 'user-1',
            name: 'Pessoa',
            email: 'person@example.com',
            role: 'USER',
            terms: [],
            comments: [],
            contributions: [],
            termVotes: [],
            privacyRequests: []
        });

        const result = await buildUserDataExport('user-1');
        const call = mocks.userFindUnique.mock.calls[0][0];
        expect(result?.format).toBe('dicionario-gamer-user-export');
        expect(call.select.password).toBeUndefined();
        expect(call.select.sessionVersion).toBeUndefined();
        expect(call.select.verificationToken).toBeUndefined();
        expect(call.select.resetPasswordToken).toBeUndefined();
        expect(JSON.stringify(result)).not.toContain('password');
    });
});

describe('administrative privacy workflow', () => {
    it('returns a paginated and searchable queue', async () => {
        mocks.privacyFindMany.mockResolvedValue([baseRequest]);
        mocks.privacyCount.mockResolvedValue(1);

        const { response, body } = await request(privacyRouter, 'GET', '/?page=1&pageSize=10&search=DG-2026&status=CONFIRMED');

        expect(response.status).toBe(200);
        expect(body.pagination.total).toBe(1);
        expect(mocks.privacyFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
        expect(mocks.privacyCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'CONFIRMED', OR: expect.any(Array) }) }));
    });

    it('rejects status jumps that bypass titular confirmation', async () => {
        mocks.privacyFindUnique.mockResolvedValue({ ...baseRequest, status: PrivacyRequestStatus.REQUESTED });

        const { response, body } = await request(privacyRouter, 'PATCH', '/privacy-1', { status: 'PROCESSING' });

        expect(response.status).toBe(409);
        expect(body.error).toContain('nao permitida');
        expect(mocks.privacyUpdate).not.toHaveBeenCalled();
    });

    it('anonymizes account data, invalidates sessions and removes identifiable votes on completion', async () => {
        mocks.privacyFindUnique.mockResolvedValue(baseRequest);
        mocks.privacyFindMany.mockResolvedValue([{ id: baseRequest.id, protocol: baseRequest.protocol }]);
        mocks.voteFindMany.mockResolvedValue([{ termId: 'term-1', value: 1 }]);
        mocks.termFindUnique.mockResolvedValue({ upvotes: 4, downvotes: 2 });
        mocks.termUpdate.mockResolvedValue({});
        mocks.privacyUpdate.mockImplementation(async ({ data }: any) => data.status === PrivacyRequestStatus.COMPLETED
            ? { ...baseRequest, ...data, assignedToId: 'admin-id', status: PrivacyRequestStatus.COMPLETED }
            : { ...baseRequest, ...data });

        const { response, body } = await request(privacyRouter, 'POST', '/privacy-1/complete', { resolutionNote: 'Conta anonimizada conforme pedido confirmado.' });

        expect(response.status).toBe(200);
        expect(body.status).toBe('COMPLETED');
        expect(mocks.voteDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
        expect(mocks.termUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { upvotes: 3, downvotes: 2 } }));
        expect(mocks.reportUpdateMany).toHaveBeenCalledWith({ where: { reporterId: 'user-1' }, data: { reporterId: null } });
        expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            data: expect.objectContaining({
                name: 'Usuario removido',
                email: expect.stringMatching(/^deleted\+dg-/),
                role: 'USER',
                avatar: null,
                verificationToken: null,
                resetPasswordToken: null,
                sessionVersion: { increment: 1 },
                anonymizedAt: expect.any(Date)
            })
        }));
        expect(mocks.sendStatusEmail).toHaveBeenCalledWith('person@example.com', 'Pessoa', baseRequest.protocol, 'concluida', expect.any(String));
        expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ANONYMIZE_ACCOUNT' }) }));
    });

    it('keeps terminal requests immutable', async () => {
        mocks.privacyFindUnique.mockResolvedValue({ ...baseRequest, status: PrivacyRequestStatus.COMPLETED, completedAt: new Date() });

        const { response, body } = await request(privacyRouter, 'PATCH', '/privacy-1', { assignedToId: 'admin-id' });

        expect(response.status).toBe(409);
        expect(body.error).toContain('encerradas');
        expect(mocks.privacyUpdate).not.toHaveBeenCalled();
    });
});
