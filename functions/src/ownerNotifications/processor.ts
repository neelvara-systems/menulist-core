/**
 * MenuList owner notification processor for Cloud Functions.
 *
 * Queue-first model: lifecycle trigger points write ownerNotificationEvents and
 * process them through shared recipient, formatter, rate-limit, and delivery
 * logging rules.
 *
 * @see __docs__/owner-notifications/
 */

import * as crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS, FUNCTION_RETENTION_CONFIG } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { createAlert } from '../monitoring/alerts';
import {
  getOwnerNotificationRegistryEntry,
  OWNER_NOTIFICATION_COLLECTIONS,
  OwnerNotificationChannel,
} from '../sharedData/ownerNotificationRegistry';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';
import {
    getOwnerNotificationDeliveryClaimDecision,
    getNextOwnerNotificationProcessingAttempt,
    hasOwnerNotificationWhatsAppConsent,
    isOwnerNotificationEventWithinByteLimit,
    MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS,
    normalizeOwnerNotificationNumericScopeAliases,
    normalizeOwnerNotificationNumericScopeDocumentId,
    projectOwnerNotificationPersistedEvent,
    projectOwnerNotificationRateLimitCount,
  normalizeOwnerNotificationReferenceId,
} from '../sharedData/ownerNotificationDeliveryBoundary';
import { isInternalNotificationEmail, planNotificationOsChannels } from '../sharedData/notificationOs';
import { getWhatsAppOsTemplateDefinition, type WhatsAppOsMessageClass } from '../sharedData/whatsappOs';
import { sendEmailViaSMTP } from '../messaging/providers/resend';
import { resolveTemplate } from '../messaging/templates';
import { SendMessagePayload } from '../messaging/types';
import { buildWhatsAppPhoneParam } from '../utils/phoneNumber';
import { sanitizeForFirestore as sanitizeFirestoreValue } from '../lib/sanitizeForFirestore';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';
import { sendFunctionsWhatsAppOs } from '../whatsappOs/provider';

const logger = functions.logger;
const MAX_PER_RECIPIENT_PER_DAY = 20;
const MAX_PER_STORE_PER_DAY = 10;
const FLAG_CACHE_TTL = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED = 'whatsapp_send_failed';
const OWNER_NOTIFICATION_PROCESSING_FAILED = 'owner_notification_processing_failed';
const OWNER_NOTIFICATION_ALERT_CREATE_FAILED = 'owner_notification_alert_create_failed';
const OWNER_NOTIFICATION_LIFECYCLE_FLAG_CHECK_FAILED = 'owner_notification_lifecycle_flag_check_failed';
const OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER = 'owner_notification_unknown_menulist_trigger';
const OWNER_NOTIFICATION_EVENT_TOO_LARGE = 'owner_notification_event_too_large';
const OWNER_NOTIFICATION_PROCESSING_OUTCOME_AMBIGUOUS = 'owner_notification_processing_outcome_ambiguous';
const OWNER_NOTIFICATION_PROCESSING_LEASE_MS = 15 * 60 * 1000;

type EventStatus = 'pending' | 'processing' | 'delivered' | 'partial' | 'failed' | 'skipped';

type OwnerNotificationEventDoc = {
  productId: 'ML';
  triggerType: string;
  tenantId: string;
  storeId: string;
  referenceId: string;
  dedupeKey: string;
  recipientRole: 'primary_owner' | 'billing_owner' | 'support_owner' | 'whatsapp_owner';
  requestedChannels?: OwnerNotificationChannel[];
  recipientHints?: {
    email?: string;
    name?: string;
    whatsappNumber?: string;
  };
  metadata: Record<string, any>;
  priority: 'critical' | 'required' | 'advisory' | 'conversational';
  status: EventStatus;
  source: {
    runtime: 'next' | 'functions' | 'functions-answerlattice';
    path: string;
  };
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  updatedAt: Timestamp;
  processingAttempt?: number;
};

type StoreInfo = {
  email?: string;
  billingEmail?: string;
  storeName: string;
  whatsappNumber?: string;
  whatsappConsent: boolean;
  emailVerified: boolean;
  emailInternalIdentity: boolean;
  phoneVerified: boolean;
  preferredChannels: OwnerNotificationChannel[];
  channelMode: 'email_only' | 'whatsapp_only' | 'email_and_whatsapp' | 'preferred_available';
  formattingSource: Record<string, any>;
};

let cachedLifecycleFlag: boolean | null = null;
let cachedLifecycleFlagAt = 0;

