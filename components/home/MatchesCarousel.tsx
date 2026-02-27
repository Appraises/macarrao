import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '../UI';
import { Match } from '../../types';
import { esportsService } from '../../services/esportsService';

export const MatchesCarousel: React.FC = () => {
    const navigate = useNavigate();
    const matchesScrollRef = useRef<HTMLDivElement>(null);
    const [isMatchesPaused, setIsMatchesPaused] = useState(false);
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        esportsService.getMatches('all').then(data => setMatches(data));
    }, []);

    const matchesDisplay = [...matches, ...matches];

    // Auto-scroll effect
    useEffect(() => {
        const scrollContainer = matchesScrollRef.current;
        if (!scrollContainer || matches.length === 0) return;

        let animationFrameId: number;
        const speed = 0.8;

        const scroll = () => {
            if (!isMatchesPaused && scrollContainer) {
                if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
                    scrollContainer.scrollLeft = 0;
                } else {
                    scrollContainer.scrollLeft += speed;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isMatchesPaused, matches]);

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden flex flex-col shadow-card">
            <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-dark-950/50 to-transparent">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        Calendário Competitivo
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    </h2>
                    <span className="text-xs text-gray-500 font-medium">Próximas partidas e resultados ao vivo</span>
                </div>
                <Button variant="ghost" onClick={() => navigate('/esports')} className="text-xs font-bold text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 h-8 px-3">
                    Ver Agenda
                </Button>
            </div>

            <div className="p-6">
                <div
                    ref={matchesScrollRef}
                    onMouseEnter={() => setIsMatchesPaused(true)}
                    onMouseLeave={() => setIsMatchesPaused(false)}
                    className="flex overflow-x-auto gap-4 pb-2 no-scrollbar mask-fade-right"
                >
                    {matchesDisplay.map((match, idx) => (
                        <div key={`${match.id}-${idx}`} className="min-w-[260px] bg-dark-950 border border-dark-800 rounded-xl p-4 hover:border-brand-500/30 transition-all duration-300 group relative overflow-hidden flex-shrink-0 cursor-pointer">
                            {match.isLive && <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>}

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1">{match.game}</p>
                                    <p className="text-[10px] text-gray-400 font-medium truncate w-24">{match.competition}</p>
                                </div>
                                {match.isLive ? (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Ao Vivo
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-dark-800 border border-dark-700 text-gray-500 text-[10px] font-bold font-mono">
                                        <Clock className="w-3 h-3" />
                                        {match.time}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <img src={`https://flagcdn.com/w40/${match.teamA.country}.png`} alt={match.teamA.country} className="w-6 h-4 object-cover rounded shadow-lg opacity-90" />
                                    <span className="text-xs font-bold text-gray-200 text-center leading-tight truncate w-full">{match.teamA.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-dark-700 uppercase px-2">VS</span>
                                <div className="flex flex-col items-center gap-2 flex-1">
                                    <img src={`https://flagcdn.com/w40/${match.teamB.country}.png`} alt={match.teamB.country} className="w-6 h-4 object-cover rounded shadow-lg opacity-90" />
                                    <span className="text-xs font-bold text-gray-200 text-center leading-tight truncate w-full">{match.teamB.name}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
