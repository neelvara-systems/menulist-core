/**
 * POS Webhook Sync — Event Builder
 *
 * Handles debounced delivery job creation and webhook dispatch.
 * Client-side debounce ensures only one delivery job per edit session.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §8
 */

import { FEATURE_FLAGS } from "@config/features";
import { getBoundedSecurityStringContext, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { PosSyncConfig } from "./types";

const POS_SYNC_DEBOUNCE_MS = 25_000; // 25 seconds
const POS_SYNC_DELIVERY_TRIGGER_FAILED = 'pos_sync_delivery_trigger_failed';
const POS_SYNC_DELIVERY_REQUEST_REJECTED = 'pos_sync_delivery_request_rejected';

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getPosSyncDebounceKey(storeId: number, tenantId: number, projectId: string): string {
    return `${tenantId}:${storeId}:${projectId}`;
}

function createPosSyncDeliveryError(code: string, status?: number): Error & { code: string; status?: number } {
    return Object.assign(new Error(code), {
        code,
        status,
    });
}

function buildPosSyncDeliveryLogContext(
    storeId: number,
    tenantId: number,
    projectId: string,
) {
    return {
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('tenantId', tenantId),
        ...getBoundedSecurityStringContext('projectId', projectId),
    };
}

/**
 * Trigger POS sync after a menu change (debounced).
 *
 * Called from the editor/project save flow.
 * Waits 25 seconds after last call, then creates a delivery job via API.
 *
 * @param storeId - Current store ID
 * @param tenantId - Current tenant ID
 * @param projectId - Current project ID
 * @param posSync - Store's POS sync config
 */
export function triggerPosSyncDebounced(
    storeId: number,
    tenantId: number,
    projectId: string,
    posSync: PosSyncConfig | undefined,
): void {
    if (!FEATURE_FLAGS.ENABLE_POS_SYNC) return;
    if (!posSync?.enabled) return;
    if (!posSync?.webhookUrl) return;
    if (!posSync?.webhookSecret) return;

    const debounceKey = getPosSyncDebounceKey(storeId, tenantId, projectId);
    const existingTimer = debounceTimers.get(debounceKey);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
        if (debounceTimers.get(debounceKey) === timer) debounceTimers.delete(debounceKey);
        createDeliveryJob(storeId, tenantId, projectId).catch((error) => {
            logSecurityFailure(
                POS_SYNC_DELIVERY_TRIGGER_FAILED,
                error,
                buildPosSyncDeliveryLogContext(storeId, tenantId, projectId),
            );
        });
    }, POS_SYNC_DEBOUNCE_MS);
    debounceTimers.set(debounceKey, timer);
}

/**
 * Cancel any pending debounced POS sync.
 * Call this when navigating away from the editor.
 */
export function cancelPendingPosSync(): void {
    debounceTimers.forEach((timer) => clearTimeout(timer));
    debounceTimers.clear();
}

/**
 * Create a delivery job by calling the delivery API route.
 * This is called after the debounce timer fires.
 */
async function createDeliveryJob(
    storeId: number,
    tenantId: number,
    projectId: string,
): Promise<void> {
    const response = await fetch('/api/pos-sync/deliver', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, tenantId, projectId }),
    });

    if (!response.ok) {
        throw createPosSyncDeliveryError(POS_SYNC_DELIVERY_REQUEST_REJECTED, response.status);
    }
}
