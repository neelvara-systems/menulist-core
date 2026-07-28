import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { runAnswerlatticeAiProviderHealthCheck } from './aiProviderHealth';
import { recoverAnswerlatticeAiCapacityReservations } from './aiCapacityReservationRecovery';
import { discoverActiveTenants, runAnswerlatticeNightly } from './answerlatticeNightly';
import {
    ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME,
    ANSWERLATTICE_DEFAULT_TIME_ZONE,
    getAnswerlatticeLatestSettledLocalDateKey,
    isAnswerlatticeSettlementDue,
    normalizeAnswerlatticeBusinessDayEndTime,
} from './schedulerTime';
import { AnswerlatticeTenantStore, getAnswerlatticeTenantSummaryKey } from './tenantSummary';
import { resolveAnswerlatticeTenantSettlementCompletionStatus } from './masterSchedulerState';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

const MINUTE_MS = 60 * 1000;
const SCHEDULER_NAME = 'answerlatticeMasterScheduler';
const STATE_DOC_ID = 'answerlatticeSchedulerState';
const TASK_LOCK_DOC_PREFIX = 'answerlatticeSchedulerTaskLock_';
const NIGHTLY_STATE_PREFIX = 'answerlatticeNightlyState';
const NIGHTLY_LOCK_PREFIX = 'answerlatticeNightlyLock';
const TASK_LEASE_MS = 45 * MINUTE_MS;
const TENANT_LEASE_MS = 45 * MINUTE_MS;
const ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED = 'ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED';
const ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED = 'ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED';
const ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE = 'ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE';

type AnswerlatticeMasterSchedulerTrigger = 'scheduled' | 'manual';
type AnswerlatticeMasterSchedulerStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'running';

interface AnswerlatticeTenantSettlementCandidate extends AnswerlatticeTenantStore {
    timeZone: string;
    businessDayEndTime: string;
    settlementDate: string;
}

interface AnswerlatticeTenantSettlementLease extends AnswerlatticeTenantSettlementCandidate {
    leaseId: string;
}

interface AnswerlatticeSchedulerTaskResult {
    activity?: boolean;
    details?: Record<string, unknown>;
}

interface AnswerlatticeSchedulerTask {
    name: string;
    lockTtlMs: number;
    run: (context: {
        trigger: AnswerlatticeMasterSchedulerTrigger;
        triggeredBy: string;
        runId: string;
        forceAllTenants?: boolean;
        tenantScope?: AnswerlatticeTenantStore[];
    }) => Promise<AnswerlatticeSchedulerTaskResult>;
}

interface AnswerlatticeSchedulerTaskSummary {
    name: string;
    status: 'success' | 'failed' | 'skipped';
    durationMs: number;
    activity: boolean;
    details?: Record<string, unknown>;
    error?: string;
    sourceErrorName?: string | null;
    sourceErrorCode?: string | number | null;
    sourceStatusCode?: number | null;
}

export interface AnswerlatticeMasterSchedulerResult {
    scheduler: typeof SCHEDULER_NAME;
    runId: string;
    trigger: AnswerlatticeMasterSchedulerTrigger;
    triggeredBy: string;
    status: AnswerlatticeMasterSchedulerStatus;
    startedAtIso: string;
    durationMs: number;
    tasks: AnswerlatticeSchedulerTaskSummary[];
}

const platformSummary = () => db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof (value as any).toMillis === 'function') return (value as any).toMillis();
    if (typeof (value as any).seconds === 'number') return (value as any).seconds * 1000;
    return null;
}

function getAnswerlatticeMasterSchedulerSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const context = getBoundedFunctionsErrorContext(error);
    return {
        sourceErrorName: context.sourceErrorName ?? null,
        sourceErrorCode: context.sourceErrorCode ?? null,
        sourceStatusCode: context.sourceStatusCode ?? null,
    };
}

function resolveTenantSchedule(tenant: AnswerlatticeTenantStore): {
    timeZone: string;
    businessDayEndTime: string;
} {
    return {
        timeZone: tenant.timeZone || ANSWERLATTICE_DEFAULT_TIME_ZONE,
        businessDayEndTime: normalizeAnswerlatticeBusinessDayEndTime(
            tenant.businessDayEndTime || ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME,
        ),
    };
}

