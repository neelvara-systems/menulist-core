/**
 * Lifecycle Messaging Engine
 * 
 * Event-driven, idempotent messaging for store owners.
 * Triggered by: Razorpay webhook, store publish, nightly scheduler (decisionBlocksScoring.ts).
 * 
 * Flow:
 * 1. Feature flag check
 * 2. Idempotency check (messageLogs query)
 * 3. Daily rate limit check (max 10/store/day)
 * 4. Resolve recipient email from store doc
 * 5. Resolve template
 * 6. Send via SMTP (nodemailer)
 * 7. Log result
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { createHash } from 'crypto';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS, FUNCTION_RETENTION_CONFIG } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
  normalizeOwnerNotificationNumericScopeAliases,
  normalizeOwnerNotificationNumericScopeDocumentId,
  normalizeOwnerNotificationReferenceId,
} from '../sharedData/ownerNotificationDeliveryBoundary';
import { sendEmailViaSMTP } from './providers/resend';
import { getExactMenuListSubscriptionScope } from '../billing/subscriptionScope';
import { resolveTemplate } from './templates';
import {
  EVENT_PRIORITY,
  MAX_MESSAGES_PER_STORE_PER_DAY,
  MessageLogDoc,
  SendMessagePayload,
} from './types';
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorName,
  getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

const MENULIST_PRODUCT_ID = 'ML' as const;
const logger = functions.logger;
const MESSAGING_FLAG_CHECK_FAILED = 'MESSAGING_FLAG_CHECK_FAILED';
const MESSAGING_IDEMPOTENCY_CHECK_FAILED = 'MESSAGING_IDEMPOTENCY_CHECK_FAILED';
const MESSAGING_RATE_LIMIT_CHECK_FAILED = 'MESSAGING_RATE_LIMIT_CHECK_FAILED';
const MESSAGING_RETRY_MARK_FAILED = 'MESSAGING_RETRY_MARK_FAILED';
const MESSAGING_DELIVERY_CLAIM_FAILED = 'MESSAGING_DELIVERY_CLAIM_FAILED';

// ================================================================
// FEATURE FLAG CHECK
// ================================================================

let cachedFlag: boolean | null = null;
let cachedFlagAt = 0;
const FLAG_CACHE_TTL = 60_000; // 60 seconds
const DAY_MS = 24 * 60 * 60 * 1000;

function getErrorLogContext(error: unknown): {
  errorName: string;
  errorCode?: string;
  errorStatus?: string;
} {
  if (error instanceof Error) {
    const errorCode = getBoundedFunctionsErrorCode(error);
    const errorStatus = getBoundedFunctionsErrorStatus(error);

    return {
      errorName: getBoundedFunctionsErrorName(error) || 'Error',
      ...(errorCode === undefined ? {} : { errorCode }),
      ...(errorStatus === undefined ? {} : { errorStatus: errorStatus.toString() }),
    };
  }

  return {
    errorName: typeof error,
  };
}

function getMessagingIdLogContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? '' : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getMessagingBoundedStringLogContext(label: string, value: unknown): Record<string, boolean | number | string> {
  const normalized = value === undefined || value === null ? '' : String(value).trim();
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
    [`${label}ValueType`]: typeof value,
  };
}

function getMessagingOperationLogContext(context: {
  eventType?: unknown;
  referenceId?: unknown;
  status?: unknown;
  storeId?: unknown;
  subscriptionId?: unknown;
  tenantId?: unknown;
}): Record<string, boolean | number | string> {
  return {
    ...getMessagingBoundedStringLogContext('eventType', context.eventType),
    ...getMessagingBoundedStringLogContext('status', context.status),
    ...getMessagingIdLogContext('storeId', context.storeId),
    ...getMessagingIdLogContext('tenantId', context.tenantId),
    ...getMessagingIdLogContext('referenceId', context.referenceId),
    ...getMessagingIdLogContext('subscriptionId', context.subscriptionId),
  };
}

function getMessagingTimestampMillis(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  try {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      const millis = Number(toMillis.call(value));
      return Number.isFinite(millis) ? millis : null;
    }
    const seconds = Number((value as { seconds?: unknown }).seconds);
    if (!Number.isFinite(seconds)) return null;
    const millis = seconds * 1000;
    return Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function getMessageDeliveryDocumentId(storeId: string, eventType: string, referenceId: string): string {
  return `lifecycle_${createHash('sha256')
    .update(`${storeId}\u0000${eventType}\u0000${referenceId}`)
    .digest('hex')}`;
}

async function claimMessageDelivery(params: {
  eventType: SendMessagePayload['eventType'];
  referenceId: string;
  storeId: string;
  tenantId: string;
}): Promise<string | null> {
  const documentId = getMessageDeliveryDocumentId(params.storeId, params.eventType, params.referenceId);
  const claimRef = db.collection(DB_COLLECTIONS.MESSAGE_LOGS).doc(documentId);
  try {
    return await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(claimRef);
      if (snapshot.exists) return null;
      transaction.create(claimRef, {
        ...params,
        channel: 'email',
        status: 'sending',
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(
          Date.now() + FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS * DAY_MS,
        ),
      });
      return documentId;
    });
  } catch (error) {
    logger.error('[Messaging] Delivery claim failed, skipping send', {
      failureCode: MESSAGING_DELIVERY_CLAIM_FAILED,
      ...getMessagingOperationLogContext(params),
      error: getErrorLogContext(error),
    });
    return null;
  }
}

async function isMessagingEnabled(): Promise<boolean> {
  if (cachedFlag !== null && Date.now() - cachedFlagAt < FLAG_CACHE_TTL) {
    return cachedFlag;
  }
  try {
    const doc = await db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
    const data = doc.data();
    cachedFlag = data?.ENABLE_LIFECYCLE_MESSAGING === true;
    cachedFlagAt = Date.now();
    return cachedFlag;
  } catch (error) {
    logger.error('[Messaging] Feature flag check failed, skipping send', {
      failureCode: MESSAGING_FLAG_CHECK_FAILED,
      error: getErrorLogContext(error),
    });
    return false;
  }
}

// ================================================================
// IDEMPOTENCY CHECK
// ================================================================

async function isDuplicate(storeId: string, eventType: string, referenceId: string): Promise<boolean> {
  try {
    const snapshot = await db
      .collection(DB_COLLECTIONS.MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('eventType', '==', eventType)
      .where('referenceId', '==', referenceId)
      .where('status', '==', 'sent')
      .limit(1)
      .get();
    return !snapshot.empty;
  } catch (error) {
    logger.error('[Messaging] Idempotency check failed, skipping send', {
      failureCode: MESSAGING_IDEMPOTENCY_CHECK_FAILED,
      ...getMessagingOperationLogContext({ storeId, eventType, referenceId }),
      error: getErrorLogContext(error),
    });
    return true;
  }
}

// ================================================================
// DAILY RATE LIMIT
// ================================================================

async function isRateLimited(storeId: string): Promise<boolean> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection(DB_COLLECTIONS.MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('status', '==', 'sent')
      .where('createdAt', '>=', Timestamp.fromDate(todayStart))
      .limit(MAX_MESSAGES_PER_STORE_PER_DAY + 1)
      .get();

    return snapshot.size >= MAX_MESSAGES_PER_STORE_PER_DAY;
  } catch (error) {
    logger.error('[Messaging] Rate limit check failed, skipping send', {
      failureCode: MESSAGING_RATE_LIMIT_CHECK_FAILED,
      ...getMessagingOperationLogContext({ storeId }),
      error: getErrorLogContext(error),
    });
    return true;
  }
}

// ================================================================
// RESOLVE RECIPIENT
// ================================================================

interface StoreInfo {
  email: string;
  storeName: string;
  billingEmail?: string;
}

async function getStoreInfo(storeId: string, tenantId: string): Promise<StoreInfo | null> {
  try {
    const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(storeId);
    const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(tenantId);
    if (!storeScope || !tenantScope) return null;

    let usedTenantScopedFallback = false;
    let storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();
    if (!storeDoc.exists) {
      usedTenantScopedFallback = true;
      storeDoc = await db
        .collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId)
        .collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)
        .get();
    }

    if (!storeDoc.exists) return null;

    const data = storeDoc.data();
    if (!data) return null;
    const tenantAliases = [data.tenantId, data.tId]
      .filter((value) => value !== undefined && value !== null);
    const storedTenantScope = normalizeOwnerNotificationNumericScopeAliases(tenantAliases);
    const storeAliases = [data.storeId, data.sId]
      .filter((value) => value !== undefined && value !== null);
    const storedStoreScope = storeAliases.length === 0
      ? storeScope
      : normalizeOwnerNotificationNumericScopeAliases(storeAliases);
    if (
      !storedStoreScope
      || storedStoreScope.numericId !== storeScope.numericId
      || (tenantAliases.length > 0 && storedTenantScope?.numericId !== tenantScope.numericId)
      || (tenantAliases.length === 0 && !usedTenantScopedFallback)
    ) return null;

    const notifSettings = data.notificationSettings;
    return {
      email: notifSettings?.primaryEmail || data.contactPersonEmail || data.email || '',
      storeName: data.name || 'Your Business',
      billingEmail: notifSettings?.billingEmail,
    };
  } catch (error) {
    logger.error('[Messaging] Failed to get store info', {
      ...getMessagingOperationLogContext({ storeId, tenantId }),
      error: getErrorLogContext(error),
    });
    return null;
  }
}

// ================================================================
// LOG MESSAGE
// ================================================================

async function logMessage(documentId: string, log: MessageLogDoc): Promise<void> {
  try {
    await db.collection(DB_COLLECTIONS.MESSAGE_LOGS).doc(documentId).set(log, { merge: true });
  } catch (error) {
    logger.error('[Messaging] Failed to log message', {
      ...getMessagingOperationLogContext({
        storeId: log.storeId,
        tenantId: log.tenantId,
        eventType: log.eventType,
        referenceId: log.referenceId,
        status: log.status,
      }),
      error: getErrorLogContext(error),
    });
  }
}

// ================================================================
// CORE: SEND LIFECYCLE MESSAGE
// ================================================================

/**
 * Send a lifecycle message to a store owner.
 * 
 * This is the single entry point for all lifecycle messaging.
 * Called from: Razorpay webhook, publish flow, nightly scheduler.
 * 
 * Returns true if message was sent, false if skipped/failed.
 */
