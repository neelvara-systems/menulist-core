/**
 * Weekly Narrative - AI-Powered Weekly Summary
 * 
 * Generates executive summaries of weekly performance using Gemini:
 * - Key metrics and trends
 * - Highlights and achievements
 * - Areas for improvement
 * - Strategic recommendations
 * 
 * Runs: Weekly (Sunday via masterScheduler)
 * Stores: insights/{tId}/stores/{sId}/ai/weekly
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { generateWeeklyNarrative } from '../services/gemini/weeklyNarrative';
import { logTelemetry } from '../telemetry/logger';
import {
  analyticsLogger,
  getAnalyticsErrorContext,
  getAnalyticsIdContext,
} from './analyticsDiagnostics';

const WEEKLY_NARRATIVE_FAILURE = 'WEEKLY_NARRATIVE_FAILED';
const WEEKLY_NARRATIVE_STORE_FAILURE = 'WEEKLY_NARRATIVE_STORE_FAILED';
const WEEKLY_NARRATIVE_BATCH_FAILURE = 'WEEKLY_NARRATIVE_BATCH_FAILED';

interface WeeklyMetrics {
  totalChats: number;
  satisfactionRate: number;
  avgMessagesPerChat: number;
  totalFeedback: number;
  volumeChange: number;
  satisfactionChange: number;
  topCategory: string;
  categories: Array<{ name: string; count: number }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getNonNegativeMetric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeCategory(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
    : '';
}

function getWeeklyNarrativeScope(tId: string, sId: string): {
  tenantId: ReturnType<typeof getAnalyticsIdContext>;
  storeId: ReturnType<typeof getAnalyticsIdContext>;
} {
  return {
    tenantId: getAnalyticsIdContext(tId),
    storeId: getAnalyticsIdContext(sId),
  };
}

// ================================================================
// TYPES
// ================================================================

export interface WeeklyNarrative {
  tId: string;
  sId: string;
  weekStart: string;
  weekEnd: string;
  narrative: string;
  highlights: string[];
  recommendations: string[];
  keyMetrics: {
    volumeChange: number;
    satisfactionChange: number;
    topCategory: string;
  };
  generatedAt: Timestamp;
  promptVersion: string;
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Generate weekly narrative for a specific store
 */
export async function generateWeeklyNarrativeForStore(
  tId: string,
  sId: string
): Promise<WeeklyNarrative | null> {
  const startTime = Date.now();

  try {
    analyticsLogger.info(
      '[Weekly Narrative] Starting generation',
      getWeeklyNarrativeScope(tId, sId),
    );

    // Calculate seven inclusive calendar dates: today plus the prior six.
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const weekStart = startDate.toISOString().split('T')[0];
    const weekEnd = endDate.toISOString().split('T')[0];

    // Gather week metrics
    const metrics = await getWeeklyMetrics(tId, sId, weekStart, weekEnd);

    if (!metrics || metrics.totalChats === 0) {
      analyticsLogger.info('[Weekly Narrative] No weekly data found', {
        ...getWeeklyNarrativeScope(tId, sId),
        weekStart,
        weekEnd,
      });
      return null;
    }

    analyticsLogger.info('[Weekly Narrative] Metrics ready for narrative generation', {
      ...getWeeklyNarrativeScope(tId, sId),
      weekStart,
      weekEnd,
      totalChats: metrics.totalChats,
    });

    // Use Gemini to generate narrative
    const analysis = await generateWeeklyNarrative(metrics);

    // Store results
    const narrative: WeeklyNarrative = {
      tId,
      sId,
      weekStart,
      weekEnd,
      narrative: analysis.narrative,
      highlights: analysis.highlights,
      recommendations: analysis.recommendations,
      keyMetrics: analysis.keyMetrics,
      generatedAt: Timestamp.now(),
      promptVersion: 'v1',
    };

    await saveWeeklyNarrative(narrative);

    // Log telemetry
    await logTelemetry('weeklyNarrative', {
      status: 'success',
      runTime: Date.now() - startTime,
      recordsProcessed: metrics.totalChats,
      completedAt: Timestamp.now(),
    });

    analyticsLogger.info('[Weekly Narrative] Generation complete', {
      ...getWeeklyNarrativeScope(tId, sId),
      weekStart,
      weekEnd,
      totalChats: metrics.totalChats,
    });
    return narrative;

  } catch (error) {
    analyticsLogger.error('[Weekly Narrative] Store generation failed', {
      ...getWeeklyNarrativeScope(tId, sId),
      error: getAnalyticsErrorContext(error),
    });

    await logTelemetry('weeklyNarrative', {
      status: 'failed',
      runTime: Date.now() - startTime,
      error: WEEKLY_NARRATIVE_FAILURE,
      completedAt: Timestamp.now(),
    });

    throw error;
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Gather weekly metrics from chatAnalytics
 */
async function getWeeklyMetrics(
  tId: string,
  sId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyMetrics | null> {
  const snapshot = await db
    .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
    .where('tId', '==', tId)
    .where('sId', '==', sId)
    .where('date', '>=', weekStart)
    .where('date', '<=', weekEnd)
    .get();

  if (snapshot.empty) {
    return null;
  }

  // Aggregate metrics
  let totalChats = 0;
  let totalSatisfied = 0;
  let totalFeedback = 0;
  let totalMessages = 0;
  const categories: Record<string, number> = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalChats += getNonNegativeMetric(data.totalChats);
    totalSatisfied += getNonNegativeMetric(data.satisfiedUsers);
    totalFeedback += getNonNegativeMetric(data.totalFeedback);
    totalMessages += getNonNegativeMetric(data.totalMessages);

    // Aggregate categories
    if (data.topQuestions && Array.isArray(data.topQuestions)) {
      data.topQuestions.forEach((value: unknown) => {
        const question = asRecord(value);
        const category = normalizeCategory(question?.category);
        const count = getNonNegativeMetric(question?.count);
        if (category && count > 0) {
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

  // Calculate previous week for comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const prevSnapshot = await db
    .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
    .where('tId', '==', tId)
    .where('sId', '==', sId)
    .where('date', '>=', prevWeekStart.toISOString().split('T')[0])
    .where('date', '<=', prevWeekEnd.toISOString().split('T')[0])
    .get();

  let prevTotalChats = 0;
  let prevTotalSatisfied = 0;
  let prevTotalFeedback = 0;

  prevSnapshot.forEach((doc) => {
    const data = doc.data();
    prevTotalChats += getNonNegativeMetric(data.totalChats);
    prevTotalSatisfied += getNonNegativeMetric(data.satisfiedUsers);
    prevTotalFeedback += getNonNegativeMetric(data.totalFeedback);
  });

  // Calculate changes
  const volumeChange = prevTotalChats > 0
    ? ((totalChats - prevTotalChats) / prevTotalChats) * 100
    : 0;

  const currentSatRate = totalFeedback > 0 ? (totalSatisfied / totalFeedback) * 100 : 0;
  const prevSatRate = prevTotalFeedback > 0 ? (prevTotalSatisfied / prevTotalFeedback) * 100 : 0;
  const satisfactionChange = prevSatRate > 0 ? currentSatRate - prevSatRate : 0;

  return {
    totalChats,
    satisfactionRate: currentSatRate,
    avgMessagesPerChat: totalChats > 0 ? totalMessages / totalChats : 0,
    totalFeedback,
    volumeChange,
    satisfactionChange,
    topCategory,
    categories: Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

/**
 * Save weekly narrative to Firestore
 */
async function saveWeeklyNarrative(narrative: WeeklyNarrative): Promise<void> {
  const docRef = db
    .collection(DB_COLLECTIONS.INSIGHTS)
    .doc(narrative.tId)
    .collection(DB_COLLECTIONS.STORES)
    .doc(narrative.sId)
    .collection(DB_COLLECTIONS.AI)
    .doc('weekly');

  await docRef.set(narrative, { merge: true });

  analyticsLogger.info('[Weekly Narrative] Saved narrative result', {
    ...getWeeklyNarrativeScope(narrative.tId, narrative.sId),
  });
}

// ================================================================
// BATCH PROCESSING (For masterScheduler)
// ================================================================

/**
 * Process weekly narrative for all stores
 * Called by masterScheduler on Sundays
 */
export async function processWeeklyNarrativeForAllStores(): Promise<void> {
  analyticsLogger.info('[Weekly Narrative] Starting batch processing');

  try {
    // Get all tenants
    const tenantsSnapshot = await db.collection(DB_COLLECTIONS.TENANTS).get();
    let storeCount = 0;
    let failedStoreCount = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tId = tenantDoc.id;

      // Get all stores for this tenant
      const storesSnapshot = await db
        .collection(DB_COLLECTIONS.STORES)
        .where('tId', '==', tId)
        .get();

      for (const storeDoc of storesSnapshot.docs) {
        const sId = storeDoc.id;
        storeCount += 1;

        try {
          await generateWeeklyNarrativeForStore(tId, sId);
        } catch (error) {
          failedStoreCount += 1;
          analyticsLogger.error('[Weekly Narrative] Store processing failed', {
            ...getWeeklyNarrativeScope(tId, sId),
            failureCode: WEEKLY_NARRATIVE_STORE_FAILURE,
            error: getAnalyticsErrorContext(error),
          });
          // Continue with next store
        }
      }
    }

    analyticsLogger.info('[Weekly Narrative] Batch processing complete', {
      tenantCount: tenantsSnapshot.size,
      storeCount,
      failedStoreCount,
    });
  } catch (error) {
    analyticsLogger.error('[Weekly Narrative] Batch processing failed', {
      failureCode: WEEKLY_NARRATIVE_BATCH_FAILURE,
      error: getAnalyticsErrorContext(error),
    });
    throw error;
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  generateWeeklyNarrativeForStore,
  processWeeklyNarrativeForAllStores,
};
