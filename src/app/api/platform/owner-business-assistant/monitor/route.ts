export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../../middleware/auth';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(10).max(100).optional().default(50),
});

function toIso(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function safeNumber(value: unknown): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function serializeValue(value: any): any {
  if (value == null) return value;
  if (typeof value.toDate === 'function' || typeof value.seconds === 'number') return toIso(value);
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }
  return value;
}

function serializeDoc(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    answerId: String(data.answerId || doc.id),
    threadId: data.threadId ? String(data.threadId) : null,
    tId: String(data.tId || ''),
    sId: String(data.sId || ''),
    userId: data.userId ? String(data.userId) : null,
    projectId: data.projectId ? String(data.projectId) : null,
    suggestedQuestionId: data.suggestedQuestionId ? String(data.suggestedQuestionId) : null,
    intent: String(data.intent || 'unknown'),
    question: String(data.question || ''),
    answerText: String(data.answerText || ''),
    status: String(data.status || 'unknown'),
    confidence: String(data.confidence || 'low'),
    freshnessLabel: String(data.freshnessLabel || ''),
    cacheSource: data.cacheSource ? String(data.cacheSource) : null,
    packetProfile: data.packetProfile ? String(data.packetProfile) : null,
    packetAgeMinutes: data.packetAgeMinutes == null ? null : safeNumber(data.packetAgeMinutes),
    packetValidUntil: toIso(data.packetValidUntil),
    route: data.route ? String(data.route) : null,
    firestoreReadCount: data.firestoreReadCount == null ? null : safeNumber(data.firestoreReadCount),
    firestoreWriteCount: data.firestoreWriteCount == null ? null : safeNumber(data.firestoreWriteCount),
    answerEventWritten: data.answerEventWritten === true,
    threadWritten: data.threadWritten === true,
    unsupportedReason: data.unsupportedReason ? String(data.unsupportedReason) : null,
    domainCoverage: Array.isArray(data.domainCoverage)
      ? data.domainCoverage.map((entry: any) => ({
        domain: String(entry?.domain || 'unknown'),
        status: String(entry?.status || 'unsupported'),
        reason: entry?.reason ? String(entry.reason) : null,
      })).slice(0, 20)
      : [],
    sourceFactCount: safeNumber(data.sourceFactCount),
    actionOptionCount: safeNumber(data.actionOptionCount),
    artifactCount: safeNumber(data.artifactCount),
    providerUsed: Boolean(data.providerUsed),
    aiAction: String(data.aiAction || ''),
    unitsConsumed: safeNumber(data.unitsConsumed),
    realCostPaise: safeNumber(data.realCostPaise),
    ownerChargePaise: safeNumber(data.ownerChargePaise),
    billingMode: String(data.billingMode || 'free'),
    createdAt: toIso(data.createdAt),
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
    needsConfirmation: byStatus.needs_confirmation || 0,
    providerCalls: events.filter((event) => event.providerUsed).length,
    serverCacheHits: events.filter((event) => event.cacheSource === 'server').length,
    freshFirestorePackets: events.filter((event) => event.cacheSource === 'fresh_firestore').length,
    avgFirestoreReads: events.length
      ? Number((events.reduce((sum, event) => sum + (event.firestoreReadCount || 0), 0) / events.length).toFixed(2))
      : 0,
    maxFirestoreReads: events.reduce((max, event) => Math.max(max, event.firestoreReadCount || 0), 0),
    threadWrites: events.filter((event) => event.threadWritten).length,
    actionOptionsShown: events.reduce((sum, event) => sum + event.actionOptionCount, 0),
    unitsConsumed: events.reduce((sum, event) => sum + event.unitsConsumed, 0),
    realCostPaise: events.reduce((sum, event) => sum + event.realCostPaise, 0),
    ownerChargePaise: events.reduce((sum, event) => sum + event.ownerChargePaise, 0),
    byStatus,
    byIntent,
    sourceCoverage: buildSourceCoverage(events),
  };
}

export const GET = withPlatformAuth(async (request: NextRequest) => {
  try {
    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
    }

    const [eventsSnap, actionsSnap, feedbackSnap] = await Promise.all([
      firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ANSWER_EVENTS)
        .orderBy('createdAt', 'desc')
        .limit(parsed.data.limit)
        .get(),
      firestoreAdmin
        .collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ACTIONS)
        .orderBy('createdAt', 'desc')
        .limit(30)
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
        recentActions: actionsSnap.docs.map((doc) => serializeValue({ id: doc.id, ...doc.data() })),
        recentFeedback: feedbackSnap.docs.map((doc) => serializeValue({ id: doc.id, ...doc.data() })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    secureError('[OwnerBusinessAssistantMonitor] Failed to load monitor data', error as Error, {
      path: request.nextUrl.pathname,
    });
    return NextResponse.json({ error: 'Failed to load Business Health monitor' }, { status: 500 });
  }
});
