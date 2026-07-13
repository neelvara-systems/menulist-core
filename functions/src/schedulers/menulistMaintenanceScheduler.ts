/**
 * MenuList Maintenance Scheduler
 *
 * One high-frequency scheduled function owns lightweight operational
 * maintenance. Each task keeps its own cadence and Firestore lease so retries
 * or overlapping scheduler ticks cannot duplicate sends, cleanup, or alerts.
 */

import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { aggregateDailyChatStatsLogic } from '../aggregateDailyChatStats';
import {
    normalizeScopeDocumentId,
    normalizeSubscriptionDocumentId,
    reconcileSubscriptions,
    syncStorePlanEntitlement,
} from '../billing/reconcileSubscriptions';
import { SECRET_GROUPS } from '../config/secrets';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_RETENTION_CONFIG, isFunctionFeatureEnabled } from '../constants/features';
import { firestoreAdmin as db, storageAdmin } from '../firebaseAdmin';
import { createAlert } from '../monitoring/alerts';
import { isAlertsMuted } from '../monitoring/deployMute';
import { sendPlatformAlertDelivery } from '../monitoring/platformNotificationDelivery';
import { sendTelegramAlert } from '../monitoring/telegramAlert';
import { intakeProcessorLogic } from '../messagingOnboarding';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';
import { parsePlatformStoreSummary } from '../sharedData/storeSummaryBoundary';
import { runAiProviderHealthCheckLogic } from './aiProviderHealth';
import { recoverAiCapacityReservationsInCollectionRef } from './aiCapacityReservationRecovery';
import { rebuildFounderMonitorSnapshotLogic } from './founderMonitorSnapshot';
import {
    cleanupExpiredPreviewJobsLogic,
    cleanupOldJobsLogic,
    pruneCompletedProjectJobPayloadsLogic,
    cleanupStuckCancellingJobsLogic,
    cleanupStuckJobsLogic,
    monitorExtractionHealthLogic,
} from './menuJobCleanup';
import { messagingSessionCleanupLogic } from './messagingSessionCleanup';
import {
    filterProjectReferencedImageBatchUrls,
    getImageBatchImageUrls,
    getImageBatchStorageCleanupUrls,
    shouldDeleteImageBatchStorage,
} from './imageBatchRetentionBoundary';

const logger = functions.logger;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SCHEDULER_NAME = 'menulistMaintenanceScheduler';
const STATE_DOC_ID = 'menulistMaintenanceScheduler';
const LOCK_DOC_PREFIX = 'menulistMaintenanceTaskLock_';
const MAX_DETAILS_JSON_BYTES = 12_000;
const SCHEDULER_ALERT_CREATE_FAILED_CODE = 'MAINTENANCE_SCHEDULER_ALERT_CREATE_FAILED';
const SCHEDULER_LEASE_RELEASE_FAILED_CODE = 'MAINTENANCE_TASK_LEASE_RELEASE_FAILED';
const PUBLIC_MENU_DRAFT_IMAGE_DELETE_FAILED_CODE = 'PUBLIC_MENU_DRAFT_IMAGE_DELETE_FAILED';
const PUBLIC_MENU_DRAFT_IMAGE_PATH_INVALID_CODE = 'PUBLIC_MENU_DRAFT_IMAGE_PATH_INVALID';
const RESELLER_LICENSE_EXPIRE_FAILED_CODE = 'RESELLER_LICENSE_EXPIRE_FAILED';
const IMAGE_BATCH_STORAGE_DELETE_FAILED_CODE = 'IMAGE_BATCH_STORAGE_DELETE_FAILED';
const IMAGE_BATCH_PROJECT_REFERENCE_CHECK_FAILED_CODE = 'IMAGE_BATCH_PROJECT_REFERENCE_CHECK_FAILED';
const IMAGE_PROMPT_CACHE_SOURCE_DELETE_FAILED_CODE = 'IMAGE_PROMPT_CACHE_SOURCE_DELETE_FAILED';
const AI_OPERATION_STORE_CLEANUP_FAILED_CODE = 'AI_OPERATION_STORE_CLEANUP_FAILED';
const UNRESOLVED_CRITICAL_ALERT_TITLE = 'Still unresolved: Critical system alert';
const UNRESOLVED_CRITICAL_ALERT_MESSAGE =
    'A critical platform alert has been unacknowledged for 30+ minutes. Review the alert record in the ops console; outbound escalation includes bounded metadata only.';
const IMAGE_BATCH_TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'finished', 'discarded'];
const IMAGE_BATCH_RETENTION_STORE_SCAN_LIMIT = 200;
const IMAGE_BATCH_RETENTION_LIMIT_PER_STORE = 10;
const IMAGE_BATCH_LEGACY_RETENTION_LIMIT_PER_STORE = 5;
const IMAGE_PROMPT_CACHE_STORAGE_PREFIX = 'system/aiImagePromptCache/';
const IMAGE_PROMPT_CACHE_CLEANUP_LIMIT = 25;

type TaskStatus = 'success' | 'failed' | 'skipped';

type TaskCadence =
    | { type: 'every'; minutes: number }
    | { type: 'daily'; hourUtc: number; minuteUtc: number; retryAfterMinutes: number };

interface MaintenanceTaskResult {
    activity?: boolean;
    details?: Record<string, unknown>;
}

interface MaintenanceTask {
    name: string;
    cadence: TaskCadence;
    lockTtlMs: number;
    run: () => Promise<MaintenanceTaskResult>;
}

interface StoredTaskState {
    lastAttemptAt?: Timestamp;
    lastAttemptBucket?: number;
    lastAttemptDayKey?: string;
    lastCompletedAt?: Timestamp;
    lastCompletedBucket?: number;
    lastCompletedDayKey?: string;
    lastStatus?: TaskStatus | 'running';
}

interface SchedulerState {
    tasks?: Record<string, StoredTaskState>;
}

interface TaskSummary {
    name: string;
    status: TaskStatus;
    durationMs: number;
    activity: boolean;
    details?: Record<string, unknown>;
    error?: string;
}

const maintenanceSecrets = Array.from(new Set([
    ...SECRET_GROUPS.AI,
    ...SECRET_GROUPS.RAZORPAY,
    ...SECRET_GROUPS.WHATSAPP_OUTBOUND,
    ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
]));

function getIntervalBucket(date: Date, minutes: number): number {
    return Math.floor(date.getTime() / (minutes * MINUTE_MS));
}

function getUtcDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function getDailyTargetMillis(date: Date, hourUtc: number, minuteUtc: number): number {
    return Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hourUtc,
        minuteUtc,
        0,
        0,
    );
}

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const millis = Date.parse(value);
        return Number.isFinite(millis) ? millis : null;
    }
    try {
        if (typeof (value as any).toMillis === 'function') {
            const millis = Number((value as any).toMillis());
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof (value as any).seconds === 'number') {
            const millis = (value as any).seconds * 1000;
            return Number.isFinite(millis) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

function normalizeMaintenanceDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    if (
        !value
        || value !== value.trim()
        || value.length > 180
        || value === '.'
        || value === '..'
        || value.includes('/')
        || value.includes('\0')
        || /^__.*__$/.test(value)
    ) return null;
    return value;
}

function shouldRunTask(task: MaintenanceTask, state: StoredTaskState | undefined, now: Date): boolean {
    if (task.cadence.type === 'every') {
        const bucket = getIntervalBucket(now, task.cadence.minutes);
        return state?.lastAttemptBucket !== bucket;
    }

    const dayKey = getUtcDayKey(now);
    if (state?.lastCompletedDayKey === dayKey) {
        return false;
    }

    const targetMillis = getDailyTargetMillis(now, task.cadence.hourUtc, task.cadence.minuteUtc);
    if (now.getTime() < targetMillis) {
        return false;
    }

    const lastAttemptAt = timestampMillis(state?.lastAttemptAt);
    if (
        state?.lastAttemptDayKey === dayKey &&
        lastAttemptAt &&
        now.getTime() - lastAttemptAt < task.cadence.retryAfterMinutes * MINUTE_MS
    ) {
        return false;
    }

    return true;
}

function compactDetails(details: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!details) return {};
    const sanitized = JSON.parse(JSON.stringify(details));
    const json = JSON.stringify(sanitized);
    if (json.length <= MAX_DETAILS_JSON_BYTES) return sanitized;

    return {
        truncated: true,
        originalBytes: json.length,
    };
}

