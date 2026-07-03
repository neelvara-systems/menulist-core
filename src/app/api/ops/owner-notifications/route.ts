export const dynamic = 'force-dynamic';

/**
 * Platform-only owner notification tracking and recovery API.
 *
 * Cost model:
 * - GET list uses one bounded event query plus small count aggregations.
 * - GET detail adds one direct event read, one bounded deliveries query, and one scope read.
 * - No realtime listeners and no composite indexes are required by this route.
 */

import { PRODUCT_IDS } from '@constant/product';
import { FEATURE_FLAGS } from '@config/features';
import {
  getOwnerNotificationRegistryEntry,
  OWNER_NOTIFICATION_COLLECTIONS,
  type OwnerNotificationChannel,
  type OwnerNotificationProductId,
} from '@data/shared/ownerNotificationRegistry';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
  enqueueOwnerNotification,
  processOwnerNotificationEvent,
} from '@lib/owner-notifications';
import {
  buildFormattedNotificationMetadata,
  resolveOwnerNotificationFormattingContext,
} from '@lib/owner-notifications/formatters';
import {
  resolveOwnerNotificationRecipient,
  resolveOwnerNotificationScope,
} from '@lib/owner-notifications/recipientResolver';
import { renderOwnerNotificationTemplate } from '@lib/owner-notifications/templates';
import type {
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
  OwnerNotificationOpsSnapshot,
  OwnerNotificationOpsStatusFilter,
} from '@lib/ops/ownerNotificationTypes';
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

const PRODUCT_IDS_FOR_OPS: OwnerNotificationProductId[] = [
  PRODUCT_IDS.MENULIST,
  PRODUCT_IDS.ANSWERLATTICE,
] as OwnerNotificationProductId[];

const STATUS_FILTERS: OwnerNotificationOpsStatusFilter[] = ['all', ...EVENT_STATUSES];
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

const GetQuerySchema = z.object({
  productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]).default(PRODUCT_IDS.MENULIST),
  status: z.enum(STATUS_FILTERS as [OwnerNotificationOpsStatusFilter, ...OwnerNotificationOpsStatusFilter[]]).default('failed'),
  limit: z.coerce.number().int().min(5).max(50).default(30),
  eventId: z.string().trim().min(8).max(120).optional(),
});

const PostActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('retry'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: z.string().trim().min(8).max(120),
  }),
  z.object({
    action: z.literal('manualSend'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: z.string().trim().min(8).max(120),
    channel: z.enum(['email', 'whatsapp']),
    destination: z.string().trim().min(3).max(254),
    reason: z.string().trim().max(400).optional(),
  }),
  z.object({
    action: z.literal('manualHandoff'),
    productId: z.enum(PRODUCT_IDS_FOR_OPS as [OwnerNotificationProductId, OwnerNotificationProductId]),
    eventId: z.string().trim().min(8).max(120),
    channel: z.enum(['email', 'whatsapp']),
    destination: z.string().trim().min(3).max(254).optional(),
    note: z.string().trim().max(600).optional(),
  }),
]);

