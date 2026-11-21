import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BracketMatch } from '../../types';
import { TeamCrest } from './TeamCrest';

/**
 * Deterministic bracket layout engine + readonly bracket view.
 *
 * Geometry: every match of a round lives in a fixed-height "slot". The first
 * round uses `baseSlot` px per match; later rounds scale their slot so every
 * column has the same total height (slot(r) = H / count(r)). Cards are
 * vertically centered inside their slot, so a match's center is always at
 * (i + 0.5) * slot — which lets connectors be drawn at exact pixel positions:
 *
 *   - 2:1 rounds get elbow connectors (two stubs -> vertical join -> out stub)
 *   - 1:1 rounds get a straight line
 *   - irregular ratios degrade to simple out-stubs
 */

const CONNECT_W = 48; // px between round columns (where connectors live)
const TITLE_H = 28;   // px reserved for the round title row
const ROUND_LABELS: Record<string, string> = {
    quarterfinals: 'Quartas de final', quarterfinal: 'Quartas de final',
    semifinals: 'Semifinais', semifinal: 'Semifinais',
    'grand final': 'Grande final', final: 'Final',
};
const roundLabel = (name: string) => ROUND_LABELS[name.trim().toLowerCase()] || name;

// ---------------------------------------------------------------------------
// Generic grid (also used by the Pick'em tab)
// ---------------------------------------------------------------------------

interface BracketGridProps<T> {
    rounds: [string, T[]][];
    renderMatch: (item: T) => React.ReactNode;
    /** px of vertical space reserved per first-round match */
    baseSlot?: number;
}

