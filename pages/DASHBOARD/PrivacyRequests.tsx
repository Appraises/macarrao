import React, { useCallback, useEffect, useState } from 'react';
import {
    CalendarClock,
    CheckCircle2,
    Clock3,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRoundCheck,
    X
} from 'lucide-react';
import { Button } from '../../components/UI';
import { PaginationControls } from '../../components/PaginationControls';
import { usePaginatedListQuery } from '../../src/hooks/usePaginatedListQuery';
import {
    completeAdminPrivacyRequest,
    getAdminPrivacyRequest,
    getAdminPrivacyRequests,
    getUsers,
    updateAdminPrivacyRequest
} from '../../src/services/api';
import type {
    PaginationMeta,
    PrivacyRequest,
    PrivacyRequestStatus,
    PrivacyRequestType,
    User
} from '../../types';

const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };
const statusLabels: Record<PrivacyRequestStatus, string> = {
    REQUESTED: 'Aguardando confirmação', CONFIRMED: 'Confirmada', IN_REVIEW: 'Em análise', PROCESSING: 'Em processamento', COMPLETED: 'Concluída', REJECTED: 'Recusada', CANCELED: 'Cancelada'
};
const typeLabels: Record<PrivacyRequestType, string> = {
    EXPORT: 'Exportação', DELETE: 'Exclusão', CORRECTION: 'Correção', ANONYMIZATION: 'Anonimização'
};
const statusClasses: Record<PrivacyRequestStatus, string> = {
    REQUESTED: 'border-amber-500/30 bg-amber-500/10 text-amber-300', CONFIRMED: 'border-sky-500/30 bg-sky-500/10 text-sky-300', IN_REVIEW: 'border-blue-500/30 bg-blue-500/10 text-blue-300', PROCESSING: 'border-violet-500/30 bg-violet-500/10 text-violet-300', COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', REJECTED: 'border-red-500/30 bg-red-500/10 text-red-300', CANCELED: 'border-white/10 bg-white/5 text-gray-400'
};
const transitions: Record<PrivacyRequestStatus, PrivacyRequestStatus[]> = {
    REQUESTED: ['REJECTED'], CONFIRMED: ['IN_REVIEW', 'REJECTED'], IN_REVIEW: ['PROCESSING', 'REJECTED'], PROCESSING: ['IN_REVIEW', 'REJECTED'], COMPLETED: [], REJECTED: [], CANCELED: []
};
const terminalStatuses: PrivacyRequestStatus[] = ['COMPLETED', 'REJECTED', 'CANCELED'];
const completableStatuses: PrivacyRequestStatus[] = ['CONFIRMED', 'IN_REVIEW', 'PROCESSING'];

