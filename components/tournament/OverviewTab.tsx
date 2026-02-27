import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { TournamentDetail as TournamentDetailType } from '../../types';

interface OverviewTabProps {
    tournament: TournamentDetailType;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament }) => {
    const getMatch = (matchId: string) => tournament?.bracket?.find(m => m.id === matchId);

    return (
        <div className="space-y-6">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Standings / Prize Distribution */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-brand-500 uppercase tracking-widest">
                            <span className="w-1 h-4 bg-brand-500 inline-block rounded-sm"></span>
                            {tournament.standings && tournament.standings.length > 0 ? 'Standings' : 'Prize Distribution'}
                        </div>

                        {tournament.standings && tournament.standings.length > 0 ? (
                            <div className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-dark-800 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-dark-800">
                                            <th className="p-3 pl-4">Rank</th>
                                            <th className="p-3">Team</th>
                                            <th className="p-3 text-center">W-L</th>
                                            <th className="p-3 text-center">Played</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-800">
                                        {tournament.standings.map((team: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-dark-800/50 transition-colors">
                                                <td className="p-3 pl-4 font-mono font-bold text-gray-400">#{team.rank}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        {team.team.logo && <img src={team.team.logo} className="w-6 h-6 object-contain" alt={team.team.name} />}
                                                        <span className="text-white font-bold text-xs">{team.team.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center font-mono text-gray-300">{team.wins} - {team.losses}</td>
                                                <td className="p-3 text-center font-mono text-gray-500">{team.played}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden p-8 text-center">
                                <Trophy className="w-12 h-12 text-[#333] mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Standings/Prize details are not available for this tournament yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Latest Results Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-brand-500 uppercase tracking-widest">
                            <span className="w-1 h-4 bg-brand-500 inline-block rounded-sm"></span>
                            Latest Results
                        </div>
                        <div className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden">
                            <div className="divide-y divide-dark-800">
                                {tournament.matches && tournament.matches.length > 0 ? tournament.matches.slice(0, 5).map((match) => (
                                    <div key={match.id} className="p-3 hover:bg-dark-800 transition-colors cursor-pointer group">
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                            <span>{match.competition}</span>
                                            <span className="font-mono">{match.date}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        {match.teamA.logo && <img src={match.teamA.logo} className="w-3 h-3 object-contain" alt={match.teamA.name} />}
                                                        <span className={`text-xs font-bold ${match.scoreA && match.scoreB && match.scoreA > match.scoreB ? 'text-white' : 'text-gray-400'}`}>{match.teamA.name}</span>
                                                    </div>
                                                    <span className={`text-xs font-mono font-bold ${match.scoreA && match.scoreB && match.scoreA > match.scoreB ? 'text-brand-500' : 'text-gray-500'}`}>{match.scoreA}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        {match.teamB.logo && <img src={match.teamB.logo} className="w-3 h-3 object-contain" alt={match.teamB.name} />}
                                                        <span className={`text-xs font-bold ${match.scoreB && match.scoreA && match.scoreB > match.scoreA ? 'text-white' : 'text-gray-400'}`}>{match.teamB.name}</span>
                                                    </div>
                                                    <span className={`text-xs font-mono font-bold ${match.scoreB && match.scoreA && match.scoreB > match.scoreA ? 'text-brand-500' : 'text-gray-500'}`}>{match.scoreB}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-gray-500 text-xs">No recent results</div>
                                )}
                            </div>
                            <div className="p-2 bg-dark-800 text-center">
                                <button className="text-[10px] font-bold text-gray-500 hover:text-white uppercase">View all matches</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bracket Section */}
                {tournament.bracket && tournament.bracket.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-brand-500 uppercase tracking-widest">
                            <span className="text-gray-500">Playoffs:</span> Bracket
                        </div>
                        <div className="bg-dark-900 border border-dark-800 p-8 rounded-lg overflow-x-auto">
                            <p className="text-gray-500 text-sm">Bracket view coming soon.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
