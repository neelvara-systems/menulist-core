export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { normalizeOwnerBusinessAssistantMonitorTimestamp } from '@lib/ownerBusinessAssistant/monitorProjection';
import type { Session } from 'next-auth';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../../middleware/auth';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(10).max(100).optional().default(50),
});
const OWNER_BUSINESS_ASSISTANT_MONITOR_RATE_LIMIT_KEY = 'owner-business-assistant-monitor';

async function checkOwnerBusinessAssistantMonitorRateLimit(session: Session) {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const userId = session?.uId || session?.user?.id || 'platform';
  const userRateLimitHash = hashPublicRateLimitValue(userId);

  const rateLimit = await checkRateLimit({
    key: `${OWNER_BUSINESS_ASSISTANT_MONITOR_RATE_LIMIT_KEY}:${userRateLimitHash}`,
    ...rateLimitConfig,
    failClosedOnProviderError: true,
  });

  if (rateLimit.allowed) return null;

  const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: rateLimit.reason === 'provider_unavailable'
        ? 'Business Health monitor is temporarily unavailable.'
        : 'Too many requests. Please try again later.',
      retryAfter: waitSeconds,
      resetAt: rateLimit.resetAt,
    },
    {
      headers: {
        'Retry-After': String(waitSeconds),
        'X-RateLimit-Limit': String(rateLimitConfig.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
      status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
    },
  );
}

function safeNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanMonitorText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getMonitorStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = cleanMonitorText(value, 1000);
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getMonitorTextSummary(label: string, value: unknown): string {
  const context = getMonitorStringContext(label, value);
  return context[`${label}Present`]
    ? `${label} present (${context[`${label}Length`]} chars).`
    : `No ${label.toLowerCase()} text.`;
}

function getOptionalMonitorTextSummary(label: string, value: unknown): string | null {
  const context = getMonitorStringContext(label, value);
  return context[`${label}Present`]
    ? `${label} present (${context[`${label}Length`]} chars).`
    : null;
}

function getMonitorIdentifierSummary(label: string, value: unknown): string {
  const normalized = cleanMonitorText(value, 1000);
  return normalized ? `${label}:${normalized.length}` : `${label}:missing`;
}

function getOptionalMonitorIdentifierSummary(label: string, value: unknown): string | null {
  const normalized = cleanMonitorText(value, 1000);
  return normalized ? `${label}:${normalized.length}` : null;
}

function buildMonitorResponseId(prefix: string, value: unknown): string {
  const normalized = cleanMonitorText(value, 1000) || 'missing';
  return `${prefix}-${createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`;
}

function getFeedbackRatingLabel(value: unknown): string {
  const normalized = cleanMonitorText(value, 40);
  if (/^[1-5]$/.test(normalized)) return `${normalized}/5`;

  const code = normalized.toLowerCase();
  if (['positive', 'negative', 'helpful', 'not_helpful', 'thumbs_up', 'thumbs_down', 'up', 'down'].includes(code)) {
    return code;
  }

  return normalized ? 'feedback rating present' : 'feedback';
}

function serializeFeedbackDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: buildMonitorResponseId('feedback', doc.id),
    answerId: getOptionalMonitorIdentifierSummary('answerId', data.answerId),
    rating: getFeedbackRatingLabel(data.rating),
    reason: getOptionalMonitorTextSummary('Feedback reason', data.reason || data.comment || data.message || data.text),
    createdAt: normalizeOwnerBusinessAssistantMonitorTimestamp(data.createdAt),
  };
}

function serializeDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: buildMonitorResponseId('answer-event', doc.id),
    answerId: getMonitorIdentifierSummary('answerId', data.answerId || doc.id),
    threadId: getOptionalMonitorIdentifierSummary('threadId', data.threadId),
    tId: getMonitorIdentifierSummary('tenantId', data.tId),
    sId: getMonitorIdentifierSummary('storeId', data.sId),
    userId: getOptionalMonitorIdentifierSummary('userId', data.userId),
    projectId: getOptionalMonitorIdentifierSummary('projectId', data.projectId),
    suggestedQuestionId: getOptionalMonitorIdentifierSummary('suggestedQuestionId', data.suggestedQuestionId),
    intent: String(data.intent || 'unknown'),
    question: getMonitorTextSummary('Question', data.question),
    answerText: getMonitorTextSummary('Answer', data.answerText),
    status: String(data.status || 'unknown'),
    confidence: String(data.confidence || 'low'),
    freshnessLabel: String(data.freshnessLabel || ''),
    cacheSource: data.cacheSource ? String(data.cacheSource) : null,
    packetProfile: data.packetProfile ? String(data.packetProfile) : null,
    packetAgeMinutes: data.packetAgeMinutes == null ? null : safeNumber(data.packetAgeMinutes),
    packetValidUntil: normalizeOwnerBusinessAssistantMonitorTimestamp(data.packetValidUntil),
    route: data.route ? String(data.route) : null,
    firestoreReadCount: data.firestoreReadCount == null ? null : safeNumber(data.firestoreReadCount),
    firestoreWriteCount: data.firestoreWriteCount == null ? null : safeNumber(data.firestoreWriteCount),
    answerEventWritten: data.answerEventWritten === true,
    threadWritten: data.threadWritten === true,
    unsupportedReason: getOptionalMonitorTextSummary('Unsupported reason', data.unsupportedReason),
    domainCoverage: Array.isArray(data.domainCoverage)
      ? data.domainCoverage.map((entry: any) => ({
          domain: cleanMonitorText(entry?.domain || 'unknown', 80) || 'unknown',
          status: cleanMonitorText(entry?.status || 'unsupported', 80) || 'unsupported',
          reason: getOptionalMonitorTextSummary('Coverage reason', entry?.reason),
        })).slice(0, 20)
      : [],
    sourceFactCount: safeNumber(data.sourceFactCount),
    artifactCount: safeNumber(data.artifactCount),
    providerUsed: Boolean(data.providerUsed),
    aiAction: String(data.aiAction || ''),
    unitsConsumed: safeNumber(data.unitsConsumed),
    realCostPaise: safeNumber(data.realCostPaise),
    ownerChargePaise: safeNumber(data.ownerChargePaise),
    billingMode: String(data.billingMode || 'free'),
    createdAt: normalizeOwnerBusinessAssistantMonitorTimestamp(data.createdAt),
  };
}

