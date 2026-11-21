import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { BookOpen, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { CatalogTermCard } from '../components/CatalogTermCard';
import { JsonLd, breadcrumbSchema } from '../components/JsonLd';
import { PaginationControls } from '../components/PaginationControls';
import { Seo } from '../components/Seo';
import { Button } from '../components/UI';
import { getCatalogMeta, getTerms } from '../src/services/api';
import { trackAnalyticsEvent } from '../src/lib/analytics';
import type { CatalogMeta, PaginationMeta, Term } from '../types';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const PAGE_SIZES = [12, 24, 48];
const SORTS = ['relevance', 'word', 'upvotes', 'createdAt'] as const;
type CatalogSort = typeof SORTS[number];

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 24,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const positiveInteger = (value: string | null, fallback: number) => {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const Dictionary: React.FC = () => {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const serializedParams = params.toString();
  const query = (params.get('q') || '').slice(0, 100);
  const gameId = params.get('game') || '';
  const tag = params.get('tag') || '';
  const letter = /^[a-z#]$/i.test(params.get('letter') || '') ? (params.get('letter') || '').toUpperCase() : '';
  const requestedSort = params.get('sort') as CatalogSort | null;
  const sort: CatalogSort = requestedSort && SORTS.includes(requestedSort)
    ? requestedSort
    : query ? 'relevance' : 'word';
  const page = positiveInteger(params.get('page'), 1);
  const requestedPageSize = positiveInteger(params.get('pageSize'), 24);
  const pageSize = PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 24;

  const [queryInput, setQueryInput] = useState(query);
  const [terms, setTerms] = useState<Term[]>([]);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchToken, setSearchToken] = useState<string | null>(null);
  const viewedRef = useRef(false);
  const searchAnalyticsRef = useRef('');
  const searchOriginRef = useRef<'home' | 'catalog' | 'game' | 'not_found' | 'unknown'>(
    (location.state as { searchOrigin?: 'home' | 'catalog' | 'game' | 'not_found' } | null)?.searchOrigin || 'catalog',
  );

  const order = sort === 'word' ? 'asc' : 'desc';
  const filterCount = [gameId, tag, letter].filter(Boolean).length;
  const hasCatalogState = ['q', 'game', 'tag', 'letter', 'sort', 'page', 'pageSize'].some((key) => params.has(key));
  const letterCounts = useMemo(
    () => new Map((meta?.letters || []).map((item) => [item.letter, item.count])),
    [meta],
  );

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  useEffect(() => {
    if (queryInput.trim() === query) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(serializedParams);
      const value = queryInput.trim().slice(0, 100);
      if (value) next.set('q', value);
      else next.delete('q');
      if (!value && next.get('sort') === 'relevance') next.delete('sort');
      next.delete('page');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [queryInput, query, serializedParams, setParams]);

  useEffect(() => {
    let cancelled = false;
    getCatalogMeta()
      .then((value) => { if (!cancelled) setMeta(value); })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar os filtros do catálogo.'); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTerms({
      page,
      pageSize,
      search: query || undefined,
      gameId: gameId || undefined,
      tag: tag || undefined,
      letter: letter || undefined,
      sort,
      order,
      origin: searchOriginRef.current,
    }).then((result) => {
      if (cancelled) return;
      if (result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
        const next = new URLSearchParams(serializedParams);
        next.set('page', String(result.pagination.totalPages));
        setParams(next, { replace: true });
        return;
      }
      setTerms(result.items);
      setPagination(result.pagination);
      setSearchToken(result.analytics?.searchToken || null);

      if (query) {
        const analyticsKey = [query, gameId, tag, letter, sort].join('|');
        if (searchAnalyticsRef.current !== analyticsKey) {
          searchAnalyticsRef.current = analyticsKey;
          trackAnalyticsEvent('Search Submitted', {
            source: 'catalog',
            query_length: query.length,
            results_count: result.pagination.total,
            game_filter: Boolean(gameId),
            tag_filter: Boolean(tag),
            letter_filter: Boolean(letter),
          });
          if (result.pagination.total === 0) {
            trackAnalyticsEvent('Search No Results', {
              source: 'catalog',
              query_length: query.length,
              filters_count: filterCount,
            });
          }
        }
      }
      searchOriginRef.current = 'catalog';
    }).catch(() => {
      if (!cancelled) setError('Não foi possível consultar o dicionário agora.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [page, pageSize, query, gameId, tag, letter, sort, order, reloadKey, serializedParams, setParams, filterCount]);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackAnalyticsEvent('Catalog Viewed', { source: hasCatalogState ? 'shared_state' : 'navigation' });
  }, [hasCatalogState]);

  const setCatalogParam = (key: string, value: string, trackFilter = true) => {
    const next = new URLSearchParams(serializedParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
    if (trackFilter) {
      trackAnalyticsEvent('Catalog Filter Applied', {
        filter: key,
        active: Boolean(value),
      });
    }
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(serializedParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next, { replace: true });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const setPageSize = (nextPageSize: number) => {
    const next = new URLSearchParams(serializedParams);
    if (nextPageSize === 24) next.delete('pageSize');
    else next.set('pageSize', String(nextPageSize));
    next.delete('page');
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setQueryInput('');
    setParams({}, { replace: true });
    setFiltersOpen(false);
    trackAnalyticsEvent('Catalog Filter Applied', { filter: 'all', active: false });
  };

  const renderFilterFields = (prefix: string) => (
    <div className="grid gap-4 md:grid-cols-3">
      <label className="grid gap-1.5 text-xs font-bold uppercase text-gray-500" htmlFor={`${prefix}-game`}>
        Jogo
        <select id={`${prefix}-game`} value={gameId} onChange={(event) => setCatalogParam('game', event.target.value)} className="h-11 rounded border border-white/10 bg-dark-950 px-3 text-sm font-medium normal-case text-gray-200 outline-none focus:border-brand-500">
          <option value="">Todos os jogos</option>
          {(meta?.games || []).map((game) => <option key={game.id} value={game.id}>{game.name} ({game.count})</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold uppercase text-gray-500" htmlFor={`${prefix}-tag`}>
        Categoria
        <select id={`${prefix}-tag`} value={tag} onChange={(event) => setCatalogParam('tag', event.target.value)} className="h-11 rounded border border-white/10 bg-dark-950 px-3 text-sm font-medium normal-case text-gray-200 outline-none focus:border-brand-500">
          <option value="">Todas as categorias</option>
          {(meta?.tags || []).map((item) => <option key={item.name} value={item.name}>{item.name} ({item.count})</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold uppercase text-gray-500" htmlFor={`${prefix}-sort`}>
        Ordenar
        <select id={`${prefix}-sort`} value={sort} onChange={(event) => setCatalogParam('sort', event.target.value, false)} className="h-11 rounded border border-white/10 bg-dark-950 px-3 text-sm font-medium normal-case text-gray-200 outline-none focus:border-brand-500">
          {query && <option value="relevance">Mais relevantes</option>}
          <option value="word">A-Z</option>
          <option value="upvotes">Mais populares</option>
          <option value="createdAt">Mais recentes</option>
        </select>
      </label>
    </div>
  );

  return (
    <main className="min-h-[70vh] bg-dark-950 px-4 pb-20 pt-10 text-gray-200">
      <Seo
        title="Dicionário de termos gamer"
        description="Explore gírias, mecânicas e expressões dos games por letra, jogo e categoria."
        path="/dicionario"
        noindex={hasCatalogState}
      />
      <JsonLd data={breadcrumbSchema([{ name: 'Início', path: '/' }, { name: 'Dicionário', path: '/dicionario' }])} />

      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/10 pb-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-bold uppercase text-brand-400">Vocabulário gamer</span>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Dicionário</h1>
              <p className="mt-2 text-sm text-gray-400">{meta ? `${meta.total} termos verificados` : 'Carregando catálogo...'}</p>
            </div>
            <Link to="/contribuir" className="inline-flex h-10 items-center justify-center gap-2 rounded border border-brand-500/30 px-4 text-sm font-bold text-brand-400 hover:bg-brand-500/10">
              <BookOpen className="h-4 w-4" /> Sugerir termo
            </Link>
          </div>

          <div className="relative mt-6 max-w-3xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Buscar palavra, definição ou categoria..."
              aria-label="Buscar no dicionário"
              maxLength={100}
              className="h-14 w-full rounded-lg border border-white/10 bg-dark-900 pl-12 pr-10 text-base text-white outline-none placeholder:text-gray-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </header>

        <section aria-label="Filtros do dicionário" className="border-b border-white/10 py-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><SlidersHorizontal className="h-4 w-4 text-brand-400" /> Explorar</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex h-10 items-center gap-2 rounded border border-white/10 px-3 text-sm font-semibold text-gray-300 md:hidden">
                <Filter className="h-4 w-4" /> Filtros {filterCount > 0 && <span className="text-brand-400">{filterCount}</span>}
              </button>
              {hasCatalogState && (
                <button type="button" onClick={clearFilters} className="inline-flex h-10 items-center gap-2 rounded px-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white">
                  <RotateCcw className="h-4 w-4" /> Limpar
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:block">{renderFilterFields('desktop')}</div>

          <div className="mt-5 overflow-x-auto pb-1" aria-label="Filtrar por letra">
            <div className="flex min-w-max gap-1.5">
              {LETTERS.map((item) => {
                const count = letterCounts.get(item) || 0;
                const active = letter === item;
                return (
                  <button
                    type="button"
                    key={item}
                    disabled={count === 0}
                    title={count ? `${count} termo${count === 1 ? '' : 's'} com ${item}` : `Nenhum termo com ${item}`}
                    aria-pressed={active}
                    onClick={() => setCatalogParam('letter', active ? '' : item)}
                    className={`grid h-9 w-9 place-items-center rounded border text-xs font-bold transition-colors ${active ? 'border-brand-500 bg-brand-500 text-dark-950' : 'border-white/10 text-gray-400 hover:border-brand-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-25'}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {filtersOpen && (
          <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Filtros do dicionário">
            <button type="button" aria-label="Fechar filtros" className="absolute inset-0 bg-black/70" onClick={() => setFiltersOpen(false)} />
            <aside className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg border-t border-white/10 bg-dark-900 p-5 shadow-2xl">
              <div className="mb-6 flex items-center justify-between"><h2 className="font-bold text-white">Filtros</h2><button type="button" title="Fechar" onClick={() => setFiltersOpen(false)} className="grid h-9 w-9 place-items-center rounded hover:bg-white/5"><X className="h-5 w-5" /></button></div>
              {renderFilterFields('mobile')}
              <Button onClick={() => setFiltersOpen(false)} className="mt-6 w-full">Ver resultados</Button>
            </aside>
          </div>
        )}

        <section className="py-7" aria-busy={loading}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
            <div>
              <h2 className="text-lg font-bold text-white">{query ? `Resultados para “${query}”` : letter ? `Termos com ${letter}` : 'Todos os termos'}</h2>
              <p className="mt-1 text-xs text-gray-500">{loading ? 'Consultando...' : `${pagination.total} resultado${pagination.total === 1 ? '' : 's'}`}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 sm:flex-row sm:items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-bold text-white underline underline-offset-4">Tentar novamente</button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Carregando termos">
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-lg border border-white/5 bg-dark-900" />)}
            </div>
          ) : terms.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {terms.map((term, index) => (
                <CatalogTermCard
                  key={term.id}
                  term={term}
                  navigationState={{ source: 'search_result', searchToken, position: (page - 1) * pageSize + index + 1 }}
                  onOpen={() => trackAnalyticsEvent('Search Result Click', { source: 'catalog', position: (page - 1) * pageSize + index + 1, search_active: Boolean(query), filters_count: filterCount })}
                />
              ))}
            </div>
          ) : !error && (
            <div className="border-y border-white/10 py-16 text-center">
              <Search className="mx-auto h-9 w-9 text-gray-700" />
              <h2 className="mt-4 text-xl font-bold text-white">Nenhum termo encontrado</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">Ajuste a busca ou os filtros. Se esse termo ainda não existe, você pode sugeri-lo para a comunidade.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={clearFilters} variant="outline">Limpar filtros</Button><Button onClick={() => window.location.assign('/contribuir')}>Sugerir termo</Button></div>
            </div>
          )}

          {!loading && !error && (
            <div className="mt-7 overflow-hidden rounded-lg border border-white/10 bg-dark-900/50">
              <PaginationControls pagination={pagination} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} pageSizeOptions={PAGE_SIZES} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
