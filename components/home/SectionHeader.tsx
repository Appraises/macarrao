import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Flat section header used across the home page (mirrors the pattern already
 * used on tournament pages): brand accent bar + uppercase label, with an
 * optional "see all" link and extra actions on the right.
 */
interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    to?: string;
    linkLabel?: string;
    live?: boolean;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, to, linkLabel, live, icon, actions }) => (
    <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-brand-500 rounded-sm flex-shrink-0"></span>
                {icon}
                <h2 className="text-xs font-bold text-white uppercase tracking-[0.2em] truncate">{title}</h2>
                {live && (
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-1 pl-3">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
            {to && (
                <Link
                    to={to}
                    className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-brand-400 transition-colors flex items-center gap-0.5"
                >
                    {linkLabel || 'Ver tudo'} <ChevronRight className="w-3 h-3" />
                </Link>
            )}
        </div>
    </div>
);