export async function sendLifecycleMessage(payload: SendMessagePayload): Promise<boolean> {
  const { eventType, metadata = {} } = payload;
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId);
  const referenceId = normalizeOwnerNotificationReferenceId(payload.referenceId);
  if (
    !storeScope
    || !tenantScope
    || !referenceId
    || !Object.prototype.hasOwnProperty.call(EVENT_PRIORITY, eventType)
  ) {
    logger.warn('[Messaging] Invalid delivery scope, skipping', getMessagingOperationLogContext(payload));
    return false;
  }
  const storeId = storeScope.documentId;
  const tenantId = tenantScope.documentId;
  const normalizedPayload: SendMessagePayload = {
    ...payload,
    referenceId,
    storeId,
    tenantId,
  };

  if (FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS && FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
    try {
      const { sendOwnerLifecycleNotification } = await import('../ownerNotifications/processor');
      return await sendOwnerLifecycleNotification(normalizedPayload);
    } catch (error) {
      logger.error('[Messaging] Owner notification path failed, using legacy sender', {
        ...getMessagingOperationLogContext({ storeId, tenantId, eventType, referenceId }),
        error: getErrorLogContext(error),
      });
    }
  }

  // 1. Feature flag
  const enabled = await isMessagingEnabled();
  if (!enabled) {
    logger.info('[Messaging] Feature disabled, skipping', getMessagingOperationLogContext({ eventType }));
    return false;
  }

  // 2. Idempotency
  const duplicate = await isDuplicate(storeId, eventType, referenceId);
  if (duplicate) {
    logger.info('[Messaging] Duplicate detected, skipping', getMessagingOperationLogContext({ eventType, referenceId }));
    return false;
  }

  // 3. Rate limit (skip for critical messages)
  const priority = EVENT_PRIORITY[eventType];
  if (priority !== 'critical') {
    const limited = await isRateLimited(storeId);
    if (limited) {
      logger.warn('[Messaging] Rate limited, skipping', getMessagingOperationLogContext({ eventType, storeId }));
      return false;
    }
  }

  // 4. Get store info
  const storeInfo = await getStoreInfo(storeId, tenantId);
  if (!storeInfo || !storeInfo.email) {
    logger.warn('[Messaging] No recipient email for store', getMessagingOperationLogContext({ storeId, tenantId, eventType }));
    return false;
  }

  // 5. Determine recipient (billing events go to billingEmail if set)
  const isBillingEvent = ['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'RENEWAL_REMINDER',
    'GRACE_PERIOD_STARTED', 'SUSPENSION_WARNING', 'CREDIT_PURCHASE_SUCCESS'].includes(eventType);
  const recipientEmail = (isBillingEvent && storeInfo.billingEmail) || storeInfo.email;

  // 6. Resolve template
  const templateMeta = { ...metadata, storeName: storeInfo.storeName };
  const template = resolveTemplate(eventType, templateMeta);
  if (!template) {
    logger.warn('[Messaging] No template for event', getMessagingOperationLogContext({ eventType }));
    return false;
  }

  const deliveryDocumentId = await claimMessageDelivery({
    eventType,
    referenceId,
    storeId,
    tenantId,
  });
  if (!deliveryDocumentId) {
    logger.info('[Messaging] Delivery already claimed, skipping', getMessagingOperationLogContext({
      eventType,
      referenceId,
      storeId,
      tenantId,
    }));
    return false;
  }

  // 7. Send via SMTP (nodemailer) after the durable exactly-once claim.
  const result = await sendEmailViaSMTP({
    to: recipientEmail,
    subject: template.subject,
    html: template.html,
    eventType,
    referenceId,
  });

  // 8. Log result
  const logDoc: MessageLogDoc = {
    storeId,
    tenantId,
    eventType,
    channel: 'email',
    status: result.success ? 'sent' : 'failed',
    recipientEmail,
    subject: template.subject,
    referenceId,
    providerMessageId: result.providerMessageId,
    error: result.error,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS * DAY_MS),
  };

  await logMessage(deliveryDocumentId, logDoc);

  if (result.success) {
    logger.info('[Messaging] Sent', {
      ...getMessagingOperationLogContext({ storeId, tenantId, eventType, referenceId }),
      hasProviderMessageId: Boolean(result.providerMessageId),
    });
  } else {
    logger.error('[Messaging] Failed', {
      ...getMessagingOperationLogContext({ storeId, tenantId, eventType, referenceId }),
      error: result.error,
    });
  }

  return result.success;
}

