import React, { useId } from 'react';
import type { BadgeTier } from './badges';

/**
 * Square achievement artwork inspired by classic PC achievement libraries. Every
 * badge shares the same compact metal frame while its emblem explains the goal.
 * Locked badges keep the full drawing, but use a deliberately colorless palette.
 */

interface TierPaint {
    from: string;
    to: string;
    edge: string;
    innerEdge: string;
    emblem: string;
    accent: string;
}

const ACHIEVEMENT_PAINT: Record<string, TierPaint> = {
    estreante: { from: '#315C50', to: '#142822', edge: '#6F9B88', innerEdge: '#A3C7B7', emblem: '#E6F0E9', accent: '#6FAF8C' },
    primeira_voz: { from: '#354C73', to: '#141D30', edge: '#718EBE', innerEdge: '#A9BCE0', emblem: '#EFF3FA', accent: '#65A6C7' },
    gramatico: { from: '#375E68', to: '#14292D', edge: '#7199A0', innerEdge: '#A4C0C5', emblem: '#E8F0F1', accent: '#76A99D' },
    etiquetador: { from: '#6A465F', to: '#271720', edge: '#A67A93', innerEdge: '#CCA8BC', emblem: '#F3E8EE', accent: '#C1788E' },
    colaborador: { from: '#3A5F7A', to: '#142433', edge: '#739BB5', innerEdge: '#A7C1D1', emblem: '#EAF2F6', accent: '#6594B1' },
    multiverso: { from: '#4D4778', to: '#18172E', edge: '#8680BA', innerEdge: '#B7B0D8', emblem: '#F0EEFA', accent: '#5FA8AC' },
    multifacetado: { from: '#62446F', to: '#24172B', edge: '#9E79AB', innerEdge: '#C9A9D1', emblem: '#F4ECF6', accent: '#8A7EC1' },
    tagarela: { from: '#2F6461', to: '#102927', edge: '#61A19A', innerEdge: '#95C7C0', emblem: '#E9F5F2', accent: '#68B0A2' },
    viral: { from: '#723F48', to: '#2A1418', edge: '#B1707A', innerEdge: '#D3A1A8', emblem: '#FAEAEC', accent: '#C75C67' },
    veterano: { from: '#555D3D', to: '#202417', edge: '#89936A', innerEdge: '#B3BB91', emblem: '#F0F2E5', accent: '#8EA05D' },
    autor: { from: '#4D4A68', to: '#1B1A29', edge: '#807D9E', innerEdge: '#ABA8C3', emblem: '#EFEEF5', accent: '#7C84B4' },
    hall_da_fama: { from: '#75602D', to: '#261D0C', edge: '#B89A4E', innerEdge: '#DAC47E', emblem: '#F6EFD5', accent: '#C5A04A' },
    lexicografo: { from: '#285E57', to: '#0F2824', edge: '#5E958B', innerEdge: '#92BBB4', emblem: '#E7F2F0', accent: '#58A092' },
    lenda: { from: '#593C70', to: '#21152D', edge: '#9368AC', innerEdge: '#C09CCE', emblem: '#F3EAF6', accent: '#8C74C0' },
    pioneiro: { from: '#754C35', to: '#2B1810', edge: '#B27E5E', innerEdge: '#D2A88C', emblem: '#F7ECE5', accent: '#CE7750' },
};

const FALLBACK_PAINT: TierPaint = ACHIEVEMENT_PAINT.estreante;

const LOCKED_PAINT: TierPaint = {
    from: '#252A32',
    to: '#111419',
    edge: '#444B55',
    innerEdge: '#59616C',
    emblem: '#8A929C',
    accent: '#4A515A',
};

/**
 * Emblems. Each is a small scene drawn for that specific achievement — the sprout
 * breaking out of a book for the first term, a prism splitting light for a word that
 * gained a second meaning, and so on.
 */
