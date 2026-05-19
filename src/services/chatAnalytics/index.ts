import { functions } from '@lib/firebase/firebaseClient';
import { logger } from '@lib/monitoring/logger';
import { httpsCallable } from 'firebase/functions';

/**
 * Analytics Service Layer
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Uses Firebase Functions ONLY (no Next.js API routes)
 * 
 * Functions:
 * - triggerAggregationManual: Manual aggregation trigger
 * - backfillAggregates: Historical data backfill
 * 
 * Security: manual backfill requires PLATFORM role.
 * Location: functions/src/
 */

/**
 * Manually trigger analytics aggregation for the current tenant
 * 
 * @param daysToBackfill - Number of days to backfill (1-7, default: 1)
 * @returns Promise with aggregation result
 * 
 * Security: Requires owner/admin role
 * Cost: Triggers Cloud Function that reads/writes Firebase
 * 
 * Usage:
 * ```typescript
 * try {
 *   const result = await triggerManualAggregation(1);
 *   logger.info('Aggregation successful', { result });
 * } catch (error) {
 *   logger.error('Aggregation failed', error);
 * }
 * ```
 */
export const triggerManualAggregation = async (daysToBackfill: number = 1): Promise<{
    status: string;
    message: string;
    tenantId?: string;
    daysProcessed?: number;
    daysSkipped?: number;
    errors?: string[];
    lastAttemptedRun?: string;
}> => {
    logger.info('Triggering analytics aggregation', { daysToBackfill });
    const triggerFunction = httpsCallable(functions, 'triggerAggregationManual');
    const response = await triggerFunction({ daysToBackfill });
    return response.data as any;
};

/**
 * Backfill historical analytics data
 * 
 * @param tenantId - Tenant ID (prefer number, matches Firestore storage type)
 * @param storeId - Store ID (prefer number, matches Firestore storage type)
 * @param days - Number of days to backfill (default: 30)
 * @returns Promise with backfill results
 * 
 * Security: Requires PLATFORM role
 * 
 * Usage:
 * ```typescript
 * const result = await backfillAggregates(123, 456, 30);  // Prefer numbers (matches Firestore)
 * logger.info('Backfill complete', { results: result.results });
 * ```
 */
export const backfillAggregates = async (
    tenantId: string | number,  // Accept both, but prefer number
    storeId: string | number,   // Accept both, but prefer number
    days: number = 30
): Promise<{
    tenantId: string | number;
    storeId: string | number;
    days: number;
    results: Array<{
        date: string;
        chats?: number;
        status: 'success' | 'skipped' | 'error';
        error?: string;
    }>;
}> => {
    logger.info('Triggering analytics backfill', { tenantId, storeId, days });
    const backfillFunction = httpsCallable(functions, 'backfillAggregates');
    const response = await backfillFunction({ tenantId, storeId, days });
    return response.data as any;
};
