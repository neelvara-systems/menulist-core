export const dynamic = 'force-dynamic';
/**
 * Local Weekly Narrative Generation (No Cloud Function Required)
 * 
 * Generates weekly narrative directly from the API route
 * Works without Firebase Cloud Functions / Blaze plan
 * POST /api/analytics/weekly-narrative/generate-local
 */

import { GEMINI_MODELS } from '@constant/AI/models';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { logger } from '@lib/monitoring/logger';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from '@/middleware/auth';
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
const WEEKLY_NARRATIVE_TOP_QUESTIONS_SCAN_LIMIT = 25;
const WEEKLY_NARRATIVE_METRIC_MAX_VALUE = 1_000_000;

const normalizeWeeklyNarrativeMetric = (
  value: unknown,
  maxValue = WEEKLY_NARRATIVE_METRIC_MAX_VALUE,
): number => {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : 0;

  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return Math.min(numericValue, maxValue);
};

const normalizeWeeklyNarrativeCategory = (value: unknown): string => {
  if (typeof value !== 'string') return 'General';

  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[{}<>`$\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WEEKLY_NARRATIVE_CATEGORY_MAX_LENGTH)
    .trim();

  return normalized || 'General';
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
  ...getBoundedRuntimeStringContext('tenantId', session?.tId),
  ...getBoundedRuntimeStringContext('storeId', session?.sId),
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

export async function generateWeeklyNarrativeLocally(request: NextRequest, session: any) {
  let sessionForLog: any = session;
  let weekStartForLog: string | undefined;
  let weekEndForLog: string | undefined;

  try {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    const { checkSafeMode } = await import('@lib/ops/safeMode');
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    // 1. Scope validation. withAuth handles authentication, CORS, role, and blocked-account checks.
    if (!session?.tId || !session?.sId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tId = String(session.tId);
    const sId = String(session.sId);

    const rateLimitConfig = getRateLimitForFeature('BATCH_OPERATION');
    const userRateLimitHash = hashPublicRateLimitValue(session.uId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tId);
    const storeRateLimitHash = hashPublicRateLimitValue(sId);
    const rateLimit = await checkRateLimit({
      key: `weekly-narrative:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
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

    const permissionError = await requireAnyStorePermission(
      request,
      session,
      [PERMISSIONS.VIEW_ANALYTICS],
      'Weekly narrative',
    );
    if (permissionError) return permissionError;

    logger.info('[Weekly Narrative Local] Generating weekly narrative', getWeeklyNarrativeRouteLogContext(session));

    // 2. Import Gemini service (uses shared client — same pattern as descriptions/route.ts)
    const { genAIClient } = await import('@lib/google/genAi');

    if (!process.env.GEMINI_AI_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // 3. Fetch analytics data from Firestore
    const { firestoreAdmin } = await import('@lib/firebase/firebaseAdmin');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const weekStart = startDate.toISOString().split('T')[0];
    const weekEnd = endDate.toISOString().split('T')[0];
    weekStartForLog = weekStart;
    weekEndForLog = weekEnd;

    // Query chatAnalytics for the last 7 days
    const snapshot = await firestoreAdmin
      .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('date', '>=', weekStart)
      .where('date', '<=', weekEnd)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        status: 'no_data',
        message: 'No analytics data found for the past week. Please run backfill aggregation first.',
      });
    }

    // 4. Aggregate metrics
    let totalChats = 0;
    let totalSatisfied = 0;
    let totalFeedback = 0;
    let totalMessages = 0;
    const categories: Record<string, number> = Object.create(null);

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      totalChats += normalizeWeeklyNarrativeMetric(data.totalChats);
      totalSatisfied += normalizeWeeklyNarrativeMetric(data.satisfiedUsers);
      totalFeedback += normalizeWeeklyNarrativeMetric(data.totalFeedback);
      totalMessages += normalizeWeeklyNarrativeMetric(data.totalMessages);

      if (data.topQuestions && Array.isArray(data.topQuestions)) {
        data.topQuestions.slice(0, WEEKLY_NARRATIVE_TOP_QUESTIONS_SCAN_LIMIT).forEach((q: any) => {
          const category = normalizeWeeklyNarrativeCategory(q?.category);
          const count = normalizeWeeklyNarrativeMetric(q?.count);
          if (count > 0) {
            categories[category] = (categories[category] || 0) + count;
          }
        });
      }
    });

    // Find top category
    let topCategory = 'General';
    let maxCount = 0;
    Object.entries(categories).forEach(([cat, count]) => {
      if (count > maxCount) {
        topCategory = cat;
        maxCount = count;
      }
    });

    // 5. Calculate comparison with previous week
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevSnapshot = await firestoreAdmin
      .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('date', '>=', prevWeekStart.toISOString().split('T')[0])
      .where('date', '<=', prevWeekEnd.toISOString().split('T')[0])
      .get();

    let prevTotalChats = 0;
    let prevTotalSatisfied = 0;
    let prevTotalFeedback = 0;

    prevSnapshot.forEach((doc: any) => {
      const data = doc.data();
      prevTotalChats += normalizeWeeklyNarrativeMetric(data.totalChats);
      prevTotalSatisfied += normalizeWeeklyNarrativeMetric(data.satisfiedUsers);
      prevTotalFeedback += normalizeWeeklyNarrativeMetric(data.totalFeedback);
    });

    const volumeChange = prevTotalChats > 0
      ? ((totalChats - prevTotalChats) / prevTotalChats) * 100
      : 0;

    const currentSatRate = totalFeedback > 0 ? Math.min((totalSatisfied / totalFeedback) * 100, 100) : 0;
    const prevSatRate = prevTotalFeedback > 0 ? Math.min((prevTotalSatisfied / prevTotalFeedback) * 100, 100) : 0;
    const satisfactionChange = prevSatRate > 0 ? currentSatRate - prevSatRate : 0;
    const fallbackNarrative: WeeklyNarrativePayload = {
      narrative: `MenuList reviewed ${totalChats} customer conversations for the week ending ${weekEnd}. The main topic was ${topCategory}, with satisfaction at ${currentSatRate.toFixed(1)}%.`,
      highlights: [
        `${totalChats} conversations reviewed`,
        `${currentSatRate.toFixed(1)}% satisfaction rate`,
        `${topCategory} was the most common topic`,
      ],
      recommendations: [
        'Review the most common customer questions.',
        'Keep menu and business details up to date.',
      ],
    };

    // 6. Generate AI narrative
    const prompt = `Generate a concise weekly performance summary for a chat support system.

Weekly Metrics:
- Total Conversations: ${totalChats}
- Satisfaction Rate: ${currentSatRate.toFixed(1)}%
- Avg Messages/Chat: ${(totalChats > 0 ? totalMessages / totalChats : 0).toFixed(1)}
- Volume Change: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}% vs last week
- Satisfaction Change: ${satisfactionChange > 0 ? '+' : ''}${satisfactionChange.toFixed(1)}% vs last week
- Top Category: ${topCategory}

Generate a JSON response with:
{
  "narrative": "2-3 sentence executive summary",
  "highlights": ["3-5 key achievements or notable changes"],
  "recommendations": ["2-3 actionable recommendations"]
}`;

    const operationStart = Date.now();
    const aiModel = GEMINI_MODELS.TEXT_GEN;
    const geminiResult = await genAIClient.models.generateContent({
      model: aiModel,
      contents: prompt,
    });
    const parsed = parseWeeklyNarrativeResponse(geminiResult.text ?? '', fallbackNarrative, getWeeklyNarrativeRouteLogContext(session, {
      weekEnd,
      weekStart,
    }));

    // 7. Save to Firestore
    const narrative = {
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
        topCategory,
      },
      generatedAt: new Date(),
      promptVersion: 'v1-local',
    };

    await firestoreAdmin
      .collection(DB_COLLECTIONS.INSIGHTS)
      .doc(tId)
      .collection(DB_COLLECTIONS.STORES)
      .doc(sId)
      .collection(DB_COLLECTIONS.AI)
      .doc('weekly')
      .set(narrative, { merge: true });

    recordAiOperationForSession(session, {
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
      source: 'weekly_narrative_local',
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

  } catch (error: any) {
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
