import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, ChevronDown, ChevronRight, Clock3, History, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Match, Team } from '../../types';
import { EsportsMark } from './EsportsMark';
import { gameAccent, gameLabel, gameLogo, officialSchedules } from './gameMeta';
import {
    dayKey, formatTime, instantOf, longDayLabel, matchPath,
    relativeDayLabel, teamInitials, winnerSide,
} from './hubUtils';

export type MatchView = 'live' | 'schedule' | 'results';

const views = [
    { key: 'live', label: 'Ao vivo', icon: Radio },
    { key: 'schedule', label: 'Agenda', icon: CalendarDays },
    { key: 'results', label: 'Resultados', icon: History },
] as const;
const empty: Record<MatchView, string> = {
    live: 'Nenhuma partida ao vivo no momento.',
    schedule: 'Nenhuma partida agendada no momento.',
    results: 'Nenhum resultado disponível.',
};
const PAGE = 8;

const TeamRow: React.FC<{ team: Team; score?: number | null; showScore: boolean; state: 'win' | 'loss' | 'neutral' }> = ({ team, score, showScore, state }) => (
    <span className="flex min-w-0 items-center gap-2.5">
        <EsportsMark src={team.logo} alt="" fallback={teamInitials(team.name)} className="h-5 w-5 text-[8px] font-bold text-slate-400" />
        <span className={`min-w-0 truncate text-sm ${state === 'loss' ? 'text-slate-400' : 'font-semibold text-slate-100'}`} title={team.name}>{team.name}</span>
        {showScore && <span className={`ml-auto w-6 shrink-0 text-right font-display text-lg font-bold tabular-nums leading-none ${state === 'loss' ? 'text-slate-500' : 'text-white'}`}>{score ?? '–'}</span>}
    </span>
);

