import { randomUUID } from "crypto";
import { Firestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { SIGNALDESK_COLLECTIONS } from "../constants/database";
import { FUNCTION_FLAGS } from "../constants/features";
import { db as defaultDb } from "../firebaseAdmin";
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorName,
} from "../utils/boundedErrorContext";
import {
  runSignalDeskProofPermissionLifecycle,
  SignalDeskProofPermissionLifecycleResult,
} from "./proofPermissionLifecycle";
import {
  runSignalDeskSourceDataLifecycle,
  SignalDeskSourceDataLifecycleResult,
} from "./sourceDataLifecycle";

const SCHEDULER_NAME = "signaldeskMaintenanceScheduler";
const STATE_DOC_ID = "signaldeskMaintenanceScheduler";
const TASK_LOCK_PREFIX = "signaldeskMaintenanceTaskLock_";
const HOUR_MS = 60 * 60 * 1000;
const TASK_LEASE_MS = 50 * 60 * 1000;
const LEASE_RELEASE_FAILURE_CODE = "SIGNALDESK_MAINTENANCE_LEASE_RELEASE_FAILED";

const TASK_NAMES = ["proof_permission_lifecycle", "source_data_lifecycle"] as const;
type TaskName = typeof TASK_NAMES[number];

const TASK_FAILURE_CODES = {
  proof_permission_lifecycle: "SIGNALDESK_PROOF_PERMISSION_LIFECYCLE_FAILED",
  source_data_lifecycle: "SIGNALDESK_SOURCE_DATA_LIFECYCLE_FAILED",
} as const satisfies Record<TaskName, string>;

type TaskStatus = "success" | "failed" | "skipped";

export interface SignalDeskMaintenanceTaskSummary {
  activity: boolean;
  details?: SignalDeskProofPermissionLifecycleResult | SignalDeskSourceDataLifecycleResult | Record<string, unknown>;
  durationMs: number;
  name: TaskName;
  status: TaskStatus;
  error?: typeof TASK_FAILURE_CODES[TaskName];
}

export interface SignalDeskMaintenanceSchedulerResult {
  durationMs: number;
  runId: string;
  scheduler: typeof SCHEDULER_NAME;
  status: TaskStatus;
  tasks: SignalDeskMaintenanceTaskSummary[];
}

export interface RunSignalDeskMaintenanceSchedulerOptions {
  firestore?: Firestore;
  lifecycleRunner?: typeof runSignalDeskProofPermissionLifecycle;
  now?: Date;
  runId?: string;
  sourceDataLifecycleRunner?: typeof runSignalDeskSourceDataLifecycle;
}

interface LeaseResult {
  acquired: boolean;
  leaseId: string | null;
  reason?: "already_completed" | "lease_held";
}

const timestampMillis = (value: unknown): number | null => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  if (value && typeof value === "object") {
    const source = value as { seconds?: unknown; nanoseconds?: unknown };
    if (typeof source.seconds === "number" && Number.isFinite(source.seconds)) {
      const nanoseconds = typeof source.nanoseconds === "number" && Number.isFinite(source.nanoseconds)
        ? source.nanoseconds
        : 0;
      return (source.seconds * 1000) + Math.floor(nanoseconds / 1_000_000);
    }
  }
  return null;
};

const hourBucket = (date: Date): number => Math.floor(date.getTime() / HOUR_MS);

const sourceErrorContext = (error: unknown): {
  sourceErrorCode?: string;
  sourceErrorName: string;
} => {
  return {
    sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
    ...(getBoundedFunctionsErrorCode(error)
      ? { sourceErrorCode: getBoundedFunctionsErrorCode(error) }
      : {}),
  };
};

