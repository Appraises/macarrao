import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ClipboardList, LogIn, Sparkles } from 'lucide-react';
import { ContributionForm } from '../components/contributions/ContributionForm';
import { Seo } from '../components/Seo';
import { Button } from '../components/UI';
import { useAuth } from '../src/context/AuthContext';
import { trackAnalyticsEvent } from '../src/lib/analytics';
import { createContribution } from '../src/services/api';
import type { ContributionInput } from '../types';

export const Contribute: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [created, setCreated] = useState<{ id: string; word: string } | null>(null);

  if (!user) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
        <Seo title="Contribuir" noindex />
        <LogIn className="mb-5 h-10 w-10 text-brand-400" />
        <h1 className="text-3xl font-bold text-white">Entre para contribuir</h1>
        <p className="mt-3 max-w-md text-gray-400">O login protege a fila de moderação e permite acompanhar cada decisão.</p>
        <Button onClick={() => navigate('/login')} className="mt-7">Fazer login</Button>
      </main>
    );
  }

  if (!user.emailVerified) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
        <Seo title="Contribuir" noindex />
        <AlertTriangle className="mb-5 h-10 w-10 text-yellow-400" />
        <h1 className="text-3xl font-bold text-white">Confirme seu e-mail</h1>
        <p className="mt-3 max-w-md text-gray-400">A verificação de e-mail é necessária antes de enviar termos para moderação.</p>
        <Button onClick={() => navigate('/settings')} variant="secondary" className="mt-7">Abrir configurações</Button>
      </main>
    );
  }

  const submit = async (value: ContributionInput) => {
    const contribution = await createContribution(value);
    trackAnalyticsEvent('Contribution Submitted', {
      game_selected: Boolean(value.gameId),
      topics_count: value.tags.length,
    });
    setCreated({ id: contribution.id, word: contribution.word });
  };

  if (created) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
        <Seo title="Contribuição enviada" noindex />
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-green-500/30 bg-green-500/10">
          <Check className="h-10 w-10 text-green-400" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-white">Contribuição enviada</h1>
        <p className="mt-3 text-gray-400">“{created.word}” entrou na fila. Você poderá acompanhar o status, corrigir pedidos de revisão e consultar todo o histórico.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/minhas-contribuicoes/${created.id}`}><Button className="w-full"><ClipboardList className="h-4 w-4" /> Acompanhar contribuição</Button></Link>
          <Button variant="outline" onClick={() => setCreated(null)}>Enviar outra</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <Seo title="Nova contribuição" description="Sugira um novo termo para o Dicionário Gamer." path="/contribuir" noindex />
      <header className="mb-10 border-b border-white/10 pb-7">
        <span className="flex items-center gap-2 text-xs font-bold uppercase text-brand-400"><Sparkles className="h-4 w-4" /> Comunidade</span>
        <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Nova contribuição</h1>
        <p className="mt-3 max-w-2xl text-gray-400">Explique o termo com clareza. A moderação poderá aprovar, rejeitar ou pedir ajustes antes da publicação.</p>
      </header>
      <ContributionForm onSubmit={submit} onCancel={() => navigate('/dicionario')} />
    </main>
  );
};