const MatchRow: React.FC<{ match: Match; view: MatchView; showDay?: boolean; now?: number }> = ({ match, view, showDay, now = Date.now() }) => {
    const live = view === 'live';
    const instant = instantOf(match.scheduledAt);
    const winner = winnerSide(match);
    const showScore = view !== 'schedule';
    const scoreLabel = match.scoreA != null && match.scoreB != null ? `Placar: ${match.scoreA} a ${match.scoreB}` : 'Placar indisponível';
    const phase = match.stage || match.round;
    return (
        <li>
            <Link to={matchPath(match)} data-testid="featured-match"
                className={`group grid grid-cols-[60px_minmax(0,1fr)_14px] items-center gap-3 border-l-2 px-3 py-3 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400 sm:grid-cols-[68px_minmax(0,1fr)_112px_14px] sm:px-4 ${live ? 'border-red-500 bg-red-500/[0.04]' : 'border-transparent'}`}>
                <span className="flex flex-col items-start gap-0.5">
                    {live
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 motion-reduce:animate-none" />Ao vivo</span>
                        : instant
                            ? <time dateTime={match.scheduledAt!} className="font-display text-base font-bold tabular-nums text-slate-100">{formatTime(instant)}</time>
                            : <span className="text-[11px] text-slate-400">A definir</span>}
                    {view === 'results' && <span className="text-[10px] font-semibold uppercase text-slate-500">Encerrada</span>}
                    {showDay && instant && <span className="text-[10px] font-semibold text-slate-500 first-letter:uppercase">{relativeDayLabel(instant, now)}</span>}
                </span>
                <span className="grid min-w-0 gap-1.5" aria-label={showScore ? scoreLabel : undefined} role={showScore ? 'group' : undefined}>
                    <TeamRow team={match.teamA} score={match.scoreA} showScore={showScore} state={winner === 'A' ? 'win' : winner === 'B' ? 'loss' : 'neutral'} />
                    <TeamRow team={match.teamB} score={match.scoreB} showScore={showScore} state={winner === 'B' ? 'win' : winner === 'A' ? 'loss' : 'neutral'} />
                </span>
                <span className="hidden flex-col items-end gap-1 text-right sm:flex">
                    {match.bestOf ? <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">MD{match.bestOf}</span> : null}
                    {showDay
                        ? <span className="line-clamp-2 text-[11px] leading-tight text-slate-400">{match.competition}</span>
                        : phase && <span className="line-clamp-2 text-[11px] leading-tight text-slate-400">{phase}</span>}
                </span>
                <ChevronRight size={14} className="text-slate-500 transition-colors group-hover:text-brand-300" aria-hidden="true" />
            </Link>
        </li>
    );
};

type Group = { key: string; title: string; game: string; matches: Match[] };
type Day = { key: string; label: string; heading: string; groups: Group[]; count: number };

const groupByDay = (rows: Match[], now: number, byDay: boolean): Day[] => {
    const days = new Map<string, Day>();
    for (const match of rows) {
        const instant = instantOf(match.scheduledAt);
        const key = !byDay ? 'all' : instant ? dayKey(instant) : 'tbd';
        let day = days.get(key);
        if (!day) {
            day = {
                key,
                label: !byDay ? '' : instant ? relativeDayLabel(instant, now) : 'A definir',
                heading: !byDay ? '' : instant ? longDayLabel(instant, now) : 'Data a definir',
                groups: [],
                count: 0,
            };
            days.set(key, day);
        }
        const groupKey = `${gameLabel(match.game)}|${match.competition}`;
        let group = day.groups.find((item) => item.key === groupKey);
        if (!group) {
            group = { key: groupKey, title: match.competition, game: gameLabel(match.game), matches: [] };
            day.groups.push(group);
        }
        group.matches.push(match);
        day.count++;
    }
    return [...days.values()];
};

interface EsportsScheduleProps {
    game: string;
    view: MatchView;
    onViewChange: (view: MatchView) => void;
    matches: Record<MatchView, Match[]>;
    loading: boolean;
    unavailable: boolean;
    now: number;
}

export const EsportsSchedule: React.FC<EsportsScheduleProps> = ({ game, view, onViewChange, matches, loading, unavailable, now }) => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const rows = matches[view];
    const days = useMemo(() => groupByDay(rows, now, view !== 'live'), [rows, now, view]);
    const activeDay = days.find((day) => day.key === selectedDay) ? selectedDay : null;
    const shownDays = activeDay ? days.filter((day) => day.key === activeDay) : days;

    // Paginate by match count while keeping day and tournament headers intact.
    let budget = expanded || activeDay ? Infinity : PAGE;
    const visible = shownDays.map((day) => ({
        ...day,
        groups: day.groups.map((group) => {
            const take = Math.max(0, Math.min(group.matches.length, budget));
            budget -= take;
            return { ...group, matches: group.matches.slice(0, take) };
        }).filter((group) => group.matches.length),
    })).filter((day) => day.groups.length);
    const total = shownDays.reduce((sum, day) => sum + day.count, 0);
    const hidden = expanded || activeDay ? 0 : Math.max(0, total - PAGE);
    const upNext = matches.schedule.slice(0, 3);
    const schedules = view === 'results' ? [] : officialSchedules.filter((schedule) => game === 'all' || game === schedule.key);

    const changeView = (next: MatchView) => {
        setSelectedDay(null);
        setExpanded(false);
        onViewChange(next);
    };

    return (
        <section aria-labelledby="esports-matches-title" aria-busy={loading} className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <h2 id="esports-matches-title" className="font-display text-[28px] font-bold leading-none text-white">Partidas</h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock3 size={13} aria-hidden="true" /> Horário de Brasília</span>
            </div>

            <div className="mt-4">
                <div role="group" aria-label="Filtrar partidas" className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
                    {views.map(({ key, label, icon: Icon }) => (
                        <button key={key} type="button" onClick={() => changeView(key)} aria-pressed={key === view}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 aria-pressed:bg-white/10 aria-pressed:text-white sm:px-4 sm:text-sm">
                            <Icon size={14} className={key === 'live' && matches.live.length ? 'text-red-400' : ''} aria-hidden="true" />
                            {label}
                            {key === 'live' && matches.live.length > 0 && <span className="font-mono text-[10px] text-red-300" aria-label={matches.live.length === 1 ? '1 partida' : `${matches.live.length} partidas`}>{matches.live.length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {view !== 'live' && days.length > 1 && (
                <div role="group" aria-label="Filtrar por dia" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    {[{ key: null, label: 'Todos os dias', count: rows.length }, ...days.map((day) => ({ key: day.key, label: day.label, count: day.count }))].map((chip) => (
                        <button key={chip.key ?? 'all'} type="button" aria-pressed={activeDay === chip.key} onClick={() => setSelectedDay(chip.key)}
                            className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-semibold text-slate-300 transition-colors first-letter:uppercase hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 aria-pressed:border-brand-400/60 aria-pressed:bg-brand-400/10 aria-pressed:text-white">
                            {chip.label}<span className="font-mono text-[10px] text-slate-500">{chip.count}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#0a101c]">
                {loading ? (
                    <div role="status" className="divide-y divide-white/5"><span className="sr-only">Carregando partidas</span>
                        {[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse bg-white/[0.02] motion-reduce:animate-none" />)}
                    </div>
                ) : !rows.length ? (
                    <div className="px-5 py-8 text-sm text-slate-300">
                        <p className="flex items-center gap-3"><CalendarDays size={19} className="shrink-0 text-slate-500" aria-hidden="true" />
                            {unavailable ? 'Partidas indisponíveis.' : empty[view]}
                        </p>
                        {schedules.length > 0 && (
                            <nav aria-label="Agendas oficiais" className="mt-3 flex flex-wrap items-center gap-x-3 pl-8">
                                <span className="text-xs text-slate-400">{schedules.length > 1 ? 'Agendas oficiais:' : 'Agenda oficial:'}</span>
                                {schedules.map((schedule) => (
                                    <a key={schedule.key} href={schedule.url} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-brand-300 hover:underline">
                                        {schedule.label}<ArrowUpRight size={13} aria-hidden="true" />
                                    </a>
                                ))}
                            </nav>
                        )}
                    </div>
                ) : visible.map((day) => (
                    <div key={day.key}>
                        {day.heading && <h3 className="border-b border-white/5 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-200 first-letter:uppercase">{day.heading}</h3>}
                        {day.groups.map((group) => {
                            const logo = gameLogo(group.game);
                            return (
                                <div key={group.key} className="border-b border-white/5 last:border-b-0">
                                    <h4 className="flex items-center gap-2 px-4 pb-1 pt-3 text-[11px] font-semibold text-slate-400">
                                        {logo && <img src={logo} alt="" className="h-3 w-3.5 object-contain brightness-0 invert opacity-60" />}
                                        <span className={`font-bold ${gameAccent(group.game).text}`}>{group.game}</span>
                                        <span className="truncate">{group.title}</span>
                                    </h4>
                                    <ul className="divide-y divide-white/5">{group.matches.map((match) => <MatchRow key={match.id} match={match} view={view} />)}</ul>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {view === 'live' && upNext.length > 0 && (
                <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-200">A seguir</h3>
                        <button type="button" onClick={() => changeView('schedule')} className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-brand-300 hover:text-white">
                            Agenda completa <ChevronRight size={14} aria-hidden="true" />
                        </button>
                    </div>
                    <ul className="mt-2 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#0a101c]">
                        {upNext.map((match) => <MatchRow key={match.id} match={match} view="schedule" showDay now={now} />)}
                    </ul>
                </div>
            )}
            {(hidden > 0 || expanded) && (
                <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
                    className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-white focus-visible:outline-brand-400">
                    {expanded ? 'Mostrar menos' : `Ver mais partidas (${hidden})`} <ChevronDown size={15} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
                </button>
            )}
        </section>
    );
};
