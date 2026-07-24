export const dynamic = 'force-dynamic';

/**
 * Platform-only owner notification tracking and recovery API.
 *
 * Cost model:
 * - GET list uses one current-user authorization read plus one bounded event query.
 * - GET detail adds one direct event read, one newest-first bounded deliveries query,
 *   and zero, one, or two scope reads.
 * - No realtime listeners are used. Delivery detail requires the documented
 *   eventId ASC / createdAt DESC composite index in each product project.
 */

import { PRODUCT_IDS } from '@constant/product';
import { FEATURE_FLAGS } from '@config/features';
import {
  getOwnerNotificationRegistryEntry,
  OWNER_NOTIFICATION_COLLECTIONS,
  type OwnerNotificationChannel,
  type OwnerNotificationProductId,
  type OwnerNotificationRecipientRole,
} from '@data/shared/ownerNotificationRegistry';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import {
  answerlatticeAdminApp,
  answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { sanitizeForFirestore as sanitizeFirestoreValue } from '@lib/firestore/sanitizeForFirestore';
import {
  enqueueOwnerNotification,
  processOwnerNotificationEvent,
} from '@lib/owner-notifications';
import {
  buildFormattedNotificationMetadata,
  resolveOwnerNotificationFormattingContext,
} from '@lib/owner-notifications/formatters';
import {
  normalizeMenuListOwnerNotificationScopeDocumentId,
  normalizeOwnerNotificationRecipientDocumentId,
  resolveOwnerNotificationRecipient,
  resolveOwnerNotificationScope,
} from '@lib/owner-notifications/recipientResolver';
import { renderOwnerNotificationTemplate } from '@lib/owner-notifications/templates';
import type {
  OwnerNotificationDeliveryStatus,
  OwnerNotificationEventDoc,
  OwnerNotificationEventStatus,
} from '@lib/owner-notifications/types';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import type {
  OwnerNotificationOpsActionResult,
  OwnerNotificationOpsCost,
  OwnerNotificationOpsDeliveryRow,
  OwnerNotificationOpsEventRow,
  OwnerNotificationOpsManualTemplate,
  OwnerNotificationOpsRecipient,
  OwnerNotificationOpsRecipientRole,
  OwnerNotificationOpsSnapshot,
  OwnerNotificationOpsStatusFilter,
} from '@lib/ops/ownerNotificationTypes';
import { buildOwnerNotificationWindow } from '@lib/ops/notificationOpsSnapshotBoundary';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const EVENT_STATUSES: OwnerNotificationEventStatus[] = [
  'pending',
  'processing',
  'delivered',
  'partial',
  'failed',
  'skipped',
];
const DELIVERY_STATUSES: OwnerNotificationDeliveryStatus[] = ['sent', 'failed', 'skipped', 'rate_limited'];
const RECIPIENT_ROLES: OwnerNotificationRecipientRole[] = [
  'primary_owner',
  'billing_owner',
  'support_owner',
  'whatsapp_owner',
];

const PRODUCT_IDS_FOR_OPS: OwnerNotificationProductId[] = [
  PRODUCT_IDS.MENULIST,
  PRODUCT_IDS.ANSWERLATTICE,
] as OwnerNotificationProductId[];

const STATUS_FILTERS: OwnerNotificationOpsStatusFilter[] = ['all', ...EVENT_STATUSES, 'invalid'];
const DELIVERY_DETAIL_LIMIT = 12;
const OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES = 8 * 1024;
const SAFE_METADATA_PREVIEW_KEYS = new Set([
  'amount',
  'currency',
  'currencySymbol',
  'planName',
]);
const BOUNDED_METADATA_PREVIEW_KEYS = new Set([
  'error',
  'projectId',
  'reason',
  'storeName',
  'subscriptionId',
  'workspaceName',
]);

const OwnerNotificationEventIdSchema = z.string()
  .trim()
  .min(8)
  .max(120)
  .refine(isValidFirestoreDocumentId, 'Invalid event ID');

const OwnerNotificationActionIdSchema = z.string()
  .trim()
  .min(8)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid action ID');

function normalizeOwnerNotificationEventId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const eventId = value.trim();
  if (eventId.length < 8 || eventId.length > 120) return null;
  return isValidFirestoreDocumentId(eventId) ? eventId : null;
}