const acquireTaskLease = async (params: {
  firestore: Firestore;
  now: Date;
  runId: string;
  taskName: TaskName;
}): Promise<LeaseResult> => {
  const stateRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(STATE_DOC_ID);
  const lockRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(`${TASK_LOCK_PREFIX}${params.taskName}`);
  const bucket = hourBucket(params.now);
  const leaseId = `${params.runId}_${params.taskName}`;
  const nowTimestamp = Timestamp.fromDate(params.now);
  const leaseExpiresAt = Timestamp.fromMillis(params.now.getTime() + TASK_LEASE_MS);

  return params.firestore.runTransaction(async transaction => {
    const [stateSnapshot, lockSnapshot] = await Promise.all([
      transaction.get(stateRef),
      transaction.get(lockRef),
    ]);
    if (stateSnapshot.exists && stateSnapshot.get("pId") !== "SD") {
      throw new Error("SIGNALDESK_MAINTENANCE_STATE_PRODUCT_MISMATCH");
    }
    if (lockSnapshot.exists && lockSnapshot.get("pId") !== "SD") {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_PRODUCT_MISMATCH");
    }
    const taskState = stateSnapshot.get(`tasks.${params.taskName}`) as Record<string, unknown> | undefined;
    if (
      taskState?.lastCompletedBucket !== undefined
      && taskState.lastCompletedBucket !== null
      && (!Number.isInteger(taskState.lastCompletedBucket) || (taskState.lastCompletedBucket as number) < 0)
    ) throw new Error("SIGNALDESK_MAINTENANCE_STATE_SHAPE_INVALID");
    if (taskState?.lastCompletedBucket === bucket) {
      return { acquired: false, leaseId: null, reason: "already_completed" };
    }
    const currentLeaseOwner = lockSnapshot.get("leaseOwner");
    const currentLeaseExpiry = timestampMillis(lockSnapshot.get("leaseExpiresAt"));
    if (currentLeaseOwner !== undefined && currentLeaseOwner !== null && typeof currentLeaseOwner !== "string") {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_SHAPE_INVALID");
    }
    if (typeof currentLeaseOwner === "string" && currentLeaseOwner && currentLeaseExpiry === null) {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_SHAPE_INVALID");
    }
    if (
      typeof currentLeaseOwner === "string"
      && currentLeaseOwner
      && currentLeaseExpiry !== null
      && currentLeaseExpiry > params.now.getTime()
    ) return { acquired: false, leaseId: null, reason: "lease_held" };

    transaction.set(lockRef, {
      pId: "SD",
      schedulerName: SCHEDULER_NAME,
      taskName: params.taskName,
      leaseOwner: leaseId,
      leaseRunId: params.runId,
      leaseStartedAt: nowTimestamp,
      leaseExpiresAt,
      updatedAt: nowTimestamp,
    }, { merge: true });
    transaction.set(stateRef, {
      pId: "SD",
      schedulerName: SCHEDULER_NAME,
      tasks: {
        [params.taskName]: {
          lastAttemptAt: nowTimestamp,
          lastAttemptBucket: bucket,
          lastRunId: params.runId,
          lastStatus: "running",
        },
      },
      updatedAt: nowTimestamp,
    }, { merge: true });
    return { acquired: true, leaseId };
  });
};

const recordTaskOutcome = async (params: {
  details?: SignalDeskProofPermissionLifecycleResult | SignalDeskSourceDataLifecycleResult | Record<string, unknown>;
  durationMs: number;
  failureCode: typeof TASK_FAILURE_CODES[TaskName];
  firestore: Firestore;
  finishedAt: Date;
  leaseId: string;
  runId: string;
  startedAt: Date;
  status: "success" | "failed";
  taskName: TaskName;
}): Promise<void> => {
  const stateRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(STATE_DOC_ID);
  const lockRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(`${TASK_LOCK_PREFIX}${params.taskName}`);
  const timestamp = Timestamp.fromDate(params.finishedAt);
  const completed = params.status === "success";
  await params.firestore.runTransaction(async transaction => {
    const [stateSnapshot, lockSnapshot] = await Promise.all([
      transaction.get(stateRef),
      transaction.get(lockRef),
    ]);
    if (stateSnapshot.exists && stateSnapshot.get("pId") !== "SD") {
      throw new Error("SIGNALDESK_MAINTENANCE_STATE_PRODUCT_MISMATCH");
    }
    if (!lockSnapshot.exists || lockSnapshot.get("pId") !== "SD") {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_PRODUCT_MISMATCH");
    }
    if (lockSnapshot.get("leaseOwner") !== params.leaseId) {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_LOST");
    }
    transaction.set(stateRef, {
      pId: "SD",
      schedulerName: SCHEDULER_NAME,
      tasks: {
        [params.taskName]: {
          lastAttemptAt: Timestamp.fromDate(params.startedAt),
          lastAttemptBucket: hourBucket(params.startedAt),
          ...(completed ? {
            lastCompletedAt: timestamp,
            lastCompletedBucket: hourBucket(params.startedAt),
          } : {
            lastFailedAt: timestamp,
            lastFailureCode: params.failureCode,
            lastFailedRunId: params.runId,
          }),
          lastDetails: params.details || {},
          lastDurationMs: params.durationMs,
          lastError: completed ? null : params.failureCode,
          lastRunId: params.runId,
          lastStatus: params.status,
        },
      },
      updatedAt: timestamp,
    }, { merge: true });
  });
};