function getTaskFailureCode(taskName: string): string {
    const suffix = taskName
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64) || 'UNKNOWN';

    return `MAINTENANCE_TASK_FAILED_${suffix}`;
}

function getSchedulerErrorName(error: unknown): string {
    if (error instanceof Error) return (error.name || 'Error').slice(0, 80);
    return typeof error;
}

function getSchedulerErrorCode(error: Error): string | undefined {
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
}

function getSchedulerErrorStatus(error: Error): number | undefined {
    const status = Number((error as { status?: unknown; statusCode?: unknown }).status
        || (error as { statusCode?: unknown }).statusCode);
    return Number.isFinite(status) ? status : undefined;
}

function getSchedulerErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode?: string;
    sourceErrorStatus?: number;
} {
    if (error instanceof Error) {
        return {
            sourceErrorName: getSchedulerErrorName(error),
            sourceErrorCode: getSchedulerErrorCode(error),
            sourceErrorStatus: getSchedulerErrorStatus(error),
        };
    }

    return {
        sourceErrorName: getSchedulerErrorName(error),
    };
}

function getSchedulerStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getUnresolvedCriticalAlertMetadata(docId: string, alert: Record<string, any>): Record<string, unknown> {
    const alertTimestamp = alert.timestamp?.toDate?.()?.toISOString?.() || '';
    return {
        ...getSchedulerStringContext('alertId', docId),
        ...getSchedulerStringContext('storeId', alert.sId),
        ...getSchedulerStringContext('tenantId', alert.tId),
        ...getSchedulerStringContext('alertTitle', alert.title),
        ...getSchedulerStringContext('alertMessage', alert.message),
        ...getSchedulerStringContext('alertTimestamp', alertTimestamp),
    };
}

async function acquireTaskLease(
    task: MaintenanceTask,
    runId: string,
    now: Date,
): Promise<{ leaseId: string } | null> {
    const leaseId = `${runId}_${task.name}`;
    const lockRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(`${LOCK_DOC_PREFIX}${task.name}`);
    const nowTs = Timestamp.fromDate(now);
    const expiresAt = Timestamp.fromMillis(now.getTime() + task.lockTtlMs);

    const acquired = await db.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        const lock = lockSnapshot.data() || {};
        const leaseExpiresAt = timestampMillis(lock.leaseExpiresAt);

        if (lock.leaseOwner && leaseExpiresAt && leaseExpiresAt > now.getTime()) {
            return false;
        }

        transaction.set(
            lockRef,
            {
                taskName: task.name,
                leaseOwner: leaseId,
                leaseRunId: runId,
                leaseStartedAt: nowTs,
                leaseExpiresAt: expiresAt,
                updatedAt: nowTs,
            },
            { merge: true },
        );
        return true;
    });

    return acquired ? { leaseId } : null;
}

async function releaseTaskLease(task: MaintenanceTask, leaseId: string): Promise<void> {
    const lockRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(`${LOCK_DOC_PREFIX}${task.name}`);
    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.data()?.leaseOwner !== leaseId) {
            return;
        }

        transaction.set(
            lockRef,
            {
                leaseOwner: null,
                leaseExpiresAt: Timestamp.fromMillis(0),
                lastReleasedAt: now,
                updatedAt: now,
            },
            { merge: true },
        );
    });
}

function cadenceStateUpdates(task: MaintenanceTask, now: Date, success: boolean): Record<string, unknown> {
    const updates: Record<string, unknown> = {};

    if (task.cadence.type === 'every') {
        const bucket = getIntervalBucket(now, task.cadence.minutes);
        updates.lastAttemptBucket = bucket;
        if (success) updates.lastCompletedBucket = bucket;
    } else {
        const dayKey = getUtcDayKey(now);
        updates.lastAttemptDayKey = dayKey;
        if (success) updates.lastCompletedDayKey = dayKey;
    }

    return updates;
}

async function recordTaskOutcome(params: {
    task: MaintenanceTask;
    runId: string;
    startedAt: Date;
    finishedAt: Date;
    status: TaskStatus;
    durationMs: number;
    details?: Record<string, unknown>;
    error?: string;
}): Promise<void> {
    const finishedTs = Timestamp.fromDate(params.finishedAt);
    const success = params.status === 'success';
    const cadenceUpdates = cadenceStateUpdates(params.task, params.startedAt, success);
    const stateRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(STATE_DOC_ID);

    const taskState: Record<string, unknown> = {
        lastRunId: params.runId,
        lastAttemptAt: Timestamp.fromDate(params.startedAt),
        lastFinishedAt: finishedTs,
        lastStatus: params.status,
        lastDurationMs: params.durationMs,
        lastDetails: compactDetails(params.details),
        ...cadenceUpdates,
    };

    if (success) {
        taskState.lastCompletedAt = finishedTs;
        taskState.lastError = null;
    } else if (params.error) {
        taskState.lastError = params.error;
    }

    await stateRef.set(
        {
            schedulerName: SCHEDULER_NAME,
            updatedAt: finishedTs,
            tasks: {
                [params.task.name]: taskState,
            },
        },
        { merge: true },
    );
}

async function persistMeaningfulRunLog(params: {
    runId: string;
    startedAt: Date;
    finishedAt: Date;
    summaries: TaskSummary[];
}): Promise<void> {
    const meaningful = params.summaries.some(
        (summary) => summary.status === 'failed' || summary.activity,
    );

    if (!meaningful) return;

    await db.collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS).add({
        scheduler: SCHEDULER_NAME,
        trigger: 'scheduled',
        triggeredBy: 'system',
        startedAt: Timestamp.fromDate(params.startedAt),
        completedAt: Timestamp.fromDate(params.finishedAt),
        expiresAt: Timestamp.fromMillis(
            params.startedAt.getTime() + FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS * DAY_MS,
        ),
        durationMs: params.finishedAt.getTime() - params.startedAt.getTime(),
        status: params.summaries.some((summary) => summary.status === 'failed') ? 'partial' : 'success',
        tasks: params.summaries.map((summary) => ({
            ...summary,
            details: compactDetails(summary.details),
        })),
    });
}

async function runTask(task: MaintenanceTask, runId: string, dueAt: Date): Promise<TaskSummary> {
    const lease = await acquireTaskLease(task, runId, dueAt);
    if (!lease) {
        return {
            name: task.name,
            status: 'skipped',
            durationMs: 0,
            activity: false,
            details: { reason: 'lease_held' },
        };
    }

    const startedAt = new Date();
    try {
        const result = await task.run();
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const details = compactDetails(result.details);

        await recordTaskOutcome({
            task,
            runId,
            startedAt,
            finishedAt,
            status: 'success',
            durationMs,
            details,
        });

        return {
            name: task.name,
            status: 'success',
            durationMs,
            activity: result.activity === true,
            details,
        };
    } catch (error) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();
        const failureCode = getTaskFailureCode(task.name);
        const errorContext = getSchedulerErrorContext(error);

        await recordTaskOutcome({
            task,
            runId,
            startedAt,
            finishedAt,
            status: 'failed',
            durationMs,
            error: failureCode,
        });

        logger.error(`[${SCHEDULER_NAME}] Task failed`, {
            task: task.name,
            failureCode,
            ...errorContext,
        });

        await createAlert({
            tId: 'system',
            sId: 'scheduler',
            type: 'health',
            severity: 'critical',
            title: 'Maintenance Scheduler Task Failed',
            message: `Task ${task.name} failed with code ${failureCode}. See bounded scheduler diagnostics.`,
            metadata: {
                schedulerName: SCHEDULER_NAME,
                taskName: task.name,
                ...getSchedulerStringContext('runId', runId),
                failureCode,
                ...errorContext,
            },
            triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SCHEDULER_FAILURE,
            productId: 'PLATFORM',
            category: 'scheduler',
            actionRequired: true,
        }).catch((alertError) => {
            logger.error(`[${SCHEDULER_NAME}] Failed to create scheduler failure alert`, {
                task: task.name,
                failureCode: SCHEDULER_ALERT_CREATE_FAILED_CODE,
                ...getSchedulerErrorContext(alertError),
            });
        });

        return {
            name: task.name,
            status: 'failed',
            durationMs,
            activity: true,
            error: failureCode,
        };
    } finally {
        await releaseTaskLease(task, lease.leaseId).catch((error) => {
            logger.error(`[${SCHEDULER_NAME}] Failed to release task lease`, {
                task: task.name,
                failureCode: SCHEDULER_LEASE_RELEASE_FAILED_CODE,
                ...getSchedulerErrorContext(error),
            });
        });
    }
}

