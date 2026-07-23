// Shared helpers + templates for Open Graph images (1200x630).
// Used by scripts/generate-og.mjs (default image) and vite.config.ts (per-term).
import { Resvg } from '@resvg/resvg-js';

export const OG_W = 1200;
export const OG_H = 630;

export function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );
}

// Naive word-wrap into at most `maxLines` lines of ~`maxChars` chars, with an
// ellipsis on the last line when the text overflows.
export function wrapLines(text, maxChars, maxLines) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  let i = 0;
  for (; i < words.length; i++) {
    const candidate = cur ? `${cur} ${words[i]}` : words[i];
    if (candidate.length <= maxChars) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = words[i];
      if (lines.length >= maxLines) {
        cur = '';
        break;
      }
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  const placed = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (placed < words.length && lines.length > 0) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].replace(/[.,;:!?…]*$/, '')}…`;
  }
  return lines.slice(0, maxLines);
}

// Background + subtle grid shared by every OG image. `inner` is the foreground.
export function ogFrame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <rect width="${OG_W}" height="${OG_H}" fill="#020617"/>
  <g stroke="#1e293b" stroke-width="1" opacity="0.5">
    <line x1="0" y1="157" x2="1200" y2="157"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="472" x2="1200" y2="472"/>
    <line x1="300" y1="0" x2="300" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="900" y1="0" x2="900" y2="630"/>
  </g>
  ${inner}
</svg>`;
}

// OG card for a single dictionary term.
export function termCardSvg({ word, definition = '', tag = '' }) {
  const title = escapeXml(String(word).slice(0, 28));
  // Shrink the title font for long words so they fit the 1000px column.
  const len = String(word).length;
  const titleSize = len > 16 ? 60 : len > 11 ? 74 : 88;

  const badge = tag
    ? `<text x="102" y="190" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#0ea5e9" letter-spacing="3">${escapeXml(String(tag).toUpperCase())}</text>`
    : '';

  const subLines = wrapLines(definition, 52, 3);
  const subtitle = subLines
    .map(
      (ln, i) =>
        `<tspan x="102" dy="${i === 0 ? 0 : 46}">${escapeXml(ln)}</tspan>`,
    )
    .join('');

  const inner = `
  ${badge}
  <rect x="100" y="214" width="70" height="8" rx="4" fill="#0ea5e9"/>
  <text x="100" y="${214 + 86}" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="bold" fill="#ffffff">${title}</text>
  <text x="102" y="392" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="#94a3b8">${subtitle}</text>
  <text x="102" y="565" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#475569" letter-spacing="4">DICION&#193;RIO GAMER</text>`;

  return ogFrame(inner);
}

export function renderPng(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_W },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  });
  return resvg.render().asPng();
}
