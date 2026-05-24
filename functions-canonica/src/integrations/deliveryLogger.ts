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
import { AdapterType, DeliveryLogEntry, DeliveryResult } from './types';
import { sanitizeDeliveryError } from './safety';

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
}): Promise<void> {
    try {
        const entry: DeliveryLogEntry = {
            eventId: params.eventId,
            tId: params.tId,
            sId: params.sId,
            adapter: params.adapter,
            attempt: params.attempt,
            status: params.result.success ? 'success' : 'failed',
            statusCode: params.result.statusCode ?? null,
            error: params.result.error ? sanitizeDeliveryError(params.result.error) : null,
            durationMs: params.result.durationMs,
            createdAt: Timestamp.now(),
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
 * Cleanup expired events and delivery logs (90-day TTL).
 * Called from nightly batch.
 */
export async function cleanupExpiredIntegrationData(tId: number, sId: number): Promise<{ eventsDeleted: number; logsDeleted: number }> {
    const result = { eventsDeleted: 0, logsDeleted: 0 };
    const cutoff = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
        // Delete expired events
        const eventsSnap = await db.collection(DB_COLLECTIONS.CANONICA_INTEGRATION_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('createdAt', '<', cutoff)
            .limit(100)
            .get();

        if (!eventsSnap.empty) {
            const eventsBatch = db.batch();
            for (const doc of eventsSnap.docs) {
                eventsBatch.delete(doc.ref);
                result.eventsDeleted++;
            }
            await eventsBatch.commit();
        }

        // Delete expired delivery logs
        const logsSnap = await db.collection(DB_COLLECTIONS.CANONICA_INTEGRATION_DELIVERY_LOGS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('createdAt', '<', cutoff)
            .limit(200)
            .get();

        if (!logsSnap.empty) {
            const logsBatch = db.batch();
            for (const doc of logsSnap.docs) {
                logsBatch.delete(doc.ref);
                result.logsDeleted++;
            }
            await logsBatch.commit();
        }
    } catch (error) {
        logger.warn('[Canonica Integration] TTL cleanup error', {
            tId,
            sId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    return result;
}
