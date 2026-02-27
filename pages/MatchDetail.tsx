import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { esportsService } from '../services/esportsService';
import { Match } from '../types';
import { ArrowLeft, Calendar, Trophy, Monitor, Clock, Swords } from 'lucide-react';
import { Button, Badge } from '../components/UI';

export const MatchDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatch = async () => {
            if (!id) return;
            setLoading(true);
            const data = await esportsService.getMatchDetails(id);
            setMatch(data);
            setLoading(false);
        };
        fetchMatch();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <Swords className="w-12 h-12 text-brand-500 animate-spin" />
                    <span className="text-gray-400 font-bold">Carregando Partida...</span>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-6">
                <h2 className="text-2xl font-bold text-white">Partida não encontrada</h2>
                <Button onClick={() => navigate('/esports')}>Voltar para E-Sports</Button>
            </div>
        );
    }

    const isLive = match.isLive;
    const streamUrl = match.stream?.replace('twitch.tv/', 'player.twitch.tv/?channel=') + '&parent=' + window.location.hostname;

    return (
        <div className="min-h-screen bg-dark-950 text-gray-100 font-sans pb-20">
            {/* Header / Banner */}
            <div className="relative h-64 md:h-80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 to-dark-950 z-10"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80')] bg-cover bg-center opacity-10"></div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/esports')}
                        className="self-start mb-8 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 w-full">
                        {/* Team A */}
                        <div className="flex flex-col items-center gap-4 flex-1 text-center">
                            <img src={match.teamA.logo || `https://flagcdn.com/w80/${match.teamA.country}.png`} className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{match.teamA.name}</h1>
                                <span className="text-sm font-bold text-gray-500 uppercase flex items-center justify-center gap-2">
                                    <img src={`https://flagcdn.com/w20/${match.teamA.country}.png`} className="w-5 h-3.5 rounded-sm opacity-60" />
                                    {match.teamA.country}
                                </span>
                            </div>
                        </div>

                        {/* Score / VS */}
                        <div className="flex flex-col items-center justify-center min-w-[200px]">
                            {isLive ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Badge color="brand" className="animate-pulse">AO VIVO</Badge>
                                    <div className="text-5xl md:text-7xl font-mono font-black text-white flex items-center gap-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                        <span className="text-brand-500">{match.scoreA}</span>
                                        <span className="text-gray-700 text-3xl">:</span>
                                        <span className="text-brand-500">{match.scoreB}</span>
                                    </div>
                                    <span className="text-green-400 font-bold text-sm uppercase tracking-widest animate-pulse">Em Andamento</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="px-4 py-1 bg-dark-800 rounded-full border border-dark-700 text-xs font-bold text-gray-400 mb-2">
                                        {match.date} • {match.time}
                                    </div>
                                    <span className="text-4xl md:text-6xl font-black text-dark-700">VS</span>
                                    <span className="text-brand-500 font-bold uppercase tracking-wider text-sm mt-2">
                                        Melhor de {match.number_of_games}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center gap-4 flex-1 text-center">
                            <img src={match.teamB.logo || `https://flagcdn.com/w80/${match.teamB.country}.png`} className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{match.teamB.name}</h1>
                                <span className="text-sm font-bold text-gray-500 uppercase flex items-center justify-center gap-2">
                                    <img src={`https://flagcdn.com/w20/${match.teamB.country}.png`} className="w-5 h-3.5 rounded-sm opacity-60" />
                                    {match.teamB.country}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main: Stream or Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Live Stream Embed */}
                    <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-brand-500" /> Transmissão Oficial
                            </h3>
                            {isLive && <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>}
                        </div>
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                            {match.stream ? (
                                <iframe
                                    src={`${match.stream.replace('twitch.tv/', 'player.twitch.tv/?channel=')}&parent=${window.location.hostname || 'localhost'}`}
                                    height="100%"
                                    width="100%"
                                    allowFullScreen
                                    className="absolute inset-0"
                                ></iframe>
                            ) : (
                                <div className="text-center">
                                    <Monitor className="w-16 h-16 text-dark-700 mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium">Stream indisponível ou offline.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Details */}
                <div className="space-y-6">
                    <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
                        <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-brand-500" /> Detalhes do Evento
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                                <span className="text-gray-500 text-sm">Campeonato</span>
                                <span className="text-white font-bold text-right">{match.competition}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                                <span className="text-gray-500 text-sm">Jogo</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded bg-dark-800 ${match.game === 'Valorant' ? 'text-red-400' : 'text-brand-400'}`}>
                                    {match.game}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                                <span className="text-gray-500 text-sm">Formato</span>
                                <span className="text-white font-bold text-right">Melhor de {match.number_of_games}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                                <span className="text-gray-500 text-sm">Data</span>
                                <span className="text-white font-bold text-right flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-gray-500" /> {match.date}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                                <span className="text-gray-500 text-sm">Horário</span>
                                <span className="text-white font-bold text-right flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-gray-500" /> {match.time}
                                </span>
                            </div>
                        </div>

                        <Button className="w-full mt-6" variant="outline">
                            Ver Chaveamento Completo
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
