import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Badge } from '../components/UI';
import { NewsPublicationTime } from '../components/NewsPublicationTime';
import { getNews } from '../src/services/api';
import { Seo } from '../components/Seo';
import { PaginationControls } from '../components/PaginationControls';
import { usePaginatedListQuery } from '../src/hooks/usePaginatedListQuery';
import type { News as NewsItem, PaginationMeta } from '../types';

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1,
    pageSize: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
};

export const News: React.FC = () => {
    const { page, pageSize, setPage, setPageSize } = usePaginatedListQuery(12);
    const [news, setNews] = React.useState<NewsItem[]>([]);
    const [pagination, setPagination] = React.useState<PaginationMeta>(EMPTY_PAGINATION);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchNews = async () => {
            try {
                const data = await getNews({ page, pageSize });
                setNews(data.items);
                setPagination(data.pagination);
            } catch (error) {
                console.error("Failed to fetch news", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [page, pageSize]);

    const featuredNews = page === 1 ? news.slice(0, 4) : [];
    const latestNews = page === 1 ? news.slice(4) : news;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0b10] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0b10] text-gray-200 font-sans pb-20">
            <Seo
                title="Notícias sobre Games"
                description="As últimas notícias do mundo dos games e e-sports: lançamentos, atualizações, campeonatos e cultura gamer."
                path="/noticias"
            />

            {/* Header Section */}
            <div className="bg-dark-950 border-b border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <img src="/dg-control-logo.svg" alt="" width="96" height="53" className="mx-auto mb-4 block" />
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        "Notícias sobre Games"
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
                        Fique por dentro das últimas notícias sobre games, jogos e consoles aqui no Dicionário Gamer.
                        Atualize-se agora com as novidades e lançamentos! Confira mais detalhes.
                    </p>

                    <div className="mt-8 flex items-center justify-center">
                        <span className="px-4 py-1 bg-brand-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm">
                            Destaques
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* DESTAQUES (Featured Grid) */}
                {featuredNews.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                    {featuredNews.map((item) => (
                        <Link
                            key={item.id}
                            to={`/noticias/${item.slug}/`}
                            className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer border border-transparent hover:border-brand-500 transition-all duration-300"
                        >
                            <img
                                src={item.image}
                                alt={item.headline}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"></div>

                            <div className="absolute bottom-0 left-0 p-4 w-full">
                                <Badge className="mb-2 bg-brand-600 text-white border-none text-[10px] px-2 py-0.5 rounded-sm uppercase font-bold">
                                    {item.category}
                                </Badge>
                                <h3 className="text-sm md:text-base font-bold text-white leading-tight group-hover:text-brand-400 transition-colors line-clamp-3">
                                    {item.headline}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>}

                {/* ÚLTIMAS NOTÍCIAS (Latest News List) */}
                <div className="flex items-center justify-center mb-8">
                    <span className="px-4 py-1 bg-dark-800 border border-dark-700 text-gray-300 text-xs font-bold uppercase tracking-widest rounded-sm">
                        Últimas Notícias
                    </span>
                </div>

                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    {latestNews.map((item) => (
                        <Link
                            key={item.id}
                            to={`/noticias/${item.slug}/`}
                            className="group flex flex-col md:flex-row gap-4 bg-dark-900/50 border border-dark-800/50 hover:bg-dark-900 hover:border-brand-500/30 rounded-lg overflow-hidden transition-all duration-300 p-4"
                        >
                            {/* Thumbnail */}
                            <div className="w-full md:w-64 aspect-video flex-shrink-0 overflow-hidden rounded relative">
                                <img
                                    src={item.image}
                                    alt={item.headline}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute bottom-2 left-2">
                                    <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase">
                                        {item.category}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div>
                                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-tight group-hover:text-brand-400 transition-colors">
                                        {item.headline}
                                    </h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                                        {/* Strip HTML tags for summary */}
                                        {item.content?.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                                    </p>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-gray-400">
                                        {item.author && <span className="uppercase text-brand-400">Por {item.author}</span>}
                                        <NewsPublicationTime news={item} compact />
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1 text-gray-500 text-xs group-hover:text-brand-400 transition-colors">
                                        <MessageSquare className="w-3 h-3" />
                                        <span className="font-bold">{item.commentsCount ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-12 overflow-hidden rounded-lg border border-dark-800 bg-dark-900/50">
                    <PaginationControls
                        pagination={pagination}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        disabled={loading}
                        pageSizeOptions={[12, 24, 48]}
                    />
                </div>

            </div>
        </div>
    );
};