function requireOwnerNotificationEventId(value: unknown): string {
  const eventId = normalizeOwnerNotificationEventId(value);
  if (!eventId) {
    throw new Error('Invalid owner notification event ID');
  }
  return eventId;
}

const GetQuerySchema = z.object({
  productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]).default(PRODUCT_IDS.MENULIST),
  status: z.enum(STATUS_FILTERS as [OwnerNotificationOpsStatusFilter, ...OwnerNotificationOpsStatusFilter[]]).default('failed'),
  limit: z.coerce.number().int().min(5).max(50).default(30),
  eventId: OwnerNotificationEventIdSchema.optional(),
});

const PostActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('retry'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: OwnerNotificationEventIdSchema,
  }),
  z.object({
    action: z.literal('manualSend'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: OwnerNotificationEventIdSchema,
    channel: z.enum(['email', 'whatsapp']),
    destination: z.string().trim().min(3).max(254),
    reason: z.string().trim().max(400).optional(),
    actionId: OwnerNotificationActionIdSchema,
  }),
  z.object({
    action: z.literal('manualHandoff'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: OwnerNotificationEventIdSchema,
    channel: z.enum(['email', 'whatsapp']),
    destination: z.string().trim().min(3).max(254).optional(),
    note: z.string().trim().max(600).optional(),
    actionId: OwnerNotificationActionIdSchema,
  }),
]);

function getDbForProduct(productId: OwnerNotificationProductId): Firestore | null {
  if (productId === PRODUCT_IDS.ANSWERLATTICE) {
    return answerlatticeAdminApp ? answerlatticeFirestoreAdmin : null;
  }
  return firestoreAdmin;
}

function normalizeOpsRecipientRole(value: unknown): OwnerNotificationOpsRecipientRole {
  return RECIPIENT_ROLES.includes(value as OwnerNotificationRecipientRole)
    ? value as OwnerNotificationRecipientRole
    : 'invalid';
}

