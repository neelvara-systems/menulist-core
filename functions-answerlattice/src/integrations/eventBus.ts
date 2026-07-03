/**
 * Answerlattice — Integration Event Bus
 * 
 * Single entry point for emitting integration events from any Answerlattice flow.
 * Writes append-only documents to answerlattice_integrationEvents.
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
import {
    IntegrationEvent,
    IntegrationEventType,
    EventSeverity,
    EVENT_STATUS,
    INTEGRATION_LIMITS,
} from './types';
import { sanitizeIntegrationPayload } from './safety';

// Track events emitted in current nightly run to enforce per-tenant cap
const nightlyEventCounts = new Map<string, number>();

function buildExpiry(days: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
}

function getIntegrationEventScopeContext(params: { tId: number; sId: number }): Record<string, boolean> {
    return {
        hasTenantScope: Number.isFinite(params.tId),
        hasStoreScope: Number.isFinite(params.sId),
    };
}

function getIntegrationEventErrorContext(error: unknown): Record<string, string | number | null> {
    const source = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    const code = typeof source?.code === 'string' || typeof source?.code === 'number'
        ? String(source.code).slice(0, 80)
        : null;
    const status = typeof source?.status === 'string' || typeof source?.status === 'number'
        ? String(source.status).slice(0, 80)
        : typeof source?.statusCode === 'string' || typeof source?.statusCode === 'number'
            ? String(source.statusCode).slice(0, 80)
            : null;

    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: code,
        sourceErrorStatus: status,
    };
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
    payload: Record<string, any>;
}): Promise<void> {
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) return;

    try {
        // Per-tenant event cap
        const tenantKey = `${params.tId}_${params.sId}`;
        const currentCount = nightlyEventCounts.get(tenantKey) || 0;
        if (currentCount >= INTEGRATION_LIMITS.MAX_EVENTS_PER_NIGHTLY_RUN) {
            logger.warn('[Answerlattice Integration] Event cap reached', {
                failureCode: 'answerlattice_integration_event_cap_reached',
                eventType: params.eventType,
                currentCount,
                maxEvents: INTEGRATION_LIMITS.MAX_EVENTS_PER_NIGHTLY_RUN,
                ...getIntegrationEventScopeContext(params),
            });
            return;
        }
        nightlyEventCounts.set(tenantKey, currentCount + 1);

        const event: IntegrationEvent = {
            pId: 'AL',
            eventType: params.eventType,
            tId: params.tId,
            sId: params.sId,
            severity: params.severity,
            payload: sanitizeIntegrationPayload(params.payload),
            status: EVENT_STATUS.PENDING,
            createdAt: Timestamp.now(),
            expiresAt: buildExpiry(INTEGRATION_LIMITS.EVENT_TTL_DAYS),
        };

        await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).add(event);

        logger.info('[Answerlattice Integration] Event emitted', {
            eventType: params.eventType,
            severity: params.severity,
            payloadKeyCount: Object.keys(event.payload || {}).length,
            ...getIntegrationEventScopeContext(params),
        });
    } catch (error) {
        // Fire-and-forget: log but never throw
        logger.warn('[Answerlattice Integration] Failed to emit event', {
            failureCode: 'answerlattice_integration_event_emit_failed',
            eventType: params.eventType,
            severity: params.severity,
            payloadKeyCount: Object.keys(params.payload || {}).length,
            ...getIntegrationEventScopeContext(params),
            ...getIntegrationEventErrorContext(error),
        });
    }
}
