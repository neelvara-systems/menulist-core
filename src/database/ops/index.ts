/**
 * Ops Control Room — Data Access Layer
 * 
 * Read-only DAL for ops dashboard. All queries optimized for minimal reads.
 * NO real-time listeners — fetch-on-open, manual refresh.
 * 
 * Firebase cost: ~8 reads per full dashboard load.
 * Used 2-3 times/day by founder only = ~720 reads/month = ~₹0.22/month.
 * 
 * @see __docs__/ops-control-room/ops-control-room_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { assertCurrentPlatformAccess } from '@lib/auth/currentPlatformAccessClient';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { normalizeOpsTimestamp } from '@lib/ops/opsTimestamp';
import type { AdoptionPulse, IntegritySignals, OpsAlert, OpsConfig, OpsControlRoomSnapshot, SystemState } from '@lib/ops/types';
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
  where,
} from 'firebase/firestore';

function buildOpsStoredTextSummary(displayLabel: string, contextLabel: string, value: unknown): string | null {
  const context = getBoundedOpsStringContext(contextLabel, value);
  return context[`${contextLabel}Present`]
    ? `${displayLabel} present (${context[`${contextLabel}Length`]} chars).`
    : null;
}

function cleanOpsField(value: unknown, maximum: number, fallback: string): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximum) || fallback
    : fallback;
}

function normalizeOpsAlert(id: string, raw: unknown): OpsAlert {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};
  const severity = data.severity === 'critical' || data.severity === 'warning' || data.severity === 'info'
    ? data.severity
    : 'info';
  return {
    id,
    type: cleanOpsField(data.type, 40, 'unknown'),
    severity,
    title: buildOpsStoredTextSummary('Alert title', 'alertTitle', data.title) || 'Alert title unavailable.',
    message: buildOpsStoredTextSummary('Alert message', 'alertMessage', data.message) || 'Alert message unavailable.',
    timestamp: normalizeOpsTimestamp(data.timestamp),
    acknowledged: data.acknowledged === true,
    tId: cleanOpsField(data.tId, 160, 'system'),
    sId: cleanOpsField(data.sId, 160, 'system'),
  };
}

// ================================================================
// SYSTEM STATE (Section 1)
// ================================================================

/**
 * Get current system state: SAFE_MODE status, alert mute, store health summary.
 * Firestore reads: 2 (ops_config/system + stores count query)
 */
async function getSystemState(): Promise<SystemState> {
  const result: SystemState = {
    safeModeActive: false,
    safeModeReason: null,
    safeModeActivatedAt: null,
    alertsMuted: false,
    alertsMutedUntil: null,
    lastAlertTitle: null,
    lastAlertTimestamp: null,
  };

  try {
    // Read ops_config/system (1 read)
    const opsConfigRef = doc(firebaseClient, DB_COLLECTIONS.OPS_CONFIG, 'system');
    const opsDoc = await getDoc(opsConfigRef);

    if (opsDoc.exists()) {
      const data = opsDoc.data() as Partial<OpsConfig>;
      result.safeModeActive = data.SAFE_MODE === true;
      result.safeModeReason = buildOpsStoredTextSummary('SAFE_MODE reason', 'safeModeReason', data.reason);
      result.safeModeActivatedAt = normalizeOpsTimestamp(data.activatedAt);

      const mutedUntil = normalizeOpsTimestamp(data.alertsMutedUntil);
      if (mutedUntil) {
        result.alertsMuted = mutedUntil.toMillis() > Date.now();
        result.alertsMutedUntil = mutedUntil;
      }
    }

    // Get last alert (1 read)
    const alertsRef = collection(firebaseClient, DB_COLLECTIONS.SYSTEM_ALERTS);
    const alertsQuery = query(alertsRef, orderBy('timestamp', 'desc'), limit(1));
    const alertsSnap = await getDocs(alertsQuery);

    if (!alertsSnap.empty) {
      const lastAlert = alertsSnap.docs[0].data();
      result.lastAlertTitle = buildOpsStoredTextSummary('Alert title', 'lastAlertTitle', lastAlert.title);
      result.lastAlertTimestamp = normalizeOpsTimestamp(lastAlert.timestamp);
    }
    return result;
  } catch (error) {
    logOpsFailure('ops_system_state_load_failed', error);
    throw new Error('ops_system_state_unavailable');
  }
}

