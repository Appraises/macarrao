import { cleanPlainText } from './content';
import { normalizeTextList } from './userInput';
import { validateTermContent } from './validator';

export const parseTermPayload = (body: unknown) => {
    const input = body && typeof body === 'object' && !Array.isArray(body)
        ? body as Record<string, unknown>
        : {};
    const word = cleanPlainText(input.word);
    const definition = cleanPlainText(input.definition);
    const contentValidation = validateTermContent(word, definition);
    if (!contentValidation.isValid) return { valid: false as const, error: contentValidation.error };

    const examples = normalizeTextList(input.examples, 'Exemplos', { maxItems: 10, maxLength: 300 });
    if (!examples.valid) return examples;
    const tags = normalizeTextList(input.tags, 'Tags', { maxItems: 10, maxLength: 40 });
    if (!tags.valid) return tags;
    const gameId = cleanPlainText(input.gameId) || null;
    if (gameId && gameId.length > 100) return { valid: false as const, error: 'Jogo invalido.' };
    const phonetic = cleanPlainText(input.phonetic) || null;
    if (phonetic && phonetic.length > 100) return { valid: false as const, error: 'A fonetica deve ter no maximo 100 caracteres.' };
    const pronunciationGuide = cleanPlainText(input.pronunciationGuide) || null;
    if (pronunciationGuide && pronunciationGuide.length > 120) return { valid: false as const, error: 'O guia de pronuncia deve ter no maximo 120 caracteres.' };
    const relatedTerms = normalizeTextList(input.relatedTerms, 'Termos relacionados', { maxItems: 10, maxLength: 100 });
    if (!relatedTerms.valid) return relatedTerms;
    if (relatedTerms.data.some((item) => item.localeCompare(word, undefined, { sensitivity: 'base' }) === 0)) {
        return { valid: false as const, error: 'Um termo nao pode ser relacionado a ele mesmo.' };
    }

    // Alternate spellings/forms used for search + SEO. Drop any that equal the word.
    const aliasesResult = normalizeTextList(input.aliases, 'Variacoes', { maxItems: 15, maxLength: 60 });
    if (!aliasesResult.valid) return aliasesResult;
    const aliases = aliasesResult.data.filter((item) => item.localeCompare(word, undefined, { sensitivity: 'base' }) !== 0);

    return {
        valid: true as const,
        data: {
            word,
            definition,
            gameId,
            examples: examples.data,
            tags: tags.data,
            phonetic,
            pronunciationGuide,
            relatedTerms: relatedTerms.data,
            aliases
        }
    };
};

export const termSnapshot = (term: {
    word: string;
    definition: string;
    gameId: string | null;
    examples: unknown;
    tags: unknown;
    phonetic?: string | null;
    pronunciationGuide?: string | null;
    relatedTerms?: unknown;
    aliases?: unknown;
}) => ({
    word: term.word,
    definition: term.definition,
    gameId: term.gameId,
    examples: Array.isArray(term.examples) ? term.examples : [],
    tags: Array.isArray(term.tags) ? term.tags : [],
    phonetic: term.phonetic || null,
    pronunciationGuide: term.pronunciationGuide || null,
    relatedTerms: Array.isArray(term.relatedTerms) ? term.relatedTerms : [],
    aliases: Array.isArray(term.aliases) ? term.aliases : []
});
