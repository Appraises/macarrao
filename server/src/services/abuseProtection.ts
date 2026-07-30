import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
    ABUSE_HASH_SECRET,
    BOT_NEW_ACCOUNT_HOURS,
    BOT_TRUST_MINUTES,
    CONTRIBUTION_ACCOUNT_LIMIT,
    CONTRIBUTION_ACCOUNT_WINDOW_MINUTES,
    CONTRIBUTION_CHALLENGE_THRESHOLD,
    CONTRIBUTION_DAILY_CHALLENGE_THRESHOLD,
    CONTRIBUTION_IP_LIMIT,
    CONTRIBUTION_IP_WINDOW_MINUTES,
    TURNSTILE_ENABLED,
} from '../utils/config';

type RateLimitClient = Pick<Prisma.TransactionClient, 'rateLimitBucket'> | typeof prisma;
export type BotProtectionReason =
    | 'DISABLED'
    | 'RECENTLY_VERIFIED'
    | 'NEW_ACCOUNT'
    | 'ACCELERATED_ACTIVITY'
    | 'DAILY_ACTIVITY'
    | 'NOT_REQUIRED';

const hashSubject = (scope: string, subject: string) =>
    crypto.createHmac('sha256', ABUSE_HASH_SECRET).update(`${scope}:${subject}`).digest('hex');

const windowStart = (now: Date, windowMs: number) =>
    new Date(Math.floor(now.getTime() / windowMs) * windowMs);

export const consumeRateLimit = async (input: {
    scope: string;
    subject: string;
    limit: number;
    windowMs: number;
    client?: RateLimitClient;
    now?: Date;
}) => {
    const now = input.now || new Date();
    const startedAt = windowStart(now, input.windowMs);
    const expiresAt = new Date(startedAt.getTime() + input.windowMs);
    const subjectHash = hashSubject(input.scope, input.subject);
    const client = input.client || prisma;
    const bucket = await client.rateLimitBucket.upsert({
        where: {
            scope_subjectHash_windowStartedAt: {
                scope: input.scope,
                subjectHash,
                windowStartedAt: startedAt,
            },
        },
        create: {
            scope: input.scope,
            subjectHash,
            windowStartedAt: startedAt,
            count: 1,
            expiresAt,
        },
        update: {
            count: { increment: 1 },
            expiresAt,
        },
        select: { count: true },
    });

    return {
        allowed: bucket.count <= input.limit,
        count: bucket.count,
        limit: input.limit,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    };
};

export const consumeContributionIpAttempt = (ip: string, now?: Date) =>
    consumeRateLimit({
        scope: 'CONTRIBUTION_IP',
        subject: ip || 'unknown',
        limit: CONTRIBUTION_IP_LIMIT,
        windowMs: CONTRIBUTION_IP_WINDOW_MINUTES * 60_000,
        now,
    });

export const consumeContributionAccountSlot = (
    userId: string,
    client: RateLimitClient,
    now?: Date,
) => consumeRateLimit({
    scope: 'CONTRIBUTION_ACCOUNT',
    subject: userId,
    limit: CONTRIBUTION_ACCOUNT_LIMIT,
    windowMs: CONTRIBUTION_ACCOUNT_WINDOW_MINUTES * 60_000,
    client,
    now,
});

export const resolveContributionProtection = (input: {
    enabled: boolean;
    createdAt: Date;
    botVerifiedAt: Date | null;
    recentContributions: number;
    dailyContributions: number;
    now?: Date;
    trustMinutes?: number;
    newAccountHours?: number;
    recentThreshold?: number;
    dailyThreshold?: number;
}): {
    enabled: boolean;
    challengeRequired: boolean;
    trustExpiresAt: Date | null;
    reason: BotProtectionReason;
} => {
    const now = input.now || new Date();
    const trustMinutes = input.trustMinutes ?? BOT_TRUST_MINUTES;
    const newAccountHours = input.newAccountHours ?? BOT_NEW_ACCOUNT_HOURS;
    const recentThreshold = input.recentThreshold ?? CONTRIBUTION_CHALLENGE_THRESHOLD;
    const dailyThreshold = input.dailyThreshold ?? CONTRIBUTION_DAILY_CHALLENGE_THRESHOLD;

    if (!input.enabled) {
        return { enabled: false, challengeRequired: false, trustExpiresAt: null, reason: 'DISABLED' };
    }

    const trustExpiresAt = input.botVerifiedAt
        ? new Date(input.botVerifiedAt.getTime() + trustMinutes * 60_000)
        : null;
    if (trustExpiresAt && trustExpiresAt > now) {
        return { enabled: true, challengeRequired: false, trustExpiresAt, reason: 'RECENTLY_VERIFIED' };
    }

    const isNewAccount = input.createdAt > new Date(now.getTime() - newAccountHours * 60 * 60_000);
    const accelerated = input.recentContributions >= recentThreshold;
    const dailyActivity = input.dailyContributions >= dailyThreshold;
    const challengeRequired = isNewAccount || accelerated || dailyActivity;
    const reason: BotProtectionReason = isNewAccount
        ? 'NEW_ACCOUNT'
        : accelerated
            ? 'ACCELERATED_ACTIVITY'
            : dailyActivity
                ? 'DAILY_ACTIVITY'
                : 'NOT_REQUIRED';

    return { enabled: true, challengeRequired, trustExpiresAt: null, reason };
};

export const contributionProtectionStatus = async (user: {
    id: string;
    createdAt: Date;
    botVerifiedAt: Date | null;
}, now = new Date()) => {
    const earlyStatus = resolveContributionProtection({
        enabled: TURNSTILE_ENABLED,
        createdAt: user.createdAt,
        botVerifiedAt: user.botVerifiedAt,
        recentContributions: 0,
        dailyContributions: 0,
        now,
    });
    if (earlyStatus.reason === 'DISABLED' || earlyStatus.reason === 'RECENTLY_VERIFIED') return earlyStatus;

    const [recent, daily] = await Promise.all([
        prisma.term.count({
            where: {
                authorId: user.id,
                createdAt: { gte: new Date(now.getTime() - CONTRIBUTION_ACCOUNT_WINDOW_MINUTES * 60_000) },
            },
        }),
        prisma.term.count({
            where: {
                authorId: user.id,
                createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) },
            },
        }),
    ]);
    return resolveContributionProtection({
        enabled: true,
        createdAt: user.createdAt,
        botVerifiedAt: user.botVerifiedAt,
        recentContributions: recent,
        dailyContributions: daily,
        now,
    });
};

export const markBotVerified = (userId: string, verifiedAt = new Date()) =>
    prisma.user.update({
        where: { id: userId },
        data: { botVerifiedAt: verifiedAt },
        select: { botVerifiedAt: true },
    });

export const deleteExpiredRateLimitBuckets = () =>
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
