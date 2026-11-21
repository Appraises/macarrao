import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeInstagramHashtags } from './social/hashtags.mjs';

const prisma = new PrismaClient();
const supportsInstagramHashtags = Prisma.dmmf.datamodel.models
    .find(({ name }) => name === 'News')?.fields.some(({ name }) => name === 'instagramHashtags') ?? false;
const ALLOWED_CATEGORIES = new Set(['LANÇAMENTOS', 'LANÃ‡AMENTOS', 'RUMORES', 'INDÚSTRIA', 'INDÃšSTRIA', 'NINTENDO', 'PLAYSTATION', 'XBOX', 'PC', 'E-SPORTS']);
const MAX_ITEMS = 10;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
class ImportInputError extends Error {}
const PERSONAS = {
    games: 'Lucas Andrade',
    industry: 'Marina Costa',
    rumors: 'Rafael Nunes',
    esports: 'Gabriel Martins'
};
const STOP_WORDS = new Set([
    'a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
    'entre', 'mais', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por', 'que',
    'sem', 'sobre', 'um', 'uma', 'umas', 'uns'
]);

const readStdin = async () => {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > MAX_INPUT_BYTES) throw new ImportInputError('O lote JSON excede 2 MiB.');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
};

const requiredText = (value, field, max = 200000) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) {
        throw new ImportInputError(`Campo invalido: ${field}`);
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

const authorForCategory = (category) => {
    const normalized = normalizeForComparison(category).toUpperCase();
    if (['RUMOR', 'RUMORES', 'VAZAMENTOS'].includes(normalized)) return PERSONAS.rumors;
    if (['INDUSTRIA', 'NEGOCIOS', 'TECNOLOGIA', 'BASTIDORES'].includes(normalized)) return PERSONAS.industry;
    if (['E SPORTS', 'ESPORTS', 'COMPETITIVO'].includes(normalized)) return PERSONAS.esports;
    return PERSONAS.games;
};

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
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ImportInputError('Materia invalida no lote.');
    const headline = requiredText(raw.headline, 'headline', 180);
    const slug = requiredText(raw.slug, 'slug', 180);
    const categoryInput = requiredText(raw.category, 'category', 40).toUpperCase();
    // PowerShell's native stdin bridge can replace non-ASCII characters on some hosts.
    const category = categoryInput === 'LAN?AMENTOS' ? 'LANÇAMENTOS' : categoryInput;
    const author = authorForCategory(category);
    const content = requiredText(raw.content, 'content');
    const image = raw.image == null ? null : requiredText(raw.image, 'image', 2000);
    const seoTitle = raw.seoTitle == null ? headline : requiredText(raw.seoTitle, 'seoTitle', 180);
    const seoDescription = raw.seoDescription == null ? null : requiredText(raw.seoDescription, 'seoDescription', 320);
    let instagramHashtags;
    try {
        instagramHashtags = normalizeInstagramHashtags(raw.instagramHashtags);
    } catch (error) {
        throw new ImportInputError(error.message);
    }
    const tournamentSlug = raw.tournamentSlug == null ? null : requiredText(raw.tournamentSlug, 'tournamentSlug', 180);
    if (tournamentSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tournamentSlug)) throw new ImportInputError('Slug do campeonato invalido.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ImportInputError('Slug da noticia invalido.');
    if (!ALLOWED_CATEGORIES.has(category)) throw new ImportInputError('Categoria da noticia nao permitida.');
    return { headline, slug, category, image, content, author, seoTitle, seoDescription, instagramHashtags, tournamentSlug };
};

const isUniqueViolation = (error) => error?.code === 'P2002';

const main = async () => {
    if (process.argv.includes('--help')) {
        console.log('Uso: cat materias.json | node scripts/publish-news.mjs --apply');
        return;
    }
    const apply = process.argv.includes('--apply');
    const preview = process.argv.includes('--dry-run');
    if (apply === preview) throw new ImportInputError('Informe --dry-run para conferir ou --apply para publicar.');
    const body = await readStdin();
    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch {
        throw new ImportInputError('Lote JSON invalido.');
    }
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_ITEMS) {
        throw new ImportInputError(`Envie de 1 a ${MAX_ITEMS} materias em um array JSON.`);
    }

    const items = parsed.map(normalizeItem);
    const tournamentSlugs = [...new Set(items.flatMap(({ tournamentSlug }) => tournamentSlug ? [tournamentSlug] : []))];
    const tournaments = new Map((await prisma.tournament.findMany({
        where: { slug: { in: tournamentSlugs }, publicationStatus: 'PUBLISHED' },
        select: { id: true, slug: true },
    })).map(({ id, slug }) => [slug, id]));
    for (const slug of tournamentSlugs) if (!tournaments.has(slug)) throw new ImportInputError(`Campeonato publicado nao encontrado: ${slug}`);
    const existing = await prisma.news.findMany({
        where: { status: { not: 'ARCHIVED' } },
        select: { id: true, slug: true, headline: true, content: true, status: true, publishedAt: true }
    });
    const published = [];
    const skipped = [];
    const planned = [];

    for (const { tournamentSlug, instagramHashtags, ...item } of items) {
        const duplicate = existing
            .map((record) => ({ record, reason: duplicateReason(item, record) }))
            .find((candidate) => candidate.reason);

        if (duplicate) {
            skipped.push({ headline: item.headline, slug: item.slug, reason: duplicate.reason, existingSlug: duplicate.record.slug });
            continue;
        }

        const tournamentId = tournaments.get(tournamentSlug) ?? null;
        if (preview) {
            planned.push({ slug: item.slug, author: item.author, tournamentSlug, instagramHashtags });
            existing.push(item);
            continue;
        }

        try {
            const saved = await prisma.news.create({
                data: { ...item, tournamentId, status: 'PUBLISHED', publishedAt: new Date(),
                    ...(supportsInstagramHashtags ? { instagramHashtags } : {}) },
                select: { id: true, slug: true, headline: true, status: true, publishedAt: true,
                    ...(supportsInstagramHashtags ? { instagramHashtags: true } : {}) }
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

    console.log(JSON.stringify({ published, skipped, ...(preview ? { planned } : {}),
        capabilities: { instagramHashtags: supportsInstagramHashtags },
        summary: { published: published.length, skipped: skipped.length } }, null, 2));
};

main()
    .catch((error) => {
        const code = error?.code || error?.errorCode;
        console.error(error instanceof ImportInputError ? error.message
            : /^P\d{4}$/.test(code || '') ? 'IMPORT_DATABASE_ERROR ' + code : 'IMPORT_FAILED');
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
