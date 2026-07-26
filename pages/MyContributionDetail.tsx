import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CalendarClock, Edit3, ExternalLink, History } from 'lucide-react';
import { ContributionForm } from '../components/contributions/ContributionForm';
import { ContributionStatusBadge, EVENT_LABELS, REJECTION_REASON_LABELS } from '../components/contributions/ContributionStatusBadge';
import { Seo } from '../components/Seo';
import { Button } from '../components/UI';
import { useAuth } from '../src/context/AuthContext';
import { getContribution, updateContribution } from '../src/services/api';
import type { ContributionDetail, ContributionInput } from '../types';

export const MyContributionDetail: React.FC = () => {
  const { user } = useAuth();
  const { id = '' } = useParams();
  const [item, setItem] = useState<ContributionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getContribution(id).then(setItem).catch((requestError) => setError(requestError?.response?.data?.error || 'Não foi possível carregar a contribuição.')).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const latestDecision = useMemo(() => [...(item?.moderationEvents || [])].reverse().find((event) => ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED'].includes(event.type)), [item]);
  if (!user) return <Navigate to="/login" replace />;

  const save = async (value: ContributionInput) => {
    if (!item) return;
    const updated = await updateContribution(item.id, { ...value, expectedRevision: item.revision });
    setItem(updated);
    setEditing(false);
  };

  if (loading) return <main className="mx-auto min-h-[65vh] w-full max-w-5xl px-4 py-12"><div className="h-80 animate-pulse rounded border border-white/5 bg-dark-900" /></main>;
  if (!item || error) return <main className="mx-auto min-h-[65vh] w-full max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-white">Contribuição indisponível</h1><p className="mt-3 text-gray-400">{error}</p><Link to="/minhas-contribuicoes"><Button className="mt-6">Voltar</Button></Link></main>;

  const canEdit = item.status === 'PENDING' || item.status === 'CHANGES_REQUESTED';
  const initialValue: ContributionInput = { word: item.word, definition: item.definition, gameId: item.gameId || null, examples: item.examples || [], tags: item.tags || [] };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-10">
      <Seo title={`${item.word} | Minha contribuição`} noindex />
      <Link to="/minhas-contribuicoes" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Minhas contribuições</Link>

      <header className="border-b border-white/10 pb-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-white">{item.word}</h1><ContributionStatusBadge status={item.status} /></div><p className="mt-3 text-sm text-gray-500">Revisão {item.revision} · enviada em {new Date(item.createdAt || '').toLocaleDateString('pt-BR')}</p></div>
          <div className="flex flex-wrap gap-2">
            {canEdit && <Button onClick={() => setEditing((value) => !value)} variant={editing ? 'secondary' : 'primary'}><Edit3 className="h-4 w-4" /> {item.status === 'CHANGES_REQUESTED' ? 'Corrigir e reenviar' : 'Editar'}</Button>}
            {item.status === 'APPROVED' && !item.archivedAt && <Link to={`/term/${encodeURIComponent(item.word)}`}><Button variant="outline"><ExternalLink className="h-4 w-4" /> Ver termo publicado</Button></Link>}
            {item.status === 'APPROVED' && item.archivedAt && <span className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400">Termo arquivado pela equipe editorial</span>}
          </div>
        </div>
      </header>

      {latestDecision?.authorMessage && (
        <section className={`my-6 rounded-lg border p-5 ${item.status === 'REJECTED' ? 'border-red-500/25 bg-red-500/10' : item.status === 'CHANGES_REQUESTED' ? 'border-orange-500/25 bg-orange-500/10' : 'border-green-500/20 bg-green-500/10'}`}>
          <h2 className="font-bold text-white">Mensagem da moderação</h2>
          {latestDecision.rejectionReason && <p className="mt-2 text-sm font-semibold text-red-300">{REJECTION_REASON_LABELS[latestDecision.rejectionReason]}</p>}
          <p className="mt-2 text-sm leading-6 text-gray-300">{latestDecision.authorMessage}</p>
        </section>
      )}

      {editing ? (
        <section className="py-8"><ContributionForm initialValue={initialValue} onSubmit={save} onCancel={() => setEditing(false)} submitLabel={item.status === 'CHANGES_REQUESTED' ? 'Reenviar correção' : 'Salvar alterações'} /></section>
      ) : (
        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><BookOpen className="h-5 w-5 text-brand-400" /> Conteúdo enviado</h2>
            <p className="mt-5 whitespace-pre-wrap leading-7 text-gray-300">{item.definition}</p>
            <dl className="mt-6 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Jogo</dt><dd className="mt-1 font-semibold text-gray-200">{item.game?.name || 'Termo geral'}</dd></div><div><dt className="text-gray-500">Categorias</dt><dd className="mt-1 font-semibold text-gray-200">{item.tags.length ? item.tags.join(', ') : 'Sem categorias'}</dd></div></dl>
            {item.examples.length > 0 && <div className="mt-7"><h3 className="font-bold text-white">Exemplos</h3><ul className="mt-3 space-y-2 text-sm text-gray-400">{item.examples.map((example, index) => <li key={index} className="border-l-2 border-brand-500/40 pl-3">{example}</li>)}</ul></div>}
          </section>

          <aside>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><History className="h-5 w-5 text-brand-400" /> Histórico</h2>
            <ol className="mt-5 space-y-0 border-l border-white/10 pl-5">
              {item.moderationEvents.map((event) => <li key={event.id} className="relative pb-6"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-brand-400" /><p className="text-sm font-bold text-white">{EVENT_LABELS[event.type]}</p><p className="mt-1 flex items-center gap-1 text-xs text-gray-500"><CalendarClock className="h-3.5 w-3.5" /> {new Date(event.createdAt).toLocaleString('pt-BR')} · revisão {event.revision}</p>{event.authorMessage && <p className="mt-2 text-sm leading-5 text-gray-400">{event.authorMessage}</p>}</li>)}
            </ol>
          </aside>
        </div>
      )}
    </main>
  );
};
