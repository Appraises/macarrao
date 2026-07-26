import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useArcade } from '../../src/context/ArcadeContext';
import { computeBrickBreakerLayout, type Rect } from '../../src/game/brickBreaker/layout';

const BrickBreaker = React.lazy(() =>
  import('./BrickBreaker').then((module) => ({ default: module.BrickBreaker }))
);

const FALLBACK_COLORS = ['#0ea5e9', '#256d8f', '#324a69', '#43556f', '#1f7698', '#64748b'];
const HEADER_HEIGHT = 96;

interface PanelSource {
  name: string;
  rect: Rect;
  background: string;
  canvasColor: string;
  borderColor: string;
}

export interface MorphFragment {
  id: number;
  sourceName: string;
  source: Rect;
  square: Rect;
  target: Rect;
  background: string;
  canvasColor: string;
  borderColor: string;
  delay: number;
}

interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const DEFAULT_PAGE_COLOR: RgbaColor = { red: 2, green: 6, blue: 23, alpha: 1 };

const parseCssColors = (value: string): RgbaColor[] =>
  Array.from(value.matchAll(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/gi))
    .map((match) => ({
      red: Number(match[1]),
      green: Number(match[2]),
      blue: Number(match[3]),
      alpha: match[4] === undefined ? 1 : Number(match[4]),
    }))
    .filter((color) => Object.values(color).every(Number.isFinite));

const compositeColor = (foreground: RgbaColor, background: RgbaColor): RgbaColor => {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha <= 0) return DEFAULT_PAGE_COLOR;
  return {
    red: (foreground.red * foreground.alpha + background.red * background.alpha * (1 - foreground.alpha)) / alpha,
    green: (foreground.green * foreground.alpha + background.green * background.alpha * (1 - foreground.alpha)) / alpha,
    blue: (foreground.blue * foreground.alpha + background.blue * background.alpha * (1 - foreground.alpha)) / alpha,
    alpha,
  };
};

const formatColor = (color: RgbaColor) =>
  `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)})`;

const hasVisibleBackground = (style: CSSStyleDeclaration) => {
  const background = parseCssColors(style.backgroundColor)[0];
  return style.backgroundImage !== 'none' || Boolean(background && background.alpha > 0.015);
};

const nearestOpaqueBackground = (element: HTMLElement): RgbaColor => {
  let current: HTMLElement | null = element.parentElement;
  const layers: RgbaColor[] = [];
  while (current) {
    const parsed = parseCssColors(window.getComputedStyle(current).backgroundColor)[0];
    if (parsed && parsed.alpha > 0.015) {
      layers.push(parsed);
      if (parsed.alpha >= 0.98) break;
    }
    current = current.parentElement;
  }
  return layers.reduceRight(
    (background, foreground) => compositeColor(foreground, background),
    DEFAULT_PAGE_COLOR,
  );
};

const solidSurfaceColor = (style: CSSStyleDeclaration, base: RgbaColor) => {
  const backgroundColor = parseCssColors(style.backgroundColor)[0];
  const surfaceBase = backgroundColor ? compositeColor(backgroundColor, base) : base;
  const gradientColors = parseCssColors(style.backgroundImage);
  if (gradientColors.length === 0) return formatColor(surfaceBase);

  const renderedStops = gradientColors.map((color) => compositeColor(color, surfaceBase));
  const average = renderedStops.reduce<RgbaColor>((result, color) => ({
    red: result.red + color.red / renderedStops.length,
    green: result.green + color.green / renderedStops.length,
    blue: result.blue + color.blue / renderedStops.length,
    alpha: 1,
  }), { red: 0, green: 0, blue: 0, alpha: 1 });
  return formatColor(average);
};

const surfaceBackground = (style: CSSStyleDeclaration, baseColor: string) => {
  const backgroundColor = parseCssColors(style.backgroundColor)[0];
  if (style.backgroundImage !== 'none') return `${style.backgroundImage}, ${baseColor}`;
  return backgroundColor && backgroundColor.alpha > 0.015 ? style.backgroundColor : baseColor;
};

