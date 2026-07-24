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
  getNextOwnerNotificationProcessingAttempt,
  hasOwnerNotificationWhatsAppConsent,
  isOwnerNotificationEventWithinByteLimit,
  normalizeOwnerNotificationNumericScopeDocumentId,
  normalizeOwnerNotificationReferenceId,
} from '../sharedData/ownerNotificationDeliveryBoundary';
import { sendEmailViaSMTP } from '../messaging/providers/resend';
import { resolveTemplate } from '../messaging/templates';
import { SendMessagePayload } from '../messaging/types';
import { readJsonResponseWithLimit } from '../utils/boundedResponseBody';
import { buildWhatsAppPhoneParam } from '../utils/phoneNumber';
import { sanitizeForFirestore as sanitizeFirestoreValue } from '../lib/sanitizeForFirestore';

const logger = functions.logger;
const MAX_PER_RECIPIENT_PER_DAY = 20;
const MAX_PER_STORE_PER_DAY = 10;
const FLAG_CACHE_TTL = 60_000;
const GRAPH_API_VERSION = 'v21.0';
const DAY_MS = 24 * 60 * 60 * 1000;
const OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED = 'whatsapp_send_failed';
const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED = 'whatsapp_response_parse_failed';
const OWNER_NOTIFICATION_PROCESSING_FAILED = 'owner_notification_processing_failed';
const OWNER_NOTIFICATION_ALERT_CREATE_FAILED = 'owner_notification_alert_create_failed';
const OWNER_NOTIFICATION_LIFECYCLE_FLAG_CHECK_FAILED = 'owner_notification_lifecycle_flag_check_failed';
const OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER = 'owner_notification_unknown_menulist_trigger';
const MAX_OWNER_NOTIFICATION_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH = 200;
const OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const OWNER_NOTIFICATION_PROVIDER_TIMEOUT_MS = 15_000;
const OWNER_NOTIFICATION_EVENT_TOO_LARGE = 'owner_notification_event_too_large';

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
    runtime: 'functions';
    path: string;
  };
  createdAt: Timestamp;
  expiresAt: Timestamp;
  updatedAt: Timestamp;
  processingAttempt?: number;
};

type StoreInfo = {
  email?: string;
  billingEmail?: string;
  storeName: string;
  whatsappNumber?: string;
  whatsappConsent: boolean;
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
  const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
  const statusValue = sourceError?.status ?? sourceError?.statusCode;
  const status = Number(statusValue);
  return {
    sourceErrorName: error instanceof Error ? error.name || 'Error' : typeof error,
    sourceErrorCode: sourceError?.code === undefined || sourceError?.code === null ? undefined : String(sourceError.code).slice(0, 64),
    sourceStatusCode: Number.isFinite(status) ? status : undefined,
  };
}

function getOwnerNotificationWhatsAppProviderMessageId(value: unknown): string | undefined {
  const providerMessageId = (value as { messages?: Array<{ id?: unknown }> })?.messages?.[0]?.id;
  if (typeof providerMessageId !== 'string') return undefined;
  const normalized = providerMessageId.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_OWNER_NOTIFICATION_WHATSAPP_PROVIDER_MESSAGE_ID_LENGTH);
}

