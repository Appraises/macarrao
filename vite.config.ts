import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'node:fs/promises';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { escapeXml, ogFrame, renderPng, termCardSvg, wrapLines } from './scripts/og-template.mjs';
import { normalizeStaticOutputPaths } from './scripts/static-output';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Static, content-rich pages always included in the prerender + sitemap.
const STATIC_ROUTES = ['/', '/dicionario', '/jogos', '/news', '/esports', '/termos', '/privacidade'];
const LEGACY_STATIC_ROUTES = ['/games'];

type TermLite = { word: string; definition?: string; tags?: unknown };
type NewsLite = {
  slug: string;
  headline?: string | null;
  image?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

// Cached between includedRoutes() and onFinished() within a single build.
let terms: TermLite[] = [];
let news: NewsLite[] = [];

// Fetch approved terms (full objects) from the public API.
async function fetchTerms(apiUrl: string): Promise<TermLite[]> {
  try {
    const collected: unknown[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = `${apiUrl}/terms?page=${page}&pageSize=100&sort=word&order=asc`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      collected.push(...(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []));
      totalPages = Number(data?.pagination?.totalPages) || 1;
      page++;
    } while (page <= totalPages);

    return collected.filter(
      (t: any): t is TermLite => typeof t?.word === 'string' && t.word.trim().length > 0,
    );
  } catch (e) {
    console.warn(
      `[ssg] Could not fetch terms from ${apiUrl} — prerendering static pages only. ` +
      `Start the backend before building to prerender term pages. (${(e as Error).message})`,
    );
    return [];
  }
}

const termPath = (word: string) => `/term/${encodeURIComponent(word)}`;
const uniquePaths = (list: TermLite[]) => Array.from(new Set(list.map((t) => termPath(t.word))));
const newsPath = (slug: string) => `/news/${encodeURIComponent(slug)}/`;
const uniqueNewsPaths = (list: NewsLite[]) => Array.from(new Set(list.map((item) => newsPath(item.slug))));

async function fetchPublishedNews(apiUrl: string): Promise<NewsLite[]> {
  try {
    const collected: NewsLite[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = `${apiUrl}/news?page=${page}&pageSize=100&sort=createdAt&order=desc`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      collected.push(...items.filter((item: any): item is NewsLite => typeof item?.slug === 'string' && item.slug.trim().length > 0));
      totalPages = Number(data?.pagination?.totalPages) || 1;
      page++;
    } while (page <= totalPages);

    return collected;
  } catch (e) {
    console.warn(`[ssg] Could not fetch published news from ${apiUrl} — news routes will not be prerendered. ${(e as Error).message}`);
    return [];
  }
}

// Run async `fn` over `items` with at most `limit` in flight.
async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item);
      }
    }),
  );
}

// Generate one OG image per term into dist/og/term/<encoded-word>.png
async function generateTermImages(dir: string, list: TermLite[]) {
  if (list.length === 0) return;
  const ogDir = path.join(dir, 'og', 'term');
  await mkdir(ogDir, { recursive: true });
  let ok = 0;
  await mapPool(list, 8, async (t) => {
    try {
      const tags = Array.isArray(t.tags) ? (t.tags as string[]) : [];
      const svg = termCardSvg({ word: t.word, definition: t.definition || '', tag: tags[0] || '' });
      const png = renderPng(svg);
      await writeFile(path.join(ogDir, `${encodeURIComponent(t.word)}.png`), png);
      ok++;
    } catch (e) {
      console.warn(`[ssg] Skipped OG image for "${t.word}": ${(e as Error).message}`);
    }
  });
  console.log(`[ssg] Generated ${ok} term OG images.`);
}

