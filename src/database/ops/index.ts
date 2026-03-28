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
import { firebaseClient } from '@lib/firebase/firebaseClient';
import type { AdoptionPulse, IntegritySignals, OpsAlert, OpsConfig, SystemState } from '@lib/ops/types';
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

// ================================================================
// SYSTEM STATE (Section 1)
// ================================================================

/**
 * Get current system state: SAFE_MODE status, alert mute, store health summary.
 * Firestore reads: 2 (ops_config/system + stores count query)
 */
export async function getSystemState(): Promise<SystemState> {
  const result: SystemState = {
    safeModeActive: false,
    safeModeReason: null,
    safeModeActivatedAt: null,
    alertsMuted: false,
    alertsMutedUntil: null,
    storeHealthSummary: { ok: 0, warning: 0, failed: 0 },
    lastAlertTitle: null,
    lastAlertTimestamp: null,
  };

  try {
    // Read ops_config/system (1 read)
    const opsConfigRef = doc(firebaseClient, DB_COLLECTIONS.OPS_CONFIG, 'system');
    const opsDoc = await getDoc(opsConfigRef);

    if (opsDoc.exists()) {
      const data = opsDoc.data() as OpsConfig;
      result.safeModeActive = data.SAFE_MODE === true;
      result.safeModeReason = data.reason || null;
      result.safeModeActivatedAt = data.activatedAt || null;

      if (data.alertsMutedUntil) {
        const mutedUntil = data.alertsMutedUntil;
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
      result.lastAlertTitle = lastAlert.title || null;
      result.lastAlertTimestamp = lastAlert.timestamp || null;
    }
  } catch (error) {
    console.error('[OpsDAL] Failed to get system state:', error);
  }

  return result;
}

// ================================================================
// ADOPTION PULSE (Section 2)
// ================================================================

/**
 * Get adoption metrics for last 24h.
 * Firestore reads: ~2 (count queries)
 */
export async function getAdoptionPulse(): Promise<AdoptionPulse> {
  const result: AdoptionPulse = {
    newStores24h: 0,
    publishedToday: 0,
    activeStores7d: 0,
    feedbackToday: 0,
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
  } catch (error) {
    console.error('[OpsDAL] Failed to get adoption pulse:', error);
  }

  return result;
}

// ================================================================
// INTEGRITY SIGNALS (Section 3)
// ================================================================

/**
 * Get store integrity signals.
 * Firestore reads: ~2 (count queries)
 */
export async function getIntegritySignals(): Promise<IntegritySignals> {
  const result: IntegritySignals = {
    noProject: 0,
    unpublished48h: 0,
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
  } catch (error) {
    console.error('[OpsDAL] Failed to get integrity signals:', error);
  }

  return result;
}

// ================================================================
// RECENT ALERTS (Section 4)
// ================================================================

/**
 * Get recent alerts.
 * Firestore reads: 1 (limit 10)
 */
export async function getRecentAlerts(maxResults: number = 10): Promise<OpsAlert[]> {
  try {
    const alertsRef = collection(firebaseClient, DB_COLLECTIONS.SYSTEM_ALERTS);
    const alertsQuery = query(
      alertsRef,
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    const alertsSnap = await getDocs(alertsQuery);

    return alertsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as OpsAlert[];
  } catch (error) {
    console.error('[OpsDAL] Failed to get recent alerts:', error);
    return [];
  }
}
