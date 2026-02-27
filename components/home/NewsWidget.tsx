import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ExternalLink } from 'lucide-react';
import { Badge } from '../UI';
import { EsportsNews as EsportsNewsType } from '../../types';
import { esportsService } from '../../services/esportsService';

export const NewsWidget: React.FC = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState<EsportsNewsType[]>([]);

    useEffect(() => {
        esportsService.getNews().then(data => setNews(data));
    }, []);

    if (news.length === 0) return null;

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden flex flex-col shadow-card">
            <div className="px-5 py-4 border-b border-dark-800 bg-dark-950/30 flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-bold text-white tracking-tight">Últimas Notícias</h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Atualizações do cenário</span>
                </div>
                <Newspaper className="text-dark-600 w-4 h-4" />
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[600px] no-scrollbar">
                {/* Featured Item */}
                <div className="group cursor-pointer" onClick={() => navigate(`/news/${news[0].id}`)}>
                    <div className="rounded-lg overflow-hidden h-32 relative mb-3 border border-dark-700 group-hover:border-brand-500/50 transition-colors">
                        <img src={news[0].image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="News" />
                        <div className="absolute top-2 left-2">
                            <Badge color="brand">{news[0].category}</Badge>
                        </div>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight mb-2 group-hover:text-brand-400 transition-colors">{news[0].headline}</h3>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>{news[0].author}</span>
                        <span>{news[0].timeAgo}</span>
                    </div>
                </div>

                <div className="w-full h-px bg-dark-800 my-1"></div>

                {/* Standard List */}
                {news.slice(1).map((item) => (
                    <div key={item.id} onClick={() => navigate(`/news/${item.id}`)} className="flex gap-3 group cursor-pointer p-2 rounded-lg hover:bg-dark-800 transition-colors">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-dark-700">
                            <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="News" />
                        </div>
                        <div className="flex flex-col justify-between py-0.5">
                            <div>
                                <span className="text-[9px] font-bold text-brand-500 uppercase mb-0.5 block">{item.category}</span>
                                <h4 className="text-xs font-bold text-gray-200 leading-snug group-hover:text-white line-clamp-2">{item.headline}</h4>
                            </div>
                            <span className="text-[9px] text-gray-500">{item.timeAgo} • {item.author}</span>
                        </div>
                    </div>
                ))}

                <div className="mt-2 pt-3 border-t border-dark-800 text-center">
                    <button onClick={() => navigate('/news')} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase flex items-center justify-center gap-1 w-full transition-colors">
                        Ler todas as notícias <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
