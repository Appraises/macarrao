import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const root = new URL('../', import.meta.url);
const cards = [
  ['public/dg-control-logo.svg', 'Azul principal', '#38BDF8', '#080F19', '#FFFFFF', '8,97:1'],
  ['public/brand/dg-control-light-background.svg', 'Azul para fundo claro', '#0369A1', '#FFFFFF', '#080F19', '5,93:1'],
  ['public/brand/dg-control-white.svg', 'Branco', '#FFFFFF', '#080F19', '#FFFFFF', '19,22:1'],
  ['public/brand/dg-control-ink.svg', 'Tinta escura', '#080F19', '#FFFFFF', '#080F19', '19,22:1'],
];
const tiles = await Promise.all(cards.map(async ([file, label, color, background, ink, ratio], i) => {
  const logo = new Resvg(await readFile(new URL(file, root)), { fitTo: { mode: 'width', value: 220 } }).render().asPng();
  return `<g transform="translate(${32 + (i % 2) * 456} ${114 + Math.floor(i / 2) * 224})">
    <rect width="440" height="208" rx="8" fill="${background}" stroke="#334155"/>
    <image href="data:image/png;base64,${logo.toString('base64')}" x="110" y="12" width="220" height="121"/>
    <text x="22" y="162" font-size="21" font-weight="700" fill="${ink}">${label}</text>
    <text x="22" y="186" font-size="15" fill="${ink}">${color} sobre ${background}</text>
    <text x="416" y="162" text-anchor="end" font-size="19" font-weight="700" fill="${ink}">${ratio}</text>
  </g>`;
}));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="580" font-family="Arial, sans-serif">
  <rect width="960" height="580" fill="#111827"/>
  <rect x="32" y="36" width="4" height="53" fill="#38BDF8"/>
  <text x="49" y="56" fill="#38BDF8" font-size="15" font-weight="700">GUIA DA MARCA</text>
  <text x="49" y="88" fill="#FFFFFF" font-size="34" font-weight="700">Dicion&#225;rio Gamer</text>
  ${tiles.join('')}
</svg>`;
await writeFile(new URL('docs/brand-variants.png', root), new Resvg(svg).render().asPng());
