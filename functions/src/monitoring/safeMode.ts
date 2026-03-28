/**
 * SAFE_MODE Circuit Breaker (Cloud Functions side)
 * 
 * Checks if system is in SAFE_MODE.
 * When active, expensive operations should return 503.
 * 
 * Uses in-memory cache with 60s TTL for Cloud Functions warm instances.
 * Returns false on error (fail-open — don't break the system to protect it).
 * 
 * Firebase cost: ~1 read per 60s per warm CF instance (negligible).
 * 
 * @see __docs__/cost-self-protection/cost-self-protection_impl.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const OPS_SYSTEM_DOC = `${DB_COLLECTIONS.OPS_CONFIG}/system`;

// In-memory cache for Cloud Functions warm instances
let cachedSafeMode: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

// ================================================================
// CORE FUNCTIONS
// ================================================================

/**
 * Check if SAFE_MODE is currently active.
 * Uses in-memory cache with 60s TTL for Cloud Functions.
 * Returns false on error (fail-open).
 */
export async function isSafeModeActive(): Promise<boolean> {
  const now = Date.now();

  // Return cached value if fresh
  if (cachedSafeMode !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSafeMode;
  }

  try {
    const doc = await db.doc(OPS_SYSTEM_DOC).get();
    if (!doc.exists) {
      cachedSafeMode = false;
      cacheTimestamp = now;
      return false;
    }

    const data = doc.data();
    cachedSafeMode = data?.SAFE_MODE === true;
    cacheTimestamp = now;
    return cachedSafeMode;
  } catch (error) {
    console.error('[SAFE_MODE] Error checking status:', error);
    // Fail-open: don't break operations if config doc is unreachable
    return false;
  }
}

/**
 * Activate SAFE_MODE.
 * Called from ops dashboard or admin API.
 */
export async function activateSafeMode(reason: string, activatedBy: string = 'manual'): Promise<void> {
  await db.doc(OPS_SYSTEM_DOC).set({
    SAFE_MODE: true,
    activatedAt: Timestamp.now(),
    activatedBy,
    reason,
  }, { merge: true });

  // Bust cache immediately
  cachedSafeMode = true;
  cacheTimestamp = Date.now();

  console.warn(`[SAFE_MODE] ACTIVATED — Reason: ${reason}, By: ${activatedBy}`);
}

/**
 * Deactivate SAFE_MODE.
 * Must be done by human after verifying system stability.
 */
export async function deactivateSafeMode(): Promise<void> {
  await db.doc(OPS_SYSTEM_DOC).set({
    SAFE_MODE: false,
    deactivatedAt: Timestamp.now(),
    reason: null,
  }, { merge: true });

  // Bust cache immediately
  cachedSafeMode = false;
  cacheTimestamp = Date.now();

  console.info('[SAFE_MODE] DEACTIVATED');
}
