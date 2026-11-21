// Gera a logo 3D dos posts em uma cor por editoria (public/brand/editorias).
//   node scripts/generate-editorial-logos.mjs
//
// Parte do SVG oficial de traço grosso e repete a projeção e a profundidade de
// scripts/generate-brand-avatar.mjs, então o desenho e o relevo são idênticos à
// logo azul; muda só a cor. A editoria de marca (Indústria) mantém o degradê
// original. As cores vêm de server/scripts/social/palette.mjs.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import { editorialLogoFile, editorias } from '../server/scripts/social/palette.mjs';

const source = await readFile(new URL('../public/brand/dg-control-snes-dpad-bold.svg', import.meta.url), 'utf8');
const outputDir = new URL('../public/brand/editorias/', import.meta.url);
const mask = new Resvg(source, { fitTo: { mode: 'width', value: 1240 } }).render().asPng();

const hex = (value) => value.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
const mix = (a, b, t) => a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
const rgb = (color) => `rgb(${color.join(',')})`;

// Laterais escurecem com a profundidade; a face vai do claro à sombra da cor.
const shading = ({ accent, brand }) => {
    if (brand) return { side: (p) => rgb(mix([32, 118, 183], [12, 39, 70], p)), face: ['#a3edff', '#55d0fc', '#2299e0'] };
    const base = hex(accent);
    return {
        side: (p) => rgb(mix(mix(base, [0, 0, 0], .35), mix(base, [4, 8, 16], .8), p)),
        face: [rgb(mix(base, [255, 255, 255], .55)), rgb(base), rgb(mix(base, [0, 0, 0], .25))],
    };
};

const render = (theme) => {
    const { side, face } = shading(theme);
    const projection = 'matrix(3.45 -0.39 0.53 3.53 10 266)';
    const depth = { x: 39, y: 50, steps: 36 };
    const sides = Array.from({ length: depth.steps }, (_, i) => {
        const p = (depth.steps - i) / depth.steps;
        return `<g transform="translate(${depth.x * p} ${depth.y * p})">
          <rect width="248" height="136" transform="${projection}" mask="url(#logo)" fill="${side(p)}"/></g>`;
    }).join('');
    return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <mask id="logo" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="248" height="136">
          <image x="0" y="0" width="248" height="136" href="data:image/png;base64,${mask.toString('base64')}"/>
        </mask>
        <linearGradient id="face" x1="11%" y1="0%" x2="85%" y2="100%">
          <stop offset="0" stop-color="${face[0]}"/><stop offset=".53" stop-color="${face[1]}"/><stop offset="1" stop-color="${face[2]}"/>
        </linearGradient>
      </defs>
      ${sides}
      <rect width="248" height="136" transform="${projection}" mask="url(#logo)" fill="url(#face)"/>
    </svg>`).render().asPng();
};

await mkdir(outputDir, { recursive: true });
for (const theme of Object.values(editorias)) {
    await writeFile(new URL(editorialLogoFile(theme), outputDir), render(theme));
    console.log(`public/brand/editorias/${editorialLogoFile(theme)}`);
}
