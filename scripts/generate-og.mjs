// Generates public/og-default.png (1200x630) — the default social share image
// used when a page has no specific image. Run: node scripts/generate-og.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ogFrame, renderPng } from './og-template.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../public/og-default.png');

const inner = `
  <rect x="100" y="250" width="90" height="10" rx="5" fill="#0ea5e9"/>
  <text x="100" y="345" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="bold" fill="#ffffff">Dicion&#225;rio <tspan fill="#0ea5e9">Gamer</tspan></text>
  <text x="102" y="410" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#94a3b8">G&#237;rias, termos e mec&#226;nicas dos games &#8212; explicados.</text>
  <text x="102" y="540" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#475569" letter-spacing="4">FPS &#183; MOBA &#183; RPG &#183; E-SPORTS</text>`;

const png = renderPng(ogFrame(inner));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
