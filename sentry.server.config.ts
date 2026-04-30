import * as Sentry from '@sentry/nextjs';
import { monitoringDsn, monitoringEnvironment, monitoringRelease, shouldSendMonitoringEvent } from './src/lib/monitoring/sentryShared';

if (monitoringDsn.server) {
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