const surfaceBorderColor = (style: CSSStyleDeclaration) => {
  const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((side) => {
    const width = Number.parseFloat(style[`border${side}Width` as keyof CSSStyleDeclaration] as string);
    const borderStyle = style[`border${side}Style` as keyof CSSStyleDeclaration] as string;
    return width > 0 && borderStyle !== 'none';
  });
  return hasBorder ? style.borderColor : 'rgba(255,255,255,.08)';
};

const visualSurfaces = (panel: HTMLElement): HTMLElement[] => {
  const panelStyle = window.getComputedStyle(panel);
  if (hasVisibleBackground(panelStyle)) return [panel];

  const panelRect = panel.getBoundingClientRect();
  const minimumArea = Math.max(900, panelRect.width * panelRect.height * 0.1);
  const candidates = Array.from(panel.querySelectorAll<HTMLElement>('*')).filter((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width * rect.height < minimumArea || rect.bottom <= HEADER_HEIGHT || rect.top >= window.innerHeight) {
      return false;
    }
    return hasVisibleBackground(window.getComputedStyle(element));
  });

  return candidates.filter((candidate) =>
    !candidates.some((possibleParent) => possibleParent !== candidate && possibleParent.contains(candidate))
  ).slice(0, 8);
};

const visiblePanelSources = (host: HTMLElement): PanelSource[] => {
  const viewportBottom = window.innerHeight;
  const elements = Array.from(host.querySelectorAll<HTMLElement>('[data-arcade-panel]'));
  return elements.flatMap((panel, panelIndex) => {
    const panelRect = panel.getBoundingClientRect();
    if (panelRect.bottom <= HEADER_HEIGHT || panelRect.top >= viewportBottom || panelRect.width < 80 || panelRect.height < 40) {
      return [];
    }
    const surfaces = visualSurfaces(panel);
    const usableSurfaces = surfaces.length > 0 ? surfaces : [panel];
    return usableSurfaces.map((surface, surfaceIndex) => {
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      const base = nearestOpaqueBackground(surface);
      const baseColor = formatColor(base);
      return {
        name: panel.dataset.arcadePanel || `panel-${panelIndex}-${surfaceIndex}`,
        rect: {
          x: rect.left,
          y: rect.top - HEADER_HEIGHT,
          width: rect.width,
          height: rect.height,
        },
        background: surfaceBackground(style, baseColor),
        canvasColor: solidSurfaceColor(style, base),
        borderColor: surfaceBorderColor(style),
      };
    });
  });
};

const createFragments = (host: HTMLElement): MorphFragment[] => {
  const overlayHeight = Math.max(420, window.innerHeight - HEADER_HEIGHT);
  const layout = computeBrickBreakerLayout(window.innerWidth, overlayHeight);
  const sources = visiblePanelSources(host);
  const fallbackRect = host.getBoundingClientRect();
  const usableSources = sources.length > 0 ? sources : [{
    name: 'fallback',
    rect: {
      x: Math.max(12, fallbackRect.left),
      y: Math.max(0, fallbackRect.top - HEADER_HEIGHT),
      width: Math.max(280, Math.min(fallbackRect.width, window.innerWidth - 24)),
      height: Math.max(180, Math.min(fallbackRect.height, overlayHeight)),
    },
    background: FALLBACK_COLORS[0],
    canvasColor: FALLBACK_COLORS[0],
    borderColor: 'rgba(14,165,233,.35)',
  }];
  const tilesPerPanel = Math.ceil(layout.bricks.length / usableSources.length);
  const sourceColumns = 4;
  const sourceRows = Math.ceil(tilesPerPanel / sourceColumns);

  return layout.bricks.map((target, index) => {
    const panelIndex = index % usableSources.length;
    const panel = usableSources[panelIndex];
    const localIndex = Math.floor(index / usableSources.length);
    const column = localIndex % sourceColumns;
    const row = Math.floor(localIndex / sourceColumns);
    const sourceWidth = panel.rect.width / sourceColumns;
    const sourceHeight = panel.rect.height / sourceRows;
    const source = {
      x: panel.rect.x + column * sourceWidth,
      y: panel.rect.y + row * sourceHeight,
      width: sourceWidth,
      height: sourceHeight,
    };
    const squareSize = Math.max(16, Math.min(34, sourceWidth, sourceHeight));
    const square = {
      x: source.x + (source.width - squareSize) / 2,
      y: source.y + (source.height - squareSize) / 2,
      width: squareSize,
      height: squareSize,
    };

    return {
      id: index,
      sourceName: panel.name,
      source,
      square,
      target,
      background: panel.background,
      canvasColor: panel.canvasColor,
      borderColor: panel.borderColor,
      delay: (index % 8) * 9 + Math.floor(index / 8) * 11,
    };
  });
};

