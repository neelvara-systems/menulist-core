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
                tenantKey,
                eventType: params.eventType,
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
            tId: params.tId,
            sId: params.sId,
        });
    } catch (error) {
        // Fire-and-forget: log but never throw
        logger.warn('[Answerlattice Integration] Failed to emit event', {
            eventType: params.eventType,
            tId: params.tId,
            sId: params.sId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
