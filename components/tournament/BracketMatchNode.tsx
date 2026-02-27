import React from 'react';
import { CheckCircle } from 'lucide-react';

interface BracketMatchNodeProps {
    match?: any;
    title?: string;
    isGrandFinal?: boolean;
    className?: string;
    hasLineRight?: boolean;
    hasLineBottom?: boolean;
    hasLineTop?: boolean;
    lineHeight?: string;
    lineTopHeight?: string;
    onPick?: (matchId: string, teamName: string) => void;
    userPick?: string;
}

export const BracketMatchNode: React.FC<BracketMatchNodeProps> = ({ match, title, isGrandFinal, className = "", hasLineRight, hasLineBottom, hasLineTop, lineHeight = "h-12", lineTopHeight = "h-12", onPick, userPick }) => (
    <div className={`relative flex flex-col justify-center ${className}`}>
        {title && (
            <span className="text-[10px] uppercase font-bold text-gray-500 mb-2 pl-1 tracking-wider">{title}</span>
        )}

        <div className={`bg-dark-900 border border-dark-800 rounded w-52 relative z-10 transition-all ${isGrandFinal ? 'border-brand-500/50 shadow-[0_0_15px_rgba(14,165,233,0.1)]' : ''}`}>
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
                            <div className="w-5 h-5 bg-dark-950 rounded-sm flex items-center justify-center overflow-hidden">
                                {match.teamA.name === 'TBD' ? (
                                    <span className="text-[8px] font-bold text-gray-500">-</span>
                                ) : (
                                    <img src={`https://flagcdn.com/w20/br.png`} className="w-full h-full object-cover opacity-80" alt="Flag" />
                                )}
                            </div>
                            <span className={`text-xs font-bold truncate max-w-[100px] ${match.teamA.isWinner || userPick === match.teamA.name ? 'text-white' : 'text-gray-400'}`}>
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
                            <div className="w-5 h-5 bg-dark-950 rounded-sm flex items-center justify-center overflow-hidden">
                                {match.teamB.name === 'TBD' ? (
                                    <span className="text-[8px] font-bold text-gray-500">-</span>
                                ) : (
                                    <img src={`https://flagcdn.com/w20/us.png`} className="w-full h-full object-cover opacity-80" alt="Flag" />
                                )}
                            </div>
                            <span className={`text-xs font-bold truncate max-w-[100px] ${match.teamB.isWinner || userPick === match.teamB.name ? 'text-white' : 'text-gray-400'}`}>
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

        {match && (match.teamA.score !== null || match.teamB.score !== null) && !userPick && (
            <div className="mt-1 pl-1">
                <span className="text-[10px] text-gray-500">Points: 0 / {isGrandFinal ? '30' : '5'}</span>
            </div>
        )}

        {hasLineRight && (
            <div className="absolute right-[-20px] top-1/2 w-5 h-px bg-[#4a4a4a] z-0 hidden md:block"></div>
        )}
        {hasLineBottom && (
            <div className={`absolute right-[-20px] top-1/2 w-px bg-[#4a4a4a] z-0 hidden md:block ${lineHeight}`}></div>
        )}
        {hasLineTop && (
            <div className={`absolute right-[-20px] bottom-1/2 w-px bg-[#4a4a4a] z-0 hidden md:block ${lineTopHeight}`}></div>
        )}
    </div>
);
