import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Resvg } from '@resvg/resvg-js';

const { values } = parseArgs({
    options: {
        transparent: { type: 'boolean', default: false },
        logo: { type: 'string' },
        output: { type: 'string' },
    },
});
const logoUrl = values.logo ? pathToFileURL(resolve(values.logo)) : new URL('../public/dg-control-logo.svg', import.meta.url);
const transparent = values.transparent;
const output = values.output ? pathToFileURL(resolve(values.output)) : new URL(transparent ? '../public/brand/dg-control-3d.png' : '../public/brand/dg-avatar-3d.png', import.meta.url);
const logo = new Resvg(await readFile(logoUrl), { fitTo: { mode: 'width', value: 1240 } }).render().asPng();
const size = 1024;
const projection = 'matrix(3.45 -0.39 0.53 3.53 10 266)';
const depth = { x: 39, y: 50, steps: 36 };
const colorAtDepth = (progress) => {
    const light = [32, 118, 183];
    const dark = [12, 39, 70];
    return `rgb(${light.map((channel, i) => Math.round(channel + progress * (dark[i] - channel))).join(',')})`;
};
const sides = Array.from({ length: depth.steps }, (_, i) => {
    const part = (depth.steps - i) / depth.steps;
    return `<g transform="translate(${depth.x * part} ${depth.y * part})">
        <rect width="248" height="136" transform="${projection}" mask="url(#logo)" fill="${colorAtDepth(part)}"/>
    </g>`;
}).join('');

// Project the original outlines at successive depths so the controls and cable retain their shape.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="back" x1="12%" y1="0%" x2="92%" y2="100%">
      <stop offset="0" stop-color="#1c2b39"/>
      <stop offset=".55" stop-color="#0c1623"/>
      <stop offset="1" stop-color="#070d17"/>
    </linearGradient>
    <linearGradient id="face" x1="11%" y1="0%" x2="85%" y2="100%">
      <stop offset="0" stop-color="#a3edff"/>
      <stop offset=".53" stop-color="#55d0fc"/>
      <stop offset="1" stop-color="#2299e0"/>
    </linearGradient>
    <mask id="logo" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="248" height="136">
      <image x="0" y="0" width="248" height="136" href="data:image/png;base64,${logo.toString('base64')}"/>
    </mask>
    <filter id="shadow" x="-12%" y="-38%" width="130%" height="182%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  ${transparent ? '' : `<rect width="${size}" height="${size}" fill="url(#back)"/>
  <g transform="translate(32 73)" opacity=".82">
    <rect width="248" height="136" transform="${projection}" mask="url(#logo)" filter="url(#shadow)" fill="#02060c"/>
  </g>`}
  ${sides}
  <rect width="248" height="136" transform="${projection}" mask="url(#logo)" fill="url(#face)"/>
</svg>`;

await writeFile(output, new Resvg(svg).render().asPng());