// Mirror remote news covers into first-party, social-card-sized images. Social
// crawlers are more reliable when the page and image share the same host.
async function generateNewsImages(dir: string, list: NewsLite[]) {
  const withCover = list.filter((item) => typeof item.image === 'string' && /^https?:\/\//i.test(item.image));
  if (withCover.length === 0) return;

  const ogDir = path.join(dir, 'og', 'news');
  await mkdir(ogDir, { recursive: true });
  let ok = 0;
  let fallbacks = 0;

  await mapPool(withCover, 4, async (item) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch(item.image!, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DicionarioGamer-SSG/1.0' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const mimeType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error(`formato nao suportado: ${mimeType || 'desconhecido'}`);
      }

      const source = Buffer.from(await response.arrayBuffer());
      if (source.length === 0 || source.length > 8 * 1024 * 1024) {
        throw new Error(`tamanho invalido: ${source.length} bytes`);
      }

      const dataUrl = `data:${mimeType};base64,${source.toString('base64')}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <rect width="1200" height="630" fill="#020617"/>
        <image href="${dataUrl}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
      </svg>`;
      await writeFile(path.join(ogDir, `${encodeURIComponent(item.slug)}.png`), renderPng(svg));
      ok++;
    } catch (error) {
      const lines = wrapLines(item.headline || 'Notícia do Dicionário Gamer', 34, 4)
        .map((line, index) => `<tspan x="90" dy="${index === 0 ? 0 : 72}">${escapeXml(line)}</tspan>`)
        .join('');
      const fallbackSvg = ogFrame(`
        <rect x="88" y="88" width="8" height="454" rx="4" fill="#0ea5e9"/>
        <text x="90" y="150" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#38bdf8">NOTÍCIAS</text>
        <text x="90" y="250" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="bold" fill="#ffffff">${lines}</text>
        <text x="90" y="570" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#64748b">DICIONÁRIO GAMER</text>
      `);
      await writeFile(path.join(ogDir, `${encodeURIComponent(item.slug)}.png`), renderPng(fallbackSvg));
      fallbacks++;
      console.warn(`[ssg] Used editorial fallback for "${item.slug}": ${(error as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  });

  console.log(`[ssg] Generated ${ok} news cover images${fallbacks ? ` and ${fallbacks} editorial fallbacks` : ''}.`);
}

export default defineConfig(({ mode }) => {
  // Application modules receive VITE_* automatically, while the config must
  // load env files itself. SSG needs the production API to discover term URLs.
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = process.env.VITE_API_URL || env.VITE_API_URL || 'http://localhost:3001';
  const configuredSiteUrl = process.env.VITE_SITE_URL || env.VITE_SITE_URL;
  const siteUrl = (configuredSiteUrl || 'https://dicionariogamer.com.br').replace(/\/$/, '');
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG || env.SENTRY_ORG;
  const sentryProject = process.env.SENTRY_PROJECT || env.SENTRY_PROJECT;
  const sentryUploadEnabled = Boolean(sentryAuthToken && sentryOrg && sentryProject);
  const config: SsgConfig = {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(sentryUploadEnabled ? [sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrg,
        project: sentryProject,
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      })] : []),
    ],
    build: { sourcemap: sentryUploadEnabled ? 'hidden' : false },
    ssr: {
      // The tracker package is ESM-only and exposes `module` without a legacy `main`.
      // Bundling it avoids Node's legacy package resolver during SSG prerendering.
      noExternal: ['@plausible-analytics/tracker', '@sentry/react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    ssgOptions: {
      // Prerender the static pages plus every approved dictionary term.
      // Private contribution routes still work as a normal SPA via the
      // host's index.html fallback.
      includedRoutes: async () => {
        [terms, news] = await Promise.all([fetchTerms(apiUrl), fetchPublishedNews(apiUrl)]);
        return [...STATIC_ROUTES, ...LEGACY_STATIC_ROUTES, ...uniquePaths(terms), ...uniqueNewsPaths(news)];
      },
      // Static hosts can serve the canonical `/jogos` route and legacy redirect.
      dirStyle: 'nested',
      // After rendering: emit the sitemap and per-term OG images.
      onFinished: async (dir) => {
        if (terms.length === 0) terms = await fetchTerms(apiUrl);
        if (news.length === 0) news = await fetchPublishedNews(apiUrl);

        // Sitemap (static pages, all prerendered terms, and published news).
        const urls = [...STATIC_ROUTES, ...uniquePaths(terms), ...uniqueNewsPaths(news)];
        const newsByPath = new Map(news.map((item) => [newsPath(item.slug), item]));
        const body = urls.map((u) => {
          const item = newsByPath.get(u);
          const lastmod = item?.updatedAt || item?.publishedAt;
          return `  <url><loc>${siteUrl}${u}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`;
        }).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
        await writeFile(path.join(dir, 'sitemap.xml'), xml, 'utf-8');
        console.log(`[ssg] Wrote sitemap.xml with ${urls.length} URLs.`);

        // robots.txt is emitted here too, so its Sitemap URL can never drift from the
        // one above — a hand-edited robots.txt is how a placeholder domain ends up
        // published to crawlers.
        const robots = [
          'User-agent: *',
          'Allow: /',
          '',
          '# Rotas privadas / sem valor de SEO',
          ...['/dashboard', '/login', '/forgot-password', '/reset-password', '/verify-email', '/settings', '/perfil', '/contribuir']
            .map((route) => `Disallow: ${route}`),
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n');
        await writeFile(path.join(dir, 'robots.txt'), robots, 'utf-8');
        if (!configuredSiteUrl) {
          console.warn('[ssg] AVISO: VITE_SITE_URL nao definida — sitemap e robots.txt saem com o dominio de exemplo.');
        }

        // First-party Open Graph images for terms and news covers.
        await Promise.all([
          generateTermImages(dir, terms),
          generateNewsImages(dir, news),
        ]);

        // SSG route names are URL-encoded in the manifest. Static servers such
        // as Nginx decode the URL before resolving the file, so physical names
        // must be decoded as well (for example Hot%20drop -> Hot drop).
        const normalizedPaths = await normalizeStaticOutputPaths(dir);
        if (normalizedPaths > 0) {
          console.log(`[ssg] Normalized ${normalizedPaths} encoded static paths for Nginx.`);
        }
      },
    },
  };
  return config;
});

// vite-react-ssg reads `ssgOptions` from the resolved Vite config.
type SsgConfig = UserConfig & {
  ssgOptions?: {
    includedRoutes?: (paths: string[], routes: unknown[]) => string[] | Promise<string[]>;
    dirStyle?: 'flat' | 'nested';
    onFinished?: (dir: string) => void | Promise<void>;
  };
};
