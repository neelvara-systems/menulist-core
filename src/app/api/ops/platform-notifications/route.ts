export const dynamic = 'force-dynamic';

/**
 * Platform-only notification dashboard API.
 *
 * Uses existing systemAlerts as the event store to avoid a duplicate alert
 * collection. Reads are bounded and manual; no realtime listeners.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import {
  PLATFORM_NOTIFICATION_REGISTRY,
  PLATFORM_NOTIFICATION_TRIGGER_TYPES,
  getPlatformNotificationRegistryEntry,
  type PlatformNotificationCategory,
  type PlatformNotificationSeverity,
} from '@data/shared/platformNotificationRegistry';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { logger } from '@lib/monitoring/logger';
import { createAlert } from '@lib/ops/alerts';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { buildPlatformNotificationWindow } from '@lib/ops/notificationOpsSnapshotBoundary';
import { classifyPlatformAlert } from '@lib/ops/platformNotificationClassifier';
import type {
  PlatformNotificationActionResult,
  PlatformNotificationOpsCost,
  PlatformNotificationRow,
  PlatformNotificationSeverityFilter,
  PlatformNotificationSnapshot,
  PlatformNotificationStatusFilter,
} from '@lib/ops/platformNotificationTypes';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const SEVERITY_FILTERS: PlatformNotificationSeverityFilter[] = ['all', 'critical', 'warning', 'info'];
const STATUS_FILTERS: PlatformNotificationStatusFilter[] = ['active', 'acknowledged', 'all'];
const PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES = 8 * 1024;
const CATEGORY_VALUES: [PlatformNotificationCategory, ...PlatformNotificationCategory[]] = [
  'cost',
  'security',
  'public_output',
  'scheduler',
  'payments',
  'owner_notifications',
  'ai',
  'extraction',
  'pos',
  'answerlattice',
  'manual',
  'system',
];
const SAFE_METADATA_PREVIEW_KEYS = new Set([
  'category',
  'consecutiveFailures',
  'failureCode',
  'platformTriggerType',
  'productId',
  'ruleId',
]);
const BOUNDED_METADATA_PREVIEW_KEYS = new Set([
  'alertId',
  'componentName',
  'functionName',
  'sessionId',
  'storeId',
  'tenantId',
]);

const PlatformNotificationEventIdSchema = z.string()
  .trim()
  .min(6)
  .max(120)
  .refine(isValidFirestoreDocumentId, 'Invalid event ID');

const PlatformNotificationActionIdSchema = z.string()
  .trim()
  .min(8)
  .max(96)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid action ID');

const GetQuerySchema = z.object({
  status: z.enum(STATUS_FILTERS as [PlatformNotificationStatusFilter, ...PlatformNotificationStatusFilter[]]).default('active'),
  severity: z.enum(SEVERITY_FILTERS as [PlatformNotificationSeverityFilter, ...PlatformNotificationSeverityFilter[]]).default('all'),
  triggerType: z.string().trim().max(120).optional().default('all'),
  limit: z.coerce.number().int().min(5).max(100).default(50),
  eventId: PlatformNotificationEventIdSchema.optional(),
});

const PostActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('acknowledge'),
    eventId: PlatformNotificationEventIdSchema,
  }),
  z.object({
    action: z.literal('manualHandoff'),
    eventId: PlatformNotificationEventIdSchema,
    channel: z.enum(['email', 'whatsapp_web']),
    destination: z.string().trim().max(254).optional(),
    note: z.string().trim().max(600).optional(),
    actionId: PlatformNotificationActionIdSchema,
  }),
  z.object({
    action: z.literal('createManualAlert'),
    triggerType: z.string().trim().min(3).max(120).optional().default(PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT),
    severity: z.enum(['info', 'warning', 'critical']).default('warning'),
    title: z.string().trim().min(3).max(180),
    message: z.string().trim().min(3).max(1200),
    productId: z.enum(['PLATFORM', 'ML', 'AL', 'CC', 'MC']).default('PLATFORM'),
    category: z.enum(CATEGORY_VALUES).optional(),
    actionId: PlatformNotificationActionIdSchema,
  }),
]);

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

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

function safeActionDocumentId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 40);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhone(value: string): boolean {
  const phone = buildWhatsAppPhoneParam({ phoneNumber: value });
  return phone.length >= 10 && phone.length <= 15;
}

function maskDestination(channel: 'email' | 'whatsapp_web', destination: string): string {
  if (channel === 'email') {
    const [name, domain] = destination.split('@');
    return domain ? `${name.slice(0, 2)}***@${domain}` : '***';
  }
  const digits = buildWhatsAppPhoneParam({ phoneNumber: destination });
  return digits ? `***${digits.slice(-4)}` : '***';
}

function validateDestination(channel: 'email' | 'whatsapp_web', destination?: string): string | null {
  if (!destination) return null;
  if (channel === 'email' && !isEmail(destination)) return 'Enter a valid email address';
  if (channel === 'whatsapp_web' && !isPhone(destination)) return 'Enter a valid WhatsApp number';
  return null;
}

function cleanOpsText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getPlatformAlertStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = cleanOpsText(value, 1000);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getPlatformAlertScopeValue(value: unknown): string {
  const normalized = cleanOpsText(value || 'system', 120);
  return /^[A-Za-z0-9_.:-]{1,120}$/.test(normalized) ? normalized : 'restricted';
}

function buildPlatformAlertDisplayMessage(description: string, data: Record<string, any>): string {
  const context = {
    ...getPlatformAlertStringContext('title', data.title),
    ...getPlatformAlertStringContext('message', data.message),
  };
  const parts = [
    context.titlePresent ? `title=${context.titleLength}` : null,
    context.messagePresent ? `message=${context.messageLength}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `${description} Stored alert text present (${parts.join(', ')} chars).`
    : description;
}

function safeMetadataPreview(metadata: any): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== 'object') return {};

  return Object.keys(metadata).reduce<Record<string, string | number | boolean | null>>((acc, key) => {
    const value = metadata[key];
    if (BOUNDED_METADATA_PREVIEW_KEYS.has(key)) {
      Object.assign(acc, getPlatformAlertStringContext(key, value));
      return acc;
    }
    if (!SAFE_METADATA_PREVIEW_KEYS.has(key)) return acc;

    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      acc[key] = value;
      return acc;
    }
    if (typeof value === 'string') {
      const normalized = cleanOpsText(value, 180);
      if (/^[A-Za-z0-9_.:-]{1,80}$/.test(normalized)) {
        acc[key] = normalized;
      } else {
        Object.assign(acc, getPlatformAlertStringContext(key, normalized));
      }
    }
    return acc;
  }, {});
}

function serializeAlertDoc(
  doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot,
): PlatformNotificationRow {
  const data = doc.data() || {};
  const classified = classifyPlatformAlert(data);

  return {
    id: doc.id,
    triggerType: classified.triggerType,
    productId: classified.productId,
    category: classified.category,
    severity: classified.severity,
    title: classified.entry.title,
    message: buildPlatformAlertDisplayMessage(classified.entry.description, data),
    tId: getPlatformAlertScopeValue(data.tId),
    sId: getPlatformAlertScopeValue(data.sId),
    acknowledged: data.acknowledged === true,
    actionRequired: data.actionRequired === true,
    actionTaken: data.actionTaken === true,
    timestamp: toIso(data.timestamp),
    acknowledgedAt: toIso(data.acknowledgedAt),
    manualHandoffAt: toIso(data.manualHandoffAt),
    manualHandoffChannel: data.manualHandoffChannel === 'email' || data.manualHandoffChannel === 'whatsapp_web'
      ? data.manualHandoffChannel
      : null,
    metadataPreview: safeMetadataPreview(data.metadata),
    channels: classified.entry.defaultChannels,
    runbook: classified.entry.runbook,
    immediate: classified.entry.immediate,
  };
}

async function getRecentRows(params: {
  scanLimit: number;
  cost: PlatformNotificationOpsCost;
}): Promise<PlatformNotificationRow[]> {
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
    .orderBy('timestamp', 'desc')
    .limit(params.scanLimit)
    .get();
  params.cost.alertReads += snapshot.docs.length;

  return snapshot.docs.map(serializeAlertDoc);
}

async function getDetail(eventId?: string, cost?: PlatformNotificationOpsCost): Promise<PlatformNotificationRow | undefined> {
  if (!eventId) return undefined;
  const snap = await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(eventId).get();
  if (cost) cost.alertReads += 1;
  return snap.exists ? serializeAlertDoc(snap) : undefined;
}

async function acknowledgeExistingAlert(
  eventId: string,
  operatorId: string,
): Promise<'missing' | 'changed' | 'replayed'> {
  const ref = firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(eventId);
  return firestoreAdmin.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return 'missing';
    if (snapshot.data()?.acknowledged === true) return 'replayed';
    const now = Timestamp.now();
    transaction.update(ref, {
      acknowledged: true,
      acknowledgedAt: now,
      acknowledgedBy: operatorId,
      updatedAt: now,
    });
    return 'changed';
  });
}

async function recordPlatformManualHandoff(params: {
  eventId: string;
  operatorId: string;
  actionId: string;
  channel: 'email' | 'whatsapp_web';
  destination?: string;
  note?: string;
}): Promise<'missing' | 'changed' | 'replayed' | 'conflict'> {
  const ref = firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(params.eventId);
  const actionIdHash = safeActionDocumentId(params.actionId);
  const destinationMasked = params.destination
    ? maskDestination(params.channel, params.destination)
    : null;
  return firestoreAdmin.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return 'missing';
    const currentData = snapshot.data() || {};
    if (currentData.manualHandoffActionIdHash === actionIdHash) {
      return currentData.manualHandoffChannel === params.channel
        && currentData.manualHandoffDestinationMasked === destinationMasked
        && currentData.manualHandoffNote === (params.note || null)
        && currentData.manualHandoffBy === params.operatorId
        ? 'replayed'
        : 'conflict';
    }
    const now = Timestamp.now();
    transaction.update(ref, {
      actionTaken: true,
      manualHandoffAt: now,
      manualHandoffBy: params.operatorId,
      manualHandoffChannel: params.channel,
      manualHandoffDestinationMasked: destinationMasked,
      manualHandoffNote: params.note || null,
      manualHandoffActionIdHash: actionIdHash,
      updatedAt: now,
    });
    return 'changed';
  });
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD) {
    return NextResponse.json({ error: 'Platform notification dashboard is disabled' }, { status: 404 });
  }

  const validation = validateAPIInput(GetQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (validation.success === false) {
    logger.security('Platform Notification Ops Query Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: validation.error,
    }, 'medium');
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const sessionOperatorId = getOperatorId(session);
  const operatorRateLimitHash = hashPublicRateLimitValue(sessionOperatorId);
  const rateLimit = await checkRateLimit({
    key: `platform-notification-ops-read:${operatorRateLimitHash}`,
    limit: 60,
    window: 60 * 60,
    failClosedOnProviderError: true,
  });
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Platform Notification Ops Read Rate Limited', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      providerUnavailable: rateLimit.reason === 'provider_unavailable',
    }, 'medium');
    return NextResponse.json(
      {
        error: rateLimit.reason === 'provider_unavailable'
          ? 'Platform notification access is temporarily unavailable'
          : 'Too many platform notification refreshes',
        retryAfter,
      },
      {
        status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  const { status, severity, triggerType, limit, eventId } = validation.data;
  const scanLimit = Math.min(Math.max(limit * 3, 75), 150);
  const cost: PlatformNotificationOpsCost = {
    authReads: 1,
    alertReads: 0,
    countQueries: 0,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. One current-user authorization read and one bounded recent-alert scan. Counts and filters describe that same recent window; no unbounded aggregate query or realtime listener is used.',
  };

  try {
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Platform Notification Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const recentRows = await getRecentRows({ scanLimit, cost });
    const { counts, events } = buildPlatformNotificationWindow({
      rows: recentRows,
      status,
      severity,
      triggerType,
      limit,
    });
    const selectedEvent = eventId
      ? recentRows.find((row) => row.id === eventId) || await getDetail(eventId, cost)
      : undefined;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD,
        accessModel: 'current_persisted_platform_user',
        realtimeListeners: false,
      },
      filters: { status, severity, triggerType, limit, scanLimit },
      counts,
      events,
      selectedEvent,
      registry: PLATFORM_NOTIFICATION_REGISTRY.map((entry) => ({
        triggerType: entry.triggerType,
        productId: entry.productId,
        category: entry.category,
        severity: entry.severity,
        title: entry.title,
        description: entry.description,
        defaultChannels: entry.defaultChannels,
        immediate: entry.immediate,
        runbook: entry.runbook,
      })),
      cost,
    } satisfies PlatformNotificationSnapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logOpsFailure('platform_notifications_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('status', status),
      ...getBoundedOpsStringContext('severity', severity),
      ...getBoundedOpsStringContext('triggerType', triggerType),
      ...getBoundedOpsStringContext('eventId', eventId),
      limit,
      scanLimit,
    });
    return NextResponse.json({ error: 'Failed to load platform notifications' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });

export const POST = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD) {
    return NextResponse.json({ error: 'Platform notification dashboard is disabled' }, { status: 404 });
  }

  const sessionOperatorId = getOperatorId(session);
  const operatorRateLimitHash = hashPublicRateLimitValue(sessionOperatorId);
  const rateLimit = await checkRateLimit({
    key: `platform-notification-ops:${operatorRateLimitHash}`,
    limit: 40,
    window: 60 * 60,
    failClosedOnProviderError: true,
  });
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Platform Notification Ops Rate Limited', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
    }, 'medium');
    return NextResponse.json(
      {
        error: rateLimit.reason === 'provider_unavailable'
          ? 'Platform notification actions are temporarily unavailable'
          : 'Too many platform notification actions',
        retryAfter,
      },
      {
        status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  let operatorId: string;
  try {
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - Platform Notification Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
        endpoint: request.nextUrl.pathname,
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    operatorId = currentPlatformUser.documentId;
  } catch (error) {
    logOpsFailure('platform_notifications_current_authorization_failed', error, {
      ...getBoundedOpsStringContext('userId', sessionOperatorId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
    });
    return NextResponse.json({ error: 'Platform notification action failed' }, { status: 500 });
  }

  const bodyResult = await readBoundedJsonBody(request, PLATFORM_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES, {
    invalidJsonMessage: 'Invalid platform notification action',
  });
  if (bodyResult.ok === false) return bodyResult.response;

  const body = bodyResult.data as any;
  const validation = validateAPIInput(PostActionSchema, body);
  if (validation.success === false) {
    logger.security('Platform Notification Ops Action Validation Failed', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: validation.error,
      ...getBoundedOpsStringContext('action', body?.action),
    }, 'medium');
    return NextResponse.json({ error: 'Invalid platform notification action' }, { status: 400 });
  }

  try {
    if (validation.data.action === 'acknowledge') {
      const outcome = await acknowledgeExistingAlert(validation.data.eventId, operatorId);
      if (outcome === 'missing') {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        action: 'acknowledge',
        eventId: validation.data.eventId,
        message: outcome === 'replayed' ? 'Alert was already acknowledged' : 'Alert acknowledged',
      } satisfies PlatformNotificationActionResult);
    }

    if (validation.data.action === 'manualHandoff') {
      const destinationError = validateDestination(validation.data.channel, validation.data.destination);
      if (destinationError) {
        return NextResponse.json({ error: destinationError }, { status: 400 });
      }

      const outcome = await recordPlatformManualHandoff({
        eventId: validation.data.eventId,
        operatorId,
        actionId: validation.data.actionId,
        channel: validation.data.channel,
        destination: validation.data.destination,
        note: validation.data.note,
      });
      if (outcome === 'missing') {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      if (outcome === 'conflict') {
        return NextResponse.json({ error: 'Platform notification action ID conflict' }, { status: 409 });
      }

      return NextResponse.json({
        ok: true,
        action: 'manualHandoff',
        eventId: validation.data.eventId,
        message: outcome === 'replayed' ? 'Manual handoff was already recorded' : 'Manual handoff recorded',
      } satisfies PlatformNotificationActionResult);
    }

    const registryEntry = getPlatformNotificationRegistryEntry(validation.data.triggerType)
      || getPlatformNotificationRegistryEntry(PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT)!;
    const eventId = await createAlert({
      severity: validation.data.severity as PlatformNotificationSeverity,
      type: registryEntry.category === 'security' ? 'security' : registryEntry.category === 'cost' ? 'usage' : 'error',
      title: validation.data.title,
      message: validation.data.message,
      triggerType: registryEntry.triggerType,
      productId: validation.data.productId,
      category: validation.data.category || registryEntry.category,
      metadata: {
        platformTriggerType: registryEntry.triggerType,
        productId: validation.data.productId,
        category: validation.data.category || registryEntry.category,
        createdManually: true,
        createdBy: operatorId,
      },
    }, {
      documentId: safeActionDocumentId(`manual-alert|${operatorId}|${validation.data.actionId}`),
    });
    if (!eventId) {
      throw new Error('Manual platform alert creation returned empty id');
    }

    return NextResponse.json({
      ok: true,
      action: 'createManualAlert',
      eventId,
      message: 'Manual platform alert created',
    } satisfies PlatformNotificationActionResult);
  } catch (error) {
    logOpsFailure('platform_notifications_action_failed', error, {
      ...getBoundedOpsStringContext('userId', operatorId),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
      ...getBoundedOpsStringContext('action', validation.data.action),
      ...('eventId' in validation.data
        ? getBoundedOpsStringContext('eventId', validation.data.eventId)
        : {}),
      ...('triggerType' in validation.data
        ? getBoundedOpsStringContext('triggerType', validation.data.triggerType)
        : {}),
      ...('productId' in validation.data
        ? getBoundedOpsStringContext('productId', validation.data.productId)
        : {}),
    });
    return NextResponse.json({ error: 'Platform notification action failed' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });
