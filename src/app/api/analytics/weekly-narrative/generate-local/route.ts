export const dynamic = 'force-dynamic';
/**
 * Local Weekly Narrative Generation (No Cloud Function Required)
 * 
 * Generates weekly narrative directly from the API route
 * Works without Firebase Cloud Functions / Blaze plan
 * POST /api/analytics/weekly-narrative/generate-local
 */

import getActiveSession from '@lib/auth/getActiveSession';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    const { checkSafeMode } = await import('@lib/ops/safeMode');
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    // 1. Authentication
    const session = await getActiveSession();
    if (!session?.tId || !session?.sId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tId = String(session.tId);
    const sId = String(session.sId);

    console.log(`[Weekly Narrative Local] Generating for tenant ${tId}, store ${sId}`);

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
    const categories: Record<string, number> = {};

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      totalChats += data.totalChats || 0;
      totalSatisfied += data.satisfiedUsers || 0;
      totalFeedback += data.totalFeedback || 0;
      totalMessages += data.totalMessages || 0;

      if (data.topQuestions && Array.isArray(data.topQuestions)) {
        data.topQuestions.forEach((q: any) => {
          if (q.category) {
            categories[q.category] = (categories[q.category] || 0) + q.count;
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
      prevTotalChats += data.totalChats || 0;
      prevTotalSatisfied += data.satisfiedUsers || 0;
      prevTotalFeedback += data.totalFeedback || 0;
    });

    const volumeChange = prevTotalChats > 0
      ? ((totalChats - prevTotalChats) / prevTotalChats) * 100
      : 0;

    const currentSatRate = totalFeedback > 0 ? (totalSatisfied / totalFeedback) * 100 : 0;
    const prevSatRate = prevTotalFeedback > 0 ? (prevTotalSatisfied / prevTotalFeedback) * 100 : 0;
    const satisfactionChange = prevSatRate > 0 ? currentSatRate - prevSatRate : 0;

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
    const geminiResult = await genAIClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    let text = geminiResult.text ?? '';

    // Clean markdown
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const parsed = JSON.parse(text);

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
      model: 'gemini-2.5-flash',
      processingTime: Date.now() - operationStart,
      source: 'weekly_narrative_local',
    }).catch((logError) => {
      console.error('[Weekly Narrative Local] Operation log failed:', logError);
    });

    console.log(`[Weekly Narrative Local] Generated successfully`);

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
    console.error('[Weekly Narrative Local] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate weekly narrative',
        details: error.message
      },
      { status: 500 }
    );
  }
}
