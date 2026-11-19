import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import sharp from 'sharp';
import { instagramHeadline, layoutHeadline, renderInstagramCarousel, renderNewsCard } from './art.mjs';
import { isPublicCoverAddress, loadArticleCover } from './cover.mjs';
import { instagramProvider, listInstagramAccounts, SocialError, xProvider } from './providers.mjs';
import { createSocialCopy, instagramBioUrl, instagramContext, processChannel } from './queue.mjs';

const appUrl = 'https://example.com';
const coverUrl = appUrl + '/capa.webp';
const article = { id: 'article-1', slug: 'exemplo-de-noticia', headline: 'Estúdio anuncia atualização para o jogo', category: 'PC',
    publishedAt: new Date('2026-05-20T21:00:00Z'), updatedAt: new Date('2026-05-20T21:02:00Z'), status: 'PUBLISHED', image: coverUrl };
const startAt = new Date('2026-05-20T19:00:00Z');
const cover = (background) => sharp({ create: { width: 320, height: 180, channels: 3, background } }).webp().toBuffer();

test('uses the real cover across the full 4:5 JPEG and keeps the text overlay', async () => {
    const [red, blue] = await Promise.all([
        renderNewsCard(article, await cover('#ff0000'), 'INSTAGRAM'),
        renderNewsCard({ ...article, category: 'XBOX' }, await cover('#0000ff'), 'X'),
    ]);
    const { data: r, info } = await sharp(red).raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(blue).raw().toBuffer();
    assert.equal((await sharp(red).metadata()).format, 'jpeg');
    assert.deepEqual([info.width, info.height], [1080, 1350]);
    const stripe = (4 * info.width + 12) * 3;
    for (const pixels of [r, b]) assert.ok([56, 189, 248].every((value, index) => Math.abs(pixels[stripe + index] - value) < 8));
    for (const y of [25, 500, 1000, 1320]) assert.ok(r[(y * info.width + 12) * 3] > b[(y * info.width + 12) * 3] + 6);
    const textPixel = r.findIndex((val, i) => val > 225 && i > 1060 * info.width * 3 && i < 1185 * info.width * 3 && r[i + 1] > 225 && r[i + 2] > 225);
    assert.ok(textPixel >= 0);
    await assert.rejects(() => renderNewsCard(article, null, 'INSTAGRAM'), /ARTICLE_COVER_MISSING/);
    await assert.rejects(() => renderNewsCard(article, Buffer.from('<svg/>'), 'X'), /ARTICLE_COVER_FORMAT_UNSUPPORTED/);
});

test('positions the rounded SNES-style 3D mark in opposite corners on Instagram only', async () => {
    const input = await cover('#dadada');
    const logoRegion = async (image, left) => {
        const { data, info } = await sharp(image)
            .extract({ left, top: 42, width: 220, height: 143 })
            .raw().toBuffer({ resolveWithObject: true });
        let blue = 0;
        for (let i = 0; i < data.length; i += info.channels) {
            if (data[i] < 105 && data[i + 1] > 145 && data[i + 2] > 205) blue++;
        }
        return { blue, cornerRed: data[0] };
    };
    const [first, second] = await renderInstagramCarousel(article, input, article.headline);
    const x = await renderNewsCard(article, input, 'X');
    const firstLeft = await logoRegion(first, 48);
    assert.ok(firstLeft.blue > 500);
    assert.ok(firstLeft.cornerRed > 40, 'The photo is visible behind the Instagram logo');
    assert.equal((await logoRegion(first, 812)).blue, 0);
    assert.equal((await logoRegion(second, 48)).blue, 0);
    assert.ok((await logoRegion(second, 812)).blue > 500);
    assert.equal((await logoRegion(x, 48)).blue, 0);

    const logo = await readFile(new URL('../../../public/brand/dg-control-3d-snes-dpad-bold.png', import.meta.url));
    const { data: expected, info } = await sharp(logo).trim().resize({ width: 192 }).ensureAlpha()
        .raw().toBuffer({ resolveWithObject: true });
    for (const [slide, left] of [[first, 58], [second, 830]]) {
        const actual = await sharp(slide).extract({ left, top: 51, width: info.width, height: info.height })
            .removeAlpha().raw().toBuffer();
        let sampled = 0;
        let matched = 0;
        for (let pixel = 0; pixel < info.width * info.height; pixel++) {
            const offset = pixel * 4;
            if (expected[offset + 3] < 250 || expected[offset] >= 105 || expected[offset + 1] <= 145 || expected[offset + 2] <= 205) continue;
            sampled++;
            if ([0, 1, 2].every((channel) => Math.abs(actual[pixel * 3 + channel] - expected[offset + channel]) < 45)) matched++;
        }
        assert.ok(sampled > 500);
        assert.ok(matched / sampled > .9, 'Both slides use the current rounded 3D logo');
    }
});

