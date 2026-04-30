import * as Sentry from '@sentry/nextjs';
import { monitoringDsn, monitoringEnvironment, monitoringRelease, shouldSendMonitoringEvent } from './src/lib/monitoring/sentryShared';

if (monitoringDsn.client) {
    Sentry.init({
        dsn: monitoringDsn.client,
        enabled: true,
        environment: monitoringEnvironment,
        release: monitoringRelease,
        tracesSampleRate: monitoringEnvironment === 'development' ? 1.0 : 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: monitoringEnvironment === 'development' ? 1.0 : 0.2,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
        ],
        beforeSend(event, hint) {
            return shouldSendMonitoringEvent(hint) ? event : null;
        },
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

