/**
 * Lifecycle Messaging — Frontend Entry Point
 * 
 * Thin wrapper for Next.js API routes to send lifecycle messages.
 * Uses firebase-admin (server-side) for logging and nodemailer SMTP
 * for email delivery. FREE — no paid API needed.
 * 
 * The Cloud Functions side (nightly scheduler) uses
 * functions/src/messaging/messagingEngine.ts directly.
 * 
 * WIRED to all trigger points: Razorpay webhook, publish flow,
 * verify-subscription, verify-topup, capacityCheck, nightly scheduler.
 * 
 * Fire-and-forget: call from webhook catch blocks with try/catch.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import { FEATURE_FLAGS } from '@config/features';
import {
  normalizeOwnerNotificationNumericScopeDocumentId,
  normalizeOwnerNotificationReferenceId,
} from '@data/shared/ownerNotificationDeliveryBoundary';
import nodemailer, { type Transporter } from '@lib/email/nodemailerRuntime';
import { admin } from '@lib/firebase/firebaseAdmin';
import {
  getBoundedNotificationStringContext,
  getNotificationPayloadLogContext,
  logNotificationFailure,
} from '@lib/notifications/notificationDiagnostics';
import { getSmtpConfigFromEnv } from '@lib/notifications/smtpConfig';
import { Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

const db = admin.firestore();
const MESSAGE_LOGS = 'messageLogs';
const OPS_CONFIG = 'ops_config';
const DEFAULT_FROM = SYSTEM_EMAIL_FROM;
const MAX_PER_DAY = 10;

const getLifecycleMessageLogContext = (payload: Partial<LifecycleMessagePayload> = {}) => ({
  ...getNotificationPayloadLogContext({
    eventType: payload.eventType,
    productId: 'ML',
    referenceId: payload.referenceId,
    recipientEmail: payload.recipientEmail,
    recipientName: payload.storeName,
    metadata: payload.metadata,
  }),
  ...getBoundedNotificationStringContext('storeId', payload.storeId),
  ...getBoundedNotificationStringContext('tenantId', payload.tenantId),
});

// ================================================================
// TYPES (minimal, matches CF types)
// ================================================================

export interface LifecycleMessagePayload {
  storeId: string;
  tenantId: string;
  eventType: string;
  referenceId: string;
  recipientEmail: string;
  storeName: string;
  metadata?: Record<string, any>;
}

type AuthoritativeLifecycleRecipient = {
  email: string;
  storeName: string;
};

function getLifecycleDeliveryDocumentId(storeId: string, eventType: string, referenceId: string): string {
  return `lifecycle_${createHash('sha256')
    .update(`${storeId}\u0000${eventType}\u0000${referenceId}`)
    .digest('hex')}`;
}

async function claimLifecycleDelivery(params: {
  documentId: string;
  eventType: string;
  referenceId: string;
  storeId: string;
  tenantId: string;
}): Promise<boolean> {
  const ref = db.collection(MESSAGE_LOGS).doc(params.documentId);
  try {
    return await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;
      transaction.create(ref, {
        eventType: params.eventType,
        referenceId: params.referenceId,
        storeId: params.storeId,
        tenantId: params.tenantId,
        channel: 'email',
        status: 'sending',
        createdAt: Timestamp.now(),
      });
      return true;
    });
  } catch (error) {
    logNotificationFailure('lifecycle_message_delivery_claim_failed', error, {
      ...getBoundedNotificationStringContext('eventType', params.eventType),
      ...getBoundedNotificationStringContext('storeId', params.storeId),
      ...getBoundedNotificationStringContext('tenantId', params.tenantId),
      ...getBoundedNotificationStringContext('referenceId', params.referenceId),
    });
    return false;
  }
}

async function resolveAuthoritativeLifecycleRecipient(params: {
  eventType: string;
  storeId: string;
  tenantId: string;
}): Promise<AuthoritativeLifecycleRecipient | null> {
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(params.storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(params.tenantId);
  if (!storeScope || !tenantScope) return null;

  let usedTenantScopedFallback = false;
  let storeSnapshot = await db.collection('stores').doc(storeScope.documentId).get();
  if (!storeSnapshot.exists) {
    usedTenantScopedFallback = true;
    storeSnapshot = await db
      .collection('tenants').doc(tenantScope.documentId)
      .collection('stores').doc(storeScope.documentId)
      .get();
  }
  if (!storeSnapshot.exists) return null;

  const store = storeSnapshot.data();
  if (!store) return null;
  const storedTenantScope = normalizeOwnerNotificationNumericScopeDocumentId(store.tenantId ?? store.tId);
  if (
    (storedTenantScope && storedTenantScope.numericId !== tenantScope.numericId)
    || (!storedTenantScope && !usedTenantScopedFallback)
  ) return null;

  const settings = store.notificationSettings || {};
  const primaryEmail = settings.primaryEmail || store.contactPersonEmail || store.email;
  const billingEmail = settings.billingEmail;
  const isBillingEvent = [
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'RENEWAL_REMINDER',
    'GRACE_PERIOD_STARTED',
    'SUSPENSION_WARNING',
    'CREDIT_PURCHASE_SUCCESS',
    'SUBSCRIPTION_CANCELLED',
    'SUBSCRIPTION_PAUSED',
    'SUBSCRIPTION_RESUMED',
    'SUBSCRIPTION_UPGRADED',
  ].includes(params.eventType);
  const email = String((isBillingEvent && billingEmail) || primaryEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return {
    email,
    storeName: String(store.name || store.businessName || 'Your Business'),
  };
}

// ================================================================
// FEATURE FLAG (cached 60s)
// ================================================================

let flagCache: boolean | null = null;
let flagCacheAt = 0;

async function isEnabled(): Promise<boolean> {
  if (flagCache !== null && Date.now() - flagCacheAt < 60_000) return flagCache;
  try {
    const doc = await db.collection(OPS_CONFIG).doc('system').get();
    flagCache = doc.data()?.ENABLE_LIFECYCLE_MESSAGING === true;
    flagCacheAt = Date.now();
    return flagCache!;
  } catch (error) {
    logNotificationFailure('lifecycle_messaging_flag_read_failed', error, {
      ...getBoundedNotificationStringContext('configDocId', 'system'),
    });
    return false;
  }
}

// ================================================================
// IDEMPOTENCY
// ================================================================

async function isDuplicate(storeId: string, eventType: string, referenceId: string): Promise<boolean> {
  try {
    const snap = await db.collection(MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('eventType', '==', eventType)
      .where('referenceId', '==', referenceId)
      .where('status', '==', 'sent')
      .limit(1).get();
    return !snap.empty;
  } catch (error) {
    logNotificationFailure('lifecycle_message_duplicate_check_failed', error, {
      eventType: eventType.slice(0, 80),
      ...getBoundedNotificationStringContext('storeId', storeId),
      ...getBoundedNotificationStringContext('referenceId', referenceId),
    });
    return true;
  }
}

// ================================================================
// RATE LIMIT
// ================================================================

async function isRateLimited(storeId: string): Promise<boolean> {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snap = await db.collection(MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('status', '==', 'sent')
      .where('createdAt', '>=', Timestamp.fromDate(today))
      .limit(MAX_PER_DAY + 1).get();
    return snap.size >= MAX_PER_DAY;
  } catch (error) {
    logNotificationFailure('lifecycle_message_rate_limit_check_failed', error, {
      ...getBoundedNotificationStringContext('storeId', storeId),
      maxPerDay: MAX_PER_DAY,
    });
    return true;
  }
}

// ================================================================
// SEND VIA SMTP (nodemailer)
// ================================================================

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const smtpConfig = getSmtpConfigFromEnv();
  if (!smtpConfig) return null;
  cachedTransporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
  return cachedTransporter;
}

function getLifecycleDeliveryError(result: { ok: boolean; error?: string }): string | null {
  if (result.ok) return null;
  const { error } = result;
  const errorCode = typeof error === 'string' && error.length > 0
    ? error
    : 'lifecycle_message_delivery_failed';
  return errorCode;
}

// Track SMTP health to avoid flooding alerts
let smtpHealthy: boolean | null = null;
let smtpAlertedToday = '';

async function sendViaSMTP(to: string, subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'smtp_not_configured' };

  try {
    // SMTP Health Check: verify connection on first send (cached)
    if (smtpHealthy === null) {
      try {
        await transporter.verify();
        smtpHealthy = true;
      } catch (error) {
        smtpHealthy = false;
        logNotificationFailure('lifecycle_message_smtp_verify_failed', error, {
          ...getBoundedNotificationStringContext('recipientEmail', to),
          ...getBoundedNotificationStringContext('subject', subject),
        });
        // Alert founder ONCE per day if SMTP is broken
        const today = new Date().toISOString().split('T')[0];
        if (smtpAlertedToday !== today) {
          smtpAlertedToday = today;
          try {
            const { createAlert } = await import('@lib/ops/alerts');
            const { PLATFORM_NOTIFICATION_TRIGGER_TYPES } = await import('@data/shared/platformNotificationRegistry');
            await createAlert({
              severity: 'critical',
              title: 'SMTP connection failed',
              message: 'SMTP provider check failed. Lifecycle emails will fail until SMTP is fixed.',
              triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.EMAIL_PROVIDER_FAILURE,
              productId: 'PLATFORM',
              category: 'owner_notifications',
            });
          } catch (alertError) {
            logNotificationFailure('lifecycle_message_smtp_alert_failed', alertError, {
              ...getBoundedNotificationStringContext('recipientEmail', to),
              ...getBoundedNotificationStringContext('subject', subject),
            });
          }
        }
        return { ok: false, error: 'smtp_verify_failed' };
      }
    }

    const info = await transporter.sendMail({ from: DEFAULT_FROM, to, subject, html });
    smtpHealthy = true; // Reset on successful send
    return { ok: true, id: info.messageId };
  } catch (error) {
    smtpHealthy = null; // Reset so next send re-verifies
    logNotificationFailure('lifecycle_message_smtp_send_failed', error, {
      ...getBoundedNotificationStringContext('recipientEmail', to),
      ...getBoundedNotificationStringContext('subject', subject),
    });
    return { ok: false, error: 'smtp_send_failed' };
  }
}

// ================================================================
// TEMPLATE IMPORT (lazy to avoid circular deps)
// ================================================================

async function getTemplate(eventType: string, meta: Record<string, any>): Promise<{ subject: string; html: string } | null> {
  // Inline minimal templates for webhook-triggered events
  // Full templates live in functions/src/messaging/templates.ts
  const { resolveTemplate } = await import('./templates');
  return resolveTemplate(eventType, meta);
}

// ================================================================
// MAIN: SEND LIFECYCLE MESSAGE
// ================================================================

/**
 * Send a lifecycle message from a Next.js API route.
 * Fire-and-forget safe — always wrap in try/catch.
 */
