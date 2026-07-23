import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Pickable match card used by the Pick'em bracket. Layout/connectors are
 * handled by BracketGrid — this component only renders the card itself.
 */
interface BracketMatchNodeProps {
    match?: any;
    isGrandFinal?: boolean;
    onPick?: (matchId: string, teamName: string) => void;
    userPick?: string;
}

export const BracketMatchNode: React.FC<BracketMatchNodeProps> = ({ match, isGrandFinal, onPick, userPick }) => (
    <div className={`bg-dark-900 border border-dark-800 rounded w-56 transition-all ${isGrandFinal ? 'border-brand-500/50 shadow-[0_0_15px_rgba(14,165,233,0.1)]' : ''}`}>
        {match ? (
            <>
                {/* Team A */}
                <div
                    onClick={() => onPick && match.teamA.name !== 'TBD' ? onPick(match.id, match.teamA.name) : undefined}
                    className={`flex justify-between items-center p-2.5 border-b border-dark-800 cursor-pointer hover:bg-dark-800/50 transition-colors
            ${match.teamA.isWinner ? 'bg-dark-800/30' : ''}
            ${userPick === match.teamA.name ? 'bg-brand-500/20 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}
            ${match.teamA.name === 'TBD' ? 'cursor-default opacity-50' : ''}
            `}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-dark-950 rounded-sm flex items-center justify-center overflow-hidden border border-dark-700">
                            <span className="text-[8px] font-black text-gray-400">
                                {match.teamA.name === 'TBD' ? '-' : match.teamA.name.slice(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <span className={`text-xs font-bold truncate max-w-[110px] ${match.teamA.isWinner || userPick === match.teamA.name ? 'text-white' : 'text-gray-400'}`}>
                            {match.teamA.name}
                        </span>
                    </div>
                    {userPick === match.teamA.name && <CheckCircle className="w-3 h-3 text-brand-500" />}
                    {!userPick && (
                        <span className={`text-xs font-mono font-bold ${match.teamA.isWinner ? 'text-brand-500' : 'text-gray-500'}`}>
                            {match.teamA.score ?? '-'}
                        </span>
                    )}
                </div>

                {/* Team B */}
                <div
                    onClick={() => onPick && match.teamB.name !== 'TBD' ? onPick(match.id, match.teamB.name) : undefined}
                    className={`flex justify-between items-center p-2.5 cursor-pointer hover:bg-dark-800/50 transition-colors
             ${match.teamB.isWinner ? 'bg-dark-800/30' : ''}
             ${userPick === match.teamB.name ? 'bg-brand-500/20 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}
             ${match.teamB.name === 'TBD' ? 'cursor-default opacity-50' : ''}
             `}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-dark-950 rounded-sm flex items-center justify-center overflow-hidden border border-dark-700">
                            <span className="text-[8px] font-black text-gray-400">
                                {match.teamB.name === 'TBD' ? '-' : match.teamB.name.slice(0, 2).toUpperCase()}
                            </span>
                        </div>
                        <span className={`text-xs font-bold truncate max-w-[110px] ${match.teamB.isWinner || userPick === match.teamB.name ? 'text-white' : 'text-gray-400'}`}>
                            {match.teamB.name}
                        </span>
                    </div>
                    {userPick === match.teamB.name && <CheckCircle className="w-3 h-3 text-brand-500" />}
                    {!userPick && (
                        <span className={`text-xs font-mono font-bold ${match.teamB.isWinner ? 'text-brand-500' : 'text-gray-500'}`}>
                            {match.teamB.score ?? '-'}
                        </span>
                    )}
                </div>
            </>
        ) : (
            <div className="h-20 flex items-center justify-center text-[10px] text-gray-600 uppercase">
                TBD
            </div>
        )}
    </div>
);