function getRetentionExpiry(days: number): Timestamp {
  return Timestamp.fromMillis(Date.now() + days * DAY_MS);
}

async function isLifecycleMessagingEnabled(): Promise<boolean> {
  if (cachedLifecycleFlag !== null && Date.now() - cachedLifecycleFlagAt < FLAG_CACHE_TTL) {
    return cachedLifecycleFlag;
  }

  try {
    const doc = await db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
    cachedLifecycleFlag = doc.data()?.ENABLE_LIFECYCLE_MESSAGING === true;
    cachedLifecycleFlagAt = Date.now();
    return cachedLifecycleFlag;
  } catch (error) {
    logger.error('[OwnerNotifications] Lifecycle flag check failed, skipping owner notification', {
      failureCode: OWNER_NOTIFICATION_LIFECYCLE_FLAG_CHECK_FAILED,
      fallbackPolicy: 'skip_owner_notification_until_lifecycle_flag_known',
      ...getOwnerNotificationErrorContext(error),
    });
    return false;
  }
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function safeId(input: string): string {
  return sha256(input).slice(0, 40);
}

function getOwnerNotificationEventLogContext(eventId: string): Record<string, boolean | number> {
  return {
    eventIdPresent: eventId.length > 0,
    eventIdLength: eventId.length,
  };
}

function getOwnerNotificationTriggerLogContext(triggerType: unknown): Record<string, boolean | number | string> {
  const normalizedTriggerType = typeof triggerType === 'string'
    ? triggerType.trim()
    : triggerType === undefined || triggerType === null
      ? ''
      : String(triggerType).trim();
  return {
    triggerTypePresent: normalizedTriggerType.length > 0,
    triggerTypeLength: normalizedTriggerType.length,
    triggerTypeValueType: typeof triggerType,
  };
}

function getOwnerNotificationErrorContext(error: unknown): Record<string, string | number | undefined> {
  return getBoundedFunctionsErrorContext(error);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 4 ? `***${digits.slice(-4)}` : '***';
}

function isValidEmail(value?: string): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function cleanString(value?: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cleanPhone(value?: unknown, context?: Record<string, any> | null): string | undefined {
  const raw = cleanString(value);
  if (!raw) return undefined;
  const phone = buildWhatsAppPhoneParam({
    countryCode: cleanString(context?.countryCode),
    dialCode: cleanString(context?.dialCode),
    phone: raw,
    phoneNumber: raw,
  });
  return phone.length >= 10 && phone.length <= 15 ? phone : undefined;
}

function resolveFirstPhone(context: Record<string, any> | null | undefined, ...values: unknown[]): string | undefined {
  for (const value of values) {
    const phone = cleanPhone(value, context);
    if (phone) return phone;
  }
  return undefined;
}

function sanitizeForFirestore(value: any): any {
  return sanitizeFirestoreValue(value, {
    dateTransform: (date) => date.toISOString(),
    undefinedObjectValue: 'omit',
  });
}

function htmlToPlainText(html: string, fallback: string): string {
  const text = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
  return text || fallback;
}

async function getStoreInfo(event: OwnerNotificationEventDoc): Promise<StoreInfo | null> {
  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(event.tenantId);
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(event.storeId);
  if (!tenantScope || !storeScope) return null;

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

  const settings = data.notificationSettings || {};
  const primaryEmail = settings.primaryEmail || data.contactPersonEmail || data.email;
  const phoneContext = {
    countryCode: data.countryCode || settings.countryCode,
    dialCode: data.dialCode || settings.dialCode,
    phone: data.phone,
    phoneNumber: data.phoneNumber,
  };

  const email = isValidEmail(primaryEmail) ? primaryEmail.trim() : undefined;
  const whatsappNumber = resolveFirstPhone(
    phoneContext,
    settings.whatsappNumber,
    data.ownerWhatsappNumber,
    data.whatsappNumber,
    data.phone,
    data.phoneNumber,
  );
  const whatsappConsent = hasOwnerNotificationWhatsAppConsent(settings);
  const emailInternalIdentity = isInternalNotificationEmail(email, ['msg.menulist.ai', 'msg.menulist.digital']);
  const preferredChannels: OwnerNotificationChannel[] = Array.isArray(settings.preferredChannels)
    ? (Array.from(
        new Set(
          settings.preferredChannels.filter(
            (value: unknown): value is OwnerNotificationChannel => value === 'email' || value === 'whatsapp',
          ),
        ),
      ) as OwnerNotificationChannel[])
    : [];
  const channelMode =
    settings.channelMode === 'email_only' ||
    settings.channelMode === 'whatsapp_only' ||
    settings.channelMode === 'email_and_whatsapp' ||
    settings.channelMode === 'preferred_available'
      ? settings.channelMode
      : 'preferred_available';

  return {
    email,
    billingEmail: isValidEmail(settings.billingEmail) ? settings.billingEmail.trim() : undefined,
    storeName: event.recipientHints?.name || data.name || data.businessName || 'Your Business',
    whatsappNumber,
    whatsappConsent,
    emailVerified: Boolean(email) && !emailInternalIdentity && settings.emailVerified !== false,
    emailInternalIdentity,
    phoneVerified:
      Boolean(whatsappNumber) && (settings.whatsappVerified === true || data.phoneVerifiedAt != null || data.whatsappVerifiedAt != null),
    preferredChannels,
    channelMode,
    formattingSource: data,
  };
}

function isValidTimeZone(timeZone?: string): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const seconds = value.seconds ?? value._seconds;
  const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
  if (typeof seconds === 'number') {
    const date = new Date(seconds * 1000 + nanoseconds / 1_000_000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDate(value: any, source: Record<string, any>, fallback = 'See dashboard'): string {
  const date = toDate(value);
  if (!date) return fallback;

  const timeZone = isValidTimeZone(source.timeZone) ? source.timeZone : 'UTC';
  const dateFormat = String(source.dateFormat || 'numeric|short|numeric');
  const [day = 'numeric', month = 'short', year = 'numeric'] = dateFormat.split('|');
  return new Intl.DateTimeFormat('en-IN', {
    day: day as any,
    month: month as any,
    year: year as any,
    timeZone,
  }).format(date);
}

function formatMoney(amount: any, source: Record<string, any>, metadata: Record<string, any>): string {
  const currencySymbol = String(metadata.currencySymbol || source.currencySymbol || '₹');
  const numeric = typeof amount === 'number' ? amount : Number(String(amount ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return `${currencySymbol} 0`;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  }).format(numeric);
  return `${currencySymbol} ${formatted}`;
}

function buildFormattedMetadata(
  event: OwnerNotificationEventDoc,
  storeInfo: StoreInfo,
): Record<string, any> {
  const metadata = { ...event.metadata };
  if (metadata.amount !== undefined && metadata.amount !== null) {
    metadata.amountLabel = formatMoney(metadata.amount, storeInfo.formattingSource, metadata);
  }
  if (metadata.nextBillingAt) {
    metadata.nextBillingDate = formatDate(metadata.nextBillingAt, storeInfo.formattingSource);
  }
  if (metadata.renewalAt) {
    metadata.renewalDate = formatDate(metadata.renewalAt, storeInfo.formattingSource);
  }
  metadata.storeName = metadata.storeName || storeInfo.storeName;
  metadata.currencySymbol = metadata.currencySymbol || storeInfo.formattingSource.currencySymbol || '₹';
  metadata.currencyCode = metadata.currency || storeInfo.formattingSource.currencyCode || 'INR';
  return metadata;
}

async function incrementRateLimit(
  event: OwnerNotificationEventDoc,
  channel: OwnerNotificationChannel,
  recipientHash: string,
): Promise<boolean> {
  const dateKey = todayKey();
  const recipientRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS)
    .doc(safeId(['ML', channel, recipientHash, dateKey].join('|')));
  const storeRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.RATE_LIMITS)
    .doc(safeId(['ML', 'store', event.tenantId, event.storeId, dateKey].join('|')));

  return db.runTransaction(async (tx) => {
    const recipientSnap = await tx.get(recipientRef);
    const storeSnap = await tx.get(storeRef);
    const recipientCount = recipientSnap.exists
      ? projectOwnerNotificationRateLimitCount(recipientSnap.data(), {
        productId: 'ML',
        dateKey,
        kind: 'recipient',
        channel,
        recipientHash,
      })
      : 0;
    const storeCount = storeSnap.exists
      ? projectOwnerNotificationRateLimitCount(storeSnap.data(), {
        productId: 'ML',
        dateKey,
        kind: 'store',
        tenantId: event.tenantId,
        storeId: event.storeId,
      })
      : 0;
    if (recipientCount === null || storeCount === null) return false;
    if (recipientCount >= MAX_PER_RECIPIENT_PER_DAY) return false;
    if (storeCount >= MAX_PER_STORE_PER_DAY) return false;

    tx.set(recipientRef, {
      productId: 'ML',
      channel,
      recipientHash,
      dateKey,
      count: FieldValue.increment(1),
      expiresAt: getRetentionExpiry(FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    tx.set(storeRef, {
      productId: 'ML',
      scope: 'store',
      tenantId: event.tenantId,
      storeId: event.storeId,
      dateKey,
      count: FieldValue.increment(1),
      expiresAt: getRetentionExpiry(FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    return true;
  });
}

type OwnerNotificationDeliveryClaim = {
  decision: 'claimed' | 'terminal' | 'ambiguous' | 'invalid';
  existingStatus?: 'sent' | 'failed' | 'skipped' | 'rate_limited';
};

async function claimDelivery(params: {
  event: OwnerNotificationEventDoc;
  eventId: string;
  channel: OwnerNotificationChannel;
  recipientRole: string;
  recipientValue: string;
  subject?: string;
  templateKey: string;
  templateVersion: string;
}): Promise<OwnerNotificationDeliveryClaim> {
  const recipientHash = sha256(params.recipientValue.toLowerCase());
  const attemptedAt = Timestamp.now();
  const deliveryRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .doc(safeId(`${params.eventId}|${params.channel}|${recipientHash}`));
  const attempt = params.event.processingAttempt;
  if (!attempt) return { decision: 'invalid' };

  return db.runTransaction(async (tx): Promise<OwnerNotificationDeliveryClaim> => {
    const existing = await tx.get(deliveryRef);
    const existingData = existing.data();
    if (
      existing.exists
      && (
        existingData?.eventId !== params.eventId
        || existingData?.productId !== params.event.productId
        || existingData?.channel !== params.channel
        || existingData?.recipientHash !== recipientHash
        || !(existingData?.createdAt instanceof Timestamp)
      )
    ) return { decision: 'invalid' };

    const decision = getOwnerNotificationDeliveryClaimDecision(
      existingData?.status,
      existingData?.attempt,
      attempt,
    );
    if (decision === 'terminal') {
      const existingStatus = existingData?.status;
      if (
        existingStatus !== 'sent'
        && existingStatus !== 'failed'
        && existingStatus !== 'skipped'
        && existingStatus !== 'rate_limited'
      ) return { decision: 'invalid' };
      return { decision, existingStatus };
    }
    if (decision !== 'claim') return { decision };

    const createdAt = existing.exists
      ? existingData?.createdAt instanceof Timestamp
        ? existingData.createdAt
        : null
      : attemptedAt;
    if (!createdAt) return { decision: 'invalid' };
    tx.set(deliveryRef, sanitizeForFirestore({
      eventId: params.eventId,
      productId: 'ML',
      triggerType: params.event.triggerType,
      channel: params.channel,
      recipientRole: params.recipientRole,
      recipientHash,
      recipientMasked: params.channel === 'email' ? maskEmail(params.recipientValue) : maskPhone(params.recipientValue),
      status: 'sending',
      subject: params.subject || null,
      templateKey: params.templateKey,
      templateVersion: params.templateVersion,
      providerMessageId: null,
      error: null,
      expiresAt: getRetentionExpiry(FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS),
      attempt,
      createdAt,
      lastAttemptAt: attemptedAt,
      sentAt: null,
    }));
    return { decision: 'claimed' };
  });
}

async function finalizeDelivery(params: {
  event: OwnerNotificationEventDoc;
  eventId: string;
  channel: OwnerNotificationChannel;
  recipientValue: string;
  status: 'sent' | 'failed' | 'skipped' | 'rate_limited';
  providerMessageId?: string;
  error?: string;
}): Promise<void> {
  const recipientHash = sha256(params.recipientValue.toLowerCase());
  const deliveryRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .doc(safeId(`${params.eventId}|${params.channel}|${recipientHash}`));
  const attempt = params.event.processingAttempt;
  if (!attempt) throw new Error('owner_notification_delivery_attempt_missing');

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(deliveryRef);
    const data = existing.data();
    if (
      !existing.exists
      || data?.eventId !== params.eventId
      || data?.productId !== 'ML'
      || data?.channel !== params.channel
      || data?.recipientHash !== recipientHash
      || data?.status !== 'sending'
      || data?.attempt !== attempt
      || !(data?.createdAt instanceof Timestamp)
    ) throw new Error('owner_notification_delivery_claim_mismatch');

    const finalizedAt = Timestamp.now();
    tx.set(deliveryRef, {
      ...data,
      status: params.status,
      providerMessageId: params.providerMessageId || null,
      error: params.error || null,
      lastAttemptAt: finalizedAt,
      sentAt: params.status === 'sent' ? finalizedAt : null,
    });
  });
}

async function sendWhatsApp(params: {
  eventId: string;
  deliveryId: string;
  consentGranted: boolean;
  to: string;
  text: string;
  messageClass: WhatsAppOsMessageClass;
  templateKey: string;
  metadata: Record<string, any>;
}): Promise<{ success: boolean; providerMessageId?: string; error?: string; ambiguous?: boolean }> {
  const to = buildWhatsAppPhoneParam({ phoneNumber: params.to });
  if (to.length < 10 || to.length > 15) return { success: false, error: 'whatsapp_recipient_missing' };

  const sessionActive = params.metadata.whatsappSessionActive === true;
  const templateDefinition = getWhatsAppOsTemplateDefinition(params.templateKey);
  const result = await sendFunctionsWhatsAppOs({
    productCode: 'ML',
    messageClass: params.messageClass,
    localDeliveryReference: `${params.eventId}:whatsapp`,
    ownerReference: { workflow: 'owner_notification', documentId: params.deliveryId },
    to,
    consentGranted: params.consentGranted,
    ...(!sessionActive && templateDefinition
      ? {
        template: {
          registryKey: params.templateKey,
          name: templateDefinition.metaName,
          language: templateDefinition.language,
          parameters: [params.text],
        },
      }
      : { session: { active: sessionActive, text: params.text } }),
  });
  return result.accepted
    ? { success: true, providerMessageId: result.providerMessageId, ambiguous: result.ambiguous }
    : { success: false, error: result.errorCode || OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED, ambiguous: result.ambiguous };
}

function getDedupeKey(payload: SendMessagePayload): string {
  return ['ML', payload.eventType, payload.tenantId, payload.storeId, payload.referenceId].join('|');
}

async function claimOwnerNotificationEvent(
  eventRef: FirebaseFirestore.DocumentReference,
): Promise<OwnerNotificationEventDoc | null> {
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(eventRef);
    if (!snapshot.exists) return null;

    const event = projectOwnerNotificationPersistedEvent(snapshot.data(), 'ML');
    const registryEntry = event
      ? getOwnerNotificationRegistryEntry('ML', event.triggerType)
      : null;
    if (
      !event
      || event.productId !== 'ML'
      || !event.storeId
      || safeId(event.dedupeKey) !== eventRef.id
      || !registryEntry
      || event.priority !== registryEntry.priority
    ) return null;
    const processingAttempt = getNextOwnerNotificationProcessingAttempt(
      event.status,
      event.processingAttempt,
    );
    if (processingAttempt === null) return null;
    const now = Timestamp.now();
    tx.set(eventRef, {
      status: 'processing',
      processingAttempt,
      processingStartedAt: now,
      updatedAt: now,
    }, { merge: true });

    return {
      ...event,
      productId: 'ML',
      storeId: event.storeId,
      status: 'processing',
      processingAttempt,
      updatedAt: now,
    };
  });
}

export async function sendOwnerLifecycleNotification(payload: SendMessagePayload): Promise<boolean> {
  if (!FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS || !FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION) {
    return false;
  }
  if (!(await isLifecycleMessagingEnabled())) return false;

  const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId);
  const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId);
  const referenceId = normalizeOwnerNotificationReferenceId(payload.referenceId);
  if (!tenantScope || !storeScope || !referenceId) return false;

  const requestedRegistryEntry = getOwnerNotificationRegistryEntry('ML', payload.eventType);
  if (!requestedRegistryEntry || requestedRegistryEntry.producerStatus === 'reserved') {
    logger.warn('[OwnerNotifications] Non-active MenuList trigger skipped', {
      failureCode: OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER,
      fallbackPolicy: 'skip_owner_notification_without_active_registry_entry',
      ...getOwnerNotificationTriggerLogContext(payload.eventType),
    });
    return false;
  }
  const eventType = requestedRegistryEntry.producerStatus === 'alias'
    ? requestedRegistryEntry.canonicalTriggerType
    : payload.eventType;
  if (!eventType) return false;
  const registryEntry = getOwnerNotificationRegistryEntry('ML', eventType);
  if (!registryEntry || registryEntry.producerStatus !== 'active') {
    logger.warn('[OwnerNotifications] MenuList alias target skipped', {
      failureCode: OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER,
      fallbackPolicy: 'skip_owner_notification_without_active_alias_target',
      ...getOwnerNotificationTriggerLogContext(eventType),
    });
    return false;
  }

  const normalizedPayload: SendMessagePayload = {
    ...payload,
    eventType: eventType as SendMessagePayload['eventType'],
    tenantId: tenantScope.documentId,
    storeId: storeScope.documentId,
    referenceId,
  };

  const dedupeKey = getDedupeKey(normalizedPayload);
  const eventId = safeId(dedupeKey);
  const eventRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
  const now = Timestamp.now();
  const eventDoc: OwnerNotificationEventDoc = {
      productId: 'ML',
      triggerType: normalizedPayload.eventType,
      tenantId: normalizedPayload.tenantId,
      storeId: normalizedPayload.storeId,
      referenceId: normalizedPayload.referenceId,
      dedupeKey,
      recipientRole: registryEntry.recipientRole,
      metadata: sanitizeForFirestore(normalizedPayload.metadata || {}),
      priority: registryEntry.priority,
      status: 'pending',
      source: {
        runtime: 'functions',
        path: 'functions/src/messaging/messagingEngine.ts:sendLifecycleMessage',
      },
      createdAt: now,
      expiresAt: getRetentionExpiry(FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS),
      updatedAt: now,
  };
  if (!isOwnerNotificationEventWithinByteLimit(eventDoc)) {
    logger.warn('[OwnerNotifications] Event payload exceeded the bounded document contract', {
      failureCode: OWNER_NOTIFICATION_EVENT_TOO_LARGE,
      ...getOwnerNotificationTriggerLogContext(normalizedPayload.eventType),
    });
    return false;
  }
  const projectedEventDoc = projectOwnerNotificationPersistedEvent(eventDoc, 'ML');
  if (
    !projectedEventDoc
    || safeId(projectedEventDoc.dedupeKey) !== eventId
    || projectedEventDoc.priority !== registryEntry.priority
  ) {
    logger.warn('[OwnerNotifications] Event payload failed the persisted contract', {
      failureCode: OWNER_NOTIFICATION_EVENT_TOO_LARGE,
      ...getOwnerNotificationTriggerLogContext(normalizedPayload.eventType),
    });
    return false;
  }

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(eventRef);
    if (!existing.exists) tx.create(eventRef, eventDoc);
  });

  return processOwnerNotificationEvent(eventId);
}

