import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../UI';

interface MatchesTabProps {
    matches?: any[];
}

export const MatchesTab: React.FC<MatchesTabProps> = ({ matches = [] }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-dark-900 border border-dark-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-dark-800 bg-dark-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Últimos Resultados</h3>
                <div className="flex gap-2">
                    <Badge color="brand">Playoffs</Badge>
                    <Badge color="gray">Fase de Grupos</Badge>
                </div>
            </div>
            <div>
                {matches.length > 0 ? matches.map((match) => (
                    <div
                        key={match.id}
                        onClick={() => navigate(`/esports/match/${match.id}`)}
                        className="flex items-center justify-between p-4 border-b border-dark-800 hover:bg-dark-800 transition-colors group cursor-pointer"
                    >
                        <div className="w-32 text-xs text-gray-500 font-mono">
                            {match.date}
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-8">
                            <div className="flex items-center gap-3 w-32 justify-end">
                                <span className={`text-sm font-bold ${match.scoreA && match.scoreA > (match.scoreB || 0) ? 'text-white' : 'text-gray-400'}`}>{match.teamA.name}</span>
                                <div className="w-6 h-6 bg-dark-950 rounded flex items-center justify-center text-[10px] text-gray-600 overflow-hidden">
                                    {match.teamA.logo ? <img src={match.teamA.logo} className="w-full h-full object-cover" /> : 'A'}
                                </div>
                            </div>
                            <div className="px-4 py-1 bg-dark-950 rounded border border-[#333] font-mono font-bold text-brand-500">
                                {match.scoreA} - {match.scoreB}
                            </div>
                            <div className="flex items-center gap-3 w-32">
                                <div className="w-6 h-6 bg-dark-950 rounded flex items-center justify-center text-[10px] text-gray-600 overflow-hidden">
                                    {match.teamB.logo ? <img src={match.teamB.logo} className="w-full h-full object-cover" /> : 'B'}
                                </div>
                                <span className={`text-sm font-bold ${match.scoreB && match.scoreB > (match.scoreA || 0) ? 'text-white' : 'text-gray-400'}`}>{match.teamB.name}</span>
                            </div>
                        </div>
                        <div className="w-32 text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-600 bg-dark-950 px-2 py-1 rounded group-hover:text-brand-500 group-hover:border-brand-500/30 border border-transparent transition-all">Detalhes</span>
                        </div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-gray-500">No matches found for this tournament.</div>
                )}
            </div>
        </div>
    );
};
