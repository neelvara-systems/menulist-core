/**
 * Menu Image Processing Job Cleanup Schedulers
 * 
 * Spec Reference: menu-image-processing-job-queue-spec.md Section 8.2 and 8.7
 * 
 * Two scheduled functions:
 * 1. cleanupStuckJobs - Runs every 15 min, marks stuck jobs as failed
 * 2. cleanupOldJobs - Runs daily, deletes old completed/failed jobs
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from "../constants/database";
import { FUNCTION_RETENTION_CONFIG } from "../constants/features";
import { firestoreAdmin, storageAdmin } from "../firebaseAdmin";
import { createAlert } from "../monitoring/alerts";
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from "../sharedData/platformNotificationRegistry";
import {
    MENU_IMAGE_PROCESSING_JOBS_COLLECTION,
    MENU_PROCESSING_STATUS,
} from "../types";
import { buildExtractionResultSummary } from "../utils/menuExtractionResultSummary";
import {
    getMenuLinkImportArtifactCleanupDecision,
    getMenuLinkImportArtifactJobLookupId,
} from './menuLinkImportArtifactRetention';
import { getBoundedFunctionsErrorCode, getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

const MENU_JOB_RETENTION_DAYS = 7;
const MENU_LINK_IMPORT_ARTIFACT_CLEANUP_LIMIT = 100;
const MENU_LINK_IMPORT_ARTIFACT_DELETE_FAILED_CODE = 'MENU_LINK_IMPORT_ARTIFACT_DELETE_FAILED';
const MENU_LINK_IMPORT_ARTIFACT_INVALID_CODE = 'MENU_LINK_IMPORT_ARTIFACT_INVALID';

const EXTRACTION_ALERT_SCOPE = {
    tId: 'system',
    sId: 'system',
} as const;

const EXTRACTION_ALERT_TITLES = {
    failureSpike: 'Extraction Failure Rate Spike',
    qualityDrop: 'Extraction Quality Degraded',
    stuckJob: 'Extraction Job Stuck',
} as const;

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
export async function cleanupStuckJobsLogic(): Promise<{
    cleaned: number;
    sampleJobCount: number;
    sampleJobIdLengthTotal: number;
}> {
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
        return {
            cleaned: 0,
            sampleJobCount: 0,
            sampleJobIdLengthTotal: 0,
        };
    }

    const batch = firestoreAdmin.batch();
    const sampleJobIds = stuckJobs.docs.slice(0, 5).map((doc) => doc.id);

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

    return {
        cleaned: stuckJobs.size,
        sampleJobCount: sampleJobIds.length,
        sampleJobIdLengthTotal: sampleJobIds.reduce((total, jobId) => total + jobId.length, 0),
    };
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

    const cutoff = Timestamp.fromMillis(Date.now() - MENU_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000);

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

/**
 * Delete private link-import sources after the same seven-day window as their
 * terminal extraction jobs. Storage is deleted before the metadata document so
 * a failed delete leaves a durable retry record instead of an orphaned object.
 */
export async function cleanupOldMenuLinkImportArtifactsLogic(): Promise<{
    deletedArtifacts: number;
    deletedFiles: number;
    errors: number;
    scanned: number;
    skippedActive: number;
}> {
    const logger = functions.logger;
    const cutoff = Timestamp.fromMillis(Date.now() - MENU_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const artifactSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.MENU_LINK_IMPORT_ARTIFACTS)
        .where('createdAt', '<', cutoff)
        .limit(MENU_LINK_IMPORT_ARTIFACT_CLEANUP_LIMIT)
        .get();

    if (artifactSnapshot.empty) {
        return { deletedArtifacts: 0, deletedFiles: 0, errors: 0, scanned: 0, skippedActive: 0 };
    }

    const jobSnapshots = await firestoreAdmin.getAll(...artifactSnapshot.docs.map((doc) => {
        const jobId = getMenuLinkImportArtifactJobLookupId(doc.data().jobId) || doc.id;
        return firestoreAdmin.collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION).doc(jobId);
    }));
    const batch = firestoreAdmin.batch();
    const bucket = storageAdmin.bucket();
    let deletedArtifacts = 0;
    let deletedFiles = 0;
    let errors = 0;
    let skippedActive = 0;

    for (let index = 0; index < artifactSnapshot.docs.length; index += 1) {
        const artifactDoc = artifactSnapshot.docs[index];
        const jobSnapshot = jobSnapshots[index];
        const decision = getMenuLinkImportArtifactCleanupDecision({
            artifactId: artifactDoc.id,
            artifact: artifactDoc.data(),
            job: jobSnapshot.exists ? jobSnapshot.data() || {} : null,
        });

        if (!decision.eligible) {
            if (decision.reason === 'active_job') {
                skippedActive += 1;
                continue;
            }
            errors += 1;
            logger.warn('[cleanupOldMenuLinkImportArtifacts] Rejected unsafe artifact cleanup', {
                artifactIdLength: artifactDoc.id.length,
                failureCode: MENU_LINK_IMPORT_ARTIFACT_INVALID_CODE,
                reason: decision.reason,
            });
            continue;
        }

        try {
            await bucket.file(decision.storagePath).delete({ ignoreNotFound: true });
            deletedFiles += 1;
        } catch (error) {
            errors += 1;
            logger.warn('[cleanupOldMenuLinkImportArtifacts] Failed to delete source artifact', {
                artifactIdLength: artifactDoc.id.length,
                failureCode: MENU_LINK_IMPORT_ARTIFACT_DELETE_FAILED_CODE,
                sourceErrorCode: getBoundedFunctionsErrorCode(error),
                sourceErrorName: getBoundedFunctionsErrorName(error) || 'UnknownError',
            });
            // Preserve the artifact metadata as the durable retry record. Deleting it
            // here would orphan the private Storage object permanently.
            continue;
        }

        batch.delete(artifactDoc.ref);
        deletedArtifacts += 1;
    }

    if (deletedArtifacts > 0) {
        await batch.commit();
    }

    return {
        deletedArtifacts,
        deletedFiles,
        errors,
        scanned: artifactSnapshot.size,
        skippedActive,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRUNE HEAVY COMPLETED PROJECT JOB PAYLOADS
// Runs daily before old terminal-job deletion.
// ═══════════════════════════════════════════════════════════════════════════

export async function pruneCompletedProjectJobPayloadsLogic(): Promise<{ pruned: number }> {
    const logger = functions.logger;
    const now = Timestamp.now();
    const cutoff = Timestamp.fromMillis(
        Date.now() - FUNCTION_RETENTION_CONFIG.MENU_EXTRACTION_DETAIL_RETENTION_HOURS * 60 * 60 * 1000,
    );

    const snapshot = await firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .where('status', '==', MENU_PROCESSING_STATUS.COMPLETED)
        .where('completedAt', '<', cutoff)
        .limit(500)
        .get();

    if (snapshot.empty) {
        return { pruned: 0 };
    }

    const batch = firestoreAdmin.batch();
    let pruned = 0;

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const destinationType = data.destinationType || data.destination?.type;
        const result = data.result || {};

        if (!result.combinedData) return;
        if (data.skipProjectSave === true) return;
        if (destinationType && destinationType !== 'project') return;
        if (data.isFirstExtraction !== true) return;

        batch.update(doc.ref, {
            'result.combinedData': FieldValue.delete(),
            'result.rawBatchResponses': FieldValue.delete(),
            'result.redistributedFiles': FieldValue.delete(),
            'result.summary': result.summary || buildExtractionResultSummary(
                result.combinedData,
                result.confidenceSummary,
                result.extractedBusinessProfile,
            ),
            'result.dataPrunedAt': now,
            'result.dataPrunedReason': 'project_auto_saved',
            detailPrunedAt: now,
            detailPrunedReason: 'summary_retained_after_detail_window',
            updatedAt: now,
        });
        pruned += 1;
    });

    if (pruned === 0) {
        return { pruned: 0 };
    }

    await batch.commit();
    logger.info('[pruneCompletedProjectJobPayloads] Pruned completed project job payloads', { pruned });
    return { pruned };
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

        if (avgQualityScore < 55) {
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

    if (totalJobs >= 5 && failureRate > 5) {
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