async function runMessagingIntake(): Promise<MaintenanceTaskResult> {
    const result = await intakeProcessorLogic();
    return {
        activity: result.inboundProcessed > 0 || result.processed > 0 || result.errors > 0,
        details: result,
    };
}

async function runMenuStuckCleanup(): Promise<MaintenanceTaskResult> {
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
                sampleJobCount: stuckResult.sampleJobCount,
                sampleJobIdLengthTotal: stuckResult.sampleJobIdLengthTotal,
            },
            triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.JOB_STUCK,
            productId: 'ML',
            category: 'extraction',
            actionRequired: true,
        });
    }

    const totalCleaned = stuckResult.cleaned + expiredResult.cleaned + cancellingResult.cleaned;
    return {
        activity: totalCleaned > 0,
        details: {
            stuck: stuckResult.cleaned,
            expiredPreviews: expiredResult.cleaned,
            stuckCancelling: cancellingResult.cleaned,
        },
    };
}

async function runMenuOldCleanup(): Promise<MaintenanceTaskResult> {
    const pruneResult = await pruneCompletedProjectJobPayloadsLogic();
    const result = await cleanupOldJobsLogic();
    return {
        activity: pruneResult.pruned > 0 || result.deleted > 0,
        details: {
            ...result,
            prunedProjectPayloads: pruneResult.pruned,
        },
    };
}

async function runMessagingSessionCleanup(): Promise<MaintenanceTaskResult> {
    const result = await messagingSessionCleanupLogic();
    if (result.errors > 0) {
        throw new Error(`Messaging session cleanup completed with ${result.errors} error(s)`);
    }
    return {
        activity: result.expired > 0 ||
            result.reminders > 0 ||
            result.cleaned > 0 ||
            result.inboundCleaned > 0 ||
            result.errors > 0,
        details: result,
    };
}

async function runPublicMenuDraftCleanup(): Promise<MaintenanceTaskResult> {
    if (!isFunctionFeatureEnabled('ENABLE_PUBLIC_MENU_ENTRY')) {
        return {
            activity: false,
            details: { enabled: false, deletedDrafts: 0, deletedFiles: 0, errors: 0 },
        };
    }

    const snapshot = await db
        .collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)
        .where('claimed', '==', false)
        .where('expiresAt', '<', Timestamp.now())
        .limit(100)
        .get();

    if (snapshot.empty) {
        return {
            activity: false,
            details: { enabled: true, deletedDrafts: 0, deletedFiles: 0, errors: 0 },
        };
    }

    const batch = db.batch();
    let deletedDrafts = 0;
    let deletedFiles = 0;
    let errors = 0;
    let sampleDraftCount = 0;
    let sampleDraftIdLengthTotal = 0;
    const bucket = storageAdmin.bucket();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const imagePath = typeof data.imagePath === 'string' ? data.imagePath : '';
        if (imagePath) {
            if (!imagePath.startsWith(`publicMenuDrafts/${doc.id}/`)) {
                errors += 1;
                logger.warn('[public_menu_draft_cleanup] Rejected invalid draft image path', {
                    ...getSchedulerStringContext('draftId', doc.id),
                    failureCode: PUBLIC_MENU_DRAFT_IMAGE_PATH_INVALID_CODE,
                    imagePathLength: imagePath.length,
                });
                continue;
            }
            try {
                await bucket.file(imagePath).delete({ ignoreNotFound: true });
                deletedFiles += 1;
            } catch (error) {
                errors += 1;
                logger.warn('[public_menu_draft_cleanup] Failed to delete draft image', {
                    ...getSchedulerStringContext('draftId', doc.id),
                    failureCode: PUBLIC_MENU_DRAFT_IMAGE_DELETE_FAILED_CODE,
                    ...getSchedulerErrorContext(error),
                });
                // Preserve the draft as the durable retry record. Deleting it
                // here would orphan the source object permanently.
                continue;
            }
        }

        if (sampleDraftCount < 5) {
            sampleDraftCount += 1;
            sampleDraftIdLengthTotal += doc.id.length;
        }
        batch.delete(doc.ref);
        deletedDrafts += 1;
    }

    if (deletedDrafts > 0) {
        await batch.commit();
    }

    return {
        activity: snapshot.size > 0 || errors > 0,
        details: {
            enabled: true,
            deletedDrafts,
            deletedFiles,
            errors,
            sampleDraftCount,
            sampleDraftIdLengthTotal,
        },
    };
}

async function deleteExpiredDocs(params: {
    collection: string;
    now: Timestamp;
    limit?: number;
    kind?: string;
}): Promise<{ scanned: number; deleted: number }> {
    const snapshot = await db
        .collection(params.collection)
        .where('expiresAt', '<=', params.now)
        .limit(params.limit || 50)
        .get();
    const batch = db.batch();
    let deleted = 0;

    for (const doc of snapshot.docs) {
        if (params.kind && doc.data().kind !== params.kind) continue;
        batch.delete(doc.ref);
        deleted++;
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, deleted };
}

async function deleteLegacyFeedbackEvents(params: {
    now: Timestamp;
    limit?: number;
}): Promise<{ scanned: number; deleted: number; skipped: number }> {
    const cutoff = Timestamp.fromMillis(
        params.now.toMillis() - FUNCTION_RETENTION_CONFIG.FEEDBACK_EVENT_RETENTION_DAYS * DAY_MS,
    );
    const snapshot = await db
        .collection(DB_COLLECTIONS.FEEDBACK_EVENTS)
        .where('timestamp', '<=', cutoff)
        .limit(params.limit || 50)
        .get();
    const batch = db.batch();
    let deleted = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
        if (doc.data().expiresAt) {
            skipped++;
            continue;
        }
        batch.delete(doc.ref);
        deleted++;
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, deleted, skipped };
}

async function deleteLegacySchedulerRunLogs(params: {
    now: Timestamp;
    limit?: number;
}): Promise<{ scanned: number; deleted: number; skipped: number }> {
    const cutoff = Timestamp.fromMillis(
        params.now.toMillis() - FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS * DAY_MS,
    );
    const snapshot = await db
        .collection(DB_COLLECTIONS.SCHEDULER_RUN_LOGS)
        .where('startedAt', '<=', cutoff)
        .limit(params.limit || 50)
        .get();
    const batch = db.batch();
    let deleted = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
        if (doc.data().expiresAt) {
            skipped++;
            continue;
        }
        batch.delete(doc.ref);
        deleted++;
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, deleted, skipped };
}

async function deleteExpiredDocsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    limit?: number;
}): Promise<{ scanned: number; deleted: number }> {
    const snapshot = await params.collectionRef
        .where('expiresAt', '<=', params.now)
        .limit(params.limit || 25)
        .get();
    const batch = db.batch();
    let deleted = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        deleted++;
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, deleted };
}

async function compactAiOperationDetailsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    limit?: number;
}): Promise<{ scanned: number; compacted: number }> {
    const snapshot = await params.collectionRef
        .where('detailExpiresAt', '<=', params.now)
        .limit(params.limit || 25)
        .get();
    const batch = db.batch();
    let compacted = 0;

    for (const doc of snapshot.docs) {
        batch.update(doc.ref, {
            clientResponse: FieldValue.delete(),
            detailExpiresAt: FieldValue.delete(),
            detailPrunedAt: params.now,
            detailPrunedReason: 'retention_window_expired',
            files: FieldValue.delete(),
            geminiResponse: FieldValue.delete(),
            rawBatchResponses: FieldValue.delete(),
        });
        compacted++;
    }

    if (compacted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, compacted };
}

