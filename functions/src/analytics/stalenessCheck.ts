/**
 * PERIODIC STALENESS CHECK — Nightly Detection (Infrastructure Compounding 10.4)
 * ═══════════════════════════════════════════════════════════════
 *
 * Identifies stores whose menu hasn't been updated in 90+ days and
 * claims a tenant/store-scoped cooldown checkpoint, then delegates delivery
 * to the existing lifecycle messaging engine.
 *
 * This function never sends provider email directly. The messaging engine
 * owns recipient resolution, delivery idempotency, rate limits, and SMTP.
 *
 * Called from: decisionBlocksScoring.ts (nightly scheduler)
 * Feature flag: ENABLE_STALENESS_CHECK
 *
 * Firebase cost boundary:
 * - 1 read  (platformSummary/storeTruthConfidence)
 * - Up to 500 checkpoint reads per run (rotated across stale stores)
 * - Up to 50 new-detection writes (legacy checkpoint migration can write more once)
 *
 * @see __docs__/infrastructure-compounding/periodic-staleness-check_spec.md
 */

import { firestoreAdmin } from '../firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_RETENTION_CONFIG } from '../constants/features';
import { normalizeOwnerNotificationNumericScopeDocumentId } from '../sharedData/ownerNotificationDeliveryBoundary';
import { analyticsLogger, getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';

// ================================================================
// TYPES
// ================================================================

export interface StalenessCheckResult {
    checked: number;
    staleFound: number;
    newStalenessDetected: number;
    skippedRecent: number;
    errors: number;
    readsCount: number;
    writesCount: number;
}

// ================================================================
// CONSTANTS
// ================================================================

const STALENESS_COOLDOWN_DAYS = 90;
const MAX_DETECTIONS_PER_NIGHT = 50;
const MAX_STALE_STORES_CHECKED_PER_NIGHT = 500;
const MAX_LEGACY_LOGS_PER_SCOPE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALENESS_LIFECYCLE_DELIVERY_FAILED = 'STALENESS_LIFECYCLE_DELIVERY_FAILED';
const STALENESS_LOG_RETENTION_DAYS = Math.max(
    STALENESS_COOLDOWN_DAYS + 1,
    FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS,
);

interface StalenessDetectionClaimResult {
    checkpointWritten: boolean;
    newDetection: boolean;
    readsCount: number;
}

function getTimestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        if (typeof toMillis === 'function') {
            const millis = Number(toMillis.call(value));
            return Number.isFinite(millis) ? millis : null;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : null;
    } catch {
        return null;
    }
}

function normalizeOptionalMetric(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function getStalenessCheckpointId(tId: string, sId: string): string {
    return `staleness_check_${tId}_${sId}`;
}

async function claimStalenessDetection(
    db: FirebaseFirestore.Firestore,
    params: {
        daysSincePublish: number | null;
        now: Timestamp;
        score: number | null;
        sId: string;
        tId: string;
    },
): Promise<StalenessDetectionClaimResult> {
    const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(params.tId);
    const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(params.sId);
    if (
        !tenantScope
        || !storeScope
        || tenantScope.documentId !== params.tId
        || storeScope.documentId !== params.sId
    ) {
        throw new Error('STALENESS_SCOPE_INVALID');
    }
    const cooldownMillis = params.now.toMillis() - STALENESS_COOLDOWN_DAYS * DAY_MS;
    const checkpointRef = db.collection(DB_COLLECTIONS.MESSAGE_LOGS)
        .doc(getStalenessCheckpointId(params.tId, params.sId));
    const legacyQuery = db.collection(DB_COLLECTIONS.MESSAGE_LOGS)
        .where('type', '==', 'staleness_check')
        .where('recipientStoreId', '==', params.sId)
        .where('sentAt', '>=', Timestamp.fromMillis(cooldownMillis))
        .limit(MAX_LEGACY_LOGS_PER_SCOPE);

    return db.runTransaction(async (transaction) => {
        const checkpoint = await transaction.get(checkpointRef);
        const checkpointMillis = getTimestampMillis(checkpoint.data()?.sentAt);
        if (checkpointMillis !== null && checkpointMillis >= cooldownMillis) {
            return { checkpointWritten: false, newDetection: false, readsCount: 1 };
        }

        let recentLegacyMillis: number | null = null;
        let readsCount = 1;
        if (!checkpoint.exists) {
            const legacySnapshot = await transaction.get(legacyQuery);
            readsCount += Math.max(1, legacySnapshot.size);
            for (const legacyDoc of legacySnapshot.docs) {
                const legacyData = legacyDoc.data();
                if (String(legacyData.tId ?? '') !== params.tId) continue;
                const legacyMillis = getTimestampMillis(legacyData.sentAt);
                if (
                    legacyMillis !== null
                    && legacyMillis >= cooldownMillis
                    && (recentLegacyMillis === null || legacyMillis > recentLegacyMillis)
                ) {
                    recentLegacyMillis = legacyMillis;
                }
            }
        }

        const detectedAt = recentLegacyMillis === null
            ? params.now
            : Timestamp.fromMillis(recentLegacyMillis);
        transaction.set(checkpointRef, {
            type: 'staleness_check',
            recipientStoreId: params.sId,
            tId: params.tId,
            sentAt: detectedAt,
            expiresAt: Timestamp.fromMillis(detectedAt.toMillis() + STALENESS_LOG_RETENTION_DAYS * DAY_MS),
            status: 'pending',
            metadata: {
                daysSincePublish: params.daysSincePublish,
                truthScore: params.score,
                detectedAt: recentLegacyMillis === null ? FieldValue.serverTimestamp() : detectedAt,
            },
        });

        return {
            checkpointWritten: true,
            newDetection: recentLegacyMillis === null,
            readsCount,
        };
    });
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Check stores for staleness, claim cooldowns, and delegate delivery
 *
 * The lifecycle messaging engine handles recipient resolution and delivery.
 */
export async function checkStalenessForAllStores(): Promise<StalenessCheckResult> {
    const db = firestoreAdmin;
    const result: StalenessCheckResult = {
        checked: 0,
        staleFound: 0,
        newStalenessDetected: 0,
        skippedRecent: 0,
        errors: 0,
        readsCount: 0,
        writesCount: 0,
    };

    analyticsLogger.info('[StalenessCheck] Starting nightly staleness detection');

    try {
        // Read storeTruthConfidence (computed by 10.3)
        const truthDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc('storeTruthConfidence').get();
        result.readsCount++;

        if (!truthDoc.exists) {
            analyticsLogger.info('[StalenessCheck] No storeTruthConfidence doc found');
            return result;
        }

        const rawStores = truthDoc.data()?.stores;
        const stores = rawStores && typeof rawStores === 'object' && !Array.isArray(rawStores)
            ? rawStores as Record<string, unknown>
            : {};
        const allEntries = Object.entries(stores);
        const staleEntries = allEntries
            .filter(([, value]) => Boolean(
                value && typeof value === 'object' && !Array.isArray(value)
                    && (value as Record<string, unknown>).staleFlag === true,
            ))
            .sort(([left], [right]) => left.localeCompare(right));
        result.checked = allEntries.length;
        result.staleFound = staleEntries.length;

        const staleCheckCount = Math.min(staleEntries.length, MAX_STALE_STORES_CHECKED_PER_NIGHT);
        const utcDayNumber = Math.floor(Date.now() / DAY_MS);
        const startIndex = staleEntries.length > 0
            ? (utcDayNumber * MAX_STALE_STORES_CHECKED_PER_NIGHT) % staleEntries.length
            : 0;

        if (staleEntries.length > MAX_STALE_STORES_CHECKED_PER_NIGHT) {
            analyticsLogger.warn('[StalenessCheck] Stale-store scan bounded for this run', {
                staleStores: staleEntries.length,
                maxChecked: MAX_STALE_STORES_CHECKED_PER_NIGHT,
                rotationStartIndex: startIndex,
            });
        }

        for (let offset = 0; offset < staleCheckCount; offset += 1) {
            const entry = staleEntries[(startIndex + offset) % staleEntries.length];
            if (!entry) break;
            const [rawSId, rawStoreData] = entry;
            const storeData = rawStoreData as Record<string, unknown>;

            // Throttle: max detections per night
            if (result.newStalenessDetected >= MAX_DETECTIONS_PER_NIGHT) break;

            try {
                const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(rawSId);
                const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(storeData.tId);
                if (!storeScope || !tenantScope) {
                    throw new Error('STALENESS_SCOPE_INVALID');
                }
                const sId = storeScope.documentId;
                const tId = tenantScope.documentId;
                const now = Timestamp.now();
                const claim = await claimStalenessDetection(db, {
                    daysSincePublish: normalizeOptionalMetric(storeData.daysSincePublish),
                    now,
                    score: normalizeOptionalMetric(storeData.score),
                    sId,
                    tId,
                });
                result.readsCount += claim.readsCount;
                if (claim.checkpointWritten) result.writesCount++;

                if (!claim.newDetection) {
                    result.skippedRecent++;
                    continue;
                }

                const staleReferenceId = `menu-stale-${sId}-${now.toDate().toISOString().slice(0, 10)}`;
                try {
                    const { sendLifecycleMessage } = await import('../messaging/messagingEngine');
                    await sendLifecycleMessage({
                        storeId: sId,
                        tenantId: tId,
                        eventType: 'MENU_STALE',
                        referenceId: staleReferenceId,
                        metadata: {
                            reason: 'Menu information may be older than expected.',
                            daysSincePublish: normalizeOptionalMetric(storeData.daysSincePublish),
                            truthScore: normalizeOptionalMetric(storeData.score),
                        },
                    });
                } catch (deliveryError) {
                    analyticsLogger.warn('[StalenessCheck] Lifecycle message delivery failed after detection log', {
                        failureCode: STALENESS_LIFECYCLE_DELIVERY_FAILED,
                        eventType: 'MENU_STALE',
                        storeId: getAnalyticsIdContext(sId),
                        tenantId: getAnalyticsIdContext(tId),
                        referenceId: getAnalyticsIdContext(staleReferenceId),
                        messageLogWritten: true,
                        fallbackPolicy: 'keep_detection_cooldown_and_continue',
                        error: getAnalyticsErrorContext(deliveryError),
                    });
                }

                result.newStalenessDetected++;

            } catch (storeError) {
                result.errors++;
                analyticsLogger.warn('[StalenessCheck] Error processing store', {
                    storeId: getAnalyticsIdContext(rawSId),
                    error: getAnalyticsErrorContext(storeError),
                });
            }
        }

        analyticsLogger.info('[StalenessCheck] Detection complete', {
            checked: result.checked,
            staleFound: result.staleFound,
            newStalenessDetected: result.newStalenessDetected,
            skippedRecent: result.skippedRecent,
            errors: result.errors,
        });
        if (result.errors > 0) {
            analyticsLogger.warn('[StalenessCheck] Detection completed with store errors', {
                errors: result.errors,
            });
        }

        return result;
    } catch (error) {
        analyticsLogger.error('[StalenessCheck] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}

export async function claimStalenessDetectionForTest(
    db: FirebaseFirestore.Firestore,
    params: {
        daysSincePublish: number | null;
        now: Timestamp;
        score: number | null;
        sId: string;
        tId: string;
    },
): Promise<StalenessDetectionClaimResult> {
    return claimStalenessDetection(db, params);
}
