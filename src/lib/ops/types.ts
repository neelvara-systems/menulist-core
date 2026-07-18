/**
 * Operational Infrastructure — Shared Types
 * 
 * Types used across SAFE_MODE, alerting, health monitoring,
 * and ops control room.
 * 
 * @see __docs__/cost-self-protection/
 * @see __docs__/ops-alerting-delivery/
 * @see __docs__/menu-health-monitor/
 * @see __docs__/ops-control-room/
 */

// ================================================================
// OPS CONFIG (ops_config/system document)
// ================================================================

export interface OpsConfig {
  SAFE_MODE: boolean;
  activatedAt: any | null;       // Firestore Timestamp
  activatedBy: string | null;    // "manual" | "budget_alert"
  reason: string | null;
  deactivatedAt: any | null;     // Firestore Timestamp
  alertsMutedUntil: any | null;  // Firestore Timestamp
}

// ================================================================
// STORE HEALTH (store.health field)
// ================================================================

export interface StoreHealth {
  status: 'OK' | 'WARNING' | 'FAILED';
  lastCheckedAt: any;            // Firestore Timestamp
  lastPublishAt: any;            // Firestore Timestamp
  lastPublishStatus: 'OK' | 'FAILED';
  lastFailureReason: string | null;
  lastFailureAt: any | null;     // Firestore Timestamp
  consecutiveFailures: number;
}

// ================================================================
// OPS DASHBOARD DATA
// ================================================================

export interface SystemState {
  safeModeActive: boolean;
  safeModeReason: string | null;
  safeModeActivatedAt: any | null;
  alertsMuted: boolean;
  alertsMutedUntil: any | null;
  storeHealthSummary: {
    ok: number;
    warning: number;
    failed: number;
  };
  lastAlertTitle: string | null;
  lastAlertTimestamp: any | null;
}

export interface AdoptionPulse {
  newStores24h: number;
  publishedToday: number;
  activeStores7d: number;
  feedbackToday: number;
}

export interface IntegritySignals {
  noProject: number;
  unpublished48h: number;
  noPublish60d: number;
}

export interface OpsAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: any;
  acknowledged: boolean;
  tId: string;
  sId: string;
}

export interface OpsControlRoomSnapshot {
  systemState: SystemState;
  adoption: AdoptionPulse;
  integrity: IntegritySignals;
  alerts: OpsAlert[];
}
