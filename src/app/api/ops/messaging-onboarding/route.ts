export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/messaging-onboarding
 *
 * Platform-only snapshot for the messaging onboarding ops surface.
 * Uses Admin SDK because messaging onboarding collections are server-only.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import type {
  MessagingOnboardingOpsAlert,
  MessagingOnboardingOpsEvent,
  MessagingOnboardingOpsHealth,
  MessagingOnboardingOpsSession,
  MessagingOnboardingOpsSnapshot,
} from '@lib/ops/messagingOnboardingTypes';
import { buildSecurityContext } from '@lib/security/securityContext';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const db = firestoreAdmin;

const HEALTH_CONTROL_DOC = 'messaging_onboarding_control';
const EVENT_WINDOW_HOURS = 24;
const RECENT_EVENT_LIMIT = 12;
const RECENT_SESSION_LIMIT = 8;
const RECENT_ALERT_LIMIT = 8;

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
  'businessName',
  'businessType',
  'categoryCount',
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
  'messageId',
  'messageLength',
  'messageType',
  'mimeType',
  'processingRuns',
  'qualityScore',
  'reason',
  'reportedSize',
  'runs',
  'sessionId',
  'storeId',
  'toState',
  'trigger',
  'uploadCount',
  'uploadIndex',
]);

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
  const lastSnapshotId = control.data()?.lastSnapshotId;
  const latest = typeof lastSnapshotId === 'string' && lastSnapshotId.trim()
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
    id: latest.id,
    status: data.status || 'unknown',
    windowStart: toIso(data.windowStart),
    windowEnd: toIso(data.windowEnd),
    runMetrics: data.runMetrics || {},
    metrics: data.metrics || {},
    costs: data.costs || {},
    retention: data.retention || {},
    alerts: Array.isArray(data.alerts) ? data.alerts : [],
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
  if (!metadata || typeof metadata !== 'object') return {};

  return Object.entries(metadata).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!SAFE_METADATA_KEYS.has(key)) return acc;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function serializeEvent(doc: FirebaseFirestore.QueryDocumentSnapshot): MessagingOnboardingOpsEvent {
  const data = doc.data();
  return {
    id: doc.id,
    eventType: String(data.eventType || 'UNKNOWN'),
    provider: String(data.provider || '-'),
    sessionId: String(data.sessionId || '-'),
    sessionState: String(data.sessionState || '-'),
    userIdMasked: String(data.userIdMasked || '****'),
    timestamp: toIso(data.timestamp),
    metadata: sanitizeMetadata(data.metadata),
    ...(data.error ? {
      error: {
        code: data.error.code,
        message: data.error.message,
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
      id: doc.id,
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
      return {
        id: doc.id,
        severity: data.severity || 'info',
        title: data.title || 'Messaging onboarding alert',
        message: data.message || '',
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
    logger.error(
      '[API /ops/messaging-onboarding] Error',
      error,
      buildSecurityContext(session, request),
    );
    return NextResponse.json(
      { error: 'Failed to load messaging onboarding ops snapshot' },
      { status: 500 },
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
