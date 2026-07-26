import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  isAnalyticsConfigured,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  subscribeToAnalyticsPreference,
} from '../src/lib/analytics';

export const AnalyticsPreferenceControl: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(isAnalyticsEnabled());
    sync();
    return subscribeToAnalyticsPreference(sync);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setAnalyticsEnabled(next);
    setEnabled(next);
  };

  return (
    <div className={`flex gap-4 ${compact ? 'items-center' : 'items-start sm:items-center'} justify-between`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-white font-semibold">
          <BarChart3 className="w-4 h-4 text-brand-400 flex-shrink-0" />
          Analytics de uso
        </div>
        {!compact && (
          <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-xl">
            Mede páginas visitadas, origem do tráfego, buscas e conversões de forma agregada. Consultas internas
            são sanitizadas, mantidas por até 90 dias e não são associadas à sua conta.
          </p>
        )}
        {!isAnalyticsConfigured() && (
          <p className="text-xs text-gray-500 mt-1">A coleta ainda não está configurada neste ambiente.</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Desativar analytics' : 'Ativar analytics'}
        onClick={toggle}
        className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${enabled ? 'bg-brand-500' : 'bg-dark-700'}`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
};

interface PrivacyPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyPreferencesDialog: React.FC<PrivacyPreferencesDialogProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-preferences-title"
        className="w-full max-w-xl bg-dark-900 border border-dark-700 rounded-lg shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-dark-800">
          <div className="flex gap-3">
            <ShieldCheck className="w-6 h-6 text-brand-400 flex-shrink-0" />
            <div>
              <h2 id="privacy-preferences-title" className="text-xl font-bold text-white">
                Preferências de privacidade
              </h2>
              <p className="text-sm text-gray-400 mt-1">Você pode mudar esta escolha a qualquer momento.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar preferências de privacidade"
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="pb-6 border-b border-dark-800">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Armazenamento necessário
            </div>
            <p className="text-sm text-gray-400 mt-1 leading-relaxed">
              Mantém sua sessão, preferências e segurança da conta. É necessário para o funcionamento do site
              e não pode ser desligado por este painel.
            </p>
          </div>

          <AnalyticsPreferenceControl />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <Link to="/privacidade" onClick={onClose} className="text-sm text-brand-400 hover:text-brand-300">
              Ler a Política de Privacidade
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold rounded-md transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
