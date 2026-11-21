import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { renderInstagramCarousel, renderNewsCard } from './social/art.mjs';
import { loadArticleCover } from './social/cover.mjs';
import { createSocialCopy, instagramBioUrl, instagramContext } from './social/queue.mjs';

const [file, slug] = process.argv.slice(2);
const directory = path.resolve('.preview/social');
const url = process.env.SOCIAL_PREVIEW_APP_URL || 'https://dicionariogamer.com';

async function latestPublished() {
    const prisma = new PrismaClient();
    try {
        return await prisma.news.findFirst({
            where: { status: 'PUBLISHED', image: { not: null }, publishedAt: { lte: new Date() } },
            orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        });
    } finally { await prisma.$disconnect(); }
}

try {
    const input = file ? JSON.parse(await readFile(file, 'utf8')) : await latestPublished();
    const news = Array.isArray(input) ? input.find((item) => (!slug || item.slug === slug) && item.image && item.publishedAt) : input;
    if (!news) throw new Error('ARTICLE_NOT_FOUND_FOR_PREVIEW');
    const cover = await loadArticleCover(news.image, url);
    const [[instagram, context], x] = await Promise.all([
        renderInstagramCarousel(news, cover, instagramContext(news)), renderNewsCard(news, cover, 'X'),
    ]);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'post.jpg'), instagram);
    await writeFile(path.join(directory, 'post-2.jpg'), context);
    await writeFile(path.join(directory, 'post-x.jpg'), x);
    await writeFile(path.join(directory, 'legendas.json'), JSON.stringify({
        instagram: { ...createSocialCopy(news, 'INSTAGRAM', url), bioUrl: instagramBioUrl(url) }, x: createSocialCopy(news, 'X', url),
    }, null, 2));
    console.log(`${directory} (${news.slug})`);
} catch (error) {
    console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'SOCIAL_PREVIEW_FAILED');
    process.exitCode = 1;
}
