const DISABLED_KEY = 'dg_analytics_disabled';
const PREFERENCE_EVENT = 'dg:analytics-preference-changed';
const RETURNING_VISITOR_KEY = 'dg:analytics-seen';
const CLASSIFIED_SESSION_KEY = 'dg:analytics-session-classified';

let initialized = false;
let lastPageviewPath = '';

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

export const isAnalyticsConfigured = () => Boolean(import.meta.env.VITE_API_URL || 'http://localhost:3001');

export const isAnalyticsEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DISABLED_KEY) !== 'true';
};

export const setAnalyticsEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;

  if (enabled) {
    localStorage.removeItem(DISABLED_KEY);
  } else {
    localStorage.setItem(DISABLED_KEY, 'true');
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

const eventKey = (name: string) => name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const classifyDevice = () => {
  const userAgent = navigator.userAgent || '';
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return 'mobile';
  return 'desktop';
};

const classifyBrowser = () => {
  const userAgent = navigator.userAgent || '';
  if (/edg\//i.test(userAgent)) return 'edge';
  if (/firefox\//i.test(userAgent)) return 'firefox';
  if (/opr\//i.test(userAgent)) return 'opera';
  if (/chrome\//i.test(userAgent)) return 'chrome';
  if (/safari\//i.test(userAgent)) return 'safari';
  return 'other';
};

const classifyOperatingSystem = () => {
  const userAgent = navigator.userAgent || '';
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/windows/i.test(userAgent)) return 'windows';
  if (/macintosh|mac os/i.test(userAgent)) return 'macos';
  if (/linux/i.test(userAgent)) return 'linux';
  return 'other';
};

const attribution = () => {
  const params = new URLSearchParams(window.location.search);
  const campaign = params.get('utm_campaign')?.slice(0, 120) || null;
  const source = params.get('utm_source')?.slice(0, 120) || null;
  const referrer = document.referrer || '';
  let referrerHost = '';
  try { referrerHost = new URL(referrer).hostname; } catch { /* direct visit */ }
  return {
    source: source || referrerHost || 'direct',
    channel: source ? 'campaign' : referrerHost ? 'referral' : 'direct',
    campaign,
  };
};

const sendEvent = (name: string, properties: Record<string, AnalyticsProperty>, pageview = false) => {
  if (typeof window === 'undefined' || !isAnalyticsConfigured() || !isAnalyticsEnabled()) return;

  const props = Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== null && value !== undefined));
  const attributionData = attribution();
  const payload = {
    clientEventId: randomId(),
    eventName: pageview ? 'PAGE_VIEW' : eventKey(name),
    path: sanitizeAnalyticsPath(window.location.pathname),
    referrer: pageview ? document.referrer : undefined,
    source: typeof props.source === 'string' ? props.source : attributionData.source,
    channel: attributionData.channel,
    campaign: attributionData.campaign,
    device: classifyDevice(),
    browser: classifyBrowser(),
    operatingSystem: classifyOperatingSystem(),
    value: typeof props.method === 'string' ? props.method
      : typeof props.context === 'string' ? props.context
        : typeof props.filter === 'string' ? props.filter
          : typeof props.visitor_type === 'string' ? props.visitor_type : undefined,
    position: typeof props.position === 'number' ? props.position : undefined,
    resultCount: typeof props.results_count === 'number' ? props.results_count : undefined,
    occurredAt: new Date().toISOString(),
  };

  void fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/analytics/events`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', 'X-Analytics-Enabled': 'true', 'X-Client-Event': 'analytics' },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
};

const capturePageview = () => {
  const path = sanitizeAnalyticsPath(window.location.pathname);
  if (path === lastPageviewPath) return;
  lastPageviewPath = path;
  sendEvent('PAGE_VIEW', {}, true);
};

export const initAnalytics = () => {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  window.history.pushState = function pushState(...args) {
    originalPushState.apply(this, args);
    window.dispatchEvent(new Event('dg:navigation'));
  };
  window.history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event('dg:navigation'));
  };
  window.addEventListener('popstate', capturePageview);
  window.addEventListener('dg:navigation', capturePageview);

  capturePageview();
  if (isAnalyticsEnabled() && sessionStorage.getItem(CLASSIFIED_SESSION_KEY) !== 'true') {
    const visitorType = localStorage.getItem(RETURNING_VISITOR_KEY) ? 'returning' : 'new';
    sendEvent('Visit Classified', { visitor_type: visitorType });
    localStorage.setItem(RETURNING_VISITOR_KEY, new Date().toISOString().slice(0, 10));
    sessionStorage.setItem(CLASSIFIED_SESSION_KEY, 'true');
  }
};

export const trackAnalyticsEvent = (
  name: AnalyticsEventName,
  properties: Record<string, AnalyticsProperty> = {},
) => sendEvent(name, properties);
