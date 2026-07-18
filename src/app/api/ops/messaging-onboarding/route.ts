export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/messaging-onboarding
 *
 * Platform-only snapshot for the messaging onboarding ops surface.
 * Uses Admin SDK because messaging onboarding collections are server-only.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { FEATURE_FLAGS } from '@config/features';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import {
  isNonNegativeSafeInteger,
  MESSAGING_ONBOARDING_RECENT_ALERT_LIMIT,
  MESSAGING_ONBOARDING_RECENT_EVENT_LIMIT,
  MESSAGING_ONBOARDING_RECENT_SESSION_LIMIT,
  normalizeMessagingHealthSnapshotId,
  normalizeMessagingOnboardingOpsAlert,
  normalizeMessagingOnboardingOpsEvent,
  normalizeMessagingOnboardingOpsHealth,
  normalizeMessagingOnboardingOpsSession,
} from '@lib/ops/messagingOnboardingOpsBoundary';
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

function cleanOpsText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function buildMessagingOpsResponseId(prefix: string, value: unknown): string {
  const normalized = cleanOpsText(value, 1000) || 'missing';
  return `${prefix}-${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
}

async function getLatestHealthSnapshot(): Promise<MessagingOnboardingOpsHealth> {
  const healthCollection = db.collection(DB_COLLECTIONS.SYSTEM_HEALTH);
  const control = await healthCollection.doc(HEALTH_CONTROL_DOC).get();
  const lastSnapshotId = normalizeMessagingHealthSnapshotId(control.data()?.lastSnapshotId);
  const latest = lastSnapshotId
    ? await healthCollection.doc(lastSnapshotId).get()
    : null;

  if (!latest?.exists) {
    return normalizeMessagingOnboardingOpsHealth({}, null);
  }

  return normalizeMessagingOnboardingOpsHealth(
    latest.data(),
    buildMessagingOpsResponseId('health', latest.id),
  );
}

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snapshot = await query.count().get();
  const count = snapshot.data().count;
  if (!isNonNegativeSafeInteger(count)) {
    throw new Error('MESSAGING_ONBOARDING_OPS_COUNT_INVALID');
  }
  return count;
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

async function checkMessagingOnboardingOpsRateLimit(session: any) {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const userId = getOperatorId(session);
  const userRateLimitHash = hashPublicRateLimitValue(userId);

  const rateLimit = await checkRateLimit({
    key: `${MESSAGING_ONBOARDING_OPS_RATE_LIMIT_KEY}:${userRateLimitHash}`,
    ...rateLimitConfig,
    failClosedOnProviderError: true,
  });

  if (rateLimit.allowed) return null;

  const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: rateLimit.reason === 'provider_unavailable'
        ? 'Messaging onboarding ops is temporarily unavailable.'
        : 'Too many requests. Please try again later.',
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
      status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
    },
  );
}

function serializeEvent(doc: FirebaseFirestore.QueryDocumentSnapshot): MessagingOnboardingOpsEvent {
  const data = doc.data();
  return normalizeMessagingOnboardingOpsEvent(
    data,
    buildMessagingOpsResponseId('event', doc.id),
    buildMessagingOpsResponseId('session', data.sessionId || doc.id),
  );
}

async function getWebhookWindow(windowEnd: Timestamp) {
  const windowStart = Timestamp.fromMillis(windowEnd.toMillis() - EVENT_WINDOW_HOURS * 60 * 60 * 1000);
  const recentSnapshot = await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
    .where('timestamp', '>=', windowStart)
    .where('timestamp', '<=', windowEnd)
    .orderBy('timestamp', 'desc')
    .limit(MESSAGING_ONBOARDING_RECENT_EVENT_LIMIT)
    .get();

  const events = recentSnapshot.docs.map(serializeEvent);
  const countEntries = await Promise.all(
    WEBHOOK_EVENT_COUNTS.map(async ({ key, eventType }) => {
      const count = await countQuery(
        db
          .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_EVENTS)
          .where('eventType', '==', eventType)
          .where('timestamp', '>=', windowStart)
          .where('timestamp', '<=', windowEnd)
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

async function getRecentSessions(): Promise<MessagingOnboardingOpsSession[]> {
  const snapshot = await db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .orderBy('updatedAt', 'desc')
    .limit(MESSAGING_ONBOARDING_RECENT_SESSION_LIMIT)
    .get();

  return snapshot.docs.map((doc) => {
    return normalizeMessagingOnboardingOpsSession(
      doc.data(),
      buildMessagingOpsResponseId('session', doc.id),
    );
  });
}

async function getRecentAlerts(): Promise<MessagingOnboardingOpsAlert[]> {
  const snapshot = await db
    .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
    .where('metadata.subsystem', '==', 'messaging_onboarding')
    .orderBy('timestamp', 'desc')
    .limit(MESSAGING_ONBOARDING_RECENT_ALERT_LIMIT)
    .get();

  return snapshot.docs
    .map((doc) => normalizeMessagingOnboardingOpsAlert(
      doc.data(),
      buildMessagingOpsResponseId('alert', doc.id),
    ));
}

export const GET = withAuth(async (request, session) => {
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD) {
    return NextResponse.json({ error: 'Messaging onboarding ops dashboard is disabled' }, { status: 404 });
  }

  try {
    const rateLimitResponse = await checkMessagingOnboardingOpsRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const generatedAt = Timestamp.now();

    const [health, inboundQueue, sessionsByState, webhook, recentSessions, recentAlerts] =
      await Promise.all([
        getLatestHealthSnapshot(),
        getInboundQueueCounts(),
        getSessionStateCounts(),
        getWebhookWindow(generatedAt),
        getRecentSessions(),
        getRecentAlerts(),
      ]);

    return NextResponse.json(
      {
        generatedAt: generatedAt.toDate().toISOString(),
        feature: {
          dashboardEnabled: true,
          providerMode: 'official_cloud_api',
          accessModel: 'current_persisted_platform_user',
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
