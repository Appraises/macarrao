import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sanitizeHtml from 'sanitize-html';
import { renderInstagramCarousel, renderNewsCard } from './art.mjs';
import { loadArticleCover } from './cover.mjs';
import { formatInstagramHashtags } from './hashtags.mjs';
import { SocialError } from './providers.mjs';

const MAX_ATTEMPTS = 6;
const LEASE_MS = 5 * 60_000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cleanText = (value) => sanitizeHtml(value || '', { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
const truncate = (value, max) => {
    const chars = Array.from(value);
    return chars.length <= max ? value : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
};

export function createSocialCopy(news, channel, appUrl) {
    if (!SLUG.test(news.slug)) throw new SocialError('ARTICLE_SLUG_INVALID');
    const title = news.headline.replace(/\s+/g, ' ').trim();
    const description = truncate(cleanText(news.seoDescription), 420);
    const link = new URL(`/noticias/${news.slug}/`, appUrl);
    link.searchParams.set('utm_source', channel.toLowerCase());
    link.searchParams.set('utm_medium', 'social');
    link.searchParams.set('utm_campaign', 'noticias');
    const caption = channel === 'X'
        ? `${truncate(title, 118)}\n\n${link}`
        : [title, description && description !== title ? description : '', 'Leia a matéria completa: abra o link da bio e toque nesta manchete.'].filter(Boolean).join('\n\n');
    const tags = channel === 'INSTAGRAM' ? formatInstagramHashtags(news.instagramHashtags, caption) : '';
    return {
        alt: truncate(`${news.category}: ${title}. Dicionário Gamer.`, 500),
        caption: tags ? `${caption}\n\n${tags}` : caption,
    };
}

export function instagramContext(news) {
    return truncate(cleanText(news.seoDescription || news.seoTitle || news.headline), 190);
}

export function instagramBioUrl(appUrl) {
    const url = new URL('/noticias/', appUrl);
    url.search = new URLSearchParams({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'instagram_bio' });
    return url.href;
}

async function writeSlide(directory, filename, image) {
    await writeFile(path.join(directory, `${filename}.tmp`), image, { mode: 0o644 });
    await rename(path.join(directory, `${filename}.tmp`), path.join(directory, filename));
}

export function failureTransition(error, attempts, now) {
    const known = error instanceof SocialError;
    const status = known && error.uncertain ? 'REVIEW' : known && error.retry && attempts < MAX_ATTEMPTS ? 'PENDING' : 'FAILED';
    const delay = known && error.message === 'IG_MEDIA_PROCESSING' ? 60_000
        : Math.max(known ? error.delayMs : 0, Math.min(30 * 60_000, 60_000 * 2 ** (attempts - 1)));
    return { status, lastError: known ? error.message : 'LOCAL_PREPARATION_FAILED', nextAttemptAt: new Date(now.getTime() + delay) };
}

export async function queueRecentNews(db, channel, startAt, now) {
    const eligible = await db.news.findMany({
        where: { status: 'PUBLISHED', publishedAt: { gte: startAt, lte: now }, socialPosts: { none: { channel } } },
        orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }], select: { id: true }, take: 20,
    });
    if (eligible.length) await db.newsSocialPost.createMany({
        data: eligible.map(({ id: newsId }) => ({ newsId, channel, nextAttemptAt: now })), skipDuplicates: true,
    });
}

