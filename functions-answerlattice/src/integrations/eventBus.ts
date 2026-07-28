/**
 * Answerlattice — Integration Event Bus
 * 
 * Single entry point for emitting integration events from any Answerlattice flow.
 * Writes immutable event facts to answerlattice_integrationEvents; the processor
 * advances only the delivery lifecycle fields on the same document.
 * Cloud Function processIntegrationEvent triggers on onCreate.
 * 
 * Fire-and-forget: errors logged, never thrown.
 * Feature-flagged: ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.1
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { parseExactAnswerlatticeScope } from '../answerlattice/scopeBoundary';
import {
    EVENT_SEVERITY,
    IntegrationEvent,
    IntegrationEventType,
    EventSeverity,
    EVENT_STATUS,
    INTEGRATION_EVENT_TYPES,
    INTEGRATION_LIMITS,
} from './types';
import { sanitizeIntegrationPayload } from './safety';
import { buildIntegrationEventDocumentId, buildIntegrationEventFingerprint } from './eventIdentity';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
    getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

// Track events emitted in current nightly run to enforce per-tenant cap
const nightlyEventCounts = new Map<string, number>();
const EVENT_TYPES = new Set<string>(Object.values(INTEGRATION_EVENT_TYPES));
const EVENT_SEVERITIES = new Set<string>(Object.values(EVENT_SEVERITY));

function buildExpiry(days: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getIntegrationEventScopeContext(params: { tId: number; sId: number }): Record<string, boolean> {
    return {
        hasTenantScope: Number.isSafeInteger(params.tId) && params.tId > 0,
        hasStoreScope: Number.isSafeInteger(params.sId) && params.sId > 0,
    };
}

function getIntegrationEventErrorContext(error: unknown): Record<string, string | number | null> {
    return {
        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        sourceErrorCode: getBoundedFunctionsErrorCode(error) ?? null,
        sourceErrorStatus: getBoundedFunctionsErrorStatus(error) ?? null,
    };
}

function getPayloadKeyCount(value: unknown): number {
    try {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? Object.keys(value).length
            : 0;
    } catch {
        return 0;
    }
}

function isAlreadyExistsError(error: unknown): boolean {
    const code = (error as { code?: unknown } | null)?.code;
    return code === 6 || code === 'already-exists';
}

function releaseNightlyEventReservation(tenantKey: string): void {
    const currentCount = nightlyEventCounts.get(tenantKey) || 0;
    if (currentCount <= 1) {
        nightlyEventCounts.delete(tenantKey);
    } else {
        nightlyEventCounts.set(tenantKey, currentCount - 1);
    }
}

/**
 * Reset nightly event counters. Called at the start of each nightly batch.
 */
export function resetNightlyEventCounts(): void {
    nightlyEventCounts.clear();
}

/**
 * Emit an Answerlattice integration event (fire-and-forget).
 * 
 * Safe to call from any flow — does nothing when feature flag is off.
 * Never blocks the caller; errors are logged and swallowed.
 * Enforces per-tenant event cap (50 per nightly run).
 */
