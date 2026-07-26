import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Info, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { io } from 'socket.io-client';
import { getAnalyticsOverview } from '../../src/services/api';
import type { AnalyticsOverview, MetricValue } from '../../types';

const DAY = 86_400_000;
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const percent = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;
const duration = (hours: number) => hours < 24 ? `${hours.toFixed(1).replace('.', ',')} h` : `${(hours / 24).toFixed(1).replace('.', ',')} d`;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const chartDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);

const Delta: React.FC<{ metric: MetricValue; inverse?: boolean }> = ({ metric, inverse = false }) => {
    const improved = inverse ? metric.deltaPercent <= 0 : metric.deltaPercent >= 0;
    const Icon = metric.deltaPercent >= 0 ? TrendingUp : TrendingDown;
    return <span className={`inline-flex items-center gap-1 text-xs font-bold ${improved ? 'text-emerald-400' : 'text-rose-400'}`}><Icon className="h-3.5 w-3.5" />{Math.abs(metric.deltaPercent).toFixed(1)}%</span>;
};

const Kpi: React.FC<{ label: string; metric?: MetricValue; value?: string | number; hint?: string; inverse?: boolean }> = ({ label, metric, value, hint, inverse }) => (
    <div className="min-h-[116px] min-w-0 rounded-lg border border-white/10 bg-dark-900 p-4">
        <p className="min-h-8 text-xs font-bold uppercase text-gray-500">{label}</p>
        <div className="mt-1 flex items-end justify-between gap-2"><strong className="min-w-0 truncate text-2xl text-white">{value ?? compact.format(metric?.value || 0)}</strong>{metric && <Delta metric={metric} inverse={inverse} />}</div>
        {hint && <p className="mt-2 text-xs text-gray-600">{hint}</p>}
    </div>
);

const Ranking: React.FC<{ title: string; action: string; onAction: () => void; children: React.ReactNode }> = ({ title, action, onAction, children }) => (
    <article className="min-w-0 rounded-lg border border-white/10 bg-dark-900">
        <div className="flex min-h-12 items-center justify-between gap-2 border-b border-white/10 px-4"><h3 className="text-sm font-bold text-white">{title}</h3><button type="button" onClick={onAction} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300">{action}<ArrowRight className="h-3.5 w-3.5" /></button></div>
        {children}
    </article>
);

const EmptyList: React.FC = () => <p className="px-4 py-8 text-center text-sm text-gray-600">Sem dados suficientes no período.</p>;

