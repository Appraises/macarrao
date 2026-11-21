// Shared helpers + templates for Open Graph images (1200x630).
// Used by scripts/generate-og.mjs (default image) and vite.config.ts (per-term
// and news fallbacks). Same visual language as the Instagram cards: night-blue
// background with a cyan glow, the 3D DG controller mark, Barlow Condensed for
// display text and Space Grotesk for copy (fonts vendored in scripts/fonts).
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

export const OG_W = 1200;
export const OG_H = 630;

const BRAND = '#38bdf8';
const fontFiles = ['BarlowCondensed_900Black.ttf', 'SpaceGrotesk_700Bold.ttf', 'SpaceGrotesk_500Medium.ttf', 'SpaceGrotesk_400Regular.ttf']
  .map((file) => new URL(`./fonts/${file}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

// Trimmed 3D mark (817x498), embedded once per process.
const LOGO_RATIO = 498 / 817;
let logoDataUri;
const logo = (x, y, width, opacity = 1) => {
  logoDataUri ??= `data:image/png;base64,${readFileSync(new URL('../public/brand/dg-control-3d-trim.png', import.meta.url)).toString('base64')}`;
  return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${width}" height="${Math.round(width * LOGO_RATIO)}" opacity="${opacity}"/>`;
};

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

const display = 'font-family="Barlow Condensed" font-weight="900"';
const copy = (weight = 400) => `font-family="Space Grotesk" font-weight="${weight}"`;

// Background shared by every OG image: night blue, cyan glow from the top
// right, a faint dot grid and the brand stripe at the bottom. `inner` is the
// foreground.
export function ogFrame(inner, { accent = BRAND } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <defs>
    <radialGradient id="glow" cx="88%" cy="8%" r="75%">
      <stop offset="0" stop-color="${accent}" stop-opacity=".30"/>
      <stop offset=".45" stop-color="${accent}" stop-opacity=".08"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0%" cy="100%" r="60%">
      <stop offset="0" stop-color="#6366f1" stop-opacity=".16"/>
      <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="#94a3b8" opacity=".14"/>
    </pattern>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="#080f19"/>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#dots)"/>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#glow)"/>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#glow2)"/>
  <rect y="${OG_H - 10}" width="${OG_W}" height="10" fill="${accent}"/>
  ${inner}
</svg>`;
}

// Default share image: the mark, the wordmark and what the site is.
export function defaultCardSvg() {
  const chips = [['FPS', '#38bdf8'], ['MOBA', '#c084fc'], ['RPG', '#facc15'], ['E-SPORTS', '#fb923c']];
  let x = 560;
  const chipRow = chips.map(([label, color]) => {
    const width = 26 + label.length * 15;
    const chip = `<rect x="${x}" y="494" width="${width}" height="44" rx="22" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-opacity=".55"/>
      <text x="${x + width / 2}" y="523" ${copy(700)} font-size="20" fill="${color}" text-anchor="middle" letter-spacing="1">${label}</text>`;
    x += width + 12;
    return chip;
  }).join('');
  return ogFrame(`
  ${logo(62, 160, 450)}
  <text x="560" y="150" ${copy(700)} font-size="22" fill="${BRAND}" letter-spacing="5">FEITO POR QUEM JOGA</text>
  <text x="556" y="262" ${display} font-size="126" fill="#ffffff">DICION&#193;RIO</text>
  <text x="556" y="376" ${display} font-size="126" fill="${BRAND}">GAMER</text>
  <text x="560" y="428" ${copy(400)} font-size="30" fill="#cbd5e1">G&#237;rias, termos e mec&#226;nicas</text>
  <text x="560" y="468" ${copy(400)} font-size="30" fill="#cbd5e1">dos games, explicados.</text>
  ${chipRow}
  <text x="1140" y="582" ${copy(500)} font-size="22" fill="#94a3b8" text-anchor="end" letter-spacing="2">DICIONARIOGAMER.COM</text>`);
}

// OG card for a single dictionary term.
export function termCardSvg({ word, definition = '', tag = '' }) {
  const value = String(word).slice(0, 34);
  const len = value.length;
  const titleSize = len > 22 ? 78 : len > 16 ? 96 : len > 11 ? 118 : 138;
  const lines = wrapLines(definition, 46, 3);
  const body = lines
    .map((line, i) => `<tspan x="70" dy="${i === 0 ? 0 : 44}">${escapeXml(line)}</tspan>`)
    .join('');
  const tagLabel = String(tag).toUpperCase().slice(0, 18);
  const tagWidth = 34 + tagLabel.length * 14;
  const badge = tagLabel
    ? `<rect x="${1130 - tagWidth}" y="52" width="${tagWidth}" height="44" rx="22" fill="${BRAND}" fill-opacity=".12" stroke="${BRAND}" stroke-opacity=".55"/>
       <text x="${1130 - tagWidth / 2}" y="81" ${copy(700)} font-size="20" fill="${BRAND}" text-anchor="middle" letter-spacing="1">${escapeXml(tagLabel)}</text>`
    : '';
  const titleY = 222 + Math.round(titleSize * .78);

  return ogFrame(`
  ${logo(840, 300, 420, .10)}
  ${logo(70, 52, 92)}
  <text x="180" y="86" ${copy(700)} font-size="24" fill="#e2e8f0" letter-spacing="3">DICION&#193;RIO GAMER</text>
  ${badge}
  <text x="70" y="200" ${copy(700)} font-size="24" fill="${BRAND}" letter-spacing="5">O QUE SIGNIFICA</text>
  <text x="66" y="${titleY}" ${display} font-size="${titleSize}" fill="#ffffff">${escapeXml(value)}</text>
  <text x="70" y="${titleY + 64}" ${copy(400)} font-size="31" fill="#cbd5e1">${body}</text>
  <text x="70" y="582" ${copy(500)} font-size="22" fill="#94a3b8" letter-spacing="2">DICIONARIOGAMER.COM</text>
  <text x="1130" y="582" ${copy(700)} font-size="22" fill="${BRAND}" text-anchor="end">Veja exemplos de uso &#8594;</text>`);
}

export function renderPng(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_W },
    font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Space Grotesk' },
  });
  return resvg.render().asPng();
}
