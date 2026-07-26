import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CheckSquare, Gamepad2, Save, Tags } from 'lucide-react';
import type { ContributionInput, Game, Inflection, Register, WordClass } from '../../types';
import { InflectionFields } from '../InflectionFields';
import { getGames, validateContribution } from '../../src/services/api';
import { Button, Input } from '../UI';

const TOPICS = [
  'Gíria', 'Mecânica', 'Estratégia', 'Economia', 'Chat/Comunicação',
  'Técnico', 'Lore/História', 'Competitivo', 'Hardware', 'Outros',
];

const EMPTY_VALUE: ContributionInput = {
  word: '',
  definition: '',
  gameId: null,
  examples: [],
  tags: [],
};

interface ContributionFormProps {
  initialValue?: ContributionInput;
  submitLabel?: string;
  busyLabel?: string;
  onSubmit: (value: ContributionInput) => Promise<void>;
  onCancel?: () => void;
}

export const ContributionForm: React.FC<ContributionFormProps> = ({
  initialValue = EMPTY_VALUE,
  submitLabel = 'Enviar contribuição',
  busyLabel = 'Validando e enviando...',
  onSubmit,
  onCancel,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [word, setWord] = useState(initialValue.word);
  const [definition, setDefinition] = useState(initialValue.definition);
  const [gameId, setGameId] = useState(initialValue.gameId || '');
  const [examples, setExamples] = useState(initialValue.examples.join('\n'));
  const [tags, setTags] = useState<string[]>(initialValue.tags);
  const [grammar, setGrammar] = useState<{ wordClass: WordClass | null; inflections: Inflection[]; register: Register | null }>({
    wordClass: initialValue.wordClass ?? null,
    inflections: initialValue.inflections ?? [],
    register: initialValue.register ?? null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    getGames().then(setGames).catch(() => setFeedback('Não foi possível carregar os jogos agora.'));
  }, []);

  useEffect(() => {
    setWord(initialValue.word);
    setDefinition(initialValue.definition);
    setGameId(initialValue.gameId || '');
    setExamples(initialValue.examples.join('\n'));
    setTags(initialValue.tags);
  }, [initialValue.word, initialValue.definition, initialValue.gameId, initialValue.examples, initialValue.tags]);

  const toggleTag = (tag: string) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!gameId && tags.length === 0) {
      setFeedback('Selecione um jogo ou pelo menos uma categoria.');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const validation = await validateContribution(word, definition);
      if (!validation.isValid) {
        setFeedback(validation.feedback || 'Revise o termo e a definição antes de enviar.');
        return;
      }
      await onSubmit({
        word: word.trim(),
        definition: definition.trim(),
        gameId: gameId || null,
        examples: examples.split('\n').map((item) => item.trim()).filter(Boolean),
        tags,
        wordClass: grammar.wordClass,
        register: grammar.register,
        inflections: grammar.inflections.filter((item) => item.form.trim()),
      });
    } catch (error: any) {
      setFeedback(error?.response?.data?.error || 'Não foi possível salvar a contribuição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {feedback && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-400" />
          <span>{feedback}</span>
        </div>
      )}

      <section className="border-b border-white/10 pb-8" aria-labelledby="contribution-term-heading">
        <h2 id="contribution-term-heading" className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
          <BookOpen className="h-5 w-5 text-brand-400" /> Termo e definição
        </h2>
        <div className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold text-gray-300">
            Palavra ou expressão
            <Input value={word} onChange={(event) => setWord(event.target.value)} maxLength={100} required placeholder="Ex.: Kiting, Eco Round, Smurf" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-300">
            Definição detalhada
            <textarea value={definition} onChange={(event) => setDefinition(event.target.value)} maxLength={3000} required rows={6} className="w-full resize-y rounded-lg border border-dark-700 bg-dark-950 px-4 py-3 text-gray-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" placeholder="Explique o significado de forma clara e contextualizada." />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-gray-300">
            Exemplos de uso <span className="font-normal text-gray-500">(um por linha)</span>
            <textarea value={examples} onChange={(event) => setExamples(event.target.value)} rows={4} className="w-full resize-y rounded-lg border border-dark-700 bg-dark-950 px-4 py-3 text-gray-200 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" placeholder="O jungler veio dar um gank no top." />
          </label>
        </div>

        {/* Camada linguística: tudo opcional, porque nem toda palavra tem flexão
            e nem todo termo tem carga. */}
        <div className="mt-6 rounded-lg border border-white/10 bg-dark-950/50 p-5">
          <p className="mb-4 text-sm font-semibold text-gray-300">
            Gramática e tom <span className="font-normal text-gray-500">— opcional, mas ajuda muito quem está aprendendo</span>
          </p>
          <InflectionFields
            wordClass={grammar.wordClass}
            inflections={grammar.inflections}
            register={grammar.register}
            onChange={setGrammar}
            word={word}
            inputClass="w-full rounded-lg border border-dark-700 bg-dark-950 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-brand-500"
            labelClass="mb-1.5 block text-xs font-medium text-gray-400"
          />
        </div>
      </section>

      <section className="border-b border-white/10 pb-8" aria-labelledby="contribution-context-heading">
        <h2 id="contribution-context-heading" className="mb-5 flex items-center gap-2 text-lg font-bold text-white">
          <Gamepad2 className="h-5 w-5 text-brand-400" /> Contexto do jogo
        </h2>
        <label className="grid max-w-xl gap-2 text-sm font-semibold text-gray-300">
          Jogo relacionado
          <select value={gameId} onChange={(event) => setGameId(event.target.value)} className="h-11 rounded-lg border border-dark-700 bg-dark-950 px-3 text-sm text-gray-200 outline-none focus:border-brand-500">
            <option value="">Termo geral</option>
            {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
          </select>
        </label>
      </section>

      <section aria-labelledby="contribution-tags-heading">
        <h2 id="contribution-tags-heading" className="mb-2 flex items-center gap-2 text-lg font-bold text-white">
          <Tags className="h-5 w-5 text-brand-400" /> Categorias
        </h2>
        <p className="mb-5 text-sm text-gray-500">Marque todas as categorias que ajudam a classificar o termo.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {TOPICS.map((topic) => {
            const selected = tags.includes(topic);
            return (
              <label key={topic} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${selected ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-dark-700 bg-dark-950 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleTag(topic)} className="sr-only" />
                <CheckSquare className={`h-4 w-4 flex-none ${selected ? 'text-brand-400' : 'text-gray-600'}`} />
                <span>{topic}</span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-6 sm:flex-row">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={submitting} className="sm:min-w-52">
          <Save className="h-4 w-4" /> {submitting ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
};