// ================================================================
// SCHEDULER HELPER: CHECK RENEWAL REMINDERS
// ================================================================

/**
 * Scan active subscriptions and send renewal reminders
 * for those renewing within 3 days.
 * Called from nightly scheduler (decisionBlocksScoring.ts).
 */
export async function checkRenewalReminders(): Promise<void> {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const pageSize = 100;
    const maxPages = 5;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let found = 0;

    for (let page = 0; page < maxPages; page += 1) {
      let query = db
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('pId', '==', MENULIST_PRODUCT_ID)
        .where('productId', '==', MENULIST_PRODUCT_ID)
        .where('status', '==', 'active')
        .where('renewsOn', '>=', Timestamp.fromDate(threeDaysFromNow))
        .where('renewsOn', '<', Timestamp.fromDate(fourDaysFromNow))
        .orderBy('renewsOn', 'asc')
        .limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      for (const doc of snapshot.docs) {
        const sub = doc.data();
        const scope = getExactMenuListSubscriptionScope(sub);
        if (!scope) continue;
        found += 1;
        const renewalMillis = getMessagingTimestampMillis(sub.renewsOn);
        try {
          await sendLifecycleMessage({
            storeId: String(scope.storeId),
            tenantId: String(scope.tenantId),
            eventType: 'RENEWAL_REMINDER',
            referenceId: `renewal-${doc.id}-${now.toISOString().split('T')[0]}`,
            metadata: {
              amount: sub.amount,
              currency: sub.currency,
              planName: sub.planName,
              renewalAt: renewalMillis === null ? null : new Date(renewalMillis).toISOString(),
            },
          });
        } catch (err) {
          logger.error('[Messaging] Renewal reminder failed for subscription', {
            ...getMessagingOperationLogContext({ subscriptionId: doc.id, eventType: 'RENEWAL_REMINDER' }),
            error: getErrorLogContext(err),
          });
        }
      }

      cursor = snapshot.docs[snapshot.docs.length - 1] || null;
      if (snapshot.size < pageSize || !cursor) break;
      if (page === maxPages - 1) {
        logger.warn('[Messaging] Renewal reminder scan reached bounded page limit', { found });
      }
    }

    logger.info('[Messaging] Renewal reminder subscriptions found', { count: found });
  } catch (error) {
    logger.error('[Messaging] checkRenewalReminders failed', {
      error: getErrorLogContext(error),
    });
  }
}

