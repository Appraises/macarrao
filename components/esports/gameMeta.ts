// Shared helpers so every esports surface labels and colors a game the same way.
// The API sends full game names ("Counter-Strike 2"); the UI wants short chips ("CS2").

const SHORT: Array<[RegExp, string]> = [
    [/counter|cs2|cs:go|csgo/i, 'CS2'],
    [/valorant|valo/i, 'Valorant'],
    [/league of legends|lol\b/i, 'LoL'],
    [/dota/i, 'Dota 2'],
    [/rainbow|siege|r6/i, 'R6'],
    [/rocket league/i, 'Rocket League'],
    [/free ?fire/i, 'Free Fire'],
    [/overwatch/i, 'Overwatch'],
    [/fortnite/i, 'Fortnite'],
];

export const gameLabel = (name?: string | null): string => {
    const value = (name || '').trim();
    if (!value) return 'E-sports';
    const hit = SHORT.find(([re]) => re.test(value));
    return hit ? hit[1] : value;
};

// A stable, human key for grouping/filtering (short label works well and dedupes CS2/CS:GO etc).
export const gameKey = (name?: string | null): string => gameLabel(name);

// Per-game accent (brand-neutral, semantic-free). Falls back to the site brand color.
type Accent = { text: string; bg: string; border: string; dot: string };
const ACCENTS: Record<string, Accent> = {
    CS2: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' },
    Valorant: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
    LoL: { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', dot: 'bg-sky-400' },
    'Dota 2': { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400' },
    R6: { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
    'Free Fire': { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
    'Rocket League': { text: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' },
};
const DEFAULT_ACCENT: Accent = { text: 'text-brand-300', bg: 'bg-brand-500/10', border: 'border-brand-500/30', dot: 'bg-brand-400' };

export const gameAccent = (name?: string | null): Accent => ACCENTS[gameLabel(name)] || DEFAULT_ACCENT;
