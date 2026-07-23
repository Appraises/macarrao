import * as Sentry from '@sentry/node';
import { SENTRY_DSN } from './utils/config';

export const sentryEnabled = Boolean(SENTRY_DSN);

if (sentryEnabled) {
    Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        sendDefaultPii: false,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        beforeSend(event) {
            if (event.request) {
                event.request.data = undefined;
                event.request.cookies = undefined;
                event.request.query_string = undefined;
                event.request.headers = undefined;
            }
            event.user = undefined;
            return event;
        },
    });
}

