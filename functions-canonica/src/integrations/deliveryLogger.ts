/**
 * Canonica — Integration Delivery Logger
 * 
 * Logs every delivery attempt to canonica_integrationDeliveryLogs.
 * Append-only. One doc per delivery attempt per adapter.
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.2
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    AdapterType,
    DeliveryLogEntry,
    DeliveryResult,
    IntegrationEventType,
    INTEGRATION_LIMITS,
} from './types';
import { sanitizeDeliveryError } from './safety';

function buildExpiry(days: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getHealthDocId(tId: number, sId: number): string {
    return `integrationHealth_${tId}_${sId}`;
}

/**
 * Log a delivery attempt (success or failure).
 * Fire-and-forget — errors logged, never thrown.
 */
export async function logDeliveryAttempt(params: {
    eventId: string;
    tId: number;
    sId: number;
    adapter: AdapterType;
    attempt: number;
    result: DeliveryResult;
    status?: DeliveryLogEntry['status'];
}): Promise<void> {
    try {
        const entry: DeliveryLogEntry = {
            eventId: params.eventId,
            pId: 'CN',
            tId: params.tId,
            sId: params.sId,
            adapter: params.adapter,
            attempt: params.attempt,
            status: params.status || (params.result.success ? 'success' : 'failed'),
            statusCode: params.result.statusCode ?? null,
            error: params.result.error ? sanitizeDeliveryError(params.result.error) : null,
            durationMs: params.result.durationMs,
            createdAt: Timestamp.now(),
            expiresAt: buildExpiry(INTEGRATION_LIMITS.DELIVERY_LOG_TTL_DAYS),
        };

        await db.collection(DB_COLLECTIONS.CANONICA_INTEGRATION_DELIVERY_LOGS).add(entry);
    } catch (error) {
        logger.warn('[Canonica Integration] Failed to log delivery attempt', {
            error: error instanceof Error ? error.message : String(error),
            eventId: params.eventId,
            adapter: params.adapter,
        });
    }
}

/**
 * Update integration event status (pending → delivered/failed).
 */
export async function updateEventStatus(
    eventId: string,
    status: 'processing' | 'delivered' | 'failed',
): Promise<void> {
    try {
        await db.collection(DB_COLLECTIONS.CANONICA_INTEGRATION_EVENTS).doc(eventId).update({ status });
    } catch (error) {
        logger.warn('[Canonica Integration] Failed to update event status', {
            error: error instanceof Error ? error.message : String(error),
            eventId,
            status,
        });
    }
}

/**
 * Update compact owner-facing delivery health.
 * This avoids reading raw delivery logs in dashboard flows.
 */
export async function updateIntegrationHealth(params: {
    eventId: string;
    eventType: IntegrationEventType;
    tId: number;
    sId: number;
    adapter: AdapterType;
    status: 'success' | 'failed' | 'rate_limited';
    result: DeliveryResult;
}): Promise<void> {
    try {
        const now = Timestamp.now();
        const update: Record<string, any> = {
            pId: 'CN',
            tId: params.tId,
            sId: params.sId,
            [`adapters.${params.adapter}.lastStatus`]: params.status,
            [`adapters.${params.adapter}.lastAttemptAt`]: now,
            [`adapters.${params.adapter}.lastEventId`]: params.eventId,
            [`adapters.${params.adapter}.lastEventType`]: params.eventType,
            [`adapters.${params.adapter}.lastError`]: params.result.error ? sanitizeDeliveryError(params.result.error) : null,
            [`adapters.${params.adapter}.statusCode`]: params.result.statusCode ?? null,
            [`adapters.${params.adapter}.durationMs`]: params.result.durationMs,
            modifiedOn: now,
        };

        if (params.status === 'success') {
            update[`adapters.${params.adapter}.lastSuccessAt`] = now;
        } else {
            update[`adapters.${params.adapter}.lastFailureAt`] = now;
        }

        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getHealthDocId(params.tId, params.sId))
            .set(update, { merge: true });
    } catch (error) {
        logger.warn('[Canonica Integration] Failed to update integration health', {
            tId: params.tId,
            sId: params.sId,
            adapter: params.adapter,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Cleanup expired events and delivery logs.
 * Firestore TTL owns retention through expiresAt fields, so the scheduler does
 * not run empty tenant-scoped cleanup queries.
 */
export async function cleanupExpiredIntegrationData(_tId: number, _sId: number): Promise<{ eventsDeleted: number; logsDeleted: number }> {
    return { eventsDeleted: 0, logsDeleted: 0 };
}