function normalizeActionRecipientRole(
  value: unknown,
  productId: OwnerNotificationProductId,
  triggerType: unknown,
): OwnerNotificationRecipientRole {
  if (RECIPIENT_ROLES.includes(value as OwnerNotificationRecipientRole)) {
    return value as OwnerNotificationRecipientRole;
  }
  const registryEntry = typeof triggerType === 'string'
    ? getOwnerNotificationRegistryEntry(productId, triggerType)
    : undefined;
  return registryEntry?.recipientRole || 'primary_owner';
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

type ManualSendSourceEvent = Pick<
  OwnerNotificationEventDoc,
  'productId' | 'triggerType' | 'tenantId' | 'storeId' | 'workspaceId' | 'recipientRole' | 'metadata'
>;

function normalizeManualSendSourceEvent(
  value: unknown,
  productId: OwnerNotificationProductId,
): ManualSendSourceEvent | null {
  if (!isUnknownRecord(value) || value.productId !== productId) return null;
  const triggerType = typeof value.triggerType === 'string' ? value.triggerType.trim() : '';
  if (!triggerType || !getOwnerNotificationRegistryEntry(productId, triggerType)) return null;

  if (productId === PRODUCT_IDS.MENULIST) {
    const tenantScope = normalizeMenuListOwnerNotificationScopeDocumentId(value.tenantId);
    const storeScope = normalizeMenuListOwnerNotificationScopeDocumentId(value.storeId);
    if (!tenantScope || !storeScope) return null;
    return {
      productId,
      triggerType,
      tenantId: tenantScope.documentId,
      storeId: storeScope.documentId,
      recipientRole: normalizeActionRecipientRole(value.recipientRole, productId, triggerType),
      metadata: isUnknownRecord(value.metadata) ? value.metadata : {},
    };
  }

  const tenantId = normalizeOwnerNotificationRecipientDocumentId(value.tenantId);
  const workspaceId = normalizeOwnerNotificationRecipientDocumentId(value.workspaceId ?? value.storeId);
  if (!tenantId || !workspaceId) return null;
  return {
    productId,
    triggerType,
    tenantId,
    workspaceId,
    recipientRole: normalizeActionRecipientRole(value.recipientRole, productId, triggerType),
    metadata: isUnknownRecord(value.metadata) ? value.metadata : {},
  };
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function safeId(input: string): string {
  return sha256(input).slice(0, 40);
}

function toIso(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

function millis(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}

function maskDestination(channel: OwnerNotificationChannel, destination: string): string {
  return channel === 'email' ? maskEmail(destination) : maskPhone(destination);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string): boolean {
  const phone = buildWhatsAppPhoneParam({ phoneNumber: value });
  return phone.length >= 10 && phone.length <= 15;
}

function sanitizeForFirestore(value: any): any {
  return sanitizeFirestoreValue(value, {
    dateTransform: (date) => date.toISOString(),
    undefinedObjectValue: 'omit',
  });
}

function normalizeDestinationForAudit(channel: OwnerNotificationChannel, destination: string): string {
  if (channel === 'email') return destination.trim().toLowerCase();
  return buildWhatsAppPhoneParam({ phoneNumber: destination }) || destination.trim();
}

function cleanOpsText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getOwnerNotificationStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = cleanOpsText(value, 1000);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getOwnerNotificationStoredTextSummary(label: string, value: unknown): string | null {
  const normalized = cleanOpsText(value, 1000);
  return normalized
    ? `${label} present (${normalized.length} chars).`
    : null;
}

function getOwnerNotificationErrorSummary(value: unknown): string | null {
  const normalized = cleanOpsText(value, 1000);
  if (!normalized) return null;
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(normalized)
    ? normalized
    : `Stored error present (${normalized.length} chars).`;
}

function sanitizeMetadataPreview(metadata: any): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== 'object') return {};

  return Object.keys(metadata).reduce<Record<string, string | number | boolean | null>>((acc, key) => {
    const value = metadata[key];
    if (BOUNDED_METADATA_PREVIEW_KEYS.has(key)) {
      Object.assign(acc, getOwnerNotificationStringContext(key, value));
      return acc;
    }
    if (!SAFE_METADATA_PREVIEW_KEYS.has(key)) return acc;

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      acc[key] = typeof value === 'string' ? cleanOpsText(value, 160) : value;
    }
    return acc;
  }, {});
}

function normalizeChannels(value: any): OwnerNotificationChannel[] {
  if (!Array.isArray(value)) return [];
  return value.filter((channel): channel is OwnerNotificationChannel => channel === 'email' || channel === 'whatsapp');
}

function serializeEventDoc(
  doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot,
  expectedProductId: OwnerNotificationProductId,
): OwnerNotificationOpsEventRow | null {
  const data = doc.data() || {};
  if (data.productId !== expectedProductId) return null;
  return {
    id: doc.id,
    productId: expectedProductId,
    triggerType: cleanOpsText(data.triggerType || 'UNKNOWN', 120),
    tenantId: cleanOpsText(data.tenantId || '-', 120),
    storeId: data.storeId ? cleanOpsText(data.storeId, 120) : undefined,
    workspaceId: data.workspaceId ? cleanOpsText(data.workspaceId, 120) : undefined,
    referenceId: cleanOpsText(data.referenceId || '-', 240),
    recipientRole: normalizeOpsRecipientRole(data.recipientRole),
    requestedChannels: normalizeChannels(data.requestedChannels),
    priority: cleanOpsText(data.priority || '-', 40),
    status: EVENT_STATUSES.includes(data.status) ? data.status : 'invalid',
    sourcePath: cleanOpsText(data.source?.path || data.sourcePath || '-', 200),
    error: getOwnerNotificationErrorSummary(data.error),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    processedAt: toIso(data.processedAt),
    manualHandoffAt: toIso(data.manualHandoffAt),
    manualHandoffChannel: data.manualHandoffChannel === 'email' || data.manualHandoffChannel === 'whatsapp'
      ? data.manualHandoffChannel
      : null,
    metadataPreview: sanitizeMetadataPreview(data.metadata),
  };
}

