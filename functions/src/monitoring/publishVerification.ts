/**
 * Post-Publish Menu Health Verification
 * 
 * Runs after every project publish (called from Cloud Function trigger).
 * Verifies the public menu URL is accessible and has content.
 * Updates store.health field and triggers alert on failure.
 * 
 * Firebase cost per publish:
 * - Healthy: 3 scope reads before network + 3 transactional scope reads + 1 write
 * - Failed: + 1 cooldown read + 1 alert write
 * 
 * @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';
import {
  normalizeOwnerNotificationDocumentId,
  normalizeOwnerNotificationNumericScopeDocumentId,
} from '../sharedData/ownerNotificationDeliveryBoundary';
import { validateNetworkTargetUrl } from '../utils/networkTarget';
import { createAlert } from './alerts';

const logger = functions.logger;
const PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE = 'A published menu failed health verification. Review the store health record and bounded verification metadata.';
const PUBLISH_VERIFICATION_MIN_BODY_BYTES = 500;
export const PUBLISH_VERIFICATION_SCOPE_INVALID = 'PUBLISH_VERIFICATION_SCOPE_INVALID';
export const PUBLISH_VERIFICATION_PROJECT_NOT_FOUND = 'PUBLISH_VERIFICATION_PROJECT_NOT_FOUND';
export const PUBLISH_VERIFICATION_PROJECT_LIMIT_EXCEEDED = 'PUBLISH_VERIFICATION_PROJECT_LIMIT_EXCEEDED';
export const PUBLISH_VERIFICATION_PUBLIC_URL_UNAVAILABLE = 'PUBLISH_VERIFICATION_PUBLIC_URL_UNAVAILABLE';
const MAX_FORCE_REPUBLISH_PROJECTS = 100;
const FORCE_REPUBLISH_LEASE_MS = 90 * 1000;

export interface ForceRepublishLease {
  leaseOwner: string;
  stateRef: FirebaseFirestore.DocumentReference;
}

type PublishVerificationScopeOptions = {
  publicMenuUrl?: string;
  requirePlatformAuthority?: boolean;
};

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

export function getPublishVerificationPublicBaseDomain(): string | null {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== 'https:') return null;
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return null;
    return hostname.startsWith('app.') ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
}

function getConfiguredHostname(value: unknown): string | null {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) return null;
  try {
    const parsed = new URL(`https://${raw}`);
    return parsed.pathname === '/' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password
      ? parsed.hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function isPublicMenuUrlInStoreScope(
  storeData: Record<string, unknown>,
  publicMenuUrl: string | undefined,
): boolean {
  if (publicMenuUrl === undefined) return true;
  try {
    const parsed = new URL(publicMenuUrl);
    const allowedProtocol = parsed.protocol === 'https:'
      || (process.env.FUNCTIONS_EMULATOR === 'true' && parsed.protocol === 'http:');
    if (!allowedProtocol || parsed.username || parsed.password) return false;

    const hostname = parsed.hostname.toLowerCase();
    const customHostname = getConfiguredHostname(storeData.customDomain);
    if (customHostname) return hostname === customHostname;

    const subdomain = typeof (storeData.subdomain ?? storeData.slug) === 'string'
      ? String(storeData.subdomain ?? storeData.slug).trim().toLowerCase()
      : '';
    const baseDomain = getPublishVerificationPublicBaseDomain();
    return Boolean(subdomain && baseDomain && hostname === `${subdomain}.${baseDomain}`);
  } catch {
    return false;
  }
}

export function buildCanonicalPublicMenuUrl(storeData: Record<string, unknown>): string | null {
  const customHostname = getConfiguredHostname(storeData.customDomain);
  if (customHostname) return `https://${customHostname}`;

  const subdomain = typeof (storeData.subdomain ?? storeData.slug) === 'string'
    ? String(storeData.subdomain ?? storeData.slug).trim().toLowerCase()
    : '';
  const baseDomain = getPublishVerificationPublicBaseDomain();
  return subdomain && baseDomain ? `https://${subdomain}.${baseDomain}` : null;
}

function isActiveCanonicalPublishScope(
  tenantData: Record<string, unknown> | undefined,
  storeData: Record<string, unknown> | undefined,
  userData: Record<string, unknown> | undefined,
  tenantId: string,
  storeId: string,
  options: PublishVerificationScopeOptions,
): boolean {
  if (
    !tenantData
    || tenantData.active === false
    || tenantData.deleted === true
    || !storeData
    || storeData.active === false
    || storeData.deleted === true
    || !userData
    || userData.active === false
    || userData.deleted === true
    || userData.authDisabled === true
    || userData.blocked === true
    || userData.isVerified === false
    || userData.pId === 'AL'
    || userData.productId === 'AL'
  ) return false;

  const storedTenantScope = normalizeOwnerNotificationNumericScopeDocumentId(
    storeData.tenantId ?? storeData.tId,
  );
  if (storedTenantScope?.documentId !== tenantId) return false;
  if (!isPublicMenuUrlInStoreScope(storeData, options.publicMenuUrl)) return false;

  const currentPlatformRole = String(userData.platformRole ?? '').toUpperCase();
  if (options.requirePlatformAuthority === true) return currentPlatformRole === 'PLATFORM';
  if (currentPlatformRole === 'PLATFORM') return true;

  const userTenantScope = normalizeOwnerNotificationNumericScopeDocumentId(
    userData.tenantId ?? userData.tId,
  );
  if (userTenantScope?.documentId !== tenantId) return false;

  const storeCandidates: unknown[] = [userData.storeId, userData.sId];
  if (Array.isArray(userData.storeIds)) storeCandidates.push(...userData.storeIds);
  if (Array.isArray(userData.stores)) {
    userData.stores.forEach((mapping) => {
      if (mapping && typeof mapping === 'object' && !Array.isArray(mapping)) {
        storeCandidates.push((mapping as Record<string, unknown>).storeId);
      }
    });
  }
  return storeCandidates.some((candidate) => (
    normalizeOwnerNotificationNumericScopeDocumentId(candidate)?.documentId === storeId
  ));
}

export async function acquireForceRepublishLease(
  tenantId: string,
  storeId: string,
  userId: string,
  leaseOwner: string,
  now: Date,
): Promise<ForceRepublishLease | null> {
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
  const userDocumentId = normalizeOwnerNotificationDocumentId(userId);
  if (!storeScope || !tenantScope || !userDocumentId) {
    throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);
  }

  const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
  const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
  const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId);
  const stateRef = db.collection(DB_COLLECTIONS.SYSTEM)
    .doc(`forceRepublish_${tenantScope.documentId}_${storeScope.documentId}`);
  const nowMs = now.getTime();

  const acquired = await db.runTransaction(async (transaction) => {
    const [tenantDoc, storeDoc, userDoc, stateSnapshot] = await Promise.all([
      transaction.get(tenantRef),
      transaction.get(storeRef),
      transaction.get(userRef),
      transaction.get(stateRef),
    ]);
    if (!isActiveCanonicalPublishScope(
      tenantDoc.data() as Record<string, unknown> | undefined,
      storeDoc.data() as Record<string, unknown> | undefined,
      userDoc.data() as Record<string, unknown> | undefined,
      tenantScope.documentId,
      storeScope.documentId,
      { requirePlatformAuthority: true },
    )) {
      throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);
    }

    const state = stateSnapshot.data() || {};
    const leaseExpiresAtMs = state.leaseExpiresAt?.toMillis?.() || 0;
    if (state.status === 'running' && leaseExpiresAtMs > nowMs) return false;
    transaction.set(stateRef, {
      tenantId: tenantScope.documentId,
      storeId: storeScope.documentId,
      status: 'running',
      leaseOwner,
      leaseExpiresAt: Timestamp.fromMillis(nowMs + FORCE_REPUBLISH_LEASE_MS),
      startedAt: Timestamp.fromDate(now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  return acquired ? { leaseOwner, stateRef } : null;
}

export async function completeForceRepublishLease(lease: ForceRepublishLease): Promise<boolean> {
  return lease.stateRef.firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(lease.stateRef);
    if (snapshot.data()?.leaseOwner !== lease.leaseOwner) return false;
    transaction.set(lease.stateRef, {
      status: 'completed',
      leaseOwner: FieldValue.delete(),
      leaseExpiresAt: FieldValue.delete(),
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

function readStoredConsecutiveFailures(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function readStoredFailureTimestamp(value: unknown): Timestamp | null {
  if (!value || typeof value !== 'object') return null;
  try {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== 'function') return null;
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) ? Timestamp.fromMillis(millis) : null;
  } catch {
    return null;
  }
}

export async function isPublishVerificationScopeAuthorized(
  storeId: string,
  tenantId: string,
  userId: string,
  options: PublishVerificationScopeOptions = {},
): Promise<boolean> {
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
  const userDocumentId = normalizeOwnerNotificationDocumentId(userId);
  if (!storeScope || !tenantScope || !userDocumentId) return false;

  const [tenantDoc, storeDoc, userDoc] = await db.getAll(
    db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId),
    db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId),
    db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId),
  );
  return isActiveCanonicalPublishScope(
    tenantDoc.data() as Record<string, unknown> | undefined,
    storeDoc.data() as Record<string, unknown> | undefined,
    userDoc.data() as Record<string, unknown> | undefined,
    tenantScope.documentId,
    storeScope.documentId,
    options,
  );
}

export async function forceRepublishActiveProjects(
  storeId: string,
  tenantId: string,
  userId: string,
): Promise<{ projectIds: string[]; publicMenuUrl: string }> {
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
  const userDocumentId = normalizeOwnerNotificationDocumentId(userId);
  if (!storeScope || !tenantScope || !userDocumentId) {
    throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);
  }

  const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
  const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
  const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId);
  const projectsQuery = db.collection(DB_COLLECTIONS.PROJECTS)
    .doc(tenantScope.documentId)
    .collection(storeScope.documentId)
    .limit(MAX_FORCE_REPUBLISH_PROJECTS + 1);

  return db.runTransaction(async (transaction) => {
    const tenantDoc = await transaction.get(tenantRef);
    const storeDoc = await transaction.get(storeRef);
    const userDoc = await transaction.get(userRef);
    const projectsSnapshot = await transaction.get(projectsQuery);
    const tenantData = tenantDoc.data() as Record<string, unknown> | undefined;
    const storeData = storeDoc.data() as Record<string, unknown> | undefined;
    const userData = userDoc.data() as Record<string, unknown> | undefined;
    if (!isActiveCanonicalPublishScope(
      tenantData,
      storeData,
      userData,
      tenantScope.documentId,
      storeScope.documentId,
      { requirePlatformAuthority: true },
    )) {
      throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);
    }
    if (projectsSnapshot.size > MAX_FORCE_REPUBLISH_PROJECTS) {
      throw new Error(PUBLISH_VERIFICATION_PROJECT_LIMIT_EXCEEDED);
    }

    const publicMenuUrl = buildCanonicalPublicMenuUrl(storeData || {});
    if (!publicMenuUrl) throw new Error(PUBLISH_VERIFICATION_PUBLIC_URL_UNAVAILABLE);

    const activeProjects = projectsSnapshot.docs.filter((projectDoc) => {
      const projectData = projectDoc.data() as Record<string, unknown>;
      if (projectData.deleted === true || projectData.active === false) return false;
      const embeddedTenant = projectData.tenantId ?? projectData.tId;
      const embeddedStore = projectData.storeId ?? projectData.sId;
      if (
        embeddedTenant !== undefined
        && normalizeOwnerNotificationNumericScopeDocumentId(embeddedTenant)?.documentId !== tenantScope.documentId
      ) return false;
      if (
        embeddedStore !== undefined
        && normalizeOwnerNotificationNumericScopeDocumentId(embeddedStore)?.documentId !== storeScope.documentId
      ) return false;
      return normalizeOwnerNotificationDocumentId(projectDoc.id) === projectDoc.id;
    });
    if (activeProjects.length === 0) throw new Error(PUBLISH_VERIFICATION_PROJECT_NOT_FOUND);

    const now = Timestamp.now();
    activeProjects.forEach((projectDoc) => {
      transaction.update(projectDoc.ref, {
        forceRepublishAt: now,
        updatedAt: now,
      });
    });

    return {
      projectIds: activeProjects.map((projectDoc) => projectDoc.id).sort(),
      publicMenuUrl,
    };
  });
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
  userId: string,
  verificationResult: VerificationResult,
  options: PublishVerificationScopeOptions = {},
): Promise<void> {
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
  const userDocumentId = normalizeOwnerNotificationDocumentId(userId);
  if (!storeScope || !tenantScope || !userDocumentId) throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);

  const now = Timestamp.now();
  const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
  const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
  const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userDocumentId);
  let consecutiveFailures = 0;

  await db.runTransaction(async (transaction) => {
    // Revalidate canonical scope in the same transaction as the Admin write so
    // a stale claim or entity-state change cannot cross the authorization/write boundary.
    const tenantDoc = await transaction.get(tenantRef);
    const storeDoc = await transaction.get(storeRef);
    const userDoc = await transaction.get(userRef);
    const tenantData = tenantDoc.data() as Record<string, unknown> | undefined;
    const storeData = storeDoc.data() as Record<string, unknown> | undefined;
    const userData = userDoc.data() as Record<string, unknown> | undefined;
    if (!isActiveCanonicalPublishScope(
      tenantData,
      storeData,
      userData,
      tenantScope.documentId,
      storeScope.documentId,
      options,
    )) {
      throw new Error(PUBLISH_VERIFICATION_SCOPE_INVALID);
    }

    const rawHealth = storeData?.health;
    const currentHealth = rawHealth && typeof rawHealth === 'object' && !Array.isArray(rawHealth)
      ? rawHealth as Record<string, unknown>
      : {};
    consecutiveFailures = verificationResult.status === 'FAILED'
      ? readStoredConsecutiveFailures(currentHealth.consecutiveFailures) + 1
      : 0;

    transaction.set(storeRef, {
      health: {
        status: verificationResult.status,
        lastCheckedAt: now,
        lastPublishAt: now,
        lastPublishStatus: verificationResult.status === 'OK' ? 'OK' : 'FAILED',
        lastFailureReason: verificationResult.failureReason,
        lastFailureAt: verificationResult.status === 'FAILED'
          ? now
          : readStoredFailureTimestamp(currentHealth.lastFailureAt),
        consecutiveFailures,
      } satisfies StoreHealth,
    }, { merge: true });
  });

  // Trigger alert on failure
  if (verificationResult.status === 'FAILED') {
    try {
      await createAlert({
        tId: tenantId,
        sId: storeScope.documentId,
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
