import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    AlertTriangle, Archive, ArchiveRestore, ArrowLeft, BookOpen, Check, Clock3,
    Eye, Flag, History, Plus, RefreshCw, Save, Search, Trash2, X
} from 'lucide-react';
import {
    archiveAdminTerm, createAdminTerm, deleteAdminTerm, getAdminTerm,
    getAdminTermDuplicates, getAdminTermHistory, getGames, restoreAdminTerm,
    searchTerms, updateAdminTerm, updateReportStatus
} from '../../src/services/api';
import type {
    AdminTermDetail, AdminTermDuplicate, AdminTermInput, Game, TermHistoryEntry, TermSuggestion
} from '../../types';
import { MeaningsEditor } from '../../components/dashboard/MeaningsEditor';

type Tab = 'content' | 'history' | 'reports';
const EMPTY_FORM: AdminTermInput = {
    word: '', definition: '', gameId: null, tags: [], examples: [''],
    phonetic: null, pronunciationGuide: null, relatedTerms: [], aliases: []
};
const inputClass = 'w-full rounded border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-brand-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-400';
const messageFrom = (error: any) => error?.response?.data?.error || 'Nao foi possivel concluir a operacao.';
const cleanArray = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);
const serialize = (form: AdminTermInput) => JSON.stringify({ ...form, examples: cleanArray(form.examples), tags: cleanArray(form.tags), relatedTerms: cleanArray(form.relatedTerms), aliases: cleanArray(form.aliases) });

const historyLabel = (entry: TermHistoryEntry) => {
    const labels: Record<string, string> = {
        TERM_CREATE: 'Termo publicado pelo painel', TERM_UPDATE: 'Conteudo editado',
        TERM_ARCHIVE: 'Termo arquivado', TERM_RESTORE: 'Termo restaurado', TERM_DELETE: 'Termo excluido',
        SUBMITTED: 'Contribuicao enviada', AUTHOR_UPDATED: 'Autor atualizou', CHANGES_REQUESTED: 'Revisao solicitada',
        RESUBMITTED: 'Contribuicao reenviada', APPROVED: 'Contribuicao aprovada', REJECTED: 'Contribuicao rejeitada', MIGRATED: 'Conteudo migrado'
    };
    return labels[entry.action || entry.type || ''] || entry.action || entry.type || 'Alteracao registrada';
};

