import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../../types';

interface CompactMatchRowProps {
    match: Match;
}

export const CompactMatchRow: React.FC<CompactMatchRowProps> = ({ match }) => {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate(`/esports/match/${match.id}`)}
            className="group flex items-center justify-between p-3 bg-dark-900/50 border-b border-dark-800 hover:bg-dark-800 transition-colors cursor-pointer border-l-2 border-l-transparent hover:border-l-brand-500"
        >
            <div className="flex items-center gap-3 w-1/4">
                {match.isLive ? (
                    <div className="flex flex-col">
                        <span className="text-red-500 font-bold text-[10px] uppercase animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> LIVE
                        </span>
                        <span className="text-gray-500 text-[10px]">Bo3</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-gray-300 font-mono text-xs font-bold">{match.time}</span>
                        <span className="text-gray-600 text-[10px]">{match.date}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className={`text-xs font-bold ${match.scoreA && match.scoreA > (match.scoreB || 0) ? 'text-white' : 'text-gray-400'}`}>{match.teamA.name}</span>
                    <img src={`https://flagcdn.com/w20/${match.teamA.country}.png`} className="w-5 h-3.5 rounded-sm opacity-80" />
                </div>

                <div className="px-3 flex items-center gap-2 font-mono text-sm font-bold min-w-[60px] justify-center">
                    {match.isLive ? (
                        <>
                            <span className="text-brand-500">{match.scoreA}</span>
                            <span className="text-dark-600">-</span>
                            <span className="text-brand-500">{match.scoreB}</span>
                        </>
                    ) : (
                        <span className="text-dark-700">vs</span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-1">
                    <img src={`https://flagcdn.com/w20/${match.teamB.country}.png`} className="w-5 h-3.5 rounded-sm opacity-80" />
                    <span className={`text-xs font-bold ${match.scoreB && match.scoreB > (match.scoreA || 0) ? 'text-white' : 'text-gray-400'}`}>{match.teamB.name}</span>
                </div>
            </div>

            <div className="w-1/4 flex justify-end items-center gap-2">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[80px]">{match.competition}</span>
                    <span className={`text-[10px] font-bold px-1.5 rounded ${match.game === 'Valorant' ? 'text-red-400 bg-red-500/10' : match.game === 'CS2' ? 'text-yellow-400 bg-yellow-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                        {match.game === 'Counter-Strike 2' ? 'CS2' : match.game === 'League of Legends' ? 'LoL' : match.game}
                    </span>
                </div>
            </div>
        </div>
    );
};