export async function processChannel(db, { channel, provider, startAt, appUrl, publicApiUrl, assetDirectory, log = console.log, fetchCover = loadArticleCover }) {
    const now = new Date();
    await db.newsSocialPost.updateMany({
        where: { channel, nextAttemptAt: { lte: now }, status: 'PUBLISHING' },
        data: { status: 'REVIEW', lastError: 'PUBLISH_INTERRUPTED_CHECK_SOCIAL_ACCOUNT' },
    });
    await db.newsSocialPost.updateMany({
        where: { channel, nextAttemptAt: { lte: now }, status: 'PREPARING', attempts: { gte: MAX_ATTEMPTS } },
        data: { status: 'FAILED', lastError: 'PREPARATION_RETRY_LIMIT' },
    });
    await queueRecentNews(db, channel, startAt, now);
    const jobs = await db.newsSocialPost.findMany({
        where: { channel, status: { in: ['PENDING', 'PREPARING'] }, nextAttemptAt: { lte: now }, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }], take: 3,
    });

    for (const job of jobs) {
        const attempts = job.attempts + 1;
        const claim = await db.newsSocialPost.updateMany({
            where: { id: job.id, status: job.status, attempts: job.attempts, nextAttemptAt: { lte: now } },
            data: { attempts, status: 'PREPARING', nextAttemptAt: new Date(Date.now() + LEASE_MS) },
        });
        if (!claim.count) continue;
        const active = (status) => ({ id: job.id, attempts, status });
        const eligible = { id: job.newsId, status: 'PUBLISHED', publishedAt: { gte: startAt, lte: new Date() } };
        let publishing = false;
        try {
            const news = await db.news.findFirst({ where: eligible, select: {
                slug: true, headline: true, category: true, publishedAt: true, seoTitle: true, seoDescription: true,
                image: true, updatedAt: true, ...(channel === 'INSTAGRAM' ? { instagramHashtags: true } : {}),
            } });
            if (!news) throw new SocialError('ARTICLE_NOT_PUBLIC');
            const copy = createSocialCopy(news, channel, appUrl);
            let mediaId = channel === 'INSTAGRAM' && job.sourceUpdatedAt?.getTime() === news.updatedAt.getTime() ? job.providerMediaId : null;
            if (!mediaId) {
                const cover = await fetchCover(news.image, appUrl);
                if (channel === 'INSTAGRAM') {
                    const context = instagramContext(news);
                    const images = await renderInstagramCarousel(news, cover, context);
                    const altTexts = [`${copy.alt} Deslize para ler o resumo.`, `${context} Leia a matéria completa no link da bio.`];
                    await mkdir(assetDirectory, { recursive: true });
                    const slides = await Promise.all(images.map(async (image, index) => {
                        const filename = `${job.id}-${attempts}-${news.updatedAt.getTime()}-${index + 1}.jpg`;
                        await writeSlide(assetDirectory, filename, image);
                        return { assetUrl: `${publicApiUrl}/uploads/social/${filename}`, alt: altTexts[index] };
                    }));
                    mediaId = await provider.createMedia({ slides, caption: copy.caption });
                } else {
                    const image = await renderNewsCard(news, cover, channel);
                    mediaId = await provider.createMedia({ image, ...copy });
                }
                const stored = await db.newsSocialPost.updateMany({
                    where: active('PREPARING'), data: { providerMediaId: mediaId, sourceUpdatedAt: news.updatedAt },
                });
                if (!stored.count) continue;
            }
            await provider.checkMedia?.(mediaId);
            const current = await db.news.findFirst({ where: eligible, select: { updatedAt: true } });
            if (!current) throw new SocialError('ARTICLE_NOT_PUBLIC');
            if (current.updatedAt.getTime() !== news.updatedAt.getTime()) throw new SocialError('ARTICLE_UPDATED_REBUILD_CARD', { retry: true });
            // Mark the write before calling the provider. An interrupted write is never retried blindly.
            const willPublish = await db.newsSocialPost.updateMany({
                where: active('PREPARING'), data: { status: 'PUBLISHING', nextAttemptAt: new Date(Date.now() + LEASE_MS) },
            });
            if (!willPublish.count) continue;
            publishing = true;
            const providerPostId = await provider.publish(mediaId, copy.caption);
            await db.newsSocialPost.updateMany({ where: active('PUBLISHING'), data: { status: 'PUBLISHED', providerPostId, publishedAt: new Date(), lastError: null } });
            log(`${channel} ${job.id} PUBLISHED ${providerPostId}`);
        } catch (error) {
            const failure = failureTransition(publishing && !(error instanceof SocialError)
                ? new SocialError('PUBLISH_RESULT_NOT_RECORDED', { uncertain: true }) : error, attempts, new Date());
            if (error instanceof SocialError && error.message === 'ARTICLE_NOT_PUBLIC') failure.status = 'CANCELED';
            await db.newsSocialPost.updateMany({ where: active(publishing ? 'PUBLISHING' : 'PREPARING'), data: failure });
            log(`${channel} ${job.id} ${failure.status} ${failure.lastError}`);
        }
    }
}
