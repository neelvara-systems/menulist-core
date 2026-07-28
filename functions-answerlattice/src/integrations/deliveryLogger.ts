/**
 * Answerlattice — Integration Delivery Logger
 * 
 * Logs every delivery attempt to answerlattice_integrationDeliveryLogs.
 * Append-only. One doc per delivery attempt per adapter.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.2
 */

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    AdapterType,
    DeliveryLogEntry,
    DeliveryResult,
    IntegrationEventType,
    IntegrationEvent,
    INTEGRATION_LIMITS,
} from './types';
import {
    buildIntegrationConfigIdentity,
    classifyIntegrationConfigOwnership,
} from './configOwnership';
import { sanitizeDeliveryError } from './safety';
import { isClaimableIntegrationEventDocument, isOwnedProcessingIntegrationEventDocument } from './eventDeliveryState';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
    getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

function buildExpiry(days: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getHealthDocId(tId: number, sId: number): string {
    return `integrationHealth_${tId}_${sId}`;
}

function getDeliveryLogDocId(eventId: string, adapter: AdapterType, attempt: number): string {
    const digest = createHash('sha256').update(eventId).digest('hex').slice(0, 24);
    return `delivery_${digest}_${adapter}_${attempt}`;
}

function isAlreadyExistsError(error: unknown): boolean {
    const code = (error as { code?: unknown } | null)?.code;
    return code === 6 || code === 'already-exists';
}

function boundedDeliveryStringContext(label: string, value: unknown): Record<string, number | boolean> {
    const text = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: text.length > 0,
        [`${label}Length`]: text.length,
    };
}

function getDeliveryLoggerErrorContext(error: unknown): Record<string, string | number | null> {
    return {
        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        sourceErrorCode: getBoundedFunctionsErrorCode(error) ?? null,
        sourceErrorStatus: getBoundedFunctionsErrorStatus(error) ?? null,
    };
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
            pId: 'AL',
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

        await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS)
            .doc(getDeliveryLogDocId(params.eventId, params.adapter, params.attempt))
            .create(entry);
    } catch (error) {
        if (isAlreadyExistsError(error)) return;
        logger.warn('[Answerlattice Integration] Failed to log delivery attempt', {
            failureCode: 'answerlattice_integration_delivery_log_write_failed',
            ...boundedDeliveryStringContext('eventId', params.eventId),
            adapter: params.adapter,
            attempt: params.attempt,
            hasTenantScope: Number.isSafeInteger(params.tId) && params.tId > 0,
            hasStoreScope: Number.isSafeInteger(params.sId) && params.sId > 0,
            resultSuccess: params.result.success,
            statusCode: params.result.statusCode ?? null,
            ...getDeliveryLoggerErrorContext(error),
        });
    }
}

/**
 * Update integration event status (pending → delivered/failed).
 */
export async function claimIntegrationEvent(
    eventId: string,
    event: IntegrationEvent,
): Promise<boolean> {
    const eventRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).doc(eventId);
    return db.runTransaction(async transaction => {
        const current = await transaction.get(eventRef);
        if (!current.exists || !isClaimableIntegrationEventDocument(current.data(), event)) return false;
        const currentAttempts = Number(current.data()?.processingAttemptCount || 0);
        transaction.update(eventRef, {
            status: 'processing',
            processingStartedAt: Timestamp.now(),
            processingAttemptCount: Number.isSafeInteger(currentAttempts) ? Math.min(currentAttempts + 1, 1000) : 1,
        });
        return true;
    });
}

export async function rejectInvalidIntegrationEvent(eventId: string): Promise<void> {
    const eventRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).doc(eventId);
    await db.runTransaction(async transaction => {
        const current = await transaction.get(eventRef);
        if (!current.exists || current.data()?.status !== 'pending') return;
        transaction.update(eventRef, {
            status: 'failed',
            failureCode: 'invalid_event_contract',
            completedAt: Timestamp.now(),
        });
    });
}

export async function updateEventStatus(
    eventId: string,
    status: 'processing' | 'delivered' | 'failed',
    event: IntegrationEvent,
): Promise<boolean> {
    try {
        const eventRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).doc(eventId);
        await db.runTransaction(async transaction => {
            const current = await transaction.get(eventRef);
            if (!current.exists || !isOwnedProcessingIntegrationEventDocument(current.data(), event)) {
                throw new Error('Answerlattice integration event ownership or lifecycle mismatch');
            }
            transaction.update(eventRef, {
                status,
                completedAt: status === 'processing' ? null : Timestamp.now(),
            });
        });
        return true;
    } catch (error) {
        logger.warn('[Answerlattice Integration] Failed to update event status', {
            failureCode: 'answerlattice_integration_event_status_update_failed',
            ...boundedDeliveryStringContext('eventId', eventId),
            status,
            ...getDeliveryLoggerErrorContext(error),
        });
        return false;
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
        const identity = buildIntegrationConfigIdentity(params.tId, params.sId);
        if (!identity) throw new Error('Answerlattice integration health scope is invalid');
        const now = Timestamp.now();
        const adapterHealth: Record<string, unknown> = {
            lastStatus: params.status,
            lastAttemptAt: now,
            lastEventId: params.eventId,
            lastEventType: params.eventType,
            lastError: params.result.error ? sanitizeDeliveryError(params.result.error) : null,
            statusCode: params.result.statusCode ?? null,
            durationMs: params.result.durationMs,
        };

        if (params.status === 'success') {
            adapterHealth.lastSuccessAt = now;
        } else {
            adapterHealth.lastFailureAt = now;
        }
        const update = {
            ...identity,
            adapters: {
                [params.adapter]: adapterHealth,
            },
            modifiedOn: now,
        };

        const healthRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getHealthDocId(params.tId, params.sId));
        await db.runTransaction(async transaction => {
            const current = await transaction.get(healthRef);
            if (
                current.exists
                && classifyIntegrationConfigOwnership(current.data(), params.tId, params.sId) === 'invalid'
            ) {
                throw new Error('Answerlattice integration health ownership mismatch');
            }
            transaction.set(healthRef, update, { merge: true });
        });
    } catch (error) {
        logger.warn('[Answerlattice Integration] Failed to update integration health', {
            failureCode: 'answerlattice_integration_health_update_failed',
            ...boundedDeliveryStringContext('eventId', params.eventId),
            hasTenantScope: Number.isSafeInteger(params.tId) && params.tId > 0,
            hasStoreScope: Number.isSafeInteger(params.sId) && params.sId > 0,
            adapter: params.adapter,
            status: params.status,
            resultSuccess: params.result.success,
            statusCode: params.result.statusCode ?? null,
            ...getDeliveryLoggerErrorContext(error),
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
