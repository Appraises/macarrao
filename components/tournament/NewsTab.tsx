import React, { useState, useEffect } from 'react';
import { Badge } from '../UI';
import { EsportsNews } from '../../types';
import { esportsService } from '../../services/esportsService';

export const NewsTab: React.FC = () => {
    const [news, setNews] = useState<EsportsNews[]>([]);

    useEffect(() => {
        esportsService.getNews().then(data => setNews(data));
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map(item => (
                <div key={item.id} className="group bg-dark-900 border border-dark-800 rounded-lg overflow-hidden cursor-pointer hover:border-brand-500/50 transition-all">
                    <div className="h-40 overflow-hidden relative">
                        <img src={item.image || 'https://via.placeholder.com/400x200'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.headline} />
                        <div className="absolute top-2 left-2">
                            <Badge color="brand">{item.category}</Badge>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="text-white font-bold leading-tight mb-2 group-hover:text-brand-400 transition-colors line-clamp-2">
                            {item.headline}
                        </h4>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold mt-4">
                            <span>{item.author || 'Redação'}</span>
                            <span>{item.timeAgo}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
