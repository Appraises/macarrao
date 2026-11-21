import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TournamentDetail } from '../../types';
import { BracketView } from './BracketView';
import { TeamCrest } from './TeamCrest';

interface OverviewTabProps {
    tournament: TournamentDetail;
    onShowMatches: () => void;
}

const sectionTitle = 'mb-3 border-l-2 border-brand-500 pl-2 text-sm font-bold text-white';

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament, onShowMatches }) => {
    const { prizeDistribution: distribution, prizePool, bracket, standings } = tournament;
    const money = distribution && new Intl.NumberFormat('pt-BR', { style: 'currency', currency: distribution.currency, maximumFractionDigits: 0 });
    const total = distribution && money ? money.format(distribution.total) : prizePool;
    const results = (tournament.matches ?? []).filter((match) => match.status === 'FINISHED')
        .sort((a, b) => (Date.parse(b.scheduledAt ?? '') || 0) - (Date.parse(a.scheduledAt ?? '') || 0)).slice(0, 5);

    return (
        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(270px,320px)]">
            <div className="min-w-0 space-y-7">
                <section aria-labelledby="tournament-bracket-title">
                    <h2 id="tournament-bracket-title" className={sectionTitle}>Chaveamento</h2>
                    {bracket?.length ? <BracketView bracket={bracket} /> : (
                        <p className="rounded-md border border-dark-800 px-4 py-5 text-sm text-gray-400">Chaveamento ainda não disponível.</p>
                    )}
                </section>

                {!!standings?.length && <section aria-labelledby="tournament-standings-title">
                    <h2 id="tournament-standings-title" className={sectionTitle}>Classificação</h2>
                    <div className="overflow-x-auto rounded-md border border-dark-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-dark-900 text-xs text-gray-400">
                                <tr><th scope="col" className="p-3">Pos.</th><th scope="col" className="p-3">Equipe</th><th scope="col" className="p-3 text-center">V–D</th><th scope="col" className="p-3 text-center">Jogos</th></tr>
                            </thead>
                            <tbody className="divide-y divide-dark-800">
                                {standings.map((row) => (
                                    <tr key={row.rank}>
                                        <td className="p-3 tabular-nums text-gray-400">{row.rank}º</td>
                                        <td className="p-3 font-semibold text-white">{row.team.name}</td>
                                        <td className="p-3 text-center tabular-nums">{row.wins}–{row.losses}</td>
                                        <td className="p-3 text-center tabular-nums">{row.played}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>}
            </div>

            <aside className="min-w-0 space-y-7" aria-label="Premiação e resultados">
                <section aria-labelledby="tournament-prizes-title">
                    <h2 id="tournament-prizes-title" className={sectionTitle}>Premiação</h2>
                    <div className="rounded-md border border-dark-800 bg-dark-900">
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-400">Total anunciado</p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-white">{total && total !== 'Nao informado' ? total : 'Não informado'}</p>
                        </div>
                        {distribution && money ? <>
                            <table className="w-full border-t border-dark-800 text-left text-xs">
                                <thead className="text-gray-400"><tr><th scope="col" className="px-4 py-2">Colocação</th><th scope="col" className="px-4 py-2 text-right">Por equipe</th></tr></thead>
                                <tbody className="divide-y divide-dark-800">
                                    {distribution.rows.map(({ from, to, amountPerTeam }) => (
                                        <tr key={from}><td className="px-4 py-2 text-gray-300">{from === to ? `${from}º` : `${from}º a ${to}º`}</td><td className="px-4 py-2 text-right font-semibold tabular-nums text-white">{money.format(amountPerTeam)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <a className="flex items-center gap-1.5 border-t border-dark-800 px-4 py-2.5 text-xs text-brand-300 hover:text-white" href={distribution.sourceUrl} target="_blank" rel="noreferrer">Fonte da premiação <ExternalLink size={12} aria-hidden="true" /></a>
                        </> : <p className="border-t border-dark-800 px-4 py-3 text-xs text-gray-400">Distribuição por colocação não disponível.</p>}
                    </div>
                </section>

                <section aria-labelledby="tournament-results-title">
                    <h2 id="tournament-results-title" className={sectionTitle}>Últimos resultados</h2>
                    <div className="divide-y divide-dark-800 rounded-md border border-dark-800 bg-dark-900">
                        {results.length ? results.map((match) => (
                            <Link key={match.id} to={`/esports/match/${match.id}`} className="block px-4 py-3 hover:bg-dark-800 focus-visible:outline-brand-400">
                                <span className="mb-1 block text-xs text-gray-400">{match.date}</span>
                                {([[match.teamA, match.scoreA], [match.teamB, match.scoreB]] as const).map(([team, score]) => (
                                    <span key={team.name} className="flex min-h-6 items-center justify-between gap-2 text-sm font-semibold text-white">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <TeamCrest logo={team.logo} compact />
                                            <span className="truncate">{team.name}</span>
                                        </span>
                                        <span className="shrink-0 tabular-nums">{score ?? '–'}</span>
                                    </span>
                                ))}
                            </Link>
                        )) : <p className="px-4 py-3 text-sm text-gray-400">Nenhum resultado confirmado.</p>}
                        <button type="button" onClick={onShowMatches} className="w-full px-4 py-3 text-xs font-semibold text-brand-300 hover:text-white">Ver todas as partidas</button>
                    </div>
                </section>
            </aside>
        </div>
    );
};