function getDbForProduct(productId: OwnerNotificationProductId): Firestore | null {
  if (productId === PRODUCT_IDS.ANSWERLATTICE) {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
  }
  return firestoreAdmin;
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
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (typeof value === 'object' && typeof value.toDate !== 'function') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, sanitizeForFirestore(nested)]),
    );
  }
  return value;
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
      acc[key] = typeof value === 'string' && value.length > 160
        ? `${value.slice(0, 157)}...`
        : value;
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
): OwnerNotificationOpsEventRow {
  const data = doc.data() || {};
  return {
    id: doc.id,
    productId: data.productId || PRODUCT_IDS.MENULIST,
    triggerType: String(data.triggerType || 'UNKNOWN'),
    tenantId: String(data.tenantId || '-'),
    storeId: data.storeId ? String(data.storeId) : undefined,
    workspaceId: data.workspaceId ? String(data.workspaceId) : undefined,
    referenceId: String(data.referenceId || '-'),
    recipientRole: data.recipientRole || 'primary_owner',
    requestedChannels: normalizeChannels(data.requestedChannels),
    priority: String(data.priority || '-'),
    status: EVENT_STATUSES.includes(data.status) ? data.status : 'pending',
    sourcePath: String(data.source?.path || data.sourcePath || '-'),
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

function serializeDeliveryDoc(doc: FirebaseFirestore.QueryDocumentSnapshot): OwnerNotificationOpsDeliveryRow {
  const data = doc.data() || {};
  return {
    id: doc.id,
    eventId: String(data.eventId || '-'),
    productId: data.productId || PRODUCT_IDS.MENULIST,
    triggerType: String(data.triggerType || '-'),
    channel: data.channel === 'whatsapp' ? 'whatsapp' : 'email',
    recipientRole: data.recipientRole || 'primary_owner',
    recipientMasked: String(data.recipientMasked || '***'),
    status: data.status || 'failed',
    subject: getOwnerNotificationStoredTextSummary('Subject', data.subject),
    templateKey: String(data.templateKey || '-'),
    templateVersion: String(data.templateVersion || '-'),
    providerMessageId: getOwnerNotificationStoredTextSummary('Provider message id', data.providerMessageId),
    error: getOwnerNotificationErrorSummary(data.error),
    attempt: Number(data.attempt || 1),
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

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snapshot = await query.count().get();
  return Number(snapshot.data().count || 0);
}

async function getStatusCounts(db: Firestore): Promise<Record<OwnerNotificationEventStatus, number>> {
  const entries = await Promise.all(
    EVENT_STATUSES.map(async (status) => {
      const count = await countQuery(
        db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).where('status', '==', status),
      );
      return [status, count] as const;
    }),
  );

  return entries.reduce(
    (acc, [status, count]) => ({ ...acc, [status]: count }),
    {
      pending: 0,
      processing: 0,
      delivered: 0,
      partial: 0,
      failed: 0,
      skipped: 0,
    },
  );
}

async function getEventRows(params: {
  db: Firestore;
  productId: OwnerNotificationProductId;
  status: OwnerNotificationOpsStatusFilter;
  limit: number;
  scanLimit: number;
  cost: OwnerNotificationOpsCost;
}): Promise<OwnerNotificationOpsEventRow[]> {
  const collection = params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS);
  const query = params.status === 'all'
    ? collection.orderBy('updatedAt', 'desc').limit(params.scanLimit)
    : collection.where('status', '==', params.status).limit(params.scanLimit);
  const snapshot = await query.get();
  params.cost.eventReads += snapshot.docs.length;

  return snapshot.docs
    .map(serializeEventDoc)
    .filter((row) => row.productId === params.productId)
    .filter((row) => params.status === 'all' || row.status === params.status)
    .sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt))
    .slice(0, params.limit);
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
}> {
  const eventSnap = await params.db
    .collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)
    .doc(params.eventId)
    .get();
  params.cost.eventReads += 1;

  if (!eventSnap.exists) {
    return { deliveries: [] };
  }

  const rawEvent = eventSnap.data() as OwnerNotificationEventDoc;
  if (rawEvent.productId !== params.productId) {
    return { deliveries: [] };
  }

  const deliveriesSnap = await params.db
    .collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)
    .where('eventId', '==', params.eventId)
    .limit(DELIVERY_DETAIL_LIMIT)
    .get();
  params.cost.deliveryReads += deliveriesSnap.docs.length;

  let resolvedRecipient: OwnerNotificationOpsRecipient | undefined;
  let manualTemplate: OwnerNotificationOpsManualTemplate | undefined;
  try {
    const scope = await resolveOwnerNotificationScope(rawEvent);
    params.cost.scopeReads += rawEvent.storeId || rawEvent.workspaceId ? 1 : 0;
    const recipient = resolveOwnerNotificationRecipient(rawEvent, scope);
    resolvedRecipient = {
      role: recipient.role,
      name: recipient.name,
      email: recipient.email,
      whatsappNumber: recipient.whatsappNumber,
      whatsappConsent: recipient.whatsappConsent,
    };
    manualTemplate = buildManualTemplate(rawEvent, scope, resolvedRecipient);
  } catch (error) {
    logOpsFailure('owner_notifications_recipient_resolution_failed', error, {
      ...getBoundedOpsStringContext('productId', rawEvent.productId),
      ...getBoundedOpsStringContext('eventId', params.eventId),
      ...getBoundedOpsStringContext('triggerType', rawEvent.triggerType),
      ...getBoundedOpsStringContext('storeId', rawEvent.storeId),
      ...getBoundedOpsStringContext('workspaceId', rawEvent.workspaceId),
    });
  }

  return {
    selectedEvent: serializeEventDoc(eventSnap),
    deliveries: deliveriesSnap.docs
      .map(serializeDeliveryDoc)
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt)),
    resolvedRecipient,
    manualTemplate,
  };
}

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

