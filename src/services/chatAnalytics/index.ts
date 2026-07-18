import { answerlatticeFunctions } from '@lib/firebase/answerlatticeFirebaseClient';
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
 * const result = await triggerManualAggregation(1);
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
    void daysToBackfill;
    throw new Error('Answerlattice chat analytics uses the dedicated backfill runtime.');
};

type ChatAnalyticsBackfillResult = {
    date: string;
    chats: number;
    status: 'success' | 'skipped';
    partial: boolean;
};

type ChatAnalyticsBackfillResponse = {
    tenantId: number;
    storeId: number;
    days: number;
    results: ChatAnalyticsBackfillResult[];
};

function parseBackfillResponse(value: unknown): ChatAnalyticsBackfillResponse {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('chat_analytics_backfill_response_invalid');
    const response = value as Record<string, unknown>;
    if (
        typeof response.tId !== 'number'
        || !Number.isSafeInteger(response.tId)
        || response.tId <= 0
        || typeof response.sId !== 'number'
        || !Number.isSafeInteger(response.sId)
        || response.sId <= 0
        || typeof response.days !== 'number'
        || !Number.isSafeInteger(response.days)
        || response.days < 1
        || response.days > 90
        || !Array.isArray(response.results)
        || response.results.length !== response.days
    ) throw new Error('chat_analytics_backfill_response_invalid');
    const results = response.results.map((entry): ChatAnalyticsBackfillResult => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('chat_analytics_backfill_response_invalid');
        const result = entry as Record<string, unknown>;
        if (
            typeof result.date !== 'string'
            || !/^\d{4}-\d{2}-\d{2}$/.test(result.date)
            || typeof result.chats !== 'number'
            || !Number.isSafeInteger(result.chats)
            || result.chats < 0
            || (result.status !== 'success' && result.status !== 'skipped')
            || typeof result.partial !== 'boolean'
        ) throw new Error('chat_analytics_backfill_response_invalid');
        return {
            date: result.date,
            chats: result.chats,
            status: result.status,
            partial: result.partial,
        };
    });
    return {
        tenantId: response.tId,
        storeId: response.sId,
        days: response.days,
        results,
    };
}

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
 * ```
 */
export const backfillAggregates = async (
    tenantId: string | number,  // Accept both, but prefer number
    storeId: string | number,   // Accept both, but prefer number
    days: number = 30
): Promise<{
    tenantId: number;
    storeId: number;
    days: number;
    results: Array<{
        date: string;
        chats: number;
        status: 'success' | 'skipped';
        partial: boolean;
    }>;
}> => {
    const tId = Number(tenantId);
    const sId = Number(storeId);
    if (!answerlatticeFunctions || !Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0 || !Number.isSafeInteger(days) || days < 1 || days > 90) {
        throw new Error('chat_analytics_backfill_request_invalid');
    }
    const backfillFunction = httpsCallable(answerlatticeFunctions, 'backfillChatAnalytics');
    const response = await backfillFunction({ tId, sId, days });
    return parseBackfillResponse(response.data);
};
