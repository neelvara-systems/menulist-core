/**
 * POS Webhook Sync — Event Builder
 *
 * Handles debounced delivery job creation and webhook dispatch.
 * Client-side debounce ensures only one delivery job per edit session.
 *
 * @see __docs__/pos-webhook-sync/pos-webhook-sync_impl.md §8
 */

import { FEATURE_FLAGS } from "@config/features";
import { PosSyncConfig } from "./types";

const POS_SYNC_DEBOUNCE_MS = 25_000; // 25 seconds

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        createDeliveryJob(storeId, tenantId, projectId).catch(() => {
            // Silent failure — POS sync should never block the UI
        });
    }, POS_SYNC_DEBOUNCE_MS);
}

/**
 * Cancel any pending debounced POS sync.
 * Call this when navigating away from the editor.
 */
export function cancelPendingPosSync(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
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
    try {
        await fetch('/api/pos-sync/deliver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeId, tenantId, projectId }),
        });
    } catch {
        // Silent — POS sync failures never surface to the owner
    }
}
