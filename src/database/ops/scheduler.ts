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
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type {
  SchedulerDashboardSnapshot,
  SchedulerHealthSummary,
  SchedulerRunFilter,
  SchedulerRunLog,
  SchedulerSettlementState,
  SchedulerSettlementSummary,
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

    constraints.push(limit(filter?.limit || 20));

    const logsQuery = query(logsRef, ...constraints);
    const snap = await getDocs(logsQuery);

    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as SchedulerRunLog[];
  } catch (error) {
    logOpsFailure('ops_scheduler_run_history_load_failed', error, {
      statusFilter: filter?.status,
      triggerFilter: filter?.trigger,
      limit: filter?.limit || 20,
    });
    return [];
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

    const runs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SchedulerRunLog[];
    return buildSchedulerHealthSummaryFromRuns(runs);
  } catch (error) {
    logOpsFailure('ops_scheduler_health_summary_load_failed', error);
  }

  return getEmptySchedulerHealthSummary();
}

// ================================================================
// GET SINGLE RUN DETAILS (for error inspection)
// ================================================================

/**
 * Get a single run's full details including error list.
 * Firestore reads: 1
 */
export async function getSchedulerRunDetails(runId: string): Promise<SchedulerRunLog | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS, runId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;

    return { id: snap.id, ...snap.data() } as SchedulerRunLog;
  } catch (error) {
    logOpsFailure('ops_scheduler_run_details_load_failed', error, {
      ...getBoundedOpsStringContext('runId', runId),
    });
    return null;
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
      limit(maxResults),
    );
    const snap = await getDocs(statesQuery);

    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const staleCutoff = twoDaysAgo.toISOString().split('T')[0];

    summary.states = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as SchedulerSettlementState[];

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
  } catch (error) {
    logOpsFailure('ops_scheduler_settlement_summary_load_failed', error, {
      maxResults,
    });
  }

  return summary;
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
  const hasHistoryFilter = Boolean(filter?.status || filter?.trigger);
  const historyLimit = filter?.limit || 20;

  if (!hasHistoryFilter) {
    const [runHistory, settlement] = await Promise.all([
      getSchedulerRunHistory({ ...filter, limit: Math.max(historyLimit, 10) }),
      getSchedulerSettlementSummary(settlementLimit),
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
    getSchedulerSettlementSummary(settlementLimit),
  ]);

  return { health, runHistory, settlement };
}
