import { NewsStatus } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { cleanPlainText, isAllowedMediaUrl, parseOptionalDate, slugify } from './content';
import { publicEditorialPersona } from '../config/editorialPersonas';

const MAX_HEADLINE_LENGTH = 160;
const MAX_CATEGORY_LENGTH = 50;
const MAX_AUTHOR_LENGTH = 80;
const MAX_CONTENT_LENGTH = 100_000;

export interface NewsPayload {
    headline: string;
    slug: string;
    category: string;
    image: string | null;
    content: string;
    author: string;
    status: NewsStatus;
    publishedAt: Date | null;
    scheduledAt: Date | null;
    archivedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    tournamentId: string | null;
}

type ValidationResult =
    | { valid: true; data: NewsPayload }
    | { valid: false; error: string };

export const sanitizeNewsHtml = (value: unknown): string => sanitizeHtml(
    typeof value === 'string' ? value : '',
    {
        allowedTags: [
            'p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's',
            'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'code', 'pre',
            'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        allowedAttributes: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            th: ['colspan', 'rowspan'],
            td: ['colspan', 'rowspan']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesByTag: { img: ['http', 'https'] },
        allowProtocolRelative: false,
        transformTags: {
            a: (_tagName, attributes) => ({
                tagName: 'a',
                attribs: {
                    ...attributes,
                    rel: 'noopener noreferrer nofollow',
                    ...(attributes.target === '_blank' ? { target: '_blank' } : {})
                }
            })
        }
    }
);

export const validateNewsPayload = (input: unknown, fallbackAuthor: string): ValidationResult => {
    if (!input || typeof input !== 'object') {
        return { valid: false, error: 'Dados da noticia invalidos.' };
    }

    const body = input as Record<string, unknown>;
    const headline = cleanPlainText(body.headline);
    const slug = slugify(body.slug || headline);
    const category = cleanPlainText(body.category);
    const author = cleanPlainText(body.author) || cleanPlainText(fallbackAuthor);
    const rawContent = typeof body.content === 'string' ? body.content : '';
    const content = sanitizeNewsHtml(rawContent);
    const contentText = cleanPlainText(content);
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const status = typeof body.status === 'string' ? body.status : NewsStatus.DRAFT;
    const scheduledAt = parseOptionalDate(body.scheduledAt);
    const requestedPublishedAt = parseOptionalDate(body.publishedAt);
    const seoTitle = cleanPlainText(body.seoTitle);
    const seoDescription = cleanPlainText(body.seoDescription);
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId.trim() : '';

    if (headline.length < 5 || headline.length > MAX_HEADLINE_LENGTH) {
        return { valid: false, error: `O titulo deve ter entre 5 e ${MAX_HEADLINE_LENGTH} caracteres.` };
    }
    if (slug.length < 2) {
        return { valid: false, error: 'O slug da noticia e invalido.' };
    }
    if (category.length < 2 || category.length > MAX_CATEGORY_LENGTH) {
        return { valid: false, error: `A categoria deve ter entre 2 e ${MAX_CATEGORY_LENGTH} caracteres.` };
    }
    if (author.length < 2 || author.length > MAX_AUTHOR_LENGTH) {
        return { valid: false, error: `O autor deve ter entre 2 e ${MAX_AUTHOR_LENGTH} caracteres.` };
    }
    if (rawContent.length > MAX_CONTENT_LENGTH || contentText.length < 20) {
        return { valid: false, error: 'O conteudo deve ter entre 20 e 100.000 caracteres.' };
    }
    if (image && !isAllowedMediaUrl(image, ['news'])) {
        return { valid: false, error: 'A imagem deve usar uma URL HTTP(S) valida ou um upload do site.' };
    }
    if (!Object.values(NewsStatus).includes(status as NewsStatus)) {
        return { valid: false, error: 'Status editorial invalido.' };
    }
    if (body.scheduledAt && scheduledAt === undefined) {
        return { valid: false, error: 'A data de agendamento e invalida.' };
    }
    if (body.publishedAt && requestedPublishedAt === undefined) {
        return { valid: false, error: 'A data de publicacao e invalida.' };
    }
    if (status === NewsStatus.SCHEDULED && (!scheduledAt || scheduledAt.getTime() <= Date.now())) {
        return { valid: false, error: 'Noticias agendadas precisam de uma data futura.' };
    }
    if (seoTitle.length > 70) {
        return { valid: false, error: 'O titulo de SEO deve ter no maximo 70 caracteres.' };
    }
    if (seoDescription.length > 170) {
        return { valid: false, error: 'A descricao de SEO deve ter no maximo 170 caracteres.' };
    }
    if (tournamentId && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(tournamentId)) {
        return { valid: false, error: 'O campeonato vinculado e invalido.' };
    }

    const normalizedStatus = status as NewsStatus;
    const publishedAt = normalizedStatus === NewsStatus.PUBLISHED
        ? requestedPublishedAt || new Date()
        : null;

    return {
        valid: true,
        data: {
            headline,
            slug,
            category,
            author,
            image: image || null,
            content,
            status: normalizedStatus,
            publishedAt,
            scheduledAt: normalizedStatus === NewsStatus.SCHEDULED ? scheduledAt || null : null,
            archivedAt: normalizedStatus === NewsStatus.ARCHIVED ? new Date() : null,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            tournamentId: tournamentId || null
        }
    };
};

export const sanitizeNewsRecord = <T extends { content?: string | null; author?: string | null }>(record: T) => ({
    ...record,
    content: sanitizeNewsHtml(record.content),
    authorProfile: publicEditorialPersona(record.author)
});
