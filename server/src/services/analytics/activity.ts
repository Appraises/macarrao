import { prisma } from '../../lib/prisma';

const REQUEST_THROTTLE_MS = 30 * 60 * 1000;
const recentActivity = new Map<string, number>();

export const dateInSaoPaulo = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(value);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
    return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`);
};

export const recordUserActivity = async (userId: string, kind: 'LOGIN' | 'REQUEST' = 'REQUEST') => {
    const now = new Date();
    if (kind === 'REQUEST') {
        const previous = recentActivity.get(userId) || 0;
        if (now.getTime() - previous < REQUEST_THROTTLE_MS) return;
        recentActivity.set(userId, now.getTime());
    }

    const date = dateInSaoPaulo(now);
    await prisma.userActivityDay.upsert({
        where: { userId_date: { userId, date } },
        create: {
            userId,
            date,
            firstSeenAt: now,
            lastSeenAt: now,
            loginCount: kind === 'LOGIN' ? 1 : 0,
            requestCount: kind === 'REQUEST' ? 1 : 0,
        },
        update: {
            lastSeenAt: now,
            ...(kind === 'LOGIN' ? { loginCount: { increment: 1 } } : { requestCount: { increment: 1 } }),
        },
    });
};