const FragmentLayer: React.FC<{ fragments: MorphFragment[]; reverse: boolean }> = ({ fragments, reverse }) => {
  const [stage, setStage] = useState<'source' | 'square' | 'target'>(reverse ? 'target' : 'source');

  useEffect(() => {
    let first = 0;
    let second = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      first = window.setTimeout(() => setStage(reverse ? 'source' : 'target'), 10);
      return () => window.clearTimeout(first);
    }
    first = window.setTimeout(() => setStage('square'), 35);
    second = window.setTimeout(() => setStage(reverse ? 'source' : 'target'), reverse ? 380 : 410);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [reverse]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 top-24 z-40 overflow-hidden"
      aria-hidden="true"
      data-testid="panel-morph-layer"
      data-stage={stage}
    >
      {fragments.map((fragment) => {
        const rect = stage === 'source' ? fragment.source : stage === 'square' ? fragment.square : fragment.target;
        return (
          <span
            key={fragment.id}
            data-arcade-source={fragment.sourceName}
            data-canvas-color={fragment.canvasColor}
            className="absolute border shadow-[0_8px_24px_rgba(0,0,0,.28)]"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              background: fragment.background,
              borderColor: fragment.borderColor,
              borderRadius: stage === 'source' ? 8 : stage === 'square' ? 3 : 2,
              opacity: stage === 'source' ? 0.55 : 0.94,
              transform: stage === 'square'
                ? `rotate(${(fragment.id % 7) * 4 - 12}deg)`
                : 'rotate(0deg)',
              transitionProperty: 'left, top, width, height, border-radius, opacity, transform',
              transitionDuration: stage === 'square' ? '285ms' : reverse ? '670ms' : '740ms',
              transitionDelay: `${fragment.delay}ms`,
              transitionTimingFunction: stage === 'target'
                ? 'cubic-bezier(.18,.76,.22,1)'
                : stage === 'square'
                  ? 'cubic-bezier(.32,0,.24,1)'
                  : 'cubic-bezier(.22,.72,.2,1)',
            }}
          />
        );
      })}
    </div>
  );
};

export const ArcadeMain: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { phase, controlSource, close } = useArcade();
  const contentRef = useRef<HTMLDivElement>(null);
  const [fragments, setFragments] = useState<MorphFragment[]>([]);

  useEffect(() => {
    if (phase === 'breaking' && contentRef.current) setFragments(createFragments(contentRef.current));
  }, [phase]);

  const palette = useMemo(() => fragments.map((fragment) => fragment.canvasColor), [fragments]);
  const active = phase !== 'idle';

  return (
    <main className="relative z-10 flex flex-grow flex-col">
      <div
        ref={contentRef}
        aria-hidden={active}
        className={`flex flex-1 flex-col transition-[opacity,filter] duration-700 ${
          active
            ? 'pointer-events-none opacity-35 brightness-[.58] [&_[data-arcade-panel]]:scale-[0.94] [&_[data-arcade-panel]]:opacity-0'
            : 'opacity-100 brightness-100 [&_[data-arcade-panel]]:scale-100 [&_[data-arcade-panel]]:opacity-100'
        } [&_[data-arcade-panel]]:transition-[opacity,transform] [&_[data-arcade-panel]]:duration-500 [&_[data-arcade-panel]]:ease-out`}
      >
        {children}
      </div>

      {(phase === 'breaking' || phase === 'restoring') && fragments.length > 0 && (
        <FragmentLayer fragments={fragments} reverse={phase === 'restoring'} />
      )}

      {phase === 'playing' && (
        <div className="fixed inset-x-0 bottom-0 top-24 z-40" data-testid="brick-breaker-overlay">
          <Suspense fallback={<span className="sr-only">Montando o Brick Breaker...</span>}>
            <BrickBreaker onClose={close} controlSource={controlSource} palette={palette} />
          </Suspense>
        </div>
      )}
    </main>
  );
};
