import { useEffect, useRef } from 'react';

export type KonamiControlSource = 'keyboard' | 'touch';

const SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];
const STEP_TIMEOUT_MS = 3_000;
const SWIPE_MINIMUM_PX = 42;
const SWIPE_MAXIMUM_MS = 600;

const editableTarget = (target: EventTarget | null) => {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
};

export const useKonamiTrigger = (
  enabled: boolean,
  onTrigger: (source: KonamiControlSource) => void
) => {
  const indexRef = useRef(0);
  const lastStepRef = useRef(0);
  const sequenceScrollRef = useRef(0);
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      indexRef.current = 0;
      return;
    }

    const resetIfExpired = () => {
      if (lastStepRef.current && Date.now() - lastStepRef.current > STEP_TIMEOUT_MS) {
        indexRef.current = 0;
      }
    };

    const pushStep = (step: string, source: KonamiControlSource) => {
      resetIfExpired();
      const expected = SEQUENCE[indexRef.current];
      if (step === expected) {
        if (indexRef.current === 0) sequenceScrollRef.current = window.scrollY;
        indexRef.current += 1;
        lastStepRef.current = Date.now();
        if (indexRef.current === SEQUENCE.length) {
          indexRef.current = 0;
          lastStepRef.current = 0;
          const restoreScroll = () => window.scrollTo({ top: sequenceScrollRef.current, behavior: 'auto' });
          restoreScroll();
          window.requestAnimationFrame(restoreScroll);
          window.setTimeout(restoreScroll, 0);
          onTrigger(source);
        }
        return;
      }
      indexRef.current = step === SEQUENCE[0] ? 1 : 0;
      lastStepRef.current = indexRef.current ? Date.now() : 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || editableTarget(event.target)) return;
      const step = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (step.startsWith('Arrow') && (indexRef.current > 0 || step === SEQUENCE[0])) event.preventDefault();
      pushStep(step, 'keyboard');
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || editableTarget(event.target)) return;
      pointerRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pointerRef.current;
      pointerRef.current = null;
      if (!start || event.pointerType !== 'touch') return;
      const elapsed = Date.now() - start.at;
      if (elapsed > SWIPE_MAXIMUM_MS) {
        indexRef.current = 0;
        return;
      }

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_MINIMUM_PX) {
        if (Math.abs(dx) > Math.abs(dy)) pushStep(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 'touch');
        else pushStep(dy > 0 ? 'ArrowDown' : 'ArrowUp', 'touch');
        return;
      }

      if (indexRef.current >= 8) {
        pushStep(event.clientX < window.innerWidth / 2 ? 'b' : 'a', 'touch');
      } else {
        indexRef.current = 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled, onTrigger]);
};
