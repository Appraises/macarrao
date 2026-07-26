import React, { useEffect, useState } from 'react';
import { Archive, Edit3, Gamepad2, Image as ImageIcon, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import { usePaginatedListQuery } from '../../src/hooks/usePaginatedListQuery';
import {
    archiveGame,
    createGame,
    deleteGame,
    GameInput,
    getAdminGames,
    updateGame,
    uploadAdminImage
} from '../../src/services/api';
import type { ContentStatus, Game, PaginationMeta } from '../../types';

const EMPTY_FORM: GameInput = {
    name: '',
    slug: '',
    genre: '',
    image: '',
    description: '',
    status: 'DRAFT'
};

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrevious: false
};

const statuses: Array<{ value: '' | ContentStatus; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'DRAFT', label: 'Rascunhos' },
    { value: 'PUBLISHED', label: 'Publicados' },
    { value: 'ARCHIVED', label: 'Arquivados' }
];

const messageFrom = (error: any) => error?.response?.data?.error || 'Nao foi possivel concluir a operacao.';

export const Games: React.FC = () => {
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(10);
    const [status, setStatus] = useState<'' | ContentStatus>('');
    const [items, setItems] = useState<Game[]>([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [form, setForm] = useState<GameInput>({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const result = await getAdminGames({ page, pageSize, search, status: status || undefined });
            setItems(result.items);
            setPagination(result.pagination);
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(load, 200);
        return () => window.clearTimeout(timer);
    }, [page, pageSize, search, status]);

    const reset = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setNotice(null);
    };

    const edit = (game: Game) => {
        setEditingId(game.id);
        setForm({
            name: game.name,
            slug: game.slug,
            genre: String(game.genre),
            image: game.image,
            description: game.description || '',
            status: game.status || 'PUBLISHED'
        });
        setNotice(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setNotice(null);
        try {
            const saved = editingId ? await updateGame(editingId, form) : await createGame(form);
            setEditingId(saved.id);
            setForm({
                name: saved.name,
                slug: saved.slug,
                genre: String(saved.genre),
                image: saved.image,
                description: saved.description || '',
                status: saved.status || 'PUBLISHED'
            });
            setNotice({ kind: 'success', text: editingId ? 'Jogo atualizado.' : 'Jogo criado.' });
            await load();
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setSaving(false);
        }
    };

    const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploading(true);
        setNotice(null);
        try {
            const result = await uploadAdminImage(file, 'games');
            setForm((current) => ({ ...current, image: result.url }));
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setUploading(false);
        }
    };

    const archive = async (game: Game) => {
        if (!window.confirm(`Arquivar "${game.name}"?`)) return;
        try {
            await archiveGame(game.id);
            if (editingId === game.id) reset();
            setNotice({ kind: 'success', text: 'Jogo arquivado sem remover seus dados relacionados.' });
            await load();
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        }
    };

    const remove = async (game: Game) => {
        if (!window.confirm(`Excluir definitivamente "${game.name}"?`)) return;
        try {
            await deleteGame(game.id);
            if (editingId === game.id) reset();
            setNotice({ kind: 'success', text: 'Jogo excluido.' });
            await load();
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Jogos</h1>
                    <p className="text-sm text-gray-400">Catalogo, publicacao e dependencias.</p>
                </div>
                <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/5">
                    <Plus className="h-4 w-4" /> Novo jogo
                </button>
            </div>

            {notice && <div className={`rounded-lg border p-3 text-sm ${notice.kind === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>{notice.text}</div>}

            <form onSubmit={submit} className="grid gap-5 border-y border-white/5 bg-dark-900/60 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase text-gray-500">Nome
                        <input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
                    </label>
                    <label className="text-xs font-bold uppercase text-gray-500">Slug
                        <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="gerado pelo nome" className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
                    </label>
                    <label className="text-xs font-bold uppercase text-gray-500">Genero
                        <input required minLength={2} maxLength={50} value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
                    </label>
                    <label className="text-xs font-bold uppercase text-gray-500">Estado
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500">
                            <option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option><option value="ARCHIVED">Arquivado</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold uppercase text-gray-500 sm:col-span-2">Descricao
                        <textarea rows={4} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
                    </label>
                    <div className="sm:col-span-2">
                        <span className="text-xs font-bold uppercase text-gray-500">Imagem</span>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
                            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-500/30 px-4 py-2 text-sm font-bold text-brand-400 hover:bg-brand-500/10">
                                <Upload className="h-4 w-4" /> {uploading ? 'Enviando' : 'Upload'}
                                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" disabled={uploading} onChange={upload} />
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                        {editingId && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/5"><X className="h-4 w-4" /> Cancelar</button>}
                        <button disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-bold text-dark-950 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Salvando' : 'Salvar'}</button>
                    </div>
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-dark-950">
                    {form.image ? <img src={form.image} alt="Preview do jogo" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <div className="grid h-full place-items-center text-gray-600"><ImageIcon className="h-10 w-10" /></div>}
                </div>
            </form>

            <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-dark-900 p-1">
                        {statuses.map((item) => <button key={item.value || 'all'} type="button" onClick={() => { setStatus(item.value); setPage(1); }} className={`rounded px-3 py-2 text-xs font-bold ${status === item.value ? 'bg-brand-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>{item.label}</button>)}
                    </div>
                    <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jogo..." className="w-full rounded-lg border border-white/10 bg-dark-900 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-brand-500" /></div>
                </div>

                {loading ? <div className="py-16 text-center text-sm text-gray-500">Carregando jogos...</div> : items.length === 0 ? (
                    <div className="border-y border-dashed border-white/10 py-16 text-center text-gray-500"><Gamepad2 className="mx-auto mb-3 h-8 w-8" />Nenhum jogo encontrado.</div>
                ) : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((game) => {
                    const dependencies = (game._count?.terms || 0) + (game._count?.maps || 0) + (game._count?.favoritedBy || 0);
                    return <article key={game.id} className="overflow-hidden rounded-lg border border-white/5 bg-dark-900">
                        <div className="flex gap-4 p-4"><img src={game.image} alt="" className="h-20 w-20 flex-none rounded object-cover" /><div className="min-w-0"><span className="text-[10px] font-bold uppercase text-brand-400">{game.status}</span><h2 className="truncate font-bold text-white">{game.name}</h2><p className="text-xs text-gray-500">{String(game.genre)}</p><p className="mt-2 text-[11px] text-gray-500">{game._count?.terms || 0} termos · {game._count?.maps || 0} mapas · {game._count?.favoritedBy || 0} favoritos</p></div></div>
                        <div className="grid grid-cols-3 border-t border-white/5">
                            <button type="button" title="Editar jogo" onClick={() => edit(game)} className="grid h-11 place-items-center text-gray-400 hover:bg-white/5 hover:text-white"><Edit3 className="h-4 w-4" /></button>
                            <button type="button" title="Arquivar jogo" onClick={() => archive(game)} disabled={game.status === 'ARCHIVED'} className="grid h-11 place-items-center border-x border-white/5 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30"><Archive className="h-4 w-4" /></button>
                            <button type="button" title={dependencies ? 'Ha dependencias; use arquivar' : 'Excluir jogo'} onClick={() => remove(game)} disabled={dependencies > 0} className="grid h-11 place-items-center text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    </article>;
                })}</div>}
                <PaginationControls pagination={pagination} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} pageSizeOptions={[10, 20, 50]} />
            </div>
        </div>
    );
};
