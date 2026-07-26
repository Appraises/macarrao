import type { Register, WordClass } from '../types';

/**
 * Tone of a sense. `warn` marks the ones a newcomer, a parent or a streamer needs to
 * see before using the word — a dictionary that presents an insult with the same
 * weight as a neutral term is failing the reader.
 */
const REGISTERS: Record<Register, { label: string; hint: string; className: string }> = {
    // Cinza é o padrão: a tag informa quem repara, sem competir com a definição.
    // Só "ofensivo" ganha cor, porque é o único caso em que usar a palavra sem saber
    // tem consequência real.
    NEUTRO: { label: 'neutro', hint: 'Uso descritivo, sem carga.', className: 'text-gray-500' },
    INFORMAL: { label: 'informal', hint: 'Gíria casual — tranquilo entre amigos, evite em contexto formal.', className: 'text-gray-500' },
    IRONICO: { label: 'irônico', hint: 'Quase sempre usado com sarcasmo. O sentido literal engana.', className: 'text-gray-500' },
    PEJORATIVO: { label: 'pejorativo', hint: 'Deprecia quem recebe. Pode soar como provocação.', className: 'text-gray-500' },
    OFENSIVO: { label: 'ofensivo', hint: 'Usado como xingamento. Pode render denúncia ou banimento.', className: 'text-red-400/70' },
};

export const REGISTER_OPTIONS = (Object.keys(REGISTERS) as Register[])
    .map((value) => ({ value, label: REGISTERS[value].label, hint: REGISTERS[value].hint }));

export const registerMeta = (value?: Register | null) => (value ? REGISTERS[value] : null);

/**
 * Print dictionaries abbreviate the grammatical class next to each sense
 * (s.m., v., adj.). We keep the same convention, with the full name on hover.
 */
const CLASSES: Record<WordClass, { short: string; full: string }> = {
    SUBSTANTIVO: { short: 'subst.', full: 'Substantivo' },
    VERBO: { short: 'v.', full: 'Verbo' },
    ADJETIVO: { short: 'adj.', full: 'Adjetivo' },
    ADVERBIO: { short: 'adv.', full: 'Advérbio' },
    INTERJEICAO: { short: 'interj.', full: 'Interjeição' },
    EXPRESSAO: { short: 'expr.', full: 'Expressão' },
};

export const WORD_CLASS_OPTIONS = (Object.keys(CLASSES) as WordClass[])
    .map((value) => ({ value, label: CLASSES[value].full }));

export const wordClassShort = (value?: WordClass | null) => (value ? CLASSES[value]?.short : null);
export const wordClassFull = (value?: WordClass | null) => (value ? CLASSES[value]?.full : null);

/**
 * Suggested inflection labels per class. Brazilian gamer slang mostly verbs English
 * words (gank -> gankar), so the verb set is the one that earns its keep.
 */
export const INFLECTION_LABELS: Record<WordClass, string[]> = {
    VERBO: ['infinitivo', 'passado', 'particípio', 'gerúndio'],
    SUBSTANTIVO: ['plural'],
    ADJETIVO: ['feminino', 'plural'],
    ADVERBIO: [],
    INTERJEICAO: [],
    EXPRESSAO: ['variação'],
};

/**
 * Best-effort forms for a regular -ar verb, which is what English game verbs become
 * in Portuguese (gankar, gankei, gankado, gankando). Only a starting point: the
 * contributor edits or deletes anything that does not fit.
 */
export const suggestVerbForms = (infinitive: string): Array<{ label: string; form: string }> => {
    const verb = infinitive.trim().toLowerCase();
    if (!verb.endsWith('ar') || verb.length < 4) return [];
    const stem = verb.slice(0, -2);
    return [
        { label: 'infinitivo', form: verb },
        { label: 'passado', form: `${stem}ei` },
        { label: 'particípio', form: `${stem}ado` },
        { label: 'gerúndio', form: `${stem}ando` },
    ];
};