async function runAiOperationDetailCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
    const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
    const storeEntries = Object.entries(storesSummary)
        .filter(([, storeInfo]) => storeInfo.active !== false)
        .slice(0, 200);

    const extraction = await compactAiOperationDetailsInCollectionRef({
        collectionRef: db.collection(DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS),
        now,
        limit: 100,
    });

    let scanned = extraction.scanned;
    let compacted = extraction.compacted;
    let storesScanned = 0;
    let reservationsScanned = 0;
    let reservationsRefunded = 0;
    let refundedReservationsDeleted = 0;
    let storeErrors = 0;

    for (const [sId, storeInfo] of storeEntries) {
        const tId = storeInfo.tId;
        const operationCollection = db.collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS).doc(tId).collection(String(sId));
        try {
            const result = await compactAiOperationDetailsInCollectionRef({
                collectionRef: operationCollection,
                now,
                limit: 10,
            });
            scanned += result.scanned;
            compacted += result.compacted;
            const reservationResult = await recoverAiCapacityReservationsInCollectionRef({
                collectionRef: operationCollection,
                db,
                now,
                sId: String(sId),
                tId: String(tId),
                limit: 10,
            });
            reservationsScanned += reservationResult.scanned;
            reservationsRefunded += reservationResult.refunded;
            refundedReservationsDeleted += reservationResult.deleted;
            storeErrors += reservationResult.errors;
            if (reservationResult.errors > 0) {
                logger.warn('[ai_operation_detail_cleanup] Reservation rows failed recovery', {
                    failureCode: AI_OPERATION_STORE_CLEANUP_FAILED_CODE,
                    reservationErrors: reservationResult.errors,
                    ...getSchedulerStringContext('storeId', sId),
                    ...getSchedulerStringContext('tenantId', tId),
                });
            }
        } catch (error) {
            storeErrors += 1;
            logger.warn('[ai_operation_detail_cleanup] Store cleanup failed', {
                failureCode: AI_OPERATION_STORE_CLEANUP_FAILED_CODE,
                ...getSchedulerStringContext('storeId', sId),
                ...getSchedulerStringContext('tenantId', tId),
                ...getSchedulerErrorContext(error),
            });
        }
        storesScanned += 1;
    }

    return {
        activity: compacted > 0 || reservationsRefunded > 0 || refundedReservationsDeleted > 0 || storeErrors > 0,
        details: {
            mode: FUNCTION_RETENTION_CONFIG.AI_OPERATION_LOG_MODE,
            storesScanned,
            scanned,
            compacted,
            extraction,
            reservationsScanned,
            reservationsRefunded,
            refundedReservationsDeleted,
            storeErrors,
        },
    };
}

function isImageBatchTerminalStatus(status: unknown): status is string {
    return typeof status === 'string' && IMAGE_BATCH_TERMINAL_STATUSES.includes(status);
}

function getImageBatchActivityMillis(data: FirebaseFirestore.DocumentData): number | null {
    const historyTimes = Array.isArray(data.statusHistory)
        ? data.statusHistory.map((entry: any) => timestampMillis(entry?.createdOn)).filter((value): value is number => value !== null)
        : [];

    const candidates = [
        timestampMillis(data.modifiedOn),
        timestampMillis(data.createdOn),
        ...historyTimes,
    ].filter((value): value is number => value !== null);

    if (!candidates.length) return null;
    return Math.max(...candidates);
}

function parseMenuItemStoragePathFromUrl(params: {
    bucketName: string;
    sId: string;
    tId: string;
    url: string;
}): string | null {
    const expectedPrefix = `media/menuItem/${params.tId}/${params.sId}/`;
    if (params.url.startsWith(expectedPrefix)) {
        return params.url;
    }

    try {
        const parsed = new URL(params.url);
        if (parsed.hostname !== 'firebasestorage.googleapis.com') return null;

        const segments = parsed.pathname.split('/').filter(Boolean);
        const bucketIndex = segments.indexOf('b');
        const objectIndex = segments.indexOf('o');
        const bucketName = bucketIndex >= 0 ? decodeURIComponent(segments[bucketIndex + 1] || '') : '';
        if (bucketName && bucketName !== params.bucketName) return null;
        if (objectIndex < 0 || !segments[objectIndex + 1]) return null;

        const objectPath = decodeURIComponent(segments.slice(objectIndex + 1).join('/'));
        return objectPath.startsWith(expectedPrefix) ? objectPath : null;
    } catch {
        return null;
    }
}

function isStorageObjectNotFound(error: unknown): boolean {
    const code = (error as { code?: unknown }).code;
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return code === 404
        || code === '404'
        || code === 'storage/object-not-found'
        || code === 'not-found'
        || statusCode === 404;
}

function isImagePromptCacheSourcePath(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(IMAGE_PROMPT_CACHE_STORAGE_PREFIX);
}

async function runImagePromptCacheCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const snapshot = await db
        .collection(DB_COLLECTIONS.AI_IMAGE_PROMPT_CACHE)
        .where('expiresAt', '<=', now)
        .limit(IMAGE_PROMPT_CACHE_CLEANUP_LIMIT)
        .get();

    if (snapshot.empty) {
        return {
            activity: false,
            details: {
                deletedDocs: 0,
                deletedSources: 0,
                errors: 0,
                scanned: 0,
                skippedSources: 0,
            },
        };
    }

    const bucket = storageAdmin.bucket();
    const batch = db.batch();
    let deletedDocs = 0;
    let deletedSources = 0;
    let errors = 0;
    let skippedSources = 0;

    for (const doc of snapshot.docs) {
        const sourcePath = doc.data().sourcePath;
        if (isImagePromptCacheSourcePath(sourcePath)) {
            try {
                await bucket.file(sourcePath).delete({ ignoreNotFound: true });
                deletedSources += 1;
            } catch (error) {
                errors += 1;
                logger.warn('[ai_image_prompt_cache_cleanup] Failed to delete expired cache source', {
                    failureCode: IMAGE_PROMPT_CACHE_SOURCE_DELETE_FAILED_CODE,
                    pathLength: sourcePath.length,
                    ...getSchedulerStringContext('cacheDocId', doc.id),
                    ...getSchedulerErrorContext(error),
                });
                continue;
            }
        } else {
            skippedSources += 1;
        }

        batch.delete(doc.ref);
        deletedDocs += 1;
    }

    if (deletedDocs > 0) {
        await batch.commit();
    }

    return {
        activity: deletedDocs > 0 || deletedSources > 0 || errors > 0,
        details: {
            deletedDocs,
            deletedSources,
            errors,
            limit: IMAGE_PROMPT_CACHE_CLEANUP_LIMIT,
            scanned: snapshot.size,
            skippedSources,
        },
    };
}

async function runFounderMonitorSnapshot(): Promise<MaintenanceTaskResult> {
    const result = await rebuildFounderMonitorSnapshotLogic();
    return {
        activity: result.activity,
        details: result.details,
    };
}

async function deleteImageBatchStorageUrls(params: {
    sId: string;
    tId: string;
    urls: string[];
}): Promise<{ attempted: number; deleted: number; skipped: number; errors: number }> {
    const bucket = storageAdmin.bucket();
    const bucketName = bucket.name;
    let attempted = 0;
    let deleted = 0;
    let skipped = 0;
    let errors = 0;

    for (const url of params.urls) {
        const storagePath = parseMenuItemStoragePathFromUrl({
            bucketName,
            sId: params.sId,
            tId: params.tId,
            url,
        });
        if (!storagePath) {
            skipped++;
            continue;
        }

        attempted++;
        try {
            await bucket.file(storagePath).delete();
            deleted++;
        } catch (error) {
            if (isStorageObjectNotFound(error)) {
                deleted++;
                continue;
            }

            errors++;
            logger.warn('[image_batch_job_retention_cleanup] Failed to delete generated image', {
                failureCode: IMAGE_BATCH_STORAGE_DELETE_FAILED_CODE,
                pathLength: storagePath.length,
                ...getSchedulerStringContext('storeId', params.sId),
                ...getSchedulerStringContext('tenantId', params.tId),
                ...getSchedulerErrorContext(error),
            });
        }
    }

    return { attempted, deleted, skipped, errors };
}

