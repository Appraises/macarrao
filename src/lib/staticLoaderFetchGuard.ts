const STATIC_LOADER_PATH = /^\/static-loader-data(?:-manifest-[^/]+|\/.*)\.json$/;
const INSTALL_FLAG = '__DG_STATIC_LOADER_FETCH_GUARD__';

type GuardedWindow = Window & typeof globalThis & {
  [INSTALL_FLAG]?: boolean;
};

const toUrl = (input: RequestInfo | URL, baseUrl: string): URL => {
  if (typeof input === 'string') return new URL(input, baseUrl);
  if (input instanceof URL) return new URL(input.href);
  return new URL(input.url);
};

export const isStaticLoaderRequest = (input: RequestInfo | URL, baseUrl: string): boolean => {
  try {
    return STATIC_LOADER_PATH.test(toUrl(input, baseUrl).pathname);
  } catch {
    return false;
  }
};

// Older builds wrote percent-encoded route names literally to disk. Nginx
// decodes the request path before looking up the file, so a one-time retry with
// encoded percent signs can still reach those legacy artifacts.
export const getLegacyStaticLoaderUrl = (input: RequestInfo | URL, baseUrl: string): string | null => {
  const url = toUrl(input, baseUrl);
  const legacyPath = url.pathname.replace(/%([0-9a-f]{2})/gi, '%25$1');
  if (legacyPath === url.pathname) return null;
  url.pathname = legacyPath;
  return url.href;
};

const isValidJsonResponse = async (response: Response): Promise<boolean> => {
  if (!response.ok) return false;
  try {
    await response.clone().json();
    return true;
  } catch {
    return false;
  }
};

const fallbackResponse = () => new Response('{}', {
  status: 200,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-DG-Static-Loader-Fallback': '1',
  },
});

export const installStaticLoaderFetchGuard = (): void => {
  if (typeof window === 'undefined') return;

  const browserWindow = window as GuardedWindow;
  if (browserWindow[INSTALL_FLAG]) return;

  const nativeFetch = browserWindow.fetch.bind(browserWindow);
  const baseUrl = browserWindow.location.origin;

  browserWindow.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isStaticLoaderRequest(input, baseUrl)) return nativeFetch(input, init);

    try {
      const response = await nativeFetch(input, init);
      if (await isValidJsonResponse(response)) return response;

      const legacyUrl = getLegacyStaticLoaderUrl(input, baseUrl);
      if (legacyUrl) {
        const legacyInput = input instanceof Request ? new Request(legacyUrl, input) : legacyUrl;
        const legacyResponse = await nativeFetch(legacyInput, init);
        if (await isValidJsonResponse(legacyResponse)) return legacyResponse;
      }
    } catch {
      // The live API fallback handles missing static data below.
    }

    // Returning an empty loader payload lets route components consult the live
    // API. It also prevents React Router's default error screen when an old tab
    // references a manifest removed by a newer deployment.
    return fallbackResponse();
  };

  browserWindow[INSTALL_FLAG] = true;
};
