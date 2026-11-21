import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class SocialError extends Error {
    constructor(code, { retry = false, uncertain = false, delayMs = 0 } = {}) {
        super(code);
        this.retry = retry;
        this.uncertain = uncertain;
        this.delayMs = delayMs;
    }
}

export function httpsBase(value, label) {
    const url = URL.canParse(value || '') ? new URL(value) : null;
    if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error(`${label}_REQUIRES_HTTPS`);
    return url.href.replace(/\/$/, '');
}

async function call(code, url, { fetcher, write = false, method = 'POST', token, auth, form, json }) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (auth) headers.Authorization = auth;
    if (json) headers['Content-Type'] = 'application/json';
    let response;
    try {
        response = await fetcher(url, { method, headers, body: json ? JSON.stringify(json) : form, signal: AbortSignal.timeout(18_000), redirect: 'error' });
    } catch {
        throw new SocialError(`${code}_UNREACHABLE`, { retry: !write, uncertain: write });
    }
    if (!response.ok) {
        const unknown = response.status >= 500 || response.status === 408;
        const retryAfter = response.headers.get('retry-after');
        const delayMs = retryAfter && /^\d+$/.test(retryAfter) ? Math.min(3_600_000, Number(retryAfter) * 1000) : 0;
        throw new SocialError(`${code}_HTTP_${response.status}`, { retry: response.status === 429 || (!write && unknown), uncertain: write && unknown, delayMs });
    }
    try {
        return await response.json();
    } catch {
        throw new SocialError(`${code}_INVALID_RESPONSE`, { retry: !write, uncertain: write });
    }
}

function getId(value, stage, write = false) {
    if (typeof value !== 'string' || !/^\d{1,30}$/.test(value)) throw new SocialError(`${stage}_MISSING_ID`, { retry: !write, uncertain: write });
    return value;
}

export function instagramProvider({ userId, token, version, authMode = 'instagram_login', fetcher = fetch }) {
    if (!/^\d{1,30}$/.test(userId || '') || !token || !/^v\d+\.0$/.test(version || '') || !['instagram_login', 'unified_login'].includes(authMode)) {
        throw new Error('INSTAGRAM_CONFIG_INCOMPLETE');
    }
    const host = authMode === 'unified_login' ? 'graph.facebook.com' : 'graph.instagram.com';
    const root = `https://${host}/${version}`;
    return {
        async createMedia({ slides, caption }) {
            if (slides?.length !== 2) throw new SocialError('IG_CAROUSEL_REQUIRES_TWO_SLIDES');
            const url = `${root}/${userId}/media`;
            const children = await Promise.all(slides.map(async ({ assetUrl, alt }) => {
                const body = await call('IG_CAROUSEL_ITEM', url, {
                    fetcher, token, json: { image_url: assetUrl, is_carousel_item: true, alt_text: alt },
                });
                return getId(body?.id, 'IG_CAROUSEL_ITEM');
            }));
            const body = await call('IG_CAROUSEL', url, {
                fetcher, token, json: { media_type: 'CAROUSEL', children: children.join(','), caption },
            });
            return getId(body?.id, 'IG_CAROUSEL');
        },
        async checkMedia(mediaId) {
            const body = await call('IG_STATUS', `${root}/${mediaId}?fields=status_code`, { fetcher, token, method: 'GET' });
            if (body?.status_code === 'FINISHED') return;
            if (body?.status_code === 'IN_PROGRESS') throw new SocialError('IG_MEDIA_PROCESSING', { retry: true, delayMs: 60_000 });
            if (body?.status_code === 'PUBLISHED') throw new SocialError('IG_MEDIA_ALREADY_PUBLISHED', { uncertain: true });
            throw new SocialError(`IG_MEDIA_${['EXPIRED', 'ERROR'].includes(body?.status_code) ? body.status_code : 'UNKNOWN'}`);
        },
        async publish(mediaId) {
            const body = await call('IG_PUBLISH', `${root}/${userId}/media_publish`, {
                fetcher, token, write: true, json: { creation_id: mediaId },
            });
            return getId(body?.id, 'IG_PUBLISH', true);
        },
    };
}

export async function listInstagramAccounts({ token, version, fetcher = fetch }) {
    if (!token || !/^v\d+\.0$/.test(version || '')) throw new Error('INSTAGRAM_CONFIG_INCOMPLETE');
    const body = await call('IG_ACCOUNTS', `https://graph.facebook.com/${version}/me/assigned_instagram_accounts?fields=id,username`, {
        fetcher, token, method: 'GET',
    });
    if (!Array.isArray(body?.data)) throw new SocialError('IG_ACCOUNTS_INVALID_RESPONSE');
    return body.data
        .filter((account) => /^\d{1,30}$/.test(account?.id || '') && typeof account?.username === 'string')
        .map(({ id, username }) => ({ id, username }));
}

export function xProvider({ clientId, clientSecret, refreshToken, tokenPath, fetcher = fetch }) {
    if (!clientId || !clientSecret || !refreshToken || !tokenPath) throw new Error('X_CONFIG_INCOMPLETE');
    let session;
    const root = 'https://api.x.com';
    const getSession = () => session ??= (async () => {
        let previous;
        try { previous = JSON.parse(await readFile(tokenPath, 'utf8')); }
        catch (error) { if (error.code !== 'ENOENT') throw new SocialError('X_TOKEN_FILE_INVALID'); }
        if (previous?.accessToken && previous.expiresAt > Date.now() + 5 * 60_000) return previous.accessToken;
        const next = await call('X_TOKEN', `${root}/2/oauth2/token`, {
            fetcher,
            auth: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            form: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: previous?.refreshToken || refreshToken }),
        });
        if (!next?.access_token || !next.refresh_token || !Number.isFinite(next.expires_in) || next.expires_in <= 0) throw new SocialError('X_REFRESH_RESPONSE_INVALID');
        try {
            await mkdir(path.dirname(tokenPath), { recursive: true, mode: 0o700 });
            const tmp = `${tokenPath}.${randomUUID()}.tmp`;
            await writeFile(tmp, JSON.stringify({ accessToken: next.access_token, refreshToken: next.refresh_token, expiresAt: Date.now() + next.expires_in * 1000 }), { mode: 0o600, flag: 'wx' });
            await rename(tmp, tokenPath);
        } catch { throw new SocialError('X_TOKEN_FILE_WRITE_FAILED'); }
        return next.access_token;
    })().catch((error) => { session = undefined; throw error; });

    return {
        async createMedia({ image }) {
            const token = await getSession();
            const body = await call('X_MEDIA', `${root}/2/media/upload`, {
                fetcher, token, json: { media: image.toString('base64'), media_category: 'tweet_image' },
            });
            return getId(body?.data?.id, 'X_MEDIA');
        },
        async publish(mediaId, caption) {
            const body = await call('X_PUBLISH', `${root}/2/tweets`, {
                fetcher, token: await getSession(), write: true, json: { text: caption, media: { media_ids: [mediaId] } },
            });
            return getId(body?.data?.id, 'X_PUBLISH', true);
        },
    };
}
