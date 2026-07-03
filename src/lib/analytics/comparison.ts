/**
 * Analytics Comparison Engine
 * Calculates week-over-week, month-over-month, and custom period comparisons
 */

import type { AnalyticsSummary } from './dal';

// ================================================================
// TYPES
// ================================================================

export interface ComparisonResult {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Whether the trend is good for business
}

export interface PeriodComparison {
  volume: ComparisonResult;
  totalMessages: ComparisonResult;
  satisfaction: ComparisonResult;
  avgMessages: ComparisonResult;
}

export type ComparisonPeriod = 'wow' | 'mom' | 'custom';

// ================================================================
// COMPARISON LOGIC
// ================================================================

/**
 * Calculate comparison between two metric sets
 */
export function compareMetrics(
  current: AnalyticsSummary,
  previous: AnalyticsSummary
): PeriodComparison {
  return {
    volume: calculateChange(
      current.totalChats,
      previous.totalChats,
      true // Higher volume is positive
    ),
    totalMessages: calculateChange(
      current.totalMessages,
      previous.totalMessages,
      true // More answered messages indicates more support usage
    ),
    satisfaction: calculateChange(
      current.satisfactionRate,
      previous.satisfactionRate,
      true // Higher satisfaction is positive
    ),
    avgMessages: calculateChange(
      current.avgMessagesPerChat,
      previous.avgMessagesPerChat,
      false // Lower messages might indicate better answers
    ),
  };
}

/**
 * Calculate single metric change
 */
function calculateChange(
  current: number,
  previous: number,
  higherIsPositive: boolean
): ComparisonResult {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) < 2) {
    trend = 'stable'; // Less than 2% change is considered stable
  } else if (change > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }

  const isPositive = higherIsPositive 
    ? change >= 0 
    : change <= 0;

  return {
    current,
    previous,
    change,
    changePercent,
    trend,
    isPositive,
  };
}

// ================================================================
// PERIOD CALCULATIONS
// ================================================================

/**
 * Get date range for comparison period
 */
export function getComparisonDateRange(
  period: ComparisonPeriod,
  currentStart: Date,
  currentEnd: Date
): { start: Date; end: Date } {
  const duration = currentEnd.getTime() - currentStart.getTime();

  switch (period) {
    case 'wow': {
      // Previous week (7 days back)
      const start = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date(currentEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    }

    case 'mom': {
      // Previous month (30 days back)
      const start = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end };
    }

    case 'custom': {
      // Previous period of same duration
      const start = new Date(currentStart.getTime() - duration);
      const end = new Date(currentEnd.getTime() - duration);
      return { start, end };
    }

    default:
      return { start: currentStart, end: currentEnd };
  }
}

// ================================================================
// FORMATTING HELPERS
// ================================================================

/**
 * Format comparison result for display
 */
export function formatComparison(result: ComparisonResult): {
  text: string;
  color: string;
  icon: '↑' | '↓' | '→';
} {
  const { changePercent, trend, isPositive } = result;

  let icon: '↑' | '↓' | '→';
  let color: string;

  if (trend === 'stable') {
    icon = '→';
    color = '#8c8c8c'; // Neutral gray
  } else if (trend === 'up') {
    icon = '↑';
    color = isPositive ? '#52c41a' : '#ff4d4f'; // Green if positive, red if negative
  } else {
    icon = '↓';
    color = isPositive ? '#52c41a' : '#ff4d4f';
  }

  const percentText = Math.abs(changePercent).toFixed(1);
  const text = trend === 'stable' 
    ? 'No change' 
    : `${icon} ${percentText}%`;

  return { text, color, icon };
}

/**
 * Get human-readable period label
 */
export function getPeriodLabel(period: ComparisonPeriod): string {
  switch (period) {
    case 'wow':
      return 'vs Last Week';
    case 'mom':
      return 'vs Last Month';
    case 'custom':
      return 'vs Previous Period';
    default:
      return '';
  }
}

// ================================================================
// ADVANCED METRICS
// ================================================================

/**
 * Calculate First Response Time (FRT) from messages data
 */
export function calculateFirstResponseTime(
  messagesData: Array<{ timestamp: Date; role: 'user' | 'assistant' }>
): number {
  if (messagesData.length < 2) return 0;

  const userMessage = messagesData.find(m => m.role === 'user');
  const assistantMessage = messagesData.find(m => m.role === 'assistant');

  if (!userMessage || !assistantMessage) return 0;

  const diff = assistantMessage.timestamp.getTime() - userMessage.timestamp.getTime();
  return diff / 1000; // Return in seconds
}

/**
 * Calculate resolution rate from chat sessions
 */
export function calculateResolutionRate(
  resolvedCount: number,
  totalCount: number
): number {
  if (totalCount === 0) return 0;
  return (resolvedCount / totalCount) * 100;
}

/**
 * Calculate peak hours heatmap data
 */
export function calculatePeakHours(
  timestamps: Date[]
): Array<{ hour: number; count: number; intensity: number }> {
  const hourCounts = new Array(24).fill(0);

  timestamps.forEach(timestamp => {
    const hour = timestamp.getHours();
    hourCounts[hour]++;
  });

  const maxCount = Math.max(...hourCounts);

  return hourCounts.map((count, hour) => ({
    hour,
    count,
    intensity: maxCount > 0 ? (count / maxCount) * 100 : 0,
  }));
}

/**
 * Calculate category distribution
 */
export function calculateCategoryDistribution(
  categories: Array<{ name: string; count: number }>
): Array<{ name: string; count: number; percentage: number }> {
  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  return categories
    .map(cat => ({
      ...cat,
      percentage: total > 0 ? (cat.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  compareMetrics,
  getComparisonDateRange,
  formatComparison,
  getPeriodLabel,
  calculateFirstResponseTime,
  calculateResolutionRate,
  calculatePeakHours,
  calculateCategoryDistribution,
};
