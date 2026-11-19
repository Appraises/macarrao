import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { SocialError } from './providers.mjs';

const require = createRequire(import.meta.url);
const fontOptions = { font: {
    defaultFontFamily: 'Space Grotesk', loadSystemFonts: false,
    fontFiles: [
        require.resolve('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
        require.resolve('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
        require.resolve('@expo-google-fonts/space-grotesk/300Light/SpaceGrotesk_300Light.ttf'),
        require.resolve('@expo-google-fonts/barlow-condensed/900Black/BarlowCondensed_900Black.ttf'),
    ],
} };
const W = 1080;
const H = 1350;
const titleWidth = 936;
const accent = '#38bdf8';
const condensed = { family: 'Barlow Condensed', weight: 900, anchor: 'middle' };
const logoWidth = 192;
const logoInset = 58;
const logoTop = 51;
const brandLogoPath = fileURLToPath(new URL('../../../public/brand/dg-control-3d-snes-dpad-bold.png', import.meta.url));
let brandLogo;
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const clean = (value) => String(value ?? '').replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim();
const text = (x, y, size, fill, value, { family = 'Space Grotesk', weight = 700, anchor = 'start' } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="${family}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;

function fits(value, fontSize, type) {
    const line = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="240">${text(0, 170, fontSize, '#fff', value, { ...type, anchor: 'start' })}</svg>`, fontOptions);
    const box = line.getBBox();
    return box && box.x + box.width <= titleWidth;
}

function wrapText(value, fontSize, type, limit) {
    const lines = [];
    let line = '';
    for (const word of value.split(' ').filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (fits(next, fontSize, type)) { line = next; continue; }
        if (!line || lines.length >= limit - 1 || !fits(word, fontSize, type)) return null;
        lines.push(line);
        line = word;
    }
    if (line) lines.push(line);
    return lines;
}

export function instagramHeadline({ headline, seoTitle }) {
    const title = clean(headline);
    const shortTitle = clean(seoTitle);
    return shortTitle && shortTitle.length <= 80 && shortTitle.length < title.length ? shortTitle : title;
}

export function layoutHeadline(headline, channel) {
    const instagram = channel === 'INSTAGRAM';
    const type = instagram ? condensed : undefined;
    const value = instagram ? clean(headline).toLocaleUpperCase('pt-BR') : clean(headline);
    const limit = instagram ? (value.length <= 68 ? 3 : 4) : 5;
    const sizes = instagram ? [122, 112, 104, 96, 88, 80, 72, 64, 56, 48] : [82, 76, 70, 64, 58, 52, 46];
    if (!value) throw new Error('EMPTY_HEADLINE');
    for (const fontSize of sizes) {
        const lines = wrapText(value, fontSize, type, limit);
        if (lines) return { lines, fontSize, leading: Math.round(fontSize * (instagram ? .95 : 1.02)) };
    }
    // Keep the original headline in the caption even when the card needs a shorter line.
    const points = Array.from(value);
    let last = Math.min(points.length, 38);
    while (last > 0 && !fits(`${points.slice(0, last).join('')}…`, 46, type)) last--;
    return { lines: [`${points.slice(0, last).join('').trimEnd()}…`], fontSize: 46, leading: 50 };
}

async function prepareCover(cover) {
    if (!Buffer.isBuffer(cover)) throw new SocialError('ARTICLE_COVER_MISSING', { retry: true });
    const head = cover.subarray(0, 16);
    const raster = head.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
        head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        /^GIF8[79]a/.test(head.toString('ascii')) ||
        (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') ||
        /^ftyp(?:avif|avis)$/.test(head.toString('ascii', 4, 12));
    if (!raster) throw new SocialError('ARTICLE_COVER_FORMAT_UNSUPPORTED', { retry: true });
    try {
        return await sharp(cover, { limitInputPixels: 32_000_000, autoOrient: true })
            .resize(W, H, { fit: 'cover' })
            .flatten({ background: '#080f19' })
            .toBuffer();
    } catch { throw new SocialError('ARTICLE_COVER_DECODE_FAILED', { retry: true }); }
}

export async function renderNewsCard(news, cover, channel) {
    return renderCoverCard(news, await prepareCover(cover), channel);
}

function renderCoverCard(news, photo, channel) {
    const instagram = channel === 'INSTAGRAM';
    const section = clean(news.category).toUpperCase().slice(0, 30) || 'NOTÍCIAS';
    const { lines, fontSize, leading } = layoutHeadline(instagram ? instagramHeadline(news) : news.headline, channel);
    const start = 1171 - ((lines.length - 1) * leading);
    const rows = lines.map((line, index) => text(instagram ? W / 2 : 72, start + index * leading, fontSize, '#f7fafc', line, instagram ? condensed : undefined)).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="shade" x2="0%" y2="100%">
          <stop offset="0" stop-color="#080f19" stop-opacity=".82"/>
          ${instagram ? `<stop offset=".12" stop-color="#080f19" stop-opacity=".79"/>
            <stop offset=".22" stop-color="#080f19" stop-opacity=".12"/>`
        : '<stop offset=".16" stop-color="#080f19" stop-opacity=".12"/>'}
          <stop offset=".37" stop-color="#080f19" stop-opacity="0"/>
          <stop offset=".56" stop-color="#080f19" stop-opacity=".58"/>
          <stop offset=".75" stop-color="#080f19" stop-opacity=".86"/>
          <stop offset="1" stop-color="#080f19" stop-opacity=".95"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#shade)"/>
      <path d="M0 0H1080V10H0Z" fill="${accent}"/>
      ${instagram ? ''
        : `<rect x="52" y="82" width="378" height="57" rx="6" fill="#080f19"/>
          ${text(72, 120, 34, '#f7fafc', 'DICIONÁRIO GAMER')}
          <rect x="838" y="82" width="182" height="57" rx="6" fill="#080f19"/>
          ${text(863, 120, 25, accent, 'NOTÍCIAS')}`}
      ${instagram ? text(W / 2, start - Math.round(fontSize * .82) - 23, 26, accent, section, { anchor: 'middle' })
        : `<path d="M72 ${start - fontSize - 40}h28v4H72Z" fill="${accent}"/>
          ${text(115, start - fontSize - 30, 26, accent, section)}`}
      ${rows}
      ${instagram ? `<path d="M72 1257H490M590 1257h418" fill="none" stroke="${accent}" opacity=".5" stroke-width="2"/>
        <path d="M517 1241l16 16-16 16m22-32 16 16-16 16" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M72 1218H1008" stroke="#3c5365" stroke-width="2"/>
        ${text(72, 1280, 28, '#d0dce5', 'DICIONARIOGAMER.COM.BR')}
        <path d="M933 1241h75v59h-75z" fill="${accent}"/>
        <path d="M951 1270h37m-14-14 14 14-14 14" fill="none" stroke="#080f19" stroke-width="4"/>`}
    </svg>`;
    return renderPhotoSvg(photo, svg, instagram ? logoInset : null);
}

export async function renderInstagramCarousel(news, cover, summary) {
    const photo = await prepareCover(cover);
    const excerpt = clean(summary) || instagramHeadline(news);
    const regular = { weight: 400 };
    let fontSize = 62;
    let lines = wrapText(excerpt, fontSize, regular, 7);
    if (!lines) {
        fontSize = 53;
        lines = wrapText(excerpt, fontSize, regular, 7);
    }
    if (!lines) ({ lines, fontSize } = layoutHeadline(instagramHeadline(news)));
    const leading = Math.round(fontSize * 1.2);
    const start = 675 - Math.round((lines.length - 1) * leading / 2);
    const rows = lines.map((line, index) => text(72, start + index * leading, fontSize, '#f7fafc', line, regular)).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="context" x2="0%" y2="100%">
          <stop offset="0" stop-color="#080f19" stop-opacity=".78"/>
          <stop offset=".23" stop-color="#080f19" stop-opacity=".56"/>
          <stop offset=".42" stop-color="#080f19" stop-opacity=".93"/>
          <stop offset="1" stop-color="#080f19" stop-opacity=".98"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#context)"/>
      <rect width="${W}" height="10" fill="${accent}"/>
      ${text(72, start - fontSize - 25, 27, accent, 'EM RESUMO')}
      ${rows}
      <path d="M72 1040h936" stroke="${accent}" opacity=".55" stroke-width="2"/>
      ${text(72, 1130, 64, '#f7fafc', 'LEIA A MATÉRIA COMPLETA', { ...condensed, anchor: 'start' })}
      ${text(72, 1193, 37, accent, 'LINK NA BIO')}
      ${text(72, 1250, 28, '#d0dce5', 'DICIONARIOGAMER.COM.BR', { weight: 300 })}
      <path d="M947 1125h57m-20-20 20 20-20 20" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    return Promise.all([renderCoverCard(news, photo, 'INSTAGRAM'), renderPhotoSvg(photo, svg, W - logoInset - logoWidth)]);
}

async function renderPhotoSvg(photo, svg, logoLeft) {
    const overlay = new Resvg(svg, fontOptions).render().asPng();
    const layers = [{ input: photo }, { input: overlay }];
    if (logoLeft !== null) {
        brandLogo ??= sharp(brandLogoPath).trim().resize({ width: logoWidth }).png().toBuffer();
        layers.push({ input: await brandLogo, left: logoLeft, top: logoTop });
    }
    return sharp({ create: { width: W, height: H, channels: 3, background: '#080f19' } })
        .composite(layers)
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
}
