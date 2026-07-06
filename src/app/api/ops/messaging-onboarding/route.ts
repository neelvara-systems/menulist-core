export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/messaging-onboarding
 *
 * Platform-only snapshot for the messaging onboarding ops surface.
 * Uses Admin SDK because messaging onboarding collections are server-only.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import type {
  MessagingOnboardingOpsAlert,
  MessagingOnboardingOpsEvent,
  MessagingOnboardingOpsHealth,
  MessagingOnboardingOpsSession,
  MessagingOnboardingOpsSnapshot,
} from '@lib/ops/messagingOnboardingTypes';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from '../../../../middleware/auth';

const db = firestoreAdmin;

const HEALTH_CONTROL_DOC = 'messaging_onboarding_control';
const EVENT_WINDOW_HOURS = 24;
const RECENT_EVENT_LIMIT = 12;
const RECENT_SESSION_LIMIT = 8;
const RECENT_ALERT_LIMIT = 8;
const MAX_METADATA_KEYS = 40;
const MAX_METADATA_STRING_LENGTH = 96;
const MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY = 'messaging-onboarding-ops';

const getOperatorId = (session: any) => session?.uId || session?.user?.id || 'platform';

const WATCHED_STATES = [
  'COLLECTING_INPUT',
  'VALIDATING_ASSETS',
  'AWAITING_MORE_UPLOADS',
  'PROCESSING_MENU',
  'PREVIEW_READY',
  'AWAITING_APPROVAL',
  'PUBLISHING',
  'FAILED',
] as const;

const INBOUND_STATUSES = ['PENDING', 'PROCESSING', 'FAILED'] as const;

const WEBHOOK_EVENT_COUNTS = [
  { key: 'invalidSignatures', eventType: 'WEBHOOK_SIGNATURE_INVALID' },
  { key: 'inboundQueued', eventType: 'INBOUND_MESSAGE_QUEUED' },
  { key: 'inboundProcessed', eventType: 'INBOUND_MESSAGE_PROCESSED' },
  { key: 'inboundFailed', eventType: 'INBOUND_MESSAGE_FAILED' },
  { key: 'messageSent', eventType: 'MESSAGE_SENT' },
  { key: 'messageSendFailed', eventType: 'MESSAGE_SEND_FAILED' },
  { key: 'providerMediaDownloadFailed', eventType: 'PROVIDER_MEDIA_DOWNLOAD_FAILED' },
] as const;

const SAFE_METADATA_KEYS = new Set([
  'attempts',
  'businessType',
  'categoryCount',
  'completeness',
  'confidence',
  'currentCount',
  'exhausted',
  'fileCount',
  'fileSize',
  'fromState',
  'hasMedia',
  'invalidCount',
  'itemCount',
  'maxSize',
  'menuCompleteness',
  'messageLength',
  'messageType',
  'metadataDroppedCount',
  'mimeType',
  'processingRuns',
  'processingTime',
  'qualityScore',
  'reason',
  'reportedSize',
  'runs',
  'targetPublishRate',
  'toState',
  'trigger',
  'uploadCount',
  'uploadIndex',
  'validCount',
]);

const BOUNDED_METADATA_KEYS = new Set([
  'businessName',
  'dashboardUrl',
  'extractionJobId',
  'imageUrl',
  'ip',
  'messageId',
  'path',
  'phone',
  'phoneNumber',
  'previewUrl',
  'projectId',
  'providerMessageId',
  'providerUserId',
  'publicUrl',
  'sessionId',
  'sha256',
  'storagePath',
  'storageUrl',
  'storeId',
  'tempProjectId',
  'tenantId',
]);

function getBoundedMetadataContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = value === undefined || value === null ? '' : String(value);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function cleanOpsText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeMessagingHealthSnapshotId(value: unknown): string | null {
  const snapshotId = cleanOpsText(value, 160);
  return isValidFirestoreDocumentId(snapshotId) ? snapshotId : null;
}

