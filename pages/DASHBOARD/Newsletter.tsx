import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Mail, RefreshCw, Search, Send, Users, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PaginationControls } from '../../components/PaginationControls';
import {
  getNewsletterCampaign,
  getNewsletterCampaigns,
  getNewsletterOverview,
  getNewsletterSubscribers,
  retryNewsletterCampaign,
  sendNewsletterTest,
} from '../../src/services/api';
import type {
  NewsletterCampaignDetail,
  NewsletterCampaignStatus,
  NewsletterCampaignSummary,
  NewsletterDeliveryStatus,
  NewsletterOverview,
  NewsletterSubscriberStatus,
  NewsletterSubscriberSummary,
  PaginationMeta,
} from '../../types';

const EMPTY: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };
const subscriberLabels: Record<NewsletterSubscriberStatus, string> = { PENDING: 'Pendente', ACTIVE: 'Ativo', UNSUBSCRIBED: 'Descadastrado', BOUNCED: 'Bounce', COMPLAINED: 'Reclamação', SUPPRESSED: 'Suprimido' };
const campaignLabels: Record<NewsletterCampaignStatus, string> = { RUNNING: 'Em envio', COMPLETED: 'Concluída', PARTIAL: 'Parcial', FAILED: 'Falhou', SKIPPED: 'Ignorada' };
const deliveryLabels: Record<NewsletterDeliveryStatus, string> = { QUEUED: 'Na fila', SENDING: 'Enviando', SENT: 'Enviado', DELIVERED: 'Entregue', DELAYED: 'Atrasado', FAILED: 'Falhou', BOUNCED: 'Bounce', COMPLAINED: 'Reclamação', SUPPRESSED: 'Suprimido' };
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('pt-BR') : '—';
const count = (source: Record<string, number | undefined> | undefined, ...keys: string[]) => keys.reduce((total, key) => total + (source?.[key] || 0), 0);

const StatusPill: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const tone = /ACTIVE|COMPLETED|DELIVERED/.test(value) ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : /FAILED|BOUNCED|COMPLAINED/.test(value) ? 'border-rose-500/25 bg-rose-500/10 text-rose-300' : /PARTIAL|PENDING|DELAYED/.test(value) ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-gray-400';
  return <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</span>;
};

const Kpi: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => <div className="rounded border border-white/10 bg-dark-900 p-4"><div className="flex items-center justify-between text-gray-500">{icon}<span className="text-[10px] font-bold uppercase">{label}</span></div><strong className="mt-3 block text-2xl text-white">{value.toLocaleString('pt-BR')}</strong></div>;

