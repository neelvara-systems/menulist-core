/**
 * KB Quality Intelligence Cloud Function
 * Analyzes knowledge base article effectiveness using Gemini AI
 * 
 * Firestore Path: insights/{tId}/stores/{sId}/ai/kbQuality
 * 
 * Runs: Weekly (Mondays)
 * Purpose: Identify low-quality KB articles that need improvement
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
  analyzeKBStoreQuality,
  type KBQualityStoreArticleInput,
  type KBQualityStoreResult,
} from '../services/gemini/kbQuality';
import { logTelemetry } from '../telemetry/logger';
import {
  analyticsLogger,
  getAnalyticsErrorContext,
  getAnalyticsIdContext,
} from './analyticsDiagnostics';

const KB_QUALITY_FAILURE = 'KB_QUALITY_FAILED';
const KB_QUALITY_BATCH_FAILURE = 'KB_QUALITY_BATCH_FAILED';
const KB_QUALITY_STORE_FAILURE = 'KB_QUALITY_STORE_FAILED';
const KB_QUALITY_ARTICLE_FAILURE = 'KB_QUALITY_ARTICLE_FAILED';
const KB_QUALITY_ARTICLE_FETCH_FAILURE = 'KB_QUALITY_ARTICLE_FETCH_FAILED';
const KB_QUALITY_QUERY_FETCH_FAILURE = 'KB_QUALITY_QUERY_FETCH_FAILED';
const KB_QUALITY_STORE_WRITE_FAILURE = 'KB_QUALITY_STORE_WRITE_FAILED';
const MAX_KB_QUALITY_ARTICLES_PER_STORE = 10;
const MAX_KB_QUALITY_QUERY_EXAMPLES_PER_ARTICLE = 5;

function getKBQualityScope(tId: string, sId: string, articleId?: string): {
  tenantId: ReturnType<typeof getAnalyticsIdContext>;
  storeId: ReturnType<typeof getAnalyticsIdContext>;
  articleId?: ReturnType<typeof getAnalyticsIdContext>;
} {
  return {
    tenantId: getAnalyticsIdContext(tId),
    storeId: getAnalyticsIdContext(sId),
    ...(articleId ? { articleId: getAnalyticsIdContext(articleId) } : {}),
  };
}

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

interface KBQualityArticleInsight {
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
  queryCount: number;
}

interface KBQualityStoreInsight {
  tId: string;
  sId: string;
  type: 'kbQuality';
  date: string;
  qualityScore: number;
  priority: 'low' | 'medium' | 'high';
  summary: string;
  topIssues: string[];
  improvementSuggestions: string[];
  articles: KBQualityArticleInsight[];
  articleCount: number;
  articlesWithSignals: number;
  articlesAnalyzed: number;
  articlesSkippedByCap: number;
  queryExamplesPerArticle: number;
  generatedAt: Timestamp;
  dataRange: {
    start: Timestamp;
    end: Timestamp;
  };
  promptVersion: string;
}

interface KBQualityArticleCandidate extends Omit<KBQualityStoreArticleInput, 'articleRef'> {
  articleId: string;
  queryCount: number;
  issueSignalCount: number;
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
    analyticsLogger.info('[KB Quality] Starting store analysis', {
      ...getKBQualityScope(tId, sId),
      daysBack,
    });

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch KB articles (from your existing KB collection)
    const articles = await fetchKBArticles(tId, sId);

    if (articles.length === 0) {
      analyticsLogger.info('[KB Quality] No KB articles found', getKBQualityScope(tId, sId));
      return;
    }

    analyticsLogger.info('[KB Quality] Article batch ready for analysis', {
      ...getKBQualityScope(tId, sId),
      articleCount: articles.length,
    });

    const candidates: KBQualityArticleCandidate[] = [];
    let articleQueryReads = 0;

    // Gather article signals first, then call Gemini once for the store.
    for (const article of articles) {
      try {
        // Gather performance data for this article
        const queries = await fetchArticleQueries(tId, sId, article.id, startDate, endDate);
        articleQueryReads += queries.length;

        // Skip if no data
        if (queries.length === 0) {
          analyticsLogger.info('[KB Quality] No query data for article', {
            ...getKBQualityScope(tId, sId, article.id),
            titleLength: article.title.length,
          });
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

        candidates.push({
          articleId: article.id,
          title: article.title,
          category: article.category,
          section: article.section,
          contentLength: article.content?.length || 0,
          lastUpdated: article.lastUpdated,
          lowConfidenceQueries: lowConfidenceQueries.slice(0, MAX_KB_QUALITY_QUERY_EXAMPLES_PER_ARTICLE),
          negativeFeedback: negativeFeedback.slice(0, MAX_KB_QUALITY_QUERY_EXAMPLES_PER_ARTICLE),
          noAnswerQueries: noAnswerQueries.slice(0, MAX_KB_QUALITY_QUERY_EXAMPLES_PER_ARTICLE),
          queryCount: queries.length,
          issueSignalCount: lowConfidenceQueries.length + negativeFeedback.length + noAnswerQueries.length,
        });
      } catch (error) {
        analyticsLogger.error('[KB Quality] Article analysis failed', {
          ...getKBQualityScope(tId, sId, article.id),
          titleLength: article.title.length,
          failureCode: KB_QUALITY_ARTICLE_FAILURE,
          error: getAnalyticsErrorContext(error),
        });
      }
    }

    const boundedCandidates = candidates
      .sort((a, b) => b.issueSignalCount - a.issueSignalCount || b.queryCount - a.queryCount || a.title.localeCompare(b.title))
      .slice(0, MAX_KB_QUALITY_ARTICLES_PER_STORE);

    if (boundedCandidates.length === 0) {
      analyticsLogger.info('[KB Quality] No query signals found for store', {
        ...getKBQualityScope(tId, sId),
        articleCount: articles.length,
        articleQueryReads,
      });
      await logTelemetry('kbQuality', {
        status: 'skipped',
        runTime: Date.now() - startTime,
        recordsProcessed: 0,
        completedAt: Timestamp.now(),
      });
      return;
    }

    const articleInputs: KBQualityStoreArticleInput[] = boundedCandidates.map((candidate, index) => ({
      articleRef: `A${index + 1}`,
      title: candidate.title,
      category: candidate.category,
      section: candidate.section,
      contentLength: candidate.contentLength,
      lastUpdated: candidate.lastUpdated,
      lowConfidenceQueries: candidate.lowConfidenceQueries,
      negativeFeedback: candidate.negativeFeedback,
      noAnswerQueries: candidate.noAnswerQueries,
    }));
    const candidateByRef = new Map(articleInputs.map((article, index) => [
      article.articleRef,
      boundedCandidates[index],
    ]));
    const analysis = await analyzeKBStoreQuality({
      articles: articleInputs,
      dataRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
    });
    const insight = buildKBQualityStoreInsight({
      tId,
      sId,
      articles,
      candidates,
      boundedCandidates,
      candidateByRef,
      analysis,
      startDate,
      endDate,
    });

    await saveKBQualityInsight(insight);

    const elapsed = Date.now() - startTime;

    analyticsLogger.info('[KB Quality] Store analysis complete', {
      ...getKBQualityScope(tId, sId),
      analyzed: insight.articlesAnalyzed,
      skippedByCap: insight.articlesSkippedByCap,
      runTime: elapsed,
    });

    // Log success telemetry
    await logTelemetry('kbQuality', {
      status: 'success',
      runTime: elapsed,
      recordsProcessed: insight.articlesAnalyzed,
      completedAt: Timestamp.now(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    analyticsLogger.error('[KB Quality] Store analysis failed', {
      ...getKBQualityScope(tId, sId),
      failureCode: KB_QUALITY_FAILURE,
      runTime: elapsed,
      error: getAnalyticsErrorContext(error),
    });

    // Log failure telemetry
    await logTelemetry('kbQuality', {
      status: 'failed',
      runTime: elapsed,
      error: KB_QUALITY_FAILURE,
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
    analyticsLogger.info('[KB Quality] Starting batch processing');

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
          analyticsLogger.error('[KB Quality] Store processing failed', {
            ...getKBQualityScope(tId, sId),
            failureCode: KB_QUALITY_STORE_FAILURE,
            error: getAnalyticsErrorContext(error),
          });
          // Continue with other stores
        }
      }
    }

    const elapsed = Date.now() - startTime;

    analyticsLogger.info('[KB Quality] Batch processing complete', {
      tenantCount: tenantsSnapshot.size,
      totalStores,
      processedStores,
      failedStores,
      runTime: elapsed,
    });

    // Log batch telemetry
    await logTelemetry('kbQualityBatch', {
      status: 'success',
      runTime: elapsed,
      recordsProcessed: processedStores,
      completedAt: Timestamp.now(),
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    analyticsLogger.error('[KB Quality] Batch processing failed', {
      failureCode: KB_QUALITY_BATCH_FAILURE,
      runTime: elapsed,
      error: getAnalyticsErrorContext(error),
    });

    await logTelemetry('kbQualityBatch', {
      status: 'failed',
      runTime: elapsed,
      error: KB_QUALITY_BATCH_FAILURE,
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
    analyticsLogger.error('[KB Quality] Article fetch failed', {
      ...getKBQualityScope(tId, sId),
      failureCode: KB_QUALITY_ARTICLE_FETCH_FAILURE,
      error: getAnalyticsErrorContext(error),
    });
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
    analyticsLogger.error('[KB Quality] Article query fetch failed', {
      ...getKBQualityScope(tId, sId, articleId),
      failureCode: KB_QUALITY_QUERY_FETCH_FAILURE,
      error: getAnalyticsErrorContext(error),
    });
    return [];
  }
}

function buildKBQualityStoreInsight(input: {
  tId: string;
  sId: string;
  articles: KBArticle[];
  candidates: KBQualityArticleCandidate[];
  boundedCandidates: KBQualityArticleCandidate[];
  candidateByRef: Map<string, KBQualityArticleCandidate>;
  analysis: KBQualityStoreResult;
  startDate: Date;
  endDate: Date;
}): KBQualityStoreInsight {
  const articleInsights = input.analysis.articles.flatMap((article): KBQualityArticleInsight[] => {
    const candidate = input.candidateByRef.get(article.articleRef);
    if (!candidate) return [];

    return [{
      articleId: candidate.articleId,
      articleTitle: candidate.title,
      qualityScore: article.qualityScore,
      issues: article.issues,
      improvementSuggestions: article.improvementSuggestions,
      priority: article.priority,
      queryCount: candidate.queryCount,
    }];
  });
  const topIssues = input.analysis.topIssues.length > 0
    ? input.analysis.topIssues
    : Array.from(new Set(articleInsights.flatMap((article) => article.issues.map((issue) => issue.type)))).slice(0, 5);

  return {
    tId: input.tId,
    sId: input.sId,
    type: 'kbQuality',
    date: new Date().toISOString().split('T')[0],
    qualityScore: input.analysis.qualityScore,
    priority: input.analysis.priority,
    summary: input.analysis.summary,
    topIssues,
    improvementSuggestions: input.analysis.improvementSuggestions,
    articles: articleInsights,
    articleCount: input.articles.length,
    articlesWithSignals: input.candidates.length,
    articlesAnalyzed: input.boundedCandidates.length,
    articlesSkippedByCap: Math.max(0, input.candidates.length - input.boundedCandidates.length),
    queryExamplesPerArticle: MAX_KB_QUALITY_QUERY_EXAMPLES_PER_ARTICLE,
    generatedAt: Timestamp.now(),
    dataRange: {
      start: Timestamp.fromDate(input.startDate),
      end: Timestamp.fromDate(input.endDate),
    },
    promptVersion: 'v1-store',
  };
}

/**
 * Store one KB quality insight document per store.
 */
async function saveKBQualityInsight(insight: KBQualityStoreInsight): Promise<void> {
  try {
    const docRef = db
      .collection(DB_COLLECTIONS.INSIGHTS)
      .doc(insight.tId)
      .collection(DB_COLLECTIONS.STORES)
      .doc(insight.sId)
      .collection(DB_COLLECTIONS.AI)
      .doc('kbQuality');

    await docRef.set(insight, { merge: true });

    analyticsLogger.info('[KB Quality] Stored store analysis', {
      ...getKBQualityScope(insight.tId, insight.sId),
      articleCount: insight.articlesAnalyzed,
      skippedByCap: insight.articlesSkippedByCap,
    });
  } catch (error) {
    analyticsLogger.error('[KB Quality] Store analysis write failed', {
      ...getKBQualityScope(insight.tId, insight.sId),
      failureCode: KB_QUALITY_STORE_WRITE_FAILURE,
      error: getAnalyticsErrorContext(error),
    });
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
