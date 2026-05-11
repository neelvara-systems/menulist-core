/**
 * Scheduled Functions (Cron Jobs)
 * ═══════════════════════════════════════════════════════════════
 * 
 * All onSchedule functions in one place.
 * These run on a fixed schedule regardless of environment.
 */

import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { SECRET_GROUPS } from '../config/secrets';
import { cleanupExpiredPreviewJobsLogic, cleanupOldJobsLogic, cleanupStuckCancellingJobsLogic, cleanupStuckJobsLogic, monitorExtractionHealthLogic } from '../schedulers/menuJobCleanup';
import { createAlert } from '../monitoring/alerts';

// ═══════════════════════════════════════════════════════════════
// MENU JOB CLEANUP
// ═══════════════════════════════════════════════════════════════

// Cleanup stuck jobs every 15 minutes (Section 8.2)
export const cleanupStuckMenuJobs = onSchedule({
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
}, async () => {
    const logger = functions.logger;
    try {
        const stuckResult = await cleanupStuckJobsLogic();
        const expiredResult = await cleanupExpiredPreviewJobsLogic();
        const cancellingResult = await cleanupStuckCancellingJobsLogic();
        await monitorExtractionHealthLogic();

        if (stuckResult.cleaned > 0) {
            await createAlert({
                tId: 'system',
                sId: 'system',
                type: 'health',
                severity: 'warning',
                title: 'Extraction Job Stuck',
                message: `Marked ${stuckResult.cleaned} extraction job(s) as failed after processing timeout.`,
                metadata: {
                    subsystem: 'ai-extraction',
                    cleanedJobs: stuckResult.cleaned,
                    sampleJobIds: stuckResult.jobIds.slice(0, 5),
                },
                actionRequired: true,
            });
        }

        const totalCleaned = stuckResult.cleaned + expiredResult.cleaned + cancellingResult.cleaned;
        if (totalCleaned > 0) {
            logger.info('[cleanupStuckMenuJobs] Completed', {
                stuck: stuckResult.cleaned,
                expiredPreviews: expiredResult.cleaned,
                stuckCancelling: cancellingResult.cleaned,
            });
        }
    } catch (error: any) {
        logger.error('[cleanupStuckMenuJobs] Failed', { error: error.message });
    }
});

// Cleanup old completed/failed jobs daily (Section 8.7)
export const cleanupOldMenuJobs = onSchedule({
    schedule: '0 3 * * *', // Daily at 3 AM UTC
    timeZone: 'UTC',
    region: 'us-central1',
}, async () => {
    const logger = functions.logger;
    try {
        const result = await cleanupOldJobsLogic();
        logger.info('[cleanupOldMenuJobs] Completed', result);
    } catch (error: any) {
        logger.error('[cleanupOldMenuJobs] Failed', { error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// MESSAGING ONBOARDING SCHEDULERS
// ═══════════════════════════════════════════════════════════════

import { intakeProcessorLogic } from '../messagingOnboarding';
import { messagingSessionCleanupLogic } from '../schedulers/messagingSessionCleanup';

// Intake processor — checks intake windows, triggers asset validation + extraction
// Runs every 2 minutes (impl.md §7 Phase 2)
export const msgIntakeProcessor = onSchedule({
    schedule: 'every 2 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '1GiB' as const,
    timeoutSeconds: 120,
    secrets: [...SECRET_GROUPS.AI, ...SECRET_GROUPS.WHATSAPP_OUTBOUND],
}, async () => {
    try {
        const result = await intakeProcessorLogic();
        if (result.processed > 0 || result.errors > 0) {
            functions.logger.info('[msgIntakeProcessor] Completed', result);
        }
    } catch (error: any) {
        functions.logger.error('[msgIntakeProcessor] Failed', { error: error.message });
    }
});

// Session cleanup — expiry, reminders, storage cleanup
// Runs daily at 4 AM UTC (impl.md §7 Phase 4)
export const msgSessionCleanup = onSchedule({
    schedule: '0 4 * * *', // Daily at 4 AM UTC
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '512MiB' as const,
    timeoutSeconds: 300,
    secrets: SECRET_GROUPS.WHATSAPP_OUTBOUND,
}, async () => {
    try {
        const result = await messagingSessionCleanupLogic();
        if (result.expired > 0 || result.reminders > 0 || result.cleaned > 0) {
            functions.logger.info('[msgSessionCleanup] Completed', result);
        }
    } catch (error: any) {
        functions.logger.error('[msgSessionCleanup] Failed', { error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// ALERT ESCALATION
// Re-alerts for unacknowledged critical alerts after 30 minutes.
// @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
// ═══════════════════════════════════════════════════════════════

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { sendTelegramAlert } from '../monitoring/telegramAlert';

export const alertEscalation = onSchedule(
    { schedule: 'every 30 minutes', region: 'us-central1', memory: '128MiB' as const },
    async () => {
        const logger = functions.logger;

        try {
            const { isAlertsMuted } = await import('../monitoring/deployMute');
            const muted = await isAlertsMuted();
            if (muted) {
                logger.info('[AlertEscalation] Alerts muted — skipping');
                return;
            }

            // Find critical alerts older than 30 min that are unacknowledged
            const thirtyMinAgo = Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
            const snapshot = await db
                .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
                .where('severity', '==', 'critical')
                .where('acknowledged', '==', false)
                .where('timestamp', '<=', thirtyMinAgo)
                .limit(5)
                .get();

            if (snapshot.empty) {
                logger.info('[AlertEscalation] No unacknowledged critical alerts');
                return;
            }

            for (const doc of snapshot.docs) {
                const alert = doc.data();
                await sendTelegramAlert({
                    severity: 'critical',
                    title: `⏰ STILL UNRESOLVED: ${alert.title}`,
                    message: `This critical alert has been unacknowledged for 30+ minutes.\n\n${alert.message}\n\nOriginal time: ${alert.timestamp?.toDate?.()?.toISOString() || 'unknown'}`,
                    metadata: { alertId: doc.id, storeId: alert.sId, tenantId: alert.tId },
                });
            }

            logger.warn(`[AlertEscalation] Sent ${snapshot.size} escalation(s)`);
        } catch (error: any) {
            logger.error('[AlertEscalation] Error:', error);
        }
    },
);

// ═══════════════════════════════════════════════════════════════
// CANONICA NIGHTLY — SEPARATE PRODUCT SCHEDULER
// ═══════════════════════════════════════════════════════════════
// Canonica nightly batch is owned by functions-canonica/ and deploys
// to the Canonica Firebase project. Do not register it in MenuList
// schedulers or decisionBlocksScoring.ts.
//
// @see functions-canonica/src/index.ts
// @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
// @see __docs__/canonica/doctrine/08-product-separation-playbook.md
// ═══════════════════════════════════════════════════════════════
