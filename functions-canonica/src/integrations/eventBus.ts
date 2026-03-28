/**
 * Canonica — Integration Event Bus
 * 
 * Single entry point for emitting integration events from any Canonica flow.
 * Writes append-only documents to canonica_integrationEvents.
 * Cloud Function processIntegrationEvent triggers on onCreate.
 * 
 * Fire-and-forget: errors logged, never thrown.
 * Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.1
 */

import { Timestamp } from 'firebase-admin/firestore';
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

// Track events emitted in current nightly run to enforce per-tenant cap
const nightlyEventCounts = new Map<string, number>();

/**
 * Reset nightly event counters. Called at the start of each nightly batch.
 */
export function resetNightlyEventCounts(): void {
    nightlyEventCounts.clear();
}

/**
 * Emit a Canonica integration event (fire-and-forget).
 * 
 * Safe to call from any flow — does nothing when feature flag is off.
 * Never blocks the caller; errors are swallowed with console.warn.
 * Enforces per-tenant event cap (50 per nightly run).
 */
export async function emitIntegrationEvent(params: {
    tId: number;
    sId: number;
    eventType: IntegrationEventType;
    severity: EventSeverity;
    payload: Record<string, any>;
}): Promise<void> {
    if (!FUNCTION_FLAGS.ENABLE_CANONICA_WORKFLOW_INTEGRATIONS) return;

    try {
        // Per-tenant event cap
        const tenantKey = `${params.tId}_${params.sId}`;
        const currentCount = nightlyEventCounts.get(tenantKey) || 0;
        if (currentCount >= INTEGRATION_LIMITS.MAX_EVENTS_PER_NIGHTLY_RUN) {
            console.warn(`[Canonica Integration] Event cap reached for ${tenantKey}. Skipping ${params.eventType}.`);
            return;
        }
        nightlyEventCounts.set(tenantKey, currentCount + 1);

        const event: IntegrationEvent = {
            eventType: params.eventType,
            tId: params.tId,
            sId: params.sId,
            severity: params.severity,
            payload: params.payload,
            status: EVENT_STATUS.PENDING,
            createdAt: Timestamp.now(),
        };

        await db.collection(DB_COLLECTIONS.CANONICA_INTEGRATION_EVENTS).add(event);

        console.log(`[Canonica Integration] Emitted: ${params.eventType} for ${params.tId}/${params.sId}`);
    } catch (error) {
        // Fire-and-forget: log but never throw
        console.warn(`[Canonica Integration] Failed to emit ${params.eventType}:`, error);
    }
}