export const Newsletter: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'subscribers' ? 'subscribers' : 'campaigns';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';
  const status = params.get('status') || '';
  const source = params.get('source') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const [overview, setOverview] = useState<NewsletterOverview | null>(null);
  const [campaigns, setCampaigns] = useState<NewsletterCampaignSummary[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberSummary[]>([]);
  const [pagination, setPagination] = useState(EMPTY);
  const [detail, setDetail] = useState<NewsletterCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const update = (values: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value === null || value === '' ? next.delete(key) : next.set(key, String(value)));
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await getNewsletterOverview();
      setOverview(summary);
      if (tab === 'campaigns') {
        const result = await getNewsletterCampaigns({ page, pageSize: 20, search, status: status as NewsletterCampaignStatus || undefined });
        setCampaigns(result.items); setPagination(result.pagination);
      } else {
        const result = await getNewsletterSubscribers({ page, pageSize: 20, search, status: status as NewsletterSubscriberStatus || undefined, source: source || undefined, from: from || undefined, to: to || undefined });
        setSubscribers(result.items); setPagination(result.pagination);
      }
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.response?.data?.error || 'Não foi possível carregar a newsletter.' });
    } finally { setLoading(false); }
  }, [tab, page, search, status, source, from, to]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 200); return () => window.clearTimeout(timer); }, [load]);

  const openCampaign = async (id: string, detailPage = 1) => {
    setBusy(id);
    try { setDetail(await getNewsletterCampaign(id, { page: detailPage, pageSize: 50 })); }
    catch { setNotice({ kind: 'error', text: 'Não foi possível abrir as entregas.' }); }
    finally { setBusy(''); }
  };
  const sendTest = async () => {
    setBusy('test'); setNotice(null);
    try { await sendNewsletterTest(); setNotice({ kind: 'success', text: 'Prévia enviada ao seu e-mail administrativo.' }); }
    catch (error: any) { setNotice({ kind: 'error', text: error?.response?.data?.error || 'A prévia não foi enviada.' }); }
    finally { setBusy(''); }
  };
  const retry = async (id: string) => {
    if (!window.confirm('Retentar apenas as entregas com falha segura desta campanha?')) return;
    setBusy(id); setNotice(null);
    try { await retryNewsletterCampaign(id); setNotice({ kind: 'success', text: 'Retentativa concluída.' }); setDetail(null); await load(); }
    catch (error: any) { setNotice({ kind: 'error', text: error?.response?.data?.error || 'Não foi possível retentar.' }); }
    finally { setBusy(''); }
  };

  const blocked = useMemo(() => count(overview?.subscribers, 'BOUNCED', 'COMPLAINED', 'SUPPRESSED'), [overview]);
  return <div className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-brand-400">Comunicação</p><h1 className="mt-1 text-2xl font-bold text-white">Newsletter</h1><p className="mt-1 text-sm text-gray-500">Termo do Dia, confirmações e saúde de entrega.</p></div><button type="button" onClick={sendTest} disabled={busy === 'test' || !overview?.provider.configured} className="inline-flex h-10 items-center gap-2 rounded border border-brand-500/30 px-4 text-sm font-bold text-brand-300 disabled:opacity-40"><Send className="h-4 w-4" />Enviar prévia</button></div>

    {notice && <div className={`rounded border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}>{notice.text}</div>}
    {overview && (!overview.provider.configured || !overview.provider.webhookConfigured || !overview.provider.automaticSending) && <div className="flex items-start gap-3 rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /><span>{!overview.provider.configured ? 'Resend ou URL pública ainda não configurados. ' : ''}{!overview.provider.webhookConfigured ? 'Webhook ainda não configurado. ' : ''}{!overview.provider.automaticSending ? 'Envio automático desativado.' : ''}</span></div>}

    <div><div className="grid grid-cols-2 gap-3 lg:grid-cols-6"><Kpi label="Ativos" value={overview?.subscribers.ACTIVE || 0} icon={<Users className="h-4 w-4" />} /><Kpi label="Pendentes" value={overview?.subscribers.PENDING || 0} icon={<Clock3 className="h-4 w-4" />} /><Kpi label="Bloqueados" value={blocked} icon={<XCircle className="h-4 w-4" />} /><Kpi label="Entregues" value={overview?.deliveries.DELIVERED || 0} icon={<CheckCircle2 className="h-4 w-4" />} /><Kpi label="Cliques estim." value={overview?.estimatedClicks || 0} icon={<Mail className="h-4 w-4" />} /><Kpi label="Campanhas" value={count(overview?.campaigns, 'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED')} icon={<Mail className="h-4 w-4" />} /></div><p className="mt-2 text-xs text-gray-600">Bounces: {overview?.subscribers.BOUNCED || 0} · Reclamações: {overview?.subscribers.COMPLAINED || 0} · Supressões: {overview?.subscribers.SUPPRESSED || 0}. Cliques são estimados e podem incluir verificadores automáticos de e-mail.</p></div>

    <div className="flex flex-wrap items-center gap-3 border-y border-white/10 py-4"><div className="flex rounded border border-white/10 p-1">{(['campaigns', 'subscribers'] as const).map((item) => <button key={item} type="button" onClick={() => { setDetail(null); update({ tab: item, page: 1, status: null, source: null, from: null, to: null }); }} className={`h-8 px-3 text-xs font-bold ${tab === item ? 'bg-white/10 text-white' : 'text-gray-500'}`}>{item === 'campaigns' ? 'Disparos' : 'Inscritos'}</button>)}</div><div className="relative min-w-[220px] flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input value={search} onChange={(event) => update({ search: event.target.value, page: 1 })} placeholder={tab === 'campaigns' ? 'Buscar termo ou data' : 'Buscar e-mail'} className="h-10 w-full rounded border border-white/10 bg-dark-900 pl-9 pr-3 text-sm text-white" /></div><select value={status} onChange={(event) => update({ status: event.target.value, page: 1 })} className="h-10 rounded border border-white/10 bg-dark-900 px-3 text-sm text-gray-300"><option value="">Todos os estados</option>{(tab === 'campaigns' ? Object.entries(campaignLabels) : Object.entries(subscriberLabels)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{tab === 'subscribers' && <><input value={source} onChange={(event) => update({ source: event.target.value, page: 1 })} placeholder="Origem" aria-label="Origem da inscrição" className="h-10 w-32 rounded border border-white/10 bg-dark-900 px-3 text-sm text-white" /><input type="date" value={from} onChange={(event) => update({ from: event.target.value, page: 1 })} aria-label="Inscritos desde" className="h-10 rounded border border-white/10 bg-dark-900 px-3 text-sm text-gray-300" /><input type="date" value={to} onChange={(event) => update({ to: event.target.value, page: 1 })} aria-label="Inscritos até" className="h-10 rounded border border-white/10 bg-dark-900 px-3 text-sm text-gray-300" /></>}</div>

    {tab === 'campaigns' ? <div className="overflow-hidden rounded border border-white/10 bg-dark-900"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-gray-500"><tr><th className="p-4">Data e termo</th><th className="p-4">Estado</th><th className="p-4">Enviados</th><th className="p-4">Entregues</th><th className="p-4">Cliques</th><th className="p-4">Problemas</th><th className="p-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={7} className="p-10 text-center text-gray-500">Carregando...</td></tr> : campaigns.length ? campaigns.map((item) => <tr key={item.id} className="hover:bg-white/[0.03]"><td className="p-4"><strong className="block text-white">{item.termWord}</strong><span className="text-xs text-gray-600">{item.dateKey} · {item.termGame || 'Geral'}</span></td><td className="p-4"><StatusPill value={item.status} label={campaignLabels[item.status]} /></td><td className="p-4 text-gray-300">{count(item.deliveryCounts, 'SENT', 'DELIVERED', 'DELAYED')}</td><td className="p-4 text-emerald-300">{item.deliveryCounts.DELIVERED || 0}</td><td className="p-4 text-brand-300">{item.uniqueClicks}</td><td className="p-4 text-rose-300">{count(item.deliveryCounts, 'FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED')}</td><td className="p-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openCampaign(item.id)} className="rounded border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300">Detalhes</button>{(item.deliveryCounts.FAILED || 0) > 0 && <button type="button" disabled={busy === item.id} onClick={() => retry(item.id)} title="Retentar falhas" className="grid h-8 w-8 place-items-center rounded border border-amber-500/20 text-amber-300"><RefreshCw className={`h-4 w-4 ${busy === item.id ? 'animate-spin' : ''}`} /></button>}</div></td></tr>) : <tr><td colSpan={7} className="p-10 text-center text-gray-500">Nenhum disparo encontrado.</td></tr>}</tbody></table></div><PaginationControls pagination={pagination} onPageChange={(value) => update({ page: value })} disabled={loading} /></div> : <div className="overflow-hidden rounded border border-white/10 bg-dark-900"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-gray-500"><tr><th className="p-4">E-mail</th><th className="p-4">Estado</th><th className="p-4">Origem</th><th className="p-4">Confirmação</th><th className="p-4">Último envio</th></tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={5} className="p-10 text-center text-gray-500">Carregando...</td></tr> : subscribers.length ? subscribers.map((item) => <tr key={item.id}><td className="p-4 font-medium text-white">{item.email}</td><td className="p-4"><StatusPill value={item.status} label={subscriberLabels[item.status]} /></td><td className="p-4 text-gray-500">{item.source || '—'}</td><td className="p-4 text-gray-500">{dateTime(item.confirmedAt || item.confirmationSentAt)}</td><td className="p-4 text-gray-500">{dateTime(item.lastSentAt)}</td></tr>) : <tr><td colSpan={5} className="p-10 text-center text-gray-500">Nenhum inscrito encontrado.</td></tr>}</tbody></table></div><PaginationControls pagination={pagination} onPageChange={(value) => update({ page: value })} disabled={loading} /></div>}

    {detail && <section className="rounded border border-white/10 bg-dark-900"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4"><div><p className="text-xs font-bold uppercase text-brand-400">Entregas de {detail.campaign.dateKey}</p><h2 className="mt-1 text-lg font-bold text-white">{detail.campaign.termWord}</h2></div><button type="button" onClick={() => setDetail(null)} className="text-sm text-gray-500">Fechar</button></div><div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-4">{(['DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED'] as NewsletterDeliveryStatus[]).map((key) => <div key={key} className="bg-dark-900 p-4"><span className="text-[10px] font-bold uppercase text-gray-600">{deliveryLabels[key]}</span><strong className="mt-1 block text-xl text-white">{detail.deliveryCounts[key] || 0}</strong></div>)}</div><div className="divide-y divide-white/5">{detail.deliveries.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div className="min-w-0"><strong className="block truncate text-gray-200">{item.subscriber?.email || 'Assinante removido'}</strong><span className="text-xs text-gray-600">{item.lastError || `Tentativas: ${item.attempts}`}</span></div><StatusPill value={item.status} label={deliveryLabels[item.status]} /></div>)}</div><PaginationControls pagination={detail.pagination} onPageChange={(value) => openCampaign(detail.campaign.id, value)} disabled={busy === detail.campaign.id} /></section>}
  </div>;
};