function buildTenantCandidate(tenant: AnswerlatticeTenantStore, now: Date): AnswerlatticeTenantSettlementCandidate {
    const schedule = resolveTenantSchedule(tenant);
    return {
        ...tenant,
        ...schedule,
        settlementDate: getAnswerlatticeLatestSettledLocalDateKey(now, schedule.timeZone, schedule.businessDayEndTime),
    };
}

async function acquireTaskLease(
    task: AnswerlatticeSchedulerTask,
    runId: string,
    now: Date,
): Promise<{ leaseId: string } | null> {
    const leaseId = `${runId}_${task.name}`;
    const lockRef = platformSummary().doc(`${TASK_LOCK_DOC_PREFIX}${task.name}`);
    const nowTs = Timestamp.fromDate(now);
    const leaseExpiresAt = Timestamp.fromMillis(now.getTime() + task.lockTtlMs);

    const acquired = await db.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        const lock = lockSnapshot.data() || {};
        const existingLeaseExpiresAt = timestampMillis(lock.leaseExpiresAt);
        if (lock.leaseOwner && existingLeaseExpiresAt && existingLeaseExpiresAt > now.getTime()) {
            return false;
        }

        transaction.set(lockRef, {
            taskName: task.name,
            leaseOwner: leaseId,
            leaseRunId: runId,
            leaseStartedAt: nowTs,
            leaseExpiresAt,
            updatedAt: nowTs,
        }, { merge: true });
        return true;
    });

    return acquired ? { leaseId } : null;
}

async function releaseTaskLease(task: AnswerlatticeSchedulerTask, leaseId: string): Promise<void> {
    const lockRef = platformSummary().doc(`${TASK_LOCK_DOC_PREFIX}${task.name}`);
    const now = Timestamp.now();

    await db.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.data()?.leaseOwner !== leaseId) return;
        transaction.set(lockRef, {
            leaseOwner: null,
            leaseExpiresAt: Timestamp.fromMillis(0),
            lastReleasedAt: now,
            updatedAt: now,
        }, { merge: true });
    });
}

async function acquireTenantSettlementLease(
    candidate: AnswerlatticeTenantSettlementCandidate,
    runId: string,
    now: Date,
    ignoreCompleted: boolean,
): Promise<AnswerlatticeTenantSettlementLease | null> {
    const leaseId = `${runId}_${candidate.tId}_${candidate.sId}_${candidate.settlementDate}`;
    const stateRef = platformSummary().doc(`${NIGHTLY_STATE_PREFIX}_${candidate.tId}_${candidate.sId}`);
    const lockRef = platformSummary().doc(`${NIGHTLY_LOCK_PREFIX}_${candidate.tId}_${candidate.sId}_${candidate.settlementDate}`);
    const nowTs = Timestamp.fromDate(now);
    const leaseExpiresAt = Timestamp.fromMillis(now.getTime() + TENANT_LEASE_MS);

    const acquired = await db.runTransaction(async (transaction) => {
        const [stateSnapshot, lockSnapshot] = await Promise.all([
            transaction.get(stateRef),
            transaction.get(lockRef),
        ]);
        const state = stateSnapshot.data() || {};
        if (!ignoreCompleted && state.lastCompletedLocalDate === candidate.settlementDate) {
            return false;
        }

        const lock = lockSnapshot.data() || {};
        const existingLeaseExpiresAt = timestampMillis(lock.leaseExpiresAt);
        if (lock.leaseOwner && existingLeaseExpiresAt && existingLeaseExpiresAt > now.getTime()) {
            return false;
        }

        transaction.set(lockRef, {
            pId: 'AL',
            tId: candidate.tId,
            sId: candidate.sId,
            localDate: candidate.settlementDate,
            timeZone: candidate.timeZone,
            businessDayEndTime: candidate.businessDayEndTime,
            status: 'running',
            leaseOwner: leaseId,
            leaseRunId: runId,
            leaseStartedAt: nowTs,
            leaseExpiresAt,
            updatedAt: nowTs,
        }, { merge: true });
        transaction.set(stateRef, {
            pId: 'AL',
            tId: candidate.tId,
            sId: candidate.sId,
            status: 'running',
            lastAttemptedLocalDate: candidate.settlementDate,
            lastAttemptedAt: nowTs,
            timeZone: candidate.timeZone,
            businessDayEndTime: candidate.businessDayEndTime,
            updatedAt: nowTs,
        }, { merge: true });
        return true;
    });

    return acquired ? { ...candidate, leaseId } : null;
}

