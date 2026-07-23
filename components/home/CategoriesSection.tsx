import React from 'react';
import { Link } from 'react-router-dom';
import type { CatalogMeta } from '../../types';
import { SectionHeader } from './SectionHeader';

interface CategoriesSectionProps {
    tags: CatalogMeta['tags'] | null;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({ tags }) => {
    // Most-populated categories first; cap so it stays a tidy cloud.
    const top = tags ? [...tags].sort((a, b) => b.count - a.count).slice(0, 16) : null;

    return (
        <section>
            <SectionHeader
                title="Explorar por categoria"
                subtitle="Navegue o dicionário por tema"
                to="/dicionario"
                linkLabel="Ver dicionário"
            />

            {top === null ? (
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-dark-800/70" />
                    ))}
                </div>
            ) : top.length === 0 ? (
                <p className="text-sm text-gray-500">Ainda não há categorias.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {top.map((tag) => (
                        <Link
                            key={tag.name}
                            to={`/dicionario?tag=${encodeURIComponent(tag.name)}`}
                            className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-dark-900 px-3.5 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-brand-500/40 hover:bg-dark-800 hover:text-white"
                        >
                            {tag.name}
                            <span className="rounded bg-dark-950 px-1.5 py-0.5 text-[10px] font-bold text-gray-500 tabular-nums group-hover:text-brand-400">
                                {tag.count}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
};
