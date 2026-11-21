import React from 'react';
import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EsportsNews } from '../../types';
import { EsportsMark } from './EsportsMark';
import { gameAccent, gameCover, gameLabel } from './gameMeta';

const newsPath = (item: EsportsNews) => `/noticias/${encodeURIComponent(item.slug!)}`;

// A broken story image falls back to the game's cover art, then to an icon.
const CoverFallback: React.FC<{ game?: string | null }> = ({ game }) => {
    const cover = gameCover(game);
    return cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <Newspaper size={18} />;
};

const Meta: React.FC<{ item: EsportsNews }> = ({ item }) => {
    const game = item.game ? gameLabel(item.game) : null;
    return (
        <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
            {game && <span className={`font-bold ${gameAccent(game).text}`}>{game}</span>}
            {game && item.timeAgo && <span aria-hidden="true">·</span>}
            {item.timeAgo && <span>{item.timeAgo}</span>}
        </span>
    );
};

export const EsportsNewsGrid: React.FC<{ news: EsportsNews[]; title: string }> = ({ news, title }) => {
    const items = news.filter((item) => item.slug);
    const [lead, ...rest] = items;
    const side = rest.slice(0, 4);

    return (
        <section aria-labelledby="esports-news-title">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="esports-news-title" className="font-display text-[28px] font-bold leading-none text-white">{title}</h2>
                <Link to="/noticias" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-brand-300 hover:text-white">Todas as notícias <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
            {!lead ? (
                <p className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a101c] px-5 py-8 text-sm text-slate-300"><Newspaper size={19} className="text-slate-500" aria-hidden="true" />Nenhuma notícia nesta seleção.</p>
            ) : (
                <div className={`mt-4 grid gap-4 ${side.length ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]' : ''}`}>
                    <Link to={newsPath(lead)} data-testid="esports-news-feature"
                        className="group relative isolate flex min-h-[280px] flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-[#0a101c] p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 sm:min-h-[340px] sm:p-6">
                        <EsportsMark src={lead.image || gameCover(lead.game)} alt="" cover fallback={<CoverFallback game={lead.game} />}
                            className="absolute inset-0 -z-20 h-full w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-dark-950 via-dark-950/75 to-dark-950/10" />
                        <Meta item={lead} />
                        <h3 className="mt-2 max-w-2xl font-display text-2xl font-bold leading-tight text-white group-hover:text-brand-200 sm:text-[30px]">{lead.headline}</h3>
                    </Link>
                    {side.length > 0 && (
                        <ul className="grid content-start gap-3">
                            {side.map((item) => (
                                <li key={item.id}>
                                    <Link to={newsPath(item)} className="group grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                                        <EsportsMark src={item.image || gameCover(item.game)} alt="" cover fallback={<CoverFallback game={item.game} />}
                                            className="aspect-[16/10] w-full rounded-lg bg-white/5 text-slate-600" />
                                        <span className="min-w-0">
                                            <Meta item={item} />
                                            <span className="mt-1 line-clamp-3 text-sm font-semibold leading-snug text-slate-100 group-hover:text-brand-200">{item.headline}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
};
