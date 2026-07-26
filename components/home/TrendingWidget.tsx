import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { Term } from '../../types';
import { SectionHeader } from './SectionHeader';

interface TrendingWidgetProps {
    terms: Term[];
}

const TrendIcon: React.FC<{ trend?: string }> = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-gray-600" />;
};

export const TrendingWidget: React.FC<TrendingWidgetProps> = ({ terms }) => {
    const navigate = useNavigate();
    const trendingTerms = terms.slice(0, 8);
    const n = trendingTerms.length;

    if (n === 0) return null;

    return (
        <section>
            <SectionHeader
                title="Em Alta"
                subtitle="Os termos mais buscados agora"
                icon={<Flame className="w-4 h-4 text-brand-500 fill-brand-500/20" />}
            />

            <div className="bg-dark-900/60 border border-white/5 rounded-xl overflow-hidden divide-y divide-dark-800/40">
                {trendingTerms.map((term, idx) => {
                    const rank = idx + 1;
                    // Staircase: #1 gets the longest, most intense bar; both taper with rank.
                    const width = 100 - (rank - 1) * (62 / Math.max(n - 1, 1));
                    const alpha = Math.max(0.12, 0.42 - (rank - 1) * 0.035);

                    return (
                        <div
                            key={`${term.id}-${idx}`}
                            onClick={() => navigate(`/term/${encodeURIComponent(term.word)}`)}
                            className="relative cursor-pointer group"
                        >
                            {/* Brand gradient "heat" bar */}
                            <div
                                className="absolute inset-y-0 left-0 rounded-r-md transition-all duration-300 group-hover:brightness-125"
                                style={{
                                    width: `${width}%`,
                                    background: `linear-gradient(to right, rgba(14,165,233,${alpha}), rgba(14,165,233,${alpha * 0.3}) 65%, rgba(14,165,233,0))`,
                                }}
                            />

                            <div className="relative flex items-center gap-3 px-4 py-2.5">
                                <span className={`w-5 text-center font-mono flex-shrink-0 ${rank <= 3 ? 'text-white font-black text-base' : 'text-gray-500 font-bold text-sm'}`}>
                                    {rank}
                                </span>
                                <span className={`min-w-0 flex-1 truncate font-bold tracking-tight transition-colors group-hover:text-white ${rank <= 3 ? 'text-white' : 'text-gray-200'}`}>
                                    {term.word}
                                </span>
                                <TrendIcon trend={(term as any).trend} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
