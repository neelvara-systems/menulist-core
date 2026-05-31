/**
 * Scheduler Monitoring — Types
 * 
 * Types for nightly scheduler run logs and monitoring dashboard.
 * Used by both the CF (write) and frontend DAL (read).
 * 
 * @see __docs__/decision-intelligence/decision-intelligence_impl.md
 */

// ================================================================
// SCHEDULER TASK TYPES
// ================================================================

export type SchedulerTaskName =
  | 'decision_blocks'
  | 'menu_intelligence'
  | 'customer_obp_analytics'
  | 'authority_maturation'
  | 'menu_drift'
  | 'guest_feedback_retention'
  | 'subscription_reconciliation'
  | 'obp_analytics'
  | 'lifecycle_messaging'
  | 'special_menu_switching'
  | 'extraction_learning'
  | 'store_truth_confidence'
  | 'staleness_check'
  | 'reseller_license_expiry'
  | 'feedback_intelligence'
  | 'kb_quality'
  | 'weekly_narrative'
  | 'health_signals'
  // Historical MenuList run logs may contain this task. New Answerlattice runs
  // are owned by functions-answerlattice and should not be written here.
  | 'answerlattice_nightly';

export type SchedulerRunStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'running';
export type SchedulerTrigger = 'scheduled' | 'manual';

// ================================================================
// TASK RESULT (per sub-task)
// ================================================================

export interface SchedulerTaskResult {
  name: SchedulerTaskName;
  status: 'success' | 'failed' | 'skipped';
  durationMs?: number;
  details?: Record<string, any>;
  error?: string;
}

// ================================================================
// RUN LOG DOCUMENT (schedulerRunLogs collection)
// ================================================================

export interface SchedulerRunLog {
  id?: string;
  trigger: SchedulerTrigger;
  triggeredBy: string;              // 'system' for scheduled, userId for manual
  startedAt: any;                   // Firestore Timestamp
  completedAt: any;                 // Firestore Timestamp
  durationMs: number;
  status: SchedulerRunStatus;

  // Timezone-aware scheduling context
  schedulerHour?: number;           // UTC hour this run processed (0-23)
  totalStoresInPlatform?: number;   // Total stores in storesSummary
  storeMismatch?: boolean;          // True if expected ≠ processed count
  reason?: string;                  // For skipped runs: 'no_stores_for_hour'
  phase?: string;                   // Current/final scheduler phase
  runLogId?: string;                // Deterministic id for manual runs
  manualScope?: { tId?: string; sId?: string };

  // Core results
  totalStores: number;
  totalProjects: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  intelligenceSuccess: number;
  intelligenceFailed: number;

  // Per-task breakdown
  tasks: SchedulerTaskResult[];

  // Error details (for failed/partial runs)
  errors: Array<{
    tId: string;
    sId: string;
    projectId?: string;
    error: string;
    code?: string;
    name?: string;
    phase?: string;
    operation?: string;
    settlementDate?: string;
    details?: Record<string, any>;
  }>;

  // Metadata
  metadata?: Record<string, any>;
}

// ================================================================
// DASHBOARD VIEW TYPES
// ================================================================

export interface SchedulerHealthSummary {
  lastRun: SchedulerRunLog | null;
  lastSuccessfulRun: SchedulerRunLog | null;
  consecutiveFailures: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  runsLast7Days: number;
  avgDurationMs: number;
}

export type SchedulerRunFilter = {
  status?: SchedulerRunStatus;
  trigger?: SchedulerTrigger;
  limit?: number;
};

export interface SchedulerSettlementState {
  id: string;
  tId?: string;
  sId?: string;
  status?: 'running' | 'completed' | 'failed' | 'skipped' | string;
  phase?: string;
  lastAttemptedLocalDate?: string;
  lastSettledLocalDate?: string;
  lastCompletedAt?: any;
  updatedAt?: any;
  error?: string;
}

export interface SchedulerSettlementSummary {
  states: SchedulerSettlementState[];
  totalTrackedStores: number;
  runningCount: number;
  failedCount: number;
  staleCount: number;
  latestSettledDate: string | null;
}

export interface SchedulerDashboardSnapshot {
  health: SchedulerHealthSummary;
  runHistory: SchedulerRunLog[];
  settlement: SchedulerSettlementSummary;
}