test('layouts long headlines and preserves public article links', () => {
    const headline = 'Estúdio anuncia expansão inédita e confirma nova data para a atualização que traz partidas ranqueadas, mapas e modo cooperativo ao jogo de estratégia';
    const layout = layoutHeadline(headline);
    assert.ok(layout.lines.length > 1 && layout.lines.length <= 5);
    assert.equal(layout.lines.join(' '), headline);
    assert.match(createSocialCopy({ ...article, headline }, 'X', appUrl).caption, /\/noticias\/exemplo-de-noticia\/\?utm_source=x/);
    assert.ok(createSocialCopy({ ...article, headline }, 'INSTAGRAM', appUrl).caption.startsWith(headline));
});

test('Instagram centers a short editorial title without replacing the full caption', () => {
    const news = {
        ...article,
        headline: 'Metro 2033 Redux e Last Light ganham atualização gratuita para Xbox Series',
        seoTitle: 'Metro Redux ganha atualização gratuita para Xbox Series',
    };
    const title = instagramHeadline(news);
    assert.equal(title, news.seoTitle);
    const layout = layoutHeadline(title, 'INSTAGRAM');
    assert.equal(layout.lines.join(' '), news.seoTitle.toLocaleUpperCase('pt-BR'));
    assert.ok(layout.lines.length <= 3);
    assert.ok(createSocialCopy(news, 'INSTAGRAM', appUrl).caption.startsWith(news.headline));
    assert.equal(instagramHeadline({ ...news, seoTitle: ' ' }), news.headline);
    assert.equal(instagramHeadline({ ...news, seoTitle: news.headline.repeat(2) }), news.headline);
});

test('only downloads public raster covers and validates redirects', async () => {
    assert.equal(isPublicCoverAddress('127.0.0.1'), false);
    assert.equal(isPublicCoverAddress('::ffff:127.0.0.1'), false);
    assert.equal(isPublicCoverAddress('169.254.169.254'), false);
    assert.equal(isPublicCoverAddress('2606:4700::1111'), true);
    const bytes = await cover('#ffc482');
    const response = (statusCode, headers, data) => Object.assign(Readable.from(data ? [data] : []), { statusCode, headers });
    const requests = [];
    const deps = {
        resolve: async () => [{ address: '1.1.1.1', family: 4 }],
        request: async (url) => {
            requests.push(url.href);
            if (url.pathname === '/redirect') return response(302, { location: '/capa.webp' });
            return response(200, { 'content-type': 'image/webp' }, bytes);
        },
    };
    assert.deepEqual(await loadArticleCover('/redirect', appUrl, deps), bytes);
    assert.deepEqual(requests, [appUrl + '/redirect', coverUrl]);
    await assert.rejects(() => loadArticleCover('', appUrl, deps), /ARTICLE_COVER_MISSING/);
    await assert.rejects(() => loadArticleCover('https://127.0.0.1/capa.jpg', appUrl), /ARTICLE_COVER_HOST_INVALID/);
    await assert.rejects(() => loadArticleCover('/capa.jpg', appUrl, {
        request: deps.request, resolve: async () => [],
    }), /ARTICLE_COVER_HOST_INVALID/);
    await assert.rejects(() => loadArticleCover('/redirect', appUrl, {
        ...deps, request: async () => response(302, { location: 'http://example.com/capa.jpg' }),
    }), /ARTICLE_COVER_URL_INVALID/);
});

