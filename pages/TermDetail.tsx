import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTermBySlug, recordTermView } from '../src/services/api';
import { Button } from '../components/UI';
import { ArrowLeft, SearchX, Sparkles } from 'lucide-react';
import { TermCard } from '../components/TermCard';
import { generateTermDefinition } from '../src/services/api';
import { Term } from '../types';

export const TermDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>(); // Fixed: matches App.tsx route /term/:slug
  const navigate = useNavigate();
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [isKonamiActive, setIsKonamiActive] = useState(false);

  // Konami Code Sequence: Up, Up, Down, Down, Left, Right, Left, Right, B, A
  const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const [konamiIndex, setKonamiIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === konamiCode[konamiIndex]) {
        const nextIndex = konamiIndex + 1;
        if (nextIndex === konamiCode.length) {
          setIsKonamiActive(true);
          setKonamiIndex(0);
        } else {
          setKonamiIndex(nextIndex);
        }
      } else {
        setKonamiIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex]);

  useEffect(() => {
    const fetchTerm = async () => {
      if (!slug) {
        setLoading(false); // Ensure loading stops even if no slug
        return;
      }

      setLoading(true);
      setError(false);
      setIsAiGenerated(false);
      setTerm(null);
      setIsKonamiActive(false); // Reset on new term

      try {
        // 1. Check backend database
        const data = await getTermBySlug(slug);

        setTerm(data);
        // Record view if found in DB
        if (data && data.id) {
          recordTermView(data.id);
        }
      } catch (err) {
        // 2. If not found, use Gemini AI
        const aiTerm = await generateTermDefinition(slug);
        if (aiTerm && aiTerm.word) {
          setTerm(aiTerm as Term);
          setIsAiGenerated(true);
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTerm();
  }, [slug]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 min-h-[60vh]">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 pl-0 hover:bg-transparent hover:text-ocean-400">
        <ArrowLeft className="w-4 h-4" /> Voltar para busca
      </Button>

      {isKonamiActive && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl animate-pulse text-center border-4 border-yellow-400 transform rotate-1">
          <h1 className="text-4xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-widest">
            KONAMI CODE DETECTED!
          </h1>
          <p className="text-white font-mono mt-2 font-bold">CHEAT MODE ENABLED</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-ocean-500/30 border-t-ocean-500 rounded-full animate-spin"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white animate-pulse">Consultando o banco de dados...</h3>
            <p className="text-gray-500 text-sm">Estamos vasculhando servidores e manuais antigos.</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-dark-800 rounded-2xl border border-white/5">
          <SearchX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Termo não encontrado</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Não encontramos "{slug}" em nossa base nem conseguimos gerar uma definição precisa no momento.
          </p>
          <Button onClick={() => navigate('/')}>Tentar outro termo</Button>
        </div>
      ) : term ? (
        <div className="space-y-6">
          {isAiGenerated && (
            <div className="bg-brand-900/20 border border-brand-500/30 p-4 rounded-lg flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-brand-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-brand-200 text-sm font-medium">Conteúdo Gerado por IA</p>
                <p className="text-brand-300/70 text-xs mt-1">Este termo ainda não foi curado por nossa comunidade. A definição foi gerada automaticamente para ajudar você.</p>
              </div>
            </div>
          )}
          <TermCard term={term} isGenerated={isAiGenerated} />

          {/* Related Terms Section (Mock functionality for links) */}
          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="mt-10 pt-10 border-t border-white/5">
              <h3 className="text-lg font-semibold text-gray-400 mb-4">Termos Relacionados</h3>
              <div className="flex flex-wrap gap-3">
                {term.relatedTerms.map(rt => (
                  <button
                    key={rt}
                    onClick={() => navigate(`/term/${rt}`)}
                    className="px-4 py-2 bg-dark-800 border border-white/10 rounded hover:border-ocean-500/50 hover:text-ocean-400 transition-all text-sm text-gray-300"
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-dark-800 rounded-2xl border border-white/5">
          <SearchX className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Termo não encontrado</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Não encontramos "{slug}" em nossa base nem conseguimos gerar uma definição precisa no momento.
          </p>
          <Button onClick={() => navigate('/')}>Tentar outro termo</Button>
        </div>
      )}
    </div>
  );
};