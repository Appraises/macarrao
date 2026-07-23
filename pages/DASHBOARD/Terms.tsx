import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle, Archive, ArchiveRestore, BarChart3, BookOpen, Eye, Flag,
    MoreHorizontal, Pencil, Plus, RotateCcw, Search, Tags, X
} from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import {
    archiveAdminTerm, getAdminTerms, getGames, restoreAdminTerm
} from '../../src/services/api';
import type {
    AdminTermAttention, AdminTermRow, AdminTermSort, AdminTermState,
    AdminTermSummary, Game, PaginationMeta
} from '../../types';

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false
};
const EMPTY_SUMMARY: AdminTermSummary = { active: 0, archived: 0, views28d: 0, pendingReports: 0, needsAttention: 0 };

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const errorMessage = (error: any) => error?.response?.data?.error || 'Nao foi possivel concluir a operacao.';

const metricCards = (summary: AdminTermSummary) => [
    { label: 'Termos ativos', value: summary.active, icon: BookOpen, tone: 'text-cyan-300 bg-cyan-500/10' },
    { label: 'Arquivados', value: summary.archived, icon: Archive, tone: 'text-gray-300 bg-white/5' },
    { label: 'Visualizações 28d', value: summary.views28d, icon: BarChart3, tone: 'text-emerald-300 bg-emerald-500/10' },
    { label: 'Denúncias pendentes', value: summary.pendingReports, icon: Flag, tone: 'text-rose-300 bg-rose-500/10' },
    { label: 'Requerem atenção', value: summary.needsAttention, icon: AlertTriangle, tone: 'text-amber-300 bg-amber-500/10' },
];