test('Instagram creates two ordered carousel items and treats an ambiguous post as review', async () => {
    const calls = [];
    const provider = instagramProvider({ userId: '1', token: 'test-only', version: 'v27.0', fetcher: async (url, init) => {
        calls.push({ url, ...init });
        if (url.endsWith('/media')) {
            const body = JSON.parse(init.body);
            return Response.json({ id: body.media_type === 'CAROUSEL' ? '333' : body.image_url === coverUrl ? '111' : '222' });
        }
        if (url.includes('status_code')) return Response.json({ status_code: 'IN_PROGRESS' });
        return new Response(null, { status: 502 });
    } });
    const slides = [{ assetUrl: coverUrl, alt: 'Capa' }, { assetUrl: `${appUrl}/slide-2.jpg`, alt: 'Resumo' }];
    const id = await provider.createMedia({ slides, caption: 'Legenda' });
    assert.equal(id, '333');
    assert.deepEqual(JSON.parse(calls[0].body), { image_url: coverUrl, is_carousel_item: true, alt_text: 'Capa' });
    assert.deepEqual(JSON.parse(calls[1].body), { image_url: slides[1].assetUrl, is_carousel_item: true, alt_text: 'Resumo' });
    assert.deepEqual(JSON.parse(calls[2].body), { media_type: 'CAROUSEL', children: '111,222', caption: 'Legenda' });
    await assert.rejects(() => provider.checkMedia(id), { message: 'IG_MEDIA_PROCESSING', retry: true });
    await assert.rejects(() => provider.publish(id), { message: 'IG_PUBLISH_HTTP_502', uncertain: true });
    assert.deepEqual(JSON.parse(calls.at(-1).body), { creation_id: '333' });
});

test('Unified Login uses Facebook Graph and discovers only shared Instagram account IDs', async () => {
    const calls = [];
    const provider = instagramProvider({ userId: '123', token: 'private-token', version: 'v27.0', authMode: 'unified_login', fetcher: async (url, init) => {
        calls.push({ url, ...init });
        if (url.endsWith('/media')) return Response.json({ id: '333' });
        return Response.json({ status_code: 'FINISHED' });
    } });
    await provider.createMedia({ slides: [{ assetUrl: coverUrl, alt: 'Capa' }, { assetUrl: `${appUrl}/slide.jpg`, alt: 'Resumo' }], caption: 'Legenda' });
    await provider.checkMedia('333');
    assert.ok(calls.every(({ url }) => url.startsWith('https://graph.facebook.com/v27.0/')));
    assert.ok(calls.every(({ headers }) => headers.Authorization === 'Bearer private-token'));

    const accounts = await listInstagramAccounts({ token: 'private-token', version: 'v27.0', fetcher: async (url, init) => {
        calls.push({ url, ...init });
        return Response.json({ data: [{ id: '456', username: 'dicionariogamer' }, { id: 'invalid', username: 'ignored' }] });
    } });
    assert.deepEqual(accounts, [{ id: '456', username: 'dicionariogamer' }]);
    assert.ok(calls.at(-1).url.startsWith('https://graph.facebook.com/v27.0/me/assigned_instagram_accounts?'));
    assert.equal(calls.at(-1).headers.Authorization, 'Bearer private-token');
});

test('Instagram renders two distinct slides and points the bio at measurable news traffic', async () => {
    const news = { ...article, seoDescription: 'Uma atualização gratuita já está disponível nas lojas.' };
    const [first, second] = await renderInstagramCarousel(news, await cover('#74a1d4'), instagramContext(news));
    for (const slide of [first, second]) {
        const { width, height, format } = await sharp(slide).metadata();
        assert.deepEqual([width, height, format], [1080, 1350, 'jpeg']);
    }
    assert.notDeepEqual(first, second);
    assert.equal(instagramContext(news), news.seoDescription);
    assert.equal(instagramContext(article), article.headline);
    const bio = new URL(instagramBioUrl(appUrl));
    assert.equal(bio.pathname, '/noticias/');
    assert.equal(bio.searchParams.get('utm_source'), 'instagram');
    assert.equal(bio.searchParams.get('utm_campaign'), 'instagram_bio');
    assert.match(createSocialCopy(news, 'INSTAGRAM', appUrl).caption, /link da bio/);
});

test('X uploads JPEG and publishes once with the OAuth token', async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'dg-x-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const calls = [];
    const tokenPath = path.join(directory, 'token.json');
    const provider = xProvider({ clientId: 'test', clientSecret: 'test', refreshToken: 'initial', tokenPath, fetcher: async (url, init) => {
        calls.push({ url, ...init });
        if (url.endsWith('/token')) return Response.json({ access_token: 'access', refresh_token: 'next', expires_in: 7200 });
        return Response.json({ data: { id: url.endsWith('/upload') ? '555' : '666' } });
    } });
    const image = await renderNewsCard(article, await cover('#374e69'), 'X');
    const id = await provider.createMedia({ image });
    assert.equal(await provider.publish(id, 'Legenda'), '666');
    assert.equal(calls.length, 3);
    assert.deepEqual(JSON.parse(calls[1].body), { media: image.toString('base64'), media_category: 'tweet_image' });
    assert.deepEqual(JSON.parse(calls[2].body), { text: 'Legenda', media: { media_ids: ['555'] } });
    assert.equal(JSON.parse(await readFile(tokenPath)).refreshToken, 'next');
});