function getOperatorEmailMasked(session: any): string | null {
  const email = String(session?.user?.email || session?.email || '').trim();
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
): Promise<OwnerNotificationEventDoc | null> {
  const snap = await db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(eventId).get();
  if (!snap.exists) return null;
  const event = snap.data() as OwnerNotificationEventDoc;
  return event.productId === productId ? event : null;
}

async function runManualSend(params: {
  event: OwnerNotificationEventDoc;
  eventId: string;
  channel: OwnerNotificationChannel;
  destination: string;
  reason?: string;
}): Promise<OwnerNotificationOpsActionResult> {
  const normalizedDestination = normalizeDestinationForAudit(params.channel, params.destination);
  const result = await enqueueOwnerNotification({
    productId: params.event.productId,
    triggerType: params.event.triggerType,
    tenantId: params.event.tenantId,
    ...(params.event.storeId ? { storeId: params.event.storeId } : {}),
    ...(params.event.workspaceId ? { workspaceId: params.event.workspaceId } : {}),
    referenceId: `manual-${params.eventId}-${Date.now()}`,
    recipientRole: params.event.recipientRole,
    requestedChannels: [params.channel],
    recipientHints: params.channel === 'email'
      ? { email: normalizedDestination }
      : { whatsappNumber: normalizedDestination },
    metadata: sanitizeForFirestore({
      ...params.event.metadata,
      manualRecipientOverride: true,
      originalEventId: params.eventId,
      manualReason: params.reason || null,
      manualRequestedAt: new Date().toISOString(),
    }),
    source: {
      runtime: 'next',
      path: 'src/app/api/ops/owner-notifications/route.ts:manualSend',
    },
  });

  return {
    ok: true,
    action: 'manualSend',
    eventId: params.eventId,
    manualEventId: 'eventId' in result ? result.eventId : undefined,
    status: result.status,
    sent: 'sent' in result ? result.sent : 0,
    failed: 'failed' in result ? result.failed : 0,
    skipped: 'skipped' in result ? result.skipped : 0,
    message: `Manual ${params.channel} send was processed`,
  };
}

