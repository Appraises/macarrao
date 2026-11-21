import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export const LOCK_BUSY = Symbol('advisory-lock-busy');

/**
 * Runs `work` while a transaction-scoped advisory lock is held.
 *
 * The holder transaction only owns the lock: `work` must use the global
 * `prisma` client, so every write commits on its own and becomes visible to
 * webhooks and readers immediately, and no row stays locked for the whole run.
 * A READ COMMITTED transaction that performs no writes keeps no snapshot
 * between statements, so the idle holder does not block VACUUM either.
 */
export const withAdvisoryLock = async <T>(
    lockKey: string | number,
    timeoutMs: number,
    work: () => Promise<T>,
): Promise<T | typeof LOCK_BUSY> => prisma.$transaction(async (tx) => {
    const lockSql = typeof lockKey === 'number'
        ? Prisma.sql`SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked`
        : Prisma.sql`SELECT pg_try_advisory_xact_lock(hashtext(${lockKey})) AS locked`;
    const [row] = await tx.$queryRaw<Array<{ locked: boolean }>>(lockSql);
    if (!row?.locked) return LOCK_BUSY;
    return work();
}, { maxWait: 5_000, timeout: timeoutMs });