function matches(row, where) {
    return Object.entries(where).every(([key, expected]) => {
        const value = row[key];
        if (expected instanceof Date) return value?.getTime() === expected.getTime();
        if (expected && typeof expected === 'object') return Object.entries(expected).every(([op, limit]) => ({
            gte: () => value >= limit, lte: () => value <= limit, lt: () => value < limit, in: () => limit.includes(value),
        })[op]());
        return value === expected;
    });
}

function stubDb(articles) {
    const jobs = [];
    return {
        jobs,
        news: {
            findMany: async ({ where: { socialPosts, ...where } }) => articles.filter((row) => matches(row, where) &&
                !jobs.some((job) => job.newsId === row.id && job.channel === socialPosts.none.channel)),
            findFirst: async ({ where }) => articles.find((row) => matches(row, where)),
        },
        newsSocialPost: {
            createMany: async ({ data }) => { for (const item of data) if (!jobs.some((job) => job.newsId === item.newsId && job.channel === item.channel)) {
                jobs.push({ ...item, id: 'job-' + jobs.length, status: 'PENDING', attempts: 0 });
            } },
            findMany: async ({ where }) => jobs.filter((row) => matches(row, where)).map((row) => ({ ...row })),
            updateMany: async ({ where, data }) => {
                const rows = jobs.filter((row) => matches(row, where));
                rows.forEach((row) => Object.assign(row, data));
                return { count: rows.length };
            },
        },
    };
}

test('queues only new public news and does not retry an ambiguous publication', async () => {
    const db = stubDb([article, { ...article, id: 'old', publishedAt: new Date(0) }, { ...article, id: 'draft', status: 'DRAFT' }]);
    const bytes = await cover('#c3a4e4');
    let calls = 0;
    const work = { channel: 'X', startAt, appUrl, log: () => {}, fetchCover: async (url) => { assert.equal(url, coverUrl); return bytes; },
        provider: { createMedia: async () => '22', publish: async () => { calls++; throw new SocialError('TIMEOUT', { uncertain: true }); } } };
    await Promise.all([processChannel(db, work), processChannel(db, work)]);
    await processChannel(db, work);
    assert.equal(db.jobs.length, 1);
    assert.equal(db.jobs[0].status, 'REVIEW');
    assert.equal(calls, 1);
});

test('does not upload when a cover is unavailable and rebuilds an outdated Instagram card', async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'dg-ig-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const news = { ...article, image: null };
    const db = stubDb([news]);
    const bytes = await cover('#784c96');
    const requested = [];
    let uploads = 0;
    let oldMediaId;
    const work = { channel: 'INSTAGRAM', startAt, appUrl, publicApiUrl: appUrl,
        assetDirectory: directory, log: () => {},
        fetchCover: async (url) => { if (!url) throw new SocialError('ARTICLE_COVER_MISSING', { retry: true }); requested.push(url); return bytes; },
        provider: {
            createMedia: async ({ slides }) => {
                assert.equal(slides.length, 2);
                for (const [index, { assetUrl }] of slides.entries()) {
                    const filename = new URL(assetUrl).pathname.split('/').at(-1);
                    assert.match(filename, new RegExp(`^job-0-\\d+-\\d+-${index + 1}\\.jpg$`));
                    assert.equal((await sharp(await readFile(path.join(directory, filename))).metadata()).format, 'jpeg');
                }
                return String(++uploads);
            },
            checkMedia: async (id) => { if (!oldMediaId) { oldMediaId = id; throw new SocialError('IG_MEDIA_PROCESSING', { retry: true }); } },
            publish: async (id) => { assert.notEqual(id, oldMediaId); return '123'; },
        },
    };
    await processChannel(db, work);
    assert.equal(uploads, 0);
    assert.equal(db.jobs[0].lastError, 'ARTICLE_COVER_MISSING');
    db.jobs[0].nextAttemptAt = new Date(0);
    news.image = coverUrl;
    await processChannel(db, work);
    assert.equal(db.jobs[0].lastError, 'IG_MEDIA_PROCESSING');
    db.jobs[0].nextAttemptAt = new Date(0);
    news.image = appUrl + '/nova-capa.webp';
    news.updatedAt = new Date(news.updatedAt.getTime() + 1000);
    await processChannel(db, work);
    assert.equal(db.jobs[0].status, 'PUBLISHED');
    assert.deepEqual(requested, [coverUrl, news.image]);
});
