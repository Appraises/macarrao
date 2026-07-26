import React from 'react';
import { Plus, Wand2, X } from 'lucide-react';
import type { Inflection, Register, WordClass } from '../types';
import { INFLECTION_LABELS, REGISTER_OPTIONS, WORD_CLASS_OPTIONS, suggestVerbForms } from './wordClass';

interface InflectionFieldsProps {
    wordClass: WordClass | null;
    inflections: Inflection[];
    register: Register | null;
    onChange: (next: { wordClass: WordClass | null; inflections: Inflection[]; register: Register | null }) => void;
    inputClass: string;
    labelClass: string;
    /** The entry word, used to seed verb suggestions ("gank" -> "gankar"). */
    word?: string;
}

/**
 * Grammatical class + optional inflected forms for one sense. Plenty of entries have
 * no useful inflection (interjections like "gg"), so the forms stay empty until asked
 * for. Verbs get a one-click suggestion since pt-BR gamer slang is overwhelmingly
 * English verbs with an -ar ending.
 */
export const InflectionFields: React.FC<InflectionFieldsProps> = ({
    wordClass, inflections, register, onChange, inputClass, labelClass, word,
}) => {
    const suggestedLabels = wordClass ? INFLECTION_LABELS[wordClass] : [];

    const setClass = (value: string) => {
        onChange({ wordClass: (value || null) as WordClass | null, inflections, register });
    };

    const setRow = (index: number, patch: Partial<Inflection>) => {
        const next = inflections.map((item, i) => (i === index ? { ...item, ...patch } : item));
        onChange({ wordClass, inflections: next, register });
    };

    const addRow = (label = '') => onChange({ wordClass, inflections: [...inflections, { label, form: '' }], register });
    const removeRow = (index: number) => onChange({ wordClass, inflections: inflections.filter((_, i) => i !== index), register });

    const suggest = () => {
        const base = (word || '').trim().toLowerCase();
        const guess = base.endsWith('ar') ? base : `${base}ar`;
        const forms = suggestVerbForms(guess);
        if (forms.length) onChange({ wordClass, inflections: forms, register });
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className={labelClass}>Classe gramatical</span>
                    <select value={wordClass || ''} onChange={(e) => setClass(e.target.value)} className={inputClass}>
                        <option value="">Não definida</option>
                        {WORD_CLASS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className={labelClass}>Tom / registro</span>
                    <select value={register || ''} onChange={(e) => onChange({ wordClass, inflections, register: (e.target.value || null) as Register | null })} className={inputClass}>
                        <option value="">Não definido</option>
                        {REGISTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <span className="mt-1 block text-xs text-gray-600">
                        {REGISTER_OPTIONS.find((o) => o.value === register)?.hint || 'Marque se a palavra é xingamento, irônica ou depreciativa.'}
                    </span>
                </label>
            </div>

            <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={labelClass}>Flexões <span className="font-normal text-gray-600">(opcional)</span></span>
                    <div className="flex items-center gap-3">
                        {wordClass === 'VERBO' && word && (
                            <button type="button" onClick={suggest} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                                <Wand2 className="h-3.5 w-3.5" /> Sugerir
                            </button>
                        )}
                        <button type="button" onClick={() => addRow()} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                            <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                    </div>
                </div>

                {inflections.length === 0 ? (
                    <p className="text-xs text-gray-600">
                        Nem toda palavra tem flexão. Se tiver{suggestedLabels.length ? ` (${suggestedLabels.join(', ')})` : ''}, adicione aqui.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {inflections.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    list="inflection-labels"
                                    value={item.label}
                                    onChange={(e) => setRow(index, { label: e.target.value })}
                                    maxLength={40}
                                    placeholder="rótulo"
                                    className={`${inputClass} max-w-[9rem]`}
                                />
                                <input
                                    value={item.form}
                                    onChange={(e) => setRow(index, { form: e.target.value })}
                                    maxLength={60}
                                    placeholder="forma (ex.: gankado)"
                                    className={inputClass}
                                />
                                <button type="button" aria-label={`Remover flexão ${index + 1}`} onClick={() => removeRow(index)}
                                    className="grid h-10 w-10 flex-none place-items-center rounded border border-white/10 text-gray-500 hover:text-rose-300">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <datalist id="inflection-labels">
                    {[...new Set([...suggestedLabels, 'infinitivo', 'passado', 'particípio', 'gerúndio', 'plural', 'feminino', 'variação'])]
                        .map((label) => <option key={label} value={label} />)}
                </datalist>
            </div>
        </div>
    );
};
