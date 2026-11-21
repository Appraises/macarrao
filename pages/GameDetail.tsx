
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import { getGameBySlug, getTerms, getMaps } from '../src/services/api';
import { Game, Term, GameMap } from '../types';
import { ArrowLeft, Map as MapIcon, Book, Search } from 'lucide-react';
import { Input, Button, Badge } from '../components/UI';
import { CatalogTermCard } from '../components/CatalogTermCard';
import { MapViewer } from '../components/game/MapViewer';
import { Seo } from '../components/Seo';
import { JsonLd, breadcrumbSchema, gameGlossarySchema } from '../components/JsonLd';
import { PaginationControls } from '../components/PaginationControls';
import { usePaginatedListQuery } from '../src/hooks/usePaginatedListQuery';
import type { PaginationMeta } from '../types';

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
};

const PAGE_SIZE = 12;

interface GameLoaderData {
    game: Game | null;
    /** Every approved term of the game, A-Z, for the prerendered glossary. */
    terms: Term[];
}

// Runs at build time (prerender) and on client navigation, so the game, its
// first page of cards and the full A-Z index of term links are in the HTML.
export async function gameLoader({ params }: LoaderFunctionArgs): Promise<GameLoaderData> {
    const slug = params.slug;
    if (!slug) return { game: null, terms: [] };
    try {
        const game: Game | null = await getGameBySlug(slug);
        if (!game) return { game: null, terms: [] };
        const terms: Term[] = [];
        for (let page = 1; page <= 10; page++) {
            const result = await getTerms({ gameId: game.id, page, pageSize: 100, sort: 'word', order: 'asc' });
            terms.push(...result.items);
            if (!result.pagination.hasNext) break;
        }
        return { game, terms };
    } catch {
        return { game: null, terms: [] };
    }
}

const firstPage = (terms: Term[]): PaginationMeta => ({
    ...EMPTY_PAGINATION,
    total: terms.length,
    totalPages: Math.ceil(terms.length / PAGE_SIZE),
    hasNext: terms.length > PAGE_SIZE,
});

// Group term links by initial for the A-Z index ("#" for digits and symbols).
const initialOf = (word: string) => {
    const letter = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();
    return /[A-Z]/.test(letter) ? letter : '#';
};

