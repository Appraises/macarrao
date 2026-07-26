// Generates branded cover art for games whose external image URL is dead and that
// have no Steam header to fall back on (Valorant, Fortnite, Minecraft, WoW are not
// on Steam). Self-hosted, so it can never break again and carries no licensing risk.
// Writes PNGs into server/uploads/games/ and prints the resulting public paths.
// Run from the repo root: node scripts/generate-game-covers.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'server', 'uploads', 'games');
mkdirSync(outDir, { recursive: true });

// Accent per game keeps the covers distinguishable at a glance in the grid.
const COVERS = [
    { slug: 'valorant', name: 'Valorant', genre: 'FPS', accent: '#ef4444' },
    { slug: 'fortnite', name: 'Fortnite', genre: 'Battle Royale', accent: '#8b5cf6' },
    { slug: 'minecraft', name: 'Minecraft', genre: 'Sandbox', accent: '#22c55e' },
    { slug: 'world-of-warcraft', name: 'World of Warcraft', genre: 'MMORPG', accent: '#f59e0b' },
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Header proportions match Steam's art (460x215) so the grid stays visually even.
const svg = ({ name, genre, accent }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="920" height="430" viewBox="0 0 920 430">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="920" height="430" fill="url(#bg)"/>
  <rect width="920" height="430" fill="url(#glow)"/>
  <g stroke="${accent}" stroke-opacity="0.10" stroke-width="1">
    ${Array.from({ length: 10 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100 - 200}" y2="430"/>`).join('')}
  </g>
  <rect x="0" y="0" width="6" height="430" fill="${accent}"/>
  <text x="56" y="196" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="bold" fill="#ffffff">${escape(name)}</text>
  <text x="56" y="244" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${accent}" letter-spacing="4">${escape(genre.toUpperCase())}</text>
  <text x="56" y="372" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b" letter-spacing="3">DICIONÁRIO GAMER</text>
</svg>`;

for (const cover of COVERS) {
    const png = new Resvg(svg(cover), { fitTo: { mode: 'width', value: 920 } }).render().asPng();
    const filename = `cover-${cover.slug}.png`;
    writeFileSync(join(outDir, filename), png);
    console.log(`  gerado: /uploads/games/${filename}  (${(png.length / 1024).toFixed(0)} KB)`);
}
console.log(`\n${COVERS.length} capa(s) em server/uploads/games/`);
