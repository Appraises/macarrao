import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  getLegacyStaticLoaderUrl,
  installStaticLoaderFetchGuard,
  isStaticLoaderRequest,
} from '../../src/lib/staticLoaderFetchGuard';
import {
  decodeStaticFileSegment,
  normalizeStaticOutputPaths,
} from '../../scripts/static-output';

const originalWindow = (globalThis as { window?: unknown }).window;

afterEach(() => {
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = originalWindow;
  vi.restoreAllMocks();
});

describe('static loader regression', () => {
  it('recognizes loader JSON requests and builds the legacy encoded URL', () => {
    const base = 'https://dicionariogamer.com.br';
    const current = '/static-loader-data/term/Hot%20drop.hash.json';

    expect(isStaticLoaderRequest(current, base)).toBe(true);
    expect(getLegacyStaticLoaderUrl(current, base)).toBe(
      'https://dicionariogamer.com.br/static-loader-data/term/Hot%2520drop.hash.json',
    );
    expect(isStaticLoaderRequest('/api/terms/Hot%20drop', base)).toBe(false);
  });

  it('retries legacy encoded artifacts before falling back', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('<!DOCTYPE html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }))
      .mockResolvedValueOnce(new Response('{"route":{"word":"Hot drop"}}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    (globalThis as { window?: unknown }).window = {
      fetch: fetchMock,
      location: { origin: 'https://dicionariogamer.com.br' },
    };

    installStaticLoaderFetchGuard();
    const response = await (globalThis as any).window.fetch(
      '/static-loader-data/term/Hot%20drop.hash.json',
    );

    expect(await response.json()).toEqual({ route: { word: 'Hot drop' } });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://dicionariogamer.com.br/static-loader-data/term/Hot%2520drop.hash.json',
      undefined,
    );
  });

  it('returns empty JSON when an old manifest is gone', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<!DOCTYPE html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }));
    (globalThis as { window?: unknown }).window = {
      fetch: fetchMock,
      location: { origin: 'https://dicionariogamer.com.br' },
    };

    installStaticLoaderFetchGuard();
    const response = await (globalThis as any).window.fetch(
      '/static-loader-data-manifest-oldhash.json',
    );

    expect(await response.json()).toEqual({});
    expect(response.headers.get('X-DG-Static-Loader-Fallback')).toBe('1');
  });

  it('normalizes encoded route, loader and OG file names', async () => {
    const output = await mkdtemp(path.join(tmpdir(), 'dg-static-output-'));
    try {
      await mkdir(path.join(output, 'term', 'Hot%20drop'), { recursive: true });
      await writeFile(path.join(output, 'term', 'Hot%20drop', 'index.html'), 'term');
      await mkdir(path.join(output, 'static-loader-data', 'term'), { recursive: true });
      await writeFile(path.join(output, 'static-loader-data', 'term', 'Hot%20drop.hash.json'), '{}');
      await mkdir(path.join(output, 'og', 'term'), { recursive: true });
      await writeFile(path.join(output, 'og', 'term', 'Hot%20drop.png'), 'png');

      expect(await normalizeStaticOutputPaths(output)).toBe(3);
      await expect(stat(path.join(output, 'term', 'Hot drop', 'index.html'))).resolves.toBeTruthy();
      await expect(stat(path.join(output, 'static-loader-data', 'term', 'Hot drop.hash.json'))).resolves.toBeTruthy();
      await expect(stat(path.join(output, 'og', 'term', 'Hot drop.png'))).resolves.toBeTruthy();
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  it('does not decode unsafe path separators', () => {
    expect(decodeStaticFileSegment('word%2Fother')).toBeNull();
  });
});
