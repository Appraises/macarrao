import sanitizeHtml from 'sanitize-html';

export const cleanPlainText = (value: unknown): string => sanitizeHtml(
    typeof value === 'string' ? value : '',
    { allowedTags: [], allowedAttributes: {} }
).replace(/\s+/g, ' ').trim();

export const slugify = (value: unknown): string => cleanPlainText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const isAllowedMediaUrl = (value: string, uploadFolders: string[] = []): boolean => {
    if (uploadFolders.some((folder) => value.startsWith(`/uploads/${folder}/`))) return true;

    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

export const parseOptionalDate = (value: unknown): Date | null | undefined => {
    if (value === undefined || value === '') return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

