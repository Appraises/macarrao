import React, { useState } from 'react';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { unsubscribeNewsletter } from '../src/services/api';

export const NewsletterUnsubscribe: React.FC = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(params.get('token') ? 'idle' : 'error');
  const unsubscribe = async () => {
    const token = params.get('token');
    if (!token) return;
    setStatus('loading');
    try { await unsubscribeNewsletter(token); setStatus('success'); } catch { setStatus('error'); }
  };
  return <div className="grid min-h-[65vh] place-items-center px-4 py-16">
    <Seo title="Descadastrar newsletter" path="/newsletter/descadastrar" noindex />
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-dark-900 p-8 text-center">
      {status === 'success' ? <><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /><h1 className="mt-5 text-xl font-bold text-white">Descadastro concluído</h1><p className="mt-2 text-sm text-gray-400">Esse endereço não receberá os próximos Termos do Dia.</p></> : <><MailX className="mx-auto h-12 w-12 text-gray-400" /><h1 className="mt-5 text-xl font-bold text-white">Parar de receber o Termo do Dia</h1><p className="mt-2 text-sm text-gray-400">O descadastro é imediato e não afeta uma eventual conta no site.</p>{status === 'error' ? <p className="mt-4 text-sm text-rose-300">O link está incompleto ou não pôde ser processado.</p> : <button type="button" disabled={status === 'loading'} onClick={unsubscribe} className="mt-6 inline-flex items-center gap-2 rounded bg-brand-500 px-4 py-2 text-sm font-bold text-dark-950 disabled:opacity-50">{status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar descadastro</button>}</>}
      <div className="mt-6"><Link to="/" className="text-sm font-medium text-brand-400">Voltar ao Dicionário Gamer</Link></div>
    </div>
  </div>;
};
