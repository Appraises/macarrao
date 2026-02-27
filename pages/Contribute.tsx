import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Button, Input, Badge } from '../components/UI';
import { validateContribution } from '../src/services/api';
import { createTerm, getGames } from '../src/services/api';
import { Check, AlertTriangle, Sparkles, LayoutGrid, Tag, Type, BookOpen, LogIn } from 'lucide-react';

import { useAuth } from '../src/context/AuthContext';

const TOPICS = [
  "Gíria", "Mecânica", "Estratégia", "Economia", "Chat/Comunicação",
  "Técnico", "Lore/História", "Competitivo", "Hardware", "Outros"
];

export const Contribute: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [games, setGames] = useState<any[]>([]);

  // Form State
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [examples, setExamples] = useState('');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    getGames().then(setGames).catch(console.error);
  }, []);

  // Handle unauthenticated state
  // Handle unauthenticated state
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <LayoutGrid className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Acesso Restrito</h2>
        <p className="text-gray-400 max-w-md mb-8 text-lg">
          Para manter a qualidade do dicionário e evitar spam, precisamos que você faça login antes de contribuir.
        </p>
        <Button onClick={() => navigate('/login')} variant="glow" className="px-8 py-4 text-lg">
          <LogIn className="w-5 h-5" /> Fazer Login
        </Button>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/30">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Verificação Necessária</h2>
        <p className="text-gray-400 max-w-md mb-8 text-lg">
          Para contribuir com novos termos, você precisa verificar seu endereço de email primeiro.
        </p>
        <p className="text-sm text-gray-500 mb-6">Verifique sua caixa de entrada (e spam) para o link de ativação.</p>
        <Button onClick={() => navigate('/')} variant="secondary">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGames.length === 0 && selectedTopics.length === 0) {
      setFeedback("Selecione pelo menos um jogo ou um tópico para classificar o termo.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Use AI to validate validity
      const validation = await validateContribution(word, definition);

      if (validation.isValid) {
        await createTerm({
          word,
          definition,
          gameId: selectedGames[0], // Taking the first one for now as schema links to one game
          tags: selectedTopics,
          examples: examples.split('\n').filter(e => e.trim().length > 0),
          author: user?.name || 'Anonymous'
        });
        setStep('success');
      } else {
        setFeedback(validation.feedback);
        window.scrollTo(0, 0);
      }
    } catch (error) {
      console.error(error);
      setFeedback("Erro ao enviar contribuição. Verifique se o banco de dados está conectado e se os jogos foram semeados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-500/30">
          <Check className="w-12 h-12 text-brand-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Contribuição Enviada!</h2>
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          Obrigado, <span className="text-white font-semibold">{user.name}</span>! <br />
          Sua definição de <span className="text-brand-400">"{word}"</span> foi enviada para análise.
          Você receberá uma notificação assim que for aprovada.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate('/')} variant="secondary">Voltar ao Início</Button>
          <Button onClick={() => {
            setStep('form');
            setWord('');
            setDefinition('');
            setExamples('');
            setSelectedGames([]);
            setSelectedTopics([]);
          }} variant="primary">Enviar outra</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center gap-3">
          <Sparkles className="text-brand-500 w-8 h-8" />
          Nova Contribuição
        </h1>
        <p className="text-gray-400 text-lg">
          Ajude a expandir o vocabulário gamer. Preencha os detalhes abaixo com atenção.
        </p>
      </div>

      {feedback && (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-red-300 text-base flex items-start gap-4 mb-8 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-red-400 mb-1">Atenção</h4>
            <p>{feedback}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">

        {/* Section 1: The Term */}
        <section className="bg-dark-900 border border-dark-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Type className="w-5 h-5 text-brand-500" />
            O Termo
          </h3>
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Palavra ou Expressão</label>
              <Input
                value={word}
                onChange={e => setWord(e.target.value)}
                placeholder="Ex: Kiting, Eco Round, Smurf..."
                required
                className="text-xl font-bold tracking-wide"
              />
              <p className="text-xs text-gray-500 mt-2">Use a grafia mais comum encontrada nos jogos.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Definição Detalhada</label>
              <textarea
                value={definition}
                onChange={e => setDefinition(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl px-5 py-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all h-40 resize-none text-base leading-relaxed"
                placeholder="Explique o significado de forma clara. Se possível, dê um exemplo de uso."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Exemplos de Uso (Opcional)</label>
              <textarea
                value={examples}
                onChange={e => setExamples(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 rounded-xl px-5 py-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all h-32 resize-none text-base leading-relaxed"
                placeholder="Digite exemplos de como usar esse termo em uma frase. Pule uma linha para adicionar mais de um exemplo."
              />
              <p className="text-xs text-gray-500 mt-2">Separe múltiplos exemplos pulando uma linha.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Game Context */}
        <section className="bg-dark-900 border border-dark-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-brand-500" />
            Contexto do Jogo
            <span className="text-xs font-normal text-gray-500 ml-2 bg-dark-800 px-2 py-1 rounded">Opcional se for termo geral</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {games.map(game => {
              const isSelected = selectedGames.includes(game.id);
              return (
                <div
                  key={game.id}
                  onClick={() => toggleGame(game.id)}
                  className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 transition-all duration-200 ${isSelected ? 'bg-brand-500/10 border-brand-500 ring-1 ring-brand-500/30' : 'bg-dark-950 border-dark-700 hover:border-gray-500'}`}
                >
                  <img src={game.image} alt={game.name} className="w-8 h-8 rounded object-cover" />
                  <span className={`text-sm font-medium ${isSelected ? 'text-brand-400' : 'text-gray-400'}`}>{game.name}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Section 3: Topics */}
        <section className="bg-dark-900 border border-dark-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-500" />
            Categorias
          </h3>
          <div className="flex flex-wrap gap-3">
            {TOPICS.map(topic => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <button
                  type="button"
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${isSelected ? 'bg-brand-500 text-black border-brand-500 shadow-[0_0_10px_rgba(14,165,233,0.4)]' : 'bg-dark-950 text-gray-400 border-dark-700 hover:border-gray-500'}`}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        </section>

        <div className="pt-6 flex justify-end gap-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="px-8 py-3 text-base">
            {isSubmitting ? (
              <>Validando com IA...</>
            ) : (
              <>Enviar Contribuição</>
            )}
          </Button>
        </div>

      </form>
    </div>
  );
};