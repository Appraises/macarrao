import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ExternalLink, Loader2, Lock, MapPin, Radio, Swords, Trophy } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { OverviewTab } from '../components/tournament/OverviewTab';
import { MatchesTab } from '../components/tournament/MatchesTab';
import { StatsTab } from '../components/tournament/StatsTab';
import { NewsTab } from '../components/tournament/NewsTab';
import { Seo } from '../components/Seo';
import { esportsService } from '../services/esportsService';
import { useAuth } from '../src/context/AuthContext';
import type { PickemEntry, PickemLeaderboardRow, TournamentDetail as TournamentDetailType } from '../types';

type Tab = 'Overview' | 'Matches' | 'Pickem' | 'Stats' | 'News';

export const TournamentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [tab, setTab] = useState<Tab>('Overview');
    const [tournament, setTournament] = useState<TournamentDetailType | null>(null);
    const [leaderboard, setLeaderboard] = useState<PickemLeaderboardRow[]>([]);
    const [entry, setEntry] = useState<PickemEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingMatch, setSavingMatch] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async (silent = false) => {
        if (!id) return;
        if (!silent) setLoading(true);
        try {
            const [detail, board, mine] = await Promise.all([
                esportsService.getTournamentDetails(id),
                esportsService.getPickemLeaderboard(id),
                isAuthenticated ? esportsService.getMyPickem(id) : Promise.resolve(null),
            ]);
            setTournament(detail);
            setLeaderboard(board);
            setEntry(mine);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, isAuthenticated]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => void load(true), 30_000);
        return () => window.clearInterval(timer);
    }, [load]);

    const selected = useMemo(() => new Map((entry?.predictions || []).map((prediction) => [prediction.matchId, prediction.predictedTeamId])), [entry]);

    const pick = async (matchId: string, teamId?: string | null) => {
        if (!id || !teamId) return;
        if (!isAuthenticated) { navigate('/login'); return; }
        setSavingMatch(matchId);
        setNotice('');
        try {
            await esportsService.savePickemPrediction(id, matchId, teamId);
            await load(true);
            setNotice('Palpite salvo. Voce pode altera-lo ate o inicio da partida.');
        } catch (error: any) {
            setNotice(error?.response?.data?.error || 'Nao foi possivel salvar o palpite.');
        } finally {
            setSavingMatch('');
        }
    };

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-dark-950"><Loader2 className="h-10 w-10 animate-spin text-brand-500" /></div>;
    if (!tournament) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dark-950 text-gray-400"><Trophy className="h-10 w-10" /><p>Campeonato nao encontrado.</p><button onClick={() => navigate('/esports')} className="text-brand-400">Voltar para e-sports</button></div>;

    const tabs: Tab[] = ['Overview', 'Matches', 'Pickem', ...(tournament.stats?.length ? ['Stats' as Tab] : []), ...(tournament.news?.length ? ['News' as Tab] : [])];
    const tabLabels: Record<Tab, string> = { Overview: 'Visao geral', Matches: 'Partidas', Pickem: "Pick'em", Stats: 'Estatisticas', News: 'Noticias' };

    return (
        <div className="min-h-screen bg-dark-950 pb-16 text-gray-200">
            <Seo title={`${tournament.name}: partidas, chaveamento e Pick'em`} description={tournament.description || `Acompanhe ${tournament.name} no Dicionario Gamer.`} path={`/esports/tournament/${tournament.slug || tournament.id}`} />
            <header className="border-b border-dark-800 bg-dark-900">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-7 md:flex-row md:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-dark-700 bg-dark-950 p-2">
                        {tournament.logo ? <img src={tournament.logo} alt="" className="h-full w-full object-contain" /> : <Trophy className="h-8 w-8 text-brand-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase text-brand-400"><span>{tournament.game}</span><span className="text-gray-700">/</span><span className={tournament.status === 'Live' ? 'text-red-400' : 'text-gray-500'}>{tournament.status}</span></div>
                        <h1 className="text-2xl font-black text-white md:text-4xl">{tournament.name}</h1>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {tournament.dates}</span>
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {tournament.location || 'Online'}</span>
                            {(tournament.provider === 'LIQUIPEDIA' || tournament.provider === 'PANDASCORE') && <span className="flex items-center gap-1.5 text-green-400"><Radio className="h-3.5 w-3.5" /> Atualizacao automatica</span>}
                        </div>
                    </div>
                    {tournament.sourceUrl && <a href={tournament.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 border border-dark-700 px-3 py-2 text-xs text-gray-400 hover:border-brand-500 hover:text-white">Fonte <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
                <nav className="mx-auto flex max-w-[1400px] overflow-x-auto px-5">
                    {tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-4 py-3 text-xs font-bold ${tab === item ? 'border-brand-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{tabLabels[item]}</button>)}
                </nav>
            </header>

            <main className="mx-auto max-w-[1400px] px-5 py-8">
                {tab === 'Overview' && <OverviewTab tournament={tournament} onShowMatches={() => setTab('Matches')} />}
                {tab === 'Matches' && <MatchesTab matches={tournament.matches || []} />}
                {tab === 'Stats' && <StatsTab tournamentGame={tournament.game} tournamentId={tournament.id} />}
                {tab === 'News' && <NewsTab news={tournament.news || []} />}

                {tab === 'Pickem' && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <section>
                            <div className="mb-5">
                                <h2 className="text-xl font-black text-white">Seus palpites</h2>
                                <p className="mt-1 text-sm text-gray-500">Escolha o vencedor antes do horario marcado. Cada acerto vale 10 pontos.</p>
                            </div>
                            {notice && <p className="mb-4 border border-brand-500/20 bg-brand-500/5 p-3 text-sm text-brand-300">{notice}</p>}
                            <div className="space-y-3">
                                {(tournament.matches || []).length ? tournament.matches!.map((match) => {
                                    const locked = match.status !== 'SCHEDULED' || !match.scheduledAt || new Date(match.scheduledAt) <= new Date();
                                    const current = selected.get(match.id);
                                    return (
                                        <div key={match.id} className="border border-dark-800 bg-dark-900 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3 text-[11px] text-gray-500"><span>{match.round || match.stage || match.competition}</span><span className="flex items-center gap-1">{locked && <Lock className="h-3 w-3" />}{match.date} {match.time}</span></div>
                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                                {[match.teamA, match.teamB].map((team, index) => (
                                                    <React.Fragment key={team.id || team.name}>
                                                        {index === 1 && <span className="text-xs font-bold text-gray-700">VS</span>}
                                                        <button disabled={locked || savingMatch === match.id || !team.id} onClick={() => void pick(match.id, team.id)} className={`flex min-h-14 items-center justify-center gap-2 border px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed ${current === team.id ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-dark-700 bg-dark-950 text-gray-400 hover:border-dark-500 hover:text-white'} ${locked && current !== team.id ? 'opacity-50' : ''}`}>
                                                            {team.logo && <img src={team.logo} alt="" className="h-7 w-7 object-contain" />}{team.name}{current === team.id && <Check className="h-4 w-4 text-brand-400" />}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }) : <div className="border border-dark-800 bg-dark-900 p-10 text-center text-sm text-gray-500">Ainda nao ha partidas abertas para palpites.</div>}
                            </div>
                        </section>

                        <aside className="border border-dark-800 bg-dark-900 p-4 self-start">
                            <h2 className="mb-4 flex items-center gap-2 font-bold text-white"><Trophy className="h-4 w-4 text-brand-500" /> Ranking do Pick'em</h2>
                            {entry && <div className="mb-4 grid grid-cols-3 border border-dark-700 bg-dark-950 p-3 text-center"><div><b className="block text-white">{entry.score}</b><span className="text-[10px] text-gray-500">pontos</span></div><div><b className="block text-white">{entry.correctPicks}</b><span className="text-[10px] text-gray-500">acertos</span></div><div><b className="block text-white">{entry.totalPicks}</b><span className="text-[10px] text-gray-500">palpites</span></div></div>}
                            <div className="divide-y divide-dark-800">
                                {leaderboard.length ? leaderboard.map((row) => <div key={row.user.id} className="flex items-center gap-3 py-3"><span className="w-7 font-mono text-xs text-brand-400">#{row.rank}</span><span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-300">{row.user.name}</span><span className="text-xs font-mono text-gray-500">{row.points} pts</span></div>) : <p className="py-8 text-center text-xs text-gray-500">O ranking comeca com o primeiro palpite.</p>}
                            </div>
                            {!isAuthenticated && <button onClick={() => navigate('/login')} className="mt-4 w-full border border-brand-500 px-4 py-2 text-sm font-bold text-brand-400 hover:bg-brand-500 hover:text-dark-950">Entrar para participar</button>}
                        </aside>
                    </div>
                )}

                {tab === 'News' && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(tournament.news || []).map((item) => <button key={item.id} onClick={() => navigate(`/noticias/${item.slug || item.id}`)} className="overflow-hidden border border-dark-800 bg-dark-900 text-left hover:border-brand-500/50">{item.image && <img src={item.image} alt="" className="aspect-video w-full object-cover" />}<div className="p-4"><span className="text-[10px] font-bold uppercase text-brand-400">{item.timeAgo}</span><h3 className="mt-2 font-bold text-white">{item.headline}</h3></div></button>)}</div>}

                {tournament.attribution?.provider === 'PandaScore'
                    ? <p className="mt-8 text-xs text-gray-600">Source: <a href={tournament.attribution.url} target="_blank" rel="noreferrer" className="text-gray-400">PandaScore</a></p>
                    : tournament.attribution && <p className="mt-8 text-xs text-gray-600">Dados por <a href={tournament.attribution.url} target="_blank" rel="noreferrer" className="text-gray-400">{tournament.attribution.provider}</a>, {tournament.attribution.license}.</p>}
            </main>
        </div>
    );
};
