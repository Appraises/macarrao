import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { EsportsGameTabs, type EsportsGameOption } from '../components/esports/EsportsGameTabs';
import { EsportsNewsGrid } from '../components/esports/EsportsNewsGrid';
import { EsportsSchedule, type MatchView } from '../components/esports/EsportsSchedule';
import { EsportsEventsPanel, EsportsRankingPanel } from '../components/esports/EsportsSidePanels';
import { EsportsSpotlight } from '../components/esports/EsportsSpotlight';
import { gameKey, gameLabel, gameSlug } from '../components/esports/gameMeta';
import { hasBrazilianTeam, instantOf, tournamentPhase } from '../components/esports/hubUtils';
import { Seo } from '../components/Seo';
import { esportsService, isCurrentLiveMatch } from '../services/esportsService';
import type { EsportsNews, EsportsOverview, Match, Tournament } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CORE_GAMES = ['CS2', 'Valorant', 'LoL'];
const EMPTY_FEED: EsportsOverview = {
    matches: [], results: [], tournaments: [], rankings: [], news: [],
    source: { configured: false, focus: { countries: [], keywords: [], teams: [] }, attribution: { provider: '', license: '', url: '' } },
};

type CoverageSnapshot = { data?: EsportsOverview; error?: boolean };
const isCompetitiveNews = (item: EsportsNews) => /^e[\s-]?sports$/i.test(item.category.trim());
const timeOf = (match: Match, fallback: number) => instantOf(match.scheduledAt)?.getTime() ?? fallback;

// One match leads the page: a live Brazilian match, any live match, the next
// match with a Brazilian team, the next match, or else the latest result.
const pickSpotlight = (live: Match[], schedule: Match[], results: Match[]): { match: Match | null; live: boolean } => {
    const firstLive = live.find(hasBrazilianTeam) ?? live[0];
    if (firstLive) return { match: firstLive, live: true };
    const soon = schedule.slice(0, 6);
    const next = soon.find(hasBrazilianTeam) ?? soon[0];
    if (next) return { match: next, live: false };
    return { match: results[0] ?? null, live: false };
};

const pickTournament = (items: Tournament[], spotlight: Match | null): Tournament | null => {
    const ongoing = items.filter((item) => tournamentPhase(item) === 'ongoing');
    // Prefer a competition other than the one already shown in the match spotlight.
    const other = (list: Tournament[]) => list.find((item) => !spotlight || (item.id !== spotlight.tournamentId && item.name !== spotlight.competition)) ?? list[0];
    if (ongoing.length) return other([...ongoing.filter((item) => item.isBrazilFocused), ...ongoing]);
    const upcoming = items.filter((item) => tournamentPhase(item) === 'upcoming')
        .sort((a, b) => (Date.parse(a.startAt ?? '') || Infinity) - (Date.parse(b.startAt ?? '') || Infinity));
    if (upcoming.length) return other(upcoming);
    return items[0] ?? null;
};

