import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { trackAnalyticsEvent } from '../lib/analytics';
import type { KonamiControlSource } from '../hooks/useKonamiTrigger';

export type ArcadePhase = 'idle' | 'breaking' | 'playing' | 'restoring';

interface ArcadeContextValue {
  phase: ArcadePhase;
  controlSource: KonamiControlSource;
  activate: (source: KonamiControlSource) => void;
  close: () => void;
}

const ArcadeContext = createContext<ArcadeContextValue | null>(null);

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ArcadeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<ArcadePhase>('idle');
  const phaseRef = useRef<ArcadePhase>('idle');
  const [controlSource, setControlSource] = useState<KonamiControlSource>('keyboard');
  const timerRef = useRef<number | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const activate = useCallback((source: KonamiControlSource) => {
    if (phaseRef.current !== 'idle') return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setControlSource(source);
    phaseRef.current = 'breaking';
    setPhase('breaking');
    trackAnalyticsEvent('Easter Egg Activated', { source, location: 'term_jogo' });
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      phaseRef.current = 'playing';
      setPhase('playing');
    }, reducedMotion() ? 180 : 1_420);
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current === 'idle' || phaseRef.current === 'restoring') return;
    clearTimer();
    phaseRef.current = 'restoring';
    setPhase('restoring');
    timerRef.current = window.setTimeout(() => {
      phaseRef.current = 'idle';
      setPhase('idle');
      previousFocusRef.current?.focus({ preventScroll: true });
    }, reducedMotion() ? 120 : 1_220);
  }, []);

  useEffect(() => {
    if (phase === 'idle') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  useEffect(() => () => clearTimer(), []);

  return (
    <ArcadeContext.Provider value={{ phase, controlSource, activate, close }}>
      {children}
    </ArcadeContext.Provider>
  );
};

export const useArcade = () => {
  const value = useContext(ArcadeContext);
  if (!value) throw new Error('useArcade must be used within ArcadeProvider');
  return value;
};