export function BracketGrid<T>({ rounds, renderMatch, baseSlot = 136 }: BracketGridProps<T>) {
    const nonEmpty = rounds.filter(([, ms]) => ms.length > 0);
    if (nonEmpty.length === 0) return null;

    const counts = nonEmpty.map(([, ms]) => ms.length);
    const H = counts[0] * baseSlot;
    const slots = counts.map((c) => H / c);

    return (
        <div className="flex min-w-max">
            {nonEmpty.map(([name, matches], idx) => {
                const slot = slots[idx];
                const isLast = idx === nonEmpty.length - 1;
                return (
                    <React.Fragment key={`${name}-${idx}`}>
                        <div className="flex flex-col">
                            <span style={{ height: TITLE_H }} className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">
                                {roundLabel(name)}
                            </span>
                            <div style={{ height: H }} className="flex flex-col">
                                {matches.map((m, i) => (
                                    <div
                                        key={i}
                                        style={{ height: slot }}
                                        className="flex flex-col justify-center"
                                        {...(isLast ? { 'data-blast': '1' } : {})}
                                    >
                                        {renderMatch(m)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {!isLast && (
                            <Connectors
                                height={H}
                                slotFrom={slots[idx]}
                                slotTo={slots[idx + 1]}
                                from={counts[idx]}
                                to={counts[idx + 1]}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

const Line: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div className="absolute bg-dark-700" style={style} />
);

const Connectors: React.FC<{
    height: number;
    slotFrom: number;
    slotTo: number;
    from: number;
    to: number;
}> = ({ height, slotFrom, slotTo, from, to }) => {
    const half = CONNECT_W / 2;
    const els: React.ReactNode[] = [];

    if (to > 0 && from === to * 2) {
        // Classic elbow: two feeders join into one match of the next round.
        for (let j = 0; j < to; j++) {
            const y1 = (2 * j + 0.5) * slotFrom; // center of top feeder
            const y2 = (2 * j + 1.5) * slotFrom; // center of bottom feeder
            const ym = (j + 0.5) * slotTo;       // center of the target match (== midpoint)
            els.push(
                <React.Fragment key={j}>
                    <Line style={{ left: 0, top: y1, width: half, height: 1 }} />
                    <Line style={{ left: 0, top: y2, width: half, height: 1 }} />
                    <Line style={{ left: half, top: y1, width: 1, height: y2 - y1 + 1 }} />
                    <Line style={{ left: half, top: ym, width: half, height: 1 }} />
                </React.Fragment>
            );
        }
    } else if (from === to) {
        // 1:1 progression — straight line across.
        for (let i = 0; i < from; i++) {
            const y = (i + 0.5) * slotFrom;
            els.push(<Line key={i} style={{ left: 0, top: y, width: CONNECT_W, height: 1 }} />);
        }
    } else {
        // Irregular ratio — degrade gracefully to short out-stubs.
        for (let i = 0; i < from; i++) {
            const y = (i + 0.5) * slotFrom;
            els.push(<Line key={i} style={{ left: 0, top: y, width: half, height: 1 }} />);
        }
    }

    return (
        <div style={{ height, width: CONNECT_W, marginTop: TITLE_H }} className="relative shrink-0">
            {els}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Double-elimination wrapper: upper + lower sections, plus the cross-link
// line from the Lower Final into the Grand Final.
// ---------------------------------------------------------------------------

interface DoubleElimProps<T> {
    upperRounds: [string, T[]][];
    lowerRounds: [string, T[]][];
    renderMatch: (item: T) => React.ReactNode;
    baseSlot?: number;
}

type Seg = { x1: number; y1: number; x2: number; y2: number };

export function DoubleElimBracket<T>({ upperRounds, lowerRounds, renderMatch, baseSlot }: DoubleElimProps<T>) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [segs, setSegs] = useState<Seg[]>([]);

    const hasUpper = upperRounds.some(([, ms]) => ms.length > 0);
    const hasLower = lowerRounds.some(([, ms]) => ms.length > 0);

    // When both brackets exist and the upper section ends in a single match
    // (the Grand Final), pull it out into its own column, vertically centered
    // between the two sections — both finals connect into it.
    const canExtractFinal =
        hasUpper && hasLower && upperRounds.length > 1 &&
        upperRounds[upperRounds.length - 1][1].length === 1;
    const finalRound = canExtractFinal ? upperRounds[upperRounds.length - 1] : null;
    const restUpper = canExtractFinal ? upperRounds.slice(0, -1) : upperRounds;

    // Measure the finals and compute the connector segments.
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap || !hasUpper || !hasLower) { setSegs([]); return; }

        const measure = () => {
            const w = wrap.getBoundingClientRect();
            const rect = (el: Element) => {
                const r = el.getBoundingClientRect();
                return { left: r.left - w.left, right: r.right - w.left, cy: r.top + r.height / 2 - w.top };
            };
            const one = (sel: string) => {
                const els = wrap.querySelectorAll(sel);
                return els.length === 1 ? rect(els[0]) : null;
            };

            const next: Seg[] = [];
            const lbf = one('[data-bsec="lower"] [data-blast="1"]');
            const ubf = one('[data-bsec="upper"] [data-blast="1"]');

            if (finalRound) {
                // GF in its own centered column: UB final and LB final converge
                // on a shared lane, then enter the GF at its center.
                const gf = one('[data-bsec="final"] [data-blast="1"]');
                if (gf && ubf && lbf && gf.left - CONNECT_W / 2 > Math.max(ubf.right, lbf.right) + 4) {
                    const lane = gf.left - CONNECT_W / 2;
                    next.push(
                        { x1: ubf.right, y1: ubf.cy, x2: lane, y2: ubf.cy },   // UB final out
                        { x1: lbf.right, y1: lbf.cy, x2: lane, y2: lbf.cy },   // LB final out
                        { x1: lane, y1: ubf.cy, x2: lane, y2: lbf.cy },        // shared lane
                        { x1: lane, y1: gf.cy, x2: gf.left, y2: gf.cy },       // into the GF
                    );
                }
            } else if (ubf && lbf) {
                // GF still inside the upper grid: route the LB final up the lane
                // the upper connector already uses to enter it.
                const lane = ubf.left - CONNECT_W / 2;
                if (lane > lbf.right + 4) {
                    next.push(
                        { x1: lbf.right, y1: lbf.cy, x2: lane, y2: lbf.cy },
                        { x1: lane, y1: lbf.cy, x2: lane, y2: ubf.cy },
                    );
                }
            }

            setSegs((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        };

        measure();
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(measure);
            ro.observe(wrap);
            return () => ro.disconnect();
        }
    }, [hasUpper, hasLower, finalRound, upperRounds, lowerRounds]);

    return (
        <div ref={wrapRef} className="relative min-w-max flex items-stretch">
            <div className="space-y-10">
                {hasUpper && (
                    <div data-bsec="upper">
                        {hasLower && (
                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                                Chave superior
                            </span>
                        )}
                        <BracketGrid rounds={restUpper} renderMatch={renderMatch} baseSlot={baseSlot} />
                    </div>
                )}
                {hasLower && (
                    <div data-bsec="lower" className="pt-8 border-t border-dark-800">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                            Chave inferior
                        </span>
                        <BracketGrid rounds={lowerRounds} renderMatch={renderMatch} baseSlot={baseSlot} />
                    </div>
                )}
            </div>
            {finalRound && (
                <div data-bsec="final" className="flex flex-col" style={{ marginLeft: CONNECT_W }}>
                    <span style={{ height: TITLE_H }} className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">
                        {roundLabel(finalRound[0])}
                    </span>
                    <div className="flex-1 flex flex-col justify-center" data-blast="1">
                        {renderMatch(finalRound[1][0])}
                    </div>
                </div>
            )}
            {segs.length > 0 && (
                <svg className="absolute left-0 top-0 w-full h-full pointer-events-none" aria-hidden="true">
                    {segs.map((s, i) => (
                        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#334155" strokeWidth="1" />
                    ))}
                </svg>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Readonly bracket view (Overview tab)
// ---------------------------------------------------------------------------

interface BracketViewProps {
    bracket: BracketMatch[];
}

// Canonical progression used to sort round columns left-to-right.
const ROUND_ORDER = [
    'round of 64', 'round of 32', 'round of 16', 'octafinals',
    'quarterfinals', 'quarterfinal', 'upper semifinals', 'semifinals', 'semifinal',
    'upper final', 'winners final',
    'lower round 1', 'lower round 2', 'lower round 3', 'lower semifinal', 'lower final', 'losers final',
    'grand final', 'final',
];

const roundRank = (name: string) => {
    const idx = ROUND_ORDER.indexOf(name.trim().toLowerCase());
    return idx === -1 ? ROUND_ORDER.length : idx;
};

const isLowerRound = (round: string, matchId?: string) =>
    /lower|loser/i.test(round) || /^l/i.test(matchId || '');

function groupRounds(matches: BracketMatch[]): [string, BracketMatch[]][] {
    const groups = new Map<string, BracketMatch[]>();
    for (const m of matches) {
        const key = m.round || 'Bracket';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
    }
    return Array.from(groups.entries()).sort((a, b) => roundRank(a[0]) - roundRank(b[0]));
}

const TeamRow: React.FC<{
    team: BracketMatch['teamA'];
    finished: boolean;
}> = ({ team, finished }) => {
    const pending = !team.name || /^(?:tbd$|a definir$|vencedor)/i.test(team.name);
    const name = !team.name || team.name === 'TBD' ? 'A definir' : team.name;
    const won = !!team.isWinner;
    const lost = finished && !won && !pending;
    return (
        <div className={`flex justify-between items-center gap-2 px-3 h-9 ${won ? 'bg-brand-500/10' : ''}`}>
            <div className="flex items-center gap-2 min-w-0">
                <TeamCrest logo={team.logo} pending={pending} />
                <span title={name} className={`text-xs ${pending ? 'font-medium text-gray-400' : `truncate font-bold ${won ? 'text-white' : lost ? 'text-gray-400' : 'text-gray-300'}`}`}>
                    {name}
                </span>
            </div>
            <span className={`text-xs font-mono font-bold flex-shrink-0 ${won ? 'text-brand-400' : 'text-gray-500'}`}>
                {team.score ?? '–'}
            </span>
        </div>
    );
};

const bracketTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

const MatchCard: React.FC<{ match: BracketMatch }> = ({ match }) => {
    const finished = match.status === 'Finished';
    const live = match.status === 'Live';
    const date = Date.parse(match.date || '');
    const card = (
        <div className={`w-56 overflow-hidden rounded-md border bg-dark-950 ${live ? 'border-red-500/50' : 'border-dark-700'}`}>
            <div className="divide-y divide-dark-800">
                <TeamRow team={match.teamA} finished={finished} />
                <TeamRow team={match.teamB} finished={finished} />
            </div>
            <div className="flex justify-between items-center px-3 h-6 bg-dark-900 border-t border-dark-800">
                {live ? (
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Ao vivo
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-gray-400">
                        {finished ? 'Encerrado' : 'Agendado'}
                    </span>
                )}
                {match.date && <time dateTime={Number.isFinite(date) ? new Date(date).toISOString() : undefined} className="font-mono text-[10px] text-gray-400">{Number.isFinite(date) ? bracketTime.format(date) : match.date}</time>}
            </div>
        </div>
    );
    return match.matchId ? <Link to={`/esports/match/${match.matchId}`} className="block rounded-md hover:ring-1 hover:ring-brand-400 focus-visible:outline-brand-400">{card}</Link> : card;
};

export const BracketView: React.FC<BracketViewProps> = ({ bracket }) => {
    if (!bracket || bracket.length === 0) return null;

    const upper = bracket.filter((m) => !isLowerRound(m.round, m.matchKey));
    const lower = bracket.filter((m) => isLowerRound(m.round, m.matchKey));

    return (
        <div role="region" aria-label="Rodadas do chaveamento" tabIndex={0} className="overflow-x-auto rounded-md border border-dark-800 bg-dark-900 p-3 focus-visible:outline-brand-400 sm:p-5">
            <DoubleElimBracket
                upperRounds={groupRounds(upper)}
                lowerRounds={groupRounds(lower)}
                renderMatch={(m) => <MatchCard match={m} />}
            />
        </div>
    );
};
