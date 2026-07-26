import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest, optionalAuthenticateToken } from '../middleware/auth';
import {
    signBrickBreakerRunToken,
    BRICK_BREAKER_RUN_LIFETIME_MS,
    BRICK_BREAKER_RUN_RETENTION_MS,
    BrickBreakerScoreError,
    validateBrickBreakerScore,
    verifyBrickBreakerRunToken
} from '../services/brickBreaker';

const router = Router();
const scoreOrder = [
    { score: 'desc' as const },
    { bricksDestroyed: 'desc' as const },
    { durationMs: 'asc' as const },
    { achievedAt: 'asc' as const },
    { userId: 'asc' as const }
];

const runLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitas partidas iniciadas em pouco tempo. Tente novamente mais tarde.' }
});

const scoreLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Muitos resultados enviados em pouco tempo. Tente novamente mais tarde.' }
});

const leaderboardEntry = (item: any, rank: number) => ({
    rank,
    user: {
        id: item.user.id,
        name: item.user.name,
        avatar: item.user.avatar
    },
    score: item.score,
    bricksDestroyed: item.bricksDestroyed,
    level: item.level,
    durationMs: item.durationMs,
    achievedAt: item.achievedAt
});

router.get('/brick-breaker/leaderboard', optionalAuthenticateToken, async (req: AuthRequest, res) => {
    try {
        const where = { user: { anonymizedAt: null } };
        const [scores, totalPlayers, myScore] = await Promise.all([
            prisma.brickBreakerBestScore.findMany({
                where,
                include: { user: { select: { id: true, name: true, avatar: true } } },
                orderBy: scoreOrder,
                take: 20
            }),
            prisma.brickBreakerBestScore.count({ where }),
            req.user
                ? prisma.brickBreakerBestScore.findUnique({
                    where: { userId: req.user.id },
                    include: { user: { select: { id: true, name: true, avatar: true } } }
                })
                : Promise.resolve(null)
        ]);

        const items = scores.map((item, index) => leaderboardEntry(item, index + 1));
        let me = null;
        if (myScore) {
            const visible = items.find((item) => item.user.id === myScore.userId);
            if (visible) {
                me = visible;
            } else {
                const better = await prisma.brickBreakerBestScore.count({
                    where: {
                        user: { anonymizedAt: null },
                        OR: [
                            { score: { gt: myScore.score } },
                            { score: myScore.score, bricksDestroyed: { gt: myScore.bricksDestroyed } },
                            { score: myScore.score, bricksDestroyed: myScore.bricksDestroyed, durationMs: { lt: myScore.durationMs } },
                            { score: myScore.score, bricksDestroyed: myScore.bricksDestroyed, durationMs: myScore.durationMs, achievedAt: { lt: myScore.achievedAt } },
                            {
                                score: myScore.score,
                                bricksDestroyed: myScore.bricksDestroyed,
                                durationMs: myScore.durationMs,
                                achievedAt: myScore.achievedAt,
                                userId: { lt: myScore.userId }
                            }
                        ]
                    }
                });
                me = leaderboardEntry(myScore, better + 1);
            }
        }

        res.json({ items, me, totalPlayers });
    } catch (error) {
        console.error('[arcade:brick-breaker] Failed to load leaderboard:', error);
        res.status(500).json({ error: 'Nao foi possivel carregar o placar.' });
    }
});

router.post('/brick-breaker/runs', runLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + BRICK_BREAKER_RUN_LIFETIME_MS);
        await prisma.brickBreakerRun.deleteMany({
            where: { expiresAt: { lt: new Date(now.getTime() - BRICK_BREAKER_RUN_RETENTION_MS) } }
        });
        const run = await prisma.brickBreakerRun.create({
            data: { userId: req.user!.id, expiresAt }
        });
        const runToken = signBrickBreakerRunToken({ runId: run.id, userId: req.user!.id });
        res.status(201).json({ runToken, startedAt: run.startedAt, expiresAt });
    } catch (error) {
        console.error('[arcade:brick-breaker] Failed to start run:', error);
        res.status(500).json({ error: 'Nao foi possivel conectar esta partida ao placar.' });
    }
});

router.post('/brick-breaker/scores', scoreLimiter, authenticateToken, async (req: AuthRequest, res) => {
    try {
        const identity = verifyBrickBreakerRunToken(req.body?.runToken);
        if (identity.userId !== req.user!.id) throw new BrickBreakerScoreError('Esta sessao pertence a outro usuario.');

        const now = new Date();
        const run = await prisma.brickBreakerRun.findFirst({
            where: {
                id: identity.runId,
                userId: req.user!.id,
                completedAt: null,
                expiresAt: { gt: now }
            }
        });
        if (!run) throw new BrickBreakerScoreError('Partida expirada ou resultado ja enviado.', 409);
        const result = validateBrickBreakerScore(req.body, run.startedAt, now);

        const stored = await prisma.$transaction(async (tx) => {
            const claimed = await tx.brickBreakerRun.updateMany({
                where: {
                    id: run.id,
                    userId: req.user!.id,
                    completedAt: null,
                    expiresAt: { gt: now }
                },
                data: { completedAt: now, ...result }
            });
            if (claimed.count !== 1) throw new BrickBreakerScoreError('Resultado ja processado.', 409);

            const changed = await tx.$executeRaw`
                INSERT INTO "BrickBreakerBestScore"
                    ("id", "userId", "score", "bricksDestroyed", "level", "durationMs", "achievedAt", "createdAt", "updatedAt")
                VALUES
                    (${crypto.randomUUID()}, ${req.user!.id}, ${result.score}, ${result.bricksDestroyed}, ${result.level}, ${result.durationMs}, ${now}, ${now}, ${now})
                ON CONFLICT ("userId") DO UPDATE SET
                    "score" = EXCLUDED."score",
                    "bricksDestroyed" = EXCLUDED."bricksDestroyed",
                    "level" = EXCLUDED."level",
                    "durationMs" = EXCLUDED."durationMs",
                    "achievedAt" = EXCLUDED."achievedAt",
                    "updatedAt" = EXCLUDED."updatedAt"
                WHERE
                    EXCLUDED."score" > "BrickBreakerBestScore"."score"
                    OR (
                        EXCLUDED."score" = "BrickBreakerBestScore"."score"
                        AND EXCLUDED."bricksDestroyed" > "BrickBreakerBestScore"."bricksDestroyed"
                    )
                    OR (
                        EXCLUDED."score" = "BrickBreakerBestScore"."score"
                        AND EXCLUDED."bricksDestroyed" = "BrickBreakerBestScore"."bricksDestroyed"
                        AND EXCLUDED."durationMs" < "BrickBreakerBestScore"."durationMs"
                    )
            `;
            const bestScore = await tx.brickBreakerBestScore.findUniqueOrThrow({ where: { userId: req.user!.id } });
            return { bestScore, isPersonalBest: Number(changed) > 0 };
        });

        res.json(stored);
    } catch (error) {
        if (error instanceof BrickBreakerScoreError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('[arcade:brick-breaker] Failed to submit score:', error);
        res.status(500).json({ error: 'Nao foi possivel salvar o resultado.' });
    }
});

export default router;
