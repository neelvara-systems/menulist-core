import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { discoverActiveTenants, runCanonicaNightly } from './canonicaNightly';
import {
    CANONICA_DEFAULT_BUSINESS_DAY_END_TIME,
    CANONICA_DEFAULT_TIME_ZONE,
    getCanonicaLatestSettledLocalDateKey,
    isCanonicaSettlementDue,
    normalizeCanonicaBusinessDayEndTime,
} from './schedulerTime';
import { CanonicaTenantStore, getCanonicaTenantSummaryKey } from './tenantSummary';

const MINUTE_MS = 60 * 1000;
const SCHEDULER_NAME = 'canonicaMasterScheduler';
const STATE_DOC_ID = 'canonicaSchedulerState';
const TASK_LOCK_DOC_PREFIX = 'canonicaSchedulerTaskLock_';
const NIGHTLY_STATE_PREFIX = 'canonicaNightlyState';
const NIGHTLY_LOCK_PREFIX = 'canonicaNightlyLock';
const TASK_LEASE_MS = 45 * MINUTE_MS;
const TENANT_LEASE_MS = 45 * MINUTE_MS;

type CanonicaMasterSchedulerTrigger = 'scheduled' | 'manual';
type CanonicaMasterSchedulerStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'running';

interface CanonicaTenantSettlementCandidate extends CanonicaTenantStore {
    timeZone: string;
    businessDayEndTime: string;
    settlementDate: string;
}

interface CanonicaTenantSettlementLease extends CanonicaTenantSettlementCandidate {
    leaseId: string;
}

interface CanonicaSchedulerTaskResult {
    activity?: boolean;
    details?: Record<string, unknown>;
}

interface CanonicaSchedulerTask {
    name: string;
    lockTtlMs: number;
    run: (context: {
        trigger: CanonicaMasterSchedulerTrigger;
        triggeredBy: string;
        runId: string;
        forceAllTenants?: boolean;
        tenantScope?: CanonicaTenantStore[];
    }) => Promise<CanonicaSchedulerTaskResult>;
}

interface CanonicaSchedulerTaskSummary {
    name: string;
    status: 'success' | 'failed' | 'skipped';
    durationMs: number;
    activity: boolean;
    details?: Record<string, unknown>;
    error?: string;
}

export interface CanonicaMasterSchedulerResult {
    scheduler: typeof SCHEDULER_NAME;
    runId: string;
    trigger: CanonicaMasterSchedulerTrigger;
    triggeredBy: string;
    status: CanonicaMasterSchedulerStatus;
    startedAtIso: string;
    durationMs: number;
    tasks: CanonicaSchedulerTaskSummary[];
}

const platformSummary = () => db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof (value as any).toMillis === 'function') return (value as any).toMillis();
    if (typeof (value as any).seconds === 'number') return (value as any).seconds * 1000;
    return null;
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error || 'Unknown error');
}

function resolveTenantSchedule(tenant: CanonicaTenantStore): {
    timeZone: string;
    businessDayEndTime: string;
} {
    return {
        timeZone: tenant.timeZone || CANONICA_DEFAULT_TIME_ZONE,
        businessDayEndTime: normalizeCanonicaBusinessDayEndTime(
            tenant.businessDayEndTime || CANONICA_DEFAULT_BUSINESS_DAY_END_TIME,
        ),
    };
}

function buildTenantCandidate(tenant: CanonicaTenantStore, now: Date): CanonicaTenantSettlementCandidate {
    const schedule = resolveTenantSchedule(tenant);
    return {
        ...tenant,
        ...schedule,
        settlementDate: getCanonicaLatestSettledLocalDateKey(now, schedule.timeZone, schedule.businessDayEndTime),
    };
}

