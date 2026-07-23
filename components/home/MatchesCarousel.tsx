import React, { useRef, useEffect, useState } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Match } from '../../types';
import { esportsService } from '../../services/esportsService';
import { SectionHeader } from './SectionHeader';

export const MatchesCarousel: React.FC = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [matches, setMatches] = useState<Match[]>([]);

    useEffect(() => {
        esportsService.getMatches('all').then(data => setMatches(data));
    }, []);

    if (matches.length === 0) return null;

    const scrollByDir = (dir: 1 | -1) => {
        const el = scrollRef.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    };

    const arrowBtn = "p-1.5 rounded-md border border-dark-700 text-gray-500 hover:text-white hover:border-brand-500/40 hover:bg-white/5 transition-colors";

    return (
        <section>
            <SectionHeader
                title="Calendário Competitivo"
                subtitle="Próximas partidas e resultados ao vivo"
                live
                to="/esports"
                linkLabel="Ver agenda"
                actions={
                    <div className="hidden md:flex items-center gap-1.5 mr-2">
                        <button onClick={() => scrollByDir(-1)} className={arrowBtn} aria-label="Anterior">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => scrollByDir(1)} className={arrowBtn} aria-label="Próximo">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                }
            />

            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 pb-1 no-scrollbar mask-fade-right snap-x snap-mandatory"
            >
                {matches.map((match) => (
                    <div
                        key={match.id}
                        className="min-w-[250px] snap-start bg-dark-900 border border-dark-700 rounded-xl p-4 hover:border-brand-500/40 transition-all duration-300 group relative overflow-hidden flex-shrink-0 cursor-pointer"
                    >
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
                                <span className="flex items-center gap-1 px-2 py-1 rounded bg-dark-950 border border-dark-800 text-gray-500 text-[10px] font-bold font-mono">
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
        </section>
    );
};