function serializeDeliveryDoc(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  expectedProductId: OwnerNotificationProductId,
): OwnerNotificationOpsDeliveryRow | null {
  const data = doc.data() || {};
  if (data.productId !== expectedProductId) return null;
  const status = DELIVERY_STATUSES.includes(data.status) ? data.status : 'invalid';
  const attempt = Number(data.attempt);
  return {
    id: doc.id,
    eventId: String(data.eventId || '-'),
    productId: expectedProductId,
    triggerType: cleanOpsText(data.triggerType || '-', 120),
    channel: data.channel === 'email' || data.channel === 'whatsapp' ? data.channel : 'invalid',
    recipientRole: normalizeOpsRecipientRole(data.recipientRole),
    recipientMasked: cleanOpsText(data.recipientMasked || '***', 120),
    status,
    subject: getOwnerNotificationStoredTextSummary('Subject', data.subject),
    templateKey: cleanOpsText(data.templateKey || '-', 120),
    templateVersion: cleanOpsText(data.templateVersion || '-', 80),
    providerMessageId: getOwnerNotificationStoredTextSummary('Provider message id', data.providerMessageId),
    error: getOwnerNotificationErrorSummary(data.error),
    attempt: Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1,
    createdAt: toIso(data.createdAt),
    sentAt: toIso(data.sentAt),
    deliveryMode: data.deliveryMode === 'manual_handoff' ? 'manual_handoff' : 'system',
  };
}

function buildManualTemplate(
  event: OwnerNotificationEventDoc,
  scope: Awaited<ReturnType<typeof resolveOwnerNotificationScope>>,
  recipient?: OwnerNotificationOpsRecipient,
): OwnerNotificationOpsManualTemplate | undefined {
  const registryEntry = getOwnerNotificationRegistryEntry(event.productId, event.triggerType);
  if (!registryEntry) return undefined;

  const dataForContext = event.productId === PRODUCT_IDS.ANSWERLATTICE
    ? scope.workspaceData
    : scope.storeData;
  const context = resolveOwnerNotificationFormattingContext(dataForContext, {
    currencyCode: typeof event.metadata.currency === 'string' ? event.metadata.currency : undefined,
    currencySymbol: typeof event.metadata.currencySymbol === 'string' ? event.metadata.currencySymbol : undefined,
  });
  const metadata = buildFormattedNotificationMetadata({
    ...event.metadata,
    storeName: event.metadata.storeName || dataForContext?.name || dataForContext?.businessName || recipient?.name,
    productName: event.metadata.productName || dataForContext?.productName || dataForContext?.name,
    workspaceName: event.metadata.workspaceName || dataForContext?.companyName || dataForContext?.businessName,
    recipientName: event.metadata.recipientName || recipient?.name,
    supportEmail: event.metadata.supportEmail || dataForContext?.supportEmail,
  }, context);
  const template = renderOwnerNotificationTemplate(event.productId, registryEntry.templateKey, metadata);

  return template
    ? {
      subject: template.subject,
      text: template.text,
      templateKey: template.templateKey,
      templateVersion: template.templateVersion,
    }
    : undefined;
}

async function getRecentEventRows(params: {
  db: Firestore;
  productId: OwnerNotificationProductId;
  scanLimit: number;
  cost: OwnerNotificationOpsCost;
}): Promise<OwnerNotificationOpsEventRow[]> {
  const snapshot = await params.db
    .collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)
    .where('productId', '==', params.productId)
    .orderBy('updatedAt', 'desc')
    .limit(params.scanLimit)
    .get();
  params.cost.eventReads += snapshot.docs.length;

  return snapshot.docs
    .map((doc) => serializeEventDoc(doc, params.productId))
    .filter((row): row is OwnerNotificationOpsEventRow => Boolean(row));
}

