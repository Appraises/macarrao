import React from 'react';
import { SITE_URL } from './Seo';

/**
 * Renders a JSON-LD structured-data block. Google reads it anywhere in the
 * document, so it can live in the page body (present in the prerendered HTML).
 */
export const JsonLd: React.FC<{ data: object }> = ({ data }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
);

const SITE_NAME = 'Dicionário Gamer';
const abs = (p: string) => `${SITE_URL}${p.startsWith('/') ? p : `/${p}`}`;

// ---- Schema builders ----

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

export function definedTermSchema(term: {
  word: string;
  definition: string;
  aliases?: string[];
  meanings?: Array<{ definition: string; game?: { name: string } | null; context?: string | null }>;
}) {
  // schema.org DefinedTerm carries a single description, so multiple senses are
  // numbered into one string the way a dictionary entry reads. Aliases become
  // alternateName, which is exactly what they are.
  const senses = term.meanings || [];
  const description = senses.length > 1
    ? senses
        .map((sense, index) => {
          const scope = sense.game?.name || sense.context;
          return `${index + 1}. ${scope ? `(${scope}) ` : ''}${sense.definition}`;
        })
        .join(' ')
    : senses[0]?.definition || term.definition;

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.word,
    description,
    ...(term.aliases?.length ? { alternateName: term.aliases } : {}),
    url: abs(`/term/${encodeURIComponent(term.word)}`),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: SITE_NAME,
      url: SITE_URL || undefined,
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL || undefined,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/dicionario?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function articleSchema(news: {
  id: string;
  headline: string;
  image?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: news.headline,
    image: news.image ? [news.image] : undefined,
    datePublished: news.createdAt,
    dateModified: news.updatedAt || news.createdAt,
    author: news.author
      ? { '@type': 'Person', name: news.author }
      : { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: abs('/og-default.png') },
    },
    mainEntityOfPage: abs(`/news/${news.id}`),
  };
}