async function completeTenantSettlementLease(
    lease: AnswerlatticeTenantSettlementLease,
    status: 'completed' | 'failed',
    details: Record<string, unknown>,
): Promise<void> {
    const now = Timestamp.now();
    const stateRef = platformSummary().doc(`${NIGHTLY_STATE_PREFIX}_${lease.tId}_${lease.sId}`);
    const lockRef = platformSummary().doc(`${NIGHTLY_LOCK_PREFIX}_${lease.tId}_${lease.sId}_${lease.settlementDate}`);
    const completed = status === 'completed';

    await db.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.data()?.leaseOwner !== lease.leaseId) return;

        transaction.set(lockRef, {
            status,
            leaseOwner: null,
            leaseExpiresAt: Timestamp.fromMillis(0),
            completedAt: now,
            updatedAt: now,
            details,
        }, { merge: true });

        const stateUpdate: Record<string, unknown> = {
            status,
            lastDetails: details,
            updatedAt: now,
        };
        if (completed) {
            stateUpdate.lastCompletedLocalDate = lease.settlementDate;
            stateUpdate.lastCompletedAt = now;
        } else {
            stateUpdate.lastFailedLocalDate = lease.settlementDate;
            stateUpdate.lastFailedAt = now;
        }

        transaction.set(stateRef, stateUpdate, { merge: true });
    });
}

async function runGovernanceNightlyTask(context: {
    trigger: AnswerlatticeMasterSchedulerTrigger;
    triggeredBy: string;
    runId: string;
    forceAllTenants?: boolean;
    tenantScope?: AnswerlatticeTenantStore[];
}): Promise<AnswerlatticeSchedulerTaskResult> {
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_NIGHTLY) {
        return { activity: false, details: { enabled: false, reason: 'feature_flag_off' } };
    }

    const now = new Date();
    const hasManualScope = Array.isArray(context.tenantScope) && context.tenantScope.length > 0;
    const discovery = hasManualScope
        ? {
            tenants: context.tenantScope || [],
            scannedDocs: context.tenantScope?.length || 0,
            truncated: false,
            source: 'manual_scope' as const,
        }
        : await discoverActiveTenants();
    const candidates = discovery.tenants
        .map(tenant => buildTenantCandidate(tenant, now))
        .filter(candidate => hasManualScope || context.forceAllTenants || isAnswerlatticeSettlementDue(now, candidate.timeZone, candidate.businessDayEndTime));

    if (candidates.length === 0) {
        return {
            activity: false,
            details: {
                enabled: true,
                reason: 'no_due_tenants',
                tenantCount: discovery.tenants.length,
                discoverySource: discovery.source,
            },
        };
    }

    const leases: AnswerlatticeTenantSettlementLease[] = [];
    for (const candidate of candidates) {
        const lease = await acquireTenantSettlementLease(candidate, context.runId, now, hasManualScope || context.forceAllTenants === true);
        if (lease) leases.push(lease);
    }

    if (leases.length === 0) {
        return {
            activity: false,
            details: {
                enabled: true,
                reason: 'all_due_tenants_locked_or_completed',
                candidateCount: candidates.length,
                discoverySource: discovery.source,
            },
        };
    }

    let nightlyResult: Awaited<ReturnType<typeof runAnswerlatticeNightly>>;
    try {
        nightlyResult = await runAnswerlatticeNightly({
            trigger: context.trigger === 'manual' ? 'manual' : 'scheduled',
            triggeredBy: context.triggeredBy,
            tenantScope: leases,
            tenantDiscoverySource: context.trigger === 'manual' ? 'manual_scope' : 'scheduler_filter',
        });
    } catch (error) {
        await Promise.allSettled(leases.map(lease => completeTenantSettlementLease(lease, 'failed', {
            nightlyStatus: 'failed',
            tenantStatus: 'missing',
            failureCode: ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED,
        })));
        throw error;
    }

    const tenantRunsByKey = new Map(
        nightlyResult.tenantRuns.map(run => [getAnswerlatticeTenantSummaryKey(run.tId, run.sId), run]),
    );
    const completionResults = await Promise.allSettled(leases.map(async lease => {
        const tenantRun = tenantRunsByKey.get(getAnswerlatticeTenantSummaryKey(lease.tId, lease.sId));
        await completeTenantSettlementLease(
            lease,
            resolveAnswerlatticeTenantSettlementCompletionStatus(tenantRun?.status),
            {
                nightlyRunLogId: nightlyResult.runLogId,
                nightlyStatus: nightlyResult.status,
                tenantStatus: tenantRun?.status || 'missing',
                taskCount: tenantRun?.tasks.length || 0,
                errorCount: tenantRun?.errors.length || 0,
            },
        );
    }));
    const completionFailures = completionResults.filter(result => result.status === 'rejected').length;
    if (completionFailures > 0) {
        throw new Error(`Failed to finalize ${completionFailures} Answerlattice tenant settlement lease(s)`);
    }

    return {
        activity: true,
        details: {
            enabled: true,
            discoverySource: discovery.source,
            activeTenants: discovery.tenants.length,
            candidateTenants: candidates.length,
            processedTenants: leases.length,
            skippedTenants: candidates.length - leases.length,
            nightlyRunLogId: nightlyResult.runLogId,
            nightlyStatus: nightlyResult.status,
            errors: nightlyResult.errorDetails.length,
        },
    };
}

