import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';
import { httpsBase, instagramProvider, xProvider } from './social/providers.mjs';
import { processChannel } from './social/queue.mjs';

const env = process.env;
const [command, ...rest] = process.argv.slice(2);
const prisma = new PrismaClient();
const assetDirectory = fileURLToPath(new URL('../uploads/social/', import.meta.url));
const on = (name) => env[name] === 'true';

function startAt(name) {
    const value = env[name];
    const instant = new Date(value || '');
    if (!value || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(instant.getTime())) throw new Error(`${name}_REQUIRES_ISO_DATE`);
    return instant;
}

async function main() {
    if (command === '--status' && !rest.length) {
        const rows = await prisma.newsSocialPost.findMany({
            orderBy: { updatedAt: 'desc' }, take: 30,
            select: { id: true, channel: true, status: true, attempts: true, providerMediaId: true, providerPostId: true, lastError: true, updatedAt: true, news: { select: { slug: true } } },
        });
        console.log(JSON.stringify(rows, null, 2));
        return;
    }
    if (command === '--mark-published' && rest.length === 2 && /^\d{1,30}$/.test(rest[1])) {
        const [id, providerPostId] = rest;
        const result = await prisma.newsSocialPost.updateMany({ where: { id, status: 'REVIEW' }, data: { status: 'PUBLISHED', providerPostId, publishedAt: new Date(), lastError: null } });
        if (!result.count) throw new Error('SOCIAL_REVIEW_JOB_NOT_FOUND');
        console.log('PUBLISHED');
        return;
    }
    if (command === '--retry' && rest.length === 2 && rest[1] === '--confirmed-not-published') {
        const result = await prisma.newsSocialPost.updateMany({ where: { id: rest[0], status: { in: ['FAILED', 'REVIEW'] } }, data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null, providerMediaId: null, sourceUpdatedAt: null } });
        if (!result.count) throw new Error('SOCIAL_FAILED_JOB_NOT_FOUND');
        console.log('PENDING');
        return;
    }
    if (command) throw new Error('SOCIAL_COMMAND_NOT_SUPPORTED');
    if (!on('SOCIAL_INSTAGRAM_ENABLED') && !on('SOCIAL_X_ENABLED')) { console.log('SOCIAL_POSTING_DISABLED'); return; }

    const appUrl = httpsBase(env.APP_URL, 'APP_URL');
    const workers = [
        ['INSTAGRAM', () => ({
            startAt: startAt('SOCIAL_INSTAGRAM_START_AT'),
            publicApiUrl: httpsBase(env.PUBLIC_API_URL, 'PUBLIC_API_URL'),
            provider: instagramProvider({
                userId: env.SOCIAL_INSTAGRAM_USER_ID,
                token: env.SOCIAL_INSTAGRAM_ACCESS_TOKEN,
                version: env.SOCIAL_INSTAGRAM_API_VERSION,
                authMode: env.SOCIAL_INSTAGRAM_AUTH_MODE || 'instagram_login',
            }),
        })],
        ['X', () => ({
            startAt: startAt('SOCIAL_X_START_AT'),
            provider: xProvider({
                clientId: env.SOCIAL_X_CLIENT_ID, clientSecret: env.SOCIAL_X_CLIENT_SECRET, refreshToken: env.SOCIAL_X_REFRESH_TOKEN,
                tokenPath: fileURLToPath(new URL('../.social-private/x-token.json', import.meta.url)),
            }),
        })],
    ];
    const result = await Promise.allSettled(workers.filter(([channel]) => on(`SOCIAL_${channel}_ENABLED`)).map(async ([channel, config]) => {
        await processChannel(prisma, { channel, appUrl, assetDirectory, ...config() });
    }));
    if (result.some(({ status }) => status === 'rejected')) throw new Error('SOCIAL_WORKER_FAILED_CHECK_CONFIG_DB_AND_MIGRATION');
}

try { await main(); }
catch (error) {
    // Never print provider payloads, tokens, or Prisma connection strings.
    console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'SOCIAL_OPERATION_FAILED');
    process.exitCode = 1;
} finally { await prisma.$disconnect(); }