/**
 * Scan past-due subscriptions and send suspension warnings
 * for those overdue 7+ days.
 * Called from nightly scheduler (decisionBlocksScoring.ts).
 */
export async function checkSuspensionWarnings(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const pageSize = 100;
    const maxPages = 5;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let found = 0;

    for (let page = 0; page < maxPages; page += 1) {
      let query = db
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('pId', '==', MENULIST_PRODUCT_ID)
        .where('productId', '==', MENULIST_PRODUCT_ID)
        .where('status', '==', 'past_due')
        .where('pastDueSinceAt', '<=', Timestamp.fromDate(sevenDaysAgo))
        .orderBy('pastDueSinceAt', 'asc')
        .limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      for (const doc of snapshot.docs) {
        const sub = doc.data();
        const scope = getExactMenuListSubscriptionScope(sub);
        if (!scope) continue;
        found += 1;
        const pastDueMillis = getMessagingTimestampMillis(sub.pastDueSinceAt);
        const daysOverdue = pastDueMillis === null
          ? 7
          : Math.max(7, Math.floor((now.getTime() - pastDueMillis) / (24 * 60 * 60 * 1000)));

        try {
          await sendLifecycleMessage({
            storeId: String(scope.storeId),
            tenantId: String(scope.tenantId),
            eventType: 'SUSPENSION_WARNING',
            referenceId: `suspension-${doc.id}-${now.toISOString().split('T')[0]}`,
            metadata: {
              daysOverdue,
            },
          });
        } catch (err) {
          logger.error('[Messaging] Suspension warning failed for subscription', {
            ...getMessagingOperationLogContext({ subscriptionId: doc.id, eventType: 'SUSPENSION_WARNING' }),
            error: getErrorLogContext(err),
          });
        }
      }

      cursor = snapshot.docs[snapshot.docs.length - 1] || null;
      if (snapshot.size < pageSize || !cursor) break;
      if (page === maxPages - 1) {
        logger.warn('[Messaging] Suspension warning scan reached bounded page limit', { found });
      }
    }

    logger.info('[Messaging] Suspension warning subscriptions found', { count: found });
  } catch (error) {
    logger.error('[Messaging] checkSuspensionWarnings failed', {
      error: getErrorLogContext(error),
    });
  }
}

