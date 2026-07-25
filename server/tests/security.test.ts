import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), recordUserActivity: vi.fn() }));

vi.mock('../src/lib/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
vi.mock('../src/services/analytics/activity', () => ({ recordUserActivity: mocks.recordUserActivity }));
vi.mock('../src/utils/config', () => ({ JWT_SECRET: 'segredo-de-teste' }));

import jwt from 'jsonwebtoken';
import { authenticatedUser } from '../src/middleware/auth';
import { requireAdmin } from '../src/middleware/roles';

const SECRET = 'segredo-de-teste';
const activeUser = { id: 'u1', role: 'USER', sessionVersion: 3, anonymizedAt: null };
const sign = (payload: object) => jwt.sign(payload, SECRET);

beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue(activeUser);
});

describe('requireAdmin', () => {
    const run = (user: unknown) => {
        const res: any = { statusCode: 0, body: null };
        res.status = (code: number) => { res.statusCode = code; return res; };
        res.json = (body: unknown) => { res.body = body; return res; };
        const next = vi.fn();
        requireAdmin({ user } as any, res, next);
        return { res, next };
    };

    it('rejects an unauthenticated caller', () => {
        const { res, next } = run(undefined);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a signed-in regular user — this is the BFLA guard', () => {
        const { res, next } = run({ id: 'u1', role: 'USER' });
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('does not accept a role that merely looks like admin', () => {
        for (const role of ['admin', 'ADMIN ', 'SUPERADMIN', '', null]) {
            expect(run({ id: 'u1', role }).next).not.toHaveBeenCalled();
        }
    });

    it('lets a real admin through', () => {
        const { next } = run({ id: 'u1', role: 'ADMIN' });
        expect(next).toHaveBeenCalled();
    });
});

describe('token verification', () => {
    it('accepts a well-formed token', async () => {
        const token = sign({ userId: 'u1', sessionVersion: 3 });
        await expect(authenticatedUser(token)).resolves.toMatchObject({ id: 'u1' });
    });

    it('refuses a token signed with a different secret', async () => {
        const forged = jwt.sign({ userId: 'u1', sessionVersion: 3 }, 'outro-segredo');
        await expect(authenticatedUser(forged)).rejects.toThrow();
    });

    it('refuses an unsigned "alg: none" token', async () => {
        // The classic forgery: drop the signature and claim the token needs none.
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(JSON.stringify({ userId: 'u1', sessionVersion: 3 })).toString('base64url');
        await expect(authenticatedUser(`${header}.${body}.`)).rejects.toThrow();
    });

    it('refuses a token whose sessionVersion is stale — this is what logout-everywhere relies on', async () => {
        mocks.findUnique.mockResolvedValue({ ...activeUser, sessionVersion: 4 });
        await expect(authenticatedUser(sign({ userId: 'u1', sessionVersion: 3 }))).resolves.toBeNull();
    });

    it('treats a missing sessionVersion claim as version 0, not as a pass', async () => {
        await expect(authenticatedUser(sign({ userId: 'u1' }))).resolves.toBeNull();
    });

    it('refuses a token belonging to an anonymized (LGPD-erased) account', async () => {
        mocks.findUnique.mockResolvedValue({ ...activeUser, anonymizedAt: new Date() });
        await expect(authenticatedUser(sign({ userId: 'u1', sessionVersion: 3 }))).resolves.toBeNull();
    });

    it('refuses a token for a user that no longer exists', async () => {
        mocks.findUnique.mockResolvedValue(null);
        await expect(authenticatedUser(sign({ userId: 'u1', sessionVersion: 3 }))).resolves.toBeNull();
    });
});