const QualityBadges = ({ term }: { term: AdminTermRow }) => (
    <div className="flex flex-wrap gap-1.5">
        {term.pendingReports > 0 && <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[11px] text-rose-300">{term.pendingReports} denuncia{term.pendingReports === 1 ? '' : 's'}</span>}
        {term.quality.missingTags && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">Sem tags</span>}
        {term.quality.missingExamples && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">Sem exemplos</span>}
    </div>
);

export const TermsList: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const [items, setItems] = useState<AdminTermRow[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [action, setAction] = useState<{ term: AdminTermRow; kind: 'archive' | 'restore' } | null>(null);
    const [busy, setBusy] = useState(false);
    const [mobileFilters, setMobileFilters] = useState(false);

    const query = useMemo(() => ({
        search: params.get('search') || '',
        gameId: params.get('gameId') || '',
        tag: params.get('tag') || '',
        letter: params.get('letter') || '',
        state: (params.get('state') || 'ACTIVE') as AdminTermState,
        attention: (params.get('attention') || '') as AdminTermAttention | '',
        sort: (params.get('sort') || 'updatedAt') as AdminTermSort,
        order: (params.get('order') || 'desc') as 'asc' | 'desc',
        page: Math.max(1, Number(params.get('page')) || 1),
        pageSize: [10, 20, 50].includes(Number(params.get('pageSize'))) ? Number(params.get('pageSize')) : 20,
    }), [params]);

    const updateParams = useCallback((changes: Record<string, string | number | undefined>, resetPage = true) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            Object.entries(changes).forEach(([key, value]) => {
                if (value === undefined || value === '') next.delete(key);
                else next.set(key, String(value));
            });
            if (resetPage && !Object.prototype.hasOwnProperty.call(changes, 'page')) next.delete('page');
            return next;
        }, { replace: true });
    }, [setParams]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminTerms({
                page: query.page, pageSize: query.pageSize, search: query.search || undefined,
                gameId: query.gameId || undefined, tag: query.tag || undefined,
                letter: query.letter || undefined, state: query.state,
                attention: query.attention || undefined, sort: query.sort, order: query.order
            });
            setItems(result.items);
            setPagination(result.pagination);
            setSummary(result.summary);
        } catch (error) {
            setNotice({ kind: 'error', text: errorMessage(error) });
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        getGames().then(setGames).catch(() => setGames([]));
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, query.search ? 250 : 0);
        return () => window.clearTimeout(timer);
    }, [load, query.search]);

    const confirmAction = async () => {
        if (!action) return;
        setBusy(true);
        setNotice(null);
        try {
            if (action.kind === 'archive') await archiveAdminTerm(action.term.id);
            else await restoreAdminTerm(action.term.id);
            setNotice({ kind: 'success', text: action.kind === 'archive' ? 'Termo arquivado. Ele nao aparece mais no site.' : 'Termo restaurado e publicado novamente.' });
            setAction(null);
            await load();
        } catch (error) {
            setNotice({ kind: 'error', text: errorMessage(error) });
        } finally {
            setBusy(false);
        }
    };

    const clearFilters = () => setParams(new URLSearchParams(), { replace: true });
    const activeFilters = [query.gameId, query.tag, query.letter, query.attention, query.state !== 'ACTIVE' ? query.state : ''].filter(Boolean).length;

    const filters = (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative md:col-span-2 xl:col-span-2">
                <span className="sr-only">Buscar termo</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <input value={query.search} onChange={(event) => updateParams({ search: event.target.value })} placeholder="Buscar palavra ou definicao" className="h-10 w-full rounded border border-white/10 bg-dark-950 pl-9 pr-9 text-sm text-white outline-none focus:border-brand-500" />
                {query.search && <button type="button" aria-label="Limpar busca" onClick={() => updateParams({ search: '' })} className="absolute right-2 top-2 grid h-6 w-6 place-items-center text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>}
            </label>
            <select aria-label="Filtrar por jogo" value={query.gameId} onChange={(event) => updateParams({ gameId: event.target.value })} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500">
                <option value="">Todos os jogos</option>
                {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
            </select>
            <input aria-label="Filtrar por tag" value={query.tag} onChange={(event) => updateParams({ tag: event.target.value })} placeholder="Tag exata" className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-white outline-none focus:border-brand-500" />
            <select aria-label="Filtrar por letra" value={query.letter} onChange={(event) => updateParams({ letter: event.target.value })} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500">
                <option value="">Todas as letras</option>
                <option value="#">#</option>
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => <option key={letter}>{letter}</option>)}
            </select>
            <select aria-label="Filtrar por estado" value={query.state} onChange={(event) => updateParams({ state: event.target.value })} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500">
                <option value="ACTIVE">Ativos</option>
                <option value="ARCHIVED">Arquivados</option>
            </select>
            <select aria-label="Filtrar por atencao" value={query.attention} onChange={(event) => updateParams({ attention: event.target.value })} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500">
                <option value="">Toda qualidade</option>
                <option value="ANY">Requer atencao</option>
                <option value="REPORTED">Com denuncias</option>
                <option value="MISSING_TAGS">Sem tags</option>
                <option value="MISSING_EXAMPLES">Sem exemplos</option>
            </select>
            <select aria-label="Ordenar catalogo" value={`${query.sort}:${query.order}`} onChange={(event) => { const [sort, order] = event.target.value.split(':'); updateParams({ sort, order }); }} className="h-10 rounded border border-white/10 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500 md:col-span-2 xl:col-span-2">
                <option value="updatedAt:desc">Atualizados recentemente</option>
                <option value="word:asc">Palavra A-Z</option>
                <option value="word:desc">Palavra Z-A</option>
                <option value="views28d:desc">Mais vistos em 28 dias</option>
                <option value="upvotes:desc">Mais votos positivos</option>
                <option value="pendingReports:desc">Mais denunciados</option>
                <option value="createdAt:desc">Criados recentemente</option>
            </select>
            <button type="button" onClick={clearFilters} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white"><RotateCcw className="h-4 w-4" /> Limpar filtros</button>
        </div>
    );

    return (
        <div className="min-w-0 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-brand-400">Conteúdo publicado</p>
                    <h1 className="text-2xl font-bold text-white">Catálogo de termos</h1>
                    <p className="mt-1 text-sm text-gray-500">Mantenha o dicionário público organizado, correto e encontrável.</p>
                </div>
                <Link to="/dashboard/terms/new" className="inline-flex h-10 items-center justify-center gap-2 rounded bg-brand-500 px-4 text-sm font-semibold text-dark-950 hover:bg-brand-400"><Plus className="h-4 w-4" /> Novo termo</Link>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                {metricCards(summary).map(({ label, value, icon: Icon, tone }, index) => (
                    <div key={label} className={`border-b border-white/10 bg-dark-900 px-4 py-4 ${index === 4 ? 'col-span-2 xl:col-span-1' : ''}`}>
                        <div className={`mb-3 grid h-8 w-8 place-items-center rounded ${tone}`}><Icon className="h-4 w-4" /></div>
                        <p className="text-xl font-semibold text-white">{number(value)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{label}</p>
                    </div>
                ))}
            </div>

            {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}><span>{notice.text}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}

            <section className="overflow-hidden rounded border border-white/10 bg-dark-900">
                <div className="border-b border-white/10 p-4">
                    <button type="button" onClick={() => setMobileFilters((value) => !value)} className="flex h-10 w-full items-center justify-between rounded border border-white/10 px-3 text-sm text-gray-200 md:hidden">
                        <span>Filtros {activeFilters > 0 ? `(${activeFilters})` : ''}</span><Tags className="h-4 w-4" />
                    </button>
                    <div className={`${mobileFilters ? 'mt-3 block' : 'hidden'} md:block`}>{filters}</div>
                </div>

                {loading ? (
                    <div className="space-y-2 p-4" aria-label="Carregando catalogo">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded bg-white/5" />)}</div>
                ) : items.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-gray-600" />
                        <h2 className="mt-3 font-semibold text-white">Nenhum termo encontrado</h2>
                        <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou publique um novo termo diretamente.</p>
                        <button type="button" onClick={clearFilters} className="mt-4 text-sm font-medium text-brand-400 hover:text-brand-300">Limpar filtros</button>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <table className="w-full table-fixed text-left text-sm">
                                <thead className="bg-dark-950/70 text-[11px] uppercase text-gray-500">
                                    <tr><th className="w-[32%] px-4 py-3 font-medium">Termo</th><th className="w-[14%] px-3 py-3 font-medium">Jogo</th><th className="w-[11%] px-3 py-3 text-right font-medium">Views 28d</th><th className="w-[10%] px-3 py-3 text-right font-medium">Votos</th><th className="w-[15%] px-3 py-3 font-medium">Atenção</th><th className="w-[11%] px-3 py-3 font-medium">Atualizado</th><th className="w-[7%] px-3 py-3"><span className="sr-only">Ações</span></th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.map((term) => (
                                        <tr key={term.id} className="align-top hover:bg-white/[0.025]">
                                            <td className="px-4 py-3"><Link to={`/dashboard/terms/${term.id}`} className="font-semibold text-white hover:text-brand-300">{term.word}</Link><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{term.definition}</p></td>
                                            <td className="px-3 py-3 text-gray-300"><span className="line-clamp-2">{term.game?.name || 'Geral'}</span></td>
                                            <td className="px-3 py-3 text-right font-medium text-gray-200">{number(term.views28d)}</td>
                                            <td className={`px-3 py-3 text-right font-medium ${term.voteBalance < 0 ? 'text-rose-300' : 'text-gray-200'}`}>{term.voteBalance > 0 ? '+' : ''}{term.voteBalance}</td>
                                            <td className="px-3 py-3"><QualityBadges term={term} />{!term.quality.needsAttention && <span className="text-xs text-gray-600">Em dia</span>}</td>
                                            <td className="px-3 py-3 text-xs text-gray-400">{date(term.updatedAt)}</td>
                                            <td className="px-3 py-3"><div className="flex justify-end gap-1">
                                                {!term.archivedAt && <a href={`/term/${encodeURIComponent(term.word)}`} target="_blank" rel="noreferrer" title="Visualizar no site" aria-label={`Visualizar ${term.word} no site`} className="grid h-8 w-8 place-items-center rounded text-gray-400 hover:bg-white/5 hover:text-white"><Eye className="h-4 w-4" /></a>}
                                                <Link to={`/dashboard/terms/${term.id}`} title="Editar" aria-label={`Editar ${term.word}`} className="grid h-8 w-8 place-items-center rounded text-gray-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></Link>
                                                <button type="button" onClick={() => setAction({ term, kind: term.archivedAt ? 'restore' : 'archive' })} title={term.archivedAt ? 'Restaurar' : 'Arquivar'} aria-label={`${term.archivedAt ? 'Restaurar' : 'Arquivar'} ${term.word}`} className="grid h-8 w-8 place-items-center rounded text-gray-400 hover:bg-white/5 hover:text-white">{term.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
                                                {term.pendingReports > 0 && <Link to={`/dashboard/reports?termId=${term.id}`} title="Abrir denuncias" aria-label={`Abrir denuncias de ${term.word}`} className="grid h-8 w-8 place-items-center rounded text-rose-300 hover:bg-rose-500/10"><Flag className="h-4 w-4" /></Link>}
                                            </div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="divide-y divide-white/5 md:hidden">
                            {items.map((term) => <article key={term.id} className="p-4">
                                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/dashboard/terms/${term.id}`} className="block truncate font-semibold text-white">{term.word}</Link><p className="mt-0.5 text-xs text-gray-500">{term.game?.name || 'Geral'} · rev. {term.revision}</p></div><button type="button" aria-label="Editar termo" onClick={() => location.assign(`/dashboard/terms/${term.id}`)} className="grid h-8 w-8 flex-none place-items-center rounded border border-white/10 text-gray-400"><MoreHorizontal className="h-4 w-4" /></button></div>
                                <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-400">{term.definition}</p>
                                <div className="mt-3"><QualityBadges term={term} /></div>
                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-gray-500"><span>{number(term.views28d)} views · {term.voteBalance > 0 ? '+' : ''}{term.voteBalance} votos</span><button type="button" onClick={() => setAction({ term, kind: term.archivedAt ? 'restore' : 'archive' })} className="inline-flex items-center gap-1.5 text-gray-300">{term.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{term.archivedAt ? 'Restaurar' : 'Arquivar'}</button></div>
                            </article>)}
                        </div>
                    </>
                )}
                <PaginationControls pagination={pagination} onPageChange={(page) => updateParams({ page }, false)} onPageSizeChange={(pageSize) => updateParams({ pageSize })} disabled={loading} />
            </section>

            {action && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="term-action-title">
                <div className="w-full max-w-md rounded border border-white/10 bg-dark-900 p-5 shadow-2xl">
                    <div className={`mb-4 grid h-10 w-10 place-items-center rounded ${action.kind === 'archive' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>{action.kind === 'archive' ? <Archive className="h-5 w-5" /> : <ArchiveRestore className="h-5 w-5" />}</div>
                    <h2 id="term-action-title" className="text-lg font-semibold text-white">{action.kind === 'archive' ? 'Arquivar termo?' : 'Restaurar termo?'}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{action.kind === 'archive' ? <><strong className="text-gray-200">{action.term.word}</strong> deixara de aparecer no site, na busca e nos rankings. O historico sera preservado.</> : <><strong className="text-gray-200">{action.term.word}</strong> voltara a ficar publico imediatamente.</>}</p>
                    <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setAction(null)} className="h-10 rounded border border-white/10 px-4 text-sm text-gray-300 hover:bg-white/5">Cancelar</button><button type="button" disabled={busy} onClick={confirmAction} className={`h-10 rounded px-4 text-sm font-semibold ${action.kind === 'archive' ? 'bg-amber-400 text-dark-950 hover:bg-amber-300' : 'bg-emerald-400 text-dark-950 hover:bg-emerald-300'} disabled:opacity-50`}>{busy ? 'Processando...' : action.kind === 'archive' ? 'Arquivar' : 'Restaurar'}</button></div>
                </div>
            </div>}
        </div>
    );
};
