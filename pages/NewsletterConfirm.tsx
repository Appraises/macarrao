import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { confirmNewsletter, resendNewsletterConfirmation } from '../src/services/api';

export const NewsletterConfirm: React.FC = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('O link de confirmação está incompleto.'); return; }
    confirmNewsletter(token)
      .then(() => setStatus('success'))
      .catch((error) => { setStatus('error'); setMessage(error?.response?.data?.error || 'O link é inválido ou expirou.'); });
  }, [params]);

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || resendStatus === 'loading') return;
    setResendStatus('loading');
    try { await resendNewsletterConfirmation(email.trim()); } finally { setResendStatus('done'); }
  };

  return <div className="grid min-h-[65vh] place-items-center px-4 py-16">
    <Seo title="Confirmar newsletter" path="/newsletter/confirmar" noindex />
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-dark-900 p-8 text-center">
      {status === 'loading' && <><Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-400" /><h1 className="mt-5 text-xl font-bold text-white">Confirmando inscrição</h1></>}
      {status === 'success' && <><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /><h1 className="mt-5 text-xl font-bold text-white">Inscrição confirmada</h1><p className="mt-2 text-sm text-gray-400">A partir de agora, o Termo do Dia chegará no seu e-mail às 09:00.</p><Link to="/dicionario" className="mt-6 inline-flex rounded bg-brand-500 px-4 py-2 text-sm font-bold text-dark-950">Explorar o dicionário</Link></>}
      {status === 'error' && <><MailWarning className="mx-auto h-12 w-12 text-amber-400" /><h1 className="mt-5 text-xl font-bold text-white">Não foi possível confirmar</h1><p className="mt-2 text-sm text-gray-400">{message}</p>{resendStatus === 'done' ? <p className="mt-5 rounded border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Se o endereço estiver pendente, enviaremos um novo link.</p> : <form onSubmit={resend} className="mt-5 space-y-3"><label className="block text-left text-xs font-bold text-gray-300" htmlFor="newsletter-resend-email">E-mail da inscrição</label><input id="newsletter-resend-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded border border-white/10 bg-dark-950 px-3 text-sm text-white outline-none focus:border-brand-500" /><button type="submit" disabled={resendStatus === 'loading'} className="h-10 w-full rounded bg-brand-500 text-sm font-bold text-dark-950 disabled:opacity-50">Reenviar confirmação</button></form>}<Link to="/" className="mt-6 inline-flex rounded border border-white/10 px-4 py-2 text-sm font-bold text-gray-200">Voltar ao início</Link></>}
    </div>
  </div>;
};
