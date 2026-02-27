import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Button, Badge } from '../UI';
import { Game } from '../../types';

interface GamesCarouselProps {
    games: Game[];
}

export const GamesCarousel: React.FC<GamesCarouselProps> = ({ games }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden flex flex-col shadow-card">
            <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-dark-950/50 to-transparent">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-white tracking-tight">Jogos em Destaque</h2>
                    <span className="text-xs text-gray-500 font-medium">Explore glossários, mapas e gírias</span>
                </div>
                <Button variant="ghost" onClick={() => navigate('/games')} className="text-xs font-bold text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 h-8 px-3">
                    Ver Biblioteca
                </Button>
            </div>

            <div className="p-6">
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar mask-fade-right">
                    {games.map(game => (
                        <div
                            key={game.id}
                            onClick={() => navigate(`/games/${game.slug}`)}
                            className="min-w-[160px] md:min-w-[180px] group relative overflow-hidden rounded-xl aspect-[3/4] cursor-pointer border border-dark-700 hover:border-brand-500 transition-all duration-300 flex-shrink-0 shadow-lg hover:shadow-[0_0_20px_rgba(14,165,233,0.25)]"
                        >
                            <img src={game.image} alt={game.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                            <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-2 group-hover:translate-y-0">
                                <Badge color="brand" className="backdrop-blur-md shadow-black/50 shadow-sm">{game.genre}</Badge>
                            </div>

                            <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <h3 className="text-white font-black text-lg leading-tight mb-1 drop-shadow-md group-hover:text-brand-100">{game.name}</h3>
                                <div className="h-0 group-hover:h-8 overflow-hidden transition-all duration-300">
                                    <span className="flex items-center gap-1 text-xs font-bold text-brand-400 uppercase tracking-wider mt-2">
                                        Explorar <ChevronRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>

                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                    ))}

                    <div
                        onClick={() => navigate('/games')}
                        className="min-w-[100px] flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-dark-700 text-gray-500 hover:text-white hover:border-brand-500 hover:bg-white/5 transition-all cursor-pointer"
                    >
                        <div className="p-3 rounded-full bg-dark-800">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold uppercase">Ver Todos</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
