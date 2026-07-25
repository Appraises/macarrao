/**
 * Speech for a dictionary of foreign words.
 *
 * The naive approach — feeding the entry word to speechSynthesis with a pt-BR voice —
 * mangles exactly the words this site exists for ("clutch", "gank", "cooldown"). Three
 * things fix that:
 *
 *  1. Speak the pt-BR respelling when we have one. `pronunciationGuide` is written to
 *     be read by a Brazilian ("guen-k"), so a pt-BR voice nails it.
 *  2. Otherwise decide the language from the word itself and let an English voice say
 *     the English word, which is the actual pronunciation people are asking about.
 *  3. Pick the best available voice instead of the browser default, and wait for the
 *     voice list to load — `getVoices()` is famously empty on the first call.
 */

export type SpeechLang = 'pt-BR' | 'en-US';

export const speechSupported = (): boolean =>
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Resolves once the browser has actually populated its voice list. */
const loadVoices = (): Promise<SpeechSynthesisVoice[]> => new Promise((resolve) => {
    if (!speechSupported()) return resolve([]);
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length) return resolve(immediate);

    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        window.speechSynthesis.removeEventListener('voiceschanged', finish);
        resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    // Some browsers never fire the event when there is nothing to load.
    window.setTimeout(finish, 1200);
});

// Vendor names that mark the modern, non-robotic voices. Ordered by how good they
// usually sound; anything unmatched still works, it just scores lower.
const QUALITY_HINTS = ['natural', 'neural', 'premium', 'enhanced', 'google', 'luciana', 'francisca', 'microsoft'];

const scoreVoice = (voice: SpeechSynthesisVoice, lang: SpeechLang): number => {
    const voiceLang = voice.lang.replace('_', '-').toLowerCase();
    const target = lang.toLowerCase();
    let score = 0;
    if (voiceLang === target) score += 100;
    else if (voiceLang.startsWith(target.split('-')[0])) score += 60; // pt-PT for pt-BR, en-GB for en-US
    else return -1; // wrong language entirely: never use it

    const name = voice.name.toLowerCase();
    const hit = QUALITY_HINTS.findIndex((hint) => name.includes(hint));
    if (hit >= 0) score += (QUALITY_HINTS.length - hit) * 4;
    if (voice.localService) score += 2; // local voices do not stall on a network hop
    if (voice.default) score += 1;
    return score;
};

const pickVoice = (voices: SpeechSynthesisVoice[], lang: SpeechLang): SpeechSynthesisVoice | null => {
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const voice of voices) {
        const score = scoreVoice(voice, lang);
        if (score > bestScore) { bestScore = score; best = voice; }
    }
    return bestScore >= 0 ? best : null;
};

// Portuguese orthography markers. Gamer slang is overwhelmingly English, so English is
// the default and we only switch when the spelling is clearly Portuguese.
const PT_MARKERS = /[ãõáéíóúâêôàçÃÕÁÉÍÓÚÂÊÔÀÇ]/;
const PT_ENDINGS = /(ar|er|ir|ão|inho|inha|ada|ado|agem|eiro|eira)$/i;

export const guessLang = (word: string): SpeechLang => {
    const value = word.trim().toLowerCase();
    if (PT_MARKERS.test(value)) return 'pt-BR';
    // Multi-word Portuguese expressions ("de boa", "sem noção")
    if (value.includes(' ') && /\b(de|do|da|no|na|pra|que|com|sem)\b/.test(value)) return 'pt-BR';
    if (PT_ENDINGS.test(value) && value.length > 4) return 'pt-BR';
    return 'en-US';
};

/**
 * Curated respellings for the words a pt-BR voice would otherwise destroy. English
 * spelling is irregular, so rules alone mispronounce exactly the famous cases —
 * a short hand-written map is more accurate than any clever algorithm here.
 */
const RESPELL_EXCEPTIONS: Record<string, string> = {
    ace: 'eis', buff: 'bâf', bug: 'bâgue', camper: 'quêmper', carry: 'quéri',
    clutch: 'clâtch', cooldown: 'cul-dáun', creep: 'cripe', feed: 'fide', feeder: 'fider',
    gank: 'guênque', gg: 'dji-dji', healer: 'ríler', jungle: 'djângou', lag: 'légue',
    loot: 'lute', mid: 'mide', nerf: 'nérfe', noob: 'nube', pick: 'pique', ping: 'pingue',
    push: 'púchi', rush: 'râchi', smurf: 'smârfe', spike: 'spáique', tank: 'tênque',
    team: 'time', throw: 'trôu', wipe: 'uáipe',
};

// Ordered rewrites for whatever the map does not cover. Digraphs go first so later
// single-letter rules do not break them.
const RESPELL_RULES: Array<[RegExp, string]> = [
    [/ck/g, 'que'], [/ch/g, 'tch'], [/sh/g, 'ch'], [/ph/g, 'f'], [/th/g, 'f'],
    [/ee|ea/g, 'i'], [/oo/g, 'u'], [/ou|ow/g, 'au'], [/ai|ay/g, 'ei'],
    [/y$/g, 'i'], [/w/g, 'u'], [/k/g, 'que'],
    [/u/g, 'â'], [/e$/g, ''],
];

/** Approximate pt-BR respelling of an English word. Clearly a fallback, not truth. */
export const respellForPtBr = (word: string): string => {
    const value = word.trim().toLowerCase();
    if (RESPELL_EXCEPTIONS[value]) return RESPELL_EXCEPTIONS[value];
    return RESPELL_RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
};

export interface SpeakInput {
    word: string;
    /** pt-BR respelling, e.g. "guen-k". When present it always wins. */
    guide?: string | null;
}

export interface ResolvedSpeech {
    text: string;
    lang: SpeechLang;
    /** 'guide' = editorial respelling, 'native' = real English voice, 'respelled' = our approximation. */
    source: 'guide' | 'native' | 'respelled';
}

/**
 * Decides what to say and how. Needs the voice list because the answer depends on
 * what the machine actually has: with no English voice installed, saying an English
 * word "in English" just hands it to a Portuguese voice and mangles it — so we
 * respell it instead.
 */
export const resolveSpeech = (
    { word, guide }: SpeakInput,
    voices: SpeechSynthesisVoice[] = [],
): ResolvedSpeech => {
    const trimmedGuide = (guide || '').trim();
    if (trimmedGuide) return { text: trimmedGuide, lang: 'pt-BR', source: 'guide' };

    const lang = guessLang(word);
    if (lang === 'pt-BR') return { text: word, lang, source: 'native' };

    const hasEnglishVoice = voices.some((voice) => scoreVoice(voice, 'en-US') >= 0);
    return hasEnglishVoice
        ? { text: word, lang: 'en-US', source: 'native' }
        : { text: respellForPtBr(word), lang: 'pt-BR', source: 'respelled' };
};

/** Voice list for callers that need to resolve before speaking (e.g. tooltips). */
export const getVoices = loadVoices;

export const cancelSpeech = () => {
    if (speechSupported()) window.speechSynthesis.cancel();
};

/**
 * Speaks the term. Resolves when playback finishes (or immediately if unsupported),
 * so callers can drive a "speaking" state.
 */
export const speakTerm = async (input: SpeakInput): Promise<void> => {
    if (!speechSupported()) return;

    const voices = await loadVoices();
    const { text, lang } = resolveSpeech(input, voices);
    if (!text) return;

    const voice = pickVoice(voices, lang);

    return new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang || lang;
        if (voice) utterance.voice = voice;
        // A single word goes by fast; slowing it slightly makes it intelligible.
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
};
