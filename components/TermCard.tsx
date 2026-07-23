import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Term } from '../types';
import { Badge, Button } from './UI';
import { ThumbsUp, ThumbsDown, Volume2, Share2, CheckCircle2, AlertCircle, Flag } from 'lucide-react';
import { DefinitionParser } from './DefinitionParser';
import { Avatar } from './Avatar';
import { useAuth } from '../src/context/AuthContext';
import { voteTerm, getMyVote, reportTerm } from '../src/services/api';
import { trackAnalyticsEvent } from '../src/lib/analytics';

interface TermCardProps {
  term: Term;
}

export const TermCard: React.FC<TermCardProps> = ({ term }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [voteState, setVoteState] = useState<'up' | 'down' | null>(null);
  const [counts, setCounts] = useState({ up: term.upvotes || 0, down: term.downvotes || 0 });
  const [voting, setVoting] = useState(false);

  // Sync counts and load the user's existing vote whenever the term changes.
  useEffect(() => {
    setCounts({ up: term.upvotes || 0, down: term.downvotes || 0 });
    setVoteState(null);
    if (user && term.id) {
      getMyVote(term.id)
        .then((r) => setVoteState(r?.myVote === 1 ? 'up' : r?.myVote === -1 ? 'down' : null))
        .catch(() => { /* ignore */ });
    }
  }, [term.id, user]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!user) { navigate('/login'); return; } // voting requires login
    if (voting) return;
    setVoting(true);
    try {
      const res = await voteTerm(term.id, type);
      setCounts({ up: res.upvotes, down: res.downvotes });
      setVoteState(res.myVote === 1 ? 'up' : res.myVote === -1 ? 'down' : null);
      trackAnalyticsEvent('Term Vote', {
        direction: type,
        term: term.word,
        resulting_state: res.myVote === 0 ? 'removed' : type,
      });
    } catch (e) {
      /* keep previous state on failure */
    } finally {
      setVoting(false);
    }
  };

  // Report / moderation
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('incorreto');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reporting, setReporting] = useState(false);

  const submitReport = async () => {
    if (reporting) return;
    setReporting(true);
    try {
      await reportTerm(term.id, reportReason, reportDetails.trim() || undefined);
      trackAnalyticsEvent('Term Reported', { reason: reportReason, term: term.word });
      setReportSent(true);
    } catch (e) {
      /* ignore */
    } finally {
      setReporting(false);
    }
  };

  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const shareTerm = async () => {
    const url = `${window.location.origin}/term/${encodeURIComponent(term.word)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: term.word, text: term.definition, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMsg('Link copiado!');
        setTimeout(() => setShareMsg(null), 2000);
      }
      trackAnalyticsEvent('Term Shared', { method: navigator.share ? 'native' : 'clipboard' });
    } catch {
      // The native share dialog may be cancelled without being an error for the UI.
    }
  };

  // Pronunciation via the browser's speech synthesis (reads the Brazilian guide).
  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(term.pronunciationGuide || term.word);
    utter.lang = 'pt-BR';
    utter.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  // Public author info (present on the term detail response).
  const author = term.author && typeof term.author === 'object' ? term.author : null;
  const aliases = Array.isArray(term.aliases) ? term.aliases : [];

  return (
    <div className="relative group">
      {/* Clean Border Card */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 md:p-8 h-full flex flex-col shadow-card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{term.word}</h2>
              {term.status === 'APPROVED' && (
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
              <button onClick={speak} title="Ouvir pronúncia" aria-label="Ouvir pronúncia" className="p-1.5 hover:text-brand-400 transition-colors rounded-full hover:bg-brand-500/10">
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative flex gap-2">
            <Button variant="ghost" title="Compartilhar termo" aria-label="Compartilhar termo" onClick={() => void shareTerm()} className="!p-2 text-gray-500 hover:text-gray-200"><Share2 className="w-5 h-5" /></Button>
            <Button
              variant="ghost"
              title="Reportar termo"
              onClick={() => { setReportSent(false); setShowReport(true); }}
              className="!p-2 text-gray-500 hover:text-red-400"
            >
              <Flag className="w-5 h-5" />
            </Button>
            {shareMsg && (
              <span className="absolute right-0 top-full mt-2 z-10 whitespace-nowrap rounded border border-dark-700 bg-dark-950 px-2 py-1 text-[11px] font-semibold text-brand-300 shadow-lg">
                {shareMsg}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 flex-grow">
          <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-normal border-l-2 border-brand-500 pl-6">
            <DefinitionParser text={term.definition} keywords={term.keywords} />
          </p>
          {aliases.length > 0 && (
            <p className="mt-4 pl-6 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Também escrito como:</span> {aliases.join(' · ')}
            </p>
          )}
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

        {author && (
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            <Avatar name={author.name} src={author.avatar} size={22} className="flex-none" />
            <span>
              Adicionado por <span className="font-semibold text-gray-300">{author.name}</span>
              {author.level ? <span className="text-brand-400"> · Nível {author.level}</span> : null}
            </span>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t border-dark-800 mt-auto">
          <div className="flex flex-wrap gap-2">
            {term.tags.map(tag => (
              <Link key={tag} to={`/dicionario?tag=${encodeURIComponent(tag)}`} className="inline-block transition-transform hover:-translate-y-0.5">
                <Badge color="gray" className="cursor-pointer hover:border-brand-500/40 hover:text-brand-300">{tag}</Badge>
              </Link>
            ))}
            {term.gameSpecifics?.map(g => (
              <Badge key={g.gameId} color="blue">{g.gameName}</Badge>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-dark-950 rounded-lg p-1 border border-dark-700">
            <button
              onClick={() => handleVote('up')}
              disabled={voting}
              className={`p-2 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all disabled:opacity-60 ${voteState === 'up' ? 'text-brand-400 bg-brand-500/10' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
            >
              <ThumbsUp className="w-4 h-4" />
              {counts.up}
            </button>
            <div className="w-px h-4 bg-dark-700"></div>
            <button
              onClick={() => handleVote('down')}
              disabled={voting}
              className={`p-2 rounded-md flex items-center gap-1.5 text-sm font-bold transition-all disabled:opacity-60 ${voteState === 'down' ? 'text-red-400 bg-red-500/10' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
            >
              <ThumbsDown className="w-4 h-4" />
              {counts.down}
            </button>
          </div>
        </div>

        {term.status !== 'APPROVED' && (
          <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/5 p-3 rounded border border-yellow-500/20">
            <AlertCircle className="w-4 h-4" />
            Aguardando validação da moderação.
          </div>
        )}
      </div>

      {showReport && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowReport(false)}
        >
          <div
            className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {reportSent ? (
              <div className="text-center py-4">
                <Flag className="w-10 h-10 text-brand-500 mx-auto mb-3" />
                <p className="text-white font-bold mb-1">Denúncia enviada</p>
                <p className="text-gray-400 text-sm mb-5">Obrigado! Nossa equipe vai revisar este termo.</p>
                <Button onClick={() => setShowReport(false)}>Fechar</Button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Reportar "{term.word}"</h3>
                <p className="text-gray-400 text-sm mb-4">O que há de errado com este termo?</p>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-gray-200 mb-3 focus:border-brand-500 outline-none"
                >
                  <option value="incorreto">Definição incorreta</option>
                  <option value="ofensivo">Conteúdo ofensivo</option>
                  <option value="spam">Spam</option>
                  <option value="duplicado">Termo duplicado</option>
                  <option value="outro">Outro</option>
                </select>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Detalhes (opcional)"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-gray-200 mb-4 resize-none focus:border-brand-500 outline-none"
                />
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setShowReport(false)}>Cancelar</Button>
                  <Button onClick={submitReport} disabled={reporting}>Enviar denúncia</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
