import express, { Router } from 'express';
import { AddressInfo } from 'net';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    bestFindMany: vi.fn(),
    bestCount: vi.fn(),
    bestFindUnique: vi.fn(),
    bestFindUniqueOrThrow: vi.fn(),
    runDeleteMany: vi.fn(),
    runCreate: vi.fn(),
    runFindFirst: vi.fn(),
    runUpdateMany: vi.fn(),
    executeRaw: vi.fn(),
    transaction: vi.fn()
}));

vi.mock('../src/utils/config', () => ({ JWT_SECRET: 'brick-breaker-test-secret' }));
vi.mock('../src/lib/prisma', () => {
    const tx = {
        brickBreakerRun: { updateMany: mocks.runUpdateMany },
        brickBreakerBestScore: { findUniqueOrThrow: mocks.bestFindUniqueOrThrow },
        $executeRaw: mocks.executeRaw
    };
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    return {
        prisma: {
            brickBreakerBestScore: {
                findMany: mocks.bestFindMany,
                count: mocks.bestCount,
                findUnique: mocks.bestFindUnique
            },
            brickBreakerRun: {
                deleteMany: mocks.runDeleteMany,
                create: mocks.runCreate,
                findFirst: mocks.runFindFirst
            },
            $transaction: mocks.transaction
        }
    };
});
vi.mock('../src/middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: () => void) => {
        req.user = { id: 'user-1', role: 'USER' };
        next();
    },
    optionalAuthenticateToken: (req: any, _res: any, next: () => void) => {
        if (req.headers['x-test-user']) req.user = { id: 'user-1', role: 'USER' };
        next();
    }
}));

import arcadeRouter from '../src/routes/arcade';
import {
    isBetterBrickBreakerScore,
    signBrickBreakerRunToken,
    validateBrickBreakerScore,
    verifyBrickBreakerRunToken
} from '../src/services/brickBreaker';

const request = async (
    router: Router,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    headers?: Record<string, string>
) => {
    const app = express();
    app.use(express.json());
    app.use(router);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
        const address = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? JSON.stringify(body) : undefined
        });
        return { response, body: await response.json() };
    } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: any) => unknown) => callback({
        brickBreakerRun: { updateMany: mocks.runUpdateMany },
        brickBreakerBestScore: { findUniqueOrThrow: mocks.bestFindUniqueOrThrow },
        $executeRaw: mocks.executeRaw
    }));
});

describe('Brick Breaker score rules', () => {
    it('accepts plausible brick progress and derives the level', () => {
        const now = new Date();
        const startedAt = new Date(now.getTime() - 60_000);
        expect(validateBrickBreakerScore(
            { score: 2_400, bricksDestroyed: 24, level: 1, durationMs: 55_000 },
            startedAt,
            now
        )).toEqual({ score: 2_400, bricksDestroyed: 24, level: 1, durationMs: 55_000 });
    });

    it('rejects mismatched levels, impossible durations and inflated scores', () => {
        const now = new Date();
        const startedAt = new Date(now.getTime() - 60_000);
        expect(() => validateBrickBreakerScore(
            { score: 2_400, bricksDestroyed: 24, level: 2, durationMs: 55_000 },
            startedAt,
            now
        )).toThrow(/Nivel/);
        expect(() => validateBrickBreakerScore(
            { score: 2_400, bricksDestroyed: 24, level: 1, durationMs: 90_000 },
            startedAt,
            now
        )).toThrow(/Duracao/);
        expect(() => validateBrickBreakerScore(
            { score: 9_000_000, bricksDestroyed: 0, level: 1, durationMs: 55_000 },
            startedAt,
            now
        )).toThrow(/Pontuacao/);
    });

    it('uses destroyed bricks and shorter duration as stable tie breakers', () => {
        const current = { score: 1_000, bricksDestroyed: 10, level: 1, durationMs: 60_000 };
        expect(isBetterBrickBreakerScore({ ...current, bricksDestroyed: 11 }, current)).toBe(true);
        expect(isBetterBrickBreakerScore({ ...current, durationMs: 50_000 }, current)).toBe(true);
        expect(isBetterBrickBreakerScore({ ...current, durationMs: 70_000 }, current)).toBe(false);
    });

    it('signs a one-user run and refuses a modified token', () => {
        const token = signBrickBreakerRunToken({ runId: 'run-1', userId: 'user-1' });
        expect(verifyBrickBreakerRunToken(token)).toEqual({ runId: 'run-1', userId: 'user-1' });
        expect(() => verifyBrickBreakerRunToken(`${token}x`)).toThrow(/invalida/);
    });
});

describe('Brick Breaker API', () => {
    it('returns a public top 20 leaderboard', async () => {
        mocks.bestFindMany.mockResolvedValue([{
            userId: 'user-2',
            user: { id: 'user-2', name: 'Player Two', avatar: null },
            score: 2_400,
            bricksDestroyed: 24,
            level: 1,
            durationMs: 50_000,
            achievedAt: new Date('2026-07-26T12:00:00Z')
        }]);
        mocks.bestCount.mockResolvedValue(1);
        const { response, body } = await request(arcadeRouter, 'GET', '/brick-breaker/leaderboard');
        expect(response.status).toBe(200);
        expect(body.items[0]).toMatchObject({ rank: 1, score: 2_400, bricksDestroyed: 24, user: { id: 'user-2' } });
        expect(body.totalPlayers).toBe(1);
    });

    it('starts an authenticated, signed run', async () => {
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + 2 * 60 * 60 * 1000);
        mocks.runDeleteMany.mockResolvedValue({ count: 0 });
        mocks.runCreate.mockResolvedValue({ id: 'run-1', userId: 'user-1', startedAt, expiresAt });
        const { response, body } = await request(arcadeRouter, 'POST', '/brick-breaker/runs');
        expect(response.status).toBe(201);
        expect(verifyBrickBreakerRunToken(body.runToken)).toEqual({ runId: 'run-1', userId: 'user-1' });
    });

    it('claims a run once and stores only the best score transactionally', async () => {
        const now = Date.now();
        const token = signBrickBreakerRunToken({ runId: 'run-1', userId: 'user-1' });
        mocks.runFindFirst.mockResolvedValue({
            id: 'run-1',
            userId: 'user-1',
            startedAt: new Date(now - 60_000),
            expiresAt: new Date(now + 60_000),
            completedAt: null
        });
        mocks.runUpdateMany.mockResolvedValue({ count: 1 });
        mocks.executeRaw.mockResolvedValue(1);
        mocks.bestFindUniqueOrThrow.mockResolvedValue({
            id: 'best-1',
            userId: 'user-1',
            score: 2_400,
            bricksDestroyed: 24,
            level: 1,
            durationMs: 55_000
        });

        const { response, body } = await request(arcadeRouter, 'POST', '/brick-breaker/scores', {
            runToken: token,
            score: 2_400,
            bricksDestroyed: 24,
            level: 1,
            durationMs: 55_000
        });

        expect(response.status).toBe(200);
        expect(body.isPersonalBest).toBe(true);
        expect(mocks.runUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ id: 'run-1', userId: 'user-1', completedAt: null })
        }));
    });

    it('rejects an already consumed run', async () => {
        const token = signBrickBreakerRunToken({ runId: 'run-1', userId: 'user-1' });
        mocks.runFindFirst.mockResolvedValue(null);
        const { response } = await request(arcadeRouter, 'POST', '/brick-breaker/scores', {
            runToken: token,
            score: 0,
            bricksDestroyed: 0,
            level: 1,
            durationMs: 1_000
        });
        expect(response.status).toBe(409);
    });
});
