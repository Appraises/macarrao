import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gamepad2, ThumbsUp } from 'lucide-react';
import type { Term } from '../types';

interface CatalogTermCardProps {
  term: Term;
  onOpen?: () => void;
  navigationState?: Record<string, unknown>;
}

export const CatalogTermCard: React.FC<CatalogTermCardProps> = ({ term, onOpen, navigationState }) => (
  <article className="h-full min-h-52 rounded-lg border border-white/10 bg-dark-900 transition-colors hover:border-brand-500/40 hover:bg-dark-800/70">
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
            <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded border border-white/10 bg-dark-950 px-2 py-1 text-[11px] font-semibold text-gray-400">
              <Gamepad2 className="h-3 w-3 flex-none" />
              <span className="truncate">{term.game.name}</span>
            </span>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 flex-none text-gray-600 transition-colors group-hover:text-brand-400" />
      </div>

      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-gray-300">{term.definition}</p>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/5 pt-4">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {(term.tags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="max-w-28 truncate rounded bg-dark-950 px-2 py-1 text-[10px] font-bold uppercase text-gray-500">
              {tag}
            </span>
          ))}
        </div>
        <span className="inline-flex flex-none items-center gap-1 text-xs font-semibold text-gray-500" title={`${term.upvotes || 0} votos positivos`}>
          <ThumbsUp className="h-3.5 w-3.5" /> {term.upvotes || 0}
        </span>
      </div>
    </Link>
  </article>
);