export const PrivacyRequests: React.FC = () => {
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(20);
    const [items, setItems] = useState<PrivacyRequest[]>([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<PrivacyRequestStatus | ''>('');
    const [type, setType] = useState<PrivacyRequestType | ''>('');
    const [assignedToId, setAssignedToId] = useState('');
    const [admins, setAdmins] = useState<User[]>([]);
    const [selected, setSelected] = useState<PrivacyRequest | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nextStatus, setNextStatus] = useState<PrivacyRequestStatus | ''>('');
    const [detailAssignee, setDetailAssignee] = useState('');
    const [resolutionNote, setResolutionNote] = useState('');
    const [error, setError] = useState('');

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getAdminPrivacyRequests({ page, pageSize, search, status: status || undefined, type: type || undefined, assignedToId: assignedToId || undefined });
            setItems(result.items);
            setPagination(result.pagination);
        } catch (requestError: any) {
            setError(requestError.response?.data?.error || 'Falha ao carregar a fila LGPD.');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, status, type, assignedToId]);

    useEffect(() => {
        const timeout = window.setTimeout(() => void fetchList(), 250);
        return () => window.clearTimeout(timeout);
    }, [fetchList]);

    useEffect(() => {
        getUsers({ page: 1, pageSize: 100, role: 'ADMIN', sort: 'name', order: 'asc' }).then((result) => setAdmins(result.items)).catch(() => setAdmins([]));
    }, []);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, []);

    const loadDetail = async (id: string) => {
        setDetailLoading(true);
        setError('');
        try {
            const item = await getAdminPrivacyRequest(id);
            setSelected(item);
            setNextStatus('');
            setDetailAssignee(item.assignedToId || '');
            setResolutionNote(item.resolutionNote || '');
        } catch (requestError: any) {
            setError(requestError.response?.data?.error || 'Falha ao abrir a solicitação.');
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshSelected = async () => {
        await fetchList();
        if (selected) await loadDetail(selected.id);
    };

    const handleUpdate = async () => {
        if (!selected) return;
        setSaving(true);
        setError('');
        try {
            await updateAdminPrivacyRequest(selected.id, {
                ...(nextStatus ? { status: nextStatus } : {}),
                assignedToId: detailAssignee || null,
                resolutionNote
            });
            await refreshSelected();
        } catch (requestError: any) {
            setError(requestError.response?.data?.error || 'Falha ao atualizar a solicitação.');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!selected || !window.confirm(`Concluir a solicitação ${selected.protocol}? Esta ação pode remover o acesso à conta.`)) return;
        setSaving(true);
        setError('');
        try {
            await completeAdminPrivacyRequest(selected.id, resolutionNote);
            await refreshSelected();
        } catch (requestError: any) {
            setError(requestError.response?.data?.error || 'Falha ao concluir a solicitação.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div><h1 className="flex items-center gap-3 text-2xl font-bold text-white"><ShieldCheck className="h-6 w-6 text-brand-400" /> Solicitações LGPD</h1><p className="mt-1 text-sm text-gray-400">Fila operacional com confirmação do titular, prazo, responsável e auditoria.</p></div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="relative sm:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Protocolo, email ou nome" className="h-10 w-full border border-white/10 bg-dark-900 pl-10 pr-3 text-sm text-white focus:border-brand-500 focus:outline-none" /></label>
                    <select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value as PrivacyRequestStatus | ''); setPage(1); }} className="h-10 border border-white/10 bg-dark-900 px-3 text-sm text-gray-300 focus:border-brand-500 focus:outline-none"><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    <select aria-label="Filtrar por tipo" value={type} onChange={(event) => { setType(event.target.value as PrivacyRequestType | ''); setPage(1); }} className="h-10 border border-white/10 bg-dark-900 px-3 text-sm text-gray-300 focus:border-brand-500 focus:outline-none"><option value="">Todos os tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                    <select aria-label="Filtrar por responsável" value={assignedToId} onChange={(event) => { setAssignedToId(event.target.value); setPage(1); }} className="h-10 border border-white/10 bg-dark-900 px-3 text-sm text-gray-300 focus:border-brand-500 focus:outline-none"><option value="">Todos os responsáveis</option><option value="unassigned">Sem responsável</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select>
                </div>
            </header>

            {error && <div role="alert" className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

            <section className="overflow-hidden border border-white/5 bg-dark-900 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left">
                        <thead className="border-b border-white/5 bg-white/5 text-xs font-bold uppercase text-gray-400"><tr><th className="p-4">Protocolo</th><th className="p-4">Titular</th><th className="p-4">Tipo</th><th className="p-4">Status</th><th className="p-4">Prazo</th><th className="p-4">Responsável</th><th className="p-4"><span className="sr-only">Ação</span></th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? <tr><td colSpan={7} className="p-10 text-center text-gray-500"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" /> Carregando fila...</td></tr> : items.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-gray-500">Nenhuma solicitação encontrada.</td></tr> : items.map((item) => {
                                const overdue = !terminalStatuses.includes(item.status) && new Date(item.dueAt).getTime() < Date.now();
                                return <tr key={item.id} className="hover:bg-white/[0.03]"><td className="p-4 font-mono text-xs text-white">{item.protocol}</td><td className="p-4"><p className="text-sm font-semibold text-white">{item.user?.name || 'Conta não disponível'}</p><p className="mt-1 text-xs text-gray-500">{item.requesterEmail}</p></td><td className="p-4 text-sm text-gray-300">{typeLabels[item.type]}</td><td className="p-4"><span className={`inline-block border px-2 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>{statusLabels[item.status]}</span></td><td className={`p-4 text-sm ${overdue ? 'font-semibold text-red-300' : 'text-gray-400'}`}>{overdue && <CalendarClock className="mr-1 inline h-4 w-4" />}{new Date(item.dueAt).toLocaleDateString('pt-BR')}</td><td className="p-4 text-sm text-gray-400">{item.assignedTo?.name || 'Não atribuído'}</td><td className="p-4 text-right"><button type="button" onClick={() => void loadDetail(item.id)} className="border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-brand-500/40 hover:text-white">Analisar</button></td></tr>;
                            })}
                        </tbody>
                    </table>
                </div>
                <PaginationControls pagination={pagination} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} />
            </section>

            {(selected || detailLoading) && <div className="fixed inset-0 z-50 flex justify-end bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
                <aside role="dialog" aria-modal="true" aria-label="Detalhes da solicitação LGPD" className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-dark-950 shadow-2xl">
                    {detailLoading && !selected ? <div className="grid min-h-full place-items-center"><RefreshCw className="h-7 w-7 animate-spin text-brand-400" /></div> : selected && <>
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-dark-950 p-6"><div><p className="font-mono text-xs text-brand-400">{selected.protocol}</p><h2 className="mt-1 text-xl font-bold text-white">{typeLabels[selected.type]}</h2><p className="mt-1 text-sm text-gray-500">Solicitada em {new Date(selected.createdAt).toLocaleString('pt-BR')}</p></div><button type="button" title="Fechar" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center border border-white/10 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button></header>
                        <div className="space-y-8 p-6">
                            <div className="grid gap-4 sm:grid-cols-3"><div><span className="text-xs uppercase text-gray-500">Status</span><span className={`mt-2 block w-fit border px-2 py-1 text-xs font-semibold ${statusClasses[selected.status]}`}>{statusLabels[selected.status]}</span></div><div><span className="text-xs uppercase text-gray-500">Prazo</span><p className="mt-2 text-sm text-white">{new Date(selected.dueAt).toLocaleDateString('pt-BR')}</p></div><div><span className="text-xs uppercase text-gray-500">Confirmação</span><p className="mt-2 text-sm text-white">{selected.confirmedAt ? new Date(selected.confirmedAt).toLocaleString('pt-BR') : 'Pendente'}</p></div></div>
                            <div className="border-y border-white/5 py-5"><p className="font-semibold text-white">{selected.user?.name || 'Conta não disponível'}</p><p className="mt-1 text-sm text-gray-400">{selected.requesterEmail}</p>{selected.requestNote && <p className="mt-4 whitespace-pre-wrap border-l-2 border-brand-500/40 pl-4 text-sm leading-6 text-gray-300">{selected.requestNote}</p>}</div>

                            {!terminalStatuses.includes(selected.status) && <section className="space-y-4"><h3 className="flex items-center gap-2 font-bold text-white"><UserRoundCheck className="h-4 w-4 text-brand-400" /> Tratamento administrativo</h3><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs uppercase text-gray-500">Responsável</span><select value={detailAssignee} onChange={(event) => setDetailAssignee(event.target.value)} className="w-full border border-white/10 bg-dark-900 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"><option value="">Não atribuído</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label><label><span className="mb-1 block text-xs uppercase text-gray-500">Próximo status</span><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as PrivacyRequestStatus | '')} className="w-full border border-white/10 bg-dark-900 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"><option value="">Manter status atual</option>{transitions[selected.status].map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label></div><label className="block"><span className="mb-1 block text-xs uppercase text-gray-500">Resolução ou justificativa</span><textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} rows={5} maxLength={4000} placeholder="Registre decisões, correções realizadas ou a justificativa da recusa." className="w-full resize-y border border-white/10 bg-dark-900 px-3 py-3 text-sm text-white focus:border-brand-500 focus:outline-none" /></label><div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={saving} onClick={() => void handleUpdate()}>Salvar andamento</Button>{completableStatuses.includes(selected.status) && <Button disabled={saving || resolutionNote.trim().length < 10} onClick={() => void handleComplete()}><CheckCircle2 className="h-4 w-4" /> Concluir solicitação</Button>}</div></section>}

                            <section><h3 className="mb-4 flex items-center gap-2 font-bold text-white"><Clock3 className="h-4 w-4 text-gray-400" /> Histórico imutável</h3><ol className="relative ml-2 border-l border-white/10 pl-6">{selected.events?.map((event) => <li key={event.id} className="relative pb-6 last:pb-0"><span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border-2 border-dark-950 bg-brand-500" /><p className="text-sm font-semibold text-gray-200">{event.message}</p><p className="mt-1 text-xs text-gray-500">{new Date(event.createdAt).toLocaleString('pt-BR')} · {event.actor?.name || 'Sistema/titular'}</p></li>)}</ol></section>
                        </div>
                    </>}
                </aside>
            </div>}
        </div>
    );
};
