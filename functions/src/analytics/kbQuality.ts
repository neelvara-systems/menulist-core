/**
 * KB Quality Intelligence Cloud Function
 * Analyzes knowledge base article effectiveness using Gemini AI
 * 
 * Firestore Path: insights/{tId}/stores/{sId}/ai/kbQuality/{articleId}
 * 
 * Runs: Weekly (Mondays)
 * Purpose: Identify low-quality KB articles that need improvement
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { analyzeKBArticleQuality } from '../services/gemini/kbQuality';
import { logTelemetry } from '../telemetry/logger';

// ================================================================
// TYPES
// ================================================================

interface KBArticle {
  id: string;
  title: string;
  category?: string;
  section?: string;
  content?: string;
  lastUpdated?: string;
}

interface QueryData {
  query: string;
  confidence?: number;
  feedback?: 'positive' | 'negative';
  feedbackComment?: string;
  timestamp: Date;
}

interface KBQualityAnalysis {
  articleId: string;
  articleTitle: string;
  qualityScore: number;
  issues: Array<{
    type: 'low_confidence' | 'negative_feedback' | 'no_answer';
    queries: string[];
    suggestions: string[];
  }>;
  improvementSuggestions: string[];
  priority: 'low' | 'medium' | 'high';
  analyzedAt: Date;
  dataRange: {
    start: Date;
    end: Date;
  };
  tId: string;
  sId: string;
  promptVersion: string;
}

// ================================================================
// MAIN FUNCTIONS
// ================================================================

/**
 * Analyze KB quality for a single store
 */
export async function analyzeKBQualityForStore(
  tId: string,
  sId: string,
  daysBack: number = 30
): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`[KB Quality] Starting analysis for store: ${tId}/${sId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch KB articles (from your existing KB collection)
    const articles = await fetchKBArticles(tId, sId);

    if (articles.length === 0) {
      console.log(`[KB Quality] No KB articles found for ${tId}/${sId}`);
      return;
    }

    console.log(`[KB Quality] Found ${articles.length} KB articles to analyze`);

    let analyzed = 0;
    let failed = 0;

    // Analyze each article
    for (const article of articles) {
      try {
        // Gather performance data for this article
        const queries = await fetchArticleQueries(tId, sId, article.id, startDate, endDate);

        // Skip if no data
        if (queries.length === 0) {
          console.log(`[KB Quality] No query data for article: ${article.title}`);
          continue;
        }

        // Categorize queries
        const lowConfidenceQueries = queries
          .filter(q => q.confidence && q.confidence < 0.6)
          .map(q => q.query);

        const negativeFeedback = queries
          .filter(q => q.feedback === 'negative')
          .map(q => ({ query: q.query, comment: q.feedbackComment || 'No comment' }));

        const noAnswerQueries = queries
          .filter(q => q.confidence === 0 || q.confidence === undefined)
          .map(q => q.query);

        // Analyze with Gemini
        const analysis = await analyzeKBArticleQuality({
          article: {
            title: article.title,
            category: article.category,
            section: article.section,
            content: article.content,
            lastUpdated: article.lastUpdated,
          },
          lowConfidenceQueries: lowConfidenceQueries.slice(0, 10), // Limit to top 10
          negativeFeedback: negativeFeedback.slice(0, 10),
          noAnswerQueries: noAnswerQueries.slice(0, 10),
        });

        // Store result
        await storeKBQualityAnalysis({
          articleId: article.id,
          articleTitle: article.title,
          qualityScore: analysis.qualityScore,
          issues: analysis.issues,
          improvementSuggestions: analysis.improvementSuggestions,
          priority: analysis.priority,
          analyzedAt: new Date(),
          dataRange: { start: startDate, end: endDate },
          tId,
          sId,
          promptVersion: 'v1',
        });

        analyzed++;
        console.log(`[KB Quality] Analyzed: ${article.title} (Score: ${analysis.qualityScore})`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failed++;
        console.error(`[KB Quality] Failed to analyze article ${article.title}:`, error);
      }
    }

    const elapsed = Date.now() - startTime;

    console.log(`[KB Quality] Complete for ${tId}/${sId}: ${analyzed} analyzed, ${failed} failed, ${elapsed}ms`);

    // Log success telemetry
    await logTelemetry('kbQuality', {
      status: 'success',
      runTime: elapsed,
      recordsProcessed: analyzed,
      completedAt: Timestamp.now(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[KB Quality] Error for ${tId}/${sId}:`, error);

    // Log failure telemetry
    await logTelemetry('kbQuality', {
      status: 'failed',
      runTime: elapsed,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Timestamp.now(),
    });

    throw error;
  }
}