async function getDetail(params: {
  db: Firestore;
  productId: OwnerNotificationProductId;
  eventId: string;
  cost: OwnerNotificationOpsCost;
}): Promise<{
  selectedEvent?: OwnerNotificationOpsEventRow;
  deliveries: OwnerNotificationOpsDeliveryRow[];
  resolvedRecipient?: OwnerNotificationOpsRecipient;
  manualTemplate?: OwnerNotificationOpsManualTemplate;
  detailError?: 'recipient_resolution_failed';
}> {
  const eventId = requireOwnerNotificationEventId(params.eventId);
  const eventSnap = await params.db
    .collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)
    .doc(eventId)
    .get();
  params.cost.eventReads += 1;

  if (!eventSnap.exists) {
    return { deliveries: [] };
  }

  const persistedEvent = eventSnap.data() as OwnerNotificationEventDoc;
  if (persistedEvent.productId !== params.productId) {
    return { deliveries: [] };
  }
  const rawEvent: OwnerNotificationEventDoc = {
    ...persistedEvent,
    recipientRole: normalizeActionRecipientRole(
      persistedEvent.recipientRole,
      params.productId,
      persistedEvent.triggerType,
    ),
  };

  const deliveriesSnap = await params.db
    .collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .where('productId', '==', params.productId)
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .limit(DELIVERY_DETAIL_LIMIT)
    .get();
  params.cost.deliveryReads += deliveriesSnap.docs.length;

  let resolvedRecipient: OwnerNotificationOpsRecipient | undefined;
  let manualTemplate: OwnerNotificationOpsManualTemplate | undefined;
  let detailError: 'recipient_resolution_failed' | undefined;
  try {
    const scope = await resolveOwnerNotificationScope(rawEvent, {
      onRead: () => {
        params.cost.scopeReads += 1;
      },
    });
    const recipient = resolveOwnerNotificationRecipient(rawEvent, scope);
    resolvedRecipient = {
      role: recipient.role,
      name: recipient.name ? cleanOpsText(recipient.name, 160) : undefined,
      email: recipient.email,
      whatsappNumber: recipient.whatsappNumber,
      whatsappConsent: recipient.whatsappConsent,
    };
    manualTemplate = buildManualTemplate(rawEvent, scope, resolvedRecipient);
  } catch (error) {
    detailError = 'recipient_resolution_failed';
    logOpsFailure('owner_notifications_recipient_resolution_failed', error, {
      ...getBoundedOpsStringContext('productId', rawEvent.productId),
      ...getBoundedOpsStringContext('eventId', eventId),
      ...getBoundedOpsStringContext('triggerType', rawEvent.triggerType),
      ...getBoundedOpsStringContext('storeId', rawEvent.storeId),
      ...getBoundedOpsStringContext('workspaceId', rawEvent.workspaceId),
    });
  }

  return {
    selectedEvent: serializeEventDoc(eventSnap, params.productId) || undefined,
    deliveries: deliveriesSnap.docs
      .map((doc) => serializeDeliveryDoc(doc, params.productId))
      .filter((row): row is OwnerNotificationOpsDeliveryRow => Boolean(row))
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt)),
    resolvedRecipient,
    manualTemplate,
    detailError,
  };
}

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

function getOperatorEmailMasked(value: unknown): string | null {
  const email = String(value || '').trim();
  return email && isEmail(email) ? maskEmail(email) : null;
}

function validateDestination(channel: OwnerNotificationChannel, destination: string): string | null {
  if (channel === 'email' && !isEmail(destination)) return 'Enter a valid email address';
  if (channel === 'whatsapp' && !isPhone(destination)) return 'Enter a valid WhatsApp number';
  return null;
}

async function loadRawEvent(
  db: Firestore,
  productId: OwnerNotificationProductId,
  eventId: string,
): Promise<ManualSendSourceEvent | null> {
  const normalizedEventId = requireOwnerNotificationEventId(eventId);
  const snap = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(normalizedEventId).get();
  if (!snap.exists) return null;
  return normalizeManualSendSourceEvent(snap.data(), productId);
}

