import React from 'react';
import { Radio } from 'lucide-react';
import { EsportsNews } from '../../types';

interface NewsTickerProps {
    news: EsportsNews[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news }) => {
    return (
        <div className="w-full bg-brand-900/20 border-b border-brand-500/20 h-9 overflow-hidden flex items-center relative z-20">
            <div className="bg-brand-600 h-full px-4 flex items-center gap-2 z-10 shrink-0 skew-x-[-12deg] -ml-4 pl-8">
                <Radio className="w-3 h-3 text-white animate-pulse" />
                <span className="text-[10px] font-bold uppercase text-white tracking-widest skew-x-[12deg]">Live News</span>
            </div>
            <div className="flex animate-marquee whitespace-nowrap gap-12 pl-4 text-xs text-brand-100/80 font-mono">
                {news.map((item, idx) => (
                    <span key={idx} className="flex items-center gap-2">
                        <span className="text-brand-500 font-bold">[{item.category}]</span>
                        {item.headline}
                        <span className="text-gray-500 ml-1">-{item.timeAgo}</span>
                    </span>
                ))}
            </div>
        </div>
    );
};