/**
 * Process KB quality for all stores (batch)
 */
export async function processKBQualityForAllStores(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('[KB Quality] Starting batch processing for all stores...');

    // Get all tenants
    const tenantsSnapshot = await db.collection(DB_COLLECTIONS.TENANTS).get();

    let totalStores = 0;
    let processedStores = 0;
    let failedStores = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tId = tenantDoc.id;

      // Get stores for this tenant
      const storesSnapshot = await db
        .collection(DB_COLLECTIONS.TENANTS)
        .doc(tId)
        .collection(DB_COLLECTIONS.STORES)
        .get();

      for (const storeDoc of storesSnapshot.docs) {
        const sId = storeDoc.id;
        totalStores++;

        try {
          await analyzeKBQualityForStore(tId, sId);
          processedStores++;
        } catch (error) {
          failedStores++;
          console.error(`[KB Quality] Failed for ${tId}/${sId}:`, error);
          // Continue with other stores
        }
      }
    }

    const elapsed = Date.now() - startTime;

    console.log(`[KB Quality] Batch complete: ${processedStores}/${totalStores} stores, ${failedStores} failed, ${elapsed}ms`);

    // Log batch telemetry
    await logTelemetry('kbQualityBatch', {
      status: 'success',
      runTime: elapsed,
      recordsProcessed: processedStores,
      completedAt: Timestamp.now(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[KB Quality] Batch processing error:', error);

    await logTelemetry('kbQualityBatch', {
      status: 'failed',
      runTime: elapsed,
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
 * Fetch KB articles from Firestore
 */
async function fetchKBArticles(tId: string, sId: string): Promise<KBArticle[]> {
  try {
    // Adjust this path based on your actual KB collection structure
    const kbSnapshot = await db
      .collection(DB_COLLECTIONS.TENANTS)
      .doc(tId)
      .collection(DB_COLLECTIONS.STORES)
      .doc(sId)
      .collection(DB_COLLECTIONS.KNOWLEDGE_BASE)
      .get();

    return kbSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || 'Untitled',
      category: doc.data().category,
      section: doc.data().section,
      content: doc.data().content,
      lastUpdated: doc.data().updatedAt?.toDate?.()?.toISOString?.() || doc.data().lastUpdated,
    }));
  } catch (error) {
    console.error('[KB Quality] Error fetching KB articles:', error);
    return [];
  }
}

/**
 * Fetch query data related to a KB article
 */
async function fetchArticleQueries(
  tId: string,
  sId: string,
  articleId: string,
  startDate: Date,
  endDate: Date
): Promise<QueryData[]> {
  try {
    // Fetch from aiSearchHistory or chatSessions
    const querySnapshot = await db
      .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('articleId', '==', articleId) // If you track article ID
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .limit(100)
      .get();

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        query: data.query || '',
        confidence: data.confidence,
        feedback: data.feedback,
        feedbackComment: data.feedbackComment,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      };
    });
  } catch (error) {
    console.error('[KB Quality] Error fetching article queries:', error);
    return [];
  }
}

/**
 * Store KB quality analysis in Firestore
 */
async function storeKBQualityAnalysis(analysis: KBQualityAnalysis): Promise<void> {
  try {
    const docPath = `insights/${analysis.tId}/stores/${analysis.sId}/ai/kbQuality`;

    await db
      .collection(docPath)
      .doc(analysis.articleId)
      .set({
        ...analysis,
        analyzedAt: analysis.analyzedAt,
        dataRange: {
          start: analysis.dataRange.start,
          end: analysis.dataRange.end,
        },
      });

    console.log(`[KB Quality] Stored analysis for article: ${analysis.articleTitle}`);
  } catch (error) {
    console.error('[KB Quality] Error storing analysis:', error);
    throw error;
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  analyzeKBQualityForStore,
  processKBQualityForAllStores,
};
