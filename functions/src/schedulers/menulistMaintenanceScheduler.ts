/**
 * MenuList Maintenance Scheduler
 *
 * One high-frequency scheduled function owns lightweight operational
 * maintenance. Each task keeps its own cadence and Firestore lease so retries
 * or overlapping scheduler ticks cannot duplicate sends, cleanup, or alerts.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { aggregateDailyChatStatsLogic } from '../aggregateDailyChatStats';
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
import {
    cleanupExpiredPreviewJobsLogic,
    cleanupOldJobsLogic,
    pruneCompletedProjectJobPayloadsLogic,
    cleanupStuckCancellingJobsLogic,
    cleanupStuckJobsLogic,
    monitorExtractionHealthLogic,
} from './menuJobCleanup';
import { messagingSessionCleanupLogic } from './messagingSessionCleanup';

const logger = functions.logger;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SCHEDULER_NAME = 'menulistMaintenanceScheduler';
const STATE_DOC_ID = 'menulistMaintenanceScheduler';
const LOCK_DOC_PREFIX = 'menulistMaintenanceTaskLock_';
const MAX_DETAILS_JSON_BYTES = 12_000;

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
    if (typeof (value as any).toMillis === 'function') {
        return (value as any).toMillis();
    }
    if (typeof (value as any).seconds === 'number') {
        return (value as any).seconds * 1000;
    }
    return null;
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

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error || 'Unknown error');
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
        const message = errorMessage(error);

        await recordTaskOutcome({
            task,
            runId,
            startedAt,
            finishedAt,
            status: 'failed',
            durationMs,
            error: message,
        });

        logger.error(`[${SCHEDULER_NAME}] Task failed`, {
            task: task.name,
            error: message,
        });

        await createAlert({
            tId: 'system',
            sId: 'scheduler',
            type: 'health',
            severity: 'critical',
            title: 'Maintenance Scheduler Task Failed',
            message: `Task ${task.name} failed: ${message}`,
            metadata: {
                schedulerName: SCHEDULER_NAME,
                taskName: task.name,
                runId,
            },
            triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SCHEDULER_FAILURE,
            productId: 'PLATFORM',
            category: 'scheduler',
            actionRequired: true,
        }).catch((alertError) => {
            logger.error(`[${SCHEDULER_NAME}] Failed to create scheduler failure alert`, {
                task: task.name,
                error: errorMessage(alertError),
            });
        });

        return {
            name: task.name,
            status: 'failed',
            durationMs,
            activity: true,
            error: message,
        };
    } finally {
        await releaseTaskLease(task, lease.leaseId).catch((error) => {
            logger.error(`[${SCHEDULER_NAME}] Failed to release task lease`, {
                task: task.name,
                error: errorMessage(error),
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
                sampleJobIds: stuckResult.jobIds.slice(0, 5),
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
    let deletedFiles = 0;
    let errors = 0;
    const sampleDraftIds: string[] = [];
    const bucket = storageAdmin.bucket();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const imagePath = typeof data.imagePath === 'string' ? data.imagePath : '';
        if (imagePath) {
            try {
                await bucket.file(imagePath).delete({ ignoreNotFound: true });
                deletedFiles += 1;
            } catch (error) {
                errors += 1;
                logger.warn('[public_menu_draft_cleanup] Failed to delete draft image', {
                    draftId: doc.id,
                    error: errorMessage(error),
                });
            }
        }

        if (sampleDraftIds.length < 5) {
            sampleDraftIds.push(doc.id);
        }
        batch.delete(doc.ref);
    }

    await batch.commit();

    return {
        activity: snapshot.size > 0 || errors > 0,
        details: {
            enabled: true,
            deletedDrafts: snapshot.size,
            deletedFiles,
            errors,
            sampleDraftIds,
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
    const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
    const storeEntries = Object.entries(storesSummary)
        .filter((entry) => {
            const storeInfo = entry[1] as any;
            return storeInfo?.active !== false && storeInfo?.tId != null;
        })
        .slice(0, 200);

    const extraction = await compactAiOperationDetailsInCollectionRef({
        collectionRef: db.collection(DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS),
        now,
        limit: 100,
    });

    let scanned = extraction.scanned;
    let compacted = extraction.compacted;
    let storesScanned = 0;

    for (const [sId, storeInfo] of storeEntries as [string, any][]) {
        const tId = String(storeInfo.tId);
        if (!tId || !sId) continue;
        const result = await compactAiOperationDetailsInCollectionRef({
            collectionRef: db.collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS).doc(tId).collection(String(sId)),
            now,
            limit: 10,
        });
        scanned += result.scanned;
        compacted += result.compacted;
        storesScanned++;
    }

    return {
        activity: compacted > 0,
        details: {
            mode: FUNCTION_RETENTION_CONFIG.AI_OPERATION_LOG_MODE,
            storesScanned,
            scanned,
            compacted,
            extraction,
        },
    };
}

async function runMenuSnapshotCleanup(): Promise<MaintenanceTaskResult> {
    const now = Timestamp.now();
    const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
    const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
    const storeEntries = Object.entries(storesSummary)
        .filter((entry) => {
            const storeInfo = entry[1] as any;
            return storeInfo?.active !== false && storeInfo?.tId != null;
        })
        .slice(0, 200);

    let scanned = 0;
    let deleted = 0;
    let storesScanned = 0;

    for (const [sId, storeInfo] of storeEntries as [string, any][]) {
        const tId = String(storeInfo.tId);
        if (!tId || !sId) continue;
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
        await sendTelegramAlert({
            severity: 'critical',
            title: `STILL UNRESOLVED: ${alert.title}`,
            message: `This critical alert has been unacknowledged for 30+ minutes.\n\n${alert.message}\n\nOriginal time: ${alert.timestamp?.toDate?.()?.toISOString() || 'unknown'}`,
            metadata: { alertId: doc.id, storeId: alert.sId, tenantId: alert.tId },
        });
        await sendPlatformAlertDelivery({
            id: doc.id,
            severity: 'critical',
            title: `STILL UNRESOLVED: ${alert.title}`,
            message: `This critical alert has been unacknowledged for 30+ minutes.\n\n${alert.message}\n\nOriginal time: ${alert.timestamp?.toDate?.()?.toISOString() || 'unknown'}`,
            tId: alert.tId,
            sId: alert.sId,
            metadata: {
                alertId: doc.id,
                storeId: alert.sId,
                tenantId: alert.tId,
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

const TASKS: MaintenanceTask[] = [
    {
        name: 'messaging_intake',
        cadence: { type: 'every', minutes: 2 },
        lockTtlMs: 4 * MINUTE_MS,
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
        name: 'chat_stats_aggregation',
        cadence: { type: 'daily', hourUtc: 1, minuteUtc: 0, retryAfterMinutes: 60 },
        lockTtlMs: 10 * MINUTE_MS,
        run: runChatStatsAggregation,
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
