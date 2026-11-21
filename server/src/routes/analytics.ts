import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { analyticsEnabled } from '../services/analytics/privacy';
import { analyticsSessionHash, hasClientEvent, isLikelyAutomatedRequest, resolveViewerHash } from '../services/analytics/viewerIdentity';
import { prisma } from '../lib/prisma';

const router = Router();
const eventLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 240 : 2_000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitos eventos de analytics em pouco tempo.' },
});

const EVENT_NAMES = new Set([
    'PAGE_VIEW', 'ACCOUNT_CREATED', 'CATALOG_FILTER_APPLIED', 'CATALOG_VIEWED', 'CATEGORY_SELECTED',
    'CONTRIBUTION_SUBMITTED', 'MEANING_PROPOSED', 'ORIGIN_PROPOSED', 'IMAGE_SUBMITTED', 'LOGIN_COMPLETED',
    'SEARCH_SUBMITTED', 'SEARCH_NO_RESULTS', 'SEARCH_RESULT_CLICK', 'SEARCH_SUGGESTION_SELECTED',
    'VISIT_CLASSIFIED', 'TERM_OPENED', 'TERM_SHARED', 'TERM_REPORTED', 'TERM_VOTE', 'EASTER_EGG_ACTIVATED',
    'ARCADE_GAME_STARTED', 'ARCADE_GAME_OVER', 'ARCADE_SCORE_SAVED', 'BOT_CHALLENGE_SHOWN',
    'BOT_CHALLENGE_PASSED', 'BOT_CHALLENGE_FAILED', 'CONTRIBUTION_RATE_LIMITED', 'NOT_FOUND',
]);

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) || null : null;
const integer = (value: unknown, max: number) => Number.isInteger(Number(value)) ? Math.max(0, Math.min(max, Number(value))) : null;
const sanitizePath = (value: unknown) => {
    const raw = text(value, 500);
    if (!raw) return null;
    return raw.split('?')[0].split('#')[0]
        .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
        .replace(/\b\d{6,}\b/g, ':number')
        .slice(0, 160);
};
const sanitizeReferrer = (value: unknown) => {
    const raw = text(value, 500);
    if (!raw) return null;
    try {
        const url = new URL(raw);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return `${url.origin}${url.pathname}`.slice(0, 250);
    } catch { return null; }
};
const eventName = (value: unknown) => {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') : '';
    return EVENT_NAMES.has(normalized) ? normalized : null;
};
const occurredAt = (value: unknown, now: Date) => {
    if (typeof value !== 'string') return now;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) || Math.abs(parsed.getTime() - now.getTime()) > 5 * 60 * 1000 ? now : parsed;
};

router.post('/events', eventLimiter, async (req, res) => {
    if (!analyticsEnabled(req) || !hasClientEvent(req, 'analytics') || isLikelyAutomatedRequest(req)) {
        return res.status(202).json({ recorded: false });
    }

    const name = eventName(req.body?.eventName);
    if (!name) return res.status(400).json({ error: 'Evento invalido.' });

    const now = new Date();
    const visitorHash = resolveViewerHash(req, res);
    const sessionHash = analyticsSessionHash(visitorHash, now);
    const path = sanitizePath(req.body?.path);
    if (name === 'PAGE_VIEW' && !path) return res.status(400).json({ error: 'A pagina e obrigatoria.' });

    try {
        await prisma.analyticsVisitor.upsert({
            where: { visitorHash },
            create: { visitorHash, firstSeenAt: now, lastSeenAt: now },
            update: { lastSeenAt: now },
        });
        await prisma.analyticsEvent.create({
            data: {
                clientEventId: text(req.body?.clientEventId, 80),
                eventName: name,
                visitorHash,
                sessionHash,
                path,
                referrer: sanitizeReferrer(req.body?.referrer),
                channel: text(req.body?.channel, 40),
                source: text(req.body?.source, 120),
                campaign: text(req.body?.campaign, 120),
                device: text(req.body?.device, 30),
                browser: text(req.body?.browser, 40),
                operatingSystem: text(req.body?.operatingSystem, 40),
                value: text(req.body?.value, 200),
                position: integer(req.body?.position, 10_000),
                resultCount: integer(req.body?.resultCount, 1_000_000),
                occurredAt: occurredAt(req.body?.occurredAt, now),
            },
        });
        return res.status(202).json({ recorded: true });
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return res.status(202).json({ recorded: false, duplicate: true });
        }
        console.error('[analytics] Falha ao registrar evento:', error instanceof Error ? error.message : 'erro desconhecido');
        return res.status(202).json({ recorded: false });
    }
});

export default router;