// ================================================================
// SCHEDULER HELPER: RETRY FAILED MESSAGES
// ================================================================

/**
 * Retry messages that failed in the last 24 hours.
 * Max 1 retry per message (checks retryCount field).
 * Industry best practice: transient SMTP failures should be retried once.
 */
export async function retryFailedMessages(): Promise<{ retried: number; succeeded: number; ambiguous: number }> {
  if (FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS && FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
    try {
      const { retryFailedOwnerNotifications } = await import('../ownerNotifications/processor');
      return await retryFailedOwnerNotifications();
    } catch (error) {
      logger.error('[Messaging] Owner notification retry failed, using legacy retry', {
        error: getErrorLogContext(error),
      });
    }
  }

  let retried = 0;
  let succeeded = 0;

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const snapshot = await db
      .collection(DB_COLLECTIONS.MESSAGE_LOGS)
      .where('status', '==', 'failed')
      .where('createdAt', '>=', Timestamp.fromDate(yesterday))
      .limit(20) // Cap to prevent runaway retries
      .get();

    for (const msgDoc of snapshot.docs) {
      const msg = msgDoc.data();
      // Skip if already retried
      if (msg.retryCount && msg.retryCount >= 1) continue;

      retried++;
      try {
        const result = await sendLifecycleMessage({
          storeId: msg.storeId,
          tenantId: msg.tenantId,
          eventType: msg.eventType,
          // Use a new referenceId so idempotency doesn't block it
          referenceId: `${msg.referenceId}-retry`,
          metadata: {},
        });

        if (result) succeeded++;

        // Mark original as retried (regardless of outcome)
        await msgDoc.ref.update({ retryCount: 1, retriedAt: Timestamp.now() });
      } catch (error) {
        logger.error('[Messaging] Retry send failed while marking retry consumed', {
          failureCode: MESSAGING_RETRY_MARK_FAILED,
          ...getMessagingOperationLogContext({
            storeId: msg.storeId,
            tenantId: msg.tenantId,
            eventType: msg.eventType,
            referenceId: msg.referenceId,
          }),
          error: getErrorLogContext(error),
        });
        await msgDoc.ref.update({ retryCount: 1, retriedAt: Timestamp.now() });
      }
    }
  } catch (error) {
    logger.error('[Messaging] retryFailedMessages failed', {
      error: getErrorLogContext(error),
    });
  }

  return { retried, succeeded, ambiguous: 0 };
}