async function acquireTaskLease(
    task: CanonicaSchedulerTask,
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

async function releaseTaskLease(task: CanonicaSchedulerTask, leaseId: string): Promise<void> {
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
    candidate: CanonicaTenantSettlementCandidate,
    runId: string,
    now: Date,
    ignoreCompleted: boolean,
): Promise<CanonicaTenantSettlementLease | null> {
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
            pId: 'CN',
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
            pId: 'CN',
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
    lease: CanonicaTenantSettlementLease,
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
    trigger: CanonicaMasterSchedulerTrigger;
    triggeredBy: string;
    runId: string;
    forceAllTenants?: boolean;
    tenantScope?: CanonicaTenantStore[];
}): Promise<CanonicaSchedulerTaskResult> {
    if (!FUNCTION_FLAGS.ENABLE_CANONICA_NIGHTLY) {
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
        .filter(candidate => hasManualScope || context.forceAllTenants || isCanonicaSettlementDue(now, candidate.timeZone, candidate.businessDayEndTime));

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

    const leases: CanonicaTenantSettlementLease[] = [];
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

    const nightlyResult = await runCanonicaNightly({
        trigger: context.trigger === 'manual' ? 'manual' : 'scheduled',
        triggeredBy: context.triggeredBy,
        tenantScope: leases,
        tenantDiscoverySource: context.trigger === 'manual' ? 'manual_scope' : 'scheduler_filter',
    });

    const tenantRunsByKey = new Map(
        nightlyResult.tenantRuns.map(run => [getCanonicaTenantSummaryKey(run.tId, run.sId), run]),
    );
    for (const lease of leases) {
        const tenantRun = tenantRunsByKey.get(getCanonicaTenantSummaryKey(lease.tId, lease.sId));
        await completeTenantSettlementLease(
            lease,
            tenantRun?.status === 'failed' ? 'failed' : 'completed',
            {
                nightlyRunLogId: nightlyResult.runLogId,
                nightlyStatus: nightlyResult.status,
                tenantStatus: tenantRun?.status || 'missing',
                taskCount: tenantRun?.tasks.length || 0,
                errorCount: tenantRun?.errors.length || 0,
            },
        );
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

const TASKS: CanonicaSchedulerTask[] = [
    {
        name: 'governance_nightly',
        lockTtlMs: TASK_LEASE_MS,
        run: runGovernanceNightlyTask,
    },
];

async function recordTaskOutcome(params: {
    task: CanonicaSchedulerTask;
    runId: string;
    startedAt: Date;
    finishedAt: Date;
    summary: CanonicaSchedulerTaskSummary;
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
                lastActivity: params.summary.activity === true,
            },
        },
    }, { merge: true });
}

async function runTask(
    task: CanonicaSchedulerTask,
    runId: string,
    context: {
        trigger: CanonicaMasterSchedulerTrigger;
        triggeredBy: string;
        forceAllTenants?: boolean;
        tenantScope?: CanonicaTenantStore[];
    },
): Promise<CanonicaSchedulerTaskSummary> {
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
        const summary: CanonicaSchedulerTaskSummary = {
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
        const summary: CanonicaSchedulerTaskSummary = {
            name: task.name,
            status: 'failed',
            durationMs: finishedAt.getTime() - startedAt.getTime(),
            activity: true,
            error: errorMessage(error),
        };
        await recordTaskOutcome({ task, runId, startedAt, finishedAt, summary });
        logger.error('[Canonica Scheduler] Task failed', {
            task: task.name,
            runId,
            error: summary.error,
        });
        return summary;
    } finally {
        await releaseTaskLease(task, lease.leaseId).catch(error => {
            logger.error('[Canonica Scheduler] Failed to release task lease', {
                task: task.name,
                runId,
                error: errorMessage(error),
            });
        });
    }
}

export async function runCanonicaMasterScheduler(options: {
    trigger?: CanonicaMasterSchedulerTrigger;
    triggeredBy?: string;
    forceAllTenants?: boolean;
    tenantScope?: CanonicaTenantStore[];
} = {}): Promise<CanonicaMasterSchedulerResult> {
    const trigger = options.trigger || 'scheduled';
    const triggeredBy = options.triggeredBy || (trigger === 'scheduled' ? 'system' : 'manual');
    const startedAt = new Date();
    const runId = `canonica_scheduler_${trigger}_${startedAt.getTime()}`;
    const tasks: CanonicaSchedulerTaskSummary[] = [];

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
    const status: CanonicaMasterSchedulerStatus = failures.length > 0
        ? (failures.length === tasks.length ? 'failed' : 'partial')
        : (activeTasks.length > 0 ? 'success' : 'skipped');
    const result: CanonicaMasterSchedulerResult = {
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
        logger.info('[Canonica Scheduler] Run complete', {
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
