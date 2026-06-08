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
    actionOptionsShown: events.reduce((sum, event) => sum + event.actionOptionCount, 0),
    unitsConsumed: events.reduce((sum, event) => sum + event.unitsConsumed, 0),
    realCostPaise: events.reduce((sum, event) => sum + event.realCostPaise, 0),
    ownerChargePaise: events.reduce((sum, event) => sum + event.ownerChargePaise, 0),
    byStatus,
    byIntent,
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
