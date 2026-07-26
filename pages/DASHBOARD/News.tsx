import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Archive,
    Code2,
    Copy,
    Edit3,
    Eye,
    Image as ImageIcon,
    Link as LinkIcon,
    List,
    Plus,
    Quote,
    Save,
    Search,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import { Button } from '../../components/UI';
import { News as NewsItem, TournamentAdmin } from '../../types';
import type { NewsStatus, PaginationMeta } from '../../types';
import { PaginationControls } from '../../components/PaginationControls';
import { usePaginatedListQuery } from '../../src/hooks/usePaginatedListQuery';
import {
    archiveNews,
    createNews,
    deleteNews,
    getAdminNews,
    getAdminTournaments,
    NewsInput,
    updateNews,
    uploadNewsImage
} from '../../src/services/api';

const EMPTY_FORM: NewsInput = {
    headline: '',
    content: '<p></p>',
    category: 'Geral',
    image: '',
    author: '',
    slug: '',
    status: 'DRAFT',
    scheduledAt: null,
    seoTitle: '',
    seoDescription: '',
    tournamentId: null
};

const EMPTY_PAGINATION: PaginationMeta = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
};

const getErrorMessage = (error: any): string =>
    error?.response?.data?.error || 'Nao foi possivel concluir a operacao.';