async function runAiCapacityReservationRecoveryTask(): Promise<AnswerlatticeSchedulerTaskResult> {
    const result = await recoverAnswerlatticeAiCapacityReservations({
        db,
        limit: 50,
        now: Timestamp.now(),
    });
    if (result.errors > 0) {
        const error = new Error(ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE) as Error & { code: string };
        error.code = ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE;
        throw error;
    }
    return {
        activity: result.refunded > 0,
        details: result,
    };
}

const TASKS: AnswerlatticeSchedulerTask[] = [
    {
        name: 'ai_provider_health_check',
        lockTtlMs: 5 * MINUTE_MS,
        run: (context) => runAnswerlatticeAiProviderHealthCheck({
            force: context.trigger === 'manual' && context.forceAllTenants === true,
        }),
    },
    {
        name: 'ai_capacity_reservation_recovery',
        lockTtlMs: 5 * MINUTE_MS,
        run: runAiCapacityReservationRecoveryTask,
    },
    {
        name: 'governance_nightly',
        lockTtlMs: TASK_LEASE_MS,
        run: runGovernanceNightlyTask,
    },
];

async function recordTaskOutcome(params: {
    task: AnswerlatticeSchedulerTask;
    runId: string;
    startedAt: Date;
    finishedAt: Date;
    summary: AnswerlatticeSchedulerTaskSummary;
}): Promise<void> {
    const finishedTs = Timestamp.fromDate(params.finishedAt);
    await platformSummary().doc(STATE_DOC_ID).set({
        schedulerName: SCHEDULER_NAME,
        updatedAt: finishedTs,
        tasks: {
            [params.task.name]: {
                lastRunId: params.runId,
                lastAttemptAt: Timestamp.fromDate(params.startedAt),
                lastFinishedAt: finishedTs,
                lastStatus: params.summary.status,
                lastDurationMs: params.summary.durationMs,
                lastDetails: params.summary.details || {},
                lastError: params.summary.error || null,
                lastSourceErrorName: params.summary.sourceErrorName || null,
                lastSourceErrorCode: params.summary.sourceErrorCode ?? null,
                lastSourceStatusCode: params.summary.sourceStatusCode ?? null,
                lastActivity: params.summary.activity === true,
            },
        },
    }, { merge: true });
}

