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
  health: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    value: number;
    threshold: number;
    unit?: string;
    message?: string;
  }>;
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
      health: generateHealthMetrics(statistics, knowledgeGaps || []),
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
 * Simple summary type for comparison engine
 */
export interface AnalyticsSummary {
  totalChats: number;
  satisfactionRate: number;
  avgMessagesPerChat: number;
  totalMessages: number;
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
}

/**
 * Fetch analytics data for comparisons (wrapper for comparison engine)
 */
export async function getAnalytics(
  tenantId: string,
  storeId: string,
  dateRange: DateRange
): Promise<{ summary: AnalyticsSummary }> {
  try {
    // Build session context
    const session = { tId: tenantId, sId: storeId };
    
    // Fetch from optimized DAL
    const data = await getDashboardData(dateRange, session);

    // Return in format expected by comparison engine
    return {
      summary: {
        totalChats: data.summary.totalChats,
        satisfactionRate: data.summary.satisfactionRate,
        avgMessagesPerChat: data.summary.avgMessagesPerChat,
        totalMessages: data.summary.totalMessages,
        totalFeedback: data.feedback.total,
        positiveCount: data.feedback.positive,
        negativeCount: data.feedback.negative,
      },
    };
  } catch (error) {
    logAnalyticsFailure('analytics_comparison_fetch_failed', error, {
      ...getAnalyticsDalScopeContext(tenantId, storeId),
      ...getAnalyticsDalDateRangeContext(dateRange),
    });
    throw error;
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate system health metrics from statistics
 */
function generateHealthMetrics(
  statistics: {
    totalChats?: number;
    satisfactionRate?: number;
  } | null | undefined,
  knowledgeGaps: NormalizedKnowledgeGap[],
): DashboardData['health'] {
  const metrics: DashboardData['health'] = [];

  // Only emit health metrics backed by analytics aggregates. Infrastructure
  // latency/uptime metrics need a real monitoring source before they appear here.

  // KB Coverage based on knowledge gaps
  const totalQueries = statistics?.totalChats || 0;
  const unansweredQueries = knowledgeGaps.reduce((total, gap) => total + Math.max(0, Number(gap.count) || 0), 0);
  const rawCoverage = totalQueries > 0 ? ((totalQueries - unansweredQueries) / totalQueries) * 100 : 100;
  const coverage = Math.min(100, Math.max(0, rawCoverage));
  
  metrics.push({
    name: 'Knowledge Base Coverage',
    status: coverage >= 90 ? 'healthy' : coverage >= 75 ? 'warning' : 'critical',
    value: Math.round(coverage),
    threshold: 100,
    unit: '%',
    message: coverage >= 90 
      ? 'Excellent coverage' 
      : coverage >= 75
      ? `${100 - Math.round(coverage)}% of queries need better answers`
      : 'Critical: Many queries lack good answers',
  });

  // Satisfaction Health
  const satisfaction = statistics?.satisfactionRate || 0;
  metrics.push({
    name: 'User Satisfaction',
    status: satisfaction >= 80 ? 'healthy' : satisfaction >= 60 ? 'warning' : 'critical',
    value: satisfaction,
    threshold: 100,
    unit: '%',
    message: satisfaction >= 80
      ? 'Users are satisfied'
      : satisfaction >= 60
      ? 'Satisfaction below target'
      : 'Critical: Low user satisfaction',
  });

  return metrics;
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