export async function sendLifecycleMessage(payload: LifecycleMessagePayload): Promise<boolean> {
  const { eventType, metadata = {} } = payload;
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId);
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId);
  const referenceId = normalizeOwnerNotificationReferenceId(payload.referenceId);
  if (!storeScope || !tenantScope || !referenceId || !eventType || eventType !== eventType.trim()) return false;

  const storeId = storeScope.documentId;
  const tenantId = tenantScope.documentId;
  const normalizedPayload: LifecycleMessagePayload = {
    ...payload,
    storeId,
    tenantId,
    referenceId,
  };

  if (!(await isEnabled())) return false;

  if (FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS && FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
    try {
      const { enqueueOwnerNotification } = await import('@lib/owner-notifications');
      const result = await enqueueOwnerNotification({
        productId: 'ML',
        triggerType: eventType,
        tenantId,
        storeId,
        referenceId,
        recipientHints: {
          email: normalizedPayload.recipientEmail,
          name: normalizedPayload.storeName,
        },
        metadata: {
          ...metadata,
          storeName: normalizedPayload.storeName,
        },
        source: {
          runtime: 'next',
          path: 'src/lib/messaging/index.ts:sendLifecycleMessage',
        },
      }, { processImmediately: true });

      return 'sent' in result
        ? result.sent > 0
        : result.status === 'pending';
    } catch (error) {
      logNotificationFailure('lifecycle_message_owner_notification_enqueue_failed', error, getLifecycleMessageLogContext(normalizedPayload));
      // Fall through to the legacy sender so billing/publish operations keep their
      // current fire-and-forget behavior if the new queue is unavailable.
    }
  }

  // 1. Feature flag
  if (!(await isEnabled())) return false;

  // 2. Idempotency
  if (await isDuplicate(storeId, eventType, referenceId)) return false;

  // 3. Rate limit (skip for critical: PAYMENT_FAILED, GRACE_PERIOD_STARTED, SUSPENSION_WARNING)
  const isCritical = ['PAYMENT_FAILED', 'GRACE_PERIOD_STARTED', 'SUSPENSION_WARNING'].includes(eventType);
  if (!isCritical && await isRateLimited(storeId)) return false;

  // 4. Resolve the recipient from the authoritative store scope. Caller hints
  // are never used by the legacy fallback because this path bypasses the shared
  // recipient resolver only when the migrated engine is unavailable.
  const recipient = await resolveAuthoritativeLifecycleRecipient({ eventType, storeId, tenantId });
  if (!recipient) return false;

  // 5. Resolve template
  const template = await getTemplate(eventType, { ...metadata, storeName: recipient.storeName });
  if (!template) return false;

  const documentId = getLifecycleDeliveryDocumentId(storeId, eventType, referenceId);
  if (!await claimLifecycleDelivery({ documentId, eventType, referenceId, storeId, tenantId })) return false;

  // 6. Send via SMTP only after the deterministic transaction claim.
  const result = await sendViaSMTP(recipient.email, template.subject, template.html);

  // 7. Finalize the claimed delivery row.
  try {
    await db.collection(MESSAGE_LOGS).doc(documentId).set({
      storeId, tenantId, eventType,
      channel: 'email',
      status: result.ok ? 'sent' : 'failed',
      recipientEmail: recipient.email,
      subject: template.subject,
      referenceId,
      providerMessageId: result.id || null,
      error: getLifecycleDeliveryError(result),
      createdAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    logNotificationFailure('lifecycle_message_log_write_failed', error, getLifecycleMessageLogContext(normalizedPayload));
  }

  return result.ok;
}

// ================================================================
// INTERNAL NOTIFICATIONS (sent to founder/team — revenue events)
// ================================================================

/**
 * Send an internal notification to founder/team.
 * Used for revenue events: subscription purchased, credit pack bought.
 * 
 * Differences from sendLifecycleMessage:
 * - Recipient: founder email (from constants), NOT store owner
 * - No idempotency check (every revenue event should notify)
 * - No rate limiting (founder wants to know every sale)
 * - Still gated by ENABLE_LIFECYCLE_MESSAGING feature flag
 * - Also fires Telegram alert for instant push notification
 */
export async function sendInternalNotification(params: {
  eventType: string;
  metadata: Record<string, any>;
  storeId: string;
  tenantId: string;
}): Promise<void> {
  const { eventType, metadata, storeId, tenantId } = params;

  // Feature flag check
  if (!(await isEnabled())) return;

  // Send email to founder
  try {
    const { INTERNAL_RECIPIENTS } = await import('@constant/internalRecipients');
    const template = await getTemplate(eventType, metadata);
    if (template) {
      await sendViaSMTP(INTERNAL_RECIPIENTS.FOUNDER_EMAIL, template.subject, template.html);
    }
  } catch (error) {
    logNotificationFailure('internal_lifecycle_notification_email_failed', error, {
      eventType: eventType.slice(0, 80),
      metadataPresent: Boolean(metadata),
      metadataKeyCount: metadata && typeof metadata === 'object' ? Object.keys(metadata).length : 0,
      ...getBoundedNotificationStringContext('storeId', storeId),
      ...getBoundedNotificationStringContext('tenantId', tenantId),
    });
  }

  // Also fire Telegram alert for instant push notification
  try {
    const { createAlert } = await import('@lib/ops/alerts');
    const isRevenue = eventType.includes('PURCHASED') || eventType.includes('RENEWED');
    const INTERNAL_TITLES: Record<string, string> = {
      INTERNAL_SUBSCRIPTION_PURCHASED: '💰 New Subscription',
      INTERNAL_CREDIT_PACK_PURCHASED: '💰 Credit Pack Sold',
      INTERNAL_SUBSCRIPTION_RENEWED: '💰 Subscription Renewed',
    };
    await createAlert({
      severity: 'info',
      title: INTERNAL_TITLES[eventType] || `Revenue: ${eventType}`,
      message: `Store: ${metadata.storeName || storeId}\nAmount: ${metadata.currency || 'INR'} ${metadata.amount || '0'}\nTenant: ${tenantId}`,
      sId: storeId,
      tId: tenantId,
      metadata: { ...metadata, isRevenue },
    });
  } catch (error) {
    logNotificationFailure('internal_lifecycle_notification_alert_failed', error, {
      eventType: eventType.slice(0, 80),
      metadataPresent: Boolean(metadata),
      metadataKeyCount: metadata && typeof metadata === 'object' ? Object.keys(metadata).length : 0,
      ...getBoundedNotificationStringContext('storeId', storeId),
      ...getBoundedNotificationStringContext('tenantId', tenantId),
    });
  }
}