function buildMessagingOpsResponseId(prefix: string, value: unknown): string {
  const normalized = cleanOpsText(value, 1000) || 'missing';
  return `${prefix}-${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
}

function getMessagingAlertStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = cleanOpsText(value, 1000);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function normalizeMessagingAlertSeverity(value: unknown): 'info' | 'warning' | 'critical' {
  const normalized = cleanOpsText(value, 40).toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'warning') return 'warning';
  return 'info';
}

function normalizeMessagingHealthAlertSeverity(value: unknown): 'warning' | 'critical' {
  return normalizeMessagingAlertSeverity(value) === 'critical' ? 'critical' : 'warning';
}

function buildMessagingAlertTitle(severity: 'info' | 'warning' | 'critical'): string {
  return `Messaging onboarding ${severity} alert`;
}

function buildMessagingAlertMessage(data: Record<string, unknown>): string {
  const context = {
    ...getMessagingAlertStringContext('key', data.key),
    ...getMessagingAlertStringContext('title', data.title),
    ...getMessagingAlertStringContext('message', data.message),
  };
  const parts = [
    context.keyPresent ? `key=${context.keyLength}` : null,
    context.titlePresent ? `title=${context.titleLength}` : null,
    context.messagePresent ? `message=${context.messageLength}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Stored alert text present (${parts.join(', ')} chars).`
    : 'No stored alert text.';
}

function serializeHealthAlerts(alerts: unknown): MessagingOnboardingOpsHealth['alerts'] {
  if (!Array.isArray(alerts)) return [];
  return alerts.map((alert, index) => {
    const data = alert && typeof alert === 'object' ? alert as Record<string, unknown> : {};
    const severity = normalizeMessagingHealthAlertSeverity(data.severity);
    return {
      key: `health-alert-${index}`,
      severity,
      title: buildMessagingAlertTitle(severity),
      message: buildMessagingAlertMessage(data),
    };
  });
}

function isSafeMetadataKey(key: string): boolean {
  return SAFE_METADATA_KEYS.has(key) || /^[A-Za-z][A-Za-z0-9]*(Present|Length)$/.test(key);
}

function toIso(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
  } catch {
    return null;
  }
  return null;
}

async function getLatestHealthSnapshot(): Promise<MessagingOnboardingOpsHealth> {
  const healthCollection = db.collection(DB_COLLECTIONS.SYSTEM_HEALTH);
  const control = await healthCollection.doc(HEALTH_CONTROL_DOC).get();
  const lastSnapshotId = normalizeMessagingHealthSnapshotId(control.data()?.lastSnapshotId);
  const latest = lastSnapshotId
    ? await healthCollection.doc(lastSnapshotId).get()
    : null;

  if (!latest?.exists) {
    return {
      id: null,
      status: 'unknown',
      windowStart: null,
      windowEnd: null,
      runMetrics: {},
      metrics: {},
      costs: {},
      retention: {},
      alerts: [],
    };
  }

  const data = latest.data() || {};
  return {
    id: buildMessagingOpsResponseId('health', latest.id),
    status: data.status || 'unknown',
    windowStart: toIso(data.windowStart),
    windowEnd: toIso(data.windowEnd),
    runMetrics: data.runMetrics || {},
    metrics: data.metrics || {},
    costs: data.costs || {},
    retention: data.retention || {},
    alerts: serializeHealthAlerts(data.alerts),
  };
}

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snapshot = await query.count().get();
  return snapshot.data().count || 0;
}

async function getInboundQueueCounts(): Promise<MessagingOnboardingOpsSnapshot['inboundQueue']> {
  const results = await Promise.all(
    INBOUND_STATUSES.map(async (status) => {
      const count = await countQuery(
        db
          .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_INBOUND_MESSAGES)
          .where('status', '==', status),
      );
      return [status.toLowerCase(), count] as const;
    }),
  );

  return results.reduce(
    (acc, [status, count]) => ({ ...acc, [status]: count }),
    { pending: 0, processing: 0, failed: 0 },
  );
}

async function getSessionStateCounts(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    WATCHED_STATES.map(async (state) => {
      const count = await countQuery(
        db
          .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
          .where('state', '==', state),
      );
      return [state, count] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function sanitizeMetadata(metadata: any): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  const sanitized: Record<string, unknown> = {};
  let droppedCount = 0;

  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(sanitized).length >= MAX_METADATA_KEYS) {
      droppedCount += 1;
      continue;
    }

    if (BOUNDED_METADATA_KEYS.has(key)) {
      Object.assign(sanitized, getBoundedMetadataContext(key, value));
      continue;
    }

    if (!isSafeMetadataKey(key)) {
      droppedCount += 1;
      continue;
    }

    if (value === null || typeof value === 'boolean') {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, MAX_METADATA_STRING_LENGTH);
      continue;
    }

    droppedCount += 1;
  }

  if (droppedCount > 0 && Object.keys(sanitized).length < MAX_METADATA_KEYS) {
    sanitized.metadataDroppedCount = droppedCount;
  }

  return sanitized;
}

async function checkMessagingOnboardingOpsRateLimit(session: any) {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const userId = getOperatorId(session);
  const userRateLimitHash = hashPublicRateLimitValue(userId);

  const rateLimit = await checkRateLimit({
    key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userRateLimitHash}`,
    ...rateLimitConfig,
  });

  if (rateLimit.allowed) return null;

  const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter: waitSeconds,
      resetAt: rateLimit.resetAt,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(waitSeconds),
        'X-RateLimit-Limit': String(rateLimitConfig.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
      status: 429,
    },
  );
}