const EMBLEM: Record<string, React.ReactNode> = {
    // — bronze —
    estreante: ( // broto nascendo de um livro: a primeira palavra
        <>
            <path d="M17 41c9-4 15-4 15 0 0-4 6-4 15 0v6c-9-4-15-4-15 0 0-4-6-4-15 0z" />
            <path d="M31 37V26h2v11z" />
            <path d="M32 30c-6 0-9-3-9-8 6 0 9 3 9 8z" />
            <path d="M32 27c6 0 9-3 9-8-6 0-9 3-9 8z" />
        </>
    ),
    primeira_voz: ( // primeiro balão de fala, com um único pulso
        <>
            <path d="M18 20h28a5 5 0 015 5v13a5 5 0 01-5 5H31l-9 7v-7h-4a5 5 0 01-5-5V25a5 5 0 015-5z" />
            <circle cx="32" cy="31.5" r="3.5" fill="#fff" fillOpacity=".85" />
        </>
    ),
    gramatico: ( // árvore de flexões: uma raiz, várias formas
        <>
            <circle cx="32" cy="45" r="5" />
            <path d="M31 40V31h2v9z" />
            <path d="M19 31h26v2H19z" />
            <path d="M19 32h2v6h-2zM43 32h2v6h-2zM31 24h2v8h-2z" />
            <circle cx="20" cy="21" r="4.5" />
            <circle cx="32" cy="19" r="4.5" />
            <circle cx="44" cy="21" r="4.5" />
        </>
    ),
    etiquetador: ( // etiqueta de tom
        <>
            <path d="M13.6 29.4L29.4 13.6A4 4 0 0132.2 12.4H46a4 4 0 014 4v13.8a4 4 0 01-1.2 2.8L33 48.8a4 4 0 01-5.6 0L13.6 35a4 4 0 010-5.6z" />
            <circle cx="41" cy="23" r="4" fill="#fff" fillOpacity=".8" />
        </>
    ),

    // — prata —
    colaborador: ( // pilha de verbetes
        <>
            <rect x="18" y="17" width="28" height="9" rx="3" opacity=".55" />
            <rect x="15" y="27" width="34" height="9" rx="3" opacity=".8" />
            <rect x="18" y="37" width="28" height="10" rx="3" />
            <path d="M23 41h12v2H23z" fill="#fff" fillOpacity=".55" />
        </>
    ),
    multiverso: ( // mundos em órbita
        <>
            <circle cx="32" cy="33" r="11" />
            <ellipse cx="32" cy="33" rx="22" ry="8.5" fill="none" stroke="currentColor" strokeWidth="2.6" transform="rotate(-22 32 33)" />
            <circle cx="50" cy="24" r="3.6" />
            <circle cx="14" cy="42" r="2.8" />
        </>
    ),
    multifacetado: ( // prisma: uma palavra, várias faces
        <>
            <path d="M20 24L32 11l12 13z" opacity=".75" />
            <path d="M15 25h34L32 53z" />
            <path d="M20 24L32 53M44 24L32 53M15 25h34" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" />
        </>
    ),
    tagarela: ( // conversa: vários balões
        <>
            <path d="M12 18h23a4 4 0 014 4v9a4 4 0 01-4 4H22l-6 5v-5h-4a4 4 0 01-4-4v-9a4 4 0 014-4z" opacity=".6" />
            <path d="M31 30h19a4 4 0 014 4v9a4 4 0 01-4 4h-3l-6 5v-5H31a4 4 0 01-4-4v-9a4 4 0 014-4z" />
            <circle cx="36" cy="38.5" r="2.2" fill="#fff" fillOpacity=".8" />
            <circle cx="43" cy="38.5" r="2.2" fill="#fff" fillOpacity=".8" />
            <circle cx="50" cy="38.5" r="2.2" fill="#fff" fillOpacity=".8" />
        </>
    ),
    viral: ( // chama subindo: o termo pegou
        <>
            <path d="M32 9c6 10 15 15 15 25 0 9-7 16-15 16s-15-7-15-16c0-7 4-11 6-15 1 6 4 8 6 6 1-5 0-11 3-16z" />
            <path d="M32 24l7 9h-4.5v9h-5v-9H25z" fill="#fff" fillOpacity=".75" />
        </>
    ),
    veterano: ( // galões de patente
        <>
            <path d="M32 15l14 14h-7l-7-7-7 7h-7z" />
            <path d="M32 26l14 14h-7l-7-7-7 7h-7z" opacity=".8" />
            <path d="M32 37l14 14h-7l-7-7-7 7h-7z" opacity=".6" />
        </>
    ),

    // — ouro —
    autor: ( // pena de escrever
        <>
            <path d="M49 11C31 14 19 29 17 47c18-3 30-18 32-36z" />
            <path d="M17 47L44 20" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" />
            <path d="M17 47l-5 7" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        </>
    ),
    hall_da_fama: ( // troféu
        <>
            <path d="M22 12h20v11a10 10 0 01-20 0z" />
            <path d="M22 15h-6a7 7 0 007 11zM42 15h6a7 7 0 01-7 11z" />
            <path d="M29.5 33h5v8h-5z" />
            <path d="M23 41h18v5H23z" />
            <path d="M32 15l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff" fillOpacity=".8" />
        </>
    ),

    // — lendário —
    lexicografo: ( // o dicionário coroado
        <>
            <path d="M21 16l4.5 6.5L32 12l6.5 10.5L43 16l-2.5 12h-17z" />
            <path d="M14 36c11-4.5 18-4.5 18 0 0-4.5 7-4.5 18 0v9c-11-4.5-18-4.5-18 0 0-4.5-7-4.5-18 0z" />
        </>
    ),
    lenda: ( // coroa com gemas
        <>
            <path d="M12 24l9 9 11-18 11 18 9-9-4.5 25h-31z" />
            <path d="M16 51h32v4H16z" />
            <circle cx="32" cy="34" r="3" fill="#fff" fillOpacity=".75" />
            <circle cx="22" cy="37" r="2.2" fill="#fff" fillOpacity=".6" />
            <circle cx="42" cy="37" r="2.2" fill="#fff" fillOpacity=".6" />
        </>
    ),
    pioneiro: ( // foguete: chegou primeiro
        <>
            <path d="M32 9c6.5 8.5 8.5 18.5 8.5 27h-17C23.5 27.5 25.5 17.5 32 9z" />
            <circle cx="32" cy="25" r="4.5" fill="#fff" fillOpacity=".8" />
            <path d="M23.5 30L15 43l8.5-2.5zM40.5 30L49 43l-8.5-2.5z" />
            <path d="M27.5 40h9L32 54z" opacity=".75" />
        </>
    ),
};