async function recordManualHandoff(params: {
  db: Firestore;
  event: OwnerNotificationEventDoc;
  eventId: string;
  channel: OwnerNotificationChannel;
  destination?: string;
  note?: string;
  session: any;
}): Promise<OwnerNotificationOpsActionResult> {
  const now = Timestamp.now();
  const normalizedDestination = params.destination
    ? normalizeDestinationForAudit(params.channel, params.destination)
    : undefined;
  const destinationValue = normalizedDestination || `manual:${params.eventId}:${params.channel}`;
  const deliveryId = safeId(`manual|${params.eventId}|${params.channel}|${destinationValue}|${Date.now()}`);
  const recipientMasked = params.destination
    ? maskDestination(params.channel, normalizedDestination || params.destination)
    : `manual:${params.channel}`;

  await params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES).doc(deliveryId).set(sanitizeForFirestore({
    eventId: params.eventId,
    productId: params.event.productId,
    triggerType: params.event.triggerType,
    channel: params.channel,
    recipientRole: params.event.recipientRole,
    recipientHash: sha256(destinationValue.toLowerCase()),
    recipientMasked,
    status: 'sent',
    subject: null,
    templateKey: 'manual_handoff',
    templateVersion: '2026-06-02',
    providerMessageId: `manual:${Date.now()}`,
    error: null,
    attempt: 1,
    deliveryMode: 'manual_handoff',
    operatorUserId: getOperatorId(params.session),
    operatorEmailMasked: getOperatorEmailMasked(params.session),
    note: params.note || null,
    createdAt: now,
    sentAt: now,
  }));

  await params.db.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS).doc(params.eventId).set(sanitizeForFirestore({
    manualHandoffAt: now,
    manualHandoffBy: getOperatorId(params.session),
    manualHandoffByEmailMasked: getOperatorEmailMasked(params.session),
    manualHandoffChannel: params.channel,
    manualHandoffNote: params.note || null,
    updatedAt: now,
  }), { merge: true });

  return {
    ok: true,
    action: 'manualHandoff',
    eventId: params.eventId,
    status: params.event.status,
    message: 'Manual handoff recorded',
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

  const { productId, status, limit, eventId } = params.data;
  const db = getDbForProduct(productId);
  if (!db) {
    return NextResponse.json({ error: 'Notification Firestore target unavailable' }, { status: 503 });
  }

  const scanLimit = Math.min(Math.max(limit * 3, 40), 90);
  const cost: OwnerNotificationOpsCost = {
    eventReads: 0,
    deliveryReads: 0,
    scopeReads: 0,
    countQueries: EVENT_STATUSES.length,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. No realtime listener. Detail recipient resolution runs only after selecting one event.',
  };

  try {
    const [counts, events, detail] = await Promise.all([
      getStatusCounts(db),
      getEventRows({ db, productId, status, limit, scanLimit, cost }),
      eventId ? getDetail({ db, productId, eventId, cost }) : Promise.resolve(undefined),
    ]);

    const body: OwnerNotificationOpsSnapshot = {
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: true,
        accessModel: 'platform_role',
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
  });
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    logger.security('Owner Notification Ops Rate Limited', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
    }, 'medium');
    return NextResponse.json(
      { error: 'Too many owner notification recovery actions', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
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
    if (validation.data.action === 'retry') {
      const result = await processOwnerNotificationEvent(validation.data.productId, validation.data.eventId);
      return NextResponse.json({
        ok: true,
        action: 'retry',
        eventId: validation.data.eventId,
        status: result.status,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        message: 'Retry processed',
      } satisfies OwnerNotificationOpsActionResult);
    }

    const event = await loadRawEvent(db, validation.data.productId, validation.data.eventId);
    if (!event) {
      return NextResponse.json({ error: 'Owner notification event not found' }, { status: 404 });
    }

    if (validation.data.action === 'manualSend') {
      const destinationError = validateDestination(validation.data.channel, validation.data.destination);
      if (destinationError) {
        return NextResponse.json({ error: destinationError }, { status: 400 });
      }

      const result = await runManualSend({
        event,
        eventId: validation.data.eventId,
        channel: validation.data.channel,
        destination: validation.data.destination,
        reason: validation.data.reason,
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
      event,
      eventId: validation.data.eventId,
      channel: validation.data.channel,
      destination: validation.data.destination,
      note: validation.data.note,
      session,
    });
    return NextResponse.json(result);
  } catch (error) {
    logOpsFailure('owner_notifications_action_failed', error, {
      ...getBoundedOpsStringContext('userId', userId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('action', validation.data.action),
      ...getBoundedOpsStringContext('productId', validation.data.productId),
      ...getBoundedOpsStringContext('eventId', validation.data.eventId),
    });
    return NextResponse.json({ error: 'Owner notification recovery action failed' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });
