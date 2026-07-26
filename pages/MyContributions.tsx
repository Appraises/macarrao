import React, { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronRight, ClipboardList, Plus, RotateCcw } from 'lucide-react';
import { ContributionStatusBadge, STATUS_LABELS } from '../components/contributions/ContributionStatusBadge';
import { PaginationControls } from '../components/PaginationControls';
import { Seo } from '../components/Seo';
import { Button } from '../components/UI';
import { useAuth } from '../src/context/AuthContext';
import { getGames, getMyContributions } from '../src/services/api';
import type { ContributionSummary, Game, PaginationMeta, TermStatus } from '../types';

const STATUSES: TermStatus[] = ['PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];
const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: 12, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };

export const MyContributions: React.FC = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status') as TermStatus | null;
  const status = statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = [12, 24, 48].includes(Number(params.get('pageSize'))) ? Number(params.get('pageSize')) : 12;
  const gameId = params.get('game') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const [items, setItems] = useState<ContributionSummary[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { if (user) getGames().then(setGames).catch(() => undefined); }, [user]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyContributions({ page, pageSize, status, gameId: gameId || undefined, from: from || undefined, to: to || undefined })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setPagination(result.pagination);
      })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar suas contribuições.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, page, pageSize, status, gameId, from, to, reloadKey]);

  if (!user) return <Navigate to="/login" replace />;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const clear = () => setParams({}, { replace: true });

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-7xl px-4 py-10">
      <Seo title="Minhas contribuições" path="/minhas-contribuicoes" noindex />
      <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-brand-400"><ClipboardList className="h-4 w-4" /> Comunidade</span>
          <h1 className="mt-2 text-3xl font-bold text-white">Minhas contribuições</h1>
          <p className="mt-2 max-w-full break-words text-sm text-gray-400">Acompanhe decisões, orientações e correções em um só lugar.</p>
        </div>
        <Link to="/contribuir"><Button><Plus className="h-4 w-4" /> Nova contribuição</Button></Link>
      </header>

      <section aria-label="Filtros" className="border-b border-white/10 py-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setParam('status', '')} className={`h-9 flex-none rounded border px-3 text-sm font-semibold ${!status ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-white/10 text-gray-400'}`}>Todas</button>
          {STATUSES.map((item) => <button type="button" key={item} onClick={() => setParam('status', item)} className={`h-9 flex-none rounded border px-3 text-sm font-semibold ${status === item ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-white/10 text-gray-400'}`}>{STATUS_LABELS[item]}</button>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="grid gap-1 text-xs font-bold uppercase text-gray-500">Jogo<select value={gameId} onChange={(event) => setParam('game', event.target.value)} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm font-normal normal-case text-gray-200"><option value="">Todos os jogos</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold uppercase text-gray-500">De<input type="date" value={from} onChange={(event) => setParam('from', event.target.value)} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm font-normal text-gray-200" /></label>
          <label className="grid gap-1 text-xs font-bold uppercase text-gray-500">Até<input type="date" value={to} onChange={(event) => setParam('to', event.target.value)} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm font-normal text-gray-200" /></label>
          <button type="button" onClick={clear} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded px-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"><RotateCcw className="h-4 w-4" /> Limpar</button>
        </div>
      </section>

      <section className="py-7" aria-busy={loading}>
        {error && <div className="mb-5 flex items-center justify-between rounded border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-bold underline">Tentar novamente</button></div>}
        {loading ? (
          <div className="grid gap-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded border border-white/5 bg-dark-900" />)}</div>
        ) : items.length ? (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {items.map((item) => {
              const latest = item.moderationEvents[0];
              return (
                <Link key={item.id} to={`/minhas-contribuicoes/${item.id}`} className="grid gap-4 px-2 py-5 transition-colors hover:bg-white/[0.03] sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3"><h2 className="truncate text-lg font-bold text-white">{item.word}</h2><ContributionStatusBadge status={item.status} />{item.archivedAt && <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">Arquivado</span>}</div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{latest?.authorMessage || item.definition}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500"><span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {item.game?.name || 'Termo geral'}</span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {new Date(item.updatedAt || item.createdAt || '').toLocaleDateString('pt-BR')}</span><span>Revisão {item.revision}</span></div>
                  </div>
                  <ChevronRight className="hidden h-5 w-5 text-gray-600 sm:block" />
                </Link>
              );
            })}
          </div>
        ) : !error && (
          <div className="py-20 text-center"><ClipboardList className="mx-auto h-10 w-10 text-gray-700" /><h2 className="mt-4 text-xl font-bold text-white">Nenhuma contribuição encontrada</h2><p className="mt-2 text-sm text-gray-500">Ajuste os filtros ou envie o primeiro termo.</p><Link to="/contribuir"><Button className="mt-6">Nova contribuição</Button></Link></div>
        )}
        {!loading && !error && pagination.total > 0 && <div className="mt-6 rounded border border-white/10"><PaginationControls pagination={pagination} onPageChange={(value) => setParam('page', String(value))} onPageSizeChange={(value) => setParam('pageSize', String(value))} pageSizeOptions={[12, 24, 48]} /></div>}
      </section>
    </main>
  );
};
