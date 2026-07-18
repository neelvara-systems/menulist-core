import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FUNCTION_MAX_INSTANCES } from './config/secrets';

const LEGACY_CHAT_ANALYTICS_MIGRATED = 'Answerlattice chat analytics has moved to its dedicated runtime.';

export const triggerAggregationManual = onCall({
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: FUNCTION_MAX_INSTANCES.callableLight,
}, async () => {
    throw new HttpsError('failed-precondition', LEGACY_CHAT_ANALYTICS_MIGRATED);
});
