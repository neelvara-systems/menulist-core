/**
 * Scheduler Monitor — Data Access Layer
 * 
 * Read-only DAL for scheduler monitoring dashboard.
 * Fetches run logs from Firestore schedulerRunLogs collection.
 * 
 * Firebase cost: ~3-5 reads per dashboard load.
 * Used by founder only at /ops/scheduler.
 * 
 * @see __docs__/decision-intelligence/decision-intelligence_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { assertCurrentPlatformAccess } from '@lib/auth/currentPlatformAccessClient';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { normalizeSchedulerRecoveryRunLogId } from '@lib/ops/schedulerRecoveryResponse';
import type {
  SchedulerDashboardSnapshot,
  SchedulerHealthSummary,
  SchedulerRunFilter,
  SchedulerRunLog,
  SchedulerSettlementState,
  SchedulerSettlementSummary,
  SchedulerTaskName,
} from '@lib/ops/schedulerTypes';
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

const SCHEDULER_HISTORY_LIMIT = 30;
const SCHEDULER_SETTLEMENT_LIMIT = 100;

function boundedPositiveInteger(value: unknown, fallback: number, maximum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanSchedulerText(value: unknown, maximum: number): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximum)
    : '';
}

function schedulerCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100_000
    ? value
    : 0;
}

function schedulerDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 24 * 60 * 60 * 1000
    ? value
    : 0;
}

function schedulerTimestamp(value: unknown): unknown | null {
  try {
    if (!value || typeof value !== 'object') return null;
    const timestamp = value as { seconds?: unknown; toMillis?: () => number };
    if (typeof timestamp.toMillis === 'function') {
      const millis = timestamp.toMillis();
      return Number.isFinite(millis) && millis > 0 ? value : null;
    }
    return typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds) && timestamp.seconds > 0
      ? value
      : null;
  } catch {
    return null;
  }
}

function normalizeSchedulerDetails(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).slice(0, 20).flatMap(([key, detail], index) => {
    const normalizedKey = /^[a-zA-Z0-9_.:-]{1,48}$/.test(key) ? key : `detail_${index + 1}`;
    if (detail === null || typeof detail === 'boolean') return [[normalizedKey, detail] as const];
    if (typeof detail === 'number' && Number.isFinite(detail)) return [[normalizedKey, detail] as const];
    if (typeof detail === 'string') return [[normalizedKey, cleanSchedulerText(detail, 240)] as const];
    if (Array.isArray(detail)) return [[normalizedKey, detail.slice(0, 20)] as const];
    if (isRecord(detail)) return [[normalizedKey, Object.fromEntries(Object.entries(detail).slice(0, 20))] as const];
    return [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function normalizeSchedulerRunLog(id: string, value: unknown): SchedulerRunLog | null {
  if (!isValidFirestoreDocumentId(id) || !isRecord(value)) return null;
  if (!['success', 'partial', 'failed', 'skipped', 'running'].includes(String(value.status))) return null;
  if (value.trigger !== 'scheduled' && value.trigger !== 'manual') return null;
  const startedAt = schedulerTimestamp(value.startedAt);
  if (!startedAt) return null;

  const tasks = Array.isArray(value.tasks)
    ? value.tasks.slice(0, 40).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const name = cleanSchedulerText(entry.name, 64);
      const status = entry.status === 'success' || entry.status === 'failed' || entry.status === 'skipped'
        ? entry.status
        : null;
      if (!name || !status) return [];
      const error = cleanSchedulerText(entry.error, 160);
      return [{
        name: name as SchedulerTaskName,
        status: status as 'success' | 'failed' | 'skipped',
        durationMs: schedulerDuration(entry.durationMs),
        ...(normalizeSchedulerDetails(entry.details) ? { details: normalizeSchedulerDetails(entry.details) } : {}),
        ...(error ? { error } : {}),
      }];
    })
    : [];
  const errors = Array.isArray(value.errors)
    ? value.errors.slice(0, 100).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const error = cleanSchedulerText(entry.error, 160) || 'scheduler_failure';
      return [{
        tId: cleanSchedulerText(entry.tId, 160),
        sId: cleanSchedulerText(entry.sId, 160),
        ...(cleanSchedulerText(entry.projectId, 160) ? { projectId: cleanSchedulerText(entry.projectId, 160) } : {}),
        error,
        ...(cleanSchedulerText(entry.code, 80) ? { code: cleanSchedulerText(entry.code, 80) } : {}),
        ...(cleanSchedulerText(entry.name, 80) ? { name: cleanSchedulerText(entry.name, 80) } : {}),
        ...(cleanSchedulerText(entry.phase, 80) ? { phase: cleanSchedulerText(entry.phase, 80) } : {}),
        ...(cleanSchedulerText(entry.operation, 80) ? { operation: cleanSchedulerText(entry.operation, 80) } : {}),
        ...(cleanSchedulerText(entry.settlementDate, 20) ? { settlementDate: cleanSchedulerText(entry.settlementDate, 20) } : {}),
        ...(normalizeSchedulerDetails(entry.details) ? { details: normalizeSchedulerDetails(entry.details) } : {}),
      }];
    })
    : [];

  return {
    id,
    trigger: value.trigger,
    triggeredBy: cleanSchedulerText(value.triggeredBy, 160) || 'system',
    startedAt,
    completedAt: schedulerTimestamp(value.completedAt),
    ...(schedulerTimestamp(value.expiresAt) ? { expiresAt: schedulerTimestamp(value.expiresAt) } : {}),
    durationMs: schedulerDuration(value.durationMs),
    status: value.status as SchedulerRunLog['status'],
    ...(typeof value.schedulerHour === 'number' && Number.isInteger(value.schedulerHour) && value.schedulerHour >= 0 && value.schedulerHour <= 23 ? { schedulerHour: value.schedulerHour } : {}),
    totalStoresInPlatform: schedulerCount(value.totalStoresInPlatform),
    storeMismatch: value.storeMismatch === true,
    ...(cleanSchedulerText(value.reason, 120) ? { reason: cleanSchedulerText(value.reason, 120) } : {}),
    ...(cleanSchedulerText(value.phase, 80) ? { phase: cleanSchedulerText(value.phase, 80) } : {}),
    ...(normalizeSchedulerRecoveryRunLogId(value.runLogId) ? { runLogId: normalizeSchedulerRecoveryRunLogId(value.runLogId) || undefined } : {}),
    totalStores: schedulerCount(value.totalStores),
    totalProjects: schedulerCount(value.totalProjects),
    successCount: schedulerCount(value.successCount),
    failedCount: schedulerCount(value.failedCount),
    skippedCount: schedulerCount(value.skippedCount),
    intelligenceSuccess: schedulerCount(value.intelligenceSuccess),
    intelligenceFailed: schedulerCount(value.intelligenceFailed),
    tasks,
    errors,
  };
}

function normalizeSchedulerLocalDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(value) ? value : undefined;
}

export function normalizeSchedulerSettlementState(id: string, value: unknown): SchedulerSettlementState | null {
  if (!id.startsWith('nightlyState_') || !isValidFirestoreDocumentId(id) || !isRecord(value)) return null;
  const status = cleanSchedulerText(value.status, 32);
  const phase = cleanSchedulerText(value.phase, 80);
  const error = cleanSchedulerText(value.error, 160);
  return {
    id,
    ...(cleanSchedulerText(value.tId, 160) ? { tId: cleanSchedulerText(value.tId, 160) } : {}),
    ...(cleanSchedulerText(value.sId, 160) ? { sId: cleanSchedulerText(value.sId, 160) } : {}),
    ...(status ? { status } : {}),
    ...(phase ? { phase } : {}),
    ...(normalizeSchedulerLocalDate(value.lastAttemptedLocalDate) ? { lastAttemptedLocalDate: normalizeSchedulerLocalDate(value.lastAttemptedLocalDate) } : {}),
    ...(normalizeSchedulerLocalDate(value.lastSettledLocalDate) ? { lastSettledLocalDate: normalizeSchedulerLocalDate(value.lastSettledLocalDate) } : {}),
    ...(schedulerTimestamp(value.lastCompletedAt) ? { lastCompletedAt: schedulerTimestamp(value.lastCompletedAt) } : {}),
    ...(schedulerTimestamp(value.updatedAt) ? { updatedAt: schedulerTimestamp(value.updatedAt) } : {}),
    ...(error ? { error } : {}),
  };
}

function getEmptySchedulerHealthSummary(): SchedulerHealthSummary {
  return {
    lastRun: null,
    lastSuccessfulRun: null,
    consecutiveFailures: 0,
    healthStatus: 'unknown',
    runsLast7Days: 0,
    avgDurationMs: 0,
  };
}

function buildSchedulerHealthSummaryFromRuns(runs: SchedulerRunLog[]): SchedulerHealthSummary {
  const summary = getEmptySchedulerHealthSummary();
  if (runs.length === 0) return summary;

  summary.lastRun = runs[0];
  summary.lastSuccessfulRun = runs.find(r => r.status === 'success') || null;

  let consecutiveFailures = 0;
  for (const run of runs) {
    if (run.status === 'failed') {
      consecutiveFailures++;
    } else {
      break;
    }
  }
  summary.consecutiveFailures = consecutiveFailures;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRuns = runs.filter(r => {
    const ts = r.startedAt?.toMillis?.() || r.startedAt?.seconds * 1000 || 0;
    return ts > sevenDaysAgo;
  });
  summary.runsLast7Days = recentRuns.length;

  const durationsMs = recentRuns.filter(r => r.durationMs).map(r => r.durationMs);
  summary.avgDurationMs = durationsMs.length > 0
    ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length)
    : 0;

  if (summary.lastRun?.status === 'running') {
    summary.healthStatus = 'warning';
  } else if (consecutiveFailures >= 3) {
    summary.healthStatus = 'critical';
  } else if (consecutiveFailures >= 1 || (summary.lastRun?.status === 'partial')) {
    summary.healthStatus = 'warning';
  } else if (summary.lastRun?.status === 'success') {
    const lastRunTs = summary.lastRun.startedAt?.toMillis?.() || summary.lastRun.startedAt?.seconds * 1000 || 0;
    const isStale = Date.now() - lastRunTs > 26 * 60 * 60 * 1000;
    summary.healthStatus = isStale ? 'warning' : 'healthy';
  }

  return summary;
}

// ================================================================
// GET RUN HISTORY (filterable)
// ================================================================

/**
 * Get scheduler run history with optional filters.
 * Firestore reads: 1 (limit capped at 30)
 */
