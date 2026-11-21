import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Radio, RefreshCw, TrendingUp, Trophy } from 'lucide-react';
import { io } from 'socket.io-client';
import { MatchRow } from '../components/esports/MatchRow';
import { GameFilterBar, GameFilterOption } from '../components/esports/GameFilterBar';
import { gameAccent, gameLabel } from '../components/esports/gameMeta';
import { NewsTicker } from '../components/esports/NewsTicker';
import { Seo } from '../components/Seo';
import { esportsService } from '../services/esportsService';
import type { EsportsOverview, Match, TeamRanking } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Bucket = 'live' | 'today' | 'upcoming' | 'results';

const isToday = (iso?: string | null): boolean => {
    if (!iso) return false;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return false;
    return date.toDateString() === new Date().toDateString();
};

export const Esports: React.FC = () => {
    const [data, setData] = useState<EsportsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [activeGame, setActiveGame] = useState('all');
    // null = deixa a aba se resolver sozinha para a primeira com conteudo.
    const [tab, setTab] = useState<Bucket | null>(null);

    const load = useCallback(async (silent = false) => {
        silent ? setRefreshing(true) : setLoading(true);
        try {
            setData(await esportsService.getOverview());
            setError('');
        } catch {
            setError('Nao foi possivel carregar a cobertura de e-sports agora.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(true), 30_000);
        const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
        socket.on('esports:update', () => void load(true));
        return () => { window.clearInterval(timer); socket.disconnect(); };
    }, [load]);

    const gameOptions = useMemo<GameFilterOption[]>(() => {
        if (!data) return [];
        const map = new Map<string, { label: string; live: number; total: number }>();
        const bump = (name: string | undefined | null, live: boolean) => {
            const label = gameLabel(name);
            const current = map.get(label) || { label, live: 0, total: 0 };
            current.total += 1;
            if (live) current.live += 1;
            map.set(label, current);
        };
        data.matches.forEach((match) => bump(match.game, !!match.isLive));
        data.results.forEach((match) => bump(match.game, false));
        data.tournaments.forEach((tournament) => bump(tournament.game, false));
        const games = Array.from(map.values()).sort((a, b) => b.live - a.live || b.total - a.total || a.label.localeCompare(b.label));
        const totalLive = games.reduce((sum, game) => sum + game.live, 0);
        const totalAll = games.reduce((sum, game) => sum + game.total, 0);
        return [{ key: 'all', label: 'Todos', live: totalLive, total: totalAll }, ...games.map((game) => ({ key: game.label, ...game }))];
    }, [data]);

    const inGame = (name?: string | null) => activeGame === 'all' || gameLabel(name) === activeGame;

    const buckets = useMemo(() => {
        const matches = (data?.matches || []).filter((m) => inGame(m.game));
        return {
            live: matches.filter((m) => m.isLive),
            today: matches.filter((m) => !m.isLive && isToday(m.scheduledAt)),
            upcoming: matches.filter((m) => !m.isLive && !isToday(m.scheduledAt)),
            results: (data?.results || []).filter((m) => inGame(m.game)),
        } as Record<Bucket, Match[]>;
    }, [data, activeGame]);

    const tournaments = useMemo(() => (data?.tournaments || []).filter((t) => inGame(t.game)), [data, activeGame]);
    const rankings = useMemo(() => (data?.rankings || []).filter((r) => inGame(r.game)), [data, activeGame]);

    const rankingByGame = useMemo(() => {
        const groups = new Map<string, TeamRanking[]>();
        rankings.forEach((r) => { const key = gameLabel(r.game); groups.set(key, [...(groups.get(key) || []), r]); });
        return Array.from(groups.entries()).map(([game, rows]) => [game, rows.sort((a, b) => a.rank - b.rank).slice(0, 5)] as const);
    }, [rankings]);

    const TABS: Array<{ key: Bucket; label: string }> = [
        { key: 'live', label: 'Ao vivo' },
        { key: 'today', label: 'Hoje' },
        { key: 'upcoming', label: 'Próximas' },
        { key: 'results', label: 'Resultados' },
    ];
    const activeTab: Bucket = tab
        ?? (buckets.live.length ? 'live' : buckets.today.length ? 'today' : buckets.upcoming.length ? 'upcoming' : 'results');
    const rows = buckets[activeTab];
    const showGameTag = activeGame === 'all';

    const emptyLabel: Record<Bucket, string> = {
        live: 'Nenhuma partida ao vivo neste momento.',
        today: 'Nenhuma partida marcada para hoje.',
        upcoming: 'Nenhuma partida futura na agenda.',
        results: 'Nenhum resultado recente por aqui.',
    };

    if (loading) return (
        <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-9 h-9 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-400">Carregando a cobertura brasileira...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-dark-950 text-gray-200">
            <Seo title="E-Sports do Brasil: partidas, campeonatos e Pick'em" description="Partidas ao vivo, agenda e resultados do e-sports brasileiro, organizados por jogo." path="/esports" />
            {data?.news.length ? <NewsTicker news={data.news} /> : null}

            <main className="mx-auto max-w-[1280px] space-y-5 p-4 md:p-6">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-green-400">
                            <Radio className="h-3.5 w-3.5" /> Foco Brasil
                        </div>
                        <h1 className="text-2xl font-black text-white">E-sports</h1>
                    </div>
                    <button onClick={() => void load(true)} disabled={refreshing} title="Atualizar dados" className="shrink-0 rounded border border-dark-700 p-2 text-gray-400 transition-colors hover:border-brand-500 hover:text-white disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </header>

                <GameFilterBar
                    options={gameOptions}
                    active={activeGame}
                    onChange={(key) => { setActiveGame(key); setTab(null); }}
                />

                {error && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                        <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
                        <button onClick={() => void load()} className="font-bold text-white">Tentar novamente</button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                    {/* Partidas: bloco unico, estado por aba */}
                    <section className="overflow-hidden rounded-xl border border-dark-800 bg-dark-900 lg:col-span-9">
                        <div className="flex gap-1 border-b border-dark-800 bg-dark-950 p-1">
                            {TABS.map(({ key, label }) => {
                                const count = buckets[key].length;
                                const selected = key === activeTab;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setTab(key)}
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                                            selected ? 'bg-dark-900 text-white' : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {key === 'live' && count > 0 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                                        {label}
                                        <span className={selected ? 'text-brand-400' : 'text-gray-600'}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {rows.length ? (
                            rows.map((match) => <MatchRow key={match.id} match={match} showGame={showGameTag} />)
                        ) : (
                            <p className="px-4 py-14 text-center text-sm text-gray-500">{emptyLabel[activeTab]}</p>
                        )}
                    </section>

                    <aside className="space-y-5 lg:col-span-3">
                        <section className="overflow-hidden rounded-xl border border-dark-800 bg-dark-900">
                            <div className="border-b border-dark-800 px-4 py-3">
                                <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Trophy className="h-4 w-4 text-brand-500" /> Campeonatos</h2>
                            </div>
                            {tournaments.length ? tournaments.map((tournament) => {
                                const accent = gameAccent(tournament.game);
                                return (
                                    <Link
                                        key={tournament.id}
                                        to={`/esports/tournament/${tournament.id}`}
                                        className="block border-b border-dark-800 px-4 py-3 last:border-0 hover:bg-dark-800/60"
                                    >
                                        <p className="truncate text-sm font-bold text-gray-200">{tournament.name}</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className={`rounded px-1 text-[10px] font-bold ${accent.bg} ${accent.text}`}>{gameLabel(tournament.game)}</span>
                                            <span className="text-[11px] text-gray-500">{tournament.dates}</span>
                                        </div>
                                    </Link>
                                );
                            }) : <p className="px-4 py-10 text-center text-sm text-gray-500">Nenhum campeonato em acompanhamento.</p>}
                        </section>

                        <section className="overflow-hidden rounded-xl border border-dark-800 bg-dark-900">
                            <div className="flex items-center justify-between border-b border-dark-800 px-4 py-3">
                                <h2 className="flex items-center gap-2 text-sm font-bold text-white"><TrendingUp className="h-4 w-4 text-brand-500" /> Ranking</h2>
                                <span className="text-[10px] font-bold uppercase text-gray-500">Equipes BR</span>
                            </div>
                            {rankingByGame.length ? rankingByGame.map(([game, list]) => (
                                <div key={game} className="border-b border-dark-800 last:border-0">
                                    {showGameTag && (
                                        <p className={`px-4 pt-2.5 text-[10px] font-bold uppercase tracking-wider ${gameAccent(game).text}`}>{game}</p>
                                    )}
                                    {list.map((row) => (
                                        <div key={row.id || `${game}-${row.rank}`} className="flex items-center justify-between px-4 py-2">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="w-5 font-mono text-xs text-brand-400">#{row.rank}</span>
                                                {row.team.logo ? <img src={row.team.logo} alt="" className="h-4 w-4 object-contain" /> : null}
                                                <span className="truncate text-xs font-bold text-gray-200">{row.team.name}</span>
                                            </div>
                                            <span className="font-mono text-[11px] text-gray-500">{row.points}</span>
                                        </div>
                                    ))}
                                </div>
                            )) : <p className="px-4 py-10 text-center text-sm text-gray-500">Ranking ainda sem dados suficientes.</p>}
                        </section>
                    </aside>
                </div>

                {data?.source.attribution && (
                    <p className="text-[11px] text-gray-600">
                        Dados competitivos por <a href={data.source.attribution.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-400">{data.source.attribution.provider}</a>, {data.source.attribution.license}.
                    </p>
                )}
                {data?.source.providers?.includes('PandaScore') && (
                    <p className="text-[11px] text-gray-600">
                        Source: <a href="https://pandascore.co/" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-brand-400">PandaScore</a>
                    </p>
                )}
            </main>
        </div>
    );
};