function serializeEvent(doc: FirebaseFirestore.QueryDocumentSnapshot): MessagingOnboardingOpsEvent {
  const data = doc.data();
  return {
    id: buildMessagingOpsResponseId('event', doc.id),
    eventType: String(data.eventType || 'UNKNOWN'),
    provider: String(data.provider || '-'),
    sessionId: buildMessagingOpsResponseId('session', data.sessionId || doc.id),
    sessionState: String(data.sessionState || '-'),
    userIdMasked: String(data.userIdMasked || '****'),
    timestamp: toIso(data.timestamp),
    metadata: sanitizeMetadata(data.metadata),
    ...(data.error ? {
      error: {
        code: data.error.code,
        retryable: data.error.retryable,
      },
    } : {}),
  };
}

async function getWebhookWindow() {
  const windowStart = Timestamp.fromMillis(Date.now() - EVENT_WINDOW_HOURS * 60 * 60 * 1000);
  const recentSnapshot = await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
    .where('timestamp', '>=', windowStart)
    .orderBy('timestamp', 'desc')
    .limit(RECENT_EVENT_LIMIT)
    .get();

  const events = recentSnapshot.docs.map(serializeEvent);
  const countEntries = await Promise.all(
    WEBHOOK_EVENT_COUNTS.map(async ({ key, eventType }) => {
      const count = await countQuery(
        db
          .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
          .where('eventType', '==', eventType)
          .where('timestamp', '>=', windowStart)
          .orderBy('timestamp', 'desc'),
      );
      return [key, count] as const;
    }),
  );
  const counts = Object.fromEntries(countEntries) as Record<(typeof WEBHOOK_EVENT_COUNTS)[number]['key'], number>;

  return {
    events,
    stats: {
      hours: EVENT_WINDOW_HOURS,
      recentEventsShown: events.length,
      ...counts,
    },
  };
}

function maskDisplayId(value: string | undefined): string {
  if (!value) return '****';
  return `****${value.slice(-4)}`;
}

async function getRecentSessions(): Promise<MessagingOnboardingOpsSession[]> {
  const snapshot = await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .orderBy('updatedAt', 'desc')
    .limit(RECENT_SESSION_LIMIT)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: buildMessagingOpsResponseId('session', doc.id),
      provider: String(data.provider || '-'),
      state: String(data.state || '-'),
      providerDisplayIdMasked: maskDisplayId(data.providerDisplayId),
      uploadCount: Array.isArray(data.uploads) ? data.uploads.length : 0,
      processingRuns: Number(data.processingRuns || 0),
      updatedAt: toIso(data.updatedAt),
      createdAt: toIso(data.createdAt),
    };
  });
}

async function getRecentAlerts(): Promise<MessagingOnboardingOpsAlert[]> {
  const snapshot = await db
    .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get();

  return snapshot.docs
    .filter((doc) => doc.data()?.metadata?.subsystem === 'messaging_onboarding')
    .slice(0, RECENT_ALERT_LIMIT)
    .map((doc) => {
      const data = doc.data();
      const severity = normalizeMessagingAlertSeverity(data.severity);
      return {
        id: buildMessagingOpsResponseId('alert', doc.id),
        severity,
        title: buildMessagingAlertTitle(severity),
        message: buildMessagingAlertMessage(data),
        timestamp: toIso(data.timestamp),
        acknowledged: data.acknowledged === true,
      };
    });
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD) {
    return NextResponse.json({ error: 'Messaging onboarding ops dashboard is disabled' }, { status: 404 });
  }

  try {
    const rateLimitResponse = await checkMessagingOnboardingOpsRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;

    const [health, inboundQueue, sessionsByState, webhook, recentSessions, recentAlerts] =
      await Promise.all([
        getLatestHealthSnapshot(),
        getInboundQueueCounts(),
        getSessionStateCounts(),
        getWebhookWindow(),
        getRecentSessions(),
        getRecentAlerts(),
      ]);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        feature: {
          dashboardEnabled: true,
          providerMode: 'official_cloud_api',
          accessModel: 'platform_role',
        },
        health,
        webhookWindow: webhook.stats,
        inboundQueue,
        sessionsByState,
        recentSessions,
        recentEvents: webhook.events,
        recentAlerts,
      } satisfies MessagingOnboardingOpsSnapshot,
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    logOpsFailure('ops_messaging_onboarding_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
    });
    return NextResponse.json(
      { error: 'Failed to load messaging onboarding ops snapshot' },
      { status: 500 },
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