// ================================================================
// SCHEDULER HELPER: DAILY MESSAGE DIGEST
// ================================================================

/**
 * Get message counts from the last 24 hours.
 * Used by nightly scheduler to log a digest for founder visibility.
 */
export async function getDailyMessageDigest(): Promise<{ sent: number; failed: number; total: number }> {
  if (FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS && FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
    try {
      const { getOwnerNotificationDigest } = await import('../ownerNotifications/processor');
      return await getOwnerNotificationDigest();
    } catch (error) {
      logger.error('[Messaging] Owner notification digest failed, using legacy digest', {
        error: getErrorLogContext(error),
      });
    }
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const sentSnap = await db
      .collection(DB_COLLECTIONS.MESSAGE_LOGS)
      .where('status', '==', 'sent')
      .where('createdAt', '>=', Timestamp.fromDate(yesterday))
      .count().get();

    const failedSnap = await db
      .collection(DB_COLLECTIONS.MESSAGE_LOGS)
      .where('status', '==', 'failed')
      .where('createdAt', '>=', Timestamp.fromDate(yesterday))
      .count().get();

    const sent = sentSnap.data().count;
    const failed = failedSnap.data().count;
    return { sent, failed, total: sent + failed };
  } catch (error) {
    logger.error('[Messaging] getDailyMessageDigest failed', {
      error: getErrorLogContext(error),
    });
    return { sent: 0, failed: 0, total: 0 };
  }
}
