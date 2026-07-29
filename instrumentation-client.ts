import * as Sentry from '@sentry/nextjs';
import { installClientConsoleBuffer } from './src/lib/debug/clientConsoleBuffer';
import {
    isSentryMonitoringEnabled,
    monitoringDsn,
    monitoringEnvironment,
    monitoringRelease,
    sanitizeMonitoringEvent,
    shouldSendMonitoringEvent,
} from './src/lib/monitoring/sentryShared';

installClientConsoleBuffer();

if (isSentryMonitoringEnabled && monitoringDsn.client) {
    Sentry.init({
        dsn: monitoringDsn.client,
        enabled: true,
        environment: monitoringEnvironment,
        release: monitoringRelease,
        tracesSampleRate: monitoringEnvironment === 'development' ? 1.0 : 0.1,
        sendDefaultPii: false,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: monitoringEnvironment === 'development' ? 1.0 : 0.2,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                blockAllMedia: true,
                maskAllInputs: true,
                maskAllText: true,
                networkCaptureBodies: false,
                networkDetailAllowUrls: [],
                // Replay's callback covers SDK custom frames, including
                // navigation/network/performance URLs. Masked DOM frames remain.
                beforeAddRecordingEvent: () => null,
            }),
        ],
        beforeSend(event, hint) {
            return shouldSendMonitoringEvent(hint) ? sanitizeMonitoringEvent(event) : null;
        },
        beforeSendTransaction(event) {
            return sanitizeMonitoringEvent(event);
        },
    });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
