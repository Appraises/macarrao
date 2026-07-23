import React, { useState, useEffect } from 'react';
import { esportsService } from '../../services/esportsService';

interface StatsTabProps {
    tournamentGame: string;
    tournamentId: string;
}

export const StatsTab: React.FC<StatsTabProps> = ({ tournamentGame, tournamentId }) => {
    const [stats, setStats] = useState<any[]>([]);
    const [columns, setColumns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            const data = await esportsService.getTournamentStats(tournamentId, tournamentGame);
            setStats(data.players);
            // Rank/Player/Team are fixed columns of this table; keep only stat columns.
            setColumns(data.columns.filter((c: any) => c.type !== 'player'));
            setLoading(false);
        };
        if (tournamentId) fetchStats();
    }, [tournamentId, tournamentGame]);

    if (loading) {
        return (
            <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (stats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-dark-900 border border-dark-800 rounded-lg">
                <h3 className="text-gray-400 font-bold mb-2">Estatísticas indisponíveis</h3>
                <p className="text-gray-600 text-sm">Ainda não há estatísticas de jogadores para este torneio.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-dark-900 border border-dark-800 rounded-lg">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-dark-800 text-gray-400 text-xs uppercase font-bold tracking-wider border-b border-dark-800">
                        <th className="p-4 w-16">Rank</th>
                        <th className="p-4">Player</th>
                        <th className="p-4">Team</th>
                        {columns.map(col => (
                            <th key={col.key} className={`p-4 text-center ${col.primary ? 'text-brand-500' : ''}`}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                    {stats.map((player, idx) => (
                        <tr key={player.id} className="hover:bg-dark-800 transition-colors group">
                            <td className="p-4 text-gray-500 font-mono">#{idx + 1}</td>
                            <td className="p-4 font-bold text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-dark-950 flex items-center justify-center overflow-hidden border border-dark-700">
                                        {player.photo ? (
                                            <img src={player.photo} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-2">
                                            {player.name}
                                            <img src={`https://flagcdn.com/w20/${player.country}.png`} className="w-3 h-2 rounded-sm opacity-70" alt={player.country} />
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-normal">{player.role}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-gray-300">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{player.team}</span>
                                </div>
                            </td>
                            {columns.map(col => (
                                <td key={col.key} className="p-4 text-center">
                                    <span className={`font-mono ${col.primary ? 'font-bold text-brand-400 bg-brand-500/10 px-2 py-1 rounded' : 'text-gray-400'}`}>
                                        {player.stats?.[col.key] ?? '—'}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
