import crypto from 'crypto';
import { Request } from 'express';
import { SearchOrigin } from '@prisma/client';
import { ANALYTICS_HASH_SECRET } from '../../utils/config';

const SEARCH_TOKEN_TTL_MS = 30 * 60 * 1000;
const SEARCH_TEXT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const REDACTIONS: Array<[RegExp, string]> = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]'],
    [/https?:\/\/\S+|www\.\S+/gi, '[url]'],
    [/\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g, '[telefone]'],
    [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[identificador]'],
    [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,})?\b/gi, '[token]'],
];

export const normalizeSearchQuery = (value: string) => value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ');

export const sanitizeSearchQuery = (value: string) => {
    let normalized = normalizeSearchQuery(value);
    for (const [pattern, replacement] of REDACTIONS) normalized = normalized.replace(pattern, replacement);
    return normalized.replace(/\s+/g, ' ').trim().slice(0, 80);
};

export const hashSearchQuery = (value: string) => crypto
    .createHmac('sha256', ANALYTICS_HASH_SECRET)
    .update(normalizeSearchQuery(value))
    .digest('hex');

const sign = (encodedPayload: string) => crypto
    .createHmac('sha256', ANALYTICS_HASH_SECRET)
    .update(encodedPayload)
    .digest('base64url');

export const createSearchToken = (id: string) => {
    const encoded = Buffer.from(JSON.stringify({ id, exp: Date.now() + SEARCH_TOKEN_TTL_MS })).toString('base64url');
    return `${encoded}.${sign(encoded)}`;
};

export const verifySearchToken = (token: string): string | null => {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;
    const expected = sign(encoded);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { id?: unknown; exp?: unknown };
        if (typeof payload.id !== 'string' || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
        return payload.id;
    } catch {
        return null;
    }
};

export const analyticsEnabled = (req: Request) => req.get('X-Analytics-Enabled') === 'true';

export const parseSearchOrigin = (value: unknown): SearchOrigin => {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase().replace(/-/g, '_') : '';
    return Object.values(SearchOrigin).includes(normalized as SearchOrigin) ? normalized as SearchOrigin : SearchOrigin.UNKNOWN;
};

export const searchTextRetentionCutoff = () => new Date(Date.now() - SEARCH_TEXT_RETENTION_MS);
