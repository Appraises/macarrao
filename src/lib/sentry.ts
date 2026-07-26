import * as Sentry from '@sentry/react';

export const initSentry = () => {
  if (typeof window === 'undefined' || !import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    beforeSend(event) {
      event.user = undefined;
      if (event.request) {
        event.request.data = undefined;
        event.request.cookies = undefined;
        event.request.headers = undefined;
        event.request.query_string = undefined;
        if (event.request.url) event.request.url = event.request.url.split('?')[0].split('#')[0];
      }
      return event;
    },
  });
};