const LINE_ART = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

/** Original glyph language for the current achievement catalog. */
const ACHIEVEMENT_GLYPH: Record<string, React.ReactNode> = {
    estreante: (
        <g {...LINE_ART}>
            <path d="M13 43V20c7-2 13-.3 19 4 6-4.3 12-6 19-4v23c-7-2-13-.4-19 4-6-4.4-12-6-19-4Z" />
            <path d="M32 24v23M20 29h6M20 35h7M38 29h6M37 35h7" />
            <path d="m32 9 5 6-5 6-5-6 5-6Z" fill="currentColor" stroke="none" />
        </g>
    ),
    primeira_voz: (
        <g {...LINE_ART}>
            <path d="M12 18h40v25H35l-9 8v-8H12Z" />
            <path d="M20 30h10M25 25v10" />
            <circle cx="40" cy="28" r="2.4" fill="currentColor" stroke="none" />
            <circle cx="46" cy="34" r="2.4" fill="currentColor" stroke="none" />
            <path d="M37 36h3" />
        </g>
    ),
    gramatico: (
        <g {...LINE_ART}>
            <path d="M32 48V31M17 31h30M17 31v-7M32 31v-9M47 31v-7" />
            <path d="M11 15h12v9H11ZM26 11h12v11H26ZM41 15h12v9H41Z" />
            <path d="M25 48h14M21 39l11 9 11-9" />
            <circle cx="32" cy="48" r="2.5" fill="currentColor" stroke="none" />
        </g>
    ),
    etiquetador: (
        <g {...LINE_ART}>
            <path d="m13 29 17-17h20v20L33 49Z" />
            <circle cx="41" cy="21" r="3" />
            <path d="M21 32c4-5 8 5 12 0s8 5 12 0M24 40h14" />
        </g>
    ),
    colaborador: (
        <g {...LINE_ART}>
            <path d="M16 18h21v29H16ZM27 13h21v29H37" />
            <path d="M22 27h9M22 33h7M33 25l7 7-7 7M40 32H29" />
            <path d="M42 18v5h5" />
        </g>
    ),
    multiverso: (
        <g {...LINE_ART}>
            <path d="m32 22 9 5v10l-9 5-9-5V27Z" />
            <path d="M32 22V10M41 27l9-6M41 37l5 12M23 37l-5 12M23 27l-9-6" />
            <circle cx="32" cy="9" r="3" fill="currentColor" stroke="none" />
            <circle cx="51" cy="20" r="3" fill="currentColor" stroke="none" />
            <circle cx="47" cy="51" r="3" fill="currentColor" stroke="none" />
            <circle cx="17" cy="51" r="3" fill="currentColor" stroke="none" />
            <circle cx="13" cy="20" r="3" fill="currentColor" stroke="none" />
            <path d="M28 32h8M32 28v8" />
        </g>
    ),
    multifacetado: (
        <g {...LINE_ART}>
            <path d="m32 9 19 14-7 29H20l-7-29Z" />
            <path d="M13 23h38M32 9 20 52M32 9l12 43M13 23l31 29M51 23 20 52" />
            <circle cx="32" cy="33" r="3" fill="currentColor" stroke="none" />
        </g>
    ),
    tagarela: (
        <g {...LINE_ART}>
            <path d="M11 17h33v21H28l-9 8v-8h-8Z" />
            <path d="M31 29h22v18h-7l-7 6v-6h-8" />
            <path d="M18 28h5l3-6 5 12 4-7h4" />
            <circle cx="39" cy="38" r="1.8" fill="currentColor" stroke="none" />
            <circle cx="46" cy="38" r="1.8" fill="currentColor" stroke="none" />
        </g>
    ),
    viral: (
        <g {...LINE_ART}>
            <path d="M32 33 18 20M32 33l17-16M32 33l14 15M32 33 18 47" />
            <circle cx="32" cy="33" r="5" />
            <circle cx="17" cy="19" r="4" fill="currentColor" stroke="none" />
            <circle cx="50" cy="16" r="4" fill="currentColor" stroke="none" />
            <circle cx="47" cy="49" r="4" fill="currentColor" stroke="none" />
            <circle cx="17" cy="48" r="4" fill="currentColor" stroke="none" />
            <path d="M39 16h11v11" />
        </g>
    ),
    veterano: (
        <g {...LINE_ART}>
            <path d="m32 10 18 8v13c0 11-7 18-18 23-11-5-18-12-18-23V18Z" />
            <path d="m21 27 11 8 11-8M24 37l8 6 8-6M28 19h8" />
            <path d="m32 15 2 3-2 3-2-3Z" fill="currentColor" stroke="none" />
        </g>
    ),
    autor: (
        <g {...LINE_ART}>
            <path d="M13 45c8-3 14-3 19 1 5-4 11-4 19-1V20c-8-3-14-2-19 2-5-4-11-5-19-2Z" />
            <path d="M32 22v24" />
            <path d="m45 10 8 8-16 16-8 2 2-8Z" />
            <path d="m45 10-3 13 11-5M31 28l6 6" />
        </g>
    ),
    hall_da_fama: (
        <g {...LINE_ART}>
            <path d="M14 52h36M18 48V27c0-10 6-16 14-16s14 6 14 16v21" />
            <path d="M24 48V32h16v16" />
            <path d="m32 17 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z" />
            <path d="M13 39c4-1 7-4 8-8M51 39c-4-1-7-4-8-8" />
        </g>
    ),
    lexicografo: (
        <g {...LINE_ART}>
            <path d="M13 13h18v39H13ZM33 13h18v39H33ZM31 13h2v39h-2Z" />
            <path d="M18 22h8M18 28h8M18 34h8" />
            <path d="M42 40V28M37 28h10M37 28v-6M47 28v-6" />
            <circle cx="37" cy="19" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="47" cy="19" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="42" cy="42" r="2.5" fill="currentColor" stroke="none" />
            <path d="m32 7 4 3-4 3-4-3Z" fill="currentColor" stroke="none" />
        </g>
    ),
    lenda: (
        <g {...LINE_ART}>
            <circle cx="32" cy="31" r="13" />
            <path d="M19 23 9 19l5 10-5 8 11-2M45 23l10-4-5 10 5 8-11-2" />
            <path d="m32 9 6 9-6 7-6-7Z" />
            <path d="M32 25v22M25 47h14M26 31l6 6 6-6" />
            <circle cx="32" cy="31" r="2.5" fill="currentColor" stroke="none" />
        </g>
    ),
    pioneiro: (
        <g {...LINE_ART}>
            <path d="m32 9 10 18-10 25-10-25Z" />
            <path d="M32 9v43M22 27h20" />
            <path d="M12 51c8-5 13-6 20-2 7-4 12-3 20 2" />
            <path d="m17 15 5 2-3 4M47 15l-5 2 3 4" />
            <circle cx="32" cy="27" r="3" fill="currentColor" stroke="none" />
        </g>
    ),
};

