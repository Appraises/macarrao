import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLoaderData, useLocation, useNavigation, type LoaderFunctionArgs } from 'react-router-dom';
import { getTermBySlug, getTerms, recordTermView } from '../src/services/api';
import { Button } from '../components/UI';
import { CompactTermCard } from '../components/CompactTermCard';
import { ArrowLeft, SearchX, Gamepad2, PlusCircle, ScrollText, Image as ImageIcon, ArrowUpRight } from 'lucide-react';
import { TermCard } from '../components/TermCard';
import { AddMeaningPanel } from '../components/AddMeaningPanel';
import { Term } from '../types';
import { Seo } from '../components/Seo';
import { JsonLd, definedTermSchema, breadcrumbSchema } from '../components/JsonLd';
import { trackAnalyticsEvent } from '../src/lib/analytics';

// Runs at build time (prerender) and on client navigation, so the term data is
// present in the server-rendered HTML for SEO.
export async function termLoader({ params }: LoaderFunctionArgs): Promise<Term | null> {
  const slug = params.slug;
  if (!slug) return null;
  try {
    return await getTermBySlug(slug);
  } catch {
    return null;
  }
}

// Small labelled panel used for the Origin / Media contribution hooks.
const InvitePanel: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; cta: string; href: string }> = ({ icon, title, children, cta, href }) => (
  <div className="rounded-xl border border-white/5 bg-dark-900 p-6">
    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
      {icon} {title}
    </h3>
    <p className="text-sm leading-relaxed text-gray-400">{children}</p>
    <Link to={href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-brand-400">
      <PlusCircle className="h-3.5 w-3.5" /> {cta}
    </Link>
  </div>
);

export const TermDetail: React.FC = () => {
  const term = useLoaderData() as Term | null;
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  const loading = navigation.state === 'loading';
  const [isKonamiActive, setIsKonamiActive] = useState(false);
  const viewedTermRef = useRef<string | null>(null);

  const [related, setRelated] = useState<Term[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [sameGameCount, setSameGameCount] = useState(0);

  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const [konamiIndex, setKonamiIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiIndex]) {
        const nextIndex = konamiIndex + 1;
        if (nextIndex === konamiCode.length) { setIsKonamiActive(true); setKonamiIndex(0); }
        else setKonamiIndex(nextIndex);
      } else setKonamiIndex(0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  useEffect(() => { setIsKonamiActive(false); }, [slug]);

  // Record a view (client-side only) once the term is shown
  useEffect(() => {
    if (term?.id && viewedTermRef.current !== term.id) {
      viewedTermRef.current = term.id;
      const state = (location.state || {}) as { source?: string; searchToken?: string; position?: number };
      void recordTermView(term.id, { source: state.source || 'direct', searchToken: state.searchToken, position: state.position });
      trackAnalyticsEvent('Term Opened', { source: state.source || 'direct', search_linked: Boolean(state.searchToken) });
    }
  }, [term, location.state]);

  // Keep the reader exploring, ranked by relevance:
  // 1) same game  →  2) shared tags (in order)  →  3) popular filler.
  // Never empty.
  const gameId = term?.gameId || term?.game?.id || null;
  const tagsKey = (term?.tags || []).join(',');
  useEffect(() => {
    if (!term) { setRelated([]); return; }
    let cancelled = false;
    const currentId = term.id;
    setRelatedLoading(true);

    const empty = Promise.resolve<Term[]>([]);
    const items = (p: ReturnType<typeof getTerms>) => p.then((r) => r.items).catch(() => [] as Term[]);

    const sameGame = gameId ? items(getTerms({ gameId, pageSize: 8, sort: 'upvotes', origin: 'game' })) : empty;
    const tags = (term.tags || []).slice(0, 3);
    const byTags = Promise.all(tags.map((tag) => items(getTerms({ tag, pageSize: 6, sort: 'upvotes', origin: 'game' }))));
    const popular = items(getTerms({ pageSize: 8, sort: 'upvotes', origin: 'game' }));

    Promise.all([sameGame, byTags, popular])
      .then(([sameItems, tagResults, popItems]) => {
        if (cancelled) return;
        const seen = new Set<string>([currentId]);
        const ordered: Term[] = [];
        const push = (arr: Term[]) => {
          for (const t of arr) {
            if (!seen.has(t.id)) { seen.add(t.id); ordered.push(t); }
          }
        };
        const same = sameItems.filter((t) => t.id !== currentId);
        setSameGameCount(same.length);
        push(same);                    // 1. same game
        tagResults.forEach(push);      // 2. shared tags, in tag order
        push(popItems);                // 3. popular filler
        setRelated(ordered.slice(0, 6));
      })
      .catch(() => { if (!cancelled) setRelated([]); })
      .finally(() => { if (!cancelled) setRelatedLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term?.id, gameId, tagsKey]);

  const contributeHref = gameId ? `/contribuir?game=${gameId}` : '/contribuir';
  const gameName = term?.game?.name;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 min-h-[60vh]">
      <Seo
        title={term ? `${term.word} — o que significa?` : slug ? `${slug} — o que significa?` : undefined}
        description={term ? `${term.word}: ${term.definition}` : `Veja o significado de "${slug}" no Dicionário Gamer.`}
        path={term ? `/term/${encodeURIComponent(term.word)}` : slug ? `/term/${slug}` : undefined}
        image={term ? `/og/term/${encodeURIComponent(term.word)}.png` : undefined}
        type="article"
        noindex={!term}
      />
      {term && (
        <>
          <JsonLd data={definedTermSchema(term)} />
          <JsonLd data={breadcrumbSchema([
            { name: 'Início', path: '/' },
            { name: term.word, path: `/term/${encodeURIComponent(term.word)}` },
          ])} />
        </>
      )}
      <Button variant="ghost" onClick={() => navigate('/dicionario')} className="mb-6 pl-0 hover:bg-transparent hover:text-ocean-400">
        <ArrowLeft className="w-4 h-4" /> Voltar para busca
      </Button>

      {isKonamiActive && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl animate-pulse text-center border-4 border-yellow-400 transform rotate-1">
          <h1 className="text-4xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-widest">KONAMI CODE DETECTED!</h1>
          <p className="text-white font-mono mt-2 font-bold">CHEAT MODE ENABLED</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-ocean-500/30 border-t-ocean-500 rounded-full animate-spin"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white animate-pulse">Consultando o banco de dados...</h3>
            <p className="text-gray-500 text-sm">Estamos vasculhando servidores e manuais antigos.</p>
          </div>
        </div>
      ) : term ? (
        <div className="space-y-10">
          {/* 60 / 40 layout */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* LEFT ~60% */}
            <div className="lg:col-span-3 space-y-6">
              <TermCard term={term} />

              <AddMeaningPanel term={term} />

              {/* Origin */}
              {term.origin ? (
                <div className="rounded-xl border border-white/5 bg-dark-900 p-6">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
                    <ScrollText className="h-4 w-4" /> Origem & curiosidades
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-300">{term.origin}</p>
                </div>
              ) : (
                <InvitePanel icon={<ScrollText className="h-4 w-4" />} title="Origem & curiosidades" cta="Adicionar origem" href={contributeHref}>
                  De onde vem <span className="font-bold text-gray-200">{term.word}</span>? Uma curiosidade sobre como e onde o termo é usado ajuda a comunidade a entender a história por trás dele.
                </InvitePanel>
              )}

              {/* Media / map */}
              {term.images && term.images.length > 0 ? (
                <div className="rounded-xl border border-white/5 bg-dark-900 p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
                    <ImageIcon className="h-4 w-4" /> Imagens & referências
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {term.images.map((src, i) => (
                      <img key={i} src={src} alt={`${term.word} — referência ${i + 1}`} className="aspect-video w-full rounded-lg border border-white/10 object-cover" />
                    ))}
                  </div>
                </div>
              ) : (
                <InvitePanel icon={<ImageIcon className="h-4 w-4" />} title="Imagens & referências" cta="Enviar imagem" href={contributeHref}>
                  Um print, um clipe ou um ponto no mapa que ilustra <span className="font-bold text-gray-200">{term.word}</span> vale mais que mil palavras. Tem um exemplo visual pra compartilhar?
                </InvitePanel>
              )}
            </div>

            {/* RIGHT ~40% */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contribution CTA */}
              <div className="rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-900/30 to-dark-900 p-6 shadow-glow-brand">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold leading-snug text-white">
                  Conhece um termo{gameName ? <> de <span className="text-brand-400">{gameName}</span></> : ''}?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Falta alguma gíria{gameName ? ` de ${gameName}` : ''} no dicionário? Adicione — a comunidade agradece e você ganha XP.
                </p>
                <Link
                  to={contributeHref}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-brand-400 hover:shadow-[0_0_25px_rgba(14,165,233,0.4)]"
                >
                  <PlusCircle className="h-4 w-4" /> Contribuir com um termo
                </Link>
              </div>

              {/* Game context */}
              {term.game && (
                <Link to={`/games/${term.game.slug}`} className="group block overflow-hidden rounded-xl border border-white/5 bg-dark-900 transition-colors hover:border-brand-500/30">
                  {term.game.image && (
                    <div className="h-24 overflow-hidden">
                      <img src={term.game.image} alt={term.game.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-4">
                    <Gamepad2 className="h-5 w-5 flex-none text-brand-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500">Glossário de</p>
                      <p className="truncate font-bold text-white">{term.game.name}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 flex-none text-gray-600 transition-colors group-hover:text-brand-400" />
                  </div>
                </Link>
              )}

              {/* Quick "veja também" from relatedTerms field */}
              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div className="rounded-xl border border-white/5 bg-dark-900 p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Veja também</h3>
                  <div className="flex flex-wrap gap-2">
                    {term.relatedTerms.map((rt) => (
                      <button
                        key={rt}
                        onClick={() => navigate(`/term/${encodeURIComponent(rt)}`, { state: { source: 'related_term' } })}
                        className="rounded border border-white/10 bg-dark-950 px-3 py-1.5 text-sm text-gray-300 transition-all hover:border-brand-500/50 hover:text-brand-400"
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FULL WIDTH: more terms from the same game */}
          {(relatedLoading || related.length > 0) && (
            <div className="border-t border-white/5 pt-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {sameGameCount > 0 && gameName ? `Mais termos de ${gameName}` : 'Você também pode gostar'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Continue explorando o vocabulário</p>
                </div>
                <Link
                  to={sameGameCount > 0 && gameId ? `/dicionario?game=${gameId}` : '/dicionario'}
                  className="flex-none text-[11px] font-bold uppercase tracking-wider text-gray-500 transition-colors hover:text-brand-400"
                >
                  Ver todos
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedLoading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-white/5 bg-dark-900" />)
                  : related.map((t) => <CompactTermCard key={t.id} term={t} navigationState={{ source: 'related_term' }} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-dark-800 rounded-2xl border border-white/5">
          <SearchX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Termo não encontrado</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Não encontramos "{slug}" em nossa base. Que tal contribuir adicionando esse termo?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate(`/dicionario?q=${encodeURIComponent(slug || '')}`)}>Buscar termos parecidos</Button>
            <Button variant="outline" onClick={() => navigate('/contribuir')}>Contribuir</Button>
          </div>
        </div>
      )}
    </div>
  );
};