async function readOwnerNotificationWhatsAppResponseJson(response: Response): Promise<unknown | null> {
  try {
    return await readJsonResponseWithLimit(response, OWNER_NOTIFICATION_WHATSAPP_RESPONSE_JSON_MAX_BYTES);
  } catch (error) {
    logger.warn('[OwnerNotifications] WhatsApp response parse failed', {
      failureCode: OWNER_NOTIFICATION_WHATSAPP_RESPONSE_PARSE_FAILED,
      responseStatus: response.status,
      ...getOwnerNotificationErrorContext(error),
    });
    return null;
  }
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
  const storedTenantScope = normalizeOwnerNotificationNumericScopeDocumentId(data.tenantId ?? data.tId);
  if (
    (storedTenantScope && storedTenantScope.numericId !== tenantScope.numericId)
    || (!storedTenantScope && !usedTenantScopedFallback)
  ) return null;

  const settings = data.notificationSettings || {};
  const primaryEmail = settings.primaryEmail || data.contactPersonEmail || data.email;
  const phoneContext = {
    countryCode: data.countryCode || settings.countryCode,
    dialCode: data.dialCode || settings.dialCode,
    phone: data.phone,
    phoneNumber: data.phoneNumber,
  };

  return {
    email: isValidEmail(primaryEmail) ? primaryEmail.trim() : undefined,
    billingEmail: isValidEmail(settings.billingEmail) ? settings.billingEmail.trim() : undefined,
    storeName: event.recipientHints?.name || data.name || data.businessName || 'Your Business',
    whatsappNumber: resolveFirstPhone(
      phoneContext,
      settings.whatsappNumber,
      data.ownerWhatsappNumber,
      data.whatsappNumber,
      data.phone,
      data.phoneNumber,
    ),
    whatsappConsent: hasOwnerNotificationWhatsAppConsent(settings),
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

function resolveChannels(
  registryChannels: OwnerNotificationChannel[],
  requested?: OwnerNotificationChannel[],
): OwnerNotificationChannel[] {
  const channels = requested?.length
    ? registryChannels.filter((channel) => requested.includes(channel))
    : registryChannels;

  return channels.filter((channel) => {
    if (channel === 'email') return FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_EMAIL;
    if (channel === 'whatsapp') return FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_WHATSAPP;
    return false;
  });
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
    if (Number(recipientSnap.data()?.count || 0) >= MAX_PER_RECIPIENT_PER_DAY) return false;
    if (Number(storeSnap.data()?.count || 0) >= MAX_PER_STORE_PER_DAY) return false;

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

async function writeDelivery(params: {
  event: OwnerNotificationEventDoc;
  eventId: string;
  channel: OwnerNotificationChannel;
  recipientRole: string;
  recipientValue: string;
  status: 'sent' | 'failed' | 'skipped' | 'rate_limited';
  subject?: string;
  templateKey: string;
  templateVersion: string;
  providerMessageId?: string;
  error?: string;
}): Promise<void> {
  const recipientHash = sha256(params.recipientValue.toLowerCase());
  const attemptedAt = Timestamp.now();
  const deliveryRef = db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .doc(safeId(`${params.eventId}|${params.channel}|${recipientHash}`));
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(deliveryRef);
    const createdAt = existing.data()?.createdAt || attemptedAt;
    tx.set(deliveryRef, sanitizeForFirestore({
      eventId: params.eventId,
      productId: 'ML',
      triggerType: params.event.triggerType,
      channel: params.channel,
      recipientRole: params.recipientRole,
      recipientHash,
      recipientMasked: params.channel === 'email' ? maskEmail(params.recipientValue) : maskPhone(params.recipientValue),
      status: params.status,
      subject: params.subject || null,
      templateKey: params.templateKey,
      templateVersion: params.templateVersion,
      providerMessageId: params.providerMessageId || null,
      error: params.error || null,
      expiresAt: getRetentionExpiry(FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS),
      attempt: params.event.processingAttempt || 1,
      createdAt,
      lastAttemptAt: attemptedAt,
      sentAt: params.status === 'sent' ? attemptedAt : null,
    }), { merge: true });
  });
}

async function sendWhatsApp(params: {
  to: string;
  text: string;
  metadata: Record<string, any>;
}): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return { success: false, error: 'whatsapp_not_configured' };
  const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);

  const to = buildWhatsAppPhoneParam({ phoneNumber: params.to });
  if (to.length < 10 || to.length > 15) return { success: false, error: 'whatsapp_recipient_missing' };

  const templateName = typeof params.metadata.whatsappTemplateName === 'string'
    ? params.metadata.whatsappTemplateName
    : undefined;
  const templateLanguage = typeof params.metadata.whatsappTemplateLanguage === 'string'
    ? params.metadata.whatsappTemplateLanguage
    : 'en';
  const templateParameters = Array.isArray(params.metadata.whatsappTemplateParameters)
    ? params.metadata.whatsappTemplateParameters.map(String)
    : undefined;
  const sessionActive = params.metadata.whatsappSessionActive === true;

  const body = templateName
    ? {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        ...(templateParameters?.length
          ? {
            components: [{
              type: 'body',
              parameters: templateParameters.map((text) => ({ type: 'text', text })),
            }],
          }
          : {}),
      },
    }
    : sessionActive
      ? {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: params.text },
      }
      : null;

  if (!body) return { success: false, error: 'whatsapp_template_or_session_required' };

  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodedPhoneNumberId}/messages`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OWNER_NOTIFICATION_PROVIDER_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn('[OwnerNotifications] WhatsApp delivery failed', {
        failureCode: OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED,
        responseStatus: response.status,
        providerResponseBodySkipped: true,
      });
      return { success: false, error: OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED };
    }

    const parsed = await readOwnerNotificationWhatsAppResponseJson(response);
    const providerMessageId = getOwnerNotificationWhatsAppProviderMessageId(parsed);
    return { success: true, providerMessageId };
  } catch (error) {
    logger.warn('[OwnerNotifications] WhatsApp delivery threw', {
      failureCode: OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED,
      ...getOwnerNotificationErrorContext(error),
    });
    return { success: false, error: OWNER_NOTIFICATION_WHATSAPP_SEND_FAILED };
  }
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

    const event = snapshot.data() as OwnerNotificationEventDoc;
    if (event.productId !== 'ML') return null;
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

  const normalizedPayload: SendMessagePayload = {
    ...payload,
    tenantId: tenantScope.documentId,
    storeId: storeScope.documentId,
    referenceId,
  };

  const registryEntry = getOwnerNotificationRegistryEntry('ML', normalizedPayload.eventType);
  if (!registryEntry) {
    logger.warn('[OwnerNotifications] Unknown MenuList trigger skipped', {
      failureCode: OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER,
      fallbackPolicy: 'skip_owner_notification_without_registry_entry',
      ...getOwnerNotificationTriggerLogContext(normalizedPayload.eventType),
    });
    return false;
  }

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
    await eventRef.set({ status: 'skipped', error: 'unknown_trigger', updatedAt: Timestamp.now() }, { merge: true });
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

    const channels = resolveChannels(registryEntry.defaultChannels, event.requestedChannels);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const channel of channels) {
      const recipientValue = channel === 'email'
        ? (event.recipientRole === 'billing_owner' ? storeInfo.billingEmail || storeInfo.email : storeInfo.email)
        : storeInfo.whatsappNumber;

      if (!recipientValue) {
        skipped++;
        await writeDelivery({
          event,
          eventId,
          channel,
          recipientRole: event.recipientRole,
          recipientValue: channel === 'email' ? 'missing@email' : 'missing-phone',
          status: 'skipped',
          subject: template.subject,
          templateKey: registryEntry.templateKey,
          templateVersion: '2026-06-02',
          error: 'recipient_missing',
        });
        continue;
      }

      if (channel === 'whatsapp' && registryEntry.requiresWhatsAppConsent && !storeInfo.whatsappConsent) {
        skipped++;
        await writeDelivery({
          event,
          eventId,
          channel,
          recipientRole: event.recipientRole,
          recipientValue,
          status: 'skipped',
          subject: template.subject,
          templateKey: registryEntry.templateKey,
          templateVersion: '2026-06-02',
          error: 'whatsapp_consent_missing',
        });
        continue;
      }

      const recipientHash = sha256(recipientValue.toLowerCase());
      const allowed = event.priority === 'critical'
        ? true
        : await incrementRateLimit(event, channel, recipientHash);

      if (!allowed) {
        skipped++;
        await writeDelivery({
          event,
          eventId,
          channel,
          recipientRole: event.recipientRole,
          recipientValue,
          status: 'rate_limited',
          subject: template.subject,
          templateKey: registryEntry.templateKey,
          templateVersion: '2026-06-02',
          error: 'rate_limited',
        });
        continue;
      }

      const result = channel === 'email'
        ? await sendEmailViaSMTP({ to: recipientValue, subject: template.subject, html: template.html })
        : await sendWhatsApp({
          to: recipientValue,
          text: htmlToPlainText(template.html, template.subject),
          metadata: event.metadata,
        });

      if (result.success) sent++;
      else failed++;

      await writeDelivery({
        event,
        eventId,
        channel,
        recipientRole: event.recipientRole,
        recipientValue,
        status: result.success ? 'sent' : 'failed',
        subject: template.subject,
        templateKey: registryEntry.templateKey,
        templateVersion: '2026-06-02',
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

export async function retryFailedOwnerNotifications(): Promise<{ retried: number; succeeded: number }> {
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
    const data = doc.data();
    if (data.retryCount && data.retryCount >= 1) continue;
    retried++;
    const ok = await processOwnerNotificationEvent(doc.id);
    if (ok) succeeded++;
    await doc.ref.set({ retryCount: 1, retriedAt: Timestamp.now() }, { merge: true });
  }

  return { retried, succeeded };
}

export async function getOwnerNotificationDigest(): Promise<{ sent: number; failed: number; total: number }> {
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
