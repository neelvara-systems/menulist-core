/**
 * Answerlattice — Integration Config Store
 * 
 * Reads/writes per-tenant integration configuration from platformSummary.
 * Config doc: platformSummary/integrationConfig_{tId}_{sId}
 * 
 * Includes circuit breaker state management.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §3.3
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
import {
    buildIntegrationConfigIdentity,
    classifyIntegrationConfigOwnership,
} from './configOwnership';

/**
 * Get the config doc ID for a tenant.
 */
function getConfigDocId(tId: number, sId: number): string {
    return `integrationConfig_${tId}_${sId}`;
}

/**
 * Default empty config (all integrations disabled).
 */
function getDefaultConfig(identity: Pick<IntegrationConfig, 'pId' | 'tId' | 'sId'>): IntegrationConfig {
    return normalizeIntegrationConfig({ modifiedOn: Timestamp.now() }, identity);
}

function getIntegrationConfigScopeContext(tId: number, sId: number): Record<string, boolean> {
    return {
        hasTenantScope: Number.isSafeInteger(tId) && tId > 0,
        hasStoreScope: Number.isSafeInteger(sId) && sId > 0,
    };
}

function getRequiredConfigIdentity(
    tId: number,
    sId: number,
): Pick<IntegrationConfig, 'pId' | 'tId' | 'sId'> {
    const identity = buildIntegrationConfigIdentity(tId, sId);
    if (!identity) throw new Error('Invalid Answerlattice integration config scope');
    return identity;
}

/**
 * Read integration config for a tenant.
 * Returns default config if none exists.
 */
export async function getIntegrationConfig(tId: number, sId: number): Promise<IntegrationConfig> {
    const identity = getRequiredConfigIdentity(tId, sId);
    const docId = getConfigDocId(tId, sId);
    const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId);
    const doc = await docRef.get();

    if (!doc.exists) {
        return getDefaultConfig(identity);
    }

    const ownership = classifyIntegrationConfigOwnership(doc.data(), tId, sId);
    if (ownership === 'owned') return normalizeIntegrationConfig(doc.data(), identity);

    if (ownership === 'legacy-unowned') {
        const claimedData = await db.runTransaction(async transaction => {
            const current = await transaction.get(docRef);
            if (!current.exists) return null;
            const currentData = current.data();
            const currentOwnership = classifyIntegrationConfigOwnership(currentData, tId, sId);
            if (currentOwnership === 'invalid') return null;
            if (currentOwnership === 'legacy-unowned') {
                transaction.set(docRef, identity, { merge: true });
            }
            return { ...currentData, ...identity };
        });
        if (claimedData) return normalizeIntegrationConfig(claimedData, identity);
    }

    logger.error('[Answerlattice Integration] Config ownership mismatch; adapters disabled', {
        failureCode: 'answerlattice_integration_config_ownership_mismatch',
        ...getIntegrationConfigScopeContext(tId, sId),
    });
    return getDefaultConfig(identity);
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

/**
 * Atomically reserves the single post-cooldown circuit-breaker probe.
 * Normal deliveries do not write a lease; the transaction is only used when
 * the caller observed an open breaker whose cooldown has elapsed.
 */
export async function claimCircuitBreakerProbe(
    tId: number,
    sId: number,
    adapterType: AdapterType,
): Promise<boolean> {
    const identity = getRequiredConfigIdentity(tId, sId);
    const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getConfigDocId(tId, sId));
    return db.runTransaction(async transaction => {
        const current = await transaction.get(docRef);
        if (!current.exists || classifyIntegrationConfigOwnership(current.data(), tId, sId) === 'invalid') {
            throw new Error('Answerlattice integration config ownership mismatch');
        }

        const normalized = normalizeIntegrationConfig(current.data(), identity);
        if (!normalized[adapterType]?.enabled) return false;
        const circuitBreaker = normalized.circuitBreaker[adapterType];
        if (!circuitBreaker.disabledAt) return true;

        const now = Timestamp.now();
        if (now.toMillis() - circuitBreaker.disabledAt.toMillis() < INTEGRATION_LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS) {
            return false;
        }
        if (
            circuitBreaker.probeStartedAt
            && now.toMillis() - circuitBreaker.probeStartedAt.toMillis() < INTEGRATION_LIMITS.CIRCUIT_BREAKER_PROBE_LEASE_MS
        ) {
            return false;
        }

        transaction.update(docRef, {
            ...identity,
            [`circuitBreaker.${adapterType}.probeStartedAt`]: now,
        });
        return true;
    });
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
    const identity = getRequiredConfigIdentity(tId, sId);
    const docId = getConfigDocId(tId, sId);
    const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId);
    await db.runTransaction(async transaction => {
        const current = await transaction.get(docRef);
        if (!current.exists || classifyIntegrationConfigOwnership(current.data(), tId, sId) === 'invalid') {
            throw new Error('Answerlattice integration config ownership mismatch');
        }
        const normalized = normalizeIntegrationConfig(current.data(), identity);
        const circuitBreaker = normalized.circuitBreaker[adapterType];
        if (
            circuitBreaker.consecutiveFailures === 0
            && circuitBreaker.disabledAt === null
            && circuitBreaker.probeStartedAt === null
        ) return;
        transaction.update(docRef, {
            ...identity,
            [`circuitBreaker.${adapterType}.consecutiveFailures`]: 0,
            [`circuitBreaker.${adapterType}.disabledAt`]: null,
            [`circuitBreaker.${adapterType}.probeStartedAt`]: null,
        });
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
): Promise<void> {
    const identity = getRequiredConfigIdentity(tId, sId);
    const docId = getConfigDocId(tId, sId);
    const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docId);
    const result = await db.runTransaction(async transaction => {
        const current = await transaction.get(docRef);
        if (!current.exists || classifyIntegrationConfigOwnership(current.data(), tId, sId) === 'invalid') {
            throw new Error('Answerlattice integration config ownership mismatch');
        }
        const normalized = normalizeIntegrationConfig(current.data(), identity);
        const currentFailures = normalized.circuitBreaker[adapterType].consecutiveFailures;
        const newCount = Math.min(currentFailures + 1, 1000);
        const disabledAt = newCount >= INTEGRATION_LIMITS.CIRCUIT_BREAKER_THRESHOLD
            ? Timestamp.now()
            : normalized.circuitBreaker[adapterType].disabledAt;
        transaction.update(docRef, {
            ...identity,
            [`circuitBreaker.${adapterType}.consecutiveFailures`]: newCount,
            [`circuitBreaker.${adapterType}.disabledAt`]: disabledAt,
            [`circuitBreaker.${adapterType}.probeStartedAt`]: null,
        });
        return {
            newCount,
            opened: newCount >= INTEGRATION_LIMITS.CIRCUIT_BREAKER_THRESHOLD
                && normalized.circuitBreaker[adapterType].disabledAt === null,
        };
    });

    if (result.opened) {
        logger.warn('[Answerlattice Integration] Circuit breaker opened', {
            failureCode: 'answerlattice_integration_circuit_breaker_opened',
            ...getIntegrationConfigScopeContext(tId, sId),
            adapter: adapterType,
            consecutiveFailures: result.newCount,
        });
    }
}
