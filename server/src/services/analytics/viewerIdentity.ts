import crypto from 'crypto';
import type { Request, Response } from 'express';
import { ANALYTICS_HASH_SECRET } from '../../utils/config';

const VIEWER_COOKIE = 'dg_viewer';
const VIEWER_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const AUTOMATION_PATTERN = /bot|crawler|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python-requests|postmanruntime/i;

const hmac = (scope: string, value: string) => crypto
    .createHmac('sha256', ANALYTICS_HASH_SECRET)
    .update(`${scope}:${value}`)
    .digest('hex');

const parseCookie = (header: string | undefined, name: string) => {
    if (!header) return null;
    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 0) continue;
        if (part.slice(0, separator).trim() !== name) continue;
        try {
            return decodeURIComponent(part.slice(separator + 1).trim());
        } catch {
            return null;
        }
    }
    return null;
};

const safeEqual = (left: string, right: string) => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const signedValue = (id: string) => `${id}.${hmac('viewer-cookie', id)}`;

const verifiedId = (value: string | null) => {
    if (!value) return null;
    const separator = value.lastIndexOf('.');
    if (separator < 1) return null;
    const id = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    if (!ID_PATTERN.test(id) || !safeEqual(signature, hmac('viewer-cookie', id))) return null;
    return id;
};

const cookieHeader = (value: string) => [
    `${VIEWER_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${VIEWER_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
].join('; ');

export const isLikelyAutomatedRequest = (req: Pick<Request, 'get'>) => {
    const userAgent = req.get('user-agent') || '';
    return !userAgent || AUTOMATION_PATTERN.test(userAgent);
};

export const hasClientEvent = (req: Pick<Request, 'get'>, event: 'term-view' | 'term-share') =>
    req.get('x-client-event') === event;

export const resolveViewerHash = (req: Request, res: Response) => {
    let id = verifiedId(parseCookie(req.get('cookie'), VIEWER_COOKIE));
    if (!id) {
        id = crypto.randomBytes(24).toString('base64url');
        res.append('Set-Cookie', cookieHeader(signedValue(id)));
    }
    return hmac('viewer-hash', id);
};

export const engagementBucket = (now = new Date(), minutes = 30) => {
    const bucketMs = minutes * 60 * 1000;
    return new Date(Math.floor(now.getTime() / bucketMs) * bucketMs);
};

type FrequencyEntry = { startedAt: number; count: number };
const frequency = new Map<string, FrequencyEntry>();

export const consumeEngagementBudget = (
    viewerHash: string,
    event: 'term-view' | 'term-share',
    max: number,
    windowMs = 15 * 60 * 1000,
    now = Date.now(),
) => {
    const key = `${event}:${viewerHash}`;
    const current = frequency.get(key);
    if (!current || now - current.startedAt >= windowMs) {
        frequency.set(key, { startedAt: now, count: 1 });
        if (frequency.size > 10_000) {
            for (const [candidate, entry] of frequency) {
                if (now - entry.startedAt >= windowMs) frequency.delete(candidate);
            }
            while (frequency.size > 10_000) {
                const oldest = frequency.keys().next().value;
                if (!oldest) break;
                frequency.delete(oldest);
            }
        }
        return true;
    }
    if (current.count >= max) return false;
    current.count += 1;

    return true;
};

export const resetEngagementBudgetsForTests = () => frequency.clear();
