/**
 * Analytics Comparison Engine
 * Calculates week-over-week, month-over-month, and custom period comparisons
 */

// ================================================================
// TYPES
// ================================================================

export interface AnalyticsSummary {
  totalChats: number;
  positiveFeedbackShare: number | null;
  avgMessagesPerChat: number;
  totalMessages: number;
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
}

export interface ComparisonResult {
  current: number | null;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  displayChange: number | null;
  changeUnit: 'percent' | 'percentage-points';
  available: boolean;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Whether the trend is good for business
}

export interface PeriodComparison {
  volume: ComparisonResult;
  totalMessages: ComparisonResult;
  positiveFeedbackShare: ComparisonResult;
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
    positiveFeedbackShare: calculatePointChange(
      current.positiveFeedbackShare,
      previous.positiveFeedbackShare,
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
  const safeCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
  const safePrevious = Number.isFinite(previous) && previous >= 0 ? previous : 0;
  const change = safeCurrent - safePrevious;
  const changePercent = safePrevious > 0
    ? (change / safePrevious) * 100
    : safeCurrent > 0
      ? 100
      : 0;
  
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
    current: safeCurrent,
    previous: safePrevious,
    change,
    changePercent,
    displayChange: changePercent,
    changeUnit: 'percent',
    available: true,
    trend,
    isPositive,
  };
}

function calculatePointChange(
  current: number | null,
  previous: number | null,
): ComparisonResult {
  const safeCurrent = (
    typeof current === 'number'
    && Number.isFinite(current)
    && current >= 0
    && current <= 100
  ) ? current : null;
  const safePrevious = (
    typeof previous === 'number'
    && Number.isFinite(previous)
    && previous >= 0
    && previous <= 100
  ) ? previous : null;
  if (safeCurrent === null || safePrevious === null) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      change: null,
      changePercent: null,
      displayChange: null,
      changeUnit: 'percentage-points',
      available: false,
      trend: 'stable',
      isPositive: true,
    };
  }
  const change = safeCurrent - safePrevious;
  return {
    current: safeCurrent,
    previous: safePrevious,
    change,
    changePercent: safePrevious > 0 ? (change / safePrevious) * 100 : null,
    displayChange: change,
    changeUnit: 'percentage-points',
    available: true,
    trend: Math.abs(change) < 2 ? 'stable' : change > 0 ? 'up' : 'down',
    isPositive: change >= 0,
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
  const startUtc = new Date(Date.UTC(
    currentStart.getUTCFullYear(),
    currentStart.getUTCMonth(),
    currentStart.getUTCDate(),
  ));
  const endUtc = new Date(Date.UTC(
    currentEnd.getUTCFullYear(),
    currentEnd.getUTCMonth(),
    currentEnd.getUTCDate(),
  ));
  if (!Number.isFinite(startUtc.getTime()) || !Number.isFinite(endUtc.getTime()) || startUtc > endUtc) {
    throw new RangeError('analytics_comparison_date_range_invalid');
  }

  const shiftDays = (value: Date, days: number) => {
    const shifted = new Date(value);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted;
  };

  const shiftMonths = (value: Date, months: number) => {
    const targetYear = value.getUTCFullYear();
    const targetMonth = value.getUTCMonth() + months;
    const targetDay = value.getUTCDate();
    const target = new Date(Date.UTC(targetYear, targetMonth, 1));
    const lastDay = new Date(Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    target.setUTCDate(Math.min(targetDay, lastDay));
    return target;
  };

  switch (period) {
    case 'wow': {
      // Previous week (7 days back)
      const start = shiftDays(startUtc, -7);
      const end = shiftDays(endUtc, -7);
      return { start, end };
    }

    case 'mom': {
      // Previous calendar month, with month-end clamping.
      const start = shiftMonths(startUtc, -1);
      const end = shiftMonths(endUtc, -1);
      return { start, end };
    }

    case 'custom': {
      // Previous non-overlapping period with the same inclusive day count.
      const durationDays = Math.floor((endUtc.getTime() - startUtc.getTime()) / (24 * 60 * 60 * 1000));
      const end = shiftDays(startUtc, -1);
      const start = shiftDays(end, -durationDays);
      return { start, end };
    }

    default:
      throw new RangeError('analytics_comparison_period_invalid');
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
  const { displayChange, changeUnit, trend, isPositive } = result;
  if (!result.available || displayChange === null) {
    return { text: 'Not available', color: '#8c8c8c', icon: '→' };
  }

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

  const changeText = Math.abs(displayChange).toFixed(1);
  const suffix = changeUnit === 'percentage-points' ? ' pp' : '%';
  const text = trend === 'stable' 
    ? 'No change' 
    : `${icon} ${changeText}${suffix}`;

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

  const messages = messagesData
    .filter((message) => message.timestamp instanceof Date && Number.isFinite(message.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  const userMessage = messages.find(message => message.role === 'user');
  const assistantMessage = userMessage
    ? messages.find(message => (
      message.role === 'assistant'
      && message.timestamp.getTime() >= userMessage.timestamp.getTime()
    ))
    : undefined;

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
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 0;
  const safeResolved = Number.isFinite(resolvedCount)
    ? Math.min(Math.max(resolvedCount, 0), totalCount)
    : 0;
  return (safeResolved / totalCount) * 100;
}

/**
 * Calculate peak hours heatmap data
 */
export function calculatePeakHours(
  timestamps: Date[]
): Array<{ hour: number; count: number; intensity: number }> {
  const hourCounts: number[] = new Array(24).fill(0);

  timestamps.forEach(timestamp => {
    if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) return;
    const hour = timestamp.getUTCHours();
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
  const normalized = categories.map(category => ({
    name: category.name,
    count: Number.isFinite(category.count) && category.count > 0 ? category.count : 0,
  }));
  const total = normalized.reduce((sum, category) => sum + category.count, 0);

  return normalized
    .map(cat => ({
      ...cat,
      percentage: total > 0 ? (cat.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en-US'));
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