// ================================================================
// ADOPTION PULSE (Section 2)
// ================================================================

/**
 * Get adoption metrics for last 24h.
 * Firestore reads: ~2 (count queries)
 */
async function getAdoptionPulse(): Promise<AdoptionPulse> {
  const result: AdoptionPulse = {
    newStores24h: 0,
    activeStores7d: 0,
  };

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);

    // Count stores created in last 24h (1 read)
    const newStoresQuery = query(
      storesRef,
      where('createdAt', '>=', Timestamp.fromDate(yesterday))
    );
    const newStoresSnap = await getCountFromServer(newStoresQuery);
    result.newStores24h = newStoresSnap.data().count;

    // Count active stores (published in last 7d) (1 read)
    const activeQuery = query(
      storesRef,
      where('lastPublishedAt', '>=', Timestamp.fromDate(weekAgo))
    );
    const activeSnap = await getCountFromServer(activeQuery);
    result.activeStores7d = activeSnap.data().count;
    return result;
  } catch (error) {
    logOpsFailure('ops_adoption_pulse_load_failed', error);
    throw new Error('ops_adoption_pulse_unavailable');
  }
}

// ================================================================
// INTEGRITY SIGNALS (Section 3)
// ================================================================

/**
 * Get store integrity signals.
 * Firestore reads: ~2 (count queries)
 */
async function getIntegritySignals(): Promise<IntegritySignals> {
  const result: IntegritySignals = {
    noPublish60d: 0,
  };

  try {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);

    // Count stores with no publish in 60 days (1 read)
    const staleQuery = query(
      storesRef,
      where('lastPublishedAt', '<=', Timestamp.fromDate(sixtyDaysAgo))
    );
    const staleSnap = await getCountFromServer(staleQuery);
    result.noPublish60d = staleSnap.data().count;
    return result;
  } catch (error) {
    logOpsFailure('ops_integrity_signals_load_failed', error);
    throw new Error('ops_integrity_signals_unavailable');
  }
}

// ================================================================
// RECENT ALERTS (Section 4)
// ================================================================

/**
 * Get recent alerts.
 * Firestore reads: 1 (limit 10)
 */
async function getRecentAlerts(maxResults: number = 10): Promise<OpsAlert[]> {
  try {
    const boundedMaxResults = Number.isSafeInteger(maxResults)
      ? Math.min(Math.max(maxResults, 1), 30)
      : 10;
    const alertsRef = collection(firebaseClient, DB_COLLECTIONS.SYSTEM_ALERTS);
    const alertsQuery = query(
      alertsRef,
      orderBy('timestamp', 'desc'),
      limit(boundedMaxResults)
    );
    const alertsSnap = await getDocs(alertsQuery);

    return alertsSnap.docs.map((document) => normalizeOpsAlert(document.id, document.data()));
  } catch (error) {
    logOpsFailure('ops_recent_alerts_load_failed', error, {
      maxResults,
    });
    throw new Error('ops_recent_alerts_unavailable');
  }
}

/**
 * Load one coherent Control Room snapshot after a fresh persisted-platform
 * authorization check. Any source failure rejects the snapshot instead of
 * presenting a healthy-looking zero/empty state.
 */
export async function getOpsControlRoomSnapshot(): Promise<OpsControlRoomSnapshot> {
  await assertCurrentPlatformAccess();
  const [systemState, adoption, integrity, alerts] = await Promise.all([
    getSystemState(),
    getAdoptionPulse(),
    getIntegritySignals(),
    getRecentAlerts(10),
  ]);
  return { systemState, adoption, integrity, alerts };
}
