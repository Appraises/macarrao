import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameGenre, Game } from '../types';
import { Search, Gamepad2 } from 'lucide-react';
import { Input, Badge } from '../components/UI';
import { getGames } from '../src/services/api';

export const Games: React.FC = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<GameGenre | 'All'>('All');
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getGames().then(data => {
            setGames(data);
            setLoading(false);
        });
    }, []);

    const genres = ['All', ...Object.values(GameGenre)];

    const filteredGames = games.filter(game => {
        const matchesSearch = game.name.toLowerCase().includes(search.toLowerCase());
        const matchesGenre = selectedGenre === 'All' || game.genre === selectedGenre;
        return matchesSearch && matchesGenre;
    });

    return (
        <div className="min-h-screen py-12 px-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Biblioteca de Jogos</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Explore glossários dedicados, mapas e gírias específicas de cada universo.
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-6 mb-12 justify-between items-center sticky top-24 z-20 bg-dark-950/80 backdrop-blur-md p-4 rounded-xl border border-white/5">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <Input
                        placeholder="Buscar jogo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-12 w-full bg-dark-900 border-dark-700"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                    {genres.map(genre => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${selectedGenre === genre
                                ? 'bg-brand-500 text-black border-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                                : 'bg-dark-900 text-gray-400 border-dark-700 hover:border-gray-600 hover:bg-dark-800'
                                }`}
                        >
                            {genre === 'All' ? 'Todos' : genre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                </div>
            )}

            {/* Grid */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredGames.map((game, idx) => (
                        <div
                            key={game.id}
                            onClick={() => navigate(`/games/${game.slug}`)}
                            className="group relative bg-dark-900 rounded-xl overflow-hidden border border-dark-700 hover:border-brand-500/50 transition-all cursor-pointer shadow-lg hover:shadow-brand-900/20 animate-in fade-in zoom-in-95 duration-500"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="aspect-[3/4] md:aspect-[16/9] overflow-hidden relative">
                                <img
                                    src={game.image}
                                    alt={game.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-90" />
                                <div className="absolute bottom-4 left-4 right-4">
                                    <Badge color="brand" className="mb-2 shadow-lg">{game.genre}</Badge>
                                    <h3 className="text-2xl font-bold text-white leading-none drop-shadow-lg">{game.name}</h3>
                                </div>
                            </div>
                            <div className="p-4 flex justify-between items-center border-t border-dark-800 bg-dark-900/50">
                                <span className="text-xs text-gray-500 font-mono uppercase tracking-wider group-hover:text-brand-400 transition-colors">Ver Glossário</span>
                                <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-black transition-colors shadow-lg">
                                    <Gamepad2 className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredGames.length === 0 && (
                <div className="text-center py-20">
                    <Gamepad2 className="w-16 h-16 text-dark-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum jogo encontrado para a busca atual.</p>
                </div>
            )}
        </div>
    );
}