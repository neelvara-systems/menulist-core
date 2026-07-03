/**
 * PERIODIC STALENESS CHECK — Nightly Detection (Infrastructure Compounding 10.4)
 * ═══════════════════════════════════════════════════════════════
 *
 * Identifies stores whose menu hasn't been updated in 90+ days and
 * logs them for lifecycle messaging. The actual email sending is
 * handled by the existing lifecycle messaging engine.
 *
 * This function ONLY detects stale stores and writes staleness events
 * to messageLogs for idempotency checking. It does NOT send emails
 * directly — that responsibility belongs to the messaging engine.
 *
 * Called from: decisionBlocksScoring.ts (nightly scheduler)
 * Feature flag: ENABLE_STALENESS_CHECK
 *
 * Firebase cost: ~$0.0005/month at 100 stores
 * - 1 read  (platformSummary/storeTruthConfidence)
 * - N reads (messageLogs idempotency check per stale store)
 * - N writes (messageLogs entries for new stale detections)
 *
 * @see __docs__/infrastructure-compounding/periodic-staleness-check_spec.md
 */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_RETENTION_CONFIG } from '../constants/features';
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
const DAY_MS = 24 * 60 * 60 * 1000;
const STALENESS_LOG_RETENTION_DAYS = Math.max(
    STALENESS_COOLDOWN_DAYS + 1,
    FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS,
);

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Check all stores for staleness and log detections
 *
 * Does NOT send emails — only detects and logs.
 * The lifecycle messaging engine handles delivery.
 */
export async function checkStalenessForAllStores(): Promise<StalenessCheckResult> {
    const db = admin.firestore();
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

        const stores = truthDoc.data()?.stores || {};
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() - STALENESS_COOLDOWN_DAYS);
        const cooldownTimestamp = Timestamp.fromDate(cooldownDate);

        for (const [sId, storeData] of Object.entries(stores) as [string, any][]) {
            result.checked++;

            // Only process stale stores
            if (!storeData.staleFlag) continue;
            result.staleFound++;

            // Throttle: max detections per night
            if (result.newStalenessDetected >= MAX_DETECTIONS_PER_NIGHT) break;

            try {
                // Idempotency: check if we already logged a staleness event recently
                const recentLog = await db.collection(DB_COLLECTIONS.MESSAGE_LOGS)
                    .where('type', '==', 'staleness_check')
                    .where('recipientStoreId', '==', sId)
                    .where('sentAt', '>=', cooldownTimestamp)
                    .limit(1)
                    .get();
                result.readsCount++;

                if (!recentLog.empty) {
                    result.skippedRecent++;
                    continue;
                }

                // Log staleness detection to messageLogs
                // The lifecycle messaging engine will pick this up and send email
                const now = Timestamp.now();
                await db.collection(DB_COLLECTIONS.MESSAGE_LOGS).add({
                    type: 'staleness_check',
                    recipientStoreId: sId,
                    tId: storeData.tId,
                    sentAt: now,
                    expiresAt: Timestamp.fromMillis(now.toMillis() + STALENESS_LOG_RETENTION_DAYS * DAY_MS),
                    status: 'pending', // Lifecycle engine will update to 'sent'
                    metadata: {
                        daysSincePublish: storeData.daysSincePublish,
                        truthScore: storeData.score,
                        detectedAt: FieldValue.serverTimestamp(),
                    },
                });

                try {
                    const { sendLifecycleMessage } = await import('../messaging/messagingEngine');
                    await sendLifecycleMessage({
                        storeId: String(sId),
                        tenantId: String(storeData.tId),
                        eventType: 'MENU_STALE',
                        referenceId: `menu-stale-${sId}-${new Date().toISOString().slice(0, 10)}`,
                        metadata: {
                            reason: 'Menu information may be older than expected.',
                            daysSincePublish: storeData.daysSincePublish,
                            truthScore: storeData.score,
                        },
                    });
                } catch {
                    // Detection cooldown remains intact even if delivery fails.
                }

                result.writesCount++;
                result.newStalenessDetected++;

            } catch (storeError: any) {
                result.errors++;
                analyticsLogger.warn('[StalenessCheck] Error processing store', {
                    storeId: getAnalyticsIdContext(sId),
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
    } catch (error: any) {
        analyticsLogger.error('[StalenessCheck] Fatal error', {
            error: getAnalyticsErrorContext(error),
        });
        throw error;
    }
}
