import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Hash } from 'lucide-react';
import { searchTerms } from '../../src/services/api';

const FLOATING_WORDS = [
    "GG", "WP", "GL", "HF", "NOOB", "FEEDER", "TANK", "HEALER", "DPS", "CARRY", "RUSH", "B", "PLANT",
    "DEFUSE", "ACE", "CLUTCH", "TILT", "SMURF", "GANK", "JUNGLE", "ROAM", "DIVE", "INVADE", "PEEL",
    "KITE", "NERF", "BUFF", "PATCH", "META", "BUILD", "XP", "LOOT", "DROP", "RANKED", "ELO", "MMR",
    "LADDER", "BRONZE", "RADIANT", "CHALLENGER", "AGGRO", "AOE", "BOT", "CC", "COOLDOWN", "FARM",
    "INT", "KS", "LAG", "PING", "POG", "REKT", "RNG", "SPAWN", "STUN", "WIPE", "AFK", "BR", "OP",
    "VAC", "EZ", "BAIT", "THROW", "SCRIM", "BOOTCAMP", "DRAFT", "PICK", "BAN", "MAIN", "ALT", "TWINK"
];

const QUICK_CATEGORIES = [
    "FPS", "MOBA", "RPG", "Estratégia", "Gírias", "Economia", "Técnico"
];

export const HeroSection: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<{ id: string, word: string, definition: string, tags: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/term/${encodeURIComponent(searchTerm.trim())}`);
            setShowSuggestions(false);
        }
    };

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim().length >= 2) {
                try {
                    const results = await searchTerms(searchTerm);
                    setSuggestions(results);
                    setShowSuggestions(true);
                } catch (error) {
                    console.error("Search error", error);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Generate random floating words for background
    const wordElements = useMemo(() => {
        return [...FLOATING_WORDS, ...FLOATING_WORDS, ...FLOATING_WORDS].map((word, i) => {
            const seed = i * 123.45;
            const type = Math.floor(seed % 6);

            let animationClass = '';
            let style: React.CSSProperties = {
                position: 'absolute',
                opacity: 0.3 + ((seed % 10) / 100),
                fontSize: `${1.5 + (seed % 4)}rem`,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                color: '#0369a1',
                WebkitTextStroke: '1px rgba(14, 165, 233, 0.2)',
                animationDelay: `-${seed % 60}s`,
                zIndex: 0,
                userSelect: 'none',
                textTransform: 'uppercase',
            };

            if (i % 3 === 0) {
                style.color = '#0ea5e9';
                style.opacity = 0.4;
                style.textShadow = '0 0 20px rgba(14, 165, 233, 0.4)';
            }

            if (type === 0 || type === 1) {
                animationClass = type === 0 ? 'animate-pass-right' : 'animate-pass-left';
                style.top = `${seed % 95}%`;
            } else if (type === 2 || type === 3) {
                animationClass = type === 2 ? 'animate-pass-down' : 'animate-pass-up';
                style.left = `${seed % 95}%`;
            } else {
                animationClass = type === 4 ? 'animate-pass-diagonal-1' : 'animate-pass-diagonal-2';
                style.top = `${seed % 80}%`;
                style.left = `${seed % 80}%`;
            }

            return (
                <div key={i} className={`${animationClass} pointer-events-none font-sans tracking-tighter`} style={style}>
                    {word}
                </div>
            );
        });
    }, []);

    return (
        <section className="relative pt-28 pb-16 flex flex-col items-center px-4 overflow-hidden border-b border-dark-800/50 bg-dark-950 min-h-[550px] justify-center">
            {/* Animated Background Words Cloud */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
                {wordElements}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-dark-950 via-dark-950/20 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-dark-950/10 z-10"></div>
            </div>

            <div className="relative z-20 w-full max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900/80 border border-dark-700 backdrop-blur-md mb-6 shadow-lg hover:border-brand-500/50 transition-colors cursor-default">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                    <span className="text-xs font-medium text-gray-300">O Dicionário da Comunidade</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8 leading-tight drop-shadow-2xl">
                    Entenda a língua <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">dos jogos.</span>
                </h1>

                <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto relative group mb-8">
                    <div className="relative flex items-center bg-dark-900/90 backdrop-blur-xl border border-dark-700 rounded-2xl shadow-2xl shadow-brand-900/10 group-focus-within:border-brand-500 group-focus-within:ring-1 group-focus-within:ring-brand-500 transition-all duration-300 transform group-focus-within:scale-[1.02]">
                        <div className="pl-6">
                            <Search className="h-6 w-6 text-gray-500 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Busque um termo (ex: Gank, Tilt, Nerf...)"
                            className="w-full bg-transparent border-none focus:outline-none focus:ring-0 px-4 py-5 text-lg text-white placeholder-gray-500 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" className="mr-3 p-3 bg-dark-800 hover:bg-brand-500 hover:text-white rounded-xl text-gray-400 transition-all flex-shrink-0">
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            {suggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    onClick={() => {
                                        navigate(`/term/${encodeURIComponent(suggestion.word)}`);
                                        setShowSuggestions(false);
                                    }}
                                    className="px-6 py-3 hover:bg-dark-800 cursor-pointer flex items-center justify-between group transition-colors border-b border-dark-800/50 last:border-0"
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <Search className="w-4 h-4 text-gray-600 group-hover:text-brand-500 transition-colors" />
                                            <span className="text-gray-200 font-medium group-hover:text-white transition-colors">
                                                {suggestion.word}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 pl-7 line-clamp-1 max-w-[300px] overflow-hidden text-ellipsis">
                                            {suggestion.definition}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-600 bg-dark-950 px-2 py-1 rounded border border-dark-800 group-hover:border-brand-500/30 transition-colors flex-shrink-0 ml-4">
                                        Termo
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                {/* Quick Categories */}
                <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    {QUICK_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => navigate(`/games`)}
                            className="px-3 py-1.5 rounded-full bg-dark-800/50 border border-dark-700 text-xs font-medium text-gray-400 hover:text-brand-400 hover:border-brand-500/30 transition-all flex items-center gap-1.5"
                        >
                            <Hash className="w-3 h-3" />
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
};
