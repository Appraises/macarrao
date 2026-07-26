import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getNewsById, getNews } from '../src/services/api';
import { Calendar, User, ArrowLeft, Share2, MessageSquare, Clock } from 'lucide-react';
import { Badge, Button } from '../components/UI';
import { CommentsSection } from '../components/CommentsSection';
import { Seo } from '../components/Seo';
import { JsonLd, articleSchema, breadcrumbSchema } from '../components/JsonLd';

export const NewsDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [newsItem, setNewsItem] = React.useState<any>(null);
    const [relatedNews, setRelatedNews] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const item = await getNewsById(id);
                setNewsItem(item);

                // Fetch related news (simple implementation: fetch all and filter)
                // In a real app, backend should provide related news
                const allNews = await getNews({ page: 1, pageSize: 5 });
                setRelatedNews(allNews.items.filter((news) => news.id !== id).slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch news", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0b10] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
            </div>
        );
    }

    if (!newsItem) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0b10] text-white">
                <h2 className="text-2xl font-bold mb-4">Notícia não encontrada</h2>
                <Button onClick={() => navigate('/news')}>Voltar para Notícias</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0b10] text-gray-200 font-sans pb-20 pt-24">
            <Seo
                title={newsItem.headline}
                description={
                    (newsItem.content
                        ? String(newsItem.content).replace(/<[^>]*>/g, '')
                        : newsItem.headline) || newsItem.headline
                }
                image={newsItem.image}
                path={`/news/${id}`}
                type="article"
            />
            <JsonLd data={articleSchema({ ...newsItem, id: id || newsItem.id })} />
            <JsonLd data={breadcrumbSchema([
                { name: 'Início', path: '/' },
                { name: 'Notícias', path: '/news' },
                { name: newsItem.headline, path: `/news/${id}` },
            ])} />

            {/* Progress Bar (Optional visual flair) */}
            <div className="fixed top-0 left-0 w-full h-1 bg-dark-800 z-50">
                <div className="h-full bg-brand-500 w-full origin-left animate-[progress_1s_ease-out]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Main Content */}
                <div className="lg:col-span-8">

                    {/* Breadcrumb / Back */}
                    <Link to="/news" className="inline-flex items-center gap-2 text-gray-500 hover:text-brand-400 mb-8 transition-colors text-sm font-bold uppercase tracking-wider">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para Notícias
                    </Link>

                    {/* Header */}
                    <header className="mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <Badge className="bg-brand-600 text-white border-none text-xs px-3 py-1 rounded-sm uppercase font-bold tracking-wider">
                                {newsItem.category}
                            </Badge>
                            <span className="text-gray-500 text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {newsItem.createdAt}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
                            {newsItem.headline}
                        </h1>

                        <div className="flex items-center justify-between border-y border-white/5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center border border-dark-700">
                                    <User className="w-5 h-5 text-brand-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Por {newsItem.author}</p>
                                    <p className="text-xs text-gray-500">Equipe Dicionário Gamer</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Compartilhar">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Comentários">
                                    <MessageSquare className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Hero Image */}
                    <div className="rounded-xl overflow-hidden mb-10 border border-dark-700 shadow-2xl">
                        <img
                            src={newsItem.image}
                            alt={newsItem.headline}
                            className="w-full aspect-video object-cover"
                        />
                    </div>

                    {/* Content Body */}
                    <article className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-gray-300 prose-a:text-brand-400 prose-strong:text-white prose-img:rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: newsItem.content || '' }} />
                    </article>

                    {/* Tags / Footer */}
                    <div className="mt-12 pt-8 border-t border-white/5">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tópicos Relacionados</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-dark-800 text-gray-300 text-sm rounded-full hover:bg-dark-700 cursor-pointer transition-colors">#Games</span>
                            <span className="px-3 py-1 bg-dark-800 text-gray-300 text-sm rounded-full hover:bg-dark-700 cursor-pointer transition-colors">#{newsItem.category}</span>
                            <span className="px-3 py-1 bg-dark-800 text-gray-300 text-sm rounded-full hover:bg-dark-700 cursor-pointer transition-colors">#Review</span>
                        </div>
                    </div>

                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Latest News Widget */}
                    <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 sticky top-28">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-brand-500 rounded-full"></span>
                            Leia Também
                        </h3>

                        <div className="flex flex-col gap-6">
                            {relatedNews.map(item => (
                                <Link key={item.id} to={`/news/${item.id}`} className="group flex gap-4 items-start">
                                    <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0">
                                        <img
                                            src={item.image}
                                            alt={item.headline}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-200 leading-tight group-hover:text-brand-400 transition-colors line-clamp-2 mb-1">
                                            {item.headline}
                                        </h4>
                                        <span className="text-xs text-gray-500">{item.createdAt}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Newsletter Widget (Mock) */}
                    <div className="bg-gradient-to-br from-brand-900/20 to-dark-900 border border-brand-500/20 rounded-xl p-6 text-center">
                        <h3 className="text-lg font-bold text-white mb-2">Dicionário Gamer Newsletter</h3>
                        <p className="text-sm text-gray-400 mb-4">Receba as melhores notícias e reviews diretamente no seu e-mail.</p>
                        <input
                            type="email"
                            placeholder="Seu melhor e-mail"
                            className="w-full bg-dark-950 border border-dark-700 rounded px-4 py-2 text-sm text-white mb-3 focus:border-brand-500 focus:outline-none"
                        />
                        <Button className="w-full">Inscrever-se</Button>
                    </div>

                </div>

            </div>

            {/* Comments Section */}
            <CommentsSection newsId={id} />
        </div>
    );
};