async function runManualSend(params: {
  event: ManualSendSourceEvent;
  eventId: string;
  channel: OwnerNotificationChannel;
  destination: string;
  reason?: string;
  actionId: string;
}): Promise<OwnerNotificationOpsActionResult> {
  const eventId = requireOwnerNotificationEventId(params.eventId);
  const normalizedDestination = normalizeDestinationForAudit(params.channel, params.destination);
  const result = await enqueueOwnerNotification({
    productId: params.event.productId,
    triggerType: params.event.triggerType,
    tenantId: params.event.tenantId,
    ...(params.event.storeId ? { storeId: params.event.storeId } : {}),
    ...(params.event.workspaceId ? { workspaceId: params.event.workspaceId } : {}),
    referenceId: `manual-${eventId}-${params.actionId}`,
    recipientRole: normalizeActionRecipientRole(
      params.event.recipientRole,
      params.event.productId,
      params.event.triggerType,
    ),
    requestedChannels: [params.channel],
    recipientHints: params.channel === 'email'
      ? { email: normalizedDestination }
      : { whatsappNumber: normalizedDestination },
    metadata: sanitizeForFirestore({
      ...params.event.metadata,
      manualRecipientOverride: true,
      originalEventId: eventId,
      manualReason: params.reason || null,
      manualRequestedAt: new Date().toISOString(),
    }),
    source: {
      runtime: 'next',
      path: 'src/app/api/ops/owner-notifications/route.ts:manualSend',
    },
  }, { processImmediately: true, processExisting: false });

  return {
    ok: true,
    action: 'manualSend',
    eventId,
    manualEventId: 'eventId' in result ? result.eventId : undefined,
    status: result.status,
    sent: 'sent' in result ? result.sent : 0,
    failed: 'failed' in result ? result.failed : 0,
    skipped: 'skipped' in result ? result.skipped : 0,
    replayed: result.created === false,
    message: result.created === false
      ? `Manual ${params.channel} send was already processed`
      : `Manual ${params.channel} send was processed`,
  };
}