async function getUnreferencedImageBatchStorageUrls(params: {
    data: FirebaseFirestore.DocumentData;
    sId: string;
    tId: string;
    urls: string[];
}): Promise<string[] | null> {
    if (!params.urls.length) return [];
    const projectId = normalizeMaintenanceDocumentId(params.data.projectId);
    if (!projectId) {
        logger.warn('[image_batch_job_retention_cleanup] Project reference check skipped for invalid project ID', {
            failureCode: IMAGE_BATCH_PROJECT_REFERENCE_CHECK_FAILED_CODE,
            ...getSchedulerStringContext('storeId', params.sId),
            ...getSchedulerStringContext('tenantId', params.tId),
        });
        return null;
    }

    try {
        const projectSnapshot = await db
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(params.tId)
            .collection(params.sId)
            .doc(projectId)
            .get();
        if (!projectSnapshot.exists) return params.urls;
        const filtered = filterProjectReferencedImageBatchUrls(projectSnapshot.data(), params.urls);
        if (!filtered.complete) {
            logger.warn('[image_batch_job_retention_cleanup] Project reference scan exceeded safety bounds', {
                failureCode: IMAGE_BATCH_PROJECT_REFERENCE_CHECK_FAILED_CODE,
                candidateUrlCount: params.urls.length,
                ...getSchedulerStringContext('projectId', projectId),
                ...getSchedulerStringContext('storeId', params.sId),
                ...getSchedulerStringContext('tenantId', params.tId),
            });
            return null;
        }
        return filtered.unreferencedUrls;
    } catch (error) {
        logger.warn('[image_batch_job_retention_cleanup] Project reference check failed', {
            failureCode: IMAGE_BATCH_PROJECT_REFERENCE_CHECK_FAILED_CODE,
            candidateUrlCount: params.urls.length,
            ...getSchedulerStringContext('projectId', projectId),
            ...getSchedulerStringContext('storeId', params.sId),
            ...getSchedulerStringContext('tenantId', params.tId),
            ...getSchedulerErrorContext(error),
        });
        return null;
    }
}

function addStorageTotals(
    total: { attempted: number; deleted: number; skipped: number; errors: number },
    next: { attempted: number; deleted: number; skipped: number; errors: number },
) {
    total.attempted += next.attempted;
    total.deleted += next.deleted;
    total.skipped += next.skipped;
    total.errors += next.errors;
}

async function compactImageBatchJobsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    sId: string;
    tId: string;
    limit?: number;
}): Promise<{
    scanned: number;
    compacted: number;
    skipped: number;
    storage: { attempted: number; deleted: number; skipped: number; errors: number };
}> {
    const snapshot = await params.collectionRef
        .where('itemsExpiresAt', '<=', params.now)
        .limit(params.limit || IMAGE_BATCH_RETENTION_LIMIT_PER_STORE)
        .get();
    const batch = db.batch();
    let compacted = 0;
    let skipped = 0;
    const storage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const status = data.status;
        if (!isImageBatchTerminalStatus(status)) {
            skipped++;
            continue;
        }

        const allImageUrls = getImageBatchImageUrls(data);
        const candidateImageUrls = getImageBatchStorageCleanupUrls(data, status);
        const imageUrls = await getUnreferencedImageBatchStorageUrls({
            data,
            sId: params.sId,
            tId: params.tId,
            urls: candidateImageUrls,
        });
        if (imageUrls === null) {
            skipped++;
            continue;
        }
        let docStorage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };
        if (shouldDeleteImageBatchStorage(status) && imageUrls.length > 0) {
            docStorage = await deleteImageBatchStorageUrls({
                sId: params.sId,
                tId: params.tId,
                urls: imageUrls,
            });
            addStorageTotals(storage, docStorage);
            if (docStorage.errors > 0) {
                skipped++;
                continue;
            }
        }

        batch.update(doc.ref, {
            generatedImageUrlCountBeforePrune: allImageUrls.length,
            itemsExpiresAt: FieldValue.delete(),
            itemsList: FieldValue.delete(),
            itemsPrunedAt: params.now,
            itemsPrunedReason: shouldDeleteImageBatchStorage(status)
                ? 'retention_window_expired_storage_cleaned'
                : 'retention_window_expired_metadata_only',
            storageCleanupAttempted: docStorage.attempted,
            storageCleanupDeleted: docStorage.deleted,
            storageCleanupSkipped: docStorage.skipped,
        });
        compacted++;
    }

    if (compacted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, compacted, skipped, storage };
}

async function deleteExpiredImageBatchJobsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    sId: string;
    tId: string;
    limit?: number;
}): Promise<{
    scanned: number;
    deleted: number;
    skipped: number;
    storage: { attempted: number; deleted: number; skipped: number; errors: number };
}> {
    const snapshot = await params.collectionRef
        .where('expiresAt', '<=', params.now)
        .limit(params.limit || IMAGE_BATCH_RETENTION_LIMIT_PER_STORE)
        .get();
    const batch = db.batch();
    let deleted = 0;
    let skipped = 0;
    const storage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const status = data.status;
        if (!isImageBatchTerminalStatus(status)) {
            skipped++;
            continue;
        }

        const candidateImageUrls = getImageBatchStorageCleanupUrls(data, status);
        const imageUrls = await getUnreferencedImageBatchStorageUrls({
            data,
            sId: params.sId,
            tId: params.tId,
            urls: candidateImageUrls,
        });
        if (imageUrls === null) {
            skipped++;
            continue;
        }
        if (shouldDeleteImageBatchStorage(status) && imageUrls.length > 0) {
            const cleanup = await deleteImageBatchStorageUrls({
                sId: params.sId,
                tId: params.tId,
                urls: imageUrls,
            });
            addStorageTotals(storage, cleanup);
            if (cleanup.errors > 0) {
                skipped++;
                continue;
            }
        }

        batch.delete(doc.ref);
        deleted++;
    }

    if (deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, deleted, skipped, storage };
}

async function compactLegacyImageBatchJobsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    sId: string;
    tId: string;
    limit?: number;
}): Promise<{
    scanned: number;
    compacted: number;
    deleted: number;
    skipped: number;
    storage: { attempted: number; deleted: number; skipped: number; errors: number };
}> {
    const snapshot = await params.collectionRef
        .where('status', 'in', IMAGE_BATCH_TERMINAL_STATUSES)
        .limit(params.limit || IMAGE_BATCH_LEGACY_RETENTION_LIMIT_PER_STORE)
        .get();
    const batch = db.batch();
    const nowMillis = params.now.toMillis();
    const compactCutoffMillis = nowMillis - FUNCTION_RETENTION_CONFIG.IMAGE_BATCH_ITEMS_RETENTION_DAYS * DAY_MS;
    const deleteCutoffMillis = nowMillis - FUNCTION_RETENTION_CONFIG.IMAGE_BATCH_JOB_RETENTION_DAYS * DAY_MS;
    let compacted = 0;
    let deleted = 0;
    let skipped = 0;
    const storage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.itemsExpiresAt || data.expiresAt || !isImageBatchTerminalStatus(data.status)) {
            skipped++;
            continue;
        }

        const activityMillis = getImageBatchActivityMillis(data);
        if (!activityMillis || activityMillis > compactCutoffMillis) {
            skipped++;
            continue;
        }

        const allImageUrls = getImageBatchImageUrls(data);
        const candidateImageUrls = getImageBatchStorageCleanupUrls(data, data.status);
        const imageUrls = await getUnreferencedImageBatchStorageUrls({
            data,
            sId: params.sId,
            tId: params.tId,
            urls: candidateImageUrls,
        });
        if (imageUrls === null) {
            skipped++;
            continue;
        }
        let docStorage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };
        if (shouldDeleteImageBatchStorage(data.status) && imageUrls.length > 0) {
            docStorage = await deleteImageBatchStorageUrls({
                sId: params.sId,
                tId: params.tId,
                urls: imageUrls,
            });
            addStorageTotals(storage, docStorage);
            if (docStorage.errors > 0) {
                skipped++;
                continue;
            }
        }

        if (activityMillis <= deleteCutoffMillis) {
            batch.delete(doc.ref);
            deleted++;
            continue;
        }

        batch.update(doc.ref, {
            expiresAt: Timestamp.fromMillis(activityMillis + FUNCTION_RETENTION_CONFIG.IMAGE_BATCH_JOB_RETENTION_DAYS * DAY_MS),
            generatedImageUrlCountBeforePrune: allImageUrls.length,
            itemsList: FieldValue.delete(),
            itemsPrunedAt: params.now,
            itemsPrunedReason: shouldDeleteImageBatchStorage(data.status)
                ? 'legacy_retention_window_expired_storage_cleaned'
                : 'legacy_retention_window_expired_metadata_only',
            storageCleanupAttempted: docStorage.attempted,
            storageCleanupDeleted: docStorage.deleted,
            storageCleanupSkipped: docStorage.skipped,
        });
        compacted++;
    }

    if (compacted > 0 || deleted > 0) {
        await batch.commit();
    }

    return { scanned: snapshot.size, compacted, deleted, skipped, storage };
}

async function runImageBatchJobRetentionCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
    const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
    const storeEntries = Object.entries(storesSummary)
        .filter(([, storeInfo]) => storeInfo.active !== false)
        .slice(0, IMAGE_BATCH_RETENTION_STORE_SCAN_LIMIT);

    let storesScanned = 0;
    let scanned = 0;
    let compacted = 0;
    let deleted = 0;
    let skipped = 0;
    const storage = { attempted: 0, deleted: 0, skipped: 0, errors: 0 };

    for (const [sId, storeInfo] of storeEntries) {
        const tId = storeInfo.tId;
        const collectionRef = db.collection(DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS).doc(tId).collection(String(sId));
        const expired = await deleteExpiredImageBatchJobsInCollectionRef({
            collectionRef,
            now,
            sId: String(sId),
            tId,
            limit: IMAGE_BATCH_RETENTION_LIMIT_PER_STORE,
        });
        const pruned = await compactImageBatchJobsInCollectionRef({
            collectionRef,
            now,
            sId: String(sId),
            tId,
            limit: IMAGE_BATCH_RETENTION_LIMIT_PER_STORE,
        });
        const legacy = await compactLegacyImageBatchJobsInCollectionRef({
            collectionRef,
            now,
            sId: String(sId),
            tId,
            limit: IMAGE_BATCH_LEGACY_RETENTION_LIMIT_PER_STORE,
        });

        scanned += expired.scanned + pruned.scanned + legacy.scanned;
        compacted += pruned.compacted + legacy.compacted;
        deleted += expired.deleted + legacy.deleted;
        skipped += expired.skipped + pruned.skipped + legacy.skipped;
        addStorageTotals(storage, expired.storage);
        addStorageTotals(storage, pruned.storage);
        addStorageTotals(storage, legacy.storage);
        storesScanned++;
    }

    return {
        activity: compacted > 0 || deleted > 0 || storage.deleted > 0 || storage.errors > 0,
        details: {
            storesScanned,
            scanned,
            compacted,
            deleted,
            skipped,
            storage,
            itemsRetentionDays: FUNCTION_RETENTION_CONFIG.IMAGE_BATCH_ITEMS_RETENTION_DAYS,
            jobRetentionDays: FUNCTION_RETENTION_CONFIG.IMAGE_BATCH_JOB_RETENTION_DAYS,
        },
    };
}

async function runMenuSnapshotCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
    const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
    const storeEntries = Object.entries(storesSummary)
        .filter(([, storeInfo]) => storeInfo.active !== false)
        .slice(0, 200);

    let scanned = 0;
    let deleted = 0;
    let storesScanned = 0;

    for (const [sId, storeInfo] of storeEntries) {
        const tId = storeInfo.tId;
        const result = await deleteExpiredDocsInCollectionRef({
            collectionRef: db.collection(DB_COLLECTIONS.MENU_SNAPSHOTS).doc(tId).collection(String(sId)),
            now,
            limit: 10,
        });
        scanned += result.scanned;
        deleted += result.deleted;
        storesScanned++;
    }

    return {
        activity: deleted > 0,
        details: {
            retentionDays: FUNCTION_RETENTION_CONFIG.MENU_SNAPSHOT_RETENTION_DAYS,
            storesScanned,
            scanned,
            deleted,
        },
    };
}

async function runOwnerNotificationRetentionCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const [events, deliveries, rateLimits, legacyMessages] = await Promise.all([
        deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_NOTIFICATION_EVENTS, now, limit: 50 }),
        deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_NOTIFICATION_DELIVERIES, now, limit: 50 }),
        deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_NOTIFICATION_RATE_LIMITS, now, limit: 50 }),
        deleteExpiredDocs({ collection: DB_COLLECTIONS.MESSAGE_LOGS, now, limit: 50 }),
    ]);
    const deleted = events.deleted + deliveries.deleted + rateLimits.deleted + legacyMessages.deleted;

    return {
        activity: deleted > 0,
        details: {
            retentionDays: FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS,
            deleted,
            events,
            deliveries,
            rateLimits,
            legacyMessages,
        },
    };
}

async function runFeedbackEventRetentionCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const [expired, legacy] = await Promise.all([
        deleteExpiredDocs({ collection: DB_COLLECTIONS.FEEDBACK_EVENTS, now, limit: 100 }),
        deleteLegacyFeedbackEvents({ now, limit: 100 }),
    ]);
    const deleted = expired.deleted + legacy.deleted;

    return {
        activity: deleted > 0,
        details: {
            retentionDays: FUNCTION_RETENTION_CONFIG.FEEDBACK_EVENT_RETENTION_DAYS,
            deleted,
            expired,
            legacy,
        },
    };
}

async function runSchedulerRunLogRetentionCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const [expired, legacy] = await Promise.all([
        deleteExpiredDocs({ collection: DB_COLLECTIONS.SCHEDULER_RUN_LOGS, now, limit: 100 }),
        deleteLegacySchedulerRunLogs({ now, limit: 100 }),
    ]);
    const deleted = expired.deleted + legacy.deleted;

    return {
        activity: deleted > 0,
        details: {
            retentionDays: FUNCTION_RETENTION_CONFIG.SCHEDULER_RUN_LOG_RETENTION_DAYS,
            deleted,
            expired,
            legacy,
        },
    };
}

async function runOwnerBusinessAssistantCleanup(): Promise<MaintenanceTaskResult> {
    const healthEnabled = isFunctionFeatureEnabled('ENABLE_OWNER_BUSINESS_HEALTH');
    const usageLoggingEnabled = healthEnabled && isFunctionFeatureEnabled('ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING');
    const threadsEnabled = healthEnabled && isFunctionFeatureEnabled('ENABLE_OWNER_BUSINESS_HEALTH_THREADS');
    if (!healthEnabled && !usageLoggingEnabled && !threadsEnabled) {
        return { activity: false, details: { enabled: false } };
    }

    const now = Timestamp.now();
    const skippedCleanup = { scanned: 0, deleted: 0, skipped: true };
    const [snapshots, answerEvents, feedback, threads] = await Promise.all([
        healthEnabled
            ? deleteExpiredDocs({ collection: DB_COLLECTIONS.PLATFORM_SUMMARY, now, limit: 50, kind: 'ownerBusinessHealthSnapshot' })
            : Promise.resolve(skippedCleanup),
        usageLoggingEnabled
            ? deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS, now, limit: 50 })
            : Promise.resolve(skippedCleanup),
        usageLoggingEnabled
            ? deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK, now, limit: 50 })
            : Promise.resolve(skippedCleanup),
        threadsEnabled
            ? deleteExpiredDocs({ collection: DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS, now, limit: 50 })
            : Promise.resolve(skippedCleanup),
    ]);
    const deleted = snapshots.deleted + answerEvents.deleted + feedback.deleted + threads.deleted;

    return {
        activity: deleted > 0,
        details: {
            enabled: true,
            deleted,
            snapshots,
            answerEvents,
            feedback,
            threads,
        },
    };
}

async function runAlertEscalation(): Promise<MaintenanceTaskResult> {
    const muted = await isAlertsMuted();
    if (muted) {
        return {
            activity: false,
            details: { muted: true, sent: 0 },
        };
    }

    const thirtyMinAgo = Timestamp.fromMillis(Date.now() - 30 * MINUTE_MS);
    const snapshot = await db
        .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
        .where('severity', '==', 'critical')
        .where('acknowledged', '==', false)
        .where('timestamp', '<=', thirtyMinAgo)
        .limit(5)
        .get();

    for (const doc of snapshot.docs) {
        const alert = doc.data();
        const escalationMetadata = getUnresolvedCriticalAlertMetadata(doc.id, alert);
        await sendTelegramAlert({
            severity: 'critical',
            title: UNRESOLVED_CRITICAL_ALERT_TITLE,
            message: UNRESOLVED_CRITICAL_ALERT_MESSAGE,
            metadata: escalationMetadata,
        });
        await sendPlatformAlertDelivery({
            id: doc.id,
            severity: 'critical',
            title: UNRESOLVED_CRITICAL_ALERT_TITLE,
            message: UNRESOLVED_CRITICAL_ALERT_MESSAGE,
            tId: alert.tId,
            sId: alert.sId,
            metadata: {
                ...escalationMetadata,
                platformTriggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNRESOLVED_CRITICAL_ALERT,
                productId: 'PLATFORM',
                category: 'system',
            },
        });
    }

    return {
        activity: snapshot.size > 0,
        details: { sent: snapshot.size },
    };
}

async function runChatStatsAggregation(): Promise<MaintenanceTaskResult> {
    const result = await aggregateDailyChatStatsLogic();
    if (result.failedCount > 0) {
        throw new Error(`Chat stats aggregation failed for ${result.failedCount} store(s)`);
    }
    return {
        activity: true,
        details: {
            totalStores: result.totalStores,
            successCount: result.successCount,
            failedCount: result.failedCount,
            skippedCount: result.skippedCount,
            errors: result.errors.length,
        },
    };
}

async function runAiProviderHealthCheck(): Promise<MaintenanceTaskResult> {
    const result = await runAiProviderHealthCheckLogic();
    return {
        activity: false,
        details: result,
    };
}

async function runSubscriptionReconciliation(): Promise<MaintenanceTaskResult> {
    if (!isFunctionFeatureEnabled('ENABLE_SUBSCRIPTION_RECONCILIATION')) {
        return { activity: false, details: { enabled: false, processed: 0, synced: 0, errors: 0 } };
    }
    const result = await reconcileSubscriptions();
    if (!result.success || result.errors > 0) {
        throw new Error(`Subscription reconciliation failed for ${result.errors} subscription(s)`);
    }
    return {
        activity: result.synced > 0,
        details: {
            enabled: true,
            processed: result.processed,
            synced: result.synced,
            errors: result.errors,
        },
    };
}

async function runResellerLicenseExpiry(): Promise<MaintenanceTaskResult> {
    if (!isFunctionFeatureEnabled('ENABLE_RESELLER_DASHBOARD')) {
        return {
            activity: false,
            details: { enabled: false, checked: 0, expired: 0, errors: 0 },
        };
    }

    const graceDate = new Date(Date.now() - 7 * DAY_MS);
    const graceCutoff = Timestamp.fromDate(graceDate);
    const pageSize = 100;
    const maxPages = 5;
    let checked = 0;
    let expired = 0;
    let errors = 0;
    let entitlementSyncErrors = 0;
    let pendingEntitlementsChecked = 0;
    let pendingEntitlementsRepaired = 0;
    let limited = false;

    let pendingCursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    for (let page = 0; page < maxPages; page += 1) {
        let pendingQuery = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
            .where('billingEntitlementSyncPending', '==', true)
            .orderBy(FieldPath.documentId())
            .limit(pageSize);
        if (pendingCursor) pendingQuery = pendingQuery.startAfter(pendingCursor);
        const pendingSnapshot = await pendingQuery.get();
        if (pendingSnapshot.empty) break;
        pendingEntitlementsChecked += pendingSnapshot.size;

        for (const pendingDoc of pendingSnapshot.docs) {
            const subscription = {
                ...(pendingDoc.data() || {}),
                id: pendingDoc.id,
            } as Record<string, any>;
            try {
                const entitlementSynced = await syncStorePlanEntitlement(
                    db,
                    subscription,
                    'menulistMaintenanceScheduler:resellerLicenseExpiryRetry',
                );
                if (!entitlementSynced) throw new Error('Subscription entitlement scope is invalid.');
                await pendingDoc.ref.set({
                    billingEntitlementSyncPending: FieldValue.delete(),
                    modifiedOn: FieldValue.serverTimestamp(),
                }, { merge: true });
                pendingEntitlementsRepaired += 1;
            } catch (entitlementError) {
                entitlementSyncErrors += 1;
                logger.warn('[reseller_license_expiry] Failed to retry pending entitlement sync', {
                    failureCode: RESELLER_LICENSE_EXPIRE_FAILED_CODE,
                    ...getSchedulerStringContext('subscriptionId', pendingDoc.id),
                    ...getSchedulerErrorContext(entitlementError),
                });
            }
        }

        pendingCursor = pendingSnapshot.docs[pendingSnapshot.docs.length - 1] || null;
        if (pendingSnapshot.size < pageSize || !pendingCursor) break;
        if (page === maxPages - 1) limited = true;
    }

    for (let page = 0; page < maxPages; page += 1) {
        const expiredSubs = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
            .where('billingMode', '==', 'manual')
            .where('status', '==', 'active')
            .where('validUntil', '<=', graceCutoff)
            .limit(pageSize)
            .get();
        if (expiredSubs.empty) break;
        checked += expiredSubs.size;

        for (const subDoc of expiredSubs.docs) {
            let storeId = '';
            let tenantId = '';
            try {
                const application = await db.runTransaction(async (transaction) => {
                    const currentSnapshot = await transaction.get(subDoc.ref);
                    if (!currentSnapshot.exists) return null;
                    const current = {
                        ...(currentSnapshot.data() || {}),
                        id: currentSnapshot.id,
                    } as Record<string, any>;
                    const subscriptionId = normalizeSubscriptionDocumentId(currentSnapshot.id);
                    const tenantScope = normalizeScopeDocumentId(current.tenantId ?? current.tId);
                    const storeScope = normalizeScopeDocumentId(current.storeId ?? current.sId);
                    const validUntilMillis = timestampMillis(current.validUntil);
                    if (
                        !subscriptionId
                        || !tenantScope
                        || !storeScope
                        || current.billingMode !== 'manual'
                        || current.status !== 'active'
                        || validUntilMillis === null
                        || validUntilMillis > graceCutoff.toMillis()
                    ) return null;

                    const resellerProfileId = normalizeMaintenanceDocumentId(
                        current.resellerProfileId || current.resellerId,
                    );
                    const resellerProfileRef = resellerProfileId
                        ? db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(resellerProfileId)
                        : null;
                    const resellerProfileSnapshot = resellerProfileRef
                        ? await transaction.get(resellerProfileRef)
                        : null;
                    const now = Timestamp.now();
                    const amount = Number(current.amount);
                    const subscriptionUpdate = {
                        billingEntitlementSyncPending: true,
                        status: 'expired',
                        subscriptionEndDate: now,
                        cycleEndDate: now,
                        modifiedOn: now,
                        lastWebhook: {
                            event: 'manual_license.expired',
                            timestamp: now,
                        },
                        statuses: [
                            ...(Array.isArray(current.statuses) ? current.statuses : []),
                            {
                                status: 'expired',
                                timestamp: now,
                                amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
                                currency: current.currency || 'INR',
                                remark: 'Manual license expired after grace period',
                            },
                        ],
                    };
                    transaction.update(subDoc.ref, subscriptionUpdate);
                    if (resellerProfileRef && resellerProfileSnapshot?.exists) {
                        const activeOfflineStores = Number(
                            resellerProfileSnapshot.data()?.currentActiveOfflineStores,
                        );
                        transaction.update(resellerProfileRef, {
                            currentActiveOfflineStores: Number.isFinite(activeOfflineStores)
                                ? Math.max(0, Math.floor(activeOfflineStores) - 1)
                                : 0,
                            modifiedOn: now,
                        });
                    }

                    return {
                        subscription: {
                            ...current,
                            ...subscriptionUpdate,
                            id: currentSnapshot.id,
                        },
                        storeId: storeScope.documentId,
                        tenantId: tenantScope.documentId,
                    };
                });
                if (!application) continue;
                storeId = application.storeId;
                tenantId = application.tenantId;
                expired += 1;

                try {
                    const entitlementSynced = await syncStorePlanEntitlement(
                        db,
                        application.subscription,
                        'menulistMaintenanceScheduler:resellerLicenseExpiry',
                    );
                    if (!entitlementSynced) throw new Error('Subscription entitlement scope is invalid.');
                    await subDoc.ref.set({
                        billingEntitlementSyncPending: FieldValue.delete(),
                        modifiedOn: FieldValue.serverTimestamp(),
                    }, { merge: true });
                } catch (entitlementError) {
                    entitlementSyncErrors += 1;
                    logger.warn('[reseller_license_expiry] Failed to sync expired manual entitlement', {
                        failureCode: RESELLER_LICENSE_EXPIRE_FAILED_CODE,
                        ...getSchedulerStringContext('subscriptionId', subDoc.id),
                        ...getSchedulerStringContext('storeId', storeId),
                        ...getSchedulerStringContext('tenantId', tenantId),
                        ...getSchedulerErrorContext(entitlementError),
                    });
                }
            } catch (error) {
                errors += 1;
                logger.error('[reseller_license_expiry] Failed to expire manual subscription', {
                    failureCode: RESELLER_LICENSE_EXPIRE_FAILED_CODE,
                    ...getSchedulerStringContext('subscriptionId', subDoc.id),
                    ...getSchedulerStringContext('storeId', storeId),
                    ...getSchedulerStringContext('tenantId', tenantId),
                    ...getSchedulerErrorContext(error),
                });
            }
        }

        if (expiredSubs.size < pageSize) break;
        if (page === maxPages - 1) limited = true;
    }

    return {
        activity: expired > 0 || errors > 0 || entitlementSyncErrors > 0 || pendingEntitlementsRepaired > 0,
        details: {
            enabled: true,
            checked,
            expired,
            errors,
            entitlementSyncErrors,
            pendingEntitlementsChecked,
            pendingEntitlementsRepaired,
            limited,
        },
    };
}