export const Overview: React.FC = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const requestedDays = Number(params.get('days'));
    const days = [7, 28, 90].includes(requestedDays) ? requestedDays : 28;
    const range = useMemo(() => {
        const to = new Date();
        return { from: isoDate(new Date(to.getTime() - (days - 1) * DAY)), to: isoDate(to), compare: 'previous' as const };
    }, [days]);
    const [data, setData] = useState<AnalyticsOverview | null>(null);
    const [connections, setConnections] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        getAnalyticsOverview(range)
            .then((result) => active && setData(result))
            .catch(() => active && setError('Não foi possível carregar a visão geral.'))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [range, reload]);

    useEffect(() => {
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { transports: ['websocket', 'polling'] });
        socket.on('activeUsers', (count: number) => setConnections(count));
        return () => { socket.off('activeUsers'); socket.disconnect(); };
    }, []);

    const setDays = (nextDays: number) => {
        const next = new URLSearchParams(params);
        next.set('days', String(nextDays));
        setParams(next, { replace: true });
    };
    const openAnalytics = (tab: string) => navigate(`/dashboard/analytics?tab=${encodeURIComponent(tab)}&from=${range.from}&to=${range.to}`);
    const openAction = (action: AnalyticsOverview['attention'][number]['action']) => action.kind === 'ROUTE' ? navigate(action.target) : openAnalytics(action.target);

    if (loading && !data) return <div className="mx-auto max-w-[1500px] space-y-5"><div className="h-20 animate-pulse rounded-lg bg-dark-900" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-dark-900" />)}</div><div className="h-72 animate-pulse rounded-lg bg-dark-900" /></div>;

    return <div className="mx-auto max-w-[1500px] space-y-7">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end">
            <div><p className="text-xs font-bold uppercase text-emerald-400">Operação e crescimento</p><h1 className="mt-1 text-2xl font-black text-white">Visão Geral</h1><p className="mt-1 text-sm text-gray-500">Aquisição, utilidade do dicionário e comunidade em um só lugar.</p></div>
            <div className="flex flex-wrap items-center gap-2"><div className="flex h-10 rounded-lg border border-white/10 p-1" aria-label="Período da visão geral">{[7, 28, 90].map((option) => <button key={option} type="button" onClick={() => setDays(option)} aria-pressed={days === option} className={`px-3 text-xs font-bold ${days === option ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>{option}d</button>)}</div><button type="button" onClick={() => openAnalytics('overview')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-bold text-gray-300 hover:border-emerald-500/30 hover:text-white"><BarChart3 className="h-4 w-4 text-emerald-400" />Abrir Analytics</button></div>
        </header>

        {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-1 font-bold"><RefreshCw className="h-4 w-4" />Tentar novamente</button></div>}

        {data && <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <Kpi label="Visitantes orgânicos" metric={data.coreMetrics.organicVisitors} />
                <Kpi label="Busca → termo" metric={data.coreMetrics.searchSuccessRate} value={percent(data.coreMetrics.searchSuccessRate.value)} hint="Abertura em até 30 minutos" />
                <Kpi label="Retorno orgânico" metric={data.coreMetrics.organicReturnRate} value={percent(data.coreMetrics.organicReturnRate.value)} hint="Estimativa por navegador" />
                <Kpi label="Conversão em cadastro" metric={data.coreMetrics.signupConversionRate} value={percent(data.coreMetrics.signupConversionRate.value)} hint="Cadastros ÷ visitantes" />
                <Kpi label="Contribuições" metric={data.coreMetrics.contributions} />
                <Kpi label="Mediana de moderação" metric={data.coreMetrics.medianModerationHours} value={duration(data.coreMetrics.medianModerationHours.value)} inverse />
            </div>

            <section className="border-t border-white/10 pt-5" aria-labelledby="overview-attention">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="overview-attention" className="text-base font-bold text-white">Atenção necessária</h2><span className="text-xs text-gray-600">Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}</span></div>
                {data.attention.length ? <div className="divide-y divide-white/10 border-y border-white/10">{data.attention.map((alert) => {
                    const Icon = alert.severity === 'INFO' ? Info : AlertTriangle;
                    const tone = alert.severity === 'CRITICAL' ? 'text-rose-400' : alert.severity === 'WARNING' ? 'text-amber-400' : 'text-sky-400';
                    return <div key={alert.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex min-w-0 gap-3"><Icon className={`mt-0.5 h-5 w-5 flex-none ${tone}`} /><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className="text-sm font-bold text-white">{alert.title}</h3><strong className={`text-xs ${tone}`}>{alert.value}</strong></div><p className="mt-1 text-sm text-gray-500">{alert.description}</p></div></div><button type="button" onClick={() => openAction(alert.action)} className="ml-8 inline-flex items-center gap-1 justify-self-start text-xs font-bold text-emerald-400 hover:text-emerald-300 sm:ml-0 sm:justify-self-end">{alert.action.label}<ArrowRight className="h-3.5 w-3.5" /></button></div>;
                })}</div> : <div className="flex items-center gap-3 border-y border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-4"><CheckCircle2 className="h-5 w-5 flex-none text-emerald-400" /><div><p className="text-sm font-bold text-white">Operação sem alertas no período</p><p className="text-xs text-gray-500">As métricas monitoradas estão dentro dos limites definidos.</p></div></div>}
            </section>

            <section className="border-t border-white/10 pt-5"><h2 className="mb-4 text-base font-bold text-white">Evolução de aquisição e uso</h2><div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(250px,1fr)]"><div className="min-w-0"><div className="mb-3 flex flex-wrap gap-4 text-xs text-gray-400"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Visitantes orgânicos</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-400" />Buscas</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Termos abertos</span></div><div className="h-72 w-full" role="img" aria-label="Evolução diária de aquisição e uso"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.productTrend}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => chartDate(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} stroke="#6b7280" fontSize={11} /><YAxis stroke="#6b7280" fontSize={11} width={42} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6 }} labelFormatter={(value) => chartDate(value).toLocaleDateString('pt-BR')} /><Line type="monotone" dataKey="organicVisitors" name="Visitantes orgânicos" stroke="#34d399" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="searches" name="Buscas" stroke="#38bdf8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="termsOpened" name="Termos abertos" stroke="#fbbf24" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div><div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"><Kpi label="Conexões agora" value={connections} /><Kpi label="Ativos hoje" value={data.activeUsers.today} /><Kpi label="Ativos 7 dias" value={data.activeUsers.days7} /><Kpi label="Ativos 30 dias" value={data.activeUsers.days30} /></div></div></section>

            <section className="border-t border-white/10 pt-5"><h2 className="mb-4 text-base font-bold text-white">Funil agregado</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{data.funnel.map((step, index) => <div key={step.key} className="min-h-[132px] rounded-lg border border-white/10 bg-dark-900 p-4"><p className="text-xs font-bold uppercase text-gray-500">{step.label}</p><strong className="mt-2 block text-2xl text-white">{compact.format(step.value)}</strong><p className="mt-3 text-xs text-gray-400">{index === 0 ? 'Ponto de entrada' : `${percent(step.conversionRate)} converteu`}</p><p className="mt-1 text-xs text-gray-600">{index === 0 ? 'Base do período' : `${compact.format(step.abandonment)} saíram (${percent(step.abandonmentRate)})`}</p></div>)}</div><p className="mt-3 text-xs text-gray-600">Contagens agregadas, sem relacionar visitantes anônimos a contas.</p></section>

            <section className="border-t border-white/10 pt-5"><h2 className="mb-4 text-base font-bold text-white">Rankings rápidos</h2><div className="grid gap-4 xl:grid-cols-3"><Ranking title="Termos mais acessados" action="Ver dicionário" onAction={() => openAnalytics('dictionary')}>{data.rankings.terms.length ? <ol className="divide-y divide-white/5">{data.rankings.terms.map((term, index) => <li key={term.id} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 text-xs font-bold text-gray-600">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-200">{term.word}</strong><span className="block truncate text-xs text-gray-600">{term.game || 'Geral'}</span></span><span className="text-xs font-bold text-gray-400">{compact.format(term.views)}</span></li>)}</ol> : <EmptyList />}</Ranking><Ranking title="Buscas sem resultado" action="Ver buscas" onAction={() => openAnalytics('dictionary')}>{data.rankings.zeroResults.length ? <ol className="divide-y divide-white/5">{data.rankings.zeroResults.map((item, index) => <li key={item.query} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 text-xs font-bold text-gray-600">{index + 1}</span><strong className="min-w-0 flex-1 truncate text-sm text-gray-200">{item.query}</strong><span className="text-xs font-bold text-amber-400">{item.count}</span></li>)}</ol> : <EmptyList />}</Ranking><Ranking title="Movimento orgânico" action="Ver SEO" onAction={() => openAnalytics('seo')}>{data.rankings.pages.length ? <ol className="divide-y divide-white/5">{data.rankings.pages.map((item, index) => <li key={item.key} className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="w-4 text-xs font-bold text-gray-600">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-gray-200" title={item.key}>{item.key}</span><span className={`text-xs font-bold ${item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(0)}%</span></li>)}</ol> : <EmptyList />}</Ranking></div></section>

            <section className="border-t border-white/10 pt-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-white">Comunidade</h2><button type="button" onClick={() => openAnalytics('community')} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">Analisar comunidade<ArrowRight className="h-3.5 w-3.5" /></button></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"><Kpi label="Fila pendente" value={data.communitySummary.pending} /><Kpi label="Aprovadas" value={data.communitySummary.approved} /><Kpi label="Rejeitadas" value={data.communitySummary.rejected} /><Kpi label="Revisão solicitada" value={data.communitySummary.changesRequested} /><Kpi label="Taxa de aprovação" value={percent(data.communitySummary.approvalRate)} /><Kpi label="Decisão mediana" value={duration(data.communitySummary.medianDecisionHours)} /></div></section>
        </>}
    </div>;
};
