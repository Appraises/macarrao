import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Match } from '../../types';
import { gameAccent, gameLabel } from './gameMeta';

const TeamFlag: React.FC<{ team: Match['teamA'] }> = ({ team }) => {
    if (team.logo) return <img src={team.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />;
    if (team.country && team.country !== 'xx') return <img src={`https://flagcdn.com/w40/${team.country}.png`} alt="" className="w-8 shrink-0 rounded-sm opacity-80" />;
    return <span className="h-8 w-8 shrink-0 rounded bg-dark-800" />;
};

interface MatchRowProps {
    match: Match;
    /** Only show the game tag when the list mixes games — otherwise it is pure noise. */
    showGame?: boolean;
}

// One row, one visual language, three states (ao vivo / agendada / encerrada).
// Splitting these into separate components was what made the page feel fragmented.
export const MatchRow: React.FC<MatchRowProps> = ({ match, showGame = true }) => {
    const navigate = useNavigate();
    const accent = gameAccent(match.game);
    const live = !!match.isLive;
    const done = match.status === 'FINISHED';
    const a = match.scoreA ?? 0;
    const b = match.scoreB ?? 0;

    return (
        <div
            onClick={() => navigate(`/esports/match/${match.id}`)}
            className={`group flex cursor-pointer items-center gap-4 border-b border-dark-800 px-4 py-4 last:border-0 transition-colors hover:bg-dark-800/60 ${live ? 'border-l-2 border-l-red-500 bg-red-500/[0.03]' : 'border-l-2 border-l-transparent'}`}
        >
            {/* Estado */}
            <div className="w-20 shrink-0">
                {live ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-red-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Ao vivo
                    </span>
                ) : (
                    <div className="flex flex-col leading-tight">
                        <span className={`font-mono text-sm font-bold ${done ? 'text-gray-500' : 'text-gray-300'}`}>{done ? 'Final' : match.time}</span>
                        <span className="text-[11px] text-gray-600">{match.date}</span>
                    </div>
                )}
            </div>

            {/* Confronto */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                    <span className={`truncate text-sm font-bold ${done && a < b ? 'text-gray-500' : 'text-gray-200'}`}>{match.teamA.name}</span>
                    <TeamFlag team={match.teamA} />
                </div>

                <div className="flex w-16 shrink-0 items-center justify-center gap-2 font-mono text-lg font-bold">
                    {live || done ? (
                        <>
                            <span className={live ? 'text-brand-400' : a >= b ? 'text-gray-200' : 'text-gray-600'}>{a}</span>
                            <span className="text-sm text-dark-600">-</span>
                            <span className={live ? 'text-brand-400' : b >= a ? 'text-gray-200' : 'text-gray-600'}>{b}</span>
                        </>
                    ) : (
                        <span className="text-xs text-dark-600">vs</span>
                    )}
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <TeamFlag team={match.teamB} />
                    <span className={`truncate text-sm font-bold ${done && b < a ? 'text-gray-500' : 'text-gray-200'}`}>{match.teamB.name}</span>
                </div>
            </div>

            {/* Contexto */}
            <div className="flex w-40 shrink-0 items-center justify-end gap-2.5">
                <div className="flex min-w-0 flex-col items-end gap-1 leading-tight">
                    <span className="truncate text-[11px] text-gray-500">{match.competition}</span>
                    {showGame && <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${accent.bg} ${accent.text}`}>{gameLabel(match.game)}</span>}
                </div>
                {live && match.streamUrl && (
                    <a
                        href={match.streamUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Assistir transmissão"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded bg-brand-500/10 text-brand-300 hover:bg-brand-500/20"
                    >
                        <Play className="h-4 w-4" />
                    </a>
                )}
            </div>
        </div>
    );
};
