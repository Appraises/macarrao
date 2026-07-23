import express, { Router } from 'express';
import { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations))
}));

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        notification: {
            findMany: mocks.findMany,
            count: mocks.count,
            updateMany: mocks.updateMany,
            findUnique: mocks.findUnique
        },
        $transaction: mocks.transaction
    }
}));

vi.mock('../src/middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: () => void) => {
        req.user = { id: 'user-1', role: 'USER' };
        next();
    }
}));

import usersRouter from '../src/routes/users';

const request = async (router: Router, method: 'GET' | 'PATCH', path: string) => {
    const app = express();
    app.use(express.json());
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
        const address = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method });
        return { response, body: await response.json() };
    } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
};

beforeEach(() => vi.clearAllMocks());

describe('user notifications', () => {
    it('returns only the authenticated user notifications with unread count', async () => {
        mocks.findMany.mockResolvedValue([{ id: 'notification-1', userId: 'user-1', readAt: null }]);
        mocks.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

        const { response, body } = await request(usersRouter, 'GET', '/me/notifications?page=1&pageSize=20');

        expect(response.status).toBe(200);
        expect(body.unreadCount).toBe(1);
        expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'user-1' },
            skip: 0,
            take: 20
        }));
    });

    it('marks a notification as read only when it belongs to the user', async () => {
        mocks.updateMany.mockResolvedValue({ count: 1 });
        mocks.findUnique.mockResolvedValue({ id: 'notification-1', userId: 'user-1', readAt: new Date() });

        const { response } = await request(usersRouter, 'PATCH', '/me/notifications/notification-1/read');

        expect(response.status).toBe(200);
        expect(mocks.updateMany).toHaveBeenCalledWith({
            where: { id: 'notification-1', userId: 'user-1' },
            data: { readAt: expect.any(Date) }
        });
    });

    it('marks all unread notifications for the authenticated user', async () => {
        mocks.updateMany.mockResolvedValue({ count: 3 });

        const { response, body } = await request(usersRouter, 'PATCH', '/me/notifications/read-all');

        expect(response.status).toBe(200);
        expect(body.updated).toBe(3);
        expect(mocks.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', readAt: null },
            data: { readAt: expect.any(Date) }
        });
    });
});
