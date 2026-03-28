/**
 * Post-Publish Menu Health Verification
 * 
 * Runs after every project publish (called from Cloud Function trigger).
 * Verifies the public menu URL is accessible and has content.
 * Updates store.health field and triggers alert on failure.
 * 
 * Firebase cost per publish:
 * - Healthy: 1 read (store doc) + 1 write (store.health update) = ~₹0.005
 * - Failed: + 1 read (cooldown check) + 1 write (alert doc) = ~₹0.01
 * 
 * @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { createAlert } from './alerts';

// ================================================================
// TYPES
// ================================================================

export const FAILURE_CODES = {
  MENU_HTTP_FAIL: 'MENU_HTTP_FAIL',
  MENU_EMPTY: 'MENU_EMPTY',
  VERIFICATION_ERROR: 'VERIFICATION_ERROR',
} as const;

export interface VerificationResult {
  status: 'OK' | 'WARNING' | 'FAILED';
  failureReason: string | null;
  checks: {
    httpOk: boolean;
    hasContent: boolean;
  };
  responseTimeMs: number;
}

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
// CORE FUNCTIONS
// ================================================================

/**
 * Verify a published menu is accessible and has content.
 * HTTP GET to public menu URL with timeout.
 */
export async function verifyPublish(publicMenuUrl: string): Promise<VerificationResult> {
  const startTime = Date.now();
  const result: VerificationResult = {
    status: 'OK',
    failureReason: null,
    checks: { httpOk: false, hasContent: false },
    responseTimeMs: 0,
  };

  try {
    // Check 1: HTTP 200 (cache-busting query param to bypass CDN)
    const cacheBustUrl = `${publicMenuUrl}${publicMenuUrl.includes('?') ? '&' : '?'}_hc=${Date.now()}`;
    const response = await fetch(cacheBustUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'MenuList-HealthCheck/1.0', 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    result.checks.httpOk = response.ok;
    if (!response.ok) {
      result.status = 'FAILED';
      result.failureReason = FAILURE_CODES.MENU_HTTP_FAIL;
      return result;
    }

    // Check 2: Non-empty body with content
    const body = await response.text();
    const hasContent = body.length > 500; // Reasonable minimum for a menu page
    result.checks.hasContent = hasContent;

    if (!hasContent) {
      result.status = 'FAILED';
      result.failureReason = FAILURE_CODES.MENU_EMPTY;
      return result;
    }
  } catch (error) {
    result.status = 'FAILED';
    result.failureReason = FAILURE_CODES.VERIFICATION_ERROR;
  } finally {
    result.responseTimeMs = Date.now() - startTime;
  }

  return result;
}

/**
 * Update store health field and trigger alert if needed.
 * Writes to existing store document — NO new collection.
 */
export async function updateStoreHealth(
  storeId: string,
  tenantId: string,
  verificationResult: VerificationResult
): Promise<void> {
  const now = Timestamp.now();
  const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);

  // Read current health to track consecutive failures
  const storeDoc = await storeRef.get();
  const currentHealth = storeDoc.data()?.health as StoreHealth | undefined;
  const consecutiveFailures = verificationResult.status === 'FAILED'
    ? (currentHealth?.consecutiveFailures || 0) + 1
    : 0;

  // Update health field on store document (merge — doesn't overwrite other fields)
  await storeRef.set({
    health: {
      status: verificationResult.status,
      lastCheckedAt: now,
      lastPublishAt: now,
      lastPublishStatus: verificationResult.status === 'OK' ? 'OK' : 'FAILED',
      lastFailureReason: verificationResult.failureReason,
      lastFailureAt: verificationResult.status === 'FAILED' ? now : (currentHealth?.lastFailureAt || null),
      consecutiveFailures,
    } satisfies StoreHealth,
  }, { merge: true });

  // Trigger alert on failure
  if (verificationResult.status === 'FAILED') {
    try {
      await createAlert({
        tId: tenantId,
        sId: storeId,
        type: 'health',
        severity: consecutiveFailures >= 3 ? 'critical' : 'warning',
        title: 'Menu Publish Verification Failed',
        message: `Menu failed verification: ${verificationResult.failureReason}. Response time: ${verificationResult.responseTimeMs}ms. Consecutive failures: ${consecutiveFailures}`,
        metadata: {
          failureCode: verificationResult.failureReason,
          responseTimeMs: verificationResult.responseTimeMs,
          consecutiveFailures,
          checks: verificationResult.checks,
        },
        actionRequired: true,
      });
    } catch (alertError) {
      // Don't fail verification just because alert creation failed
      console.error('[PublishVerification] Failed to create alert:', alertError);
    }
  }

  console.log(`[PublishVerification] Store ${storeId}: ${verificationResult.status} (${verificationResult.responseTimeMs}ms)`);
}
