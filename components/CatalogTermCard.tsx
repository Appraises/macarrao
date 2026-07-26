import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gamepad2, ThumbsUp } from 'lucide-react';
import type { Term } from '../types';
import { accentFor } from './termAccent';

interface CatalogTermCardProps {
  term: Term;
  onOpen?: () => void;
  navigationState?: Record<string, unknown>;
}

export const CatalogTermCard: React.FC<CatalogTermCardProps> = ({ term, onOpen, navigationState }) => {
  const accent = accentFor(term.word);

  return (
    <article
      style={{
        // A tinted wash instead of flat dark-on-dark: the card reads as an object,
        // and each term keeps a stable identity color across the whole site.
        background: `linear-gradient(140deg, ${accent}12, rgba(15,23,42,0.55) 55%)`,
        borderColor: `${accent}33`,
      }}
      className="group/card h-full min-h-52 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
    >
      <Link
        to={`/term/${encodeURIComponent(term.word)}`}
        state={navigationState}
        onClick={onOpen}
        className="group flex h-full flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label={`Ver definição de ${term.word}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-white">{term.word}</h2>
            {term.game && (
              <span
                style={{ color: accent, borderColor: `${accent}40`, background: `${accent}14` }}
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold"
              >
                <Gamepad2 className="h-3 w-3 flex-none" />
                <span className="truncate">{term.game.name}</span>
              </span>
            )}
          </div>
          <ArrowUpRight
            style={{ color: accent }}
            className="h-4 w-4 flex-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </div>

        <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-gray-200">{term.definition}</p>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {(term.tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="max-w-28 truncate rounded bg-white/[0.06] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
          <span
            className="inline-flex flex-none items-center gap-1 text-xs font-bold text-gray-300"
            title={`${term.upvotes || 0} votos positivos`}
          >
            <ThumbsUp className="h-3.5 w-3.5" style={{ color: accent }} /> {term.upvotes || 0}
          </span>
        </div>
      </Link>
    </article>
  );
};
