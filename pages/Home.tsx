import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Badge, Button } from '../components/UI';
import { getTrendingTerms, getGames } from '../src/services/api';
import { Term, Game } from '../types';

// Sub-components
import { HeroSection } from '../components/home/HeroSection';
import { MatchesCarousel } from '../components/home/MatchesCarousel';
import { GamesCarousel } from '../components/home/GamesCarousel';
import { NewsWidget } from '../components/home/NewsWidget';
import { TrendingWidget } from '../components/home/TrendingWidget';

// Term of the Day (Manual Mock)
const TERM_OF_THE_DAY: Term = {
    id: 'mock-term-day',
    word: 'Tank',
    definition: 'Personagem robusto projetado para absorver dano e proteger os aliados. Geralmente possui alta vida e defesa.',
    examples: ['O Tank iniciou a luta e segurou o aggro do boss.', 'Precisamos de um Tank para proteger o time.'],
    tags: ['Classe', 'RPG', 'MOBA'],
    phonetic: '/taŋk/',
    pronunciationGuide: 'Tan-que',
    relatedTerms: ['Healer', 'DPS', 'Aggro'],
    gameId: null,
    upvotes: 420,
    downvotes: 0,
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const [terms, setTerms] = useState<Term[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [termsData, gamesData] = await Promise.all([
                    getTrendingTerms(),
                    getGames()
                ]);
                setTerms(termsData);
                setGames(gamesData);
            } catch (error) {
                console.error("Failed to fetch home data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="w-full pb-20">
            <HeroSection />

            {/* Main Grid Layout */}
            <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* LEFT COLUMN (Main Content) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* WORD OF THE DAY */}
                    <div className="bg-gradient-to-br from-brand-900/20 to-dark-900 border border-brand-500/20 rounded-xl p-6 relative overflow-hidden group hover:border-brand-500/40 transition-all shadow-glow-brand">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Sparkles className="w-32 h-32 text-brand-500" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge color="brand">Termo do Dia</Badge>
                                    <span className="text-xs text-brand-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</span>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">{TERM_OF_THE_DAY.word}</h2>
                                <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">{TERM_OF_THE_DAY.definition}</p>
                                <Button variant="outline" onClick={() => navigate(`/term/${TERM_OF_THE_DAY.word}`)} className="text-xs h-9">
                                    Ler definição completa
                                </Button>
                            </div>
                            <div className="w-full md:w-px h-px md:h-24 bg-brand-500/20"></div>
                            <div className="md:w-1/3 w-full">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Você sabia?</p>
                                <div className="bg-dark-950/50 rounded-lg p-3 border border-dark-800 text-xs text-gray-400 italic">
                                    "{TERM_OF_THE_DAY.examples && TERM_OF_THE_DAY.examples[0]}"
                                </div>
                            </div>
                        </div>
                    </div>

                    <MatchesCarousel />
                    <GamesCarousel games={games} />
                </div>

                {/* RIGHT COLUMN (Sidebar) */}
                <div className="lg:col-span-4">
                    <div className="sticky top-24 space-y-4">
                        <NewsWidget />
                        <TrendingWidget terms={terms} />
                    </div>
                </div>
            </div>
        </div>
    );
};