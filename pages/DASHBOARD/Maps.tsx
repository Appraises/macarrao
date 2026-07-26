import React, { useEffect, useRef, useState } from 'react';
import { Archive, Edit3, Image as ImageIcon, Map as MapIcon, MapPin, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { PaginationControls } from '../../components/PaginationControls';
import { usePaginatedListQuery } from '../../src/hooks/usePaginatedListQuery';
import {
    archiveMap,
    createMap,
    deleteMap,
    GameMapInput,
    getAdminGames,
    getAdminMaps,
    updateMap,
    uploadAdminImage
} from '../../src/services/api';
import type { ContentStatus, Game, GameMap, MapCallout, PaginationMeta } from '../../types';

const EMPTY_FORM: GameMapInput = { gameId: '', name: '', image: '', tacticalImage: '', status: 'DRAFT', callouts: [] };
const EMPTY_PAGINATION: PaginationMeta = { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNext: false, hasPrevious: false };
const CALLOUT_TYPES: MapCallout['type'][] = ['Site', 'Spawn', 'Callout', 'Objective', 'Item'];
const messageFrom = (error: any) => error?.response?.data?.error || 'Nao foi possivel concluir a operacao.';

const clamp = (value: number) => Math.max(0, Math.min(100, Number(value.toFixed(2))));

export const Maps: React.FC = () => {
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(10);
    const [games, setGames] = useState<Game[]>([]);
    const [items, setItems] = useState<GameMap[]>([]);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [gameFilter, setGameFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'' | ContentStatus>('');
    const [form, setForm] = useState<GameMapInput>({ ...EMPTY_FORM, callouts: [] });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCallout, setSelectedCallout] = useState<number | null>(null);
    const [draggingCallout, setDraggingCallout] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<'image' | 'tacticalImage' | null>(null);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        setLoading(true);
        try {
            const result = await getAdminMaps({ page, pageSize, search, gameId: gameFilter || undefined, status: statusFilter || undefined });
            setItems(result.items);
            setPagination(result.pagination);
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getAdminGames({ page: 1, pageSize: 100, sort: 'name', order: 'asc' })
            .then((result) => setGames(result.items))
            .catch((error) => setNotice({ kind: 'error', text: messageFrom(error) }));
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, 200);
        return () => window.clearTimeout(timer);
    }, [page, pageSize, search, gameFilter, statusFilter]);

    const reset = () => {
        setEditingId(null);
        setSelectedCallout(null);
        setForm({ ...EMPTY_FORM, callouts: [] });
        setNotice(null);
    };

    const edit = (map: GameMap) => {
        setEditingId(map.id);
        setSelectedCallout(null);
        setForm({
            gameId: map.gameId,
            name: map.name,
            image: map.image,
            tacticalImage: map.tacticalImage || '',
            status: map.status,
            callouts: map.callouts.map(({ name, description, x, y, type }) => ({ name, description: description || '', x, y, type }))
        });
        setNotice(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateCallout = (index: number, patch: Partial<MapCallout>) => {
        setForm((current) => ({ ...current, callouts: current.callouts.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
    };

    const coordinatesFromEvent = (clientX: number, clientY: number) => {
        const rect = editorRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return { x: clamp(((clientX - rect.left) / rect.width) * 100), y: clamp(((clientY - rect.top) / rect.height) * 100) };
    };

    const addCallout = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget || draggingCallout !== null) return;
        const point = coordinatesFromEvent(event.clientX, event.clientY);
        if (!point) return;
        const next: MapCallout = { name: `Callout ${form.callouts.length + 1}`, description: '', type: 'Callout', ...point };
        setForm((current) => ({ ...current, callouts: [...current.callouts, next] }));
        setSelectedCallout(form.callouts.length);
    };

    const moveDragged = (event: React.PointerEvent<HTMLDivElement>) => {
        if (draggingCallout === null) return;
        const point = coordinatesFromEvent(event.clientX, event.clientY);
        if (point) updateCallout(draggingCallout, point);
    };

    const moveWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        const current = form.callouts[index];
        const step = event.shiftKey ? 2 : 0.5;
        const changes: Partial<MapCallout> = {};
        if (event.key === 'ArrowLeft') changes.x = clamp(current.x - step);
        else if (event.key === 'ArrowRight') changes.x = clamp(current.x + step);
        else if (event.key === 'ArrowUp') changes.y = clamp(current.y - step);
        else if (event.key === 'ArrowDown') changes.y = clamp(current.y + step);
        else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            setForm((value) => ({ ...value, callouts: value.callouts.filter((_, itemIndex) => itemIndex !== index) }));
            setSelectedCallout(null);
            return;
        } else return;
        event.preventDefault();
        updateCallout(index, changes);
    };

    const upload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'tacticalImage') => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploading(field);
        setNotice(null);
        try {
            const result = await uploadAdminImage(file, 'maps');
            setForm((current) => ({ ...current, [field]: result.url }));
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setUploading(null);
        }
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setNotice(null);
        try {
            const saved = editingId ? await updateMap(editingId, form) : await createMap(form);
            edit(saved);
            setNotice({ kind: 'success', text: editingId ? 'Mapa atualizado.' : 'Mapa criado.' });
            await load();
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setSaving(false);
        }
    };

    const archive = async (map: GameMap) => {
        if (!window.confirm(`Arquivar "${map.name}"?`)) return;
        try { await archiveMap(map.id); if (editingId === map.id) reset(); await load(); }
        catch (error) { setNotice({ kind: 'error', text: messageFrom(error) }); }
    };

    const remove = async (map: GameMap) => {
        if (!window.confirm(`Excluir "${map.name}" e seus ${map.callouts.length} callouts?`)) return;
        try { await deleteMap(map.id); if (editingId === map.id) reset(); await load(); }
        catch (error) { setNotice({ kind: 'error', text: messageFrom(error) }); }
    };

    const selected = selectedCallout === null ? null : form.callouts[selectedCallout];
    const editorImage = form.tacticalImage || form.image;

    return <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="font-display text-2xl font-bold text-white">Mapas</h1><p className="text-sm text-gray-400">Imagens taticas e callouts posicionados.</p></div><button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/5"><Plus className="h-4 w-4" /> Novo mapa</button></div>
        {notice && <div className={`rounded-lg border p-3 text-sm ${notice.kind === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>{notice.text}</div>}

        <form onSubmit={submit} className="space-y-6 border-y border-white/5 bg-dark-900/60 py-6 lg:px-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-bold uppercase text-gray-500">Jogo<select required value={form.gameId} onChange={(e) => setForm({ ...form, gameId: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white"><option value="">Selecione</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
                <label className="text-xs font-bold uppercase text-gray-500">Nome<input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white" /></label>
                <label className="text-xs font-bold uppercase text-gray-500">Estado<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white"><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option><option value="ARCHIVED">Arquivado</option></select></label>
                <div className="flex items-end gap-2"><button disabled={saving || Boolean(uploading)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-bold text-dark-950 disabled:opacity-50"><Save className="h-4 w-4" /> Salvar</button>{editingId && <button type="button" title="Cancelar edicao" onClick={reset} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-gray-400"><X className="h-4 w-4" /></button>}</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {(['image', 'tacticalImage'] as const).map((field) => <div key={field}><span className="text-xs font-bold uppercase text-gray-500">{field === 'image' ? 'Imagem artistica' : 'Imagem tatica'}</span><div className="mt-2 flex gap-2"><input required={field === 'image'} value={form[field] || ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-dark-950 px-3 py-2 text-sm text-white" /><label title={`Upload da ${field === 'image' ? 'imagem artistica' : 'imagem tatica'}`} className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-lg border border-brand-500/30 text-brand-400"><Upload className="h-4 w-4" /><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={(e) => upload(e, field)} /></label></div></div>)}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase text-gray-500">Editor visual</span><span className="text-xs text-gray-500">Clique no mapa para adicionar</span></div>
                    <div ref={editorRef} onClick={addCallout} onPointerMove={moveDragged} onPointerUp={() => setDraggingCallout(null)} onPointerCancel={() => setDraggingCallout(null)} className="relative aspect-video touch-none overflow-hidden rounded-lg border border-white/10 bg-dark-950" style={editorImage ? { backgroundImage: `url(${editorImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                        {!editorImage && <div className="pointer-events-none grid h-full place-items-center text-gray-600"><div className="text-center"><ImageIcon className="mx-auto mb-2 h-10 w-10" /><span className="text-xs">Adicione uma imagem para editar</span></div></div>}
                        {form.callouts.map((callout, index) => <button key={`${callout.name}-${index}`} type="button" title={`${callout.name}. Arraste ou use as setas.`} aria-label={`${callout.name}, x ${callout.x}, y ${callout.y}`} onClick={(e) => { e.stopPropagation(); setSelectedCallout(index); }} onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDraggingCallout(index); setSelectedCallout(index); }} onKeyDown={(e) => moveWithKeyboard(e, index)} className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[10px] font-bold shadow-lg ${selectedCallout === index ? 'border-white bg-brand-500 text-dark-950' : 'border-dark-950 bg-red-500 text-white'}`} style={{ left: `${callout.x}%`, top: `${callout.y}%` }}>{index + 1}</button>)}
                    </div>
                </div>
                <div className="min-h-64 rounded-lg border border-white/10 bg-dark-950 p-4">
                    {selected && selectedCallout !== null ? <div className="space-y-4"><div className="flex items-center justify-between"><h3 className="font-bold text-white">Callout {selectedCallout + 1}</h3><button type="button" title="Remover callout" onClick={() => { setForm((current) => ({ ...current, callouts: current.callouts.filter((_, index) => index !== selectedCallout) })); setSelectedCallout(null); }} className="text-red-400"><Trash2 className="h-4 w-4" /></button></div>
                        <label className="block text-xs text-gray-500">Nome<input value={selected.name} onChange={(e) => updateCallout(selectedCallout, { name: e.target.value })} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white" /></label>
                        <label className="block text-xs text-gray-500">Tipo<select value={selected.type} onChange={(e) => updateCallout(selectedCallout, { type: e.target.value as MapCallout['type'] })} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white">{CALLOUT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                        <div className="grid grid-cols-2 gap-2"><label className="text-xs text-gray-500">X<input type="number" min="0" max="100" step="0.01" value={selected.x} onChange={(e) => updateCallout(selectedCallout, { x: clamp(Number(e.target.value)) })} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-gray-500">Y<input type="number" min="0" max="100" step="0.01" value={selected.y} onChange={(e) => updateCallout(selectedCallout, { y: clamp(Number(e.target.value)) })} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white" /></label></div>
                        <label className="block text-xs text-gray-500">Descricao<textarea rows={4} maxLength={500} value={selected.description || ''} onChange={(e) => updateCallout(selectedCallout, { description: e.target.value })} className="mt-1 w-full resize-y rounded border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white" /></label>
                    </div> : <div className="grid h-full place-items-center text-center text-sm text-gray-500"><div><MapPin className="mx-auto mb-2 h-8 w-8" />Selecione um marcador para editar.</div></div>}
                </div>
            </div>
        </form>

        <div className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar mapa..." className="w-full rounded-lg border border-white/10 bg-dark-900 py-2.5 pl-9 pr-3 text-sm text-white" /></div><select value={gameFilter} onChange={(e) => { setGameFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-dark-900 px-3 py-2.5 text-sm text-white"><option value="">Todos os jogos</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select><select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as '' | ContentStatus); setPage(1); }} className="rounded-lg border border-white/10 bg-dark-900 px-3 py-2.5 text-sm text-white"><option value="">Todos os estados</option><option value="DRAFT">Rascunhos</option><option value="PUBLISHED">Publicados</option><option value="ARCHIVED">Arquivados</option></select></div>
            {loading ? <div className="py-16 text-center text-sm text-gray-500">Carregando mapas...</div> : items.length === 0 ? <div className="border-y border-dashed border-white/10 py-16 text-center text-gray-500"><MapIcon className="mx-auto mb-2 h-8 w-8" />Nenhum mapa encontrado.</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((map) => <article key={map.id} className="overflow-hidden rounded-lg border border-white/5 bg-dark-900"><img src={map.image} alt="" className="aspect-video w-full object-cover" /><div className="p-4"><span className="text-[10px] font-bold uppercase text-brand-400">{map.status}</span><h2 className="font-bold text-white">{map.name}</h2><p className="text-xs text-gray-500">{map.game?.name} · {map.callouts.length} callouts</p></div><div className="grid grid-cols-3 border-t border-white/5"><button type="button" title="Editar mapa" onClick={() => edit(map)} className="grid h-11 place-items-center text-gray-400 hover:bg-white/5"><Edit3 className="h-4 w-4" /></button><button type="button" title="Arquivar mapa" onClick={() => archive(map)} disabled={map.status === 'ARCHIVED'} className="grid h-11 place-items-center border-x border-white/5 text-amber-400 disabled:opacity-30"><Archive className="h-4 w-4" /></button><button type="button" title="Excluir mapa" onClick={() => remove(map)} className="grid h-11 place-items-center text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
            <PaginationControls pagination={pagination} onPageChange={setPage} onPageSizeChange={setPageSize} disabled={loading} pageSizeOptions={[10, 20, 50]} />
        </div>
    </div>;
};
