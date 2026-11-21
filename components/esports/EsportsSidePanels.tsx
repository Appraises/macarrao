import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TeamRanking, Tournament } from '../../types';
import { EsportsMark } from './EsportsMark';
import { gameAccent, gameCover, gameLabel } from './gameMeta';
import { hasPrize, teamInitials, tournamentPath, tournamentPhase, tournamentStatusLabel, type TournamentPhase } from './hubUtils';

const Panel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; labelledBy: string }> = ({ title, icon, children, labelledBy }) => (
    <section aria-labelledby={labelledBy} className="overflow-hidden rounded-xl border border-white/10 bg-[#0a101c]">
        <h2 id={labelledBy} className="flex items-center gap-2 px-4 pb-2 pt-4 font-display text-xl font-bold text-white">{icon}{title}</h2>
        {children}
    </section>
);

const Tabs = <T extends string>({ label, options, active, onChange }: { label: string; options: Array<{ key: T; label: string; count?: number }>; active: T; onChange: (key: T) => void }) => (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => (
            <button key={option.key} type="button" aria-pressed={option.key === active} onClick={() => onChange(option.key)}
                className="relative min-h-10 shrink-0 px-2 text-xs font-semibold text-slate-400 after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400 aria-pressed:text-white aria-pressed:after:bg-brand-400">
                {option.label}{option.count != null && <span className="ml-1 font-mono text-[10px] text-slate-500">{option.count}</span>}
            </button>
        ))}
    </div>
);

const phaseStyle: Record<TournamentPhase, string> = {
    ongoing: 'bg-emerald-400',
    upcoming: 'bg-brand-400',
    finished: 'bg-slate-600',
};
const phaseLabels: Array<{ key: TournamentPhase; label: string }> = [
    { key: 'ongoing', label: 'Em andamento' },
    { key: 'upcoming', label: 'Próximos' },
    { key: 'finished', label: 'Encerrados' },
];

export const EsportsEventsPanel: React.FC<{ tournaments: Tournament[] }> = ({ tournaments }) => {
    const byPhase = useMemo(() => {
        const groups: Record<TournamentPhase, Tournament[]> = { ongoing: [], upcoming: [], finished: [] };
        tournaments.forEach((item) => groups[tournamentPhase(item)].push(item));
        return groups;
    }, [tournaments]);
    const available = phaseLabels.filter((phase) => byPhase[phase.key].length);
    const [chosen, setChosen] = useState<TournamentPhase | null>(null);
    const active = chosen && byPhase[chosen].length ? chosen : available[0]?.key ?? 'ongoing';
    const [expanded, setExpanded] = useState(false);
    const items = byPhase[active];
    const shown = expanded ? items : items.slice(0, 4);

    return (
        <Panel title="Campeonatos" icon={<Trophy size={17} className="text-brand-400" aria-hidden="true" />} labelledBy="esports-events-title">
            {!tournaments.length ? <p className="px-4 pb-5 pt-1 text-sm text-slate-400">Nenhum campeonato nesta seleção.</p> : <>
                <Tabs label="Situação dos campeonatos" options={available.map((phase) => ({ ...phase, count: byPhase[phase.key].length }))} active={active}
                    onChange={(key) => { setChosen(key); setExpanded(false); }} />
                <ul className="divide-y divide-white/5">
                    {shown.map((item) => {
                        const game = gameLabel(item.game);
                        const art = item.logo || item.image || gameCover(item.game, item.gameImage);
                        return (
                            <li key={item.id}>
                                <Link to={tournamentPath(item)} aria-label={`${item.name}, ${tournamentStatusLabel[item.status]}`}
                                    className="group relative flex items-center gap-3 py-3 pl-4 pr-3 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-400">
                                    <span aria-hidden="true" className={`absolute inset-y-3 left-0 w-0.5 rounded-r ${phaseStyle[active]}`} />
                                    <EsportsMark src={art} alt="" cover={!item.logo} fallback={<Trophy size={16} />}
                                        className={`h-11 w-11 rounded-lg bg-white/5 text-slate-500 ${item.logo ? 'p-1.5' : ''}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-brand-200">{item.name}</span>
                                        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                                            <span className={`font-bold ${gameAccent(game).text}`}>{game}</span>
                                            <span aria-hidden="true">·</span><span>{item.dates}</span>
                                        </span>
                                    </span>
                                    {hasPrize(item) && <span className="shrink-0 text-right text-[11px] font-semibold leading-tight text-slate-300">{item.prizePool}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
                {items.length > 4 && (
                    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex min-h-10 w-full items-center justify-center gap-1 border-t border-white/5 text-xs font-semibold text-brand-300 hover:text-white">
                        {expanded ? 'Mostrar menos' : `Ver mais (${items.length - 4})`} <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} aria-hidden="true" />
                    </button>
                )}
            </>}
        </Panel>
    );
};

const Trend: React.FC<{ trend: TeamRanking['trend'] }> = ({ trend }) => trend === 'up'
    ? <ChevronUp size={14} className="text-emerald-400" aria-label="Subiu" />
    : trend === 'down' ? <ChevronDown size={14} className="text-red-400" aria-label="Caiu" />
        : <Minus size={12} className="text-slate-600" aria-label="Estável" />;

export const EsportsRankingPanel: React.FC<{ rankings: TeamRanking[] }> = ({ rankings }) => {
    const games = useMemo(() => [...new Set(rankings.map((row) => gameLabel(row.game)))], [rankings]);
    const [chosen, setChosen] = useState<string | null>(null);
    const active = chosen && games.includes(chosen) ? chosen : games[0];
    if (!rankings.length) return null;
    const rows = rankings.filter((row) => gameLabel(row.game) === active).sort((a, b) => a.rank - b.rank).slice(0, 8);

    return (
        <Panel title="Ranking" icon={<span aria-hidden="true" className="font-display text-base text-brand-400">#</span>} labelledBy="esports-ranking-title">
            {games.length > 1 && <Tabs label="Ranking por jogo" options={games.map((game) => ({ key: game, label: game }))} active={active} onChange={setChosen} />}
            <ol className="py-1">
                {rows.map((row) => (
                    <li key={row.id ?? `${row.rank}-${row.team.name}`} className="flex items-center gap-3 px-4 py-2">
                        <span className={`w-5 shrink-0 text-right font-display text-base font-bold tabular-nums ${row.rank <= 3 ? 'text-white' : 'text-slate-500'}`}>{row.rank}</span>
                        <EsportsMark src={row.team.logo} alt="" fallback={teamInitials(row.team.name)} className="h-6 w-6 text-[8px] font-bold text-slate-400" />
                        <span className="min-w-0 truncate text-sm font-semibold text-slate-100">{row.team.name}</span>
                        <span className="ml-auto w-12 shrink-0 text-right font-mono text-xs tabular-nums text-slate-400">{row.points}</span>
                        <span className="flex w-4 shrink-0 justify-center"><Trend trend={row.trend} /></span>
                    </li>
                ))}
            </ol>
        </Panel>
    );
};
