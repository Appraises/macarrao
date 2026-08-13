import React from 'react';
import { Head } from 'vite-react-ssg';

/**
 * SEO / document metadata for each page.
 *
 * Uses vite-react-ssg's <Head> so the tags are injected into <head> both during
 * static prerendering (build time) and on the client. Just render <Seo />
 * anywhere inside a page component.
 */

const SITE_NAME = 'Dicionário Gamer';
const DEFAULT_DESCRIPTION =
  'O dicionário gamer feito pela comunidade: gírias, termos, mecânicas e cultura dos games explicados de forma simples. Glossários por jogo, e-sports e notícias.';

// Allow overriding the canonical domain via env (e.g. VITE_SITE_URL=https://dicionariogamer.com).
// Falls back to the current origin at runtime.
export const SITE_URL =
  ((import.meta as any).env?.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://dicionariogamer.com.br');

const DEFAULT_IMAGE = '/og-default.png';

// Turn a path or relative URL into an absolute one (required by social scrapers).
const toAbsolute = (src: string) =>
  /^https?:\/\//.test(src) ? src : `${SITE_URL}${src.startsWith('/') ? src : `/${src}`}`;

interface SeoProps {
  /** Page-specific title. Combined with the site name. Omit on the home page. */
  title?: string;
  /** Meta description. Trimmed to ~160 chars. */
  description?: string;
  /** Absolute URL of a representative image (Open Graph / Twitter card). */
  image?: string;
  /** Canonical path, e.g. "/term/gg". Defaults to the current URL. */
  path?: string;
  /** Open Graph type. */
  type?: 'website' | 'article';
  /** Set true for private pages (dashboard, auth) that must not be indexed. */
  noindex?: boolean;
  /** Combine with noindex for private surfaces whose links must not be followed. */
  nofollow?: boolean;
}

export const Seo: React.FC<SeoProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  path,
  type = 'website',
  noindex = false,
  nofollow = false,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Gírias e termos dos games`;

  const url = path
    ? `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
    : typeof window !== 'undefined'
      ? window.location.href
      : SITE_URL;

  const desc = description.length > 160 ? `${description.slice(0, 157)}…` : description;
  const imageUrl = toAbsolute(image || DEFAULT_IMAGE);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content={`noindex, ${nofollow ? 'nofollow' : 'follow'}`} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
};
