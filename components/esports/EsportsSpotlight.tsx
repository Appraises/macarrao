import React from 'react';
import { ArrowRight, CalendarDays, MonitorPlay, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Match, Team, Tournament } from '../../types';
import { EsportsMark } from './EsportsMark';
import { gameAccent, gameCover, gameLabel } from './gameMeta';
import {
    countdownLabel, formatTime, hasPrize, hasScore, instantOf, matchPath,
    relativeDayLabel, teamInitials, tournamentPath, tournamentStatusLabel, winnerSide,
} from './hubUtils';

const SpotlightTeam: React.FC<{ team: Team; dimmed: boolean }> = ({ team, dimmed }) => (
    <div className={`flex min-w-0 flex-col items-center gap-3 text-center ${dimmed ? 'opacity-55' : ''}`}>
        <EsportsMark src={team.logo} alt="" fallback={teamInitials(team.name)}
            className="h-16 w-16 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 font-display text-lg font-bold text-slate-300 backdrop-blur-sm sm:h-[84px] sm:w-[84px] sm:p-3" />
        <span className="max-w-full break-words font-display text-lg font-bold leading-tight text-white sm:text-2xl">{team.name}</span>
    </div>
);

const MatchSpotlight: React.FC<{ match: Match; live: boolean; now: number }> = ({ match, live, now }) => {
    const game = gameLabel(match.game);
    const cover = gameCover(match.game, match.gameImage);
    const instant = instantOf(match.scheduledAt);
    const finished = match.status === 'FINISHED';
    const winner = winnerSide(match);
    const phase = match.stage || match.round;
    const stream = !finished ? match.streamUrl : null;
    const eyebrow = live ? null : finished ? 'Último resultado' : 'Próxima partida';

    return (
        <article data-testid="spotlight-match" aria-label={`${match.teamA.name} x ${match.teamB.name}`}
            className="relative isolate flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a101c] p-5 sm:p-7">
            {cover && <img src={cover} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />}
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_60%),linear-gradient(to_bottom,rgba(2,6,23,0.55),#020617_92%)]" />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {live
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" />Ao vivo
                    </span>
                    : <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200">{eyebrow}</span>}
                <span className={`font-bold ${gameAccent(game).text}`}>{game}</span>
                <span className="text-slate-300">{match.competition}{phase ? ` · ${phase}` : ''}</span>
            </div>

            <div className="my-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 py-6 sm:gap-8">
                <SpotlightTeam team={match.teamA} dimmed={winner === 'B'} />
                <div className="flex min-w-[96px] flex-col items-center self-center text-center">
                    {live || finished ? (
                        <span aria-label={hasScore(match) ? `Placar: ${match.scoreA} a ${match.scoreB}` : 'Placar indisponível'}
                            className="font-display text-5xl font-bold leading-none tabular-nums text-white sm:text-7xl">
                            {hasScore(match) ? <>{match.scoreA}<span className="mx-2 text-slate-500 sm:mx-3">:</span>{match.scoreB}</> : '—'}
                        </span>
                    ) : instant ? (
                        <>
                            <time dateTime={match.scheduledAt!} className="font-display text-5xl font-bold leading-none tabular-nums text-white sm:text-6xl">{formatTime(instant)}</time>
                            <span className="mt-2 text-xs font-semibold text-brand-300">{relativeDayLabel(instant, now)} · {countdownLabel(instant, now)}</span>
                        </>
                    ) : <span className="font-display text-3xl font-bold text-slate-300">A definir</span>}
                    {match.bestOf ? <span className="mt-2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">MD{match.bestOf}</span> : null}
                </div>
                <SpotlightTeam team={match.teamB} dimmed={winner === 'A'} />
            </div>

            <div className="flex flex-wrap gap-2">
                <Link to={matchPath(match)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-dark-950 transition-colors hover:bg-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">
                    Ver partida <ArrowRight size={15} aria-hidden="true" />
                </Link>
                {stream && (
                    <a href={stream} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/10">
                        <MonitorPlay size={15} aria-hidden="true" /> {live ? 'Assistir ao vivo' : 'Onde assistir'}
                    </a>
                )}
                {finished && match.vodUrl && (
                    <a href={match.vodUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10">
                        <MonitorPlay size={15} aria-hidden="true" /> Ver VOD
                    </a>
                )}
            </div>
        </article>
    );
};

const TournamentSpotlight: React.FC<{ item: Tournament; wide: boolean }> = ({ item, wide }) => {
    const game = gameLabel(item.game);
    const art = item.image || gameCover(item.game, item.gameImage);
    return (
        <Link to={tournamentPath(item)} data-testid="spotlight-tournament"
            className={`group relative isolate flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0a101c] transition-colors hover:border-brand-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${wide ? 'flex min-h-[300px] justify-end p-6 sm:p-8' : 'hidden min-h-[300px] lg:flex'}`}>
            {wide ? (
                <>
                    {art && <img src={art} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />}
                    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-dark-950 via-dark-950/70 to-transparent" />
                </>
            ) : (
                <div className="relative h-36 shrink-0 overflow-hidden bg-[#111827]">
                    {art ? <img src={art} alt="" className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                        : <Trophy size={32} className="absolute inset-0 m-auto text-slate-600" aria-hidden="true" />}
                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0a101c] to-transparent" />
                    {item.logo && <img src={item.logo} alt="" className="absolute bottom-3 left-4 h-10 w-10 rounded-lg bg-dark-950/70 object-contain p-1.5" />}
                </div>
            )}
            <div className={wide ? 'max-w-xl' : 'flex flex-1 flex-col p-5 pt-3'}>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Campeonato em destaque</span>
                <h2 className="mt-1.5 font-display text-2xl font-bold leading-tight text-white group-hover:text-brand-200 sm:text-[28px]">{item.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className={`font-bold ${gameAccent(game).text}`}>{game}</span>
                    <span className="text-slate-500" aria-hidden="true">•</span>
                    <span className="text-slate-300">{tournamentStatusLabel[item.status]}</span>
                </div>
                <dl className={`mt-4 grid grid-cols-2 gap-3 text-sm ${wide ? '' : 'mt-auto pt-4'}`}>
                    <div><dt className="flex items-center gap-1 text-[11px] text-slate-400"><CalendarDays size={12} aria-hidden="true" /> Datas</dt><dd className="mt-0.5 font-semibold text-slate-100">{item.dates}</dd></div>
                    {hasPrize(item) && <div><dt className="flex items-center gap-1 text-[11px] text-slate-400"><Trophy size={12} aria-hidden="true" /> Premiação</dt><dd className="mt-0.5 font-semibold text-slate-100">{item.prizePool}</dd></div>}
                </dl>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-300 group-hover:text-brand-200">Ver campeonato <ArrowRight size={15} aria-hidden="true" /></span>
            </div>
        </Link>
    );
};

interface EsportsSpotlightProps {
    match: Match | null;
    live: boolean;
    tournament: Tournament | null;
    now: number;
}

export const EsportsSpotlight: React.FC<EsportsSpotlightProps> = ({ match, live, tournament, now }) => {
    if (!match && !tournament) return null;
    return (
        <section aria-label="Destaques" className={`grid gap-4 ${match && tournament ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
            {match && <MatchSpotlight match={match} live={live} now={now} />}
            {tournament && <TournamentSpotlight item={tournament} wide={!match} />}
        </section>
    );
};
