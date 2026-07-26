import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gamepad2 } from 'lucide-react';
import type { Term } from '../types';
import { accentFor } from './termAccent';

// Lightweight term card for "you might also like" style recommendation rails.
export const CompactTermCard: React.FC<{ term: Term; navigationState?: Record<string, unknown> }> = ({ term, navigationState }) => {
    const accent = accentFor(term.word);
    return (
        <Link
            to={`/term/${encodeURIComponent(term.word)}`}
            state={navigationState}
            aria-label={`Ver definição de ${term.word}`}
            style={{
                background: `linear-gradient(135deg, ${accent}14, rgba(15,23,42,0.4) 42%)`,
                borderColor: `${accent}2a`,
            }}
            className="group flex flex-col gap-1 rounded-lg border px-4 py-3 transition-all duration-200 hover:brightness-125"
        >
            <div className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-white">{term.word}</span>
                <ArrowUpRight className="h-4 w-4 flex-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: accent }} />
            </div>
            <p className="line-clamp-1 text-xs text-gray-400">{term.definition}</p>
            {term.game?.name && (
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
                    <Gamepad2 className="h-3 w-3 flex-none" /> {term.game.name}
                </span>
            )}
        </Link>
    );
};
