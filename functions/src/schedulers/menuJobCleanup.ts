/**
 * Menu Image Processing Job Cleanup Schedulers
 * 
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 8.2 and 8.7
 * 
 * Two scheduled functions:
 * 1. cleanupStuckJobs - Runs every 15 min, marks stuck jobs as failed
 * 2. cleanupOldJobs - Runs daily, deletes old completed/failed jobs
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import { createAlert } from "../monitoring/alerts";
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from "../sharedData/platformNotificationRegistry";
import {
    MENU_IMAGE_PROCESSING_JOBS_COLLECTION,
    MENU_PROCESSING_STATUS,
} from "../types";

const EXTRACTION_ALERT_SCOPE = {
    tId: 'system',
    sId: 'system',
} as const;

const EXTRACTION_ALERT_TITLES = {
    failureSpike: 'Extraction Failure Rate Spike',
    qualityDrop: 'Extraction Quality Degraded',
    stuckJob: 'Extraction Job Stuck',
} as const;

async function shouldCreateExtractionAlert(title: string, cooldownMinutes: number): Promise<boolean> {
    const cooldownDate = new Date();
    cooldownDate.setMinutes(cooldownDate.getMinutes() - cooldownMinutes);

    const existing = await firestoreAdmin
        .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
        .where('tId', '==', EXTRACTION_ALERT_SCOPE.tId)
        .where('sId', '==', EXTRACTION_ALERT_SCOPE.sId)
        .where('title', '==', title)
        .where('timestamp', '>=', Timestamp.fromDate(cooldownDate))
        .limit(1)
        .get();

    return existing.empty;
}

async function createExtractionAlert(params: {
    title: string;
    severity: 'warning' | 'critical';
    message: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const triggerType = params.title === EXTRACTION_ALERT_TITLES.stuckJob
        ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.JOB_STUCK
        : PLATFORM_NOTIFICATION_TRIGGER_TYPES.EXTRACTION_FAILURE_SPIKE;

    await createAlert({
        ...EXTRACTION_ALERT_SCOPE,
        type: 'health',
        severity: params.severity,
        title: params.title,
        message: params.message,
        metadata: {
            subsystem: 'ai-extraction',
            ...params.metadata,
        },
        triggerType,
        productId: 'ML',
        category: 'extraction',
        actionRequired: true,
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP STUCK JOBS (Section 8.2)
// Runs every 15 minutes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find jobs that are stuck in "processing" state past their timeout
 * and mark them as failed with retryable error.
 */
