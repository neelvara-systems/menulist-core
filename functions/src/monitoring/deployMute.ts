/**
 * Deploy Mute Window
 * 
 * Suppresses alerts during deployments to prevent false alarms.
 * Uses ops_config/system Firestore doc.
 * 
 * Firebase cost: 1 read per mute check (rare — only when alert fires).
 * 
 * @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const OPS_SYSTEM_DOC = `${DB_COLLECTIONS.OPS_CONFIG}/system`;

// ================================================================
// CORE FUNCTIONS
// ================================================================

/**
 * Check if alerts are currently muted (deploy window active).
 * Returns false on error (fail-open — allow alerts if check fails).
 */
export async function isAlertsMuted(): Promise<boolean> {
  try {
    const doc = await db.doc(OPS_SYSTEM_DOC).get();
    if (!doc.exists) return false;

    const data = doc.data();
    const mutedUntil = data?.alertsMutedUntil;

    if (!mutedUntil) return false;

    // Check if mute window has expired
    const now = Timestamp.now();
    return mutedUntil.toMillis() > now.toMillis();
  } catch (error) {
    console.error('[DeployMute] Error checking mute status:', error);
    return false; // Fail-open: allow alerts on error
  }
}

/**
 * Mute alerts for a specified duration (called before deploys).
 * @param durationMinutes - How long to mute (default: 20 min)
 */
export async function muteAlerts(durationMinutes: number = 20): Promise<void> {
  const mutedUntil = Timestamp.fromMillis(
    Date.now() + durationMinutes * 60 * 1000
  );

  await db.doc(OPS_SYSTEM_DOC).set(
    { alertsMutedUntil: mutedUntil },
    { merge: true }
  );

  console.info(`[DeployMute] Alerts muted for ${durationMinutes} minutes until ${mutedUntil.toDate().toISOString()}`);
}

/**
 * Unmute alerts immediately.
 */
export async function unmuteAlerts(): Promise<void> {
  await db.doc(OPS_SYSTEM_DOC).set(
    { alertsMutedUntil: null },
    { merge: true }
  );

  console.info('[DeployMute] Alerts unmuted');
}