export async function processOwnerNotificationEvent(eventId: string): Promise<boolean> {
  const eventRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
  const event = await claimOwnerNotificationEvent(eventRef);
  if (!event) return false;
  const registryEntry = getOwnerNotificationRegistryEntry('ML', event.triggerType);
  if (!registryEntry) {
    logger.warn('[OwnerNotifications] Unknown stored MenuList trigger skipped', {
      failureCode: OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER,
      fallbackPolicy: 'mark_owner_notification_skipped_without_registry_entry',
      ...getOwnerNotificationEventLogContext(eventId),
      ...getOwnerNotificationTriggerLogContext(event.triggerType),
    });
    await eventRef.set(
      {
        status: 'skipped',
        error: 'unknown_trigger',
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return false;
  }

  try {
    const storeInfo = await getStoreInfo(event);
    if (!storeInfo) throw new Error('store_not_found');

    const metadata = buildFormattedMetadata(event, storeInfo);
    const template = resolveTemplate(event.triggerType as any, metadata);
    if (!template) {
      await eventRef.set({ status: 'failed', error: 'template_not_found', updatedAt: Timestamp.now() }, { merge: true });
      return false;
    }

    const selectedEmail = event.recipientRole === 'billing_owner' ? storeInfo.billingEmail || storeInfo.email : storeInfo.email;
    const channelPlan = planNotificationOsChannels({
      allowedChannels: registryEntry.defaultChannels,
      requestedChannels: event.requestedChannels,
      mode: event.priority === 'critical' ? 'all_eligible_critical' : storeInfo.channelMode,
      preferredChannels: storeInfo.preferredChannels,
      email: selectedEmail,
      emailVerified: storeInfo.emailVerified,
      emailInternalIdentity: storeInfo.emailInternalIdentity,
      whatsappNumber: storeInfo.whatsappNumber,
      phoneVerified: storeInfo.phoneVerified,
      whatsappConsentGranted: storeInfo.whatsappConsent,
      requiresWhatsAppConsent: registryEntry.requiresWhatsAppConsent,
      enabledChannels: {
        email: FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL,
        whatsapp: FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP,
      },
    }).filter((item) => item.reason !== 'not_requested' && item.reason !== 'channel_disabled');
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const planItem of channelPlan) {
      const channel = planItem.channel;
      const recipientValue = channel === 'email' ? selectedEmail : storeInfo.whatsappNumber;
      const persistedRecipientValue = recipientValue
        || (channel === 'email' ? 'missing@email' : 'missing-phone');
      const deliveryClaim = await claimDelivery({
        event,
        eventId,
        channel,
        recipientRole: event.recipientRole,
        recipientValue: persistedRecipientValue,
        subject: template.subject,
        templateKey: registryEntry.templateKey,
        templateVersion: '2026-06-02',
      });

      if (deliveryClaim.decision === 'terminal') {
        if (deliveryClaim.existingStatus === 'sent') sent++;
        else if (deliveryClaim.existingStatus === 'failed') failed++;
        else skipped++;
        continue;
      }
      if (deliveryClaim.decision !== 'claimed') {
        failed++;
        continue;
      }

      if (!planItem.eligible) {
        skipped++;
        await finalizeDelivery({
          event,
          eventId,
          channel,
          recipientValue: persistedRecipientValue,
          status: 'skipped',
          error: planItem.reason,
        });
        continue;
      }

      if (!recipientValue) throw new Error('owner_notification_planned_recipient_missing');

      const recipientHash = sha256(recipientValue.toLowerCase());
      const allowed = event.priority === 'critical'
        ? true
        : await incrementRateLimit(event, channel, recipientHash);

      if (!allowed) {
        skipped++;
        await finalizeDelivery({
          event,
          eventId,
          channel,
          recipientValue,
          status: 'rate_limited',
          error: 'rate_limited',
        });
        continue;
      }

      const result = channel === 'email'
          ? await sendEmailViaSMTP({
              to: recipientValue,
              subject: template.subject,
              html: template.html,
              eventType: String(event.triggerType),
              referenceId: eventId,
            })
        : await sendWhatsApp({
              eventId,
              deliveryId: safeId(`${eventId}|${channel}|${sha256(recipientValue.toLowerCase())}`),
              consentGranted: storeInfo.whatsappConsent,
          to: recipientValue,
          text: htmlToPlainText(template.html, template.subject),
              messageClass: event.priority === 'critical' ? 'transactional' : 'operational',
              templateKey: registryEntry.templateKey,
          metadata: event.metadata,
        });

      if (result.success) sent++;
      else failed++;

      if ('ambiguous' in result && result.ambiguous === true) {
        // Preserve `sending` so retry logic classifies the provider outcome as
        // ambiguous and never sends the same message twice.
        continue;
      }

      await finalizeDelivery({
        event,
        eventId,
        channel,
        recipientValue,
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.providerMessageId,
        error: result.error,
      });
    }

    const status: EventStatus = sent > 0 && failed === 0
      ? 'delivered'
      : sent > 0
        ? 'partial'
        : failed > 0
          ? 'failed'
          : 'skipped';

    await eventRef.set({
      status,
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      error: failed > 0 ? 'one_or_more_channels_failed' : null,
    }, { merge: true });

    if (failed > 0) {
      await createAlert({
        tId: event.tenantId,
        sId: event.storeId,
        type: 'error',
        severity: event.priority === 'critical' ? 'critical' : 'warning',
        title: 'Owner Notification Failure',
        message: `Owner notification ${event.triggerType} failed for ${failed} channel(s). Status: ${status}.`,
        metadata: {
          ownerNotificationEventId: eventId,
          ownerTriggerType: event.triggerType,
          requestedChannels: event.requestedChannels,
          failedChannels: failed,
        },
        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.OWNER_NOTIFICATION_FAILURE,
        productId: 'PLATFORM',
        category: 'owner_notifications',
        actionRequired: event.priority === 'critical',
      }).catch((alertError) => {
        logger.error('[OwnerNotifications] Failed to create platform alert', {
          failureCode: OWNER_NOTIFICATION_ALERT_CREATE_FAILED,
          ...getOwnerNotificationEventLogContext(eventId),
          ...getOwnerNotificationErrorContext(alertError),
        });
      });
    }

    return sent > 0;
  } catch (error) {
    logger.error('[OwnerNotifications] Processing failed', {
      failureCode: OWNER_NOTIFICATION_PROCESSING_FAILED,
      ...getOwnerNotificationEventLogContext(eventId),
      ...getOwnerNotificationErrorContext(error),
    });
    await eventRef.set({
      status: 'failed',
      error: OWNER_NOTIFICATION_PROCESSING_FAILED,
      processedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return false;
  }
}

async function markStaleOwnerNotificationProcessingEvents(
  now = Timestamp.now(),
): Promise<number> {
  const staleBefore = Timestamp.fromMillis(now.toMillis() - OWNER_NOTIFICATION_PROCESSING_LEASE_MS);
  const snapshot = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)
    .where('productId', '==', 'ML')
    .where('status', '==', 'processing')
    .where('processingStartedAt', '<=', staleBefore)
    .orderBy('processingStartedAt', 'asc')
    .limit(20)
    .get();

  let ambiguous = 0;
  for (const document of snapshot.docs) {
    const marked = await db.runTransaction(async (tx) => {
      const currentSnapshot = await tx.get(document.ref);
      const event = currentSnapshot.exists
        ? projectOwnerNotificationPersistedEvent(currentSnapshot.data(), 'ML')
        : null;
      const registryEntry = event
        ? getOwnerNotificationRegistryEntry('ML', event.triggerType)
        : null;
      if (
        !event
        || event.productId !== 'ML'
        || !event.storeId
        || safeId(event.dedupeKey) !== document.id
        || !registryEntry
        || event.priority !== registryEntry.priority
        || event.status !== 'processing'
        || !event.processingStartedAt
        || event.processingStartedAt.toMillis() > staleBefore.toMillis()
      ) return false;

      tx.set(document.ref, {
        status: 'failed',
        error: OWNER_NOTIFICATION_PROCESSING_OUTCOME_AMBIGUOUS,
        processingAttempt: MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS,
        retryCount: 1,
        processedAt: now,
        updatedAt: now,
      }, { merge: true });
      return true;
    });
    if (marked) ambiguous++;
  }
  if (ambiguous > 0) {
    logger.error('[OwnerNotifications] Stale processing outcomes require manual reconciliation', {
      failureCode: OWNER_NOTIFICATION_PROCESSING_OUTCOME_AMBIGUOUS,
      ambiguousCount: ambiguous,
    });
  }
  return ambiguous;
}

async function recordOwnerNotificationRetryAttempt(
  eventRef: FirebaseFirestore.DocumentReference,
  eventId: string,
  retriedAt: Timestamp,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(eventRef);
    const event = snapshot.exists
      ? projectOwnerNotificationPersistedEvent(snapshot.data(), 'ML')
      : null;
    const registryEntry = event
      ? getOwnerNotificationRegistryEntry('ML', event.triggerType)
      : null;
    if (
      !event
      || !event.storeId
      || safeId(event.dedupeKey) !== eventId
      || !registryEntry
      || event.priority !== registryEntry.priority
      || event.processingAttempt !== MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
      || event.status === 'pending'
      || event.status === 'processing'
      || event.retryCount === 1
    ) return false;

    tx.set(eventRef, {
      retryCount: 1,
      retriedAt,
    }, { merge: true });
    return true;
  });
}

