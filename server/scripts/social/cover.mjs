import { lookup } from 'node:dns/promises';
import { get } from 'node:https';
import ipaddr from 'ipaddr.js';
import { SocialError } from './providers.mjs';

const MAX_BYTES = 12 * 1024 * 1024;
const IMAGE_MIME = /^image\/(?:jpeg|png|webp|avif|gif)(?:\s*;|$)/i;
const REDIRECT = new Set([301, 302, 303, 307, 308]);
const COVER_ERROR = (code) => new SocialError(code, { retry: true });

function coverUrl(value, base) {
    if (!value) throw COVER_ERROR('ARTICLE_COVER_MISSING');
    let url;
    try { url = new URL(value, base); }
    catch { throw COVER_ERROR('ARTICLE_COVER_URL_INVALID'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw COVER_ERROR('ARTICLE_COVER_URL_INVALID');
    return url;
}

export function isPublicCoverAddress(value) {
    try {
        const address = ipaddr.parse(value);
        return address.range() === 'unicast' &&
            (address.kind() === 'ipv4' || address.match(ipaddr.parse('2000::'), 3));
    } catch { return false; }
}

function requestCover(url, addresses, signal) {
    return new Promise((resolve, reject) => {
        const req = get(url, {
            agent: false, signal,
            headers: { Accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif' },
            lookup(_host, options, callback) {
                if (options.all) callback(null, addresses);
                else callback(null, addresses[0].address, addresses[0].family);
            },
        }, resolve);
        req.on('error', reject);
    });
}

export async function loadArticleCover(value, appUrl, { resolve = lookup, request = requestCover } = {}) {
    let url = coverUrl(value, appUrl);
    try {
        const signal = AbortSignal.timeout(20_000);
        for (let hop = 0; hop <= 3; hop++) {
            signal.throwIfAborted();
            // Pin the validated DNS results to this TLS connection, including on redirects.
            const addresses = await resolve(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
            if (!addresses.length || addresses.some(({ address }) => !isPublicCoverAddress(address))) throw COVER_ERROR('ARTICLE_COVER_HOST_INVALID');
            const response = await request(url, addresses, signal);
            if (REDIRECT.has(response.statusCode)) {
                response.destroy();
                if (!response.headers.location) break;
                url = coverUrl(response.headers.location, url);
                continue;
            }
            if (response.statusCode !== 200 || !IMAGE_MIME.test(response.headers['content-type'] || '')) {
                response.destroy();
                throw COVER_ERROR('ARTICLE_COVER_UNAVAILABLE');
            }
            const chunks = [];
            let bytes = 0;
            for await (const chunk of response) {
                bytes += chunk.length;
                if (bytes > MAX_BYTES) throw COVER_ERROR('ARTICLE_COVER_TOO_LARGE');
                chunks.push(chunk);
            }
            return Buffer.concat(chunks, bytes);
        }
    } catch (error) {
        if (error instanceof SocialError) throw error;
    }
    throw COVER_ERROR('ARTICLE_COVER_UNAVAILABLE');
}
