import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FUNCTION_MAX_INSTANCES } from './config/secrets';

const LEGACY_CHAT_ANALYTICS_MIGRATED = 'Answerlattice chat analytics has moved to its dedicated runtime.';

export type RetiredChatAggregationResult = Readonly<{
    totalTenants: 0;
    totalStores: 0;
    successCount: 0;
    failedCount: 0;
    skippedCount: 0;
    errors: readonly [];
}>;

export async function aggregateDailyChatStatsLogic(): Promise<RetiredChatAggregationResult> {
    return {
        totalTenants: 0,
        totalStores: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
    };
}

export const backfillAggregates = onCall({
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: FUNCTION_MAX_INSTANCES.callableLight,
}, async () => {
    throw new HttpsError('failed-precondition', LEGACY_CHAT_ANALYTICS_MIGRATED);
});
