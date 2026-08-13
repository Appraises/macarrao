import React from 'react';
import { useLoaderData, Link, useNavigation, useParams } from 'react-router-dom';
import { getNewsById, getNews } from '../src/services/api';
import { ChevronRight, Share2, MessageSquare, Clock, Flame, CalendarDays } from 'lucide-react';
import { Button } from '../components/UI';
import { CommentsSection } from '../components/CommentsSection';
import { Seo } from '../components/Seo';
import { JsonLd, articleSchema, breadcrumbSchema } from '../components/JsonLd';
import type { News as NewsItem } from '../types';

export interface NewsDetailLoaderData {
    newsItem: NewsItem;
    relatedNews: NewsItem[];
}

export async function loadNewsDetail(idOrSlug: string): Promise<NewsDetailLoaderData> {
    const [newsItem, relatedResponse] = await Promise.all([
        getNewsById(idOrSlug) as Promise<NewsItem>,
        getNews({ page: 1, pageSize: 5, sort: 'createdAt', order: 'desc' })
    ]);

    return {
        newsItem,
        relatedNews: relatedResponse.items.filter((news) => news.id !== newsItem.id).slice(0, 4)
    };
}

export async function newsDetailLoader({ params }: { params: { slug?: string; id?: string } }): Promise<NewsDetailLoaderData | null> {
    const idOrSlug = params.slug || params.id;
    if (!idOrSlug) return null;

    try {
        return await loadNewsDetail(idOrSlug);
    } catch (error) {
        // A failed social/SEO prerender must fail the build instead of quietly
        // shipping the generic SPA shell. Browser navigation still uses the
        // resilient client-side fallback below.
        if (typeof window === 'undefined') throw error;
        return null;
    }
}

