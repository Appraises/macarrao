
import React, { useState, useEffect } from 'react';
import { Swords, TrendingUp, Trophy, ChevronRight, Filter, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../components/UI';
import { Match, TeamRanking, Tournament, EsportsNews } from '../types';
import { esportsService } from '../services/esportsService';

// Sub-components
import { NewsTicker } from '../components/esports/NewsTicker';
import { CompactMatchRow } from '../components/esports/CompactMatchRow';
import { TournamentCard } from '../components/esports/TournamentCard';

export const Esports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming'>('all');

    // Data State
    const [matches, setMatches] = useState<Match[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [news, setNews] = useState<EsportsNews[]>([]);
    const [rankings, setRankings] = useState<TeamRanking[]>([]);

    // Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [isMatchesLoading, setIsMatchesLoading] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [tData, nData, rData, mData] = await Promise.all([
                    esportsService.getActiveTournaments(),
                    esportsService.getNews(),
                    esportsService.getRankings(),
                    esportsService.getMatches('all')
                ]);
                setTournaments(tData);
                setNews(nData);
                setRankings(rData);
                setMatches(mData);
            } catch (error) {
                console.error("Failed to fetch esports data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter Match Data
    useEffect(() => {
        const fetchFilteredMatches = async () => {
            setIsMatchesLoading(true);
            try {
                const data = await esportsService.getMatches(activeTab);
                setMatches(data);
            } finally {
                setIsMatchesLoading(false);
            }
        };
        fetchFilteredMatches();
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                <p className="text-gray-400 text-sm font-medium animate-pulse">Conectando aos servidores (Riot API)...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200 font-sans">
            <NewsTicker news={news} />

            <div className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: Main Content */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Active Championships Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Trophy className="text-brand-500 w-5 h-5" /> Campeonatos Ativos
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-400">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    API Connected
                                </span>
                                <Button variant="ghost" className="text-xs">Ver todos</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tournaments.map(t => (
                                <TournamentCard key={t.id} tournament={t} />
                            ))}
                        </div>
                    </section>

                    {/* Global Rankings Preview */}
                    <section className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-dark-800 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-500" /> Ranking Global</h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] uppercase font-bold text-gray-500 bg-dark-950 px-2 py-1 rounded">CS2</span>
                                <span className="text-[10px] uppercase font-bold text-gray-500 bg-dark-950 px-2 py-1 rounded">Valorant</span>
                            </div>
                        </div>
                        <div className="divide-y divide-dark-800">
                            {rankings.slice(0, 5).map((team, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-brand-500/10 text-brand-500' : 'bg-dark-950 text-gray-500'}`}>#{team.rank}</span>
                                        <img src={`https://flagcdn.com/w20/${team.team.country}.png`} className="w-4 h-3 rounded-sm opacity-70" alt={team.team.country} />
                                        <span className="text-sm font-bold text-gray-200">{team.team.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-500">{team.points} pts</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 bg-dark-950 border-t border-dark-800 text-center">
                            <button className="text-xs text-gray-500 hover:text-brand-500 transition-colors uppercase font-bold">Ver Ranking Completo</button>
                        </div>
                    </section>

                    {/* Banner/Ad Placeholder */}
                    <div className="w-full h-32 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670')] bg-cover opacity-10 grayscale group-hover:grayscale-0 transition-all duration-700"></div>
                        <div className="relative z-10 text-center">
                            <h4 className="text-xl font-black italic text-white mb-1">CBLOL FINALS</h4>
                            <p className="text-sm text-brand-400">Garanta seu ingresso para a Grande Final</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Match Queue (Sticky) */}
                <div className="lg:col-span-4">
                    <div className="sticky top-28 bg-dark-900 border border-dark-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-8rem)] min-h-[500px]">
                        {/* Queue Header */}
                        <div className="p-4 border-b border-dark-800 bg-dark-950">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Swords className="text-brand-500 w-4 h-4" /> Partidas
                                </h2>
                                <div className="p-1.5 bg-dark-800 rounded-lg cursor-pointer hover:text-white text-gray-500">
                                    <Filter className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex p-1 bg-dark-800 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-dark-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setActiveTab('live')}
                                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${activeTab === 'live' ? 'bg-red-500/10 text-red-500 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Ao Vivo
                                </button>
                                <button
                                    onClick={() => setActiveTab('upcoming')}
                                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${activeTab === 'upcoming' ? 'bg-dark-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Agenda
                                </button>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="overflow-y-auto no-scrollbar flex-grow relative">
                            {isMatchesLoading && (
                                <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm z-20 flex items-center justify-center">
                                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                                </div>
                            )}

                            <div className="flex flex-col">
                                {/* Date Divider */}
                                <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur border-b border-dark-800 px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Jogos em Destaque
                                </div>

                                {matches.length > 0 ? matches.map((match) => (
                                    <CompactMatchRow key={match.id} match={match} />
                                )) : (
                                    <div className="p-8 text-center text-gray-500 text-xs">
                                        Nenhuma partida encontrada neste filtro.
                                    </div>
                                )}

                                {/* Demo Extension */}
                                {matches.length > 0 && (
                                    <>
                                        <div className="sticky top-0 z-10 bg-dark-950/95 backdrop-blur border-y border-dark-800 px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0">
                                            Próximos Dias
                                        </div>
                                        {matches.slice(0, 3).map((match) => (
                                            <CompactMatchRow key={`dup-${match.id}`} match={{ ...match, id: `dup-${match.id}`, isLive: false, time: 'TBD', date: 'Em Breve' }} />
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-3 border-t border-dark-800 bg-dark-950 text-center">
                            <button className="text-xs font-bold text-brand-500 hover:text-brand-400 flex items-center justify-center gap-1 w-full">
                                Ver calendário completo <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
