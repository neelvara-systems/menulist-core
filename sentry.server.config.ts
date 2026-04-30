import * as Sentry from '@sentry/nextjs';
import {
    isSentryMonitoringEnabled,
    monitoringDsn,
    monitoringEnvironment,
    monitoringRelease,
    shouldSendMonitoringEvent,
} from './src/lib/monitoring/sentryShared';

if (isSentryMonitoringEnabled && monitoringDsn.server) {
    Sentry.init({
        dsn: monitoringDsn.server,
        enabled: true,
        environment: monitoringEnvironment,
        release: monitoringRelease,
        tracesSampleRate: monitoringEnvironment === 'development' ? 1.0 : 0.1,
        sendDefaultPii: false,
        beforeSend(event, hint) {
            return shouldSendMonitoringEvent(hint) ? event : null;
        },
    });
}