export const News: React.FC = () => {
    const { page, pageSize, search, setPage, setPageSize, setSearch } = usePaginatedListQuery(10);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<'' | NewsStatus>('');
    const [authorFilter, setAuthorFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
    const [form, setForm] = useState<NewsInput>({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [view, setView] = useState<'editor' | 'preview'>('editor');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tournaments, setTournaments] = useState<TournamentAdmin[]>([]);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    const loadNews = async () => {
        setLoading(true);
        try {
            const result = await getAdminNews({
                page, pageSize, search,
                status: statusFilter || undefined,
                author: authorFilter || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined
            });
            setNews(result.items);
            setPagination(result.pagination);
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = window.setTimeout(loadNews, 250);
        return () => window.clearTimeout(timeout);
    }, [page, pageSize, search, statusFilter, authorFilter, dateFrom, dateTo]);
    useEffect(() => { getAdminTournaments({ page: 1, pageSize: 100, sort: 'name', order: 'asc' }).then((result) => setTournaments(result.items)).catch(() => undefined); }, []);

    const previewDocument = useMemo(() => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline';">
  <style>
    body { margin: 0; padding: 24px; background: #0b0d12; color: #d1d5db; font: 16px/1.7 Arial, sans-serif; }
    h2, h3, h4, strong { color: white; } a { color: #38bdf8; } img { max-width: 100%; height: auto; }
    blockquote { border-left: 3px solid #0ea5e9; margin-left: 0; padding-left: 16px; color: #94a3b8; }
    code, pre { background: #171a22; } pre { padding: 16px; overflow: auto; }
  </style>
</head>
<body>${form.content}</body>
</html>`, [form.content]);

    const resetForm = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setView('editor');
        setError('');
        setSuccess('');
    };

    const edit = (item: NewsItem) => {
        setEditingId(item.id);
        setForm({
            headline: item.headline,
            slug: item.slug,
            category: item.category,
            image: item.image || '',
            content: item.content || '<p></p>',
            author: item.author || '',
            status: item.status,
            publishedAt: item.publishedAt || null,
            scheduledAt: item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : null,
            seoTitle: item.seoTitle || '',
            seoDescription: item.seoDescription || ''
            ,tournamentId: item.tournamentId || null
        });
        setView('editor');
        setError('');
        setSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const insertMarkup = (before: string, after: string, placeholder: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selected = form.content.slice(start, end) || placeholder;
        const next = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
        setForm((current) => ({ ...current, content: next }));
        requestAnimationFrame(() => {
            editor.focus();
            editor.setSelectionRange(start + before.length, start + before.length + selected.length);
        });
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('A imagem deve ter no maximo 5 MB.');
            return;
        }

        setUploading(true);
        setError('');
        try {
            const uploaded = await uploadNewsImage(file);
            setForm((current) => ({ ...current, image: uploaded.url }));
            setSuccess('Imagem enviada. Ela sera vinculada ao salvar a noticia.');
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const wasEditing = Boolean(editingId);
            const payload = {
                ...form,
                scheduledAt: form.status === 'SCHEDULED' && form.scheduledAt
                    ? new Date(form.scheduledAt).toISOString()
                    : null
            };
            const saved = editingId
                ? await updateNews(editingId, payload)
                : await createNews(payload);
            setSuccess(wasEditing ? 'Noticia atualizada.' : 'Noticia criada.');
            setEditingId(saved.id);
            if (!wasEditing && page !== 1) setPage(1);
            else await loadNews();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: NewsItem) => {
        if (!window.confirm(`Excluir "${item.headline}"? Os comentarios tambem serao removidos.`)) return;
        setDeletingId(item.id);
        setError('');
        try {
            await deleteNews(item.id);
            if (editingId === item.id) resetForm();
            setSuccess('Noticia excluida.');
            if (news.length === 1 && page > 1) setPage(page - 1);
            else await loadNews();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        } finally {
            setDeletingId(null);
        }
    };

    const handleArchive = async (item: NewsItem) => {
        if (!window.confirm(`Arquivar "${item.headline}"?`)) return;
        try {
            await archiveNews(item.id);
            if (editingId === item.id) resetForm();
            setSuccess('Noticia arquivada.');
            await loadNews();
        } catch (requestError) {
            setError(getErrorMessage(requestError));
        }
    };

    const duplicate = (item: NewsItem) => {
        setEditingId(null);
        setForm({
            headline: `${item.headline} (copia)`,
            slug: '',
            category: item.category,
            image: item.image || '',
            content: item.content || '<p></p>',
            author: item.author || '',
            status: 'DRAFT',
            scheduledAt: null,
            publishedAt: null,
            seoTitle: item.seoTitle || '',
            seoDescription: item.seoDescription || ''
        });
        setView('editor');
        setSuccess('Copia preparada como rascunho. Revise e salve.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display">Central de Noticias</h2>
                    <p className="text-gray-400 text-sm">Publique e mantenha o conteudo editorial do site.</p>
                </div>
                <Button type="button" variant="outline" onClick={resetForm}>
                    <Plus className="w-4 h-4" /> Nova noticia
                </Button>
            </div>

            {(error || success) && (
                <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>
                    <AlertCircle className="w-5 h-5 flex-none" />
                    <span>{error || success}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
                <form onSubmit={handleSubmit} className="space-y-6 bg-dark-900 border border-white/5 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                            <h3 className="font-bold text-white">{editingId ? 'Editar noticia' : 'Nova noticia'}</h3>
                            <p className="text-xs text-gray-500 mt-1">O HTML permitido sera sanitizado pelo servidor.</p>
                        </div>
                        {editingId && <span className="text-xs text-brand-400 font-bold uppercase">Editando</span>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Titulo</label>
                        <input
                            required
                            minLength={5}
                            maxLength={160}
                            value={form.headline}
                            onChange={(event) => setForm({ ...form, headline: event.target.value })}
                            className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                            placeholder="Titulo claro e descritivo"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Slug</label>
                            <input value={form.slug || ''} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="gerado pelo titulo" className="w-full rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500" />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Estado editorial</label>
                            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as NewsStatus })} className="w-full rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500">
                                <option value="DRAFT">Rascunho</option>
                                <option value="SCHEDULED">Agendada</option>
                                <option value="PUBLISHED">Publicada</option>
                                <option value="ARCHIVED">Arquivada</option>
                            </select>
                        </div>
                    </div>

                    {form.status === 'SCHEDULED' && <div>
                        <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Publicar em</label>
                        <input required type="datetime-local" value={form.scheduledAt || ''} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} className="w-full rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500" />
                        <p className="mt-1 text-xs text-gray-500">O horario sera convertido a partir do fuso do navegador.</p>
                    </div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Categoria</label>
                            <select
                                value={form.category}
                                onChange={(event) => setForm({ ...form, category: event.target.value })}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                            >
                                <option>Geral</option>
                                <option>E-Sports</option>
                                <option>Atualizacoes</option>
                                <option>Comunidade</option>
                                <option>Lancamentos</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Autor</label>
                            <input
                                maxLength={80}
                                value={form.author}
                                onChange={(event) => setForm({ ...form, author: event.target.value })}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                                placeholder="Em branco usa o administrador"
                            />
                        </div>
                    </div>

                    {form.category === 'E-Sports' && <div>
                        <label className="mb-2 block text-xs font-bold uppercase text-gray-500">Campeonato relacionado</label>
                        <select value={form.tournamentId || ''} onChange={(event) => setForm({ ...form, tournamentId: event.target.value || null })} className="w-full rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500">
                            <option value="">Noticia geral de e-sports</option>
                            {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                    </div>}

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Imagem de capa</label>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                            <input
                                type="url"
                                value={form.image}
                                onChange={(event) => setForm({ ...form, image: event.target.value })}
                                className="w-full bg-dark-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500"
                                placeholder="https://..."
                            />
                            <label className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-brand-500/30 px-5 text-sm font-bold text-brand-400 hover:bg-brand-500/10 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Upload className="w-4 h-4" /> {uploading ? 'Enviando' : 'Upload'}
                                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={handleUpload} disabled={uploading} />
                            </label>
                        </div>
                        {form.image && (
                            <div className="mt-3 aspect-video max-w-md overflow-hidden rounded-lg border border-white/10 bg-dark-950">
                                <img src={form.image} alt="Previa da capa" className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 border-y border-white/5 py-5">
                        <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-white">SEO</h4><span className="text-xs text-gray-500">Preview nos buscadores</span></div>
                        <label className="block text-xs font-bold uppercase text-gray-500">Titulo SEO
                            <input maxLength={70} value={form.seoTitle || ''} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} placeholder={form.headline || 'Titulo exibido no resultado'} className="mt-2 w-full rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500" />
                            <span className="mt-1 block text-right text-[11px] font-normal normal-case">{(form.seoTitle || '').length}/70</span>
                        </label>
                        <label className="block text-xs font-bold uppercase text-gray-500">Descricao SEO
                            <textarea rows={3} maxLength={170} value={form.seoDescription || ''} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-dark-950 px-4 py-3 text-white outline-none focus:border-brand-500" />
                            <span className="mt-1 block text-right text-[11px] font-normal normal-case">{(form.seoDescription || '').length}/170</span>
                        </label>
                        <div className="rounded-lg border border-white/10 bg-white p-4">
                            <p className="truncate text-lg text-blue-700">{form.seoTitle || form.headline || 'Titulo da noticia'}</p>
                            <p className="truncate text-xs text-green-700">dicionariogamer.com/news/{form.slug || 'slug-da-noticia'}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-700">{form.seoDescription || 'A descricao da noticia aparecera aqui.'}</p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <label className="text-xs font-bold uppercase text-gray-500">Conteudo</label>
                            <div className="inline-flex rounded-lg border border-white/10 bg-dark-950 p-1 self-start">
                                <button type="button" onClick={() => setView('editor')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${view === 'editor' ? 'bg-dark-700 text-white' : 'text-gray-500'}`}><Code2 className="w-3 h-3" /> Editor</button>
                                <button type="button" onClick={() => setView('preview')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${view === 'preview' ? 'bg-dark-700 text-white' : 'text-gray-500'}`}><Eye className="w-3 h-3" /> Preview</button>
                            </div>
                        </div>

                        {view === 'editor' ? (
                            <>
                                <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-white/10 bg-dark-800 p-2">
                                    <button type="button" title="Negrito" onClick={() => insertMarkup('<strong>', '</strong>', 'texto')} className="p-2 text-sm font-bold text-gray-300 hover:bg-white/10 rounded">B</button>
                                    <button type="button" title="Italico" onClick={() => insertMarkup('<em>', '</em>', 'texto')} className="p-2 text-sm italic text-gray-300 hover:bg-white/10 rounded">I</button>
                                    <button type="button" title="Subtitulo" onClick={() => insertMarkup('<h2>', '</h2>', 'Subtitulo')} className="p-2 text-xs font-bold text-gray-300 hover:bg-white/10 rounded">H2</button>
                                    <button type="button" title="Link" onClick={() => insertMarkup('<a href="https://" target="_blank">', '</a>', 'link')} className="p-2 text-gray-300 hover:bg-white/10 rounded"><LinkIcon className="w-4 h-4" /></button>
                                    <button type="button" title="Citacao" onClick={() => insertMarkup('<blockquote>', '</blockquote>', 'Citacao')} className="p-2 text-gray-300 hover:bg-white/10 rounded"><Quote className="w-4 h-4" /></button>
                                    <button type="button" title="Lista" onClick={() => insertMarkup('<ul>\n  <li>', '</li>\n</ul>', 'Item')} className="p-2 text-gray-300 hover:bg-white/10 rounded"><List className="w-4 h-4" /></button>
                                </div>
                                <textarea
                                    ref={editorRef}
                                    required
                                    value={form.content}
                                    onChange={(event) => setForm({ ...form, content: event.target.value })}
                                    rows={18}
                                    className="w-full rounded-b-lg border border-white/10 bg-dark-950 p-4 font-mono text-sm leading-6 text-gray-200 focus:outline-none focus:border-brand-500 resize-y"
                                />
                            </>
                        ) : (
                            <iframe
                                title="Preview seguro da noticia"
                                sandbox=""
                                srcDoc={previewDocument}
                                className="w-full min-h-[440px] rounded-lg border border-white/10 bg-dark-950"
                            />
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-white/5 pt-5">
                        {editingId && <Button type="button" variant="ghost" onClick={resetForm}><X className="w-4 h-4" /> Cancelar</Button>}
                        <Button type="submit" disabled={saving || uploading} className="sm:min-w-44">
                            <Save className="w-4 h-4" /> {editingId ? 'Salvar alteracoes' : 'Salvar noticia'}
                        </Button>
                    </div>
                </form>

                <aside className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase">Noticias</h3>
                        <span className="text-xs text-gray-500">{pagination.total}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-dark-900 p-1">
                        {([
                            ['', 'Todas'], ['DRAFT', 'Rascunhos'], ['SCHEDULED', 'Agendadas'], ['PUBLISHED', 'Publicadas'], ['ARCHIVED', 'Arquivadas']
                        ] as Array<['' | NewsStatus, string]>).map(([value, label]) => <button key={value || 'all'} type="button" onClick={() => { setStatusFilter(value); setPage(1); }} className={`rounded px-2 py-2 text-xs font-bold ${statusFilter === value ? 'bg-brand-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>{label}</button>)}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar noticia..."
                            className="w-full rounded-lg border border-white/10 bg-dark-900 py-2 pl-9 pr-3 text-sm text-white focus:border-brand-500 focus:outline-none"
                        />
                    </div>
                    <input value={authorFilter} onChange={(event) => { setAuthorFilter(event.target.value); setPage(1); }} placeholder="Filtrar por autor" className="w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-white outline-none focus:border-brand-500" />
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-bold uppercase text-gray-500">De<input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-2 py-2 text-xs text-white" /></label>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Ate<input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="mt-1 w-full rounded border border-white/10 bg-dark-900 px-2 py-2 text-xs text-white" /></label>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-sm text-gray-500">Carregando...</div>
                    ) : news.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-lg text-sm text-gray-500">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" /> Nenhuma noticia encontrada.
                        </div>
                    ) : news.map((item) => (
                        <article key={item.id} className={`border rounded-lg overflow-hidden ${editingId === item.id ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/5 bg-dark-900'}`}>
                            {item.image && <img src={item.image} alt="" className="w-full h-28 object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                            <div className="p-4">
                                <p className="text-[10px] font-bold uppercase text-brand-400 mb-1">{item.category} · {item.status}</p>
                                <h4 className="text-sm font-bold text-white line-clamp-2">{item.headline}</h4>
                                <p className="text-xs text-gray-500 mt-2">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
                                <div className="grid grid-cols-4 gap-1 mt-4">
                                    <button title="Editar noticia" type="button" onClick={() => edit(item)} className="grid h-9 place-items-center rounded border border-white/10 text-gray-300 hover:bg-white/5"><Edit3 className="w-3 h-3" /></button>
                                    <button title="Duplicar como rascunho" type="button" onClick={() => duplicate(item)} className="grid h-9 place-items-center rounded border border-white/10 text-gray-300 hover:bg-white/5"><Copy className="w-3 h-3" /></button>
                                    <button title="Arquivar noticia" type="button" onClick={() => handleArchive(item)} disabled={item.status === 'ARCHIVED'} className="grid h-9 place-items-center rounded border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30"><Archive className="w-3 h-3" /></button>
                                    <button title="Excluir noticia" type="button" onClick={() => handleDelete(item)} disabled={deletingId === item.id} className="grid h-9 place-items-center rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </article>
                    ))}
                    <div className="overflow-hidden rounded-lg border border-white/5 bg-dark-900">
                        <PaginationControls
                            pagination={pagination}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            disabled={loading}
                            pageSizeOptions={[5, 10, 20]}
                        />
                    </div>
                </aside>
            </div>
        </div>
    );
};
