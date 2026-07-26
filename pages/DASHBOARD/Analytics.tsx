import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Download, ExternalLink, Info, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  downloadAnalyticsCsv, getAnalyticsCommunity, getAnalyticsDictionary, getAnalyticsOverview,
  getAnalyticsQuality, getAnalyticsSeo, getAnalyticsTraffic, syncAnalytics,
} from '../../src/services/api';
import type {
  AnalyticsCommunity, AnalyticsDictionary, AnalyticsOverview, AnalyticsQuality, AnalyticsSeo,
  AnalyticsTraffic, MetricValue, ProviderFreshness,
} from '../../types';

type Tab = 'overview' | 'traffic' | 'seo' | 'dictionary' | 'community' | 'quality';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Visão geral' }, { id: 'traffic', label: 'Aquisição' },
  { id: 'seo', label: 'SEO' }, { id: 'dictionary', label: 'Dicionário' },
  { id: 'community', label: 'Comunidade' }, { id: 'quality', label: 'Qualidade' },
];
const DAY = 86_400_000;
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const defaultRange = (days = 28) => ({ to: isoDate(new Date()), from: isoDate(new Date(Date.now() - (days - 1) * DAY)) });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const formatted = new Intl.NumberFormat('pt-BR');
const percent = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;
const duration = (hours: number) => hours < 24 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} d`;
const chartDate = (value: string | Date) => {
  const date = value instanceof Date ? isoDate(value) : value.slice(0, 10);
  return new Date(`${date}T12:00:00`);
};

const Delta: React.FC<{ metric: MetricValue; inverse?: boolean }> = ({ metric, inverse = false }) => {
  const positive = inverse ? metric.deltaPercent <= 0 : metric.deltaPercent >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const DirectionIcon = inverse ? (metric.deltaPercent <= 0 ? TrendingDown : TrendingUp) : Icon;
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}><DirectionIcon className="h-3.5 w-3.5" />{Math.abs(metric.deltaPercent).toFixed(1)}%</span>;
};

const MetricCard: React.FC<{ label: string; metric?: MetricValue; value?: string | number; hint?: string; inverse?: boolean }> = ({ label, metric, value, hint, inverse }) => (
  <div className="min-h-[112px] min-w-0 rounded-lg border border-white/10 bg-dark-900 p-4">
    <p className="min-h-8 text-xs font-bold uppercase text-gray-500">{label}</p>
    <div className="mt-1 flex items-end justify-between gap-3"><strong className="min-w-0 truncate text-2xl text-white">{value ?? compact.format(metric?.value || 0)}</strong>{metric && <Delta metric={metric} inverse={inverse} />}</div>
    {hint && <p className="mt-2 text-xs text-gray-600">{hint}</p>}
  </div>
);

const ProviderStatus: React.FC<{ provider: ProviderFreshness }> = ({ provider }) => {
  const tone = provider.state === 'READY' ? 'text-emerald-400' : provider.state === 'STALE' ? 'text-amber-400' : provider.state === 'ERROR' ? 'text-rose-400' : 'text-gray-500';
  const content = <><span className="h-1.5 w-1.5 rounded-full bg-current" />{provider.provider.replace('_', ' ')}{provider.dashboardUrl && <ExternalLink className="h-3 w-3" />}</>;
  return provider.dashboardUrl
    ? <a href={provider.dashboardUrl} target="_blank" rel="noreferrer" title={provider.message || `Abrir ${provider.provider}`} className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${tone}`}>{content}</a>
    : <span title={provider.message || undefined} className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone}`}>{content}</span>;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="min-w-0 border-t border-white/10 pt-5"><h2 className="mb-4 text-base font-bold text-white">{title}</h2>{children}</section>
);
const Empty: React.FC<{ text?: string }> = ({ text = 'Ainda não há dados para este período.' }) => <div className="border-y border-white/10 py-12 text-center text-sm text-gray-500">{text}</div>;

const SimpleTable: React.FC<{ columns: string[]; rows: Array<Array<React.ReactNode>> }> = ({ columns, rows }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);
  if (!rows.length) return <Empty />;
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  return <div className="rounded-lg border border-white/10"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-dark-900 text-xs uppercase text-gray-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{visibleRows.map((row, index) => <tr key={`${page}-${index}`} className="text-gray-300 hover:bg-white/[0.03]">{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-[360px] truncate px-4 py-3">{cell}</td>)}</tr>)}</tbody></table></div>{totalPages > 1 && <div className="flex h-11 items-center justify-end gap-3 border-t border-white/10 px-3"><span className="text-xs text-gray-500">{page} de {totalPages}</span><button type="button" title="Página anterior" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="grid h-8 w-8 place-items-center text-gray-400 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button type="button" title="Próxima página" aria-label="Próxima página" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="grid h-8 w-8 place-items-center text-gray-400 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}</div>;
};

const TrendChart: React.FC<{ data: any[]; keys: string[] }> = ({ data, keys }) => data.length ? (
  <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => chartDate(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} width={42} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6 }} labelFormatter={(v) => chartDate(v).toLocaleDateString('pt-BR')} />{keys.map((key, index) => <Line key={key} type="monotone" dataKey={key} stroke={['#22c55e', '#38bdf8', '#f59e0b'][index % 3]} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></div>
) : <Empty />;

const ProductTrendChart: React.FC<{ data: AnalyticsOverview['productTrend'] }> = ({ data }) => data.length ? (
  <div className="min-w-0" role="img" aria-label="Evolução diária de visitantes orgânicos, buscas e termos abertos">
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-400">
      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Visitantes orgânicos</span>
      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-400" />Buscas</span>
      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Termos abertos</span>
    </div>
    <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => chartDate(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} width={42} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6 }} labelFormatter={(v) => chartDate(v).toLocaleDateString('pt-BR')} /><Line type="monotone" dataKey="organicVisitors" name="Visitantes orgânicos" stroke="#34d399" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="searches" name="Buscas" stroke="#38bdf8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="termsOpened" name="Termos abertos" stroke="#fbbf24" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
  </div>
) : <Empty />;

const RankingPanel: React.FC<{ title: string; actionLabel: string; onAction: () => void; children: React.ReactNode }> = ({ title, actionLabel, onAction, children }) => (
  <article className="min-w-0 rounded-lg border border-white/10 bg-dark-900">
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/10 px-4"><h3 className="text-sm font-bold text-white">{title}</h3><button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300">{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></button></div>
    {children}
  </article>
);

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'overview') as Tab;
  const fallback = defaultRange();
  const from = params.get('from') || fallback.from;
  const to = params.get('to') || fallback.to;
  const query = useMemo(() => ({ from, to, compare: 'previous' as const }), [from, to]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [traffic, setTraffic] = useState<AnalyticsTraffic | null>(null);
  const [seo, setSeo] = useState<AnalyticsSeo | null>(null);
  const [dictionary, setDictionary] = useState<AnalyticsDictionary | null>(null);
  const [community, setCommunity] = useState<AnalyticsCommunity | null>(null);
  const [quality, setQuality] = useState<AnalyticsQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    const request = tab === 'overview' ? getAnalyticsOverview(query) : tab === 'traffic' ? getAnalyticsTraffic(query) : tab === 'seo' ? getAnalyticsSeo(query) : tab === 'dictionary' ? getAnalyticsDictionary(query) : tab === 'community' ? getAnalyticsCommunity(query) : getAnalyticsQuality(query);
    const overviewRequest = tab === 'overview' ? request : getAnalyticsOverview(query);
    Promise.all([request, overviewRequest]).then(([result, overviewResult]) => {
      if (!active) return;
      setOverview(overviewResult as AnalyticsOverview);
      if (tab === 'traffic') setTraffic(result as AnalyticsTraffic);
      else if (tab === 'seo') setSeo(result as AnalyticsSeo);
      else if (tab === 'dictionary') setDictionary(result as AnalyticsDictionary);
      else if (tab === 'community') setCommunity(result as AnalyticsCommunity);
      else if (tab === 'quality') setQuality(result as AnalyticsQuality);
    }).catch(() => active && setError('Não foi possível carregar este relatório.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tab, query, reload]);

  const updateParams = (values: Record<string, string | undefined>) => { const next = new URLSearchParams(params); Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setParams(next, { replace: true }); };
  const setPreset = (days: number) => updateParams(defaultRange(days));
  const runSync = async () => { setSyncing(true); try { await syncAnalytics(); window.setTimeout(() => setReload((v) => v + 1), 1500); } catch { setError('A sincronização não pôde ser iniciada.'); } finally { setSyncing(false); } };
  const exportSection = () => void downloadAnalyticsCsv(tab, query).catch(() => setError('Não foi possível exportar o CSV.'));
  const openOverviewAction = (action: AnalyticsOverview['attention'][number]['action']) => {
    if (action.kind === 'TAB' && TABS.some((item) => item.id === action.target)) updateParams({ tab: action.target });
    else if (action.kind === 'ROUTE') navigate(action.target);
  };

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-5 xl:flex-row xl:items-end">
      <div><p className="text-xs font-bold uppercase text-emerald-400">Dados e crescimento</p><h1 className="mt-1 text-2xl font-black text-white">Analytics</h1><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{overview?.providers.map((provider) => <ProviderStatus key={provider.provider} provider={provider} />)}</div></div>
      <div className="flex flex-wrap items-end gap-2"><div className="flex h-10 rounded-lg border border-white/10 p-1">{[7, 28, 90].map((days) => <button key={days} type="button" onClick={() => setPreset(days)} className="px-3 text-xs font-bold text-gray-400 hover:text-white">{days}d</button>)}</div><label className="text-[10px] font-bold uppercase text-gray-500">De<input type="date" value={from} max={to} onChange={(e) => updateParams({ from: e.target.value })} className="mt-1 block h-10 rounded-lg border border-white/10 bg-dark-900 px-3 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase text-gray-500">Até<input type="date" value={to} min={from} onChange={(e) => updateParams({ to: e.target.value })} className="mt-1 block h-10 rounded-lg border border-white/10 bg-dark-900 px-3 text-sm text-white" /></label><button type="button" title="Exportar CSV" onClick={exportSection} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-gray-400 hover:text-white"><Download className="h-4 w-4" /></button><button type="button" title="Sincronizar provedores" onClick={() => void runSync()} disabled={syncing} className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-dark-950 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /></button></div>
    </header>
    <nav className="flex overflow-x-auto border-b border-white/10" aria-label="Seções de analytics">{TABS.map((item) => <button key={item.id} type="button" onClick={() => updateParams({ tab: item.id })} className={`h-11 flex-none border-b-2 px-4 text-sm font-bold ${tab === item.id ? 'border-emerald-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{item.label}</button>)}</nav>
    {error && <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button onClick={() => setReload((v) => v + 1)} className="font-bold underline">Tentar novamente</button></div>}
    {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-dark-900" />)}</div> : <>{tab === 'overview' && overview && <OverviewTab data={overview} onAction={openOverviewAction} onOpenTab={(nextTab) => updateParams({ tab: nextTab })} />}{tab === 'traffic' && traffic && <TrafficTab data={traffic} />}{tab === 'seo' && seo && <SeoTab data={seo} />}{tab === 'dictionary' && dictionary && <DictionaryTab data={dictionary} />}{tab === 'community' && community && <CommunityTab data={community} />}{tab === 'quality' && quality && <QualityTab data={quality} />}</>}
  </div>;
};

const OverviewTab: React.FC<{ data: AnalyticsOverview; onAction: (action: AnalyticsOverview['attention'][number]['action']) => void; onOpenTab: (tab: Tab) => void }> = ({ data, onAction, onOpenTab }) => {
  const coreMetrics = [
    { label: 'Visitantes orgânicos', metric: data.coreMetrics.organicVisitors },
    { label: 'Busca → termo', metric: data.coreMetrics.searchSuccessRate, value: percent(data.coreMetrics.searchSuccessRate.value), hint: 'Abertura de termo em até 30 minutos' },
    { label: 'Retorno orgânico', metric: data.coreMetrics.organicReturnRate, value: percent(data.coreMetrics.organicReturnRate.value), hint: 'Estimativa agregada por navegador' },
    { label: 'Conversão em cadastro', metric: data.coreMetrics.signupConversionRate, value: percent(data.coreMetrics.signupConversionRate.value), hint: 'Cadastros ÷ visitantes únicos' },
    { label: 'Contribuições', metric: data.coreMetrics.contributions },
    { label: 'Mediana de moderação', metric: data.coreMetrics.medianModerationHours, value: duration(data.coreMetrics.medianModerationHours.value), inverse: true },
  ];
  return <div className="space-y-7">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{coreMetrics.map((item) => <MetricCard key={item.label} {...item} />)}</div>

    <section className="min-w-0 border-t border-white/10 pt-5" aria-labelledby="attention-title">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id="attention-title" className="text-base font-bold text-white">Atenção necessária</h2><span className="text-xs text-gray-600">Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}</span></div>
      {data.attention.length ? <div className="divide-y divide-white/10 border-y border-white/10">{data.attention.map((alert) => {
        const critical = alert.severity === 'CRITICAL'; const warning = alert.severity === 'WARNING'; const Icon = alert.severity === 'INFO' ? Info : AlertTriangle;
        const tone = critical ? 'text-rose-400' : warning ? 'text-amber-400' : 'text-sky-400';
        return <div key={alert.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex min-w-0 gap-3"><Icon className={`mt-0.5 h-5 w-5 flex-none ${tone}`} /><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className="text-sm font-bold text-white">{alert.title}</h3><strong className={`text-xs ${tone}`}>{alert.value}</strong></div><p className="mt-1 text-sm text-gray-500">{alert.description}</p></div></div><button type="button" onClick={() => onAction(alert.action)} className="ml-8 inline-flex items-center gap-1.5 justify-self-start text-xs font-bold text-emerald-400 hover:text-emerald-300 sm:ml-0 sm:justify-self-end">{alert.action.label}<ArrowRight className="h-3.5 w-3.5" /></button></div>;
      })}</div> : <div className="flex items-center gap-3 border-y border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-4"><CheckCircle2 className="h-5 w-5 flex-none text-emerald-400" /><div><p className="text-sm font-bold text-white">Operação sem alertas no período</p><p className="text-xs text-gray-500">As métricas monitoradas estão dentro dos limites definidos.</p></div></div>}
    </section>

    <Section title="Evolução de aquisição e uso"><div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(230px,1fr)]"><ProductTrendChart data={data.productTrend} /><div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"><MetricCard label="Ativos hoje" value={data.activeUsers.today} /><MetricCard label="Ativos 7 dias" value={data.activeUsers.days7} /><MetricCard label="Ativos 30 dias" value={data.activeUsers.days30} /></div></div></Section>

    <section className="min-w-0 border-t border-white/10 pt-5" aria-labelledby="funnel-title"><div className="mb-4 flex items-center gap-2"><h2 id="funnel-title" className="text-base font-bold text-white">Funil de utilidade</h2><button type="button" title="Este funil compara contagens agregadas e não relaciona visitantes anônimos a contas." aria-label="Como o funil agregado é calculado" className="text-gray-500 hover:text-gray-300"><CircleHelp className="h-4 w-4" /></button></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{data.funnel.map((step, index) => <div key={step.key} className="min-h-[132px] min-w-0 rounded-lg border border-white/10 bg-dark-900 p-4"><p className="text-xs font-bold uppercase text-gray-500">{step.label}</p><strong className="mt-2 block text-2xl text-white">{compact.format(step.value)}</strong><p className="mt-3 text-xs text-gray-400">{index === 0 ? 'Ponto de entrada' : `${percent(step.conversionRate)} converteu`}</p><p className="mt-1 text-xs text-gray-600">{index === 0 ? 'Base agregada do período' : `${compact.format(step.abandonment)} saíram (${percent(step.abandonmentRate)})`}</p></div>)}</div></section>

    <Section title="Rankings rápidos"><div className="grid gap-4 xl:grid-cols-3"><RankingPanel title="Termos mais acessados" actionLabel="Ver dicionário" onAction={() => onOpenTab('dictionary')}>{data.rankings.terms.length ? <ol className="divide-y divide-white/5">{data.rankings.terms.map((term, index) => <li key={term.id} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 flex-none text-xs font-bold text-gray-600">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-200">{term.word}</strong><span className="block truncate text-xs text-gray-600">{term.game || 'Geral'}</span></span><span className="flex-none text-xs font-bold text-gray-400">{compact.format(term.views)}</span></li>)}</ol> : <Empty />}</RankingPanel><RankingPanel title="Buscas sem resultado" actionLabel="Ver buscas" onAction={() => onOpenTab('dictionary')}>{data.rankings.zeroResults.length ? <ol className="divide-y divide-white/5">{data.rankings.zeroResults.map((item, index) => <li key={item.query} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 flex-none text-xs font-bold text-gray-600">{index + 1}</span><strong className="min-w-0 flex-1 truncate text-sm text-gray-200">{item.query}</strong><span className="flex-none text-xs font-bold text-amber-400">{item.count}</span></li>)}</ol> : <Empty />}</RankingPanel><RankingPanel title="Movimento orgânico" actionLabel="Ver SEO" onAction={() => onOpenTab('seo')}>{data.rankings.pages.length ? <ol className="divide-y divide-white/5">{data.rankings.pages.map((item, index) => <li key={item.key} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 flex-none text-xs font-bold text-gray-600">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-gray-200" title={item.key}>{item.key}</span><span className={`flex-none text-xs font-bold ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(0)}%</span></li>)}</ol> : <Empty />}</RankingPanel></div></Section>

    <Section title="Resumo da comunidade"><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><MetricCard label="Fila pendente" value={data.communitySummary.pending} /><MetricCard label="Aprovadas" value={data.communitySummary.approved} /><MetricCard label="Rejeitadas" value={data.communitySummary.rejected} /><MetricCard label="Revisão solicitada" value={data.communitySummary.changesRequested} /><MetricCard label="Taxa de aprovação" value={percent(data.communitySummary.approvalRate)} /><MetricCard label="Decisão mediana" value={duration(data.communitySummary.medianDecisionHours)} /></div><button type="button" onClick={() => onOpenTab('community')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300">Abrir análise da comunidade<ArrowRight className="h-4 w-4" /></button></Section>
  </div>;
};

const TrafficTab: React.FC<{ data: AnalyticsTraffic }> = ({ data }) => <div className="space-y-7">
  <Section title="Visitantes e visualizações"><TrendChart data={data.daily} keys={['visitors', 'pageviews']} /></Section>
  <Section title="Canais"><SimpleTable columns={['Canal', 'Visitantes', 'Sessões', 'Rejeição']} rows={data.channels.map((r) => [r.key, formatted.format(r.visitors || 0), formatted.format(r.visits || 0), percent(r.bounceRate || 0)])} /></Section>
  <Section title="Páginas de entrada"><SimpleTable columns={['Página', 'Visitantes', 'Sessões', 'Rejeição', 'Duração']} rows={data.landingPages.map((r) => [r.key, r.visitors, r.visits, percent(r.bounceRate || 0), `${Math.round(r.visitDurationSec || 0)} s`])} /></Section>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Fontes"><SimpleTable columns={['Fonte', 'Visitantes', 'Sessões']} rows={data.sources.map((r) => [r.key, r.visitors, r.visits])} /></Section><Section title="Referências"><SimpleTable columns={['Referência', 'Visitantes', 'Sessões']} rows={data.referrers.map((r) => [r.key, r.visitors, r.visits])} /></Section></div>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Campanhas UTM"><SimpleTable columns={['Campanha', 'Visitantes', 'Sessões']} rows={data.campaigns.map((r) => [r.key, r.visitors, r.visits])} /></Section><Section title="Países"><SimpleTable columns={['País', 'Visitantes', 'Sessões']} rows={data.countries.map((r) => [r.key, r.visitors, r.visits])} /></Section></div>
  <div className="grid gap-7 xl:grid-cols-3"><Section title="Dispositivos"><SimpleTable columns={['Dispositivo', 'Visitantes', 'Sessões']} rows={data.devices.map((r) => [r.key, r.visitors, r.visits])} /></Section><Section title="Navegadores"><SimpleTable columns={['Navegador', 'Visitantes', 'Sessões']} rows={data.browsers.map((r) => [r.key, r.visitors, r.visits])} /></Section><Section title="Sistemas"><SimpleTable columns={['Sistema', 'Visitantes', 'Sessões']} rows={data.operatingSystems.map((r) => [r.key, r.visitors, r.visits])} /></Section></div>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Páginas mais acessadas"><SimpleTable columns={['Página', 'Visitantes', 'Visualizações']} rows={data.pages.map((r) => [r.key, r.visitors, r.pageviews])} /></Section><Section title="Páginas de saída"><SimpleTable columns={['Página', 'Visitantes', 'Sessões']} rows={data.exitPages.map((r) => [r.key, r.visitors, r.visits])} /></Section></div>
</div>;

const SeoTab: React.FC<{ data: AnalyticsSeo }> = ({ data }) => <div className="space-y-7">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Cliques" value={formatted.format(data.totals.clicks)} /><MetricCard label="Impressões" value={compact.format(data.totals.impressions)} /><MetricCard label="CTR" value={percent(data.totals.ctr * 100)} /><MetricCard label="Posição média" value={data.totals.position.toFixed(1)} /></div>
  <Section title="Desempenho orgânico"><TrendChart data={data.daily} keys={['clicks', 'impressions']} /></Section>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Consultas no Google"><SimpleTable columns={['Consulta', 'Impressões', 'Cliques', 'CTR', 'Posição']} rows={data.queries.map((r) => [r.key, formatted.format(r.impressions), r.clicks, percent(r.ctr * 100), r.position.toFixed(1)])} /></Section><Section title="Páginas orgânicas"><SimpleTable columns={['Página', 'Impressões', 'Cliques', 'CTR', 'Posição']} rows={data.pages.map((r) => [r.key, formatted.format(r.impressions), r.clicks, percent(r.ctr * 100), r.position.toFixed(1)])} /></Section></div>
  <Section title="Oportunidades de CTR"><SimpleTable columns={['Consulta', 'Impressões', 'Cliques', 'CTR', 'Posição']} rows={data.opportunities.map((r) => [r.key, formatted.format(r.impressions), r.clicks, percent(r.ctr * 100), r.position.toFixed(1)])} /></Section>
  <Section title="Páginas crescendo ou caindo"><SimpleTable columns={['Página', 'Cliques', 'Período anterior', 'Variação']} rows={data.pageChanges.map((r) => [r.key, r.clicks, r.previousClicks, <span className={(r.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{percent(r.changePercent || 0)}</span>])} /></Section>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Dispositivos de busca"><SimpleTable columns={['Dispositivo', 'Impressões', 'Cliques', 'CTR']} rows={data.devices.map((r) => [r.key, r.impressions, r.clicks, percent(r.ctr * 100)])} /></Section><Section title="Países na busca"><SimpleTable columns={['País', 'Impressões', 'Cliques', 'CTR']} rows={data.countries.map((r) => [r.key, r.impressions, r.clicks, percent(r.ctr * 100)])} /></Section></div>
  <Section title="URLs monitoradas"><SimpleTable columns={['URL', 'Veredito', 'Cobertura', 'Inspeção']} rows={data.inspections.map((r) => [r.url, r.verdict, r.coverageState || '—', new Date(r.inspectedAt).toLocaleDateString('pt-BR')])} /></Section>
</div>;

const DictionaryTab: React.FC<{ data: AnalyticsDictionary }> = ({ data }) => <div className="space-y-7">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><MetricCard label="Buscas" value={data.totals.searches} /><MetricCard label="Com resultado" value={percent(data.totals.resultRate)} /><MetricCard label="Busca → termo" value={percent(data.totals.successRate)} /><MetricCard label="Votos" value={data.totals.votes} /><MetricCard label="Denúncias" value={data.totals.reports} /></div>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Buscas mais frequentes"><SimpleTable columns={['Consulta', 'Buscas', 'Resultados médios']} rows={data.topQueries.map((r) => [r.query, r.count, r.averageResults.toFixed(1)])} /></Section><Section title="Buscas sem resultado"><SimpleTable columns={['Consulta', 'Ocorrências']} rows={data.zeroResults.map((r) => [r.query, r.count])} /></Section></div>
  <Section title="Termos mais abertos"><SimpleTable columns={['Termo', 'Jogo', 'Visualizações']} rows={data.terms.map((r) => [r.word, r.game || 'Geral', r.views])} /></Section>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Jogos mais procurados"><SimpleTable columns={['Jogo', 'Buscas']} rows={data.games.map((r) => [r.name, r.searches])} /></Section><Section title="Origem da busca"><SimpleTable columns={['Origem', 'Buscas']} rows={data.origins.map((r) => [r.key, r.value])} /></Section></div>
  <div className="grid gap-7 xl:grid-cols-2"><Section title="Filtros e ordenações"><SimpleTable columns={['Filtro', 'Aplicações']} rows={data.filters.map((r) => [r.key, r.value])} /></Section><Section title="Eventos de uso"><SimpleTable columns={['Evento', 'Ocorrências', 'Visitantes']} rows={data.events.filter((r) => !r.key.startsWith('VISITOR_TYPE::')).map((r) => [r.key, r.visits, r.visitors])} /></Section></div>
</div>;

const CommunityTab: React.FC<{ data: AnalyticsCommunity }> = ({ data }) => <div className="space-y-7"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Contribuidores" value={data.contributors} /><MetricCard label="Taxa de aprovação" value={percent(data.approvalRate)} /><MetricCard label="Decisão mediana" value={duration(data.moderation.medianHours)} /><MetricCard label="Decisão p95" value={duration(data.moderation.p95Hours)} /></div><Section title="Funil de contas"><div className="grid grid-cols-2 gap-3 md:grid-cols-5"><MetricCard label="Contas" value={data.funnel.accounts} /><MetricCard label="Contribuíram" value={data.funnel.firstContribution} /><MetricCard label="Decisões" value={data.funnel.decisions} /><MetricCard label="Retorno D7" value={percent(data.retention.d7)} /><MetricCard label="Retorno D30" value={percent(data.retention.d30)} /></div></Section><div className="grid gap-7 xl:grid-cols-2"><Section title="Contribuições por status"><SimpleTable columns={['Status', 'Quantidade']} rows={Object.entries(data.statuses).map(([key, value]) => [key, value])} /></Section><Section title="Motivos de rejeição"><SimpleTable columns={['Motivo', 'Quantidade']} rows={data.rejectionReasons.map((r) => [r.key, r.value])} /></Section></div><Section title="Contribuidores mais ativos"><SimpleTable columns={['Contribuidor', 'Contribuições']} rows={data.topContributors.map((r) => [r.name, r.contributions])} /></Section><Section title="Engajamento"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><MetricCard label="Comentários em notícias" value={data.engagement.newsComments} /><MetricCard label="Notificações" value={data.engagement.notifications} /><MetricCard label="Lidas" value={data.engagement.notificationsRead} /><MetricCard label="Clicadas" value={data.engagement.notificationsClicked} /><MetricCard label="Jogo favorito" value={data.engagement.favoriteGameProfiles} /></div></Section></div>;

const QualityTab: React.FC<{ data: AnalyticsQuality }> = ({ data }) => {
  const find = (kind: string, device = 'ALL') => data.latest.find((item) => item.kind === kind && item.device === device);
  return <div className="space-y-7">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6"><MetricCard label="Erros frontend" value={find('frontend_errors')?.value || 0} /><MetricCard label="Erros backend" value={find('backend_errors')?.value || 0} /><MetricCard label="Issues abertas" value={find('unresolved_issues')?.value || 0} /><MetricCard label="p95 geral" value={`${Math.round(find('request_p95')?.value || 0)} ms`} /><MetricCard label="Disponibilidade" value={percent(find('availability')?.value || 0)} /><MetricCard label="Incidentes" value={find('uptime_incidents')?.value || 0} /></div>
    <Section title="Core Web Vitals"><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{(['MOBILE', 'DESKTOP'] as const).flatMap((device) => ['lcp', 'inp', 'cls'].map((kind) => <MetricCard key={`${device}-${kind}`} label={`${kind.toUpperCase()} ${device}`} value={kind === 'cls' ? (find(kind, device)?.value || 0).toFixed(2) : `${Math.round(find(kind, device)?.value || 0)} ms`} />))}</div></Section>
    <div className="grid gap-7 xl:grid-cols-2"><Section title="Páginas lentas"><SimpleTable columns={['Página', 'p95', 'Transações']} rows={data.latest.filter((item) => item.kind === 'slow_page').map((item) => [item.key, `${Math.round(item.value)} ms`, Number(item.metadata?.count || 0)])} /></Section><Section title="Rotas lentas"><SimpleTable columns={['Rota', 'p95', 'Transações']} rows={data.latest.filter((item) => item.kind === 'slow_route').map((item) => [item.key, `${Math.round(item.value)} ms`, Number(item.metadata?.count || 0)])} /></Section></div>
    <Section title="PageSpeed por página"><SimpleTable columns={['Página', 'Dispositivo', 'Métrica', 'Nota', 'Atualização']} rows={data.latest.filter((item) => item.provider === 'PAGESPEED').map((item) => [item.key, item.device, item.kind.replace('_', ' '), item.value.toFixed(0), new Date(item.updatedAt).toLocaleString('pt-BR')])} /></Section>
  </div>;
};
