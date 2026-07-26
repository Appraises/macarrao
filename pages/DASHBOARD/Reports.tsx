import React, { useEffect, useState } from 'react';
import { Archive, Check, ExternalLink, Flag, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { archiveAdminTerm, getReports, updateReportStatus } from '../../src/services/api';

const REASON_LABEL: Record<string, string> = {
  incorreto: 'Definicao incorreta', ofensivo: 'Conteudo ofensivo', spam: 'Spam', duplicado: 'Termo duplicado', outro: 'Outro'
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  RESOLVED: 'text-green-400 bg-green-500/10 border-green-500/20',
  DISMISSED: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
};

export const Reports: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const termId = params.get('termId') || undefined;

  const load = () => {
    setLoading(true);
    getReports(undefined, termId).then((data) => setReports(data || [])).catch(() => setNotice('Nao foi possivel carregar as denuncias.')).finally(() => setLoading(false));
  };
  useEffect(load, [termId]);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    try { await updateReportStatus(id, status); load(); }
    catch { setNotice('Nao foi possivel atualizar a denuncia.'); }
    finally { setBusy(null); }
  };

  const archiveAndResolve = async (termIdValue: string, reportId: string) => {
    if (!window.confirm('Arquivar este termo? Ele deixara de aparecer no site, mas podera ser restaurado pelo Catalogo.')) return;
    setBusy(reportId);
    try {
      await archiveAdminTerm(termIdValue);
      await updateReportStatus(reportId, 'RESOLVED');
      setNotice('Termo arquivado e denuncia resolvida.');
      load();
    } catch {
      setNotice('Nao foi possivel arquivar o termo.');
    } finally { setBusy(null); }
  };

  const pending = reports.filter((report) => report.status === 'PENDING').length;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Flag className="h-6 w-6 text-brand-500" /> Denuncias</h1><p className="mt-1 text-sm text-gray-500">{pending} pendente(s) de {reports.length} no total.</p></div><div className="flex gap-2">{termId && <button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('termId'); setParams(next); }} className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-sm text-gray-300"><X className="h-4 w-4" /> Remover filtro do termo</button>}<button type="button" onClick={load} className="h-9 rounded border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5">Atualizar</button></div></div>
    {notice && <div role="status" className="flex justify-between rounded border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Fechar"><X className="h-4 w-4" /></button></div>}
    {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded bg-white/5" />)}</div> : reports.length === 0 ? <div className="rounded border border-white/10 bg-dark-900 py-20 text-center text-gray-500">Nenhuma denuncia encontrada.</div> : <div className="space-y-3">{reports.map((report) => <article key={report.id} className="flex flex-col gap-4 rounded border border-white/10 bg-dark-900 p-4 md:flex-row md:items-center">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="font-bold text-white">{report.term?.word || '(termo removido)'}</span>{report.term?.archivedAt && <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">Arquivado</span>}<span className={`rounded border px-2 py-0.5 text-[11px] ${STATUS_STYLE[report.status] || ''}`}>{report.status}</span></div><p className="mt-1 text-sm text-gray-300"><span className="text-gray-500">Motivo:</span> {REASON_LABEL[report.reason] || report.reason}</p>{report.details && <p className="mt-1 text-sm italic text-gray-400">“{report.details}”</p>}<p className="mt-1 text-[11px] text-gray-600">{new Date(report.createdAt).toLocaleString('pt-BR')}</p></div>
      <div className="flex flex-none items-center gap-1">{report.status === 'PENDING' && <><button type="button" onClick={() => setStatus(report.id, 'RESOLVED')} disabled={busy === report.id} title="Resolver" className="grid h-9 w-9 place-items-center rounded text-green-400 hover:bg-green-500/10 disabled:opacity-50"><Check className="h-5 w-5" /></button><button type="button" onClick={() => setStatus(report.id, 'DISMISSED')} disabled={busy === report.id} title="Descartar" className="grid h-9 w-9 place-items-center rounded text-gray-400 hover:bg-white/5 disabled:opacity-50"><X className="h-5 w-5" /></button></>}{report.term?.id && !report.term.archivedAt && <button type="button" onClick={() => archiveAndResolve(report.term.id, report.id)} disabled={busy === report.id} title="Arquivar termo e resolver" className="grid h-9 w-9 place-items-center rounded text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"><Archive className="h-5 w-5" /></button>}{report.term?.id && <Link to={`/dashboard/terms/${report.term.id}`} title="Abrir no Catalogo" className="grid h-9 w-9 place-items-center rounded text-gray-400 hover:bg-white/5"><ExternalLink className="h-5 w-5" /></Link>}</div>
    </article>)}</div>}
  </div>;
};