export async function cleanupStuckJobsLogic(): Promise<{ cleaned: number; jobIds: string[] }> {
    const logger = functions.logger;

    logger.info('[cleanupStuckJobs] Starting cleanup');

    const stuckJobs = await firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .where('status', '==', MENU_PROCESSING_STATUS.PROCESSING)
        .where('timeoutAt', '<', Timestamp.now())
        .limit(100)
        .get();

    if (stuckJobs.empty) {
        logger.info('[cleanupStuckJobs] No stuck jobs found');
        return { cleaned: 0, jobIds: [] };
    }

    const batch = firestoreAdmin.batch();
    const jobIds = stuckJobs.docs.map((doc) => doc.id);

    stuckJobs.docs.forEach((doc) => {
        batch.update(doc.ref, {
            status: MENU_PROCESSING_STATUS.FAILED,
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            error: {
                code: 'TIMEOUT',
                message: 'Job timed out during processing',
                retryable: true,
            },
        });
    });

    await batch.commit();

    logger.info(`[cleanupStuckJobs] Marked ${stuckJobs.size} stuck jobs as failed`);

    return { cleaned: stuckJobs.size, jobIds };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP EXPIRED PREVIEW_READY JOBS
// Runs every 15 minutes (alongside stuck job cleanup)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find preview_ready jobs past their expiresAt TTL and mark them as failed.
 * These are re-extraction jobs the user never approved within 24 hours.
 */
export async function cleanupExpiredPreviewJobsLogic(): Promise<{ cleaned: number }> {
    const logger = functions.logger;

    logger.info('[cleanupExpiredPreviewJobs] Starting cleanup');

    const expiredJobs = await firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .where('status', '==', MENU_PROCESSING_STATUS.PREVIEW_READY)
        .where('expiresAt', '<', Timestamp.now())
        .limit(100)
        .get();

    if (expiredJobs.empty) {
        logger.info('[cleanupExpiredPreviewJobs] No expired preview jobs found');
        return { cleaned: 0 };
    }

    const batch = firestoreAdmin.batch();

    expiredJobs.docs.forEach((doc) => {
        batch.update(doc.ref, {
            status: MENU_PROCESSING_STATUS.FAILED,
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            error: {
                code: 'PREVIEW_EXPIRED',
                message: 'Re-extraction preview expired (24h TTL). Please re-extract if needed.',
                retryable: true,
            },
        });
    });

    await batch.commit();

    logger.info(`[cleanupExpiredPreviewJobs] Marked ${expiredJobs.size} expired preview jobs as failed`);

    return { cleaned: expiredJobs.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP STUCK CANCELLING JOBS
// Runs every 15 minutes (alongside stuck job cleanup)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find jobs stuck in 'cancelling' state for more than 10 minutes.
 * Edge case: user cancels, CF already finished or crashed before checking.
 */
export async function cleanupStuckCancellingJobsLogic(): Promise<{ cleaned: number }> {
    const logger = functions.logger;

    const cutoff = Timestamp.fromMillis(Date.now() - 10 * 60 * 1000); // 10 min ago

    const stuckCancelling = await firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .where('status', '==', MENU_PROCESSING_STATUS.CANCELLING)
        .where('updatedAt', '<', cutoff)
        .limit(100)
        .get();

    if (stuckCancelling.empty) {
        return { cleaned: 0 };
    }

    const batch = firestoreAdmin.batch();

    stuckCancelling.docs.forEach((doc) => {
        batch.update(doc.ref, {
            status: MENU_PROCESSING_STATUS.CANCELLED,
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    });

    await batch.commit();

    logger.info(`[cleanupStuckCancellingJobs] Resolved ${stuckCancelling.size} stuck cancelling jobs`);

    return { cleaned: stuckCancelling.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP OLD JOBS (Section 8.7)
// Runs every 24 hours
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Delete jobs older than 7 days that are in a terminal state
 * (completed, failed, cancelled).
 */
export async function cleanupOldJobsLogic(): Promise<{ deleted: number }> {
    const logger = functions.logger;

    logger.info('[cleanupOldJobs] Starting cleanup');

    // 7 days ago
    const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const oldJobs = await firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .where('status', 'in', [
            MENU_PROCESSING_STATUS.COMPLETED,
            MENU_PROCESSING_STATUS.FAILED,
            MENU_PROCESSING_STATUS.CANCELLED,
        ])
        .where('completedAt', '<', cutoff)
        .limit(500) // Batch delete limit
        .get();

    if (oldJobs.empty) {
        logger.info('[cleanupOldJobs] No old jobs found');
        return { deleted: 0 };
    }

    const batch = firestoreAdmin.batch();
    oldJobs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`[cleanupOldJobs] Deleted ${oldJobs.size} old jobs`);

    return { deleted: oldJobs.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION HEALTH ALERTING
// Piggybacks on the same 15-minute scheduler as cleanup.
// ═══════════════════════════════════════════════════════════════════════════

export async function monitorExtractionHealthLogic(): Promise<void> {
    const logger = functions.logger;
    const jobsRef = firestoreAdmin.collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION);

    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const last50CompletedQuery = jobsRef
        .where('status', 'in', [MENU_PROCESSING_STATUS.COMPLETED, MENU_PROCESSING_STATUS.PREVIEW_READY])
        .orderBy('createdAt', 'desc')
        .limit(50);
    const lastHourJobsQuery = jobsRef
        .where('createdAt', '>=', oneHourAgo)
        .orderBy('createdAt', 'desc')
        .limit(200);

    const [recentCompletedSnap, lastHourSnap] = await Promise.all([
        last50CompletedQuery.get(),
        lastHourJobsQuery.get(),
    ]);

    const recentCompleted = recentCompletedSnap.docs.map((doc) => doc.data());
    const recentJobs = lastHourSnap.docs.map((doc) => doc.data());

    const qualityScores = recentCompleted
        .map((job) => job.result?.qualityScore)
        .filter((score): score is number => typeof score === 'number');

    if (qualityScores.length >= 10) {
        const avgQualityScore = Math.round(
            qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        );

        if (avgQualityScore < 55 && await shouldCreateExtractionAlert(EXTRACTION_ALERT_TITLES.qualityDrop, 60)) {
            await createExtractionAlert({
                title: EXTRACTION_ALERT_TITLES.qualityDrop,
                severity: avgQualityScore < 40 ? 'critical' : 'warning',
                message: `Average extraction quality dropped to ${avgQualityScore}/100 across the last ${qualityScores.length} completed jobs.`,
                metadata: {
                    avgQualityScore,
                    sampledJobs: qualityScores.length,
                },
            });
        }
    }

    const totalJobs = recentJobs.length;
    const failedJobs = recentJobs.filter((job) => job.status === MENU_PROCESSING_STATUS.FAILED).length;
    const failureRate = totalJobs > 0 ? Math.round((failedJobs / totalJobs) * 100) : 0;

    if (totalJobs >= 5 && failureRate > 5 && await shouldCreateExtractionAlert(EXTRACTION_ALERT_TITLES.failureSpike, 60)) {
        await createExtractionAlert({
            title: EXTRACTION_ALERT_TITLES.failureSpike,
            severity: failureRate >= 20 ? 'critical' : 'warning',
            message: `Extraction failure rate reached ${failureRate}% in the last hour (${failedJobs} failed out of ${totalJobs} jobs).`,
            metadata: {
                failureRate,
                failedJobs,
                totalJobs,
            },
        });
    }

    logger.info('[monitorExtractionHealth] Completed', {
        recentCompletedJobs: recentCompleted.length,
        recentJobsLastHour: totalJobs,
        failureRate,
    });
}
