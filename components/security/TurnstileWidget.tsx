import React, { useEffect, useRef, useState } from 'react';

type TurnstileAction = 'register' | 'contribution';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  action: TurnstileAction;
  onTokenChange: (token: string | null) => void;
  resetSignal?: number;
}

const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<TurnstileApi> | null = null;

export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';
export const isTurnstileConfigured = Boolean(turnstileSiteKey);

const loadTurnstile = (): Promise<TurnstileApi> => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const deadline = Date.now() + 10_000;
    let settled = false;

    const resolveWhenReady = () => {
      if (settled) return;
      if (window.turnstile) {
        settled = true;
        resolve(window.turnstile);
        return;
      }
      if (Date.now() >= deadline) {
        settled = true;
        scriptPromise = null;
        reject(new Error('A verificacao de seguranca demorou para responder.'));
        return;
      }
      window.setTimeout(resolveWhenReady, 25);
    };

    script.addEventListener('load', resolveWhenReady, { once: true });
    script.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      scriptPromise = null;
      reject(new Error('Falha ao carregar a verificacao de seguranca.'));
    }, { once: true });

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      resolveWhenReady();
    }
  });

  return scriptPromise;
};

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  action,
  onTokenChange,
  resetSignal = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [error, setError] = useState('');

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!turnstileSiteKey || !containerRef.current) return;

    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          action,
          theme: 'dark',
          appearance: 'interaction-only',
          size: 'flexible',
          callback: (token: string) => {
            setError('');
            onTokenChangeRef.current(token);
          },
          'expired-callback': () => onTokenChangeRef.current(null),
          'timeout-callback': () => onTokenChangeRef.current(null),
          'error-callback': () => {
            onTokenChangeRef.current(null);
            setError('A verificacao de seguranca falhou. Tente novamente.');
            return true;
          },
        });
      })
      .catch((loadError) => setError(
        loadError instanceof Error ? loadError.message : 'Falha ao carregar a verificacao de seguranca.',
      ));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      onTokenChangeRef.current(null);
    };
  }, [action]);

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChangeRef.current(null);
      setError('');
    }
  }, [resetSignal]);

  if (!turnstileSiteKey) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      <div ref={containerRef} className="min-h-[65px] w-full" aria-label="Verificação anti-bot" />
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
};