export async function getSchedulerRunHistory(
  filter?: SchedulerRunFilter
): Promise<SchedulerRunLog[]> {
  try {
    const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);
    const constraints: any[] = [orderBy('startedAt', 'desc')];

    if (filter?.status) {
      constraints.push(where('status', '==', filter.status));
    }
    if (filter?.trigger) {
      constraints.push(where('trigger', '==', filter.trigger));
    }

    const historyLimit = boundedPositiveInteger(filter?.limit, 20, SCHEDULER_HISTORY_LIMIT);
    constraints.push(limit(historyLimit));

    const logsQuery = query(logsRef, ...constraints);
    const snap = await getDocs(logsQuery);

    return snap.docs
      .map((document) => normalizeSchedulerRunLog(document.id, document.data()))
      .filter((run): run is SchedulerRunLog => run !== null);
  } catch (error) {
    logOpsFailure('ops_scheduler_run_history_load_failed', error, {
      statusFilter: filter?.status,
      triggerFilter: filter?.trigger,
      limit: boundedPositiveInteger(filter?.limit, 20, SCHEDULER_HISTORY_LIMIT),
    });
    throw new Error('ops_scheduler_run_history_unavailable');
  }
}

// ================================================================
// GET HEALTH SUMMARY
// ================================================================

/**
 * Compute scheduler health from recent run logs.
 * Firestore reads: 1 (last 7 runs)
 */
export async function getSchedulerHealthSummary(): Promise<SchedulerHealthSummary> {
  try {
    const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);

    // Get last 10 runs to compute health
    const recentQuery = query(logsRef, orderBy('startedAt', 'desc'), limit(10));
    const snap = await getDocs(recentQuery);

    const runs = snap.docs
      .map((document) => normalizeSchedulerRunLog(document.id, document.data()))
      .filter((run): run is SchedulerRunLog => run !== null);
    return buildSchedulerHealthSummaryFromRuns(runs);
  } catch (error) {
    logOpsFailure('ops_scheduler_health_summary_load_failed', error);
    throw new Error('ops_scheduler_health_summary_unavailable');
  }
}

// ================================================================
// GET SINGLE RUN DETAILS (for error inspection)
// ================================================================

/**
 * Get a single run's full details including error list.
 * Firestore reads: 1
 */
export async function getSchedulerRunDetails(runId: string): Promise<SchedulerRunLog | null> {
  await assertCurrentPlatformAccess();
  if (typeof runId !== 'string' || runId !== runId.trim() || !isValidFirestoreDocumentId(runId)) {
    return null;
  }
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS, runId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    return normalizeSchedulerRunLog(snap.id, snap.data());
  } catch (error) {
    logOpsFailure('ops_scheduler_run_details_load_failed', error, {
      ...getBoundedOpsStringContext('runId', runId),
    });
    throw new Error('ops_scheduler_run_details_unavailable');
  }
}

// ================================================================
// GET ANALYTICS SETTLEMENT STATE
// ================================================================

/**
 * Get recent per-store analytics settlement state.
 * Firestore reads: 1 query over platformSummary/nightlyState_* docs.
 */
export async function getSchedulerSettlementSummary(maxResults: number = 50): Promise<SchedulerSettlementSummary> {
  const settlementLimit = boundedPositiveInteger(maxResults, 50, SCHEDULER_SETTLEMENT_LIMIT);
  const summary: SchedulerSettlementSummary = {
    states: [],
    totalTrackedStores: 0,
    runningCount: 0,
    failedCount: 0,
    staleCount: 0,
    latestSettledDate: null,
  };

  try {
    const summaryRef = collection(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY);
    const statesQuery = query(
      summaryRef,
      where(documentId(), '>=', 'nightlyState_'),
      where(documentId(), '<=', 'nightlyState_~'),
      orderBy(documentId()),
      limit(settlementLimit),
    );
    const snap = await getDocs(statesQuery);

    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const staleCutoff = twoDaysAgo.toISOString().split('T')[0];

    summary.states = snap.docs
      .map((document) => normalizeSchedulerSettlementState(document.id, document.data()))
      .filter((state): state is SchedulerSettlementState => state !== null);

    summary.totalTrackedStores = summary.states.length;
    summary.runningCount = summary.states.filter((state) => state.status === 'running').length;
    summary.failedCount = summary.states.filter((state) => state.status === 'failed').length;
    summary.staleCount = summary.states.filter((state) => {
      if (!state.lastSettledLocalDate) return false;
      return state.lastSettledLocalDate < staleCutoff;
    }).length;
    summary.latestSettledDate = summary.states
      .map((state) => state.lastSettledLocalDate)
      .filter(Boolean)
      .sort()
      .pop() || null;
    return summary;
  } catch (error) {
    logOpsFailure('ops_scheduler_settlement_summary_load_failed', error, {
      maxResults: settlementLimit,
    });
    throw new Error('ops_scheduler_settlement_summary_unavailable');
  }
}

// ================================================================
// GET DASHBOARD SNAPSHOT
// ================================================================

/**
 * Get scheduler dashboard data while avoiding duplicate recent-run reads.
 * When no status/trigger filter is active, health is computed from the same
 * run-history query used by the table.
 */
export async function getSchedulerDashboardSnapshot(
  filter?: SchedulerRunFilter,
  settlementLimit: number = 50,
): Promise<SchedulerDashboardSnapshot> {
  await assertCurrentPlatformAccess();
  const hasHistoryFilter = Boolean(filter?.status || filter?.trigger);
  const historyLimit = boundedPositiveInteger(filter?.limit, 20, SCHEDULER_HISTORY_LIMIT);
  const boundedSettlementLimit = boundedPositiveInteger(settlementLimit, 50, SCHEDULER_SETTLEMENT_LIMIT);

  if (!hasHistoryFilter) {
    const [runHistory, settlement] = await Promise.all([
      getSchedulerRunHistory({ ...filter, limit: Math.max(historyLimit, 10) }),
      getSchedulerSettlementSummary(boundedSettlementLimit),
    ]);

    return {
      health: buildSchedulerHealthSummaryFromRuns(runHistory.slice(0, 10)),
      runHistory: runHistory.slice(0, historyLimit),
      settlement,
    };
  }

  const [health, runHistory, settlement] = await Promise.all([
    getSchedulerHealthSummary(),
    getSchedulerRunHistory(filter),
    getSchedulerSettlementSummary(boundedSettlementLimit),
  ]);

  return { health, runHistory, settlement };
}