export const GameDetail: React.FC = () => {
    const loaded = useLoaderData() as GameLoaderData | null;
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'glossary' | 'maps'>('glossary');
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(PAGE_SIZE);
    const [game, setGame] = useState<Game | null>(loaded?.game ?? null);
    const allTerms = useMemo(() => (loaded?.game ? loaded.terms : []), [loaded]);
    const [terms, setTerms] = useState<Term[]>(() => allTerms.slice(0, PAGE_SIZE));
    const [gameMaps, setGameMaps] = useState<GameMap[]>([]);
    const [loading, setLoading] = useState(!loaded?.game);
    const [error, setError] = useState<string | null>(null);
    const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
    const [termsLoading, setTermsLoading] = useState(false);
    const [termsPagination, setTermsPagination] = useState<PaginationMeta>(() => firstPage(allTerms));
    const index = useMemo(() => {
        const groups = new Map<string, Term[]>();
        for (const term of allTerms) {
            const key = initialOf(term.word);
            groups.set(key, [...(groups.get(key) ?? []), term]);
        }
        return [...groups.entries()].sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)));
    }, [allTerms]);

    useEffect(() => {
        const fetchData = async () => {
            if (!slug) return;
            try {
                // The loader already brought the game; only the maps load client-side.
                const gameData = loaded?.game?.slug === slug ? loaded.game : await getGameBySlug(slug);
                setGame(gameData);

                if (gameData) {
                    const mapsData = await getMaps(gameData.id);
                    setGameMaps(mapsData);
                }
            } catch (error: any) {
                console.error("Failed to fetch game details", error);
                if (!loaded?.game) setError(error.message || "Erro ao carregar dados");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, loaded]);

    useEffect(() => {
        if (!game?.id) return;
        const timeout = window.setTimeout(async () => {
            setTermsLoading(true);
            try {
                const termsData = await getTerms({
                    gameId: game.id,
                    page,
                    pageSize,
                    search
                });
                setTerms(termsData.items);
                setTermsPagination(termsData.pagination);
            } catch (requestError: any) {
                setError(requestError.message || 'Erro ao carregar termos');
            } finally {
                setTermsLoading(false);
            }
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [game?.id, page, pageSize, search]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Carregando...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white">
                <h2 className="text-xl font-bold text-red-500 mb-2">Erro</h2>
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4">Tentar Novamente</Button>
            </div>
        );
    }

    if (!game) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold text-white mb-4">Jogo não encontrado</h2>
                <Button onClick={() => navigate('/jogos')}>Voltar para Biblioteca</Button>
            </div>
        );
    }

    const activeMap = gameMaps.find(m => m.id === selectedMapId);

    return (
        <div className="min-h-screen pb-20">
            <Seo
                title={`${game.name} — Glossário e Mapas`}
                description={`Glossário de gírias e termos de ${game.name}${game.genre ? ` (${game.genre})` : ''}, além de mapas táticos e callouts. Aprenda o vocabulário do jogo.`}
                image={game.image}
                path={`/jogos/${game.slug}`}
                type="article"
            />
            <JsonLd data={breadcrumbSchema([
                { name: 'Início', path: '/' },
                { name: 'Jogos', path: '/jogos' },
                { name: game.name, path: `/jogos/${game.slug}` },
            ])} />
            {allTerms.length > 0 && <JsonLd data={gameGlossarySchema(game, allTerms)} />}
            {/* Hero Banner */}
            <div className="relative h-[40vh] w-full overflow-hidden border-b border-brand-500/20">
                <img src={game.image} alt="" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-b from-dark-950/30 via-dark-950/60 to-dark-950"></div>
                <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => navigate('/jogos')} className="mb-4 pl-0 text-gray-300 hover:text-white hover:bg-black/20 w-fit">
                        <ArrowLeft className="w-4 h-4" /> Voltar para Biblioteca
                    </Button>
                    <h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">{game.name}</h1>
                    <div className="flex items-center gap-4">
                        <Badge color="brand" className="text-base px-3 py-1">{game.genre}</Badge>
                        <span className="text-gray-400 text-sm md:text-base bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                            {termsPagination.total} termos catalogados
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[1600px] mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-6 border-b border-dark-800 mb-6 overflow-x-auto max-w-7xl mx-auto">
                    <button
                        onClick={() => setTab('glossary')}
                        className={`pb-4 px-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${tab === 'glossary' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <Book className="w-4 h-4" /> Glossário
                    </button>
                    <button
                        onClick={() => setTab('maps')}
                        className={`pb-4 px-2 flex items-center gap-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${tab === 'maps' ? 'border-brand-500 text-brand-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <MapIcon className="w-4 h-4" /> Mapas & Callouts
                    </button>
                </div>

                {tab === 'glossary' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                        <div className="mb-8 relative max-w-lg">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                            <Input
                                placeholder={`Buscar termos de ${game.name}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-12"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {terms.map(term => (
                                <CatalogTermCard key={term.id} term={term} navigationState={{ source: 'game_glossary' }} />
                            ))}
                            {!termsLoading && terms.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-dark-900/30 rounded-xl border border-dark-800 border-dashed">
                                    <Book className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-300">Nenhum termo encontrado</h3>
                                    <p className="text-gray-500">Tente buscar por outra palavra ou contribua com o dicionário.</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 overflow-hidden rounded-lg border border-dark-800 bg-dark-900/50">
                            <PaginationControls
                                pagination={termsPagination}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                                disabled={termsLoading}
                                pageSizeOptions={[12, 24, 48]}
                            />
                        </div>

                        {index.length > 0 && (
                            <section aria-labelledby="game-glossary-index" className="mt-14">
                                <h2 id="game-glossary-index" className="text-2xl font-black text-white">
                                    Todos os termos de {game.name} <span className="text-gray-500">de A a Z</span>
                                </h2>
                                <p className="mt-1 text-sm text-gray-400">{allTerms.length} {allTerms.length === 1 ? 'termo' : 'termos'} no glossário.</p>
                                <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {index.map(([letter, group]) => (
                                        <div key={letter}>
                                            <h3 className="mb-2 border-b border-dark-800 pb-1 text-sm font-black text-brand-400">{letter}</h3>
                                            <ul className="space-y-1">
                                                {group.map((term) => (
                                                    <li key={term.id}>
                                                        <Link to={`/term/${encodeURIComponent(term.word)}`} className="text-sm text-gray-300 hover:text-brand-300 hover:underline">{term.word}</Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    !selectedMapId ? (
                        /* Map Grid Selection View */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {gameMaps.map((map, idx) => (
                                    <div
                                        key={map.id}
                                        onClick={() => setSelectedMapId(map.id)}
                                        className="group cursor-pointer bg-dark-900 border border-dark-700 rounded-xl overflow-hidden hover:border-brand-500 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="aspect-[4/3] overflow-hidden relative">
                                            <img src={map.image} alt={map.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent"></div>
                                            <div className="absolute bottom-0 left-0 p-4 w-full">
                                                <h3 className="text-xl font-black text-white uppercase italic">{map.name}</h3>
                                                <p className="text-xs text-brand-400 font-bold">{map.callouts.length} Locations</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {gameMaps.length === 0 && (
                                    <div className="col-span-full text-center py-20 bg-dark-900/30 rounded-xl border border-dark-800 border-dashed">
                                        <MapIcon className="w-12 h-12 text-dark-700 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-gray-300">Nenhum mapa encontrado</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            Ainda não temos mapas cadastrados para este jogo.
                                        </p>
                                        <Button className="mt-6" onClick={() => navigate('/contribuir')}>Contribuir</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        activeMap ? (
                            <MapViewer
                                activeMap={activeMap}
                                allMaps={gameMaps}
                                selectedMapId={selectedMapId}
                                onSelectMap={setSelectedMapId}
                                onBack={() => setSelectedMapId(null)}
                            />
                        ) : (
                            <div className="text-center py-20">Erro ao carregar mapa</div>
                        )
                    )
                )}
            </div>
        </div>
    );
}
