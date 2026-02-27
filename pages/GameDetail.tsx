
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGameBySlug, getTerms, getMaps } from '../src/services/api';
import { Game, Term, GameMap } from '../types';
import { ArrowLeft, Map, Book, Search } from 'lucide-react';
import { Input, Button, Badge } from '../components/UI';
import { TermCard } from '../components/TermCard';
import { MapViewer } from '../components/game/MapViewer';

export const GameDetail: React.FC = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'glossary' | 'maps'>('glossary');
    const [search, setSearch] = useState('');
    const [game, setGame] = useState<Game | null>(null);
    const [terms, setTerms] = useState<Term[]>([]);
    const [gameMaps, setGameMaps] = useState<GameMap[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) return;
            try {
                const gameData = await getGameBySlug(slug);
                setGame(gameData);

                if (gameData) {
                    const termsData = await getTerms(gameData.id);
                    setTerms(termsData);
                    const mapsData = await getMaps(gameData.id);
                    setGameMaps(mapsData);
                }
            } catch (error: any) {
                console.error("Failed to fetch game details", error);
                setError(error.message || "Erro ao carregar dados");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white">
                <h2 className="text-xl font-bold text-red-500 mb-2">Erro</h2>
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">Tentar Novamente</Button>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-white mb-4">Jogo não encontrado</h2>
                <Button onClick={() => navigate('/games')}>Voltar para Biblioteca</Button>
            </div>
        );
    }

    const activeMap = gameMaps.find(m => m.id === selectedMapId);

    const filteredTerms = terms.filter(term => {
        const matchesSearch = term.word.toLowerCase().includes(search.toLowerCase()) ||
            term.definition.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Banner */}
            <div className="relative h-[40vh] w-full overflow-hidden border-b border-brand-500/20">
                <img src={game.image} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-b from-dark-950/30 via-dark-950/60 to-dark-950"></div>
                <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/games')} className="mb-4 pl-0 text-gray-300 hover:text-white hover:bg-black/20 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Voltar para Biblioteca
                    </Button>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">{game.name}</h1>
                    <div className="flex items-center gap-4">
                        <Badge color="brand" className="text-base px-3 py-1">{game.genre}</Badge>
                        <span className="text-gray-400 text-sm md:text-base bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                            {terms.length} termos catalogados
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-6 border-b border-dark-800 mb-6 overflow-x-auto max-w-7xl mx-auto">
                    <button
                        onClick={() => setTab('glossary')}
                        className={`pb-4 px-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${tab === 'glossary' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <Book className="w-4 h-4" /> Glossário
                    </button>
                    <button
                        onClick={() => setTab('maps')}
                        className={`pb-4 px-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${tab === 'maps' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <Map className="w-4 h-4" /> Mapas & Callouts
                    </button>
                </div>

                {tab === 'glossary' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                        <div className="mb-8 relative max-w-lg">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <Input
                                placeholder={`Buscar termos de ${game.name}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-12"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredTerms.map(term => (
                                <div key={term.id} onClick={() => navigate(`/term/${term.word}`)} className="cursor-pointer h-full">
                                    <TermCard term={term} />
                                </div>
                            ))}
                            {filteredTerms.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-dark-900/30 rounded-xl border border-dark-800 border-dashed">
                                    <Book className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-300">Nenhum termo encontrado</h3>
                                    <p className="text-gray-500">Tente buscar por outra palavra ou contribua com o dicionário.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    !selectedMapId ? (
                        /* Map Grid Selection View */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {gameMaps.map((map, idx) => (
                                    <div
                                        key={map.id}
                                        onClick={() => setSelectedMapId(map.id)}
                                        className="group cursor-pointer bg-dark-900 border border-dark-700 rounded-xl overflow-hidden hover:border-brand-500 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="aspect-[4/3] overflow-hidden relative">
                                            <img src={map.image} alt={map.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent"></div>
                                            <div className="absolute bottom-0 left-0 p-4 w-full">
                                                <h3 className="text-xl font-black text-white uppercase italic">{map.name}</h3>
                                                <p className="text-xs text-brand-400 font-bold">{map.callouts.length} Locations</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {gameMaps.length === 0 && (
                                    <div className="col-span-full text-center py-20 bg-dark-900/30 rounded-xl border border-dark-800 border-dashed">
                                        <Map className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-gray-300">Nenhum mapa encontrado</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Ainda não temos mapas cadastrados para este jogo.
                                        </p>
                                        <Button className="mt-6" onClick={() => navigate('/contribuir')}>Contribuir</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        activeMap ? (
                            <MapViewer
                                activeMap={activeMap}
                                allMaps={gameMaps}
                                selectedMapId={selectedMapId}
                                onSelectMap={setSelectedMapId}
                                onBack={() => setSelectedMapId(null)}
                            />
                        ) : (
                            <div className="text-center py-20">Erro ao carregar mapa</div>
                        )
                    )
                )}
            </div>
        </div>
    );
}
