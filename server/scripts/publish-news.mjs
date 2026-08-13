import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ALLOWED_CATEGORIES = new Set(['LANÇAMENTOS', 'LANÃ‡AMENTOS', 'RUMORES', 'INDÚSTRIA', 'INDÃšSTRIA', 'NINTENDO', 'PLAYSTATION', 'XBOX', 'PC', 'E-SPORTS']);
const MAX_ITEMS = 10;
const STOP_WORDS = new Set([
    'a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
    'entre', 'mais', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por', 'que',
    'sem', 'sobre', 'um', 'uma', 'umas', 'uns'
]);

const readStdin = async () => {
    let body = '';
    for await (const chunk of process.stdin) body += chunk;
    return body;
};

const requiredText = (value, field, max = 200000) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) {
        throw new Error(`Campo invÃ¡lido: ${field}`);
    }
    return value.trim();
};

const normalizeForComparison = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&amp;/g, 'e')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const headlineTokens = (value) => new Set(
    normalizeForComparison(value)
        .split(/\s+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
);

const headlineSimilarity = (left, right) => {
    const a = headlineTokens(left);
    const b = headlineTokens(right);
    if (a.size < 4 || b.size < 4) return 0;
    const intersection = [...a].filter((token) => b.has(token)).length;
    return intersection / new Set([...a, ...b]).size;
};

const sourceUrls = (content) => new Set(
    [...String(content || '').matchAll(/https?:\/\/[^\s"'<>)]+/gi)]
        .map(([url]) => url.replace(/[.,;:!?]+$/g, '').replace(/&amp;/g, '&'))
        .filter(Boolean)
);

const duplicateReason = (item, existing) => {
    if (item.slug === existing.slug) return 'slug igual';

    const incomingSources = sourceUrls(item.content);
    const existingSources = sourceUrls(existing.content);
    if ([...incomingSources].some((url) => existingSources.has(url))) return 'mesma fonte';

    const incomingHeadline = normalizeForComparison(item.headline);
    const existingHeadline = normalizeForComparison(existing.headline);
    if (incomingHeadline && incomingHeadline === existingHeadline) return 'título igual';
    if (headlineSimilarity(item.headline, existing.headline) >= 0.82) return 'título muito semelhante';
    return null;
};

const normalizeItem = (raw) => {
    const headline = requiredText(raw.headline, 'headline', 180);
    const slug = requiredText(raw.slug, 'slug', 180);
    const categoryInput = requiredText(raw.category, 'category', 40).toUpperCase();
    // PowerShell's native stdin bridge can replace non-ASCII characters on some hosts.
    const category = categoryInput === 'LAN?AMENTOS' ? 'LANÇAMENTOS' : categoryInput;
    const author = requiredText(raw.author, 'author', 120);
    const content = requiredText(raw.content, 'content');
    const image = raw.image == null ? null : requiredText(raw.image, 'image', 2000);
    const seoTitle = raw.seoTitle == null ? headline : requiredText(raw.seoTitle, 'seoTitle', 180);
    const seoDescription = raw.seoDescription == null ? null : requiredText(raw.seoDescription, 'seoDescription', 320);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Slug invÃ¡lido: ${slug}`);
    if (!ALLOWED_CATEGORIES.has(category)) throw new Error(`Categoria nÃ£o permitida: ${category}`);
    return { headline, slug, category, image, content, author, seoTitle, seoDescription };
};

const isUniqueViolation = (error) => error?.code === 'P2002';

const main = async () => {
    if (process.argv.includes('--help')) {
        console.log('Uso: cat materias.json | node scripts/publish-news.mjs --apply');
        return;
    }
    if (!process.argv.includes('--apply')) throw new Error('Modo seguro: informe --apply para publicar.');
    const parsed = JSON.parse(await readStdin());
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_ITEMS) {
        throw new Error(`Envie de 1 a ${MAX_ITEMS} matÃ©rias em um array JSON.`);
    }

    const items = parsed.map(normalizeItem);
    const existing = await prisma.news.findMany({
        where: { status: { not: 'ARCHIVED' } },
        select: { id: true, slug: true, headline: true, content: true, status: true, publishedAt: true }
    });
    const published = [];
    const skipped = [];

    for (const item of items) {
        const duplicate = existing
            .map((record) => ({ record, reason: duplicateReason(item, record) }))
            .find((candidate) => candidate.reason);

        if (duplicate) {
            skipped.push({ headline: item.headline, slug: item.slug, reason: duplicate.reason, existingSlug: duplicate.record.slug });
            continue;
        }

        try {
            const saved = await prisma.news.create({
                data: { ...item, status: 'PUBLISHED', publishedAt: new Date() },
                select: { id: true, slug: true, headline: true, status: true, publishedAt: true }
            });
            published.push(saved);
            existing.push({ ...saved, content: item.content });
        } catch (error) {
            if (isUniqueViolation(error)) {
                skipped.push({ headline: item.headline, slug: item.slug, reason: 'slug criado por outra rodada', existingSlug: item.slug });
                continue;
            }
            throw error;
        }
    }

    console.log(JSON.stringify({ published, skipped, summary: { published: published.length, skipped: skipped.length } }, null, 2));
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
