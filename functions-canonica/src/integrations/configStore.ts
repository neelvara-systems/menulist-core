/**
 * Canonica — Integration Config Store
 * 
 * Reads/writes per-tenant integration configuration from platformSummary.
 * Config doc: platformSummary/integrationConfig_{tId}_{sId}
 * 
 * Includes circuit breaker state management.
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §3.3
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
    IntegrationConfig,
    AdapterType,
    ADAPTER_TYPES,
    INTEGRATION_LIMITS,
} from './types';
import { normalizeIntegrationConfig } from './safety';

/**
 * Get the config doc ID for a tenant.
 */
function getConfigDocId(tId: number, sId: number): string {
    return `integrationConfig_${tId}_${sId}`;
}

/**
 * Default empty config (all integrations disabled).
 */
function getDefaultConfig(): IntegrationConfig {
    return normalizeIntegrationConfig({ modifiedOn: Timestamp.now() });
}

/**
 * Read integration config for a tenant.
 * Returns default config if none exists.
 */
export async function getIntegrationConfig(tId: number, sId: number): Promise<IntegrationConfig> {
    const docId = getConfigDocId(tId, sId);
    const doc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId).get();

    if (!doc.exists) {
        return getDefaultConfig();
    }

    return normalizeIntegrationConfig(doc.data());
}

/**
 * Check if a specific adapter is available for delivery.
 * Returns false if: disabled, no config, or circuit breaker open.
 */
export function isAdapterAvailable(
    config: IntegrationConfig,
    adapterType: AdapterType,
): boolean {
    const adapterConfig = config[adapterType];
    if (!adapterConfig || !adapterConfig.enabled) return false;

    // Check circuit breaker
    const cb = config.circuitBreaker?.[adapterType];
    if (cb && cb.disabledAt) {
        const disabledMs = cb.disabledAt.toMillis();
        const now = Date.now();
        // Still within cooldown period
        if (now - disabledMs < INTEGRATION_LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS) {
            return false;
        }
        // Cooldown expired — allow one probe delivery (caller handles reset)
    }

    return true;
}

export async function hasEnabledIntegrationAdapter(tId: number, sId: number): Promise<boolean> {
    const config = await getIntegrationConfig(tId, sId);
    return (Object.values(ADAPTER_TYPES) as AdapterType[]).some(adapterType => isAdapterAvailable(config, adapterType));
}

/**
 * Record a delivery success for circuit breaker tracking.
 * Resets consecutive failure count.
 */
export async function recordDeliverySuccess(
    tId: number,
    sId: number,
    adapterType: AdapterType,
): Promise<void> {
    const docId = getConfigDocId(tId, sId);
    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId).update({
        [`circuitBreaker.${adapterType}.consecutiveFailures`]: 0,
        [`circuitBreaker.${adapterType}.disabledAt`]: null,
    });
}

/**
 * Record a delivery failure for circuit breaker tracking.
 * If threshold exceeded, disables the adapter.
 */
export async function recordDeliveryFailure(
    tId: number,
    sId: number,
    adapterType: AdapterType,
    currentFailures: number,
): Promise<void> {
    const docId = getConfigDocId(tId, sId);
    const newCount = currentFailures + 1;

    const update: Record<string, any> = {
        [`circuitBreaker.${adapterType}.consecutiveFailures`]: newCount,
    };

    if (newCount >= INTEGRATION_LIMITS.CIRCUIT_BREAKER_THRESHOLD) {
        update[`circuitBreaker.${adapterType}.disabledAt`] = Timestamp.now();
        logger.warn('[Canonica Integration] Circuit breaker opened', {
            tId,
            sId,
            adapter: adapterType,
            consecutiveFailures: newCount,
        });
    }

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId).update(update);
}
