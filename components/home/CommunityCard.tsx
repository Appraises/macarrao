import React, { useState } from 'react';
import { MessagesSquare, Send, CheckCircle2, Mail, ExternalLink, Check } from 'lucide-react';
import { subscribeNewsletter } from '../../src/services/api';
import { SectionHeader } from './SectionHeader';

// Configure via VITE_DISCORD_URL; falls back to a placeholder the team replaces.
const DISCORD_URL = (import.meta as any).env?.VITE_DISCORD_URL || 'https://discord.gg/';

const DiscordLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
        <path d="M19.5 5.34A17.1 17.1 0 0 0 15.44 4l-.5 1.02a15.67 15.67 0 0 0-5.87 0L8.55 4A17.17 17.17 0 0 0 4.5 5.35C1.94 9.16 1.25 12.88 1.6 16.55a16.4 16.4 0 0 0 4.97 2.5l1.2-1.65a10.6 10.6 0 0 1-1.88-.91l.46-.36c3.63 1.68 7.57 1.68 11.16 0l.47.36c-.6.36-1.23.66-1.89.91l1.2 1.65a16.34 16.34 0 0 0 4.97-2.5c.42-4.25-.72-7.94-2.76-11.21ZM8.82 14.28c-1.1 0-2-1.01-2-2.25s.88-2.25 2-2.25c1.12 0 2.02 1.02 2 2.25 0 1.24-.88 2.25-2 2.25Zm6.36 0c-1.1 0-2-1.01-2-2.25s.88-2.25 2-2.25c1.12 0 2.02 1.02 2 2.25 0 1.24-.88 2.25-2 2.25Z" />
    </svg>
);

export const CommunityCard: React.FC = () => {
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'loading') return;
        if (!consent) {
            setStatus('error');
            setMessage('Marque a caixa para concordar em receber os e-mails.');
            return;
        }
        setStatus('loading');
        setMessage('');
        try {
            await subscribeNewsletter(email.trim(), consent, 'home');
            setStatus('done');
        } catch (err: any) {
            setStatus('error');
            setMessage(err?.response?.data?.error || 'Não foi possível fazer a inscrição agora.');
        }
    };

    return (
        <section>
            <SectionHeader title="Comunidade" subtitle="Faça parte do dicionário" icon={<MessagesSquare className="w-4 h-4 text-brand-500" />} />

            <div className="bg-dark-900/60 border border-white/5 rounded-xl p-4 space-y-4">
                {/* Discord */}
                <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 px-4 py-3 transition-colors hover:bg-[#5865F2]/20 group"
                >
                    <div className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[#5865F2] text-white">
                        <DiscordLogo className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white">Entrar no Discord</p>
                        <p className="text-[11px] text-gray-400">Converse, sugira gírias e ajude a curar</p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-none text-gray-500 transition-colors group-hover:text-white" />
                </a>

                <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-dark-800" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">ou</span>
                    <span className="h-px flex-1 bg-dark-800" />
                </div>

                {/* Newsletter */}
                {status === 'done' ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-3 text-sm text-green-300">
                        <CheckCircle2 className="h-4 w-4 flex-none" />
                        Inscrito! Você vai receber o Termo do Dia.
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-gray-300">
                            <Mail className="h-3.5 w-3.5 text-brand-400" /> Receba o Termo do Dia por e-mail
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                aria-label="Seu e-mail"
                                className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-dark-950 px-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-brand-500"
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-brand-500 text-black transition-colors hover:bg-brand-400 disabled:opacity-60"
                                aria-label="Inscrever"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                        <label className="group/consent relative flex cursor-pointer items-start gap-2 text-[10px] leading-4 text-gray-500">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="mt-px grid h-3.5 w-3.5 flex-none place-items-center rounded-[3px] border border-gray-600 bg-dark-950 text-transparent transition-colors group-hover/consent:border-gray-400 peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-dark-950 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-dark-900">
                                <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                            <span>
                                Aceito receber o Termo do Dia por e-mail e concordo com a{' '}
                                <a href="/privacidade" className="font-medium text-brand-400 hover:text-brand-300 hover:underline">
                                    Política de Privacidade
                                </a>.
                            </span>
                        </label>
                        {status === 'error' && <p className="text-[11px] text-red-400">{message}</p>}
                    </form>
                )}
            </div>
        </section>
    );
};
