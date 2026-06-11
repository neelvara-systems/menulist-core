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
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { createAlert } from '@lib/ops/alerts';
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
import { validateAPIInput } from '@lib/security/inputValidation';
import { buildSecurityContext } from '@lib/security/securityContext';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const SEVERITY_FILTERS: PlatformNotificationSeverityFilter[] = ['all', 'critical', 'warning', 'info'];
const STATUS_FILTERS: PlatformNotificationStatusFilter[] = ['active', 'acknowledged', 'all'];
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

const GetQuerySchema = z.object({
  status: z.enum(STATUS_FILTERS as [PlatformNotificationStatusFilter, ...PlatformNotificationStatusFilter[]]).default('active'),
  severity: z.enum(SEVERITY_FILTERS as [PlatformNotificationSeverityFilter, ...PlatformNotificationSeverityFilter[]]).default('all'),
  triggerType: z.string().trim().max(120).optional().default('all'),
  limit: z.coerce.number().int().min(5).max(100).default(50),
  eventId: z.string().trim().min(6).max(120).optional(),
});

const PostActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('acknowledge'),
    eventId: z.string().trim().min(6).max(120),
  }),
  z.object({
    action: z.literal('manualHandoff'),
    eventId: z.string().trim().min(6).max(120),
    channel: z.enum(['email', 'whatsapp_web']),
    destination: z.string().trim().max(254).optional(),
    note: z.string().trim().max(600).optional(),
  }),
  z.object({
    action: z.literal('createManualAlert'),
    triggerType: z.string().trim().min(3).max(120).optional().default(PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT),
    severity: z.enum(['info', 'warning', 'critical']).default('warning'),
    title: z.string().trim().min(3).max(180),
    message: z.string().trim().min(3).max(1200),
    productId: z.enum(['PLATFORM', 'ML', 'AL']).default('PLATFORM'),
    category: z.enum(CATEGORY_VALUES).optional(),
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

function millis(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
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

function safeMetadataPreview(metadata: any): Record<string, string | number | boolean | null> {
  if (!metadata || typeof metadata !== 'object') return {};
  const keys = [
    'alertId',
    'category',
    'componentName',
    'consecutiveFailures',
    'failureCode',
    'functionName',
    'platformTriggerType',
    'productId',
    'ruleId',
    'sessionId',
    'storeId',
    'tenantId',
  ];

  return keys.reduce<Record<string, string | number | boolean | null>>((acc, key) => {
    const value = metadata[key];
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      acc[key] = typeof value === 'string' && value.length > 180
        ? `${value.slice(0, 177)}...`
        : value;
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
    title: String(data.title || classified.entry.title),
    message: String(data.message || classified.entry.description),
    tId: String(data.tId || 'system'),
    sId: String(data.sId || 'system'),
    acknowledged: data.acknowledged === true,
    actionRequired: data.actionRequired === true,
    actionTaken: data.actionTaken === true,
    timestamp: toIso(data.timestamp),
    acknowledgedAt: toIso(data.acknowledgedAt),
    acknowledgedBy: data.acknowledgedBy ? String(data.acknowledgedBy) : null,
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

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snapshot = await query.count().get();
  return Number(snapshot.data().count || 0);
}

async function getCounts(): Promise<PlatformNotificationSnapshot['counts']> {
  const alerts = firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS);
  const [active, acknowledged, critical, warning, info] = await Promise.all([
    countQuery(alerts.where('acknowledged', '==', false)),
    countQuery(alerts.where('acknowledged', '==', true)),
    countQuery(alerts.where('severity', '==', 'critical')),
    countQuery(alerts.where('severity', '==', 'warning')),
    countQuery(alerts.where('severity', '==', 'info')),
  ]);

  return { active, acknowledged, critical, warning, info };
}

async function getRows(params: {
  status: PlatformNotificationStatusFilter;
  severity: PlatformNotificationSeverityFilter;
  triggerType: string;
  limit: number;
  scanLimit: number;
  cost: PlatformNotificationOpsCost;
}): Promise<PlatformNotificationRow[]> {
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
    .orderBy('timestamp', 'desc')
    .limit(params.scanLimit)
    .get();
  params.cost.alertReads += snapshot.docs.length;

  return snapshot.docs
    .map(serializeAlertDoc)
    .filter((row) => params.status === 'all' || (params.status === 'active' ? !row.acknowledged : row.acknowledged))
    .filter((row) => params.severity === 'all' || row.severity === params.severity)
    .filter((row) => params.triggerType === 'all' || row.triggerType === params.triggerType)
    .sort((a, b) => millis(b.timestamp) - millis(a.timestamp))
    .slice(0, params.limit);
}

async function getDetail(eventId?: string, cost?: PlatformNotificationOpsCost): Promise<PlatformNotificationRow | undefined> {
  if (!eventId) return undefined;
  const snap = await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(eventId).get();
  if (cost) cost.alertReads += 1;
  return snap.exists ? serializeAlertDoc(snap) : undefined;
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD) {
    return NextResponse.json({ error: 'Platform notification dashboard is disabled' }, { status: 404 });
  }

  const validation = validateAPIInput(GetQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (validation.success === false) {
    logger.security('Platform Notification Ops Query Validation Failed', {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: validation.error,
    }, 'medium');
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { status, severity, triggerType, limit, eventId } = validation.data;
  const scanLimit = Math.min(Math.max(limit * 3, 75), 150);
  const cost: PlatformNotificationOpsCost = {
    alertReads: 0,
    countQueries: 5,
    writes: 0,
    scanLimit,
    note: 'Manual refresh only. No realtime listener. List scans the recent bounded alert window and filters in memory.',
  };

  try {
    const [counts, events, selectedEvent] = await Promise.all([
      getCounts(),
      getRows({ status, severity, triggerType, limit, scanLimit, cost }),
      getDetail(eventId, cost),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      feature: {
        dashboardEnabled: FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD,
        accessModel: 'platform_role',
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
    logger.error('[API /ops/platform-notifications] Error', error, buildSecurityContext(session, request));
    return NextResponse.json({ error: 'Failed to load platform notifications' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });

export const POST = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD) {
    return NextResponse.json({ error: 'Platform notification dashboard is disabled' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const validation = validateAPIInput(PostActionSchema, body);
  if (validation.success === false) {
    logger.security('Platform Notification Ops Action Validation Failed', {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
      error: validation.error,
      action: typeof body?.action === 'string' ? body.action : 'unknown',
    }, 'medium');
    return NextResponse.json({ error: 'Invalid platform notification action' }, { status: 400 });
  }

  const operatorId = getOperatorId(session);
  const rateLimit = await checkRateLimit({
    key: `platform-notification-ops:${operatorId}`,
    limit: 40,
    window: 60 * 60,
  });
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Platform Notification Ops Rate Limited', {
      ...buildSecurityContext(session, request),
      endpoint: request.nextUrl.pathname,
      action: validation.data.action,
    }, 'medium');
    return NextResponse.json(
      { error: 'Too many platform notification actions', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    if (validation.data.action === 'acknowledge') {
      await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(validation.data.eventId).set({
        acknowledged: true,
        acknowledgedAt: Timestamp.now(),
        acknowledgedBy: operatorId,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({
        ok: true,
        action: 'acknowledge',
        eventId: validation.data.eventId,
        message: 'Alert acknowledged',
      } satisfies PlatformNotificationActionResult);
    }

    if (validation.data.action === 'manualHandoff') {
      const destinationError = validateDestination(validation.data.channel, validation.data.destination);
      if (destinationError) {
        return NextResponse.json({ error: destinationError }, { status: 400 });
      }

      await firestoreAdmin.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(validation.data.eventId).set({
        actionTaken: true,
        manualHandoffAt: Timestamp.now(),
        manualHandoffBy: operatorId,
        manualHandoffChannel: validation.data.channel,
        manualHandoffDestinationMasked: validation.data.destination
          ? maskDestination(validation.data.channel, validation.data.destination)
          : null,
        manualHandoffNote: validation.data.note || null,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return NextResponse.json({
        ok: true,
        action: 'manualHandoff',
        eventId: validation.data.eventId,
        message: 'Manual handoff recorded',
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
    logger.error('[API /ops/platform-notifications] Action error', error, buildSecurityContext(session, request));
    return NextResponse.json({ error: 'Platform notification action failed' }, { status: 500 });
  }
}, { requiredPlatformRole: 'PLATFORM' });
