import React, { useState } from 'react';
import { Term } from '../types';
import { Badge, Button } from './UI';
import { ThumbsUp, ThumbsDown, Volume2, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DefinitionParser } from './DefinitionParser';

interface TermCardProps {
  term: Term;
  isGenerated?: boolean;
}

export const TermCard: React.FC<TermCardProps> = ({ term, isGenerated }) => {
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);

  const handleVote = (type: 'up' | 'down') => {
    if (voteState === type) setVoteState(null);
    else setVoteState(type);
  };

  return (
    <div className="relative group">
      {/* Clean Border Card */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 md:p-8 h-full flex flex-col shadow-card">
        {isGenerated && (
          <div className="absolute -top-3 left-6">
            <Badge color="brand">Gerado por IA</Badge>
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{term.word}</h2>
              {term.verified && (
                <span title="Verificado pela Comunidade" className="flex items-center text-brand-500">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-3 text-gray-400 font-mono text-sm">
              {term.phonetic && <span className="bg-dark-800 px-2 py-1 rounded text-xs border border-dark-700">{term.phonetic}</span>}
              {term.pronunciationGuide && (
                <span className="text-gray-500 italic">"{term.pronunciationGuide}"</span>
              )}
              <button className="p-1.5 hover:text-brand-400 transition-colors rounded-full hover:bg-brand-500/10">
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="!p-2 text-gray-500 hover:text-gray-200"><Share2 className="w-5 h-5" /></Button>
          </div>
        </div>

        <div className="mb-8 flex-grow">
          <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-normal border-l-2 border-brand-500 pl-6">
            <DefinitionParser text={term.definition} keywords={term.keywords} />
          </p>
        </div>

        {term.examples.length > 0 && (
          <div className="bg-dark-800/50 rounded-lg p-5 mb-6 border border-dark-700/50">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              Exemplos
            </h4>
            <ul className="space-y-3">
              {term.examples.map((ex, idx) => (
                <li key={idx} className="text-gray-300 text-sm italic flex items-start gap-3">
                  <span className="text-brand-500 font-bold text-lg leading-none">›</span>
                  <span>"{ex}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t border-dark-800 mt-auto">
          <div className="flex flex-wrap gap-2">
            {term.tags.map(tag => (
              <Badge key={tag} color="gray">{tag}</Badge>
            ))}
            {term.gameSpecifics?.map(g => (
              <Badge key={g.gameId} color="blue">{g.gameName}</Badge>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-dark-950 rounded-lg p-1 border border-dark-700">
            <button
              onClick={() => handleVote('up')}
              className={`p-2 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all ${voteState === 'up' ? 'text-brand-400 bg-brand-500/10' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
            >
              <ThumbsUp className="w-4 h-4" />
              {term.upvotes + (voteState === 'up' ? 1 : 0)}
            </button>
            <div className="w-px h-4 bg-dark-700"></div>
            <button
              onClick={() => handleVote('down')}
              className={`p-2 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all ${voteState === 'down' ? 'text-red-400 bg-red-500/10' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
            >
              <ThumbsDown className="w-4 h-4" />
              {term.downvotes + (voteState === 'down' ? 1 : 0)}
            </button>
          </div>
        </div>

        {!term.verified && !isGenerated && (
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/5 p-3 rounded border border-yellow-500/20">
            <AlertCircle className="w-4 h-4" />
            Aguardando validação da moderação.
          </div>
        )}
      </div>
    </div>
  );
};