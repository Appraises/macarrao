const PLAUSIBLE_IGNORE_KEY = 'plausible_ignore';
const PREFERENCE_EVENT = 'dg:analytics-preference-changed';
const RETURNING_VISITOR_KEY = 'dg:analytics-seen';
const CLASSIFIED_SESSION_KEY = 'dg:analytics-session-classified';

let initialized = false;
let trackerPromise: Promise<typeof import('@plausible-analytics/tracker')> | null = null;
let initializationPromise: Promise<typeof import('@plausible-analytics/tracker') | null> | null = null;

type AnalyticsProperty = string | number | boolean | null | undefined;

export type AnalyticsEventName =
  | 'Account Created'
  | 'Catalog Filter Applied'
  | 'Catalog Viewed'
  | 'Category Selected'
  | 'Contribution Submitted'
  | 'Meaning Proposed'
  | 'Origin Proposed'
  | 'Image Submitted'
  | 'Login Completed'
  | 'Search Submitted'
  | 'Search No Results'
  | 'Search Result Click'
  | 'Search Suggestion Selected'
  | 'Visit Classified'
  | 'Term Opened'
  | 'Term Shared'
  | 'Term Reported'
  | 'Term Vote'
  | 'Easter Egg Activated'
  | 'Arcade Game Started'
  | 'Arcade Game Over'
  | 'Arcade Score Saved'
  | 'Bot Challenge Shown'
  | 'Bot Challenge Passed'
  | 'Bot Challenge Failed'
  | 'Contribution Rate Limited'
  | '404';

const getDomain = () => import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();

export const isAnalyticsConfigured = () => Boolean(getDomain());

const loadTracker = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  trackerPromise ??= import('@plausible-analytics/tracker');
  return trackerPromise;
};

const ensureAnalyticsInitialized = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);

  const domain = getDomain();
  if (!domain) return Promise.resolve(null);
  if (initialized && trackerPromise) return trackerPromise;

  initializationPromise ??= loadTracker()
    .then((tracker) => {
      if (!tracker) return null;

      tracker.init({
        domain,
        endpoint: import.meta.env.VITE_PLAUSIBLE_ENDPOINT?.trim() || undefined,
        autoCapturePageviews: true,
        hashBasedRouting: false,
        outboundLinks: true,
        fileDownloads: true,
        formSubmissions: false,
        captureOnLocalhost: import.meta.env.VITE_PLAUSIBLE_CAPTURE_LOCALHOST === 'true',
        logging: import.meta.env.DEV,
        bindToWindow: true,
      });

      initialized = true;
      if (isAnalyticsEnabled() && sessionStorage.getItem(CLASSIFIED_SESSION_KEY) !== 'true') {
        const visitorType = localStorage.getItem(RETURNING_VISITOR_KEY) ? 'returning' : 'new';
        tracker.track('Visit Classified', { props: { visitor_type: visitorType } });
        localStorage.setItem(RETURNING_VISITOR_KEY, new Date().toISOString().slice(0, 10));
        sessionStorage.setItem(CLASSIFIED_SESSION_KEY, 'true');
      }

      return tracker;
    })
    .catch((error) => {
      initializationPromise = null;
      if (import.meta.env.DEV) console.error('Falha ao inicializar analytics.', error);
      return null;
    });

  return initializationPromise;
};

export const initAnalytics = () => {
  void ensureAnalyticsInitialized();
};

export const trackAnalyticsEvent = (
  name: AnalyticsEventName,
  properties: Record<string, AnalyticsProperty> = {},
) => {
  if (typeof window === 'undefined' || !getDomain() || !isAnalyticsEnabled()) return;

  const props = Object.fromEntries(
    Object.entries(properties)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  void ensureAnalyticsInitialized().then((tracker) => {
    tracker?.track(name, Object.keys(props).length > 0 ? { props } : undefined);
  });
};

export const isAnalyticsEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(PLAUSIBLE_IGNORE_KEY) !== 'true';
};

export const setAnalyticsEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;

  if (enabled) {
    localStorage.removeItem(PLAUSIBLE_IGNORE_KEY);
  } else {
    localStorage.setItem(PLAUSIBLE_IGNORE_KEY, 'true');
  }

  window.dispatchEvent(new CustomEvent(PREFERENCE_EVENT, { detail: { enabled } }));
};

export const subscribeToAnalyticsPreference = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined;

  window.addEventListener(PREFERENCE_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(PREFERENCE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
};

export const sanitizeAnalyticsPath = (value: string) => {
  const path = value.split('?')[0].split('#')[0];
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\b\d{6,}\b/g, ':number')
    .slice(0, 160);
};
