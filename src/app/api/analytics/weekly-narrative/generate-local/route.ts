export const dynamic = 'force-dynamic';
/**
 * Local Weekly Narrative Generation (No Cloud Function Required)
 * 
 * Generates weekly narrative directly from the API route
 * Works without Firebase Cloud Functions / Blaze plan
 * POST /api/analytics/weekly-narrative/generate-local
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_TEXT_MODEL } from '@constant/answerlattice/ai';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { getAnswerlatticeCompletedWeeklyWindows } from '@lib/answerlattice/analyticsIntelligenceContracts';
import {
  type AnswerlatticeChatAnalyticsDay,
  parseAnswerlatticeChatAnalyticsDay,
} from '@lib/answerlattice/chatAnalyticsContracts';
import { answerlatticeGenAIClient } from '@lib/answerlattice/genAiClient';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { withAuth } from '@/middleware/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

type WeeklyNarrativePayload = {
  highlights: string[];
  narrative: string;
  recommendations: string[];
};

const WEEKLY_NARRATIVE_LOCAL_ENDPOINT = '/api/analytics/weekly-narrative/generate-local';
const WEEKLY_NARRATIVE_CATEGORY_MAX_LENGTH = 80;
const WEEKLY_NARRATIVE_OUTPUT_TEXT_MAX_LENGTH = 500;
const WEEKLY_NARRATIVE_OUTPUT_LIST_ITEM_MAX_LENGTH = 220;
const WEEKLY_NARRATIVE_OUTPUT_LIST_MAX_ITEMS = 5;
const WEEKLY_NARRATIVE_DAYS = 7;

type WeeklyNarrativeAggregate = {
  totalChats: number;
  totalFeedback: number;
  totalMessages: number;
  totalPositiveFeedback: number;
  topQuestion: string;
};

const aggregateWeeklyNarrativeDays = (
  days: AnswerlatticeChatAnalyticsDay[],
): WeeklyNarrativeAggregate => {
  const questions = new Map<string, { label: string; count: number }>();
  let totalChats = 0;
  let totalFeedback = 0;
  let totalMessages = 0;
  let totalPositiveFeedback = 0;

  days.forEach((day) => {
    totalChats += day.totalChats;
    totalFeedback += day.totalFeedback;
    totalMessages += day.totalMessages;
    totalPositiveFeedback += day.positiveFeedback;
    day.topQuestions.forEach((question) => {
      const key = question.question.toLocaleLowerCase('en-US');
      const current = questions.get(key) || { label: question.question, count: 0 };
      current.count += question.count;
      questions.set(key, current);
    });
  });

  const topQuestion = Array.from(questions.values())
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'en-US'))[0]
    ?.label.slice(0, WEEKLY_NARRATIVE_CATEGORY_MAX_LENGTH) || 'No recurring question';
  return { totalChats, totalFeedback, totalMessages, totalPositiveFeedback, topQuestion };
};

const getWeeklyNarrativeRouteLogContext = (
  session: any,
  metadata: {
    highlightsCount?: number;
    recommendationsCount?: number;
    weekEnd?: unknown;
    weekStart?: unknown;
  } = {},
) => ({
  endpoint: WEEKLY_NARRATIVE_LOCAL_ENDPOINT,
  ...getBoundedRuntimeStringContext('tenantId', resolveAnswerlatticeSessionScope(session)?.tenantId),
  ...getBoundedRuntimeStringContext('storeId', resolveAnswerlatticeSessionScope(session)?.storeId),
  ...getBoundedRuntimeStringContext('userId', session?.uId),
  ...getBoundedRuntimeStringContext('weekStart', metadata.weekStart),
  ...getBoundedRuntimeStringContext('weekEnd', metadata.weekEnd),
  highlightsCount: metadata.highlightsCount,
  recommendationsCount: metadata.recommendationsCount,
});

const cleanWeeklyNarrativeOutputText = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[{}<>`$\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
};

const normalizeWeeklyNarrativeOutputText = (
  value: unknown,
  fallback: string,
  maxLength = WEEKLY_NARRATIVE_OUTPUT_TEXT_MAX_LENGTH,
): string => {
  const normalized = cleanWeeklyNarrativeOutputText(value, maxLength);
  if (normalized) return normalized;

  return cleanWeeklyNarrativeOutputText(fallback, maxLength) || 'No action needed.';
};

const normalizeWeeklyNarrativeOutputList = (value: unknown, fallback: string[]): string[] => {
  const source = Array.isArray(value) ? value : fallback;
  const normalized = source
    .map((entry) => cleanWeeklyNarrativeOutputText(entry, WEEKLY_NARRATIVE_OUTPUT_LIST_ITEM_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, WEEKLY_NARRATIVE_OUTPUT_LIST_MAX_ITEMS);

  if (normalized.length) return normalized;

  return fallback
    .map((entry) => cleanWeeklyNarrativeOutputText(entry, WEEKLY_NARRATIVE_OUTPUT_LIST_ITEM_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, WEEKLY_NARRATIVE_OUTPUT_LIST_MAX_ITEMS);
};

const stripJsonFence = (value: string) => {
  let text = value.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\n?/, '').replace(/```\n?$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\n?/, '').replace(/```\n?$/, '');
  }
  return text.trim();
};

const parseWeeklyNarrativeResponse = (
  text: string,
  fallback: WeeklyNarrativePayload,
  logContext: ReturnType<typeof getWeeklyNarrativeRouteLogContext>,
): WeeklyNarrativePayload => {
  try {
    const parsed = JSON.parse(stripJsonFence(text));
    const narrative = normalizeWeeklyNarrativeOutputText(parsed?.narrative, fallback.narrative);

    return {
      narrative,
      highlights: normalizeWeeklyNarrativeOutputList(parsed?.highlights, fallback.highlights),
      recommendations: normalizeWeeklyNarrativeOutputList(parsed?.recommendations, fallback.recommendations),
    };
  } catch (error) {
    logRuntimeFailure('weekly_narrative_response_parse_failed', error, {
      ...logContext,
      fallbackUsed: true,
    });
    return fallback;
  }
};

async function generateWeeklyNarrativeLocally(request: NextRequest, session: any) {
  let sessionForLog: any = session;
  let weekStartForLog: string | undefined;
  let weekEndForLog: string | undefined;

  try {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WEEKLY_DIGEST) {
      return NextResponse.json({ error: 'Weekly digest is not enabled.' }, { status: 403 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
      return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const tId = scope.tenantId;
    const sId = scope.storeId;

    // SAFE_MODE blocks the explicit provider call during maintenance.
    const { checkSafeMode } = await import('@lib/ops/safeMode');
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
    const rateLimit = await checkRateLimit({
      key: buildAnswerlatticeRateLimitKey(
        'answerlattice-weekly-narrative',
        session?.uId || session?.user?.id || 'unknown',
        tId,
        sId,
      ),
      ...rateLimitConfig,
    });
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: waitSeconds },
        {
          status: 429,
          headers: {
            'Retry-After': String(waitSeconds),
            'X-RateLimit-Limit': String(rateLimitConfig.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        },
      );
    }

    const permission = await requireAnswerlatticePermission(
      request,
      session,
      ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS,
    );
    if (permission.response) return permission.response;

    logger.info('[Weekly Narrative Local] Generating weekly narrative', getWeeklyNarrativeRouteLogContext(session));

    const weeklyWindows = getAnswerlatticeCompletedWeeklyWindows(new Date(), WEEKLY_NARRATIVE_DAYS);
    if (!weeklyWindows) throw new Error('weekly_narrative_time_invalid');
    const { weekStart, weekEnd, previousWeekStart, previousWeekEnd } = weeklyWindows;
    weekStartForLog = weekStart;
    weekEndForLog = weekEnd;

    const queryRange = (start: string, end: string) => answerlatticeFirestoreAdmin
      .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
      .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('date', '>=', start)
      .where('date', '<=', end)
      .orderBy('date', 'asc')
      .limit(WEEKLY_NARRATIVE_DAYS)
      .get();
    const [snapshot, previousSnapshot] = await Promise.all([
      queryRange(weekStart, weekEnd),
      queryRange(previousWeekStart, previousWeekEnd),
    ]);

    if (snapshot.empty) {
      return NextResponse.json({
        status: 'no_data',
        message: 'No completed analytics summary is available for the past week.',
      });
    }

    const parseSnapshot = (input: FirebaseFirestore.QuerySnapshot): AnswerlatticeChatAnalyticsDay[] => {
      const parsed = input.docs.map((document) => parseAnswerlatticeChatAnalyticsDay({
        id: document.id,
        value: document.data(),
        scope: { tId, sId },
      }));
      if (parsed.some((day) => !day)) {
        throw new Error('weekly_narrative_analytics_contract_invalid');
      }
      return parsed.flatMap((day) => day ? [day] : []);
    };
    const currentDays = parseSnapshot(snapshot);
    const previousDays = parseSnapshot(previousSnapshot);
    if (currentDays.some((day) => !day.sourceComplete)) {
      return NextResponse.json(
        { error: 'The weekly analytics summary is still incomplete. Try again after aggregation finishes.' },
        { status: 409 },
      );
    }

    const current = aggregateWeeklyNarrativeDays(currentDays);
    const previous = aggregateWeeklyNarrativeDays(previousDays);
    const volumeChange = previous.totalChats > 0
      ? ((current.totalChats - previous.totalChats) / previous.totalChats) * 100
      : 0;
    const currentSatRate = current.totalFeedback > 0
      ? (current.totalPositiveFeedback / current.totalFeedback) * 100
      : 0;
    const prevSatRate = previous.totalFeedback > 0
      ? (previous.totalPositiveFeedback / previous.totalFeedback) * 100
      : 0;
    const satisfactionChange = prevSatRate > 0 ? currentSatRate - prevSatRate : 0;
    const conversationLabel = current.totalChats === 1 ? 'conversation' : 'conversations';
    const fallbackNarrative: WeeklyNarrativePayload = {
      narrative: `Answerlattice reviewed ${current.totalChats} ${conversationLabel} for the week ending ${weekEnd}. The most frequent question was ${current.topQuestion}, with satisfaction at ${currentSatRate.toFixed(1)}%.`,
      highlights: [
        `${current.totalChats} ${conversationLabel} reviewed`,
        `${currentSatRate.toFixed(1)}% satisfaction rate`,
        `${current.topQuestion} was the most frequent question`,
      ],
      recommendations: [
        'Review the most common customer questions.',
        'Keep canonical answers and product details up to date.',
      ],
    };

    // 6. Generate AI narrative
    const prompt = `Generate a concise weekly performance summary for a chat support system.

Weekly Metrics:
- Total Conversations: ${current.totalChats}
- Satisfaction Rate: ${currentSatRate.toFixed(1)}%
- Avg Messages/Chat: ${(current.totalChats > 0 ? current.totalMessages / current.totalChats : 0).toFixed(1)}
- Volume Change: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}% vs last week
- Satisfaction Change: ${satisfactionChange > 0 ? '+' : ''}${satisfactionChange.toFixed(1)}% vs last week
- Most Frequent Question: ${current.topQuestion}

Generate a JSON response with:
{
  "narrative": "2-3 sentence executive summary",
  "highlights": ["3-5 key achievements or notable changes"],
  "recommendations": ["2-3 actionable recommendations"]
    }`;

    const operationStart = Date.now();
    const aiModel = ANSWERLATTICE_TEXT_MODEL;
    const geminiResult = await answerlatticeGenAIClient.models.generateContent({
      model: aiModel,
      contents: prompt,
    });
    const parsed = parseWeeklyNarrativeResponse(geminiResult.text ?? '', fallbackNarrative, getWeeklyNarrativeRouteLogContext(session, {
      weekEnd,
      weekStart,
    }));

    // 7. Save to Firestore
    const narrative = {
      pId: PRODUCT_IDS.ANSWERLATTICE,
      tId,
      sId,
      weekStart,
      weekEnd,
      narrative: parsed.narrative,
      highlights: parsed.highlights || [],
      recommendations: parsed.recommendations || [],
      keyMetrics: {
        volumeChange,
        satisfactionChange,
        topCategory: current.topQuestion,
      },
      generationMode: 'model_assisted',
      generatedAt: FieldValue.serverTimestamp(),
      promptVersion: 'v2-answerlattice-manual',
      sourceHash: FieldValue.delete(),
    };

    await answerlatticeFirestoreAdmin
      .collection(DB_COLLECTIONS.INSIGHTS)
      .doc(String(tId))
      .collection(DB_COLLECTIONS.STORES)
      .doc(String(sId))
      .collection(DB_COLLECTIONS.AI)
      .doc('weekly')
      .set(narrative, { merge: true });

    recordAnswerlatticeAiOperation({ tId, sId }, {
      action: AI_ACTIONS_TYPES.WEEKLY_NARRATIVE,
      billingMode: 'internal',
      clientResponse: {
        highlightsCount: parsed.highlights?.length || 0,
        narrativeLength: parsed.narrative?.length || 0,
        recommendationsCount: parsed.recommendations?.length || 0,
        weekEnd,
        weekStart,
      },
      geminiResponse: geminiResult,
      model: aiModel,
      processingTime: Date.now() - operationStart,
      source: 'answerlattice_weekly_narrative_manual',
    }, {
      id: session?.uId || session?.user?.id,
      name: session?.user?.name,
      email: session?.user?.email,
    }).catch((logError) => {
      logRuntimeFailure('weekly_narrative_operation_log_failed', logError, getWeeklyNarrativeRouteLogContext(session, {
        highlightsCount: parsed.highlights?.length || 0,
        recommendationsCount: parsed.recommendations?.length || 0,
        weekEnd,
        weekStart,
      }));
    });

    logger.info('[Weekly Narrative Local] Generated successfully', getWeeklyNarrativeRouteLogContext(session, {
      highlightsCount: parsed.highlights?.length || 0,
      recommendationsCount: parsed.recommendations?.length || 0,
      weekEnd,
      weekStart,
    }));

    // 8. Return success
    return NextResponse.json({
      success: true,
      message: 'Weekly narrative generated successfully',
      data: {
        weekStart,
        weekEnd,
        narrativeLength: parsed.narrative.length,
        highlightsCount: parsed.highlights.length,
      },
    });

  } catch (error: unknown) {
    if (isAIProviderRateLimitError(error)) {
      const retryAfter = getAIProviderRetryAfter(error) || 60;
      return NextResponse.json(
        { error: 'Weekly digest generation is temporarily busy. Please try again later.', retryAfter },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(retryAfter),
          },
        },
      );
    }
    logRuntimeFailure('weekly_narrative_local_generation_failed', error, getWeeklyNarrativeRouteLogContext(sessionForLog, {
      weekEnd: weekEndForLog,
      weekStart: weekStartForLog,
    }));

    return NextResponse.json(
      {
        error: 'Failed to generate weekly narrative',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(generateWeeklyNarrativeLocally);
