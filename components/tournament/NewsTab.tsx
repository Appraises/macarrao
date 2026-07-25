import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { Badge } from '../UI';
import { EsportsNews } from '../../types';

/**
 * News art is an external URL, and those rot — the old placeholder host is already
 * gone and seeded stock photos die too. Falling back on error keeps a dead link from
 * rendering a broken-image icon.
 */
const NewsThumb: React.FC<{ src?: string | null; alt: string }> = ({ src, alt }) => {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-900/30 to-dark-950">
                <Newspaper className="h-10 w-10 text-brand-500/40" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
    );
};

/**
 * News attached to a tournament. Receives the items the detail page already loaded —
 * fetching all site news here would show articles unrelated to this tournament, which
 * is what the previous version did.
 */
export const NewsTab: React.FC<{ news: EsportsNews[] }> = ({ news }) => {
    if (news.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-dark-700 bg-dark-900/40 py-16 text-center">
                <Newspaper className="mx-auto mb-3 h-9 w-9 text-gray-600" />
                <p className="text-sm text-gray-500">Nenhuma notícia publicada para este campeonato.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
                <Link
                    key={item.id}
                    to={`/news/${item.slug || item.id}`}
                    className="group overflow-hidden rounded-lg border border-dark-800 bg-dark-900 transition-all hover:border-brand-500/50"
                >
                    <div className="relative h-40 overflow-hidden bg-dark-950">
                        <NewsThumb src={item.image} alt={item.headline} />
                        <div className="absolute left-2 top-2">
                            <Badge color="brand">{item.category}</Badge>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="mb-2 line-clamp-2 font-bold leading-tight text-white transition-colors group-hover:text-brand-400">
                            {item.headline}
                        </h4>
                        <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase text-gray-500">
                            <span>{item.author || 'Redação'}</span>
                            <span>{item.timeAgo}</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
};
