import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Gamepad2, PlusCircle } from 'lucide-react';
import type { CatalogMeta } from '../../types';

interface StatsBannerProps {
    meta: CatalogMeta | null;
}

const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString('pt-BR') : '—');

export const StatsBanner: React.FC<StatsBannerProps> = ({ meta }) => {
    const stats = [
        { icon: BookOpen, value: meta?.total, label: 'Termos definidos' },
        { icon: Users, value: meta?.contributors, label: 'Contribuidores' },
        { icon: Gamepad2, value: meta ? meta.games.length : undefined, label: 'Jogos' },
    ];

    return (
        <div className="rounded-xl border border-brand-500/20 bg-gradient-to-r from-brand-900/25 via-dark-900 to-dark-900 p-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-3 gap-3 sm:gap-8">
                {stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} className="flex items-center gap-3">
                        <div className="hidden sm:grid h-10 w-10 flex-none place-items-center rounded-lg bg-brand-500/10 text-brand-400">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl sm:text-2xl font-black text-white leading-none tabular-nums">{fmt(value)}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide mt-1 truncate">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:flex-none">
                <span className="hidden lg:block text-xs text-gray-400 max-w-[180px] leading-snug">
                    Feito pela comunidade. Falta uma gíria? Ajuda a completar.
                </span>
                <Link
                    to="/contribuir"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(14,165,233,0.25)] transition-all hover:bg-brand-400 hover:shadow-[0_0_28px_rgba(14,165,233,0.4)]"
                >
                    <PlusCircle className="h-4 w-4" /> Contribuir
                </Link>
            </div>
        </div>
    );
};
