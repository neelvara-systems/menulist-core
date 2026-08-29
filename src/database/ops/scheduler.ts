/**
 * Scheduler Monitor — Data Access Layer
 * 
 * Read-only DAL for scheduler monitoring dashboard.
 * Fetches run logs from Firestore schedulerRunLogs collection.
 * 
 * Firebase cost: bounded run/settlement document reads plus one aggregation
 * count for the exact seven-day run total.
 * Used by founder only at /ops/scheduler.
 * 
 * @see __docs__/decision-intelligence/decision-intelligence_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { assertCurrentPlatformAccess } from '@lib/auth/currentPlatformAccessClient';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { normalizeOpsTimestamp } from '@lib/ops/opsTimestamp';
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
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  type QueryConstraint,
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

const schedulerTimestamp = normalizeOpsTimestamp;

const SCHEDULER_TASK_NAMES = new Set<SchedulerTaskName>([
  'decision_blocks', 'menu_intelligence', 'customer_obp_analytics',
  'authority_maturation', 'menu_drift', 'guest_feedback_retention',
  'subscription_reconciliation', 'obp_analytics', 'lifecycle_messaging',
  'special_menu_switching', 'extraction_learning', 'store_truth_confidence',
  'staleness_check', 'reseller_license_expiry', 'feedback_intelligence',
  'kb_quality', 'weekly_narrative', 'health_signals', 'owner_business_health',
  'kb_generation_watchdog', 'messaging_intake', 'menu_stuck_cleanup',
  'special_menu_lifecycle', 'alert_escalation', 'founder_monitor_snapshot',
  'chat_stats_aggregation', 'ai_provider_health_check', 'subscription_access_expiry',
  'billing_health_snapshot', 'menu_old_cleanup', 'public_menu_draft_cleanup',
  'messaging_session_cleanup', 'owner_business_assistant_cleanup',
  'ai_operation_detail_cleanup', 'image_batch_job_retention_cleanup',
  'ai_image_prompt_cache_cleanup', 'menu_snapshot_cleanup',
  'owner_notification_retention_cleanup', 'feedback_event_retention_cleanup',
  'scheduler_run_log_retention_cleanup', 'system_alert_retention_cleanup',
  'answerlattice_nightly',
]);

function normalizeSchedulerDetails(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  try {
    const entries: Array<[string, unknown]> = [];
    Object.entries(value).slice(0, 20).forEach(([key, detail], index) => {
      const normalizedKey = /^[a-zA-Z0-9_.:-]{1,48}$/.test(key) ? key : `detail_${index + 1}`;
      if (detail === null || typeof detail === 'boolean') entries.push([normalizedKey, detail]);
      else if (typeof detail === 'number' && Number.isFinite(detail)) entries.push([normalizedKey, detail]);
      else if (typeof detail === 'string') entries.push([normalizedKey, cleanSchedulerText(detail, 240)]);
      else if (Array.isArray(detail)) entries.push([normalizedKey, `[array:length=${Math.min(detail.length, 10_000)}]`]);
      else if (isRecord(detail)) entries.push([normalizedKey, `[object:keys=${Math.min(Object.keys(detail).length, 10_000)}]`]);
    });
    return entries.length ? Object.fromEntries(entries) : undefined;
  } catch {
    return undefined;
  }
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
      if (!SCHEDULER_TASK_NAMES.has(name as SchedulerTaskName) || !status) return [];
      const error = cleanSchedulerText(entry.error, 160);
      const details = normalizeSchedulerDetails(entry.details);
      return [{
        name: name as SchedulerTaskName,
        status: status as 'success' | 'failed' | 'skipped',
        durationMs: schedulerDuration(entry.durationMs),
        ...(details ? { details } : {}),
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
  const completedAt = schedulerTimestamp(value.completedAt);
  const expiresAt = schedulerTimestamp(value.expiresAt);

  return {
    id,
    trigger: value.trigger,
    triggeredBy: cleanSchedulerText(value.triggeredBy, 160) || 'system',
    startedAt,
    completedAt,
    ...(expiresAt ? { expiresAt } : {}),
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
  const lastAttemptedLocalDate = normalizeSchedulerLocalDate(value.lastAttemptedLocalDate);
  const lastSettledLocalDate = normalizeSchedulerLocalDate(value.lastSettledLocalDate);
  const lastCompletedAt = schedulerTimestamp(value.lastCompletedAt);
  const updatedAt = schedulerTimestamp(value.updatedAt);
  return {
    id,
    ...(cleanSchedulerText(value.tId, 160) ? { tId: cleanSchedulerText(value.tId, 160) } : {}),
    ...(cleanSchedulerText(value.sId, 160) ? { sId: cleanSchedulerText(value.sId, 160) } : {}),
    ...(status ? { status } : {}),
    ...(phase ? { phase } : {}),
    ...(lastAttemptedLocalDate ? { lastAttemptedLocalDate } : {}),
    ...(lastSettledLocalDate ? { lastSettledLocalDate } : {}),
    ...(lastCompletedAt ? { lastCompletedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
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

export function buildSchedulerHealthSummaryFromRuns(
  runs: SchedulerRunLog[],
  exactRunsLast7Days?: number,
): SchedulerHealthSummary {
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
    const ts = r.startedAt.toMillis();
    return ts > sevenDaysAgo;
  });
  summary.runsLast7Days = exactRunsLast7Days === undefined
    ? recentRuns.length
    : schedulerCount(exactRunsLast7Days);

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
    const lastRunTs = summary.lastRun.startedAt.toMillis();
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
async function getSchedulerRunHistory(
  filter?: SchedulerRunFilter
): Promise<SchedulerRunLog[]> {
  try {
    const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);
    const constraints: QueryConstraint[] = [orderBy('startedAt', 'desc')];

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
async function getSchedulerHealthSummary(): Promise<SchedulerHealthSummary> {
  try {
    const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentQuery = query(logsRef, orderBy('startedAt', 'desc'), limit(10));
    const runsLast7DaysQuery = query(logsRef, where('startedAt', '>=', sevenDaysAgo));
    const [snap, countSnapshot] = await Promise.all([
      getDocs(recentQuery),
      getCountFromServer(runsLast7DaysQuery),
    ]);

    const runs = snap.docs
      .map((document) => normalizeSchedulerRunLog(document.id, document.data()))
      .filter((run): run is SchedulerRunLog => run !== null);
    return buildSchedulerHealthSummaryFromRuns(runs, countSnapshot.data().count);
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
 * Firestore reads: one exact read per admitted store, bounded by maxResults.
 * Exact reads preserve the platformSummary private-document list boundary.
 */
async function getSchedulerSettlementSummary(
  storeIds: readonly string[],
  maxResults: number = 50,
): Promise<SchedulerSettlementSummary> {
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
    const admittedStoreIds = Array.from(new Set(storeIds
      .map((storeId) => String(storeId).trim())
      .filter((storeId) => isValidFirestoreDocumentId(storeId))))
      .slice(0, settlementLimit);
    const snapshots = await Promise.all(admittedStoreIds.map((storeId) => getDoc(doc(
      firebaseClient,
      DB_COLLECTIONS.PLATFORM_SUMMARY,
      `nightlyState_${storeId}`,
    ))));

    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const staleCutoff = twoDaysAgo.toISOString().split('T')[0];

    summary.states = snapshots
      .filter((snapshot) => snapshot.exists())
      .map((snapshot) => normalizeSchedulerSettlementState(snapshot.id, snapshot.data()))
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

async function getSchedulerRunsLast7Days(): Promise<number> {
  const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);
  const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const countSnapshot = await getCountFromServer(
    query(logsRef, where('startedAt', '>=', sevenDaysAgo)),
  );
  return countSnapshot.data().count;
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
  storeIds: readonly string[] = [],
  settlementLimit: number = 50,
): Promise<SchedulerDashboardSnapshot> {
  await assertCurrentPlatformAccess();
  const hasHistoryFilter = Boolean(filter?.status || filter?.trigger);
  const historyLimit = boundedPositiveInteger(filter?.limit, 20, SCHEDULER_HISTORY_LIMIT);
  const boundedSettlementLimit = boundedPositiveInteger(settlementLimit, 50, SCHEDULER_SETTLEMENT_LIMIT);

  if (!hasHistoryFilter) {
    const [runHistory, settlement, runsLast7Days] = await Promise.all([
      getSchedulerRunHistory({ ...filter, limit: Math.max(historyLimit, 10) }),
      getSchedulerSettlementSummary(storeIds, boundedSettlementLimit),
      getSchedulerRunsLast7Days(),
    ]);

    return {
      health: buildSchedulerHealthSummaryFromRuns(runHistory.slice(0, 10), runsLast7Days),
      runHistory: runHistory.slice(0, historyLimit),
      settlement,
    };
  }

  const [health, runHistory, settlement] = await Promise.all([
    getSchedulerHealthSummary(),
    getSchedulerRunHistory(filter),
    getSchedulerSettlementSummary(storeIds, boundedSettlementLimit),
  ]);

  return { health, runHistory, settlement };
}
