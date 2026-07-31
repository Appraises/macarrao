import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Term } from '../types';
import { Badge, Button } from './UI';
import { ThumbsUp, ThumbsDown, Volume2, Share2, CheckCircle2, AlertCircle, Flag } from 'lucide-react';
import { DefinitionParser } from './DefinitionParser';
import { Avatar } from './Avatar';
import { useAuth } from '../src/context/AuthContext';
import { voteMeaning, getMyMeaningVotes, reportTerm } from '../src/services/api';
import { trackAnalyticsEvent } from '../src/lib/analytics';
import { registerMeta, wordClassFull, wordClassShort } from './wordClass';
import { cancelSpeech, getVoices, resolveSpeech, speakTerm, speechSupported, type ResolvedSpeech } from './speech';

interface TermCardProps {
  term: Term;
}

type MeaningVote = { up: number; down: number; my: number };

export const TermCard: React.FC<TermCardProps> = ({ term }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Votes now live on each sense. Keyed by meaning id.
  const [votes, setVotes] = useState<Record<string, MeaningVote>>({});
  const [votingId, setVotingId] = useState<string | null>(null);

  // Seed counts from the term payload, then load the user's per-sense votes.
  useEffect(() => {
    const seed: Record<string, MeaningVote> = {};
    (term.meanings || []).forEach((m) => { seed[m.id] = { up: m.upvotes || 0, down: m.downvotes || 0, my: 0 }; });
    setVotes(seed);
    if (user && term.id) {
      getMyMeaningVotes(term.id)
        .then((map) => setVotes((current) => {
          const next = { ...current };
          Object.entries(map).forEach(([id, value]) => { if (next[id]) next[id] = { ...next[id], my: value }; });
          return next;
        }))
        .catch(() => { /* ignore */ });
    }
  }, [term.id, user]);

  const handleVote = async (meaningId: string, type: 'up' | 'down') => {
    if (!user) { navigate('/login'); return; } // voting requires login
    if (votingId) return;
    setVotingId(meaningId);
    try {
      const res = await voteMeaning(meaningId, type);
      setVotes((current) => ({ ...current, [meaningId]: { up: res.upvotes, down: res.downvotes, my: res.myVote } }));
      trackAnalyticsEvent('Term Vote', {
        direction: type,
        term: term.word,
        resulting_state: res.myVote === 0 ? 'removed' : type,
      });
    } catch (e) {
      /* keep previous state on failure */
    } finally {
      setVotingId(null);
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

  // Pronunciation. The heavy lifting (voice picking, language choice, guide vs word)
  // lives in components/speech.ts — see the note there on why the naive call is wrong.
  const [speaking, setSpeaking] = useState(false);
  const [speech, setSpeech] = useState<ResolvedSpeech | null>(null);
  const canSpeak = speechSupported();

  // The decision depends on which voices the machine has, and that list loads async.
  useEffect(() => {
    if (!canSpeak) return;
    let alive = true;
    getVoices().then((voices) => {
      if (alive) setSpeech(resolveSpeech({ word: term.word, guide: term.pronunciationGuide }, voices));
    });
    return () => { alive = false; };
  }, [term.word, term.pronunciationGuide, canSpeak]);

  useEffect(() => () => cancelSpeech(), []); // never leave audio playing on unmount

  const speak = async () => {
    if (speaking) { cancelSpeech(); setSpeaking(false); return; }
    setSpeaking(true);
    await speakTerm({ word: term.word, guide: term.pronunciationGuide });
    setSpeaking(false);
  };

  // Public author info (present on the term detail response).
  const author = term.author && typeof term.author === 'object' ? term.author : null;
  const aliases = Array.isArray(term.aliases) ? term.aliases : [];
  // Senses arrive ranked by score. A single sense reads better unnumbered, like a
  // dictionary entry with only one definition.
  const meanings = term.meanings?.length ? term.meanings : null;
  const numbered = (meanings?.length ?? 0) > 1;

  return (
    <div className="relative group">
      {/* Clean Border Card */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-xl p-6 md:p-8 h-full flex flex-col shadow-card">
        {/* Cabeçalho: identidade da palavra (grafia, som, variações) */}
        <header className="border-b border-dark-800 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{term.word}</h2>
              {term.status === 'APPROVED' && (
                <span title="Verificado pela Comunidade" className="flex items-center text-brand-500">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}
              {canSpeak && (
                <button
                  onClick={() => void speak()}
                  title={!speech ? 'Ouvir pronúncia'
                    : speech.source === 'guide' ? `Ouvir "${speech.text}" (guia de pronúncia)`
                    : speech.source === 'native' ? `Ouvir "${speech.text}" em ${speech.lang === 'en-US' ? 'inglês' : 'português'}`
                    : `Ouvir "${speech.text}" (aproximação — seu sistema não tem voz em inglês)`}
                  aria-label="Ouvir pronúncia"
                  className={`rounded-full p-1.5 transition-colors ${speaking ? 'bg-brand-500/15 text-brand-400' : 'text-gray-500 hover:bg-brand-500/10 hover:text-brand-400'}`}
                >
                  <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} />
                </button>
              )}
            </div>

            <div className="relative flex flex-none gap-2">
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

          {(term.phonetic || term.pronunciationGuide) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {/* O guia em português é a resposta real para "como eu falo isso",
                  então ele lidera; a fonética IPA fica como referência técnica. */}
              {term.pronunciationGuide && (
                <span className="font-semibold text-gray-200">
                  fala-se <span className="text-brand-300">"{term.pronunciationGuide}"</span>
                </span>
              )}
              {term.phonetic && (
                <span className="rounded border border-dark-700 bg-dark-800 px-2 py-1 font-mono text-xs text-gray-400">{term.phonetic}</span>
              )}
            </div>
          )}

          {aliases.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Também escrito como:</span> {aliases.join(' · ')}
            </p>
          )}
        </header>

        <div className="flex-grow">
          {meanings ? (
            <div className="divide-y divide-dark-800">
              {meanings.map((meaning, index) => (
                <div key={meaning.id} className="flex gap-3 py-5">
                  {numbered && <span className="flex-none pt-0.5 text-lg font-bold text-gray-600">{index + 1}.</span>}
                  <div className="min-w-0 flex-1">
                    {(meaning.wordClass || meaning.game || meaning.context || meaning.register) && (
                      <div className="mb-2.5 flex flex-wrap items-center gap-2">
                        {meaning.wordClass && (
                          <span title={wordClassFull(meaning.wordClass) || undefined} className="font-mono text-xs italic text-gray-500">
                            {wordClassShort(meaning.wordClass)}
                          </span>
                        )}
                        {meaning.game && <Badge color="blue">{meaning.game.name}</Badge>}
                        {meaning.context && <Badge color="gray">{meaning.context}</Badge>}
                        {/* Discreto de propósito: informa quem repara, sem gritar com quem
                            só quer a definição. A explicação fica no title. */}
                        {(() => {
                          const reg = registerMeta(meaning.register);
                          if (!reg) return null;
                          return <span title={reg.hint} className={`text-xs italic ${reg.className}`}>{reg.label}</span>;
                        })()}
                      </div>
                    )}
                    <p className="text-lg md:text-xl font-normal leading-relaxed text-gray-200">
                      <DefinitionParser text={meaning.definition} keywords={term.keywords} />
                    </p>
                    {meaning.inflections && meaning.inflections.length > 0 && (
                      <p className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-gray-500">
                        {meaning.inflections.map((inf) => (
                          <span key={`${inf.label}-${inf.form}`}>
                            <span className="text-gray-600">{inf.label}:</span>{' '}
                            <span className="font-semibold text-gray-300">{inf.form}</span>
                          </span>
                        ))}
                      </p>
                    )}
                    {meaning.examples.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {meaning.examples.map((ex, i) => (
                          <li key={i} className="border-l-2 border-brand-500/40 pl-3 text-sm italic text-gray-400">"{ex}"</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-4 flex min-h-8 flex-wrap items-center gap-3">
                      {meaning.author && (
                        <Link
                          to={`/u/${meaning.author.id}`}
                          className="inline-flex items-center gap-2 text-xs text-gray-500 transition-colors hover:text-gray-300"
                        >
                          <Avatar name={meaning.author.name} src={meaning.author.avatar} size={18} className="flex-none" />
                          <span>
                            por <span className="font-semibold text-gray-400">{meaning.author.name}</span>
                            {meaning.author.level ? <span className="text-brand-400/70"> · Nível {meaning.author.level}</span> : null}
                          </span>
                        </Link>
                      )}
                      {(() => {
                        const v = votes[meaning.id] || { up: meaning.upvotes || 0, down: meaning.downvotes || 0, my: 0 };
                        const score = v.up - v.down;
                        const busy = votingId === meaning.id;
                        return (
                          <div className="ml-auto flex flex-none items-center gap-0.5 rounded-md bg-dark-800/50 p-0.5" aria-label="Avaliação deste significado">
                            <button
                              onClick={() => handleVote(meaning.id, 'up')}
                              disabled={busy}
                              title="Concordo com este significado"
                              aria-label="Votar a favor"
                              className={`rounded p-1.5 transition-colors disabled:opacity-50 ${v.my === 1 ? 'bg-brand-500/10 text-brand-400' : 'text-gray-600 hover:bg-white/5 hover:text-gray-300'}`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <span className={`min-w-[2.25rem] text-center text-xs font-bold tabular-nums ${score > 0 ? 'text-brand-300' : score < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {score > 0 ? `+${score}` : score}
                            </span>
                            <button
                              onClick={() => handleVote(meaning.id, 'down')}
                              disabled={busy}
                              title="Discordo deste significado"
                              aria-label="Votar contra"
                              className={`rounded p-1.5 transition-colors disabled:opacity-50 ${v.my === -1 ? 'bg-red-500/10 text-red-400' : 'text-gray-600 hover:bg-white/5 hover:text-gray-300'}`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-normal border-l-2 border-brand-500 pl-6">
                <DefinitionParser text={term.definition} keywords={term.keywords} />
              </p>
              {term.examples.length > 0 && (
                <div className="mt-6 rounded-lg border border-dark-700/50 bg-dark-800/50 p-5">
                  <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Exemplos</h4>
                  <ul className="space-y-3">
                    {term.examples.map((ex, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm italic text-gray-300">
                        <span className="text-lg font-bold leading-none text-brand-500">›</span>
                        <span>"{ex}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Só no fallback legado: com sentidos, cada um já mostra o próprio autor. */}
        {author && !meanings && (
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            <Avatar name={author.name} src={author.avatar} size={22} className="flex-none" />
            <span>
              Adicionado por <span className="font-semibold text-gray-300">{author.name}</span>
              {author.level ? <span className="text-brand-400"> · Nível {author.level}</span> : null}
            </span>
          </div>
        )}

        {/* Rodapé: navegação por assunto. Só aparece se houver tags — antes um bloco
            vazio com borda ficava pendurado no fim do card. */}
        {term.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 border-t border-dark-800 pt-5">
            {term.tags.map(tag => (
              <Link key={tag} to={`/dicionario?tag=${encodeURIComponent(tag)}`} className="inline-block transition-transform hover:-translate-y-0.5">
                <Badge color="gray" className="cursor-pointer hover:border-brand-500/40 hover:text-brand-300">{tag}</Badge>
              </Link>
            ))}
          </div>
        )}

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