export async function emitIntegrationEvent(params: {
    tId: number;
    sId: number;
    eventType: IntegrationEventType;
    severity: EventSeverity;
    payload: Record<string, unknown>;
    deduplicationKey?: string;
}): Promise<boolean> {
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) return false;

    let tenantKey: string | null = null;
    let reservedEventSlot = false;
    try {
        const scope = parseExactAnswerlatticeScope(params.tId, params.sId);
        if (
            !scope
            || !EVENT_TYPES.has(params.eventType)
            || !EVENT_SEVERITIES.has(params.severity)
            || !params.payload
            || typeof params.payload !== 'object'
            || Array.isArray(params.payload)
        ) {
            logger.warn('[Answerlattice Integration] Invalid event rejected', {
                failureCode: 'answerlattice_integration_event_contract_invalid',
                eventType: params.eventType,
                severity: params.severity,
                ...getIntegrationEventScopeContext(params),
            });
            return false;
        }

        const payload = sanitizeIntegrationPayload(params.payload);
        const deterministicId = params.deduplicationKey
            ? buildIntegrationEventDocumentId({
                tId: scope.tId,
                sId: scope.sId,
                eventType: params.eventType,
                deduplicationKey: params.deduplicationKey,
            })
            : null;
        const idempotencyFingerprint = deterministicId
            ? buildIntegrationEventFingerprint({
                tId: scope.tId,
                sId: scope.sId,
                eventType: params.eventType,
                severity: params.severity,
                payload,
            })
            : null;
        if (params.deduplicationKey && (!deterministicId || !idempotencyFingerprint)) {
            logger.warn('[Answerlattice Integration] Invalid event identity rejected', {
                failureCode: 'answerlattice_integration_event_identity_invalid',
                eventType: params.eventType,
                deduplicationKeyPresent: params.deduplicationKey.length > 0,
                deduplicationKeyLength: params.deduplicationKey.length,
                ...getIntegrationEventScopeContext(params),
            });
            return false;
        }

        // Per-tenant event cap
        tenantKey = `${scope.tId}_${scope.sId}`;
        const currentCount = nightlyEventCounts.get(tenantKey) || 0;
        if (currentCount >= INTEGRATION_LIMITS.MAX_EVENTS_PER_NIGHTLY_RUN) {
            logger.warn('[Answerlattice Integration] Event cap reached', {
                failureCode: 'answerlattice_integration_event_cap_reached',
                eventType: params.eventType,
                currentCount,
                maxEvents: INTEGRATION_LIMITS.MAX_EVENTS_PER_NIGHTLY_RUN,
                ...getIntegrationEventScopeContext(params),
            });
            return false;
        }
        nightlyEventCounts.set(tenantKey, currentCount + 1);
        reservedEventSlot = true;

        const event: IntegrationEvent & { idempotencyFingerprint?: string } = {
            pId: 'AL',
            eventType: params.eventType,
            tId: scope.tId,
            sId: scope.sId,
            severity: params.severity,
            payload,
            status: EVENT_STATUS.PENDING,
            createdAt: Timestamp.now(),
            expiresAt: buildExpiry(INTEGRATION_LIMITS.EVENT_TTL_DAYS),
            ...(idempotencyFingerprint ? { idempotencyFingerprint } : {}),
        };

        if (deterministicId) {
            const eventRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).doc(deterministicId);
            try {
                await eventRef.create(event);
            } catch (error) {
                if (!isAlreadyExistsError(error)) throw error;
                const existing = await eventRef.get();
                const existingData = existing.data();
                const existingOwnedFactsMatch = existingData?.pId === 'AL'
                    && existingData.tId === scope.tId
                    && existingData.sId === scope.sId
                    && existingData.eventType === params.eventType
                    && existingData.severity === params.severity;
                const existingFingerprint = typeof existingData?.idempotencyFingerprint === 'string'
                    ? existingData.idempotencyFingerprint
                    : existingData
                        ? buildIntegrationEventFingerprint({
                            tId: existingData.tId,
                            sId: existingData.sId,
                            eventType: existingData.eventType,
                            severity: existingData.severity,
                            payload: existingData.payload,
                        })
                        : null;
                releaseNightlyEventReservation(tenantKey);
                reservedEventSlot = false;
                if (!existingOwnedFactsMatch || existingFingerprint !== idempotencyFingerprint) {
                    logger.warn('[Answerlattice Integration] Event idempotency conflict', {
                        failureCode: 'answerlattice_integration_event_idempotency_conflict',
                        eventType: params.eventType,
                        ...getIntegrationEventScopeContext(params),
                    });
                    return false;
                }
                logger.info('[Answerlattice Integration] Duplicate event suppressed', {
                    eventType: params.eventType,
                    ...getIntegrationEventScopeContext(params),
                });
                return false;
            }
        } else {
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).add(event);
        }

        logger.info('[Answerlattice Integration] Event emitted', {
            eventType: params.eventType,
            severity: params.severity,
            payloadKeyCount: getPayloadKeyCount(event.payload),
            ...getIntegrationEventScopeContext(params),
        });
        return true;
    } catch (error) {
        if (reservedEventSlot && tenantKey) releaseNightlyEventReservation(tenantKey);
        // Fire-and-forget: log but never throw
        logger.warn('[Answerlattice Integration] Failed to emit event', {
            failureCode: 'answerlattice_integration_event_emit_failed',
            eventType: params.eventType,
            severity: params.severity,
            payloadKeyCount: getPayloadKeyCount(params.payload),
            ...getIntegrationEventScopeContext(params),
            ...getIntegrationEventErrorContext(error),
        });
        return false;
    }
}