function buildSourceCoverage(events: ReturnType<typeof serializeDoc>[]) {
  const coverage = new Map<string, {
    domain: string;
    status: string;
    reason: string | null;
    eventCount: number;
    supportedCount: number;
    summaryOnlyCount: number;
    unsupportedCount: number;
  }>();

  events.forEach((event) => {
    event.domainCoverage.forEach((entry) => {
      const current = coverage.get(entry.domain) || {
        domain: entry.domain,
        status: entry.status,
        reason: entry.reason,
        eventCount: 0,
        supportedCount: 0,
        summaryOnlyCount: 0,
        unsupportedCount: 0,
      };
      current.eventCount += 1;
      if (entry.status === 'supported') current.supportedCount += 1;
      if (entry.status === 'summary_only') current.summaryOnlyCount += 1;
      if (entry.status === 'unsupported') current.unsupportedCount += 1;
      if (!coverage.has(entry.domain)) {
        current.status = entry.status;
        current.reason = entry.reason;
      }
      coverage.set(entry.domain, current);
    });
  });

  return Array.from(coverage.values()).sort((left, right) => right.eventCount - left.eventCount);
}

function buildSummary(events: ReturnType<typeof serializeDoc>[]) {
  const byStatus = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1;
    return acc;
  }, {});
  const byIntent = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.intent] = (acc[event.intent] || 0) + 1;
    return acc;
  }, {});

  return {
    total: events.length,
    answered: byStatus.answered || 0,
    needsMoreData: byStatus.needs_more_data || 0,
    unsupported: byStatus.unsupported || 0,
    providerCalls: events.filter((event) => event.providerUsed).length,
    serverCacheHits: events.filter((event) => event.cacheSource === 'server').length,
    freshFirestorePackets: events.filter((event) => event.cacheSource === 'fresh_firestore').length,
    avgFirestoreReads: events.length
      ? Number((events.reduce((sum, event) => sum + (event.firestoreReadCount || 0), 0) / events.length).toFixed(2))
      : 0,
    maxFirestoreReads: events.reduce((max, event) => Math.max(max, event.firestoreReadCount || 0), 0),
    threadWrites: events.filter((event) => event.threadWritten).length,
    unitsConsumed: events.reduce((sum, event) => sum + event.unitsConsumed, 0),
    realCostPaise: events.reduce((sum, event) => sum + event.realCostPaise, 0),
    ownerChargePaise: events.reduce((sum, event) => sum + event.ownerChargePaise, 0),
    byStatus,
    byIntent,
    sourceCoverage: buildSourceCoverage(events),
  };
}

export const GET = withPlatformAuth(async (request: NextRequest, session: Session) => {
  let failureContext: Record<string, boolean | number | string | null | undefined> = {
    route: '/api/platform/owner-business-assistant/monitor',
    ...getBoundedRuntimeStringContext('requestPath', request.nextUrl.pathname),
  };

  try {
    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
    }
    failureContext = {
      ...failureContext,
      limit: parsed.data.limit,
    };

    const rateLimitResponse = await checkOwnerBusinessAssistantMonitorRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [eventsSnap, feedbackSnap] = await Promise.all([
      firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS)
        .orderBy('createdAt', 'desc')
        .limit(parsed.data.limit)
        .get(),
      firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get(),
    ]);

    const events = eventsSnap.docs.map(serializeDoc);
    return NextResponse.json({
      data: {
        summary: buildSummary(events),
        events,
        recentFeedback: feedbackSnap.docs.map(serializeFeedbackDoc),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_monitor_route_failed', error, failureContext);
    return NextResponse.json({ error: 'Failed to load Business Health monitor' }, { status: 500 });
  }
});
