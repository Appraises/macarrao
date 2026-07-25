import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, PlusCircle } from 'lucide-react';
import { getLeaderboard } from '../../src/services/api';
import type { LeaderboardEntry } from '../../types';
import { SectionHeader } from './SectionHeader';
import { Avatar } from '../Avatar';

const rankNumberColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-600';
};

const ringColor = (rank: number) => {
    if (rank === 1) return 'ring-yellow-400/60';
    if (rank === 2) return 'ring-gray-300/50';
    if (rank === 3) return 'ring-orange-400/50';
    return 'ring-white/5';
};

export const TopContributorsWidget: React.FC = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLeaderboard()
            .then((data) => setEntries(Array.isArray(data) ? data : []))
            .catch(() => { /* keep empty */ })
            .finally(() => setLoading(false));
    }, []);

    return (
        <section>
            <SectionHeader
                title="Top Contribuidores"
                subtitle="Quem mais define termos"
                icon={<Trophy className="w-4 h-4 text-brand-500" />}
            />

            <div className="bg-dark-900/60 border border-white/5 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-dark-800/60">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-full bg-dark-800 animate-pulse" />
                                <div className="h-3 flex-1 rounded bg-dark-800 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : entries.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-sm text-gray-400">Ainda não há contribuidores.</p>
                        <Link to="/contribuir" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">
                            <PlusCircle className="w-3.5 h-3.5" /> Seja o primeiro
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-dark-800/60">
                        {entries.map((entry, idx) => {
                            const rank = idx + 1;
                            return (
                                <Link key={entry.id} to={`/u/${entry.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-dark-800/50 transition-colors">
                                    <span className={`w-4 text-center font-mono font-black text-sm flex-shrink-0 ${rankNumberColor(rank)}`}>
                                        {rank}
                                    </span>
                                    <Avatar
                                        name={entry.name}
                                        src={entry.avatar}
                                        size={32}
                                        className={`ring-2 flex-shrink-0 ${ringColor(rank)}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold text-gray-200">{entry.name}</span>
                                        <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Nível {entry.level}</span>
                                    </div>
                                    <span className="flex-shrink-0 text-right">
                                        <span className="block text-sm font-black text-white tabular-nums">{entry.terms}</span>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-wide">termos</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};