const releaseTaskLease = async (params: {
  firestore: Firestore;
  leaseId: string;
  now: Date;
  taskName: TaskName;
}): Promise<void> => {
  const lockRef = params.firestore.collection(SIGNALDESK_COLLECTIONS.SYSTEM).doc(`${TASK_LOCK_PREFIX}${params.taskName}`);
  await params.firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(lockRef);
    if (snapshot.exists && snapshot.get("pId") !== "SD") {
      throw new Error("SIGNALDESK_MAINTENANCE_LEASE_PRODUCT_MISMATCH");
    }
    if (snapshot.get("leaseOwner") !== params.leaseId) return;
    const timestamp = Timestamp.fromDate(params.now);
    transaction.set(lockRef, {
      leaseOwner: null,
      leaseExpiresAt: Timestamp.fromMillis(0),
      lastReleasedAt: timestamp,
      updatedAt: timestamp,
    }, { merge: true });
  });
};

const proofLifecycleHasActivity = (result: SignalDeskProofPermissionLifecycleResult): boolean => (
  result.completedPermissionCount > 0
  || result.conflictedPermissionCount > 0
  || result.failedPermissionCount > 0
  || result.failureDiagnosticErrorCount > 0
  || result.materializedPermissionCount > 0
  || result.pendingPermissionCount > 0
  || result.publishedIncidentCount > 0
  || result.retriedPermissionCount > 0
);

const sourceDataLifecycleHasActivity = (result: SignalDeskSourceDataLifecycleResult): boolean => (
  result.completedPolicyCount > 0
  || result.completedTargetCount > 0
  || result.conflictedAuthorityCount > 0
  || result.conflictedProviderCount > 0
  || result.conflictedTargetCount > 0
  || result.failedAuthorityCount > 0
  || result.failedTargetCount > 0
  || result.failureDiagnosticErrorCount > 0
  || result.materializedPolicyCount > 0
  || result.materializedProviderRetentionCount > 0
  || result.materializedTargetCount > 0
  || result.pendingPolicyCount > 0
  || result.pendingTargetCount > 0
  || result.retriedPolicyCount > 0
  || result.retriedProviderCount > 0
  || result.retriedTargetCount > 0
);

