import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { Button } from './UI';
import { Game, Inflection, Register, Term, WordClass } from '../types';
import { InflectionFields } from './InflectionFields';
import { getGames, proposeTermMeaning } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { trackAnalyticsEvent } from '../src/lib/analytics';

const inputClass = 'w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2.5 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-brand-500';

/**
 * Anyone signed in can add another sense to an existing word. The sense goes to
 * moderation, which is stated up front so the contributor knows what to expect.
 */
export const AddMeaningPanel: React.FC<{ term: Term }> = ({ term }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [definition, setDefinition] = useState('');
    const [examples, setExamples] = useState<string[]>(['']);
    const [gameId, setGameId] = useState('');
    const [context, setContext] = useState('');
    const [grammar, setGrammar] = useState<{ wordClass: WordClass | null; inflections: Inflection[]; register: Register | null }>({ wordClass: null, inflections: [], register: null });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (open && games.length === 0) getGames().then(setGames).catch(() => setGames([]));
    }, [open, games.length]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSending(true);
        try {
            await proposeTermMeaning(term.id, {
                definition: definition.trim(),
                examples: examples.map((e) => e.trim()).filter(Boolean),
                gameId: gameId || null,
                context: context.trim() || null,
                wordClass: grammar.wordClass,
                inflections: grammar.inflections.filter((i) => i.form.trim()),
                register: grammar.register,
            });
            trackAnalyticsEvent('Meaning Proposed', { term: term.word });
            setSent(true);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Nao foi possivel enviar o significado.');
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-brand-400" />
                <p className="font-bold text-white">Significado enviado</p>
                <p className="mt-1 text-sm text-gray-400">
                    Ele aparece em <span className="font-semibold text-gray-300">{term.word}</span> assim que a moderação aprovar.
                </p>
            </div>
        );
    }

    if (!open) {
        return (
            <button
                onClick={() => (user ? setOpen(true) : navigate('/login'))}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-dark-700 px-4 py-3.5 text-sm font-bold text-gray-400 transition-colors hover:border-brand-500/50 hover:text-brand-300"
            >
                <Plus className="h-4 w-4" />
                {term.word} significa outra coisa no seu jogo? Adicione um significado
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="rounded-xl border border-dark-700 bg-dark-900 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold text-white">Novo significado para "{term.word}"</h3>
                    <p className="mt-1 text-xs text-gray-500">Passa por moderação antes de aparecer no site.</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-400">Definição *</span>
                <textarea
                    required
                    rows={4}
                    minLength={15}
                    maxLength={2000}
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    placeholder={`O que "${term.word}" significa nesse contexto?`}
                    className={`${inputClass} resize-y leading-6`}
                />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-400">Jogo</span>
                    <select value={gameId} onChange={(e) => setGameId(e.target.value)} className={inputClass}>
                        <option value="">Uso geral</option>
                        {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-400">Contexto (opcional)</span>
                    <input
                        maxLength={60}
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Ex.: competitivo, streaming"
                        className={inputClass}
                    />
                </label>
            </div>

            <div className="mt-4">
                <InflectionFields
                    wordClass={grammar.wordClass}
                    inflections={grammar.inflections}
                    register={grammar.register}
                    onChange={setGrammar}
                    word={term.word}
                    inputClass={inputClass}
                    labelClass="mb-1.5 block text-xs font-medium text-gray-400"
                />
            </div>

            <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Exemplos de uso</span>
                    <button type="button" onClick={() => setExamples([...examples, ''])} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                    </button>
                </div>
                <div className="space-y-2">
                    {examples.map((example, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                maxLength={300}
                                value={example}
                                onChange={(e) => { const next = [...examples]; next[index] = e.target.value; setExamples(next); }}
                                placeholder={`Exemplo ${index + 1}`}
                                className={inputClass}
                            />
                            {examples.length > 1 && (
                                <button type="button" aria-label={`Remover exemplo ${index + 1}`} onClick={() => setExamples(examples.filter((_, i) => i !== index))} className="grid h-10 w-10 flex-none place-items-center rounded border border-dark-700 text-gray-500 hover:text-red-400">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {error && <p className="mt-4 rounded border border-red-500/25 bg-red-500/5 px-3 py-2 text-sm text-red-300">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={sending || definition.trim().length < 15}>
                    {sending ? 'Enviando...' : 'Enviar significado'}
                </Button>
            </div>
        </form>
    );
};
