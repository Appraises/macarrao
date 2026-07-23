import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'node:fs/promises';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { termCardSvg, renderPng } from './scripts/og-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build-time config. The backend must be reachable at API_URL during the build
// so term pages can be prerendered with their content (and OG images).
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const SITE_URL = (process.env.VITE_SITE_URL || 'https://SEU-DOMINIO.com').replace(/\/$/, '');

// Static, content-rich pages always included in the prerender + sitemap.
const STATIC_ROUTES = ['/', '/dicionario', '/games', '/news', '/esports', '/termos', '/privacidade'];

type TermLite = { word: string; definition?: string; tags?: unknown };

// Cached between includedRoutes() and onFinished() within a single build.
let terms: TermLite[] = [];

// Fetch approved terms (full objects) from the public API.
async function fetchTerms(): Promise<TermLite[]> {
  try {
    const collected: unknown[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = `${API_URL}/terms?page=${page}&pageSize=100&sort=word&order=asc`;
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
      `[ssg] Could not fetch terms from ${API_URL} — prerendering static pages only. ` +
      `Start the backend before building to prerender term pages. (${(e as Error).message})`,
    );
    return [];
  }
}

const termPath = (word: string) => `/term/${encodeURIComponent(word)}`;
const uniquePaths = (list: TermLite[]) => Array.from(new Set(list.map((t) => termPath(t.word))));

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

export default defineConfig(() => {
  const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
  const config: SsgConfig = {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      ...(sentryUploadEnabled ? [sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
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
        terms = await fetchTerms();
        return [...STATIC_ROUTES, ...uniquePaths(terms)];
      },
      // `/games` -> dist/games/index.html, served reliably by any static host.
      dirStyle: 'nested',
      // After rendering: emit the sitemap and per-term OG images.
      onFinished: async (dir) => {
        if (terms.length === 0) terms = await fetchTerms();

        // Sitemap (static pages + all prerendered terms).
        const urls = [...STATIC_ROUTES, ...uniquePaths(terms)];
        const body = urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
        await writeFile(path.join(dir, 'sitemap.xml'), xml, 'utf-8');
        console.log(`[ssg] Wrote sitemap.xml with ${urls.length} URLs.`);

        // Per-term Open Graph images.
        await generateTermImages(dir, terms);
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
