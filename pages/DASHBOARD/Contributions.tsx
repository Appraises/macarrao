import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Clock3, History, MessageSquareText, RotateCcw, Search, X } from 'lucide-react';
import { ContributionStatusBadge, EVENT_LABELS, REJECTION_REASON_LABELS, STATUS_LABELS } from '../../components/contributions/ContributionStatusBadge';
import { PaginationControls } from '../../components/PaginationControls';
import { Button } from '../../components/UI';
import { decideContribution, getAdminContribution, getAdminContributions, getGames } from '../../src/services/api';
import type { ContributionDetail, ContributionRejectionReason, ContributionSummary, Game, PaginationMeta, TermStatus } from '../../types';

const STATUSES: TermStatus[] = ['PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'];
const REASONS = Object.keys(REJECTION_REASON_LABELS) as ContributionRejectionReason[];
const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };

type DecisionAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export const Contributions: React.FC = () => {
  const [items, setItems] = useState<ContributionSummary[]>([]);
  const [selected, setSelected] = useState<ContributionDetail | null>(null);
  const [counts, setCounts] = useState<Record<TermStatus, number>>({ PENDING: 0, CHANGES_REQUESTED: 0, APPROVED: 0, REJECTED: 0 });
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<TermStatus>('PENDING');
  const [gameId, setGameId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<DecisionAction>('APPROVE');
  const [authorMessage, setAuthorMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState<ContributionRejectionReason>('INSUFFICIENT_DETAIL');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { getGames().then(setGames).catch(() => undefined); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getAdminContributions({ page, pageSize, status, gameId: gameId || undefined, search, order: 'asc' });
      setItems(result.items);
      setPagination(result.pagination);
      if (result.counts) setCounts(result.counts);
    } catch {
      setNotice('Não foi possível carregar a fila de contribuições.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [page, pageSize, status, gameId, search]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setNotice(null);
    try {
      const detail = await getAdminContribution(id);
      setSelected(detail);
      setAction(detail.status === 'CHANGES_REQUESTED' ? 'REJECT' : 'APPROVE');
      setAuthorMessage('');
      setInternalNote('');
    } catch {
      setNotice('Não foi possível abrir esta contribuição.');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitDecision = async () => {
    if (!selected) return;
    if (action === 'APPROVE' && !window.confirm(`Publicar “${selected.word}” no dicionário?`)) return;
    if (action !== 'APPROVE' && authorMessage.trim().length < 5) {
      setNotice('Escreva uma mensagem clara ao autor antes de concluir.');
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const updated = await decideContribution(selected.id, {
        action,
        expectedRevision: selected.revision,
        authorMessage: authorMessage.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        rejectionReason: action === 'REJECT' ? rejectionReason : undefined,
      });
      setSelected(updated);
      setNotice('Decisão registrada e autor notificado.');
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Não foi possível registrar a decisão.';
      setNotice(message);
      if (error?.response?.status === 409) {
        const fresh = await getAdminContribution(selected.id).catch(() => null);
        if (fresh) setSelected(fresh);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canModerate = selected && (selected.status === 'PENDING' || selected.status === 'CHANGES_REQUESTED');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Contribuições</h1>
        <p className="mt-1 text-sm text-gray-400">Fila de moderação com histórico, revisão e comunicação com o autor.</p>
      </header>

      {notice && <div role="status" className="flex items-start gap-3 rounded border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-gray-200"><MessageSquareText className="mt-0.5 h-4 w-4 flex-none text-brand-400" />{notice}</div>}

      <section aria-label="Estados da fila" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STATUSES.map((item) => <button type="button" key={item} onClick={() => { setStatus(item); setPage(1); }} className={`flex min-h-16 items-center justify-between rounded-lg border px-4 text-left ${status === item ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-dark-900 hover:border-white/20'}`}><span className="text-sm font-bold text-gray-200">{STATUS_LABELS[item]}</span><span className="text-xl font-black text-white">{counts[item]}</span></button>)}
      </section>

      <section className="grid gap-3 sm:grid-cols-[1fr_240px_auto]">
        <label className="relative"><span className="sr-only">Buscar contribuição</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Termo, definição, nome ou e-mail" className="h-11 w-full rounded-lg border border-white/10 bg-dark-900 pl-10 pr-3 text-sm text-white outline-none focus:border-brand-500" /></label>
        <select aria-label="Filtrar por jogo" value={gameId} onChange={(event) => { setGameId(event.target.value); setPage(1); }} className="h-11 rounded-lg border border-white/10 bg-dark-900 px-3 text-sm text-gray-200"><option value="">Todos os jogos</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select>
        <button type="button" onClick={() => { setSearchInput(''); setGameId(''); setPage(1); }} className="inline-flex h-11 items-center justify-center gap-2 rounded px-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"><RotateCcw className="h-4 w-4" /> Limpar</button>
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-dark-900">
        {loading ? <div className="p-12 text-center text-gray-500">Carregando fila...</div> : items.length === 0 ? <div className="p-14 text-center"><Check className="mx-auto h-9 w-9 text-green-500" /><h2 className="mt-4 font-bold text-white">Nenhum item neste estado</h2><p className="mt-1 text-sm text-gray-500">A fila está vazia para os filtros selecionados.</p></div> : <div className="divide-y divide-white/10">{items.map((item) => {
          const author = typeof item.author === 'object' ? item.author : null;
          return <button type="button" key={item.id} onClick={() => openDetail(item.id)} className="grid w-full gap-3 px-4 py-4 text-left hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1fr)_180px_150px_24px] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-bold text-white">{item.word}</span><ContributionStatusBadge status={item.status} />{item.archivedAt && <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">Arquivado</span>}</div><p className="mt-1 truncate text-sm text-gray-500">{item.definition}</p></div><div className="text-sm"><p className="truncate font-semibold text-gray-300">{author?.name || 'Autor removido'}</p><p className="truncate text-xs text-gray-600">{author?.email}</p></div><div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 className="h-4 w-4" /> {new Date(item.createdAt || '').toLocaleDateString('pt-BR')}</div><ChevronRight className="hidden h-4 w-4 text-gray-600 sm:block" /></button>;
        })}</div>}
        {!loading && pagination.total > 0 && <PaginationControls pagination={pagination} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} disabled={loading} />}
      </section>

      {(selected || detailLoading) && <div className="fixed inset-0 z-[80] bg-black/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Detalhes da contribuição"><div className="ml-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/10 bg-dark-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5"><div>{selected && <><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold text-white">{selected.word}</h2><ContributionStatusBadge status={selected.status} /></div><p className="mt-2 text-sm text-gray-500">Revisão {selected.revision} · {selected.game?.name || 'Termo geral'}</p></>}</div><button type="button" aria-label="Fechar" onClick={() => setSelected(null)} className="grid h-9 w-9 flex-none place-items-center rounded hover:bg-white/5"><X className="h-5 w-5" /></button></header>
        {detailLoading || !selected ? <div className="grid flex-1 place-items-center text-gray-500">Carregando detalhes...</div> : <div className="flex-1 overflow-y-auto p-5 sm:p-7"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section><h3 className="text-sm font-bold uppercase text-gray-500">Conteúdo enviado</h3><p className="mt-4 whitespace-pre-wrap leading-7 text-gray-300">{selected.definition}</p>{selected.examples.length > 0 && <div className="mt-6"><h4 className="font-bold text-white">Exemplos</h4><ul className="mt-2 space-y-2 text-sm text-gray-400">{selected.examples.map((example, index) => <li key={index} className="border-l-2 border-brand-500/30 pl-3">{example}</li>)}</ul></div>}<div className="mt-6 flex flex-wrap gap-2">{selected.tags.map((tag) => <span key={tag} className="rounded border border-white/10 px-2 py-1 text-xs text-gray-400">{tag}</span>)}</div></section>
          <aside><h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500"><History className="h-4 w-4" /> Histórico</h3><ol className="mt-4 border-l border-white/10 pl-4">{selected.moderationEvents.map((event) => <li key={event.id} className="relative pb-5"><span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-brand-400" /><p className="text-sm font-bold text-white">{EVENT_LABELS[event.type]}</p><p className="mt-1 text-xs text-gray-600">{new Date(event.createdAt).toLocaleString('pt-BR')} · rev. {event.revision}</p>{event.authorMessage && <p className="mt-2 text-sm text-gray-400">Ao autor: {event.authorMessage}</p>}{event.internalNote && <p className="mt-2 rounded border border-yellow-500/15 bg-yellow-500/5 p-2 text-xs text-yellow-200">Nota interna: {event.internalNote}</p>}</li>)}</ol></aside>
        </div>

        {canModerate && <section className="mt-8 border-t border-white/10 pt-7"><h3 className="text-lg font-bold text-white">Registrar decisão</h3><div className="mt-5 grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-gray-300">Ação<select value={action} onChange={(event) => setAction(event.target.value as DecisionAction)} className="h-11 rounded border border-white/10 bg-dark-900 px-3 text-sm text-gray-200">{selected.status === 'PENDING' && <><option value="APPROVE">Aprovar e publicar</option><option value="REQUEST_CHANGES">Solicitar revisão</option></>}<option value="REJECT">Rejeitar definitivamente</option></select></label>
          {action === 'REJECT' && <label className="grid gap-2 text-sm font-semibold text-gray-300">Motivo<select value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value as ContributionRejectionReason)} className="h-11 rounded border border-white/10 bg-dark-900 px-3 text-sm text-gray-200">{REASONS.map((reason) => <option key={reason} value={reason}>{REJECTION_REASON_LABELS[reason]}</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-semibold text-gray-300">Mensagem ao autor {action === 'APPROVE' && <span className="font-normal text-gray-600">(opcional)</span>}<textarea value={authorMessage} onChange={(event) => setAuthorMessage(event.target.value)} maxLength={1000} rows={4} placeholder={action === 'REQUEST_CHANGES' ? 'Explique exatamente o que precisa ser corrigido.' : action === 'REJECT' ? 'Explique por que a contribuição não pode ser aceita.' : 'Mensagem adicional de agradecimento.'} className="resize-y rounded border border-white/10 bg-dark-900 p-3 text-sm text-gray-200 outline-none focus:border-brand-500" /></label>
          <label className="grid gap-2 text-sm font-semibold text-gray-300">Nota interna <span className="font-normal text-gray-600">(somente administradores)</span><textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={2000} rows={3} className="resize-y rounded border border-white/10 bg-dark-900 p-3 text-sm text-gray-200 outline-none focus:border-brand-500" /></label>
          <div className="sticky bottom-0 z-10 -mx-5 -mb-5 flex justify-end border-t border-white/10 bg-dark-950/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7"><Button onClick={submitDecision} disabled={submitting}>{submitting ? 'Registrando...' : 'Confirmar decisão'}</Button></div>
        </div></section>}
        {!canModerate && <div className="mt-8 flex items-center gap-3 rounded border border-white/10 p-4 text-sm text-gray-400"><AlertTriangle className="h-4 w-4" /> Esta contribuição já possui uma decisão final.</div>}
        </div>}
      </div></div>}
    </div>
  );
};
