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
import type { NormalizedKnowledgeGap, NormalizedTopQuestion } from './normalizer';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';

export interface DateRange {
  start: Date;
  end: Date;
}

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface DashboardData {
  summary: {
    totalChats: number;
    satisfactionRate: number;
    avgMessagesPerChat: number;
    knowledgeGaps: number;
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
  weeklySummary?: {
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
    generatedAt: string;
  };
  feedbackIntelligence?: {
    date: string;
    themes: Array<{
      theme: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
      examples: string[];
      suggestedActions: string[];
    }>;
    summary: string;
    topIssues: string[];
    recommendations: string[];
    generatedAt: string;
  };
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
  session: any
): Promise<DashboardData> {
  try {
    // Calculate days from date range
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const { statistics, topQuestions, knowledgeGaps } = await getChatDashboardAggregatesOptimized(session, days);

    // Transform to unified format
    return {
      summary: {
        totalChats: statistics?.totalChats || 0,
        satisfactionRate: statistics?.satisfactionRate || 0,
        avgMessagesPerChat: statistics?.avgMessagesPerChat || 0,
        knowledgeGaps: knowledgeGaps?.length || 0,
        trends: {
          chatsChange: statistics?.trends?.chatsChange || 0,
          satisfactionChange: statistics?.trends?.satisfactionChange || 0,
        },
      },
      topQuestions: topQuestions || [],
      knowledgeGaps: knowledgeGaps || [],
      feedback: {
        positive: statistics?.positiveFeedback || 0,
        negative: statistics?.negativeFeedback || 0,
        total: statistics?.totalFeedback || 0,
        recent: statistics?.recentFeedback || [],
      },
      health: generateHealthMetrics(statistics),
    };
  } catch (error) {
    console.error('[DAL] Error fetching dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch AI-generated intelligence data
 */
export async function getAIIntelligence(
  tenantId: string,
  storeId: string
): Promise<AIIntelligenceData> {
  try {
    // Fetch from insights/{tId}/stores/{sId}/ai/*
    const weeklyRef = doc(firebaseClient, `insights/${tenantId}/stores/${storeId}/ai/weekly`);
    const feedbackRef = doc(firebaseClient, `insights/${tenantId}/stores/${storeId}/ai/feedback`);

    const [weeklyDoc, feedbackDoc] = await Promise.all([
      getDoc(weeklyRef),
      getDoc(feedbackRef),
    ]);

    // Parse weekly summary
    let weeklySummary: AIIntelligenceData['weeklySummary'];
    if (weeklyDoc.exists) {
      const data = weeklyDoc.data();
      weeklySummary = {
        weekStart: data?.weekStart || '',
        weekEnd: data?.weekEnd || '',
        narrative: data?.narrative || '',
        highlights: data?.highlights || [],
        recommendations: data?.recommendations || [],
        keyMetrics: data?.keyMetrics || {
          volumeChange: 0,
          satisfactionChange: 0,
          topCategory: 'General',
        },
        generatedAt: data?.generatedAt?.toDate().toISOString() || new Date().toISOString(),
      };
    }

    // Parse feedback intelligence
    let feedbackIntelligence: AIIntelligenceData['feedbackIntelligence'];
    if (feedbackDoc.exists) {
      const data = feedbackDoc.data();
      feedbackIntelligence = {
        date: data?.date || '',
        themes: data?.themes || [],
        summary: data?.summary || '',
        topIssues: data?.topIssues || [],
        recommendations: data?.recommendations || [],
        generatedAt: data?.generatedAt?.toDate().toISOString() || new Date().toISOString(),
      };
    }

    return {
      weeklySummary,
      feedbackIntelligence,
    };
  } catch (error) {
    console.error('[DAL] Error fetching AI intelligence:', error);
    throw error;
  }
}

/**
 * Fetch summary metrics only (lightweight)
 */
export async function getSummaryMetrics(
  dateRange: DateRange,
  session: any
): Promise<DashboardData['summary']> {
  try {
    // Calculate days from date range
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    const { statistics, knowledgeGaps } = await getChatDashboardAggregatesOptimized(session, days);

    return {
      totalChats: statistics?.totalChats || 0,
      satisfactionRate: statistics?.satisfactionRate || 0,
      avgMessagesPerChat: statistics?.avgMessagesPerChat || 0,
      knowledgeGaps: knowledgeGaps?.length || 0,
      trends: {
        chatsChange: statistics?.trends?.chatsChange || 0,
        satisfactionChange: statistics?.trends?.satisfactionChange || 0,
      },
    };
  } catch (error) {
    console.error('[DAL] Error fetching summary metrics:', error);
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
  activeUsers: number;
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
        activeUsers: 0, // Not in current summary, add later if needed
        totalMessages: 0, // Not in current summary
        totalFeedback: data.feedback.total,
        positiveCount: data.feedback.positive,
        negativeCount: data.feedback.negative,
      },
    };
  } catch (error) {
    console.error('[DAL] Error fetching analytics:', error);
    throw error;
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate system health metrics from statistics
 */
function generateHealthMetrics(statistics: any): DashboardData['health'] {
  const metrics: DashboardData['health'] = [];

  // API Response Time (mock for now - Phase 4 will add real monitoring)
  metrics.push({
    name: 'API Response Time',
    status: 'healthy',
    value: 245,
    threshold: 1000,
    unit: 'ms',
    message: 'All systems operational',
  });

  // KB Coverage based on knowledge gaps
  const totalQueries = statistics?.totalChats || 0;
  const unansweredQueries = statistics?.knowledgeGaps?.length || 0;
  const coverage = totalQueries > 0 ? ((totalQueries - unansweredQueries) / totalQueries) * 100 : 100;
  
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
