import React from 'react';
import { Gamepad2, LayoutGrid } from 'lucide-react';
import { gameLogo } from './gameMeta';

// Same hues as the per-game accents, as raw colors for the active underline.
const accents: Record<string, string> = {
    cs2: '#fbbf24', valorant: '#f87171', lol: '#38bdf8', 'dota-2': '#fb7185',
    r6: '#fb923c', 'rocket-league': '#60a5fa', 'free-fire': '#34d399',
};

export interface EsportsGameOption {
    key: string;
    label: string;
    live: number;
    image?: string | null;
}

interface EsportsGameTabsProps {
    options: EsportsGameOption[];
    active: string;
    onChange: (key: string) => void;
}

export const EsportsGameTabs: React.FC<EsportsGameTabsProps> = ({ options, active, onChange }) => (
    <nav aria-label="Jogos" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div role="group" aria-label="Filtrar por jogo" className="flex w-max min-w-full gap-1 border-b border-white/10">
            {options.map((option) => {
                const selected = option.key === active;
                const logo = gameLogo(option.label);
                return (
                    <button key={option.key} type="button" onClick={() => onChange(option.key)}
                        aria-label={option.live ? `${option.label}, ${option.live} ao vivo` : option.label}
                        aria-pressed={selected}
                        style={{ '--tab-accent': accents[option.key] ?? '#38bdf8' } as React.CSSProperties}
                        className="relative flex min-h-12 shrink-0 items-center gap-2 px-3.5 text-sm font-semibold text-slate-400 transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400 aria-pressed:text-white aria-pressed:after:bg-[var(--tab-accent)]">
                        {logo
                            ? <img src={logo} alt="" className={`h-4 w-5 object-contain brightness-0 invert ${selected ? 'opacity-100' : 'opacity-60'}`} />
                            : option.key === 'all' ? <LayoutGrid size={16} aria-hidden="true" /> : <Gamepad2 size={16} aria-hidden="true" />}
                        {option.label}
                        {option.live > 0 && (
                            <span aria-hidden="true" className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />{option.live}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    </nav>
);
