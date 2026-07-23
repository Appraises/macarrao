import React, { useEffect, useState } from 'react';
import { CatalogTermCard } from '../CatalogTermCard';
import { getTerms } from '../../src/services/api';
import type { Term } from '../../types';
import { SectionHeader } from './SectionHeader';

export const RecentTermsSection: React.FC = () => {
    const [terms, setTerms] = useState<Term[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getTerms({ sort: 'createdAt', order: 'desc', pageSize: 6, origin: 'home' })
            .then((res) => setTerms(res.items))
            .catch(() => { /* keep empty */ })
            .finally(() => setLoading(false));
    }, []);

    if (!loading && terms.length === 0) return null;

    return (
        <section>
            <SectionHeader
                title="Recém-chegados"
                subtitle="Últimos termos adicionados ao dicionário"
                to="/dicionario?sort=createdAt"
                linkLabel="Ver todos"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-52 animate-pulse rounded-lg border border-white/5 bg-dark-900" />
                    ))
                    : terms.map((term) => (
                        <CatalogTermCard key={term.id} term={term} navigationState={{ source: 'home_recent' }} />
                    ))}
            </div>
        </section>
    );
};