interface BadgeArtProps {
    id: string;
    tier: BadgeTier;
    earned: boolean;
    size?: number;
    className?: string;
}

export const BadgeArt: React.FC<BadgeArtProps> = ({ id, tier: _tier, earned, size = 48, className = '' }) => {
    const uid = useId().replace(/:/g, '');
    const paint = earned ? ACHIEVEMENT_PAINT[id] || FALLBACK_PAINT : LOCKED_PAINT;
    const emblem = ACHIEVEMENT_GLYPH[id] || EMBLEM[id];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            className={className}
            role="presentation"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={paint.from} />
                    <stop offset="100%" stopColor={paint.to} />
                </linearGradient>
                <radialGradient id={`halo-${uid}`} cx="34%" cy="26%" r="74%">
                    <stop offset="0%" stopColor={paint.accent} stopOpacity={earned ? 0.3 : 0.06} />
                    <stop offset="100%" stopColor={paint.accent} stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`frame-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8EDF2" stopOpacity={earned ? 0.65 : 0.24} />
                    <stop offset="18%" stopColor="#69717B" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#11151B" />
                </linearGradient>
                <pattern id={`hatch-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <path d="M0 0V8" stroke={paint.accent} strokeWidth="1" opacity={earned ? 0.09 : 0.04} />
                </pattern>
                <clipPath id={`face-${uid}`}>
                    <rect x="6" y="6" width="52" height="52" rx="1" />
                </clipPath>
                <filter id={`shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.8" />
                </filter>
            </defs>

            <rect x="1" y="1" width="62" height="62" rx="3" fill="#07090D" stroke="#111722" strokeWidth="2" />
            <rect x="3" y="3" width="58" height="58" rx="2" fill={`url(#frame-${uid})`} />
            <rect x="5" y="5" width="54" height="54" rx="1" fill={`url(#bg-${uid})`} stroke={paint.edge} strokeWidth="1.5" />

            <g clipPath={`url(#face-${uid})`}>
                <rect x="6" y="6" width="52" height="52" fill={`url(#halo-${uid})`} />
                <rect x="6" y="6" width="52" height="52" fill={`url(#hatch-${uid})`} />
                <path d="M6 50L35 6H55L22 58H6Z" fill="#fff" opacity={earned ? 0.035 : 0.015} />
                <path d="M6 55H58V58H6Z" fill={paint.accent} opacity={earned ? 0.45 : 0.14} />
            </g>

            <rect x="7.5" y="7.5" width="49" height="49" fill="none" stroke={paint.innerEdge} strokeWidth="1" opacity={earned ? 0.45 : 0.22} />

            <g
                transform="translate(32 32) scale(0.78) translate(-32 -32)"
                fill={paint.emblem}
                color={paint.emblem}
                opacity={earned ? 0.96 : 0.48}
                filter={`url(#shadow-${uid})`}
            >
                {emblem}
            </g>

            <path d="M5 5H59V8H8V56H5Z" fill="#fff" opacity={earned ? 0.12 : 0.035} />
            <rect x="1" y="1" width="62" height="62" rx="3" fill="none" stroke={paint.edge} strokeWidth="1" opacity={earned ? 0.64 : 0.28} />
        </svg>
    );
};
