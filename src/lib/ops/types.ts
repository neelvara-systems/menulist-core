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

import type { Timestamp } from 'firebase/firestore';

// ================================================================
// OPS CONFIG (ops_config/system document)
// ================================================================

export interface OpsConfig {
  SAFE_MODE: boolean;
  activatedAt: Timestamp | null;
  activatedBy: string | null;    // "manual" | "budget_alert"
  reason: string | null;
  deactivatedAt: Timestamp | null;
  alertsMutedUntil: Timestamp | null;
}

// ================================================================
// STORE HEALTH (store.health field)
// ================================================================

export interface StoreHealth {
  status: 'OK' | 'WARNING' | 'FAILED';
  lastCheckedAt: Timestamp;
  lastPublishAt: Timestamp;
  lastPublishStatus: 'OK' | 'FAILED';
  lastFailureReason: string | null;
  lastFailureAt: Timestamp | null;
  consecutiveFailures: number;
}

// ================================================================
// OPS DASHBOARD DATA
// ================================================================

export interface SystemState {
  safeModeActive: boolean;
  safeModeReason: string | null;
  safeModeActivatedAt: Timestamp | null;
  alertsMuted: boolean;
  alertsMutedUntil: Timestamp | null;
  lastAlertTitle: string | null;
  lastAlertTimestamp: Timestamp | null;
}

export interface AdoptionPulse {
  newStores24h: number;
  activeStores7d: number;
}

export interface IntegritySignals {
  noPublish60d: number;
}

export interface OpsAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Timestamp | null;
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