const TASKS: MaintenanceTask[] = [
    {
        name: 'messaging_intake',
        cadence: { type: 'every', minutes: 2 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runMessagingIntake,
    },
    {
        name: 'menu_stuck_cleanup',
        cadence: { type: 'every', minutes: 15 },
        lockTtlMs: 5 * MINUTE_MS,
        run: runMenuStuckCleanup,
    },
    {
        name: 'alert_escalation',
        cadence: { type: 'every', minutes: 30 },
        lockTtlMs: 5 * MINUTE_MS,
        run: runAlertEscalation,
    },
    {
        name: 'founder_monitor_snapshot',
        cadence: { type: 'every', minutes: 30 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runFounderMonitorSnapshot,
    },
    {
        name: 'chat_stats_aggregation',
        cadence: { type: 'daily', hourUtc: 1, minuteUtc: 0, retryAfterMinutes: 60 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runChatStatsAggregation,
    },
    {
        name: 'ai_provider_health_check',
        cadence: { type: 'daily', hourUtc: 1, minuteUtc: 20, retryAfterMinutes: 60 },
        lockTtlMs: 5 * MINUTE_MS,
        run: runAiProviderHealthCheck,
    },
    {
        name: 'subscription_reconciliation',
        cadence: { type: 'daily', hourUtc: 2, minuteUtc: 20, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runSubscriptionReconciliation,
    },
    {
        name: 'reseller_license_expiry',
        cadence: { type: 'daily', hourUtc: 2, minuteUtc: 30, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runResellerLicenseExpiry,
    },
    {
        name: 'menu_old_cleanup',
        cadence: { type: 'daily', hourUtc: 3, minuteUtc: 0, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runMenuOldCleanup,
    },
    {
        name: 'public_menu_draft_cleanup',
        cadence: { type: 'daily', hourUtc: 3, minuteUtc: 30, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runPublicMenuDraftCleanup,
    },
    {
        name: 'messaging_session_cleanup',
        cadence: { type: 'daily', hourUtc: 4, minuteUtc: 0, retryAfterMinutes: 60 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runMessagingSessionCleanup,
    },
    {
        name: 'owner_business_assistant_cleanup',
        cadence: { type: 'daily', hourUtc: 4, minuteUtc: 30, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runOwnerBusinessAssistantCleanup,
    },
    {
        name: 'ai_operation_detail_cleanup',
        cadence: { type: 'daily', hourUtc: 4, minuteUtc: 45, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runAiOperationDetailCleanup,
    },
    {
        name: 'image_batch_job_retention_cleanup',
        cadence: { type: 'daily', hourUtc: 4, minuteUtc: 55, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runImageBatchJobRetentionCleanup,
    },
    {
        name: 'ai_image_prompt_cache_cleanup',
        cadence: { type: 'daily', hourUtc: 4, minuteUtc: 57, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runImagePromptCacheCleanup,
    },
    {
        name: 'menu_snapshot_cleanup',
        cadence: { type: 'daily', hourUtc: 5, minuteUtc: 0, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runMenuSnapshotCleanup,
    },
    {
        name: 'owner_notification_retention_cleanup',
        cadence: { type: 'daily', hourUtc: 5, minuteUtc: 30, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runOwnerNotificationRetentionCleanup,
    },
    {
        name: 'feedback_event_retention_cleanup',
        cadence: { type: 'daily', hourUtc: 5, minuteUtc: 45, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runFeedbackEventRetentionCleanup,
    },
    {
        name: 'scheduler_run_log_retention_cleanup',
        cadence: { type: 'daily', hourUtc: 6, minuteUtc: 0, retryAfterMinutes: 120 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runSchedulerRunLogRetentionCleanup,
    },
];

export const menulistMaintenanceScheduler = onSchedule({
    schedule: 'every 2 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '1GiB' as const,
    timeoutSeconds: 540,
    maxInstances: 3,
    secrets: maintenanceSecrets,
}, async () => {
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date();
    const stateSnapshot = await db.collection(DB_COLLECTIONS.SYSTEM).doc(STATE_DOC_ID).get();
    const state = (stateSnapshot.data() || {}) as SchedulerState;
    const dueTasks = TASKS.filter((task) => shouldRunTask(task, state.tasks?.[task.name], startedAt));

    if (dueTasks.length === 0) {
        return;
    }

    const summaries: TaskSummary[] = [];
    for (const task of dueTasks) {
        summaries.push(await runTask(task, runId, startedAt));
    }

    const finishedAt = new Date();
    await persistMeaningfulRunLog({ runId, startedAt, finishedAt, summaries });

    const failures = summaries.filter((summary) => summary.status === 'failed');
    const activeTasks = summaries.filter((summary) => summary.activity);
    if (failures.length > 0 || activeTasks.length > 0) {
        logger.info(`[${SCHEDULER_NAME}] Completed`, {
            runId,
            dueTasks: dueTasks.map((task) => task.name),
            activeTasks: activeTasks.map((task) => task.name),
            failures: failures.map((task) => task.name),
            durationMs: finishedAt.getTime() - startedAt.getTime(),
        });
    }
});
