// Generates public/og-default.png (1200x630) — the default social share image
// used when a page has no specific image. Run: node scripts/generate-og.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultCardSvg, renderPng } from './og-template.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '../public/og-default.png');

const png = renderPng(defaultCardSvg());
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes)`);
