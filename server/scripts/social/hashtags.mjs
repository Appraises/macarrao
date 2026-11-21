const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 40;
const tagKey = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function normalizeInstagramHashtags(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error('instagramHashtags deve ser uma lista de hashtags.');

    const tags = new Map();
    for (const item of value) {
        const tag = typeof item === 'string' ? item.trim().replace(/^#/, '').normalize('NFC') : '';
        if (!/^[\p{L}\p{N}_]+$/u.test(tag) || !/\p{L}/u.test(tag) || [...tag].length > MAX_TAG_LENGTH) {
            throw new Error('Cada hashtag deve ter ate 40 letras, numeros ou underscores, sem espacos.');
        }
        const key = tagKey(tag);
        if (!tags.has(key)) tags.set(key, tag);
        if (tags.size > MAX_TAGS) throw new Error(`Use no maximo ${MAX_TAGS} hashtags do Instagram por noticia.`);
    }
    return [...tags.values()];
}

export function formatInstagramHashtags(value, caption) {
    const existing = [...caption.matchAll(/#([\p{L}\p{M}\p{N}_]+)/gu)].map(([, tag]) => tagKey(tag));
    const slots = Math.max(0, MAX_TAGS - existing.length);
    return normalizeInstagramHashtags(value)
        .filter((tag) => !existing.includes(tagKey(tag)))
        .slice(0, slots)
        .map((tag) => '#' + tag)
        .join(' ');
}
