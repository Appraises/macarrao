import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Prisma's implicit pool is num_cpus * 2 + 1 (about 5 on a small VPS), and a
// request waits only 10s for a free connection before failing with P2024.
// Make both explicit unless DATABASE_URL already sets them.
export const withPoolDefaults = (value: string | undefined, env: NodeJS.ProcessEnv = process.env): string | undefined => {
    if (!value) return value;
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return value;
    }
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', env.DATABASE_POOL_SIZE || '10');
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', env.DATABASE_POOL_TIMEOUT || '20');
    return url.toString();
};

const databaseUrl = withPoolDefaults(process.env.DATABASE_URL);

export const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