export async function retryFailedOwnerNotifications(): Promise<{
  retried: number;
  succeeded: number;
  ambiguous: number;
}> {
  const ambiguous = await markStaleOwnerNotificationProcessingEvents();
  let retried = 0;
  let succeeded = 0;
  const yesterdayMs = Date.now() - 24 * 60 * 60 * 1000;
  const snapshot = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)
    .where('productId', '==', 'ML')
    .where('status', '==', 'failed')
    .where('updatedAt', '>=', Timestamp.fromMillis(yesterdayMs))
    .orderBy('updatedAt', 'asc')
    .limit(20)
    .get();

  for (const doc of snapshot.docs) {
    const event = projectOwnerNotificationPersistedEvent(doc.data(), 'ML');
    const registryEntry = event
      ? getOwnerNotificationRegistryEntry('ML', event.triggerType)
      : null;
    if (
      !event
      || !event.storeId
      || event.status !== 'failed'
      || safeId(event.dedupeKey) !== doc.id
      || !registryEntry
      || event.priority !== registryEntry.priority
      || event.retryCount === 1
    ) continue;

    const ok = await processOwnerNotificationEvent(doc.id);
    const recorded = await recordOwnerNotificationRetryAttempt(doc.ref, doc.id, Timestamp.now());
    if (!recorded) continue;
    retried++;
    if (ok) succeeded++;
  }

  return { retried, succeeded, ambiguous };
}

export async function getOwnerNotificationDigest(): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  const yesterdayMs = Date.now() - 24 * 60 * 60 * 1000;
  const sentSnap = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .where('productId', '==', 'ML')
    .where('status', '==', 'sent')
    .where('createdAt', '>=', Timestamp.fromMillis(yesterdayMs))
    .count()
    .get();
  const failedSnap = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .where('productId', '==', 'ML')
    .where('status', '==', 'failed')
    .where('createdAt', '>=', Timestamp.fromMillis(yesterdayMs))
    .count()
    .get();

  const sent = sentSnap.data().count;
  const failed = failedSnap.data().count;
  return { sent, failed, total: sent + failed };
}
