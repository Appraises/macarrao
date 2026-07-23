import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Inbox, Loader2, X } from 'lucide-react';
import { getPendingMeanings, moderateMeaning } from '../../src/services/api';
import type { PendingMeaning } from '../../types';

/**
 * Moderation queue for senses proposed by the community. Approving publishes the
 * sense on the term entry; the term itself is never affected while it waits here.
 */
export const Meanings: React.FC = () => {
    const [items, setItems] = useState<PendingMeaning[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await getPendingMeanings());
        } catch {
            setNotice({ kind: 'error', text: 'Nao foi possivel carregar a fila.' });
        } finally {
            setLoading(false);
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
                <h1 className="text-2xl font-bold text-white">Significados propostos</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Sentidos que a comunidade sugeriu para palavras que ja existem. Aprovar publica o significado na entrada do termo.
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
        </div>
    );
};
