import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, ExternalLink, Flag, Inbox, Loader2, X } from 'lucide-react';
import {
    acceptTermMedia, declineTermMedia, getAdminPendingMedia, getPendingMeanings, moderateMeaning,
} from '../../src/services/api';
import type { PendingMeaning, PendingTermMedia } from '../../types';

/**
 * Moderation queue for senses proposed by the community. Approving publishes the
 * sense on the term entry; the term itself is never affected while it waits here.
 */
export const Meanings: React.FC = () => {
    const [items, setItems] = useState<PendingMeaning[]>([]);
    const [media, setMedia] = useState<PendingTermMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [meanings, pendingMedia] = await Promise.all([getPendingMeanings(), getAdminPendingMedia()]);
            setItems(meanings);
            setMedia(pendingMedia);
        } catch {
            setNotice({ kind: 'error', text: 'Nao foi possivel carregar a fila.' });
        } finally {
            setLoading(false);
        }
    };

    // Admin backstop: origin notes and images that owners can't handle (flagged) or
    // that belong to terms with no owner at all.
    const decideMedia = async (item: PendingTermMedia, accept: boolean) => {
        setBusy(item.id);
        setNotice(null);
        try {
            await (accept ? acceptTermMedia(item.id) : declineTermMedia(item.id));
            setMedia((current) => current.filter((entry) => entry.id !== item.id));
            const label = item.kind === 'ORIGIN' ? 'Origem' : 'Imagem';
            const wasReported = Boolean(item.reports?.length);
            const outcome = accept ? (wasReported ? 'mantida' : 'publicada') : (wasReported ? 'removida' : 'recusada');
            setNotice({ kind: 'success', text: `${label} ${outcome} em "${item.term.word}".` });
        } catch (error: any) {
            setNotice({ kind: 'error', text: error?.response?.data?.error || 'Nao foi possivel concluir a operacao.' });
        } finally {
            setBusy(null);
        }
    };

    useEffect(() => { void load(); }, []);

    const decide = async (item: PendingMeaning, status: 'APPROVED' | 'REJECTED') => {
        setBusy(item.id);
        setNotice(null);
        try {
            await moderateMeaning(item.id, status);
            setItems((current) => current.filter((entry) => entry.id !== item.id));
            setNotice({
                kind: 'success',
                text: status === 'APPROVED'
                    ? `Significado publicado em "${item.term.word}".`
                    : `Significado recusado em "${item.term.word}".`,
            });
        } catch (error: any) {
            setNotice({ kind: 'error', text: error?.response?.data?.error || 'Nao foi possivel concluir a operacao.' });
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div className="h-[420px] animate-pulse rounded bg-white/5" />;

    return (
        <div className="min-w-0 space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-white">Contribuições da comunidade</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Significados, origens e imagens sugeridos para termos que ja existem. Origens e imagens sao curadas pelo dono do termo;
                    o que aparece aqui e o que precisa de voce.
                </p>
            </div>

            {notice && (
                <div className={`flex items-start justify-between gap-3 rounded border px-4 py-3 text-sm ${
                    notice.kind === 'error'
                        ? 'border-rose-500/25 bg-rose-500/10 text-rose-200'
                        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                }`}>
                    <span>{notice.text}</span>
                    <button type="button" aria-label="Fechar mensagem" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
                </div>
            )}

            <h2 className="pt-2 text-sm font-bold uppercase tracking-wider text-gray-500">Significados</h2>

            {items.length === 0 ? (
                <div className="rounded border border-white/10 bg-dark-900 py-16 text-center">
                    <Inbox className="mx-auto mb-3 h-9 w-9 text-gray-600" />
                    <p className="font-medium text-gray-300">Nenhum significado aguardando</p>
                    <p className="mt-1 text-sm text-gray-500">Quando alguem propuser um novo sentido, ele aparece aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <article key={item.id} className="rounded border border-white/10 bg-dark-900 p-5">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <Link
                                    to={`/dashboard/terms/${item.term.id}`}
                                    className="inline-flex items-center gap-1.5 text-lg font-bold text-white hover:text-brand-300"
                                >
                                    {item.term.word} <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
                                </Link>
                                {item.game && <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-300">{item.game.name}</span>}
                                {item.context && <span className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-gray-400">{item.context}</span>}
                            </div>

                            <p className="text-sm leading-relaxed text-gray-200">{item.definition}</p>

                            {item.examples.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {item.examples.map((example, index) => (
                                        <li key={index} className="border-l-2 border-brand-500/30 pl-3 text-sm italic text-gray-400">"{example}"</li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                                <span className="text-xs text-gray-500">
                                    por <span className="font-semibold text-gray-400">{item.author?.name || 'anonimo'}</span>
                                    {item.author?.level ? ` · Nivel ${item.author.level}` : ''}
                                    {' · '}{new Date(item.createdAt).toLocaleString('pt-BR')}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={busy === item.id}
                                        onClick={() => decide(item, 'REJECTED')}
                                        className="inline-flex h-9 items-center gap-1.5 rounded border border-white/10 px-3 text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-40"
                                    >
                                        {busy === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Recusar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy === item.id}
                                        onClick={() => decide(item, 'APPROVED')}
                                        className="inline-flex h-9 items-center gap-1.5 rounded bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
                                    >
                                        <Check className="h-3.5 w-3.5" /> Aprovar
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <h2 className="pt-4 text-sm font-bold uppercase tracking-wider text-gray-500">Origens e imagens</h2>

            {media.length === 0 ? (
                <div className="rounded border border-white/10 bg-dark-900 py-12 text-center">
                    <Inbox className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-400">Nada aguardando o admin</p>
                    <p className="mt-1 text-xs text-gray-600">Origens e imagens vao primeiro para o dono do termo. Aqui chegam as sinalizadas e as de termos sem dono.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {media.map((item) => (
                        <article key={item.id} className="rounded border border-white/10 bg-dark-900 p-5">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <Link to={`/dashboard/terms/${item.term.id}`} className="inline-flex items-center gap-1.5 text-lg font-bold text-white hover:text-brand-300">
                                    {item.term.word} <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
                                </Link>
                                <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-bold uppercase text-gray-400">
                                    {item.kind === 'ORIGIN' ? 'Origem' : 'Imagem'}
                                </span>
                                {item.reports && item.reports.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                                        <Flag className="h-3 w-3" /> {item.reports.length} denúncia{item.reports.length > 1 ? 's' : ''} · publicada
                                    </span>
                                ) : item.flagged ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                                        <AlertTriangle className="h-3 w-3" /> Sinalizada{item.flagReason ? ` (${item.flagReason})` : ''}
                                    </span>
                                ) : null}
                            </div>

                            {item.reports && item.reports.length > 0 && (
                                <ul className="mb-3 space-y-1">
                                    {item.reports.map((r) => (
                                        <li key={r.id} className="rounded border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs text-rose-200">
                                            <span className="font-bold uppercase">{r.reason}</span>
                                            {r.details ? <span className="text-rose-200/80"> — {r.details}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {item.kind === 'ORIGIN' ? (
                                <p className="text-sm leading-relaxed text-gray-200">{item.content}</p>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    <img src={item.url || ''} alt="" className="h-28 w-40 flex-none rounded border border-white/10 object-cover" />
                                    {item.content && <p className="text-sm italic text-gray-400">"{item.content}"</p>}
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                                <span className="text-xs text-gray-500">
                                    por <span className="font-semibold text-gray-400">{item.author?.name || 'anonimo'}</span>
                                    {' · '}{new Date(item.createdAt).toLocaleString('pt-BR')}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={busy === item.id}
                                        onClick={() => decideMedia(item, false)}
                                        className="inline-flex h-9 items-center gap-1.5 rounded border border-white/10 px-3 text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-40"
                                    >
                                        {busy === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                        {item.reports?.length ? 'Remover' : 'Recusar'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy === item.id}
                                        onClick={() => decideMedia(item, true)}
                                        className="inline-flex h-9 items-center gap-1.5 rounded bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
                                    >
                                        <Check className="h-3.5 w-3.5" /> {item.reports?.length ? 'Manter' : 'Aprovar'}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};
