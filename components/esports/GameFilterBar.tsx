import React from 'react';
import { gameAccent } from './gameMeta';

export interface GameFilterOption {
    key: string;   // 'all' or a short game label
    label: string;
    live: number;  // matches live right now for this game
    total: number; // total items (matches + results + tournaments) for this game
}

interface GameFilterBarProps {
    options: GameFilterOption[];
    active: string;
    onChange: (key: string) => void;
}

// Primary navigation for the esports page: pick a game (or "Todos"). The red badge
// shows how many matches are live now, so "o que o Brasil esta jogando" is obvious.
export const GameFilterBar: React.FC<GameFilterBarProps> = ({ options, active, onChange }) => {
    if (options.length <= 1) return null;
    return (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {options.map((option) => {
                const selected = option.key === active;
                const accent = option.key === 'all' ? null : gameAccent(option.label);
                return (
                    <button
                        key={option.key}
                        onClick={() => onChange(option.key)}
                        className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                            selected
                                ? 'border-brand-500/60 bg-brand-500/10 text-brand-200'
                                : 'border-dark-700 text-gray-400 hover:border-dark-600 hover:text-gray-200'
                        }`}
                    >
                        {accent && <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden />}
                        <span>{option.label}</span>
                        {option.live > 0 && (
                            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 text-[10px] font-bold text-red-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> {option.live}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
