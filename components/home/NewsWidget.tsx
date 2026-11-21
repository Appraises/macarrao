import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../UI';
import { getNews } from '../../src/services/api';
import type { News as NewsItem } from '../../types';
import { SectionHeader } from './SectionHeader';

const formatTimeAgo = (date?: string | null) => {
    if (!date) return 'Recentemente';
    const elapsedHours = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000));
    if (elapsedHours < 1) return 'Agora';
    if (elapsedHours < 24) return `${elapsedHours}h atrás`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d atrás`;
};

export const NewsWidget: React.FC = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState<NewsItem[]>([]);
    const lastFetchedAt = useRef(0);

    useEffect(() => {
        let active = true;
        let loading = false;
        const loadNews = () => {
            if (loading || Date.now() - lastFetchedAt.current < 5 * 60 * 1000) return;
            loading = true;
            getNews({ page: 1, pageSize: 6, sort: 'publishedAt', order: 'desc' })
                .then((data) => {
                    if (!active) return;
                    setNews(data.items);
                    lastFetchedAt.current = Date.now();
                })
                .catch((error) => console.error('[home-news] Failed to load news:', error))
                .finally(() => {
                    loading = false;
                });
        };
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') loadNews();
        };

        loadNews();
        document.addEventListener('visibilitychange', refreshWhenVisible);
        window.addEventListener('pageshow', refreshWhenVisible);
        return () => {
            active = false;
            document.removeEventListener('visibilitychange', refreshWhenVisible);
            window.removeEventListener('pageshow', refreshWhenVisible);
        };
    }, []);

    if (news.length === 0) return null;

    const [featured, ...rest] = news;

    return (
        <section>
            <SectionHeader title="Últimas Notícias" to="/noticias" linkLabel="Ver todas" />

            <div className="bg-dark-900/60 border border-white/5 rounded-xl overflow-hidden">
                {/* Featured */}
                <div className="group cursor-pointer" onClick={() => navigate(`/noticias/${featured.id}`)}>
                    <div className="h-36 relative overflow-hidden">
                        <img src={featured.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={featured.headline} />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent"></div>
                        <div className="absolute top-2 left-2">
                            <Badge color="brand">{featured.category}</Badge>
                        </div>
                    </div>
                    <div className="px-4 pt-3 pb-4 border-b border-dark-800">
                        <h3 className="text-sm font-bold text-white leading-snug group-hover:text-brand-400 transition-colors">{featured.headline}</h3>
                        <p className="text-[10px] text-gray-500 mt-1.5">{formatTimeAgo(featured.publishedAt || featured.createdAt)}{featured.author ? ` • ${featured.author}` : ''}</p>
                    </div>
                </div>

                {/* Text-first list */}
                <div className="divide-y divide-dark-800">
                    {rest.slice(0, 5).map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/noticias/${item.id}`)}
                            className="px-4 py-3 group cursor-pointer hover:bg-dark-800/50 transition-colors"
                        >
                            <span className="text-[9px] font-bold text-brand-500 uppercase tracking-wider">{item.category}</span>
                            <h4 className="text-xs font-bold text-gray-200 leading-snug group-hover:text-white line-clamp-2 mt-0.5">{item.headline}</h4>
                            <p className="text-[9px] text-gray-500 mt-1">{formatTimeAgo(item.publishedAt || item.createdAt)}{item.author ? ` • ${item.author}` : ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
