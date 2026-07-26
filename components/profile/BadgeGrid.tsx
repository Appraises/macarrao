import React from 'react';
import { BADGE_CATALOG, TIER_LABEL } from '../badges';
import { BadgeArt } from '../BadgeArt';

export interface EarnedBadge {
    badgeId: string;
    earnedAt: string;
}

/**
 * The full badge catalog — earned ones in their tier colors, locked ones drained of
 * color. Showing what's still locked is the point: it turns the profile into a board
 * of goals instead of a trophy shelf.
 */
export const BadgeGrid: React.FC<{ earned: EarnedBadge[]; emptyHint?: string }> = ({ earned, emptyHint }) => {
    const earnedMap = new Map<string, string>(earned.map((b) => [b.badgeId, b.earnedAt]));
    const earnedCount = BADGE_CATALOG.filter((b) => earnedMap.has(b.id)).length;

    return (
        <div className="rounded-xl border border-dark-700 bg-dark-900 p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Insígnias</h3>
                <span className="rounded bg-dark-800 px-2 py-0.5 text-xs font-bold text-white">
                    {earnedCount}/{BADGE_CATALOG.length}
                </span>
            </div>

            {earnedCount === 0 && emptyHint && (
                <p className="mb-5 text-xs leading-relaxed text-gray-500">{emptyHint}</p>
            )}

            <div className="grid grid-cols-5 gap-1.5">
                {BADGE_CATALOG.map((badge) => {
                    const earnedAt = earnedMap.get(badge.id);
                    const isEarned = Boolean(earnedAt);
                    const when = earnedAt
                        ? new Date(earnedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : null;

                    return (
                        <div
                            key={badge.id}
                            tabIndex={0}
                            role="img"
                            aria-label={isEarned
                                ? `${badge.name}, ${TIER_LABEL[badge.tier]}. ${badge.description}${when ? ` Conquistada em ${when}.` : ''}`
                                : `${badge.name}, bloqueada. ${badge.description}`}
                            title={isEarned
                                ? `${badge.name} (${TIER_LABEL[badge.tier]}) — ${badge.description}${when ? `\nConquistada em ${when}` : ''}`
                                : `Bloqueada — ${badge.description}`}
                            className="group grid min-w-0 place-items-center rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900"
                        >
                            <BadgeArt
                                id={badge.id}
                                tier={badge.tier}
                                earned={isEarned}
                                size={56}
                                className={`h-auto w-full max-w-14 transition duration-200 group-hover:-translate-y-0.5 ${
                                    isEarned ? 'drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)]' : 'opacity-60 grayscale'
                                }`}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