export const NewsDetail: React.FC = () => {
    const loaderData = useLoaderData() as NewsDetailLoaderData | null | undefined;
    const { slug, id } = useParams<{ slug?: string; id?: string }>();
    const navigation = useNavigation();
    const idOrSlug = slug || id;
    const [retry, setRetry] = React.useState(0);
    const [fallback, setFallback] = React.useState<{
        key: string;
        data: NewsDetailLoaderData | null;
        loading: boolean;
        failed: boolean;
    }>({ key: '', data: null, loading: false, failed: false });

    React.useEffect(() => {
        if (loaderData || !idOrSlug) return;

        let active = true;
        setFallback({ key: idOrSlug, data: null, loading: true, failed: false });

        loadNewsDetail(idOrSlug)
            .then((data) => {
                if (active) setFallback({ key: idOrSlug, data, loading: false, failed: false });
            })
            .catch(() => {
                if (active) setFallback({ key: idOrSlug, data: null, loading: false, failed: true });
            });

        return () => {
            active = false;
        };
    }, [idOrSlug, loaderData, retry]);

    const fallbackForCurrentRoute = fallback.key === idOrSlug ? fallback : null;
    const detail = loaderData || fallbackForCurrentRoute?.data;
    const loading = navigation.state === 'loading'
        || (!detail && Boolean(idOrSlug) && (!fallbackForCurrentRoute || fallbackForCurrentRoute.loading));

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-950 text-white">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-dark-700 border-t-brand-500" aria-label="Carregando notícia" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-dark-950 px-4 text-center text-white">
                <h2 className="mb-3 text-2xl font-bold">
                    {fallbackForCurrentRoute?.failed ? 'Não foi possível carregar a notícia' : 'Notícia não encontrada'}
                </h2>
                <p className="mb-6 max-w-md text-sm text-gray-400">
                    {fallbackForCurrentRoute?.failed
                        ? 'A conexão com as notícias falhou. Tente novamente em instantes.'
                        : 'Esta notícia pode ter sido removida ou ainda não está publicada.'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {fallbackForCurrentRoute?.failed && (
                        <Button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</Button>
                    )}
                    <Link to="/news">
                        <Button variant="secondary">Voltar para Notícias</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { newsItem, relatedNews } = detail;

    const formatDate = (value?: string) => {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const stripHtml = (value?: string) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const extractSummary = (value?: string) => {
        const match = String(value || '').match(/<p>\s*<strong>Resumo:<\/strong>\s*([\s\S]*?)<\/p>/i);
        return match ? stripHtml(match[1]) : '';
    };

    const cleanArticleContent = (value?: string) =>
        String(value || '').replace(/<p>\s*<strong>Resumo:<\/strong>[\s\S]*?<\/p>\s*/i, '');

    const summary = newsItem.seoDescription || extractSummary(newsItem.content);
    const readingMinutes = Math.max(1, Math.ceil(stripHtml(newsItem.content).split(/\s+/).filter(Boolean).length / 220));
    const socialRevision = newsItem.updatedAt || newsItem.publishedAt || newsItem.createdAt;
    const socialImageVersion = encodeURIComponent(socialRevision);
    const socialImage = newsItem.image
        ? `/og/news/${encodeURIComponent(newsItem.slug)}.png?v=${socialImageVersion}`
        : undefined;
    const authorName = newsItem.author || 'Equipe Dicionário Gamer';
    const authorInitials = authorName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    const handleShare = async () => {
        const shareUrl = new URL(window.location.href);
        shareUrl.hash = '';
        shareUrl.search = '';
        shareUrl.searchParams.set('v', String(Date.parse(socialRevision) || socialRevision));
        const shareData = { title: newsItem?.headline, url: shareUrl.toString() };
        if (navigator.share) await navigator.share(shareData).catch(() => undefined);
        else await navigator.clipboard?.writeText(shareUrl.toString());
    };

    /* Data is loaded by the route loader so the SSG can render the article HTML. */
    return (
        <div className="min-h-screen bg-dark-950 pb-20 font-sans text-gray-200">
            <Seo
                title={newsItem.seoTitle || newsItem.headline}
                description={
                    summary || stripHtml(newsItem.content).slice(0, 260) || newsItem.headline
                }
                image={socialImage}
                imageAlt={`Capa da notícia: ${newsItem.headline}`}
                imageType="image/png"
                path={`/news/${newsItem.slug}/`}
                type="article"
            />
            <JsonLd data={articleSchema(newsItem)} />
            <JsonLd data={breadcrumbSchema([
                { name: 'Início', path: '/' },
                { name: 'Notícias', path: '/news' },
                { name: newsItem.headline, path: `/news/${newsItem.slug}/` },
            ])} />

            <article>
                <header className="border-b border-white/[0.07] pb-8 pt-6 md:pb-12 md:pt-8">
                    <div className="mx-auto max-w-6xl px-4">
                        <nav
                            aria-label="Navegação da notícia"
                            className="mb-8 flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase text-gray-600 md:mb-10"
                        >
                            <Link to="/" className="transition-colors hover:text-gray-300">
                                Início
                            </Link>
                            <ChevronRight className="h-3 w-3 shrink-0 text-gray-700" aria-hidden="true" />
                            <Link to="/news" className="transition-colors hover:text-brand-400">
                                Notícias
                            </Link>
                            <ChevronRight className="h-3 w-3 shrink-0 text-gray-700" aria-hidden="true" />
                            <span className="truncate text-gray-500" aria-current="page">
                                {newsItem.category}
                            </span>
                        </nav>

                        <div className="max-w-5xl">
                            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                                <span className="border-l-2 border-brand-500 pl-3 font-black uppercase text-brand-400">
                                    {newsItem.category}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {formatDate(newsItem.publishedAt || newsItem.createdAt)}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {readingMinutes} min de leitura
                                </span>
                                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="grid h-6 w-6 place-items-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                    title="Compartilhar notícia"
                                    aria-label="Compartilhar notícia"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <h1 className="max-w-5xl text-4xl font-black leading-[1.08] text-white md:text-6xl xl:text-7xl">
                                {newsItem.headline}
                            </h1>

                            {summary && (
                                <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-300 md:text-xl md:leading-9">
                                    {summary}
                                </p>
                            )}

                        </div>
                    </div>
                </header>

                {newsItem.image && (
                    <figure className="mx-auto max-w-6xl px-4 py-8 md:py-12">
                        <img
                            src={newsItem.image}
                            alt={newsItem.headline}
                            className="aspect-video w-full rounded-sm bg-dark-900 object-cover"
                        />
                    </figure>
                )}

                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-4 pb-16 lg:grid-cols-[minmax(0,760px)_280px] lg:items-start lg:justify-between lg:gap-16 xl:gap-24">
                    <div className="min-w-0">
                        <div className="news-article-content">
                            <div dangerouslySetInnerHTML={{ __html: cleanArticleContent(newsItem.content) }} />
                        </div>

                        <footer className="mt-12 border-y border-white/10">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-4 py-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-500/25 bg-brand-500/10 text-[11px] font-black text-brand-300"
                                        aria-hidden="true"
                                    >
                                        {authorInitials}
                                    </div>
                                    <div className="leading-tight">
                                        <p className="text-sm text-gray-500">
                                            Por <span className="font-bold text-white">{authorName}</span>
                                        </p>
                                        <p className="mt-1 text-xs text-gray-600">Redação Dicionário Gamer</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 border-l border-white/10 pl-4">
                                    <a
                                        href="#comentarios"
                                        className="grid h-9 w-9 place-items-center rounded-full text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                                        title="Ir para os comentários"
                                        aria-label="Ir para os comentários"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 py-4 text-xs uppercase text-gray-500">
                                <span className="font-black text-gray-300">Tópicos</span>
                                <span aria-hidden="true">/</span>
                                <span>Notícias</span>
                                <span aria-hidden="true">/</span>
                                <span>{newsItem.category}</span>
                            </div>
                        </footer>
                    </div>

                    {relatedNews.length > 0 && (
                        <aside className="border-t border-white/10 pt-5 lg:sticky lg:top-28">
                            <h2 className="mb-5 flex items-center gap-2 text-sm font-black uppercase text-white">
                                <Flame className="h-4 w-4 text-brand-400" />
                                Leia também
                            </h2>

                            <div className="divide-y divide-white/10 border-b border-white/10">
                                {relatedNews.map((item, index) => (
                                    <Link
                                        key={item.id}
                                        to={`/news/${item.slug}/`}
                                        className="group grid grid-cols-[32px_1fr] gap-3 py-5 first:pt-0"
                                    >
                                        <span className="text-xl font-black text-brand-500/60">{String(index + 1).padStart(2, '0')}</span>
                                        <span>
                                            <span className="mb-1.5 block text-[10px] font-bold uppercase text-gray-600">{item.category}</span>
                                            <span className="block text-sm font-bold leading-5 text-gray-200 transition-colors group-hover:text-brand-400">
                                                {item.headline}
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </aside>
                    )}
                </div>
            </article>

            <section id="comentarios" className="scroll-mt-24 px-4">
                <CommentsSection newsId={newsItem.id} />
            </section>
        </div>
    );
};