async function runTask(
    task: AnswerlatticeSchedulerTask,
    runId: string,
    context: {
        trigger: AnswerlatticeMasterSchedulerTrigger;
        triggeredBy: string;
        forceAllTenants?: boolean;
        tenantScope?: AnswerlatticeTenantStore[];
    },
): Promise<AnswerlatticeSchedulerTaskSummary> {
    const dueAt = new Date();
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
        const result = await task.run({ ...context, runId });
        const finishedAt = new Date();
        const summary: AnswerlatticeSchedulerTaskSummary = {
            name: task.name,
            status: 'success',
            durationMs: finishedAt.getTime() - startedAt.getTime(),
            activity: result.activity === true,
            details: result.details || {},
        };
        await recordTaskOutcome({ task, runId, startedAt, finishedAt, summary });
        return summary;
    } catch (error) {
        const finishedAt = new Date();
        const sourceErrorContext = getAnswerlatticeMasterSchedulerSourceErrorContext(error);
        const summary: AnswerlatticeSchedulerTaskSummary = {
            name: task.name,
            status: 'failed',
            durationMs: finishedAt.getTime() - startedAt.getTime(),
            activity: true,
            error: ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED,
            ...sourceErrorContext,
        };
        await recordTaskOutcome({ task, runId, startedAt, finishedAt, summary });
        logger.error('[Answerlattice Scheduler] Task failed', {
            task: task.name,
            runId,
            failureCode: ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED,
            ...sourceErrorContext,
        });
        return summary;
    } finally {
        await releaseTaskLease(task, lease.leaseId).catch(error => {
            const sourceErrorContext = getAnswerlatticeMasterSchedulerSourceErrorContext(error);
            logger.error('[Answerlattice Scheduler] Failed to release task lease', {
                task: task.name,
                runId,
                failureCode: ANSWERLATTICE_MASTER_SCHEDULER_LEASE_RELEASE_FAILED,
                ...sourceErrorContext,
            });
        });
    }
}

export async function runAnswerlatticeMasterScheduler(options: {
    trigger?: AnswerlatticeMasterSchedulerTrigger;
    triggeredBy?: string;
    forceAllTenants?: boolean;
    tenantScope?: AnswerlatticeTenantStore[];
} = {}): Promise<AnswerlatticeMasterSchedulerResult> {
    const trigger = options.trigger || 'scheduled';
    const triggeredBy = options.triggeredBy || (trigger === 'scheduled' ? 'system' : 'manual');
    const startedAt = new Date();
    const runId = `answerlattice_scheduler_${trigger}_${startedAt.getTime()}_${randomUUID().slice(0, 8)}`;
    const tasks: AnswerlatticeSchedulerTaskSummary[] = [];

    for (const task of TASKS) {
        tasks.push(await runTask(task, runId, {
            trigger,
            triggeredBy,
            forceAllTenants: options.forceAllTenants,
            tenantScope: options.tenantScope,
        }));
    }

    const finishedAt = new Date();
    const failures = tasks.filter(task => task.status === 'failed');
    const activeTasks = tasks.filter(task => task.activity);
    const status: AnswerlatticeMasterSchedulerStatus = failures.length > 0
        ? (failures.length === tasks.length ? 'failed' : 'partial')
        : (activeTasks.length > 0 ? 'success' : 'skipped');
    const result: AnswerlatticeMasterSchedulerResult = {
        scheduler: SCHEDULER_NAME,
        runId,
        trigger,
        triggeredBy,
        status,
        startedAtIso: startedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        tasks,
    };

    if (activeTasks.length > 0 || failures.length > 0 || trigger === 'manual') {
        logger.info('[Answerlattice Scheduler] Run complete', {
            runId,
            trigger,
            status,
            activeTasks: activeTasks.map(task => task.name),
            failures: failures.map(task => task.name),
            durationMs: result.durationMs,
        });
    }

    return result;
}
