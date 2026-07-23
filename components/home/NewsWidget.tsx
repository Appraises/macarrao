import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../UI';
import { EsportsNews as EsportsNewsType } from '../../types';
import { esportsService } from '../../services/esportsService';
import { SectionHeader } from './SectionHeader';

export const NewsWidget: React.FC = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState<EsportsNewsType[]>([]);

    useEffect(() => {
        esportsService.getNews().then(data => setNews(data));
    }, []);

    if (news.length === 0) return null;

    const [featured, ...rest] = news;

    return (
        <section>
            <SectionHeader title="Últimas Notícias" to="/news" linkLabel="Ver todas" />

            <div className="bg-dark-900/60 border border-white/5 rounded-xl overflow-hidden">
                {/* Featured */}
                <div className="group cursor-pointer" onClick={() => navigate(`/news/${featured.id}`)}>
                    <div className="h-36 relative overflow-hidden">
                        <img src={featured.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={featured.headline} />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent"></div>
                        <div className="absolute top-2 left-2">
                            <Badge color="brand">{featured.category}</Badge>
                        </div>
                    </div>
                    <div className="px-4 pt-3 pb-4 border-b border-dark-800">
                        <h3 className="text-sm font-bold text-white leading-snug group-hover:text-brand-400 transition-colors">{featured.headline}</h3>
                        <p className="text-[10px] text-gray-500 mt-1.5">{featured.timeAgo}{featured.author ? ` • ${featured.author}` : ''}</p>
                    </div>
                </div>

                {/* Text-first list */}
                <div className="divide-y divide-dark-800">
                    {rest.slice(0, 5).map((item) => (
                        <div
                            key={item.id}
                            onClick={() => navigate(`/news/${item.id}`)}
                            className="px-4 py-3 group cursor-pointer hover:bg-dark-800/50 transition-colors"
                        >
                            <span className="text-[9px] font-bold text-brand-500 uppercase tracking-wider">{item.category}</span>
                            <h4 className="text-xs font-bold text-gray-200 leading-snug group-hover:text-white line-clamp-2 mt-0.5">{item.headline}</h4>
                            <p className="text-[9px] text-gray-500 mt-1">{item.timeAgo}{item.author ? ` • ${item.author}` : ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
