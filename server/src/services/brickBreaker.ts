import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config';

export const BRICK_BREAKER_RUN_AUDIENCE = 'brick-breaker-score';
export const BRICK_BREAKER_RUN_ISSUER = 'dicionario-gamer';
export const BRICK_BREAKER_RUN_LIFETIME_MS = 2 * 60 * 60 * 1000;
export const BRICK_BREAKER_RUN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const BRICKS_PER_LEVEL = 48;

export interface BrickBreakerScoreInput {
    score: number;
    bricksDestroyed: number;
    level: number;
    durationMs: number;
}

export interface BrickBreakerRunIdentity {
    runId: string;
    userId: string;
}

export class BrickBreakerScoreError extends Error {
    constructor(message: string, public readonly statusCode = 400) {
        super(message);
    }
}

const integer = (value: unknown, name: string, min: number, max: number) => {
    if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
        throw new BrickBreakerScoreError(`${name} invalido.`);
    }
    return Number(value);
};

export const validateBrickBreakerScore = (
    payload: unknown,
    startedAt: Date,
    now = new Date()
): BrickBreakerScoreInput => {
    if (!payload || typeof payload !== 'object') throw new BrickBreakerScoreError('Resultado invalido.');
    const input = payload as Record<string, unknown>;
    const score = integer(input.score, 'score', 0, 100_000_000);
    const bricksDestroyed = integer(input.bricksDestroyed, 'bricksDestroyed', 0, 50_000);
    const level = integer(input.level, 'level', 1, 1_042);
    const durationMs = integer(input.durationMs, 'durationMs', 1_000, BRICK_BREAKER_RUN_LIFETIME_MS);

    if (level !== Math.floor(bricksDestroyed / BRICKS_PER_LEVEL) + 1) {
        throw new BrickBreakerScoreError('Nivel incompativel com os tijolos destruidos.');
    }

    const elapsedMs = now.getTime() - startedAt.getTime();
    if (elapsedMs < 0 || durationMs > elapsedMs + 10_000) {
        throw new BrickBreakerScoreError('Duracao incompativel com a sessao.');
    }

    const maximumPlausibleBricks = Math.floor(durationMs / 120) + BRICKS_PER_LEVEL;
    if (bricksDestroyed > maximumPlausibleBricks) {
        throw new BrickBreakerScoreError('Quantidade de tijolos incompativel com a duracao.');
    }

    const maximumScore = bricksDestroyed * Math.max(1, level) * 100;
    if (score > maximumScore) {
        throw new BrickBreakerScoreError('Pontuacao incompativel com a partida.');
    }

    return { score, bricksDestroyed, level, durationMs };
};

export const isBetterBrickBreakerScore = (
    candidate: BrickBreakerScoreInput,
    current: BrickBreakerScoreInput | null | undefined
) => {
    if (!current) return true;
    if (candidate.score !== current.score) return candidate.score > current.score;
    if (candidate.bricksDestroyed !== current.bricksDestroyed) {
        return candidate.bricksDestroyed > current.bricksDestroyed;
    }
    return candidate.durationMs < current.durationMs;
};

export const signBrickBreakerRunToken = (identity: BrickBreakerRunIdentity) => jwt.sign(
    {},
    JWT_SECRET,
    {
        algorithm: 'HS256',
        audience: BRICK_BREAKER_RUN_AUDIENCE,
        issuer: BRICK_BREAKER_RUN_ISSUER,
        subject: identity.userId,
        jwtid: identity.runId,
        expiresIn: Math.floor(BRICK_BREAKER_RUN_LIFETIME_MS / 1000)
    }
);

export const verifyBrickBreakerRunToken = (token: unknown): BrickBreakerRunIdentity => {
    if (typeof token !== 'string' || !token) throw new BrickBreakerScoreError('Sessao de jogo obrigatoria.');
    try {
        const payload = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            audience: BRICK_BREAKER_RUN_AUDIENCE,
            issuer: BRICK_BREAKER_RUN_ISSUER
        });
        if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
            throw new BrickBreakerScoreError('Sessao de jogo invalida.');
        }
        return { userId: payload.sub, runId: payload.jti };
    } catch (error) {
        if (error instanceof BrickBreakerScoreError) throw error;
        throw new BrickBreakerScoreError('Sessao de jogo invalida ou expirada.');
    }
};
