import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trophy } from 'lucide-react';
import { Badge } from '../UI';
import { Tournament } from '../../types';

interface TournamentCardProps {
    tournament: Tournament;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/esports/tournament/${tournament.id}`)}
            className="bg-dark-900 rounded-xl overflow-hidden border border-dark-700 group hover:border-brand-500/50 transition-all cursor-pointer relative"
        >
            <div className="h-24 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent z-10"></div>
                {tournament.image ? <img src={tournament.image} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" /> : <div className="h-full w-full bg-dark-800" />}
                <div className="absolute top-2 right-2 z-20">
                    <Badge color={tournament.status === 'Live' ? 'brand' : 'gray'} className={tournament.status === 'Live' ? 'animate-pulse' : ''}>
                        {tournament.status}
                    </Badge>
                </div>
            </div>
            <div className="p-4 relative z-20 -mt-8">
                <div className="flex items-end gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-dark-800 border border-dark-600 flex items-center justify-center text-xl font-black text-gray-300 shadow-lg group-hover:bg-brand-500 group-hover:text-black transition-colors overflow-hidden p-1">
                        {tournament.logo ? <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-contain" /> : <Trophy className="w-6 h-6" />}
                    </div>
                    <div className="mb-1">
                        <p className="text-[10px] font-bold text-brand-500 uppercase">{tournament.game}</p>
                        <h4 className="text-white font-bold leading-none group-hover:text-brand-400 transition-colors">{tournament.name}</h4>
                    </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-dark-800 pt-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {tournament.dates}</span>
                    <span className="text-brand-400 font-mono">{tournament.prizePool}</span>
                </div>
            </div>
        </div>
    );
};
