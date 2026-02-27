import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, TrendingDown, Minus, Flame, Zap } from 'lucide-react';
import { Term } from '../../types';

interface TrendingWidgetProps {
    terms: Term[];
}

export const TrendingWidget: React.FC<TrendingWidgetProps> = ({ terms }) => {
    const navigate = useNavigate();
    const [timer, setTimer] = useState(30);
    const trendingTerms = terms.slice(0, 8);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 30));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden shadow-card flex flex-col">
            <div className="px-5 py-4 border-b border-dark-800 bg-dark-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-brand-500 fill-brand-500/20" />
                    <h2 className="text-lg font-black text-white uppercase tracking-wider italic transform -skew-x-6">Em Alta</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-dark-950 px-2 py-1 rounded border border-dark-800">
                    <Clock className="w-3 h-3" />
                    <span>{timer}s</span>
                </div>
            </div>

            <div className="flex flex-col bg-dark-900">
                {/* Column Headers */}
                <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest bg-dark-950/30">
                    <div className="col-span-2 text-center">Pos</div>
                    <div className="col-span-8">Termo</div>
                    <div className="col-span-2 text-right">Trend</div>
                </div>

                {trendingTerms.map((term, idx) => {
                    const rank = idx + 1;

                    let rankStyle = "text-gray-500 font-mono";
                    let rowClass = "border-dark-800/50 hover:bg-dark-800";
                    let icon = <Minus className="w-3 h-3 text-gray-600" />;
                    let textClass = "text-gray-300";

                    if (rank === 1) {
                        rankStyle = "text-yellow-400 font-black text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]";
                        rowClass = "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20 hover:bg-yellow-500/15";
                        textClass = "text-white";
                    } else if (rank === 2) {
                        rankStyle = "text-gray-300 font-bold text-base";
                        rowClass = "bg-gradient-to-r from-gray-500/10 to-transparent border-gray-500/20 hover:bg-gray-500/15";
                        textClass = "text-gray-200";
                    } else if (rank === 3) {
                        rankStyle = "text-orange-400 font-bold text-base";
                        rowClass = "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20 hover:bg-orange-500/15";
                        textClass = "text-gray-200";
                    }

                    if (term.trend === 'up') {
                        icon = <TrendingUp className="w-3 h-3 text-green-400" />;
                    } else if (term.trend === 'down') {
                        icon = <TrendingDown className="w-3 h-3 text-red-400" />;
                    } else {
                        icon = <Minus className="w-3 h-3 text-gray-600" />;
                    }

                    return (
                        <div
                            key={`${term.id}-${idx}`}
                            onClick={() => navigate(`/term/${term.word}`)}
                            className={`grid grid-cols-12 items-center py-3 px-4 cursor-pointer transition-all duration-200 group border-b last:border-0 ${rowClass}`}
                        >
                            <div className="col-span-2 flex justify-center">
                                <span className={`${rankStyle}`}>{rank}</span>
                            </div>

                            <div className="col-span-8 pl-2">
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-sm tracking-tight group-hover:text-brand-400 transition-colors truncate ${textClass}`}>
                                        {term.word}
                                    </span>
                                    {rank === 1 && <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                                </div>
                                <span className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors block">{term.tags[0]}</span>
                            </div>

                            <div className="col-span-2 flex justify-end">
                                {icon}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-2 bg-dark-950 text-center border-t border-dark-800">
                <button className="text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors">Ver Ranking Completo</button>
            </div>
        </div>
    );
};
