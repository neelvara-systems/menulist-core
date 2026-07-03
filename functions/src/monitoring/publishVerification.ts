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
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';
import { validateNetworkTargetUrl } from '../utils/networkTarget';
import { createAlert } from './alerts';

const logger = functions.logger;
const PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE = 'A published menu failed health verification. Review the store health record and bounded verification metadata.';
const PUBLISH_VERIFICATION_MIN_BODY_BYTES = 500;

// ================================================================
// TYPES
// ================================================================

export const FAILURE_CODES = {
  MENU_HTTP_FAIL: 'MENU_HTTP_FAIL',
  MENU_EMPTY: 'MENU_EMPTY',
  MENU_TARGET_REJECTED: 'MENU_TARGET_REJECTED',
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

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: number } {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: error instanceof Error ? error.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

function getBoundedPublishVerificationStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = typeof value === 'string' ? value : '';
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

async function hasMinimumMenuResponseBytes(response: Response): Promise<boolean> {
  const contentLengthHeader = response.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  if (Number.isFinite(contentLength) && contentLength > PUBLISH_VERIFICATION_MIN_BODY_BYTES) {
    return true;
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    return false;
  }

  const reader = response.body.getReader();
  let bytesRead = 0;
  try {
    while (bytesRead <= PUBLISH_VERIFICATION_MIN_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) return bytesRead > PUBLISH_VERIFICATION_MIN_BODY_BYTES;
      bytesRead += value?.byteLength || 0;
      if (bytesRead > PUBLISH_VERIFICATION_MIN_BODY_BYTES) return true;
    }
    return true;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
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
    const targetValidation = await validateNetworkTargetUrl(cacheBustUrl, {
      allowLocalhostInEmulator: true,
      allowedProtocols: process.env.FUNCTIONS_EMULATOR === 'true' ? ['http:', 'https:'] : ['https:'],
    });

    if (!targetValidation.valid || !targetValidation.normalizedUrl) {
      result.status = 'FAILED';
      result.failureReason = FAILURE_CODES.MENU_TARGET_REJECTED;
      return result;
    }

    const response = await fetch(targetValidation.normalizedUrl, {
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
    const hasContent = await hasMinimumMenuResponseBytes(response);
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
        message: PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE,
        metadata: {
          failureCode: verificationResult.failureReason,
          responseTimeMs: verificationResult.responseTimeMs,
          consecutiveFailures,
          checks: verificationResult.checks,
        },
        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.PUBLISH_VERIFICATION_FAILED,
        productId: 'ML',
        category: 'public_output',
        actionRequired: true,
      });
    } catch (alertError) {
      // Don't fail verification just because alert creation failed
      logger.error('[PublishVerification] Failed to create alert', {
        ...getBoundedPublishVerificationStringContext('storeId', storeId),
        ...getBoundedPublishVerificationStringContext('tenantId', tenantId),
        failureCode: verificationResult.failureReason,
        consecutiveFailures,
        error: getErrorLogContext(alertError),
      });
    }
  }

  logger.info('[PublishVerification] Store health updated', {
    ...getBoundedPublishVerificationStringContext('storeId', storeId),
    ...getBoundedPublishVerificationStringContext('tenantId', tenantId),
    status: verificationResult.status,
    failureCode: verificationResult.failureReason,
    responseTimeMs: verificationResult.responseTimeMs,
    consecutiveFailures,
  });
}
