/**
 * Feedback Intelligence - AI-Powered Feedback Analysis
 * 
 * Analyzes recent negative feedback using Gemini to identify:
 * - Recurring themes and pain points
 * - Common user frustrations
 * - Actionable improvement suggestions
 * 
 * Runs: Daily (via masterScheduler)
 * Stores: insights/{tId}/stores/{sId}/ai/feedback
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { generateFeedbackAnalysis } from '../services/gemini/feedbackAnalysis';
import { logTelemetry } from '../telemetry/logger';

// ================================================================
// TYPES
// ================================================================

export interface FeedbackTheme {
  theme: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
  suggestedActions: string[];
}

export interface FeedbackIntelligence {
  tId: string;
  sId: string;
  date: string;
  themes: FeedbackTheme[];
  summary: string;
  topIssues: string[];
  recommendations: string[];
  totalFeedbackAnalyzed: number;
  generatedAt: Timestamp;
  promptVersion: string;
}

// ================================================================
// MAIN FUNCTION
// ================================================================

/**
 * Analyze recent feedback for a specific store
 */
export async function analyzeFeedbackIntelligence(
  tId: string,
  sId: string,
  daysBack: number = 7
): Promise<FeedbackIntelligence | null> {
  const startTime = Date.now();

  try {
    console.log(`[Feedback Intelligence] Starting analysis for store ${sId} (last ${daysBack} days)`);

    // Get recent negative feedback from chat sessions
    const feedback = await getRecentNegativeFeedback(tId, sId, daysBack);

    if (feedback.length === 0) {
      console.log(`[Feedback Intelligence] No negative feedback found for store ${sId}`);
      return null;
    }

    console.log(`[Feedback Intelligence] Found ${feedback.length} negative feedback items`);

    // Use Gemini to analyze feedback
    const analysis = await generateFeedbackAnalysis(feedback);

    // Store results
    const intelligence: FeedbackIntelligence = {
      tId,
      sId,
      date: new Date().toISOString().split('T')[0],
      themes: analysis.themes,
      summary: analysis.summary,
      topIssues: analysis.topIssues,
      recommendations: analysis.recommendations,
      totalFeedbackAnalyzed: feedback.length,
      generatedAt: Timestamp.now(),
      promptVersion: 'v1',
    };

    await saveFeedbackIntelligence(intelligence);

    // Log telemetry
    await logTelemetry('feedbackIntelligence', {
      status: 'success',
      runTime: Date.now() - startTime,
      recordsProcessed: feedback.length,
      completedAt: Timestamp.now(),
    });

    console.log(`[Feedback Intelligence] Analysis complete for store ${sId}`);
    return intelligence;

  } catch (error) {
    console.error(`[Feedback Intelligence] Error analyzing store ${sId}:`, error);

    await logTelemetry('feedbackIntelligence', {
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
 * Fetch recent negative feedback from chatAnalytics
 */
async function getRecentNegativeFeedback(
  tId: string,
  sId: string,
  daysBack: number
): Promise<Array<{ message: string; timestamp: string; context?: string }>> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Query chatAnalytics collection for negative feedback
  const snapshot = await db
    .collection(DB_COLLECTIONS.CHAT_ANALYTICS)
    .where('tId', '==', tId)
    .where('sId', '==', sId)
    .where('date', '>=', cutoffDateStr)
    .get();

  const feedbackItems: Array<{ message: string; timestamp: string; context?: string }> = [];

  snapshot.forEach((doc: any) => {
    const data = doc.data();

    // Extract negative feedback from the document
    if (data.negativeFeedback && Array.isArray(data.negativeFeedback)) {
      data.negativeFeedback.forEach((item: any) => {
        if (item.message) {
          feedbackItems.push({
            message: item.message,
            timestamp: item.createdOn || data.date,
            context: item.query || undefined,
          });
        }
      });
    }
  });

  // Limit to most recent 50 items to control Gemini token usage
  return feedbackItems.slice(0, 50);
}

/**
 * Save feedback intelligence to Firestore
 */
async function saveFeedbackIntelligence(intelligence: FeedbackIntelligence): Promise<void> {
  const docRef = db
    .collection(DB_COLLECTIONS.INSIGHTS)
    .doc(intelligence.tId)
    .collection(DB_COLLECTIONS.STORES)
    .doc(intelligence.sId)
    .collection('ai')
    .doc('feedback');

  await docRef.set(intelligence, { merge: true });

  console.log(`[Feedback Intelligence] Saved to insights/${intelligence.tId}/stores/${intelligence.sId}/ai/feedback`);
}

// ================================================================
// BATCH PROCESSING (For masterScheduler)
// ================================================================

/**
 * Process feedback intelligence for all stores
 * Called by masterScheduler
 */
export async function processFeedbackIntelligenceForAllStores(): Promise<void> {
  console.log('[Feedback Intelligence] Starting batch processing');

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
          await analyzeFeedbackIntelligence(tId, sId, 7);
        } catch (error) {
          console.error(`[Feedback Intelligence] Error processing store ${sId}:`, error);
          // Continue with next store
        }
      }
    }

    console.log('[Feedback Intelligence] Batch processing complete');
  } catch (error) {
    console.error('[Feedback Intelligence] Batch processing failed:', error);
    throw error;
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  analyzeFeedbackIntelligence,
  processFeedbackIntelligenceForAllStores,
};
