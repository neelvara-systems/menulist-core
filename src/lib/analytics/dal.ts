/**
 * Analytics Data Access Layer (DAL)
 * Single unified interface for fetching all analytics data
 * 
 * Benefits:
 * - Centralizes all Firestore queries
 * - Enables easy mocking for tests
 * - Prevents coupling between UI and data layer
 * - Makes it easy to switch data sources (Firestore → BigQuery, etc.)
 */

import { getChatDashboardAggregatesOptimized } from '@database/chatAnalytics';
import {
  parseAnswerlatticeFeedbackIntelligence,
  parseAnswerlatticeWeeklySummary,
  type AnswerlatticeFeedbackIntelligence,
  type AnswerlatticeWeeklySummary,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import { getAnswerlatticeAnalyticsQueryWindow } from '@lib/answerlattice/chatAnalyticsContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { NormalizedKnowledgeGap, NormalizedTopQuestion } from './normalizer';
import { doc, getDoc } from 'firebase/firestore';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

export interface DateRange {
  start: Date;
  end: Date;
}

type AnalyticsDalLogContext = Record<string, boolean | number | string | null | undefined>;

const getAnalyticsDalDateRangeContext = (dateRange: DateRange | null | undefined): AnalyticsDalLogContext => ({
  hasStartDate: dateRange?.start instanceof Date && Number.isFinite(dateRange.start.getTime()),
  hasEndDate: dateRange?.end instanceof Date && Number.isFinite(dateRange.end.getTime()),
  dateRangeDays: getAnswerlatticeAnalyticsQueryWindow(dateRange)?.dayCount ?? 0,
});

const getAnalyticsDalScopeContext = (
  tenantId: unknown,
  storeId: unknown,
): AnalyticsDalLogContext => ({
  ...getBoundedAnalyticsStringContext('tenantId', tenantId),
  ...getBoundedAnalyticsStringContext('storeId', storeId),
});

const getAnalyticsDalSessionContext = (session: unknown): AnalyticsDalLogContext => {
  const scope = resolveAnswerlatticeSessionScope(session);
  return getAnalyticsDalScopeContext(scope?.tenantId, scope?.storeId);
};

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface DashboardData {
  summary: {
    totalChats: number;
    totalMessages: number;
    satisfactionRate: number;
    avgMessagesPerChat: number;
    knowledgeGaps: number;
    isPartial: boolean;
    trends: {
      chatsChange: number;
      satisfactionChange: number;
    };
  };
  topQuestions: NormalizedTopQuestion[];
  knowledgeGaps: NormalizedKnowledgeGap[];
  feedback: {
    positive: number;
    negative: number;
    total: number;
    recent: Array<{
      id: string;
      message: string;
      isPositive: boolean;
      count: number;
      createdOn?: Date;
    }>;
  };
}

export interface AIIntelligenceData {
  weeklySummary?: AnswerlatticeWeeklySummary;
  feedbackIntelligence?: AnswerlatticeFeedbackIntelligence;
}

// ================================================================
// MAIN DAL FUNCTIONS
// ================================================================

/**
 * Fetch all dashboard data in a single call
 * This is the primary function used by the Insights page
 */
export async function getDashboardData(
  dateRange: DateRange,
  session: unknown,
): Promise<DashboardData> {
  try {
    const { statistics, topQuestions, knowledgeGaps } = await getChatDashboardAggregatesOptimized(session, dateRange);

    // Transform to unified format
    return {
      summary: {
        totalChats: statistics?.totalChats || 0,
        totalMessages: statistics?.totalMessages || 0,
        satisfactionRate: statistics?.satisfactionRate || 0,
        avgMessagesPerChat: statistics?.avgMessagesPerChat || 0,
        knowledgeGaps: knowledgeGaps?.length || 0,
        isPartial: statistics?.isPartial === true,
        trends: {
          chatsChange: 0,
          satisfactionChange: 0,
        },
      },
      topQuestions: topQuestions || [],
      knowledgeGaps: knowledgeGaps || [],
      feedback: {
        positive: statistics?.positiveFeedback || 0,
        negative: statistics?.negativeFeedback || 0,
        total: statistics?.totalFeedback || 0,
        recent: [],
      },
    };
  } catch (error) {
    logAnalyticsFailure('analytics_dashboard_data_fetch_failed', error, {
      ...getAnalyticsDalSessionContext(session),
      ...getAnalyticsDalDateRangeContext(dateRange),
    });
    throw error;
  }
}

/**
 * Fetch AI-generated intelligence data
 */
export async function getAIIntelligence(
  session: unknown,
): Promise<AIIntelligenceData> {
  const scope = resolveAnswerlatticeSessionScope(session);
  if (!scope) throw new Error('answerlattice_analytics_intelligence_scope_missing');

  try {
    // Fetch from insights/{tId}/stores/{sId}/ai/*
    const weeklyRef = doc(
      answerlatticeFirebaseClient,
      'insights',
      String(scope.tenantId),
      'stores',
      String(scope.storeId),
      'ai',
      'weekly',
    );
    const feedbackRef = doc(
      answerlatticeFirebaseClient,
      'insights',
      String(scope.tenantId),
      'stores',
      String(scope.storeId),
      'ai',
      'feedback',
    );

    const [weeklyDoc, feedbackDoc] = await Promise.all([
      getDoc(weeklyRef),
      getDoc(feedbackRef),
    ]);

    // Parse weekly summary
    const weeklySummary = weeklyDoc.exists()
      ? parseAnswerlatticeWeeklySummary(weeklyDoc.data(), scope) ?? undefined
      : undefined;

    // Parse feedback intelligence
    const feedbackIntelligence = feedbackDoc.exists()
      ? parseAnswerlatticeFeedbackIntelligence(feedbackDoc.data(), scope) ?? undefined
      : undefined;

    return {
      weeklySummary,
      feedbackIntelligence,
    };
  } catch (error) {
    logAnalyticsFailure(
      'analytics_ai_intelligence_fetch_failed',
      error,
      getAnalyticsDalScopeContext(scope.tenantId, scope.storeId),
    );
    throw error;
  }
}

/**
 * Fetch summary metrics only (lightweight)
 */
export async function getSummaryMetrics(
  dateRange: DateRange,
  session: unknown,
): Promise<DashboardData['summary']> {
  try {
    const { statistics, knowledgeGaps } = await getChatDashboardAggregatesOptimized(session, dateRange);

    return {
      totalChats: statistics?.totalChats || 0,
      totalMessages: statistics?.totalMessages || 0,
      satisfactionRate: statistics?.satisfactionRate || 0,
      avgMessagesPerChat: statistics?.avgMessagesPerChat || 0,
      knowledgeGaps: knowledgeGaps?.length || 0,
      isPartial: statistics?.isPartial === true,
      trends: {
        chatsChange: 0,
        satisfactionChange: 0,
      },
    };
  } catch (error) {
    logAnalyticsFailure('analytics_summary_metrics_fetch_failed', error, {
      ...getAnalyticsDalSessionContext(session),
      ...getAnalyticsDalDateRangeContext(dateRange),
    });
    throw error;
  }
}


/**
 * Format date range for Firestore queries
 */
export function formatDateRangeForQuery(dateRange: DateRange): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: dateRange.start.toISOString().split('T')[0],
    endDate: dateRange.end.toISOString().split('T')[0],
  };
}

// ================================================================
// EXPORTS
// ================================================================

// All types are exported via interface declarations above