const runMaintenanceTask = async <TDetails extends SignalDeskProofPermissionLifecycleResult | SignalDeskSourceDataLifecycleResult>(
  params: {
    activity: (details: TDetails) => boolean;
    enabled: boolean;
    failureCode: typeof TASK_FAILURE_CODES[TaskName];
    firestore: Firestore;
    now: Date;
    run: () => Promise<TDetails>;
    runId: string;
    taskName: TaskName;
  },
): Promise<{ error?: unknown; summary: SignalDeskMaintenanceTaskSummary }> => {
  if (!params.enabled) {
    return {
      summary: {
        activity: false,
        details: { reason: "feature_disabled" },
        durationMs: 0,
        name: params.taskName,
        status: "skipped",
      },
    };
  }
  let lease: LeaseResult;
  try {
    lease = await acquireTaskLease({
      firestore: params.firestore,
      now: params.now,
      runId: params.runId,
      taskName: params.taskName,
    });
  } catch (error) {
    logger.error("[SignalDesk Maintenance] Task lease acquisition failed", {
      failureCode: params.failureCode,
      runIdLength: params.runId.length,
      runIdPresent: params.runId.length > 0,
      taskName: params.taskName,
      ...sourceErrorContext(error),
    });
    return {
      error,
      summary: {
        activity: true,
        details: { failureCode: params.failureCode, phase: "lease-acquisition" },
        durationMs: 0,
        error: params.failureCode,
        name: params.taskName,
        status: "failed",
      },
    };
  }
  if (!lease.acquired || !lease.leaseId) {
    return {
      summary: {
        activity: false,
        details: { reason: lease.reason || "lease_unavailable" },
        durationMs: 0,
        name: params.taskName,
        status: "skipped",
      },
    };
  }

  const taskStartedMillis = Date.now();
  try {
    const details = await params.run();
    const durationMs = Date.now() - taskStartedMillis;
    await recordTaskOutcome({
      details,
      durationMs,
      failureCode: params.failureCode,
      firestore: params.firestore,
      finishedAt: new Date(),
      leaseId: lease.leaseId,
      runId: params.runId,
      startedAt: params.now,
      status: "success",
      taskName: params.taskName,
    });
    return {
      summary: {
        activity: params.activity(details),
        details,
        durationMs,
        name: params.taskName,
        status: "success",
      },
    };
  } catch (error) {
    const durationMs = Date.now() - taskStartedMillis;
    try {
      await recordTaskOutcome({
        details: { failureCode: params.failureCode },
        durationMs,
        failureCode: params.failureCode,
        firestore: params.firestore,
        finishedAt: new Date(),
        leaseId: lease.leaseId,
        runId: params.runId,
        startedAt: params.now,
        status: "failed",
        taskName: params.taskName,
      });
    } catch (outcomeError) {
      logger.error(params.taskName === "proof_permission_lifecycle"
        ? "[SignalDesk Maintenance] Failed to record proof-permission lifecycle outcome"
        : "[SignalDesk Maintenance] Failed to record source-data lifecycle outcome", {
        failureCode: params.failureCode,
        taskName: params.taskName,
        ...sourceErrorContext(outcomeError),
      });
    }
    logger.error("[SignalDesk Maintenance] Task failed", {
      failureCode: params.failureCode,
      runIdLength: params.runId.length,
      runIdPresent: params.runId.length > 0,
      taskName: params.taskName,
      ...sourceErrorContext(error),
    });
    return {
      error,
      summary: {
        activity: true,
        details: { failureCode: params.failureCode },
        durationMs,
        error: params.failureCode,
        name: params.taskName,
        status: "failed",
      },
    };
  } finally {
    await releaseTaskLease({
      firestore: params.firestore,
      leaseId: lease.leaseId,
      now: new Date(),
      taskName: params.taskName,
    }).catch(error => {
      logger.error("[SignalDesk Maintenance] Failed to release task lease", {
        failureCode: LEASE_RELEASE_FAILURE_CODE,
        taskName: params.taskName,
        ...sourceErrorContext(error),
      });
    });
  }
};

export async function runSignalDeskMaintenanceScheduler(
  options: RunSignalDeskMaintenanceSchedulerOptions = {},
): Promise<SignalDeskMaintenanceSchedulerResult> {
  const firestore = options.firestore || defaultDb;
  const startedAt = options.now || new Date();
  const runId = options.runId
    || `signaldesk_maintenance_${startedAt.getTime()}_${randomUUID().slice(0, 8)}`;
  const startedMillis = Date.now();
  const proofRunner = options.lifecycleRunner || runSignalDeskProofPermissionLifecycle;
  const sourceRunner = options.sourceDataLifecycleRunner || runSignalDeskSourceDataLifecycle;
  const tasks: SignalDeskMaintenanceTaskSummary[] = [];
  const errors: unknown[] = [];

  const proofTask = await runMaintenanceTask({
    activity: proofLifecycleHasActivity,
    enabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_PROOF_PERMISSION_LIFECYCLE,
    failureCode: TASK_FAILURE_CODES.proof_permission_lifecycle,
    firestore,
    now: startedAt,
    run: () => proofRunner({ firestore, now: Timestamp.fromDate(startedAt) }),
    runId,
    taskName: "proof_permission_lifecycle",
  });
  tasks.push(proofTask.summary);
  if (proofTask.error) errors.push(proofTask.error);

  const sourceTask = await runMaintenanceTask({
    activity: sourceDataLifecycleHasActivity,
    enabled: FUNCTION_FLAGS.ENABLE_SIGNALDESK_SOURCE_DATA_LIFECYCLE,
    failureCode: TASK_FAILURE_CODES.source_data_lifecycle,
    firestore,
    now: startedAt,
    run: () => sourceRunner({ firestore, now: Timestamp.fromDate(startedAt) }),
    runId,
    taskName: "source_data_lifecycle",
  });
  tasks.push(sourceTask.summary);
  if (sourceTask.error) errors.push(sourceTask.error);

  if (errors.length > 0) throw errors[0];
  return {
    durationMs: Date.now() - startedMillis,
    runId,
    scheduler: SCHEDULER_NAME,
    status: tasks.some(task => task.status === "success") ? "success" : "skipped",
    tasks,
  };
}

export const signaldeskMaintenanceScheduler = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "UTC",
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB",
    maxInstances: 1,
  },
  async () => {
    await runSignalDeskMaintenanceScheduler();
  },
);