export const TermEditor: React.FC = () => {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('content');
    const [detail, setDetail] = useState<AdminTermDetail | null>(null);
    const [form, setForm] = useState<AdminTermInput>({ ...EMPTY_FORM });
    const [initial, setInitial] = useState(serialize(EMPTY_FORM));
    const [games, setGames] = useState<Game[]>([]);
    const [historyEntries, setHistoryEntries] = useState<TermHistoryEntry[]>([]);
    const [duplicates, setDuplicates] = useState<AdminTermDuplicate[]>([]);
    const [relatedQuery, setRelatedQuery] = useState('');
    const [relatedSuggestions, setRelatedSuggestions] = useState<TermSuggestion[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [conflict, setConflict] = useState(false);
    const [archiveDialog, setArchiveDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const dirty = useMemo(() => serialize(form) !== initial, [form, initial]);
    const exactDuplicate = duplicates.find((item) => item.exact);

    const hydrate = (term: AdminTermDetail) => {
        const next: AdminTermInput = {
            word: term.word,
            definition: term.definition,
            gameId: term.gameId || null,
            tags: Array.isArray(term.tags) ? term.tags : [],
            examples: Array.isArray(term.examples) && term.examples.length ? term.examples : [''],
            phonetic: term.phonetic || null,
            pronunciationGuide: term.pronunciationGuide || null,
            relatedTerms: Array.isArray(term.relatedTerms) ? term.relatedTerms : [],
            aliases: Array.isArray(term.aliases) ? term.aliases : [],
        };
        setDetail(term);
        setForm(next);
        setInitial(serialize(next));
        setConflict(false);
    };

    const load = async () => {
        if (isNew || !id) return;
        setLoading(true);
        try {
            const [term, entries] = await Promise.all([getAdminTerm(id), getAdminTermHistory(id)]);
            hydrate(term);
            setHistoryEntries(entries);
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getGames().then(setGames).catch(() => setGames([]));
        void load();
    }, [id]);

    useEffect(() => {
        const guard = (event: BeforeUnloadEvent) => {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [dirty]);

    useEffect(() => {
        if (form.word.trim().length < 2) {
            setDuplicates([]);
            return;
        }
        const timer = window.setTimeout(() => {
            getAdminTermDuplicates(form.word, isNew ? undefined : id).then(setDuplicates).catch(() => setDuplicates([]));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [form.word, id, isNew]);

    useEffect(() => {
        if (relatedQuery.trim().length < 2) {
            setRelatedSuggestions([]);
            return;
        }
        const timer = window.setTimeout(() => searchTerms(relatedQuery).then(setRelatedSuggestions).catch(() => setRelatedSuggestions([])), 250);
        return () => window.clearTimeout(timer);
    }, [relatedQuery]);

    const setField = <K extends keyof AdminTermInput>(key: K, value: AdminTermInput[K]) => setForm((current) => ({ ...current, [key]: value }));

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setNotice(null);
        if (exactDuplicate) {
            setNotice({ kind: 'error', text: `Ja existe o termo "${exactDuplicate.word}". Abra o registro existente para edita-lo.` });
            return;
        }
        setSaving(true);
        const payload: AdminTermInput = {
            ...form,
            word: form.word.trim(), definition: form.definition.trim(),
            examples: cleanArray(form.examples), tags: cleanArray(form.tags),
            relatedTerms: cleanArray(form.relatedTerms), aliases: cleanArray(form.aliases),
            phonetic: form.phonetic?.trim() || null,
            pronunciationGuide: form.pronunciationGuide?.trim() || null,
        };
        try {
            if (isNew) {
                const created = await createAdminTerm(payload);
                setNotice({ kind: 'success', text: 'Termo publicado diretamente no catalogo.' });
                navigate(`/dashboard/terms/${created.id}`, { replace: true });
            } else if (id && detail) {
                const updated = await updateAdminTerm(id, { ...payload, expectedRevision: detail.revision });
                hydrate({ ...detail, ...updated });
                setNotice({ kind: 'success', text: 'Alteracoes salvas e publicadas.' });
                setHistoryEntries(await getAdminTermHistory(id));
            }
        } catch (error: any) {
            if (error?.response?.status === 409 && error?.response?.data?.details?.code === 'REVISION_CONFLICT') setConflict(true);
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setSaving(false);
        }
    };

    const changeArchive = async () => {
        if (!id || !detail) return;
        setSaving(true);
        try {
            if (detail.archivedAt) await restoreAdminTerm(id);
            else await archiveAdminTerm(id);
            setArchiveDialog(false);
            await load();
            setNotice({ kind: 'success', text: detail.archivedAt ? 'Termo restaurado no site.' : 'Termo arquivado e removido das rotas publicas.' });
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        } finally {
            setSaving(false);
        }
    };

    const permanentlyDelete = async () => {
        if (!id || !detail) return;
        setSaving(true);
        try {
            await deleteAdminTerm(id, deleteConfirmation);
            navigate('/dashboard/terms?state=ARCHIVED', { replace: true });
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
            setSaving(false);
        }
    };

    const leave = () => {
        if (!dirty || window.confirm('Existem alteracoes nao salvas. Deseja sair mesmo assim?')) navigate('/dashboard/terms');
    };

    const resolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
        try {
            await updateReportStatus(reportId, status);
            if (id) hydrate(await getAdminTerm(id));
        } catch (error) {
            setNotice({ kind: 'error', text: messageFrom(error) });
        }
    };

    if (loading) return <div className="space-y-4"><div className="h-10 w-72 animate-pulse rounded bg-white/5" /><div className="h-[560px] animate-pulse rounded bg-white/5" /></div>;

    return (
        <div className="min-w-0 space-y-5">
            <button type="button" onClick={leave} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar ao catalogo</button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-bold text-white">{isNew ? 'Novo termo' : detail?.word}</h1>
                        {detail?.archivedAt && <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300">Arquivado</span>}
                        {detail && <span className="text-xs text-gray-600">rev. {detail.revision}</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{isNew ? 'Publicacao administrativa direta, sem fluxo de contribuicao.' : 'Edite o conteudo publico e acompanhe todo o historico.'}</p>
                </div>
                {!isNew && detail && <div className="flex flex-wrap gap-2">
                    {!detail.archivedAt && <a href={`/term/${encodeURIComponent(detail.word)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5"><Eye className="h-4 w-4" /> Ver no site</a>}
                    <button type="button" onClick={() => setArchiveDialog(true)} className="inline-flex h-9 items-center gap-2 rounded border border-white/10 px-3 text-sm text-gray-300 hover:bg-white/5">{detail.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{detail.archivedAt ? 'Restaurar' : 'Arquivar'}</button>
                    {detail.archivedAt && <button type="button" onClick={() => setDeleteDialog(true)} className="grid h-9 w-9 place-items-center rounded border border-rose-500/20 text-rose-300 hover:bg-rose-500/10" aria-label="Excluir definitivamente" title="Excluir definitivamente"><Trash2 className="h-4 w-4" /></button>}
                </div>}
            </div>

            {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`}><span>{notice.text}</span><button type="button" aria-label="Fechar mensagem" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
            {conflict && <div className="flex flex-col gap-3 rounded border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"><span>Outra pessoa salvou uma versao mais recente deste termo.</span><button type="button" onClick={load} className="inline-flex items-center gap-2 font-semibold text-amber-200"><RefreshCw className="h-4 w-4" /> Recarregar versao atual</button></div>}

            <div className="flex border-b border-white/10" role="tablist">
                {([{ key: 'content', label: 'Conteudo', icon: BookOpen }, { key: 'history', label: 'Historico', icon: History }, { key: 'reports', label: `Denuncias${detail?.metrics.pendingReports ? ` (${detail.metrics.pendingReports})` : ''}`, icon: Flag }] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} disabled={isNew && key !== 'content'} className={`inline-flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium disabled:opacity-35 ${tab === key ? 'border-brand-400 text-brand-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Icon className="h-4 w-4" />{label}</button>
                ))}
            </div>

            {tab === 'content' && <form onSubmit={submit} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <section className="rounded border border-white/10 bg-dark-900 p-5">
                        <h2 className="mb-5 font-semibold text-white">Informacoes principais</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label><span className={labelClass}>Palavra *</span><input required maxLength={100} value={form.word} onChange={(event) => setField('word', event.target.value)} className={inputClass} /></label>
                            <label><span className={labelClass}>Jogo</span><select value={form.gameId || ''} onChange={(event) => setField('gameId', event.target.value || null)} className={inputClass}><option value="">Uso geral</option>{games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></label>
                            {!isNew && detail && form.word.trim() !== detail.word && <div className="sm:col-span-2 rounded border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle className="mr-1.5 inline h-4 w-4" />Alterar a palavra muda a URL publica. Redirecionamentos historicos ainda nao fazem parte desta etapa.</div>}
                            {duplicates.length > 0 && <div className={`sm:col-span-2 rounded border px-3 py-3 ${exactDuplicate ? 'border-rose-500/25 bg-rose-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}><p className={`text-xs font-semibold ${exactDuplicate ? 'text-rose-200' : 'text-amber-200'}`}>{exactDuplicate ? 'Duplicidade exata: o salvamento esta bloqueado.' : 'Possiveis duplicidades. Revise antes de salvar.'}</p><div className="mt-2 flex flex-wrap gap-2">{duplicates.map((item) => <Link key={item.id} to={`/dashboard/terms/${item.id}`} className="rounded border border-white/10 bg-dark-950 px-2 py-1 text-xs text-gray-300 hover:text-white">{item.word} · {Math.round(item.score * 100)}%</Link>)}</div></div>}
                            {isNew && <label className="sm:col-span-2"><span className={labelClass}>Definicao *</span><textarea required maxLength={2000} rows={7} value={form.definition} onChange={(event) => setField('definition', event.target.value)} className={`${inputClass} resize-y leading-6`} /><span className="mt-1 block text-xs text-gray-600">Vira o primeiro significado do termo. Depois de publicado, os significados sao gerenciados na secao abaixo.</span></label>}
                            <label><span className={labelClass}>Fonetica</span><input maxLength={100} value={form.phonetic || ''} onChange={(event) => setField('phonetic', event.target.value || null)} placeholder="Ex.: /gank/" className={inputClass} /></label>
                            <label><span className={labelClass}>Guia de pronuncia</span><input maxLength={120} value={form.pronunciationGuide || ''} onChange={(event) => setField('pronunciationGuide', event.target.value || null)} placeholder="Ex.: guenque" className={inputClass} /></label>
                        </div>
                    </section>

                    {!isNew && detail && (
                        <MeaningsEditor
                            termId={detail.id}
                            word={detail.word}
                            meanings={detail.meanings || []}
                            games={games}
                            onChanged={load}
                            onError={(text) => setNotice({ kind: 'error', text })}
                        />
                    )}

                    <section className="rounded border border-white/10 bg-dark-900 p-5">
                        <h2 className="mb-5 font-semibold text-white">Descoberta e contexto</h2>
                        <label><span className={labelClass}>Tags separadas por virgula</span><input value={form.tags.join(', ')} onChange={(event) => setField('tags', event.target.value.split(','))} placeholder="Estrategia, Competitivo, Economia" className={inputClass} /></label>
                        <label className="mt-5 block"><span className={labelClass}>Variacoes e sinonimos (separados por virgula)</span><input value={form.aliases.join(', ')} onChange={(event) => setField('aliases', event.target.value.split(','))} placeholder="gankar, gankado, ganking" className={inputClass} /><span className="mt-1 block text-xs text-gray-600">Grafias e formas alternativas. Ajudam a busca e o SEO a encontrar o termo, sem aparecer em destaque no site.</span></label>
                        <div className="mt-5"><div className="mb-2 flex items-center justify-between"><span className={labelClass}>Exemplos de uso</span><button type="button" onClick={() => setField('examples', [...form.examples, ''])} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"><Plus className="h-3.5 w-3.5" /> Adicionar</button></div><div className="space-y-2">{form.examples.map((example, index) => <div key={index} className="flex gap-2"><input maxLength={300} value={example} onChange={(event) => { const next = [...form.examples]; next[index] = event.target.value; setField('examples', next); }} placeholder={`Exemplo ${index + 1}`} className={inputClass} /><button type="button" aria-label={`Remover exemplo ${index + 1}`} onClick={() => setField('examples', form.examples.filter((_, itemIndex) => itemIndex !== index))} className="grid h-10 w-10 flex-none place-items-center rounded border border-white/10 text-gray-500 hover:text-rose-300"><X className="h-4 w-4" /></button></div>)}</div></div>
                        <div className="mt-5"><span className={labelClass}>Termos relacionados</span><div className="flex flex-wrap gap-2">{form.relatedTerms.map((word) => <span key={word} className="inline-flex items-center gap-1 rounded border border-white/10 bg-dark-950 px-2 py-1 text-xs text-gray-300">{word}<button type="button" aria-label={`Remover ${word}`} onClick={() => setField('relatedTerms', form.relatedTerms.filter((item) => item !== word))}><X className="h-3 w-3" /></button></span>)}</div><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-600" /><input value={relatedQuery} onChange={(event) => setRelatedQuery(event.target.value)} placeholder="Buscar termo publicado" className={`${inputClass} pl-9`} />{relatedSuggestions.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded border border-white/10 bg-dark-950 shadow-xl">{relatedSuggestions.filter((item) => item.word !== form.word && !form.relatedTerms.includes(item.word)).map((item) => <button key={item.id} type="button" onClick={() => { setField('relatedTerms', [...form.relatedTerms, item.word]); setRelatedQuery(''); setRelatedSuggestions([]); }} className="block w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white">{item.word}</button>)}</div>}</div></div>
                    </section>
                    <div className="flex items-center justify-between rounded border border-white/10 bg-dark-900 p-3"><span className="text-xs text-gray-500">{dirty ? 'Alterações ainda não salvas' : 'Tudo salvo'}</span><button type="submit" disabled={saving || Boolean(exactDuplicate) || !form.word.trim() || !form.definition.trim()} className="inline-flex h-10 items-center gap-2 rounded bg-brand-500 px-5 text-sm font-semibold text-dark-950 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{saving ? 'Salvando...' : isNew ? 'Publicar termo' : 'Salvar alterações'}</button></div>
                </div>

                <aside className="xl:sticky xl:top-8 xl:self-start">
                    <div className="overflow-hidden rounded border border-white/10 bg-dark-900">
                        <div className="border-b border-white/10 px-4 py-3 text-xs font-medium uppercase text-gray-500">Preview publico</div>
                        <div className="p-5"><div className="flex flex-wrap gap-1.5">{cleanArray(form.tags).map((tag) => <span key={tag} className="rounded bg-brand-500/10 px-2 py-1 text-[11px] text-brand-300">{tag}</span>)}</div><h2 className="mt-4 break-words text-2xl font-bold text-white">{form.word || 'Novo termo'}</h2>{form.phonetic && <p className="mt-1 text-sm text-gray-500">{form.phonetic}</p>}<p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">{form.definition || 'A definicao aparecera aqui enquanto voce escreve.'}</p>{cleanArray(form.examples).length > 0 && <div className="mt-5 border-l-2 border-brand-500/40 pl-3"><p className="text-xs font-semibold uppercase text-gray-500">Exemplo</p><p className="mt-1 text-sm italic text-gray-400">“{cleanArray(form.examples)[0]}”</p></div>}<div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-gray-500"><span>{games.find((game) => game.id === form.gameId)?.name || 'Uso geral'}</span><span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> Publicado</span></div></div>
                    </div>
                    {detail && <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-white/10 bg-white/10"><div className="bg-dark-900 p-3"><p className="text-lg font-semibold text-white">{detail.metrics.views28d}</p><p className="text-xs text-gray-500">views em 28d</p></div><div className="bg-dark-900 p-3"><p className="text-lg font-semibold text-white">{detail.metrics.voteBalance > 0 ? '+' : ''}{detail.metrics.voteBalance}</p><p className="text-xs text-gray-500">saldo de votos</p></div></div>}
                </aside>
            </form>}

            {tab === 'history' && <section className="rounded border border-white/10 bg-dark-900 p-5"><h2 className="font-semibold text-white">Linha do tempo</h2><p className="mt-1 text-sm text-gray-500">Moderacao e manutencao editorial aparecem juntas, sem misturar suas origens.</p><div className="mt-6 space-y-0">{historyEntries.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">Nenhum evento registrado.</p> : historyEntries.map((entry, index) => <div key={`${entry.source}-${entry.id}`} className="relative flex gap-4 pb-6"><div className="relative z-10 grid h-8 w-8 flex-none place-items-center rounded-full border border-white/10 bg-dark-950 text-gray-400">{entry.source === 'EDITORIAL' ? <History className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</div>{index < historyEntries.length - 1 && <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-white/10" />}<div className="min-w-0 pt-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-white">{historyLabel(entry)}</p><span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-gray-500">{entry.source === 'EDITORIAL' ? 'Editorial' : 'Moderacao'}</span></div><p className="mt-1 text-xs text-gray-500">{entry.actor?.name || 'Sistema'} · {new Date(entry.createdAt).toLocaleString('pt-BR')}</p>{entry.authorMessage && <p className="mt-2 rounded bg-white/5 px-3 py-2 text-sm text-gray-300">{entry.authorMessage}</p>}{entry.internalNote && <p className="mt-2 text-xs text-amber-300">Nota interna: {entry.internalNote}</p>}</div></div>)}</div></section>}

            {tab === 'reports' && <section className="rounded border border-white/10 bg-dark-900"><div className="border-b border-white/10 p-5"><h2 className="font-semibold text-white">Denuncias deste termo</h2><p className="mt-1 text-sm text-gray-500">Arquivar remove o termo do site; excluir definitivamente continua restrito ao catalogo.</p></div>{!detail?.reports.length ? <div className="py-14 text-center text-sm text-gray-500">Nenhuma denuncia para este termo.</div> : <div className="divide-y divide-white/5">{detail.reports.map((report) => <article key={report.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="font-medium text-white">{report.reason}</span><span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-gray-400">{report.status}</span></div>{report.details && <p className="mt-1 text-sm text-gray-400">{report.details}</p>}<p className="mt-1 text-xs text-gray-600">{new Date(report.createdAt).toLocaleString('pt-BR')}</p></div>{report.status === 'PENDING' && <div className="flex gap-2"><button type="button" onClick={() => resolveReport(report.id, 'DISMISSED')} className="h-9 rounded border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5">Descartar</button><button type="button" onClick={() => resolveReport(report.id, 'RESOLVED')} className="h-9 rounded bg-emerald-500/15 px-3 text-xs text-emerald-300 hover:bg-emerald-500/20">Resolver</button></div>}</article>)}</div>}</section>}

            {archiveDialog && detail && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded border border-white/10 bg-dark-900 p-5"><div className="mb-4 grid h-10 w-10 place-items-center rounded bg-amber-500/10 text-amber-300">{detail.archivedAt ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}</div><h2 className="text-lg font-semibold text-white">{detail.archivedAt ? 'Restaurar termo?' : 'Arquivar termo?'}</h2><p className="mt-2 text-sm leading-6 text-gray-400">{detail.archivedAt ? 'O termo voltara a aparecer no site imediatamente.' : 'O termo deixara de aparecer em todas as rotas publicas, mas seus dados e historico serao preservados.'}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setArchiveDialog(false)} className="h-10 rounded border border-white/10 px-4 text-sm text-gray-300">Cancelar</button><button type="button" disabled={saving} onClick={changeArchive} className="h-10 rounded bg-amber-400 px-4 text-sm font-semibold text-dark-950 disabled:opacity-50">Confirmar</button></div></div></div>}
            {deleteDialog && detail && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded border border-rose-500/20 bg-dark-900 p-5"><div className="mb-4 grid h-10 w-10 place-items-center rounded bg-rose-500/10 text-rose-300"><Trash2 className="h-5 w-5" /></div><h2 className="text-lg font-semibold text-white">Excluir definitivamente</h2><p className="mt-2 text-sm leading-6 text-gray-400">Esta acao apaga o termo arquivado e seus dados relacionados. Digite <strong className="text-white">{detail.word}</strong> para confirmar.</p><input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className={`${inputClass} mt-4`} /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { setDeleteDialog(false); setDeleteConfirmation(''); }} className="h-10 rounded border border-white/10 px-4 text-sm text-gray-300">Cancelar</button><button type="button" disabled={saving || deleteConfirmation !== detail.word} onClick={permanentlyDelete} className="h-10 rounded bg-rose-500 px-4 text-sm font-semibold text-white disabled:opacity-40">Excluir termo</button></div></div></div>}
        </div>
    );
};