async function recordManualHandoff(params: {
  db: Firestore;
  productId: OwnerNotificationProductId;
  eventId: string;
  channel: OwnerNotificationChannel;
  destination?: string;
  note?: string;
  actionId: string;
  operatorUserId: string;
  operatorEmailMasked: string | null;
}): Promise<OwnerNotificationOpsActionResult | null | 'conflict'> {
  const eventId = requireOwnerNotificationEventId(params.eventId);
  const now = Timestamp.now();
  const normalizedDestination = params.destination
    ? normalizeDestinationForAudit(params.channel, params.destination)
    : undefined;
  const destinationValue = normalizedDestination || `manual:${eventId}:${params.channel}`;
  const deliveryId = safeId(`manual|${eventId}|${params.actionId}`);
  const recipientMasked = params.destination
    ? maskDestination(params.channel, normalizedDestination || params.destination)
    : `manual:${params.channel}`;
  const eventRef = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId);
  const deliveryRef = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId);
  const committed = await params.db.runTransaction(async (transaction) => {
    const currentEventSnapshot = await transaction.get(eventRef);
    if (!currentEventSnapshot.exists) return null;
    const currentEvent = currentEventSnapshot.data() as OwnerNotificationEventDoc;
    if (currentEvent.productId !== params.productId) return null;
    const existingDeliverySnapshot = await transaction.get(deliveryRef);
    if (existingDeliverySnapshot.exists) {
      const existingDelivery = existingDeliverySnapshot.data() || {};
      if (
        existingDelivery.eventId !== eventId
        || existingDelivery.productId !== params.productId
        || existingDelivery.channel !== params.channel
        || existingDelivery.recipientHash !== sha256(destinationValue.toLowerCase())
        || existingDelivery.note !== (params.note || null)
        || existingDelivery.operatorUserId !== params.operatorUserId
      ) {
        return { status: currentEvent.status, replayed: false, conflict: true };
      }
      return { status: currentEvent.status, replayed: true };
    }

    transaction.create(deliveryRef, sanitizeForFirestore({
      eventId,
      productId: currentEvent.productId,
      triggerType: currentEvent.triggerType,
      channel: params.channel,
      recipientRole: normalizeActionRecipientRole(
        currentEvent.recipientRole,
        params.productId,
        currentEvent.triggerType,
      ),
      recipientHash: sha256(destinationValue.toLowerCase()),
      recipientMasked,
      status: 'sent',
      subject: null,
      templateKey: 'manual_handoff',
      templateVersion: '2026-06-02',
      providerMessageId: `manual:${now.toMillis()}`,
      error: null,
      attempt: 1,
      deliveryMode: 'manual_handoff',
      operatorUserId: params.operatorUserId,
      operatorEmailMasked: params.operatorEmailMasked,
      actionIdHash: sha256(params.actionId),
      note: params.note || null,
      createdAt: now,
      sentAt: now,
    }));
    transaction.update(eventRef, sanitizeForFirestore({
      manualHandoffAt: now,
      manualHandoffBy: params.operatorUserId,
      manualHandoffByEmailMasked: params.operatorEmailMasked,
      manualHandoffChannel: params.channel,
      manualHandoffNote: params.note || null,
      updatedAt: now,
    }));
    return { status: currentEvent.status, replayed: false };
  });

  if (!committed) return null;
  if ('conflict' in committed && committed.conflict) return 'conflict';

  return {
    ok: true,
    action: 'manualHandoff',
    eventId,
    status: committed.status,
    replayed: committed.replayed,
    message: committed.replayed ? 'Manual handoff was already recorded' : 'Manual handoff recorded',
  };
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS || !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD) {
    return NextResponse.json({ error: 'Owner notification ops dashboard is disabled' }, { status: 404 });
  }

  const params = validateAPIInput(GetQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (params.success === false) {
    logger.security('Owner Notification Ops Query Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: params.error,
    }, 'medium');
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const sessionOperatorId = getOperatorId(session);
  const operatorRateLimitHash = hashPublicRateLimitValue(sessionOperatorId);
  const rateLimitResult = await checkRateLimit({
    key: `owner-notification-ops-read:${operatorRateLimitHash}`,
    limit: 60,
    window: 60 * 60,
    failClosedOnProviderError: true,
  });
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    logger.security('Owner Notification Ops Read Rate Limited', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      providerUnavailable: rateLimitResult.reason === 'provider_unavailable',
    }, 'medium');
    return NextResponse.json(
      {
        error: rateLimitResult.reason === 'provider_unavailable'
          ? 'Owner notification access is temporarily unavailable'
          : 'Too many owner notification refreshes',
        retryAfter,
      },
      {
        status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  const { productId, status, limit, eventId } = params.data;
  const scanLimit = Math.min(Math.max(limit * 3, 40), 90);
  const cost: OwnerNotificationOpsCost = {
    authReads: 1,
    eventReads: 0,
    deliveryReads: 0,
    scopeReads: 0,
    countQueries: 0,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. One current-user authorization read and one bounded recent-event scan. Counts and filters describe that same product-scoped recent window; detail recipient resolution runs only after selecting one event.',
  };

  try {
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Owner Notification Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDbForProduct(productId);
    if (!db) {
      return NextResponse.json({ error: 'Notification Firestore target unavailable' }, { status: 503 });
    }
    const recentRows = await getRecentEventRows({ db, productId, scanLimit, cost });
    const { counts, events } = buildOwnerNotificationWindow({
      rows: recentRows,
      productId,
      status,
      limit,
    });
    const detail = eventId ? await getDetail({ db, productId, eventId, cost }) : undefined;

    const body: OwnerNotificationOpsSnapshot = {
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: true,
        accessModel: 'current_persisted_platform_user',
        realtimeListeners: false,
        productId,
      },
      filters: {
        productId,
        status,
        limit,
        scanLimit,
      },
      counts,
      events,
      selectedEvent: detail?.selectedEvent,
      deliveries: detail?.deliveries,
      resolvedRecipient: detail?.resolvedRecipient,
      manualTemplate: detail?.manualTemplate,
      detailError: detail?.detailError,
      cost,
    };

    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logOpsFailure('owner_notifications_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('productId', productId),
      ...getBoundedOpsStringContext('status', status),
      ...getBoundedOpsStringContext('eventId', eventId),
      limit,
      scanLimit,
    });
    return NextResponse.json({ error: 'Failed to load owner notification ops snapshot' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });

export const POST = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS || !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD) {
    return NextResponse.json({ error: 'Owner notification ops dashboard is disabled' }, { status: 404 });
  }

  const userId = getOperatorId(session);
  const userRateLimitHash = hashPublicRateLimitValue(userId);
  const rateLimitResult = await checkRateLimit({
    key: `owner-notification-ops:${userRateLimitHash}`,
    limit: 30,
    window: 60 * 60,
    failClosedOnProviderError: true,
  });
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    logger.security('Owner Notification Ops Rate Limited', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
    }, 'medium');
    return NextResponse.json(
      {
        error: rateLimitResult.reason === 'provider_unavailable'
          ? 'Owner notification recovery is temporarily unavailable'
          : 'Too many owner notification recovery actions',
        retryAfter,
      },
      {
        status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  let operatorUserId: string;
  let operatorEmailMasked: string | null;
  try {
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Owner Notification Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    operatorUserId = currentPlatformUser.documentId;
    operatorEmailMasked = getOperatorEmailMasked(currentPlatformUser.userData.email);
  } catch (error) {
    logOpsFailure('owner_notifications_current_authorization_failed', error, {
      ...getBoundedOpsStringContext('userId', userId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
    });
    return NextResponse.json({ error: 'Owner notification recovery action failed' }, { status: 500 });
  }

  const bodyResult = await readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES, {
    invalidJsonMessage: 'Invalid owner notification action',
  });
  if (bodyResult.ok === false) return bodyResult.response;

  const body = bodyResult.data as any;
  const validation = validateAPIInput(PostActionSchema, body);
  if (validation.success === false) {
    logger.security('Owner Notification Ops Action Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: validation.error,
      ...getBoundedOpsStringContext('action', body?.action),
    }, 'medium');
    return NextResponse.json({ error: 'Invalid owner notification action' }, { status: 400 });
  }

  const db = getDbForProduct(validation.data.productId);
  if (!db) {
    return NextResponse.json({ error: 'Notification Firestore target unavailable' }, { status: 503 });
  }

  try {
    const eventId = requireOwnerNotificationEventId(validation.data.eventId);

    if (validation.data.action === 'retry') {
      const result = await processOwnerNotificationEvent(validation.data.productId, eventId);
      if (result.claimed === false) {
        const notFound = result.claimReason === 'not_found_or_product_mismatch';
        return NextResponse.json(
          { error: notFound ? 'Owner notification event not found' : 'Owner notification event cannot be retried' },
          { status: notFound ? 404 : 409 },
        );
      }
      return NextResponse.json({
        ok: true,
        action: 'retry',
        eventId,
        status: result.status,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        message: 'Retry processed',
      } satisfies OwnerNotificationOpsActionResult);
    }

    if (validation.data.action === 'manualSend') {
      const event = await loadRawEvent(db, validation.data.productId, eventId);
      if (!event) {
        return NextResponse.json({ error: 'Owner notification event not found' }, { status: 404 });
      }
      const destinationError = validateDestination(validation.data.channel, validation.data.destination);
      if (destinationError) {
        return NextResponse.json({ error: destinationError }, { status: 400 });
      }

      const result = await runManualSend({
        event,
        eventId,
        channel: validation.data.channel,
        destination: validation.data.destination,
        reason: validation.data.reason,
        actionId: validation.data.actionId,
      });
      return NextResponse.json(result);
    }

    if (validation.data.destination) {
      const destinationError = validateDestination(validation.data.channel, validation.data.destination);
      if (destinationError) {
        return NextResponse.json({ error: destinationError }, { status: 400 });
      }
    }

    const result = await recordManualHandoff({
      db,
      productId: validation.data.productId,
      eventId,
      channel: validation.data.channel,
      destination: validation.data.destination,
      note: validation.data.note,
      actionId: validation.data.actionId,
      operatorUserId,
      operatorEmailMasked,
    });
    if (!result) {
      return NextResponse.json({ error: 'Owner notification event not found' }, { status: 404 });
    }
    if (result === 'conflict') {
      return NextResponse.json({ error: 'Owner notification action ID conflict' }, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (error) {
    logOpsFailure('owner_notifications_action_failed', error, {
      ...getBoundedOpsStringContext('userId', userId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('action', validation.data.action),
      ...getBoundedOpsStringContext('productId', validation.data.productId),
      ...getBoundedOpsStringContext('eventId', normalizeOwnerNotificationEventId(validation.data.eventId)),
    });
    return NextResponse.json({ error: 'Owner notification recovery action failed' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });
