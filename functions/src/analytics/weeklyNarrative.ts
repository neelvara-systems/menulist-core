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
    console.log(`[Weekly Narrative] Starting generation for store ${sId}`);

    // Calculate week boundaries (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const weekStart = startDate.toISOString().split('T')[0];
    const weekEnd = endDate.toISOString().split('T')[0];

    // Gather week metrics
    const metrics = await getWeeklyMetrics(tId, sId, weekStart, weekEnd);

    if (!metrics || metrics.totalChats === 0) {
      console.log(`[Weekly Narrative] No data found for store ${sId}`);
      return null;
    }

    console.log(`[Weekly Narrative] Analyzing ${metrics.totalChats} chats`);

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

    console.log(`[Weekly Narrative] Generation complete for store ${sId}`);
    return narrative;

  } catch (error) {
    console.error(`[Weekly Narrative] Error generating for store ${sId}:`, error);

    await logTelemetry('weeklyNarrative', {
      status: 'failed',
      runTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
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
): Promise<any> {
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

  snapshot.forEach((doc: any) => {
    const data = doc.data();
    totalChats += data.totalChats || 0;
    totalSatisfied += data.satisfiedUsers || 0;
    totalFeedback += data.totalFeedback || 0;
    totalMessages += data.totalMessages || 0;

    // Aggregate categories
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

  prevSnapshot.forEach((doc: any) => {
    const data = doc.data();
    prevTotalChats += data.totalChats || 0;
    prevTotalSatisfied += data.satisfiedUsers || 0;
    prevTotalFeedback += data.totalFeedback || 0;
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
    .collection('ai')
    .doc('weekly');

  await docRef.set(narrative, { merge: true });

  console.log(`[Weekly Narrative] Saved to insights/${narrative.tId}/stores/${narrative.sId}/ai/weekly`);
}

// ================================================================
// BATCH PROCESSING (For masterScheduler)
// ================================================================

/**
 * Process weekly narrative for all stores
 * Called by masterScheduler on Sundays
 */
export async function processWeeklyNarrativeForAllStores(): Promise<void> {
  console.log('[Weekly Narrative] Starting batch processing');

  try {
    // Get all tenants
    const tenantsSnapshot = await db.collection(DB_COLLECTIONS.TENANTS).get();

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tId = tenantDoc.id;

      // Get all stores for this tenant
      const storesSnapshot = await db
        .collection(DB_COLLECTIONS.STORES)
        .where('tId', '==', tId)
        .get();

      for (const storeDoc of storesSnapshot.docs) {
        const sId = storeDoc.id;

        try {
          await generateWeeklyNarrativeForStore(tId, sId);
        } catch (error) {
          console.error(`[Weekly Narrative] Error processing store ${sId}:`, error);
          // Continue with next store
        }
      }
    }

    console.log('[Weekly Narrative] Batch processing complete');
  } catch (error) {
    console.error('[Weekly Narrative] Batch processing failed:', error);
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
