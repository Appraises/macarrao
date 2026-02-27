import React, { useState } from 'react';
import { Button, Input } from './UI';
import { X, BookOpen, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { validateContribution } from '../src/services/api';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const validation = await validateContribution(word, definition);

    setIsSubmitting(false);
    if (validation.isValid) {
      setStep(2); // Success step
    } else {
      setFeedback(validation.feedback);
    }
  };

  const reset = () => {
    setWord('');
    setDefinition('');
    setStep(1);
    setFeedback(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-dark-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-brand-900/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Neon glow accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-blue-400 to-brand-600"></div>

        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-2 bg-brand-500/10 rounded-lg"><BookOpen className="w-5 h-5 text-brand-400" /></span>
            Contribuir
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Termo</label>
                  <Input
                    value={word}
                    onChange={e => setWord(e.target.value)}
                    placeholder="Ex: Rushar"
                    required
                    className="w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Definição</label>
                  <textarea
                    value={definition}
                    onChange={e => setDefinition(e.target.value)}
                    className="w-full bg-dark-900/80 border border-white/10 rounded-xl px-5 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-500/50 transition-all h-32 resize-none"
                    placeholder="Descreva o significado do termo no contexto gamer..."
                    required
                  />
                </div>
              </div>

              {feedback && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300 text-sm flex items-start gap-3 animate-in slide-in-from-top-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p>{feedback}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} variant="primary" className="min-w-[140px]">
                  {isSubmitting ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" /> Analisando...
                    </>
                  ) : 'Enviar'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 animate-in zoom-in-95 duration-300">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-400 border border-brand-500/20">
                  <Check className="w-10 h-10" />
                </div>
              </div>

              <h4 className="text-2xl font-bold text-white mb-3">Sucesso!</h4>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Sua contribuição foi enviada para a fila de moderação.<br />
                Obrigado por ajudar a comunidade a crescer.
              </p>
              <Button onClick={reset} className="w-full" variant="glow">Voltar ao Dicionário</Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};