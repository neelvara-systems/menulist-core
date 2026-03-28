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
import type {
  SchedulerHealthSummary,
  SchedulerRunFilter,
  SchedulerRunLog,
} from '@lib/ops/schedulerTypes';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

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
    console.error('[SchedulerDAL] Failed to get run history:', error);
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
  const summary: SchedulerHealthSummary = {
    lastRun: null,
    lastSuccessfulRun: null,
    consecutiveFailures: 0,
    healthStatus: 'unknown',
    runsLast7Days: 0,
    avgDurationMs: 0,
  };

  try {
    const logsRef = collection(firebaseClient, DB_COLLECTIONS.SCHEDULER_RUN_LOGS);

    // Get last 10 runs to compute health
    const recentQuery = query(logsRef, orderBy('startedAt', 'desc'), limit(10));
    const snap = await getDocs(recentQuery);

    if (snap.empty) return summary;

    const runs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SchedulerRunLog[];

    // Last run
    summary.lastRun = runs[0];

    // Last successful run
    summary.lastSuccessfulRun = runs.find(r => r.status === 'success') || null;

    // Consecutive failures (count from most recent until first success)
    let consecutiveFailures = 0;
    for (const run of runs) {
      if (run.status === 'failed') {
        consecutiveFailures++;
      } else {
        break;
      }
    }
    summary.consecutiveFailures = consecutiveFailures;

    // Runs in last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRuns = runs.filter(r => {
      const ts = r.startedAt?.toMillis?.() || r.startedAt?.seconds * 1000 || 0;
      return ts > sevenDaysAgo;
    });
    summary.runsLast7Days = recentRuns.length;

    // Average duration
    const durationsMs = recentRuns.filter(r => r.durationMs).map(r => r.durationMs);
    summary.avgDurationMs = durationsMs.length > 0
      ? Math.round(durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length)
      : 0;

    // Health status
    if (consecutiveFailures >= 3) {
      summary.healthStatus = 'critical';
    } else if (consecutiveFailures >= 1 || (summary.lastRun?.status === 'partial')) {
      summary.healthStatus = 'warning';
    } else if (summary.lastRun?.status === 'success') {
      // Also check if last run was recent (within ~26 hours — one run per day with buffer)
      const lastRunTs = summary.lastRun.startedAt?.toMillis?.() || summary.lastRun.startedAt?.seconds * 1000 || 0;
      const isStale = Date.now() - lastRunTs > 26 * 60 * 60 * 1000;
      summary.healthStatus = isStale ? 'warning' : 'healthy';
    } else {
      summary.healthStatus = 'unknown';
    }
  } catch (error) {
    console.error('[SchedulerDAL] Failed to get health summary:', error);
  }

  return summary;
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
    console.error('[SchedulerDAL] Failed to get run details:', error);
    return null;
  }
}
