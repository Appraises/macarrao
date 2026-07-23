import React, { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
    createAdminMeaning, deleteAdminMeaning, moderateMeaning, updateAdminMeaning, MeaningInput,
} from '../../src/services/api';
import type { AdminTermMeaning, Game } from '../../types';

const inputClass = 'w-full rounded border border-white/10 bg-dark-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-brand-500';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-400';

const EMPTY: MeaningInput = { definition: '', examples: [''], gameId: null, context: null };

const clean = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, string> = {
        APPROVED: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        PENDING: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
        REJECTED: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    };
    const label: Record<string, string> = { APPROVED: 'Publicado', PENDING: 'Aguardando', REJECTED: 'Recusado' };
    return <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${map[status] || map.PENDING}`}>{label[status] || status}</span>;
};

interface MeaningFormProps {
    initial: MeaningInput;
    games: Game[];
    saving: boolean;
    onCancel: () => void;
    onSave: (value: MeaningInput) => void;
}

const MeaningForm: React.FC<MeaningFormProps> = ({ initial, games, saving, onCancel, onSave }) => {
    const [value, setValue] = useState<MeaningInput>(initial);
    const examples = value.examples.length ? value.examples : [''];

    return (
        <div className="rounded border border-brand-500/25 bg-dark-950 p-4">
            <label className="block">
                <span className={labelClass}>Definição *</span>
                <textarea
                    required rows={4} maxLength={2000}
                    value={value.definition}
                    onChange={(event) => setValue({ ...value, definition: event.target.value })}
                    className={`${inputClass} resize-y leading-6`}
                />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className={labelClass}>Jogo</span>
                    <select value={value.gameId || ''} onChange={(event) => setValue({ ...value, gameId: event.target.value || null })} className={inputClass}>
                        <option value="">Uso geral</option>
                        {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className={labelClass}>Contexto</span>
                    <input
                        maxLength={60} value={value.context || ''}
                        onChange={(event) => setValue({ ...value, context: event.target.value || null })}
                        placeholder="Ex.: competitivo" className={inputClass}
                    />
                </label>
            </div>
            <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                    <span className={labelClass}>Exemplos</span>
                    <button type="button" onClick={() => setValue({ ...value, examples: [...examples, ''] })} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                </div>
                <div className="space-y-2">
                    {examples.map((example, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                maxLength={300} value={example}
                                onChange={(event) => { const next = [...examples]; next[index] = event.target.value; setValue({ ...value, examples: next }); }}
                                placeholder={`Exemplo ${index + 1}`} className={inputClass}
                            />
                            {examples.length > 1 && (
                                <button type="button" aria-label={`Remover exemplo ${index + 1}`} onClick={() => setValue({ ...value, examples: examples.filter((_, i) => i !== index) })} className="grid h-10 w-10 flex-none place-items-center rounded border border-white/10 text-gray-500 hover:text-rose-300">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="h-9 rounded border border-white/10 px-3 text-sm text-gray-300">Cancelar</button>
                <button
                    type="button"
                    disabled={saving || value.definition.trim().length < 15}
                    onClick={() => onSave({ ...value, examples: clean(examples) })}
                    className="inline-flex h-9 items-center gap-2 rounded bg-brand-500 px-4 text-sm font-semibold text-dark-950 disabled:opacity-40"
                >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar significado
                </button>
            </div>
        </div>
    );
};

interface MeaningsEditorProps {
    termId: string;
    meanings: AdminTermMeaning[];
    games: Game[];
    onChanged: () => void;
    onError: (message: string) => void;
}

/**
 * Manages the senses of a term. Definition, examples and game live here now —
 * the term form owns only word-level fields, since those columns are derived.
 */
export const MeaningsEditor: React.FC<MeaningsEditorProps> = ({ termId, meanings, games, onChanged, onError }) => {
    const [editing, setEditing] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await action();
            setEditing(null);
            setAdding(false);
            onChanged();
        } catch (error: any) {
            onError(error?.response?.data?.error || 'Nao foi possivel concluir a operacao.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="rounded border border-white/10 bg-dark-900 p-5">
            <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold text-white">Significados</h2>
                {!adding && (
                    <button type="button" onClick={() => { setAdding(true); setEditing(null); }} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                )}
            </div>
            <p className="mb-4 text-xs text-gray-500">
                A definição principal do termo é a do significado mais votado. Ordem e destaque são decididos pelos votos.
            </p>

            <div className="space-y-3">
                {meanings.map((meaning, index) => (
                    <div key={meaning.id} className="rounded border border-white/10 bg-dark-950/60 p-4">
                        {editing === meaning.id ? (
                            <MeaningForm
                                initial={{
                                    definition: meaning.definition,
                                    examples: meaning.examples.length ? meaning.examples : [''],
                                    gameId: meaning.game?.id || null,
                                    context: meaning.context || null,
                                }}
                                games={games}
                                saving={busy}
                                onCancel={() => setEditing(null)}
                                onSave={(value) => run(() => updateAdminMeaning(meaning.id, value))}
                            />
                        ) : (
                            <>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">{index + 1}.</span>
                                    <StatusBadge status={meaning.status} />
                                    {meaning.game && <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[11px] font-bold text-brand-300">{meaning.game.name}</span>}
                                    {meaning.context && <span className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-gray-400">{meaning.context}</span>}
                                    <span className="ml-auto font-mono text-xs text-gray-500">{meaning.upvotes - meaning.downvotes > 0 ? '+' : ''}{meaning.upvotes - meaning.downvotes}</span>
                                </div>
                                <p className="text-sm leading-relaxed text-gray-200">{meaning.definition}</p>
                                {meaning.examples.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                        {meaning.examples.map((example, i) => (
                                            <li key={i} className="border-l-2 border-white/10 pl-3 text-xs italic text-gray-500">"{example}"</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                                    <span className="text-[11px] text-gray-600">{meaning.author ? `por ${meaning.author.name}` : 'editorial'}</span>
                                    <div className="flex gap-2">
                                        {meaning.status === 'PENDING' && (
                                            <button type="button" disabled={busy} onClick={() => run(() => moderateMeaning(meaning.id, 'APPROVED'))} className="inline-flex h-8 items-center gap-1 rounded bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40">
                                                <Check className="h-3.5 w-3.5" /> Aprovar
                                            </button>
                                        )}
                                        <button type="button" disabled={busy} onClick={() => { setEditing(meaning.id); setAdding(false); }} className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-2.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-40">
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </button>
                                        {meanings.length > 1 && (
                                            <button
                                                type="button" disabled={busy}
                                                onClick={() => { if (window.confirm('Excluir este significado?')) run(() => deleteAdminMeaning(meaning.id)); }}
                                                aria-label="Excluir significado"
                                                className="grid h-8 w-8 place-items-center rounded border border-rose-500/20 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {adding && (
                    <MeaningForm
                        initial={EMPTY}
                        games={games}
                        saving={busy}
                        onCancel={() => setAdding(false)}
                        onSave={(value) => run(() => createAdminMeaning(termId, value))}
                    />
                )}

                {meanings.length === 0 && !adding && (
                    <p className="py-8 text-center text-sm text-gray-500">Nenhum significado cadastrado.</p>
                )}
            </div>
        </section>
    );
};