export const Esports: React.FC = () => {
    const [search, setSearch] = useSearchParams();
    const [hydrated, setHydrated] = useState(false);
    // Prerendered pages do not know the visitor's query string.
    useEffect(() => setHydrated(true), []);
    const gameParam = hydrated ? search.get('jogo') : null;
    const scope = gameParam && gameParam.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameParam)
        ? gameSlug(gameLabel(gameParam.replace(/-/g, ' ')))
        : 'all';
    const [snapshots, setSnapshots] = useState<Record<string, CoverageSnapshot>>({});
    const [now, setNow] = useState(Date.now);
    const requests = useRef(new Set<string>());
    const activeScope = useRef(scope);

    const refresh = useCallback((key: string) => {
        setNow(Date.now());
        if (requests.current.has(key)) return;
        requests.current.add(key);
        void esportsService.getOverview(key === 'all' ? undefined : key)
            .then((data) => setSnapshots((current) => ({ ...current, [key]: { data } })))
            .catch(() => setSnapshots((current) => ({ ...current, [key]: { ...current[key], error: true } })))
            .finally(() => { requests.current.delete(key); });
    }, []);

    useEffect(() => {
        activeScope.current = scope;
        refresh(scope);
    }, [scope, refresh]);

    useEffect(() => {
        refresh('all');
        const refreshVisible = () => { if (!document.hidden) refresh(activeScope.current); };
        const timer = window.setInterval(refreshVisible, 30_000);
        document.addEventListener('visibilitychange', refreshVisible);
        const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
        socket.on('esports:update', refreshVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refreshVisible);
            socket.disconnect();
        };
    }, [refresh]);

    const { data, error } = snapshots[scope] ?? {};
    const feed = data ?? EMPTY_FEED;
    const overview = snapshots.all?.data ?? EMPTY_FEED;
    const liveMatches = useMemo(() => feed.matches.filter((match) => isCurrentLiveMatch(match, now)), [feed.matches, now]);
    const news = useMemo(() => feed.news.filter(isCompetitiveNews), [feed.news]);
    const gameOptions = useMemo<EsportsGameOption[]>(() => {
        const games = new Map<string, EsportsGameOption>();
        const add = (name?: string | null, image?: string | null, live = false) => {
            const label = gameLabel(name);
            if (label === 'E-sports') return;
            const key = gameSlug(label);
            const current = games.get(key) ?? { key, label, live: 0 };
            current.image ||= image;
            if (live) current.live++;
            games.set(key, current);
        };
        CORE_GAMES.forEach((label) => add(label));
        for (const { data: snapshot } of Object.values(snapshots) as CoverageSnapshot[]) {
            if (!snapshot) continue;
            snapshot.matches.forEach((match) => add(match.game, match.gameImage));
            snapshot.results.forEach((match) => add(match.game, match.gameImage));
            snapshot.tournaments.forEach((item) => add(item.game, item.gameImage));
            snapshot.rankings.forEach((item) => add(item.game, item.gameImage));
            snapshot.news.filter(isCompetitiveNews).forEach((item) => add(item.game));
        }
        const overviewLive = overview.matches.filter((match) =>
            isCurrentLiveMatch(match, now) && (scope === 'all' || !data || gameSlug(gameLabel(match.game)) !== scope));
        overviewLive.forEach((match) => add(match.game, match.gameImage, true));
        const scopedLive = scope === 'all' ? [] : liveMatches.filter((match) => gameSlug(gameLabel(match.game)) === scope);
        scopedLive.forEach((match) => add(match.game, match.gameImage, true));
        return [{ key: 'all', label: 'Todos os jogos', live: overviewLive.length + scopedLive.length }, ...games.values()];
    }, [snapshots, overview, liveMatches, now, scope, data]);

    const active = gameOptions.find((item) => item.key === scope) ?? { key: scope, label: scope.replace(/-/g, ' '), live: 0 };
    const setFilter = (key: 'jogo' | 'partidas', value: string | null) => {
        const next = new URLSearchParams(search);
        if (value) next.set(key, value); else next.delete(key);
        setSearch(next, { preventScrollReset: true });
    };
    const coverage = useMemo(() => {
        const matchesGame = (name?: string | null) => active.key === 'all' || gameSlug(gameKey(name)) === active.key;
        const matches = feed.matches.filter((match) => matchesGame(match.game));
        return {
            live: liveMatches.filter((match) => matchesGame(match.game)),
            schedule: matches.filter((match) => match.status === 'SCHEDULED').sort((a, b) => timeOf(a, Infinity) - timeOf(b, Infinity)),
            results: feed.results.filter((match) => match.status === 'FINISHED' && matchesGame(match.game)).sort((a, b) => timeOf(b, -Infinity) - timeOf(a, -Infinity)),
            tournaments: feed.tournaments.filter((item) => matchesGame(item.game)),
            rankings: feed.rankings.filter((item) => matchesGame(item.game)),
            news: news.filter((item) => matchesGame(item.game)),
        };
    }, [feed, liveMatches, news, active.key]);

    const requested = hydrated ? search.get('partidas') : null;
    const view: MatchView = requested === 'live' || requested === 'schedule' || requested === 'results'
        ? requested
        : coverage.live.length ? 'live' : coverage.schedule.length || !coverage.results.length ? 'schedule' : 'results';
    const loading = !data && !error;
    const attribution = data?.source?.attribution;
    const spotlight = useMemo(() => pickSpotlight(coverage.live, coverage.schedule, coverage.results), [coverage]);
    const featuredTournament = useMemo(() => pickTournament(coverage.tournaments, spotlight.match), [coverage.tournaments, spotlight.match]);

    return (
        <div className="flex-1 bg-dark-950 text-gray-200">
            <Seo title="E-sports: partidas, agenda e campeonatos" description="Partidas, agenda, resultados e notícias do e-sports com foco nas equipes brasileiras." path="/esports" />
            <div className="mx-auto max-w-[1368px] px-4 pb-14 pt-3 sm:px-6 lg:pt-5">
                <h1 className="sr-only">{active.key === 'all' ? 'E-sports' : active.label}</h1>
                <EsportsGameTabs options={gameOptions} active={active.key} onChange={(key) => setFilter('jogo', key === 'all' ? null : key)} />

                {error && (
                    <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/25 bg-amber-400/5 px-4 py-2.5 text-sm text-amber-200">
                        <span className="flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{data ? 'Não foi possível atualizar as partidas.' : 'Não foi possível carregar a cobertura.'}</span>
                        <button type="button" onClick={() => refresh(scope)} className="min-h-8 font-semibold underline underline-offset-4">Tentar novamente</button>
                    </div>
                )}

                {data && (spotlight.match || featuredTournament) && (
                    <div className="mt-6">
                        <EsportsSpotlight match={spotlight.match} live={spotlight.live} tournament={featuredTournament} now={now} />
                    </div>
                )}

                <div className="mt-10 grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
                    <EsportsSchedule key={`matches-${active.key}`} game={active.key} view={view} onViewChange={(value) => setFilter('partidas', value)}
                        matches={coverage}
                        loading={loading} unavailable={!data && !!error} now={now} />
                    <aside className="grid min-w-0 gap-5 lg:sticky lg:top-24" aria-label="Campeonatos e ranking">
                        {data ? <>
                            <EsportsEventsPanel key={`events-${active.key}`} tournaments={coverage.tournaments} />
                            <EsportsRankingPanel key={`ranking-${active.key}`} rankings={coverage.rankings} />
                        </> : loading && <div role="status" className="h-64 animate-pulse rounded-xl border border-white/5 bg-white/[0.02] motion-reduce:animate-none"><span className="sr-only">Carregando campeonatos</span></div>}
                    </aside>
                </div>

                {data && (
                    <div className="mt-12">
                        <EsportsNewsGrid news={coverage.news} title={active.key === 'all' ? 'Notícias de e-sports' : `Notícias de ${active.label}`} />
                    </div>
                )}

                {attribution?.url && data && (data.source.configured || feed.matches.some((match) => match.provider === 'LIQUIPEDIA') || feed.results.some((match) => match.provider === 'LIQUIPEDIA') || feed.tournaments.some((item) => item.provider === 'LIQUIPEDIA')) && (
                    <p className="mt-10 border-t border-white/10 pt-4 text-xs text-slate-400">Dados competitivos: <a href={attribution.url} target="_blank" rel="noreferrer" className="text-brand-300 underline underline-offset-4">{attribution.provider}</a> ({attribution.license}).</p>
                )}
                {data?.source.providers?.includes('PandaScore') && (
                    <p className="mt-3 text-xs text-slate-400">
                        Source: <a href="https://pandascore.co/" target="_blank" rel="noreferrer" className="text-brand-300 underline underline-offset-4">PandaScore</a>
                    </p>
                )}
            </div>
        </div>
    );
};
