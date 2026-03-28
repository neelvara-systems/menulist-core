/**
 * Analytics Metrics Constants
 * Centralized thresholds and configuration for system health monitoring
 * 
 * Benefits:
 * - Consistent alerting across dashboard
 * - Easy to adjust thresholds without code changes
 * - Future: Can be made configurable per tenant
 * - Enables AI-driven anomaly detection
 */

// ================================================================
// HEALTH THRESHOLDS
// ================================================================

export const HEALTH_THRESHOLDS = {
  // API Performance
  API_RESPONSE_TIME: {
    healthy: 500, // ms
    warning: 1000, // ms
    critical: 2000, // ms
  },

  // Knowledge Base Quality
  KB_COVERAGE: {
    healthy: 90, // %
    warning: 75, // %
    critical: 60, // %
  },

  // User Satisfaction
  SATISFACTION_RATE: {
    healthy: 80, // %
    warning: 60, // %
    critical: 40, // %
  },

  // Feedback Response Rate
  FEEDBACK_RESPONSE_RATE: {
    healthy: 70, // %
    warning: 50, // %
    critical: 30, // %
  },

  // Error Rate
  ERROR_RATE: {
    healthy: 1, // %
    warning: 5, // %
    critical: 10, // %
  },
} as const;

// ================================================================
// TREND THRESHOLDS (For highlighting significant changes)
// ================================================================

export const TREND_THRESHOLDS = {
  // Percentage change to show as "significant"
  SIGNIFICANT_INCREASE: 10, // % (e.g., +10% chats is significant)
  SIGNIFICANT_DECREASE: -10, // % (e.g., -10% satisfaction is significant)

  // Volume changes
  VOLUME_SPIKE: 50, // % (e.g., +50% chat volume = spike)
  VOLUME_DROP: -30, // % (e.g., -30% chat volume = concerning drop)
} as const;

// ================================================================
// ALERT PRIORITIES
// ================================================================

export const ALERT_PRIORITIES = {
  // Knowledge gaps
  KNOWLEDGE_GAP_HIGH: 10, // Occurrences threshold for "high severity"
  KNOWLEDGE_GAP_MEDIUM: 5, // Occurrences threshold for "medium severity"

  // Feedback issues
  NEGATIVE_FEEDBACK_HIGH: 15, // Count threshold for high priority
  NEGATIVE_FEEDBACK_MEDIUM: 8, // Count threshold for medium priority

  // Regeneration rate (indicates poor first-answer quality)
  REGENERATION_RATE_HIGH: 20, // % (20%+ regenerations = problem)
  REGENERATION_RATE_MEDIUM: 10, // % (10-20% regenerations = watch)
} as const;

// ================================================================
// DATA REFRESH INTERVALS (milliseconds)
// ================================================================

export const REFRESH_INTERVALS = {
  // SWR deduplication interval
  SWR_DEDUPE: 60000, // 1 minute

  // Auto-refresh intervals
  DASHBOARD_AUTO_REFRESH: 300000, // 5 minutes
  REAL_TIME_METRICS: 30000, // 30 seconds (for "today" stats)
  AI_INTELLIGENCE: 3600000, // 1 hour (AI summaries don't change often)

  // Polling fallback (if real-time fails)
  POLLING_FALLBACK: 15000, // 15 seconds
} as const;

// ================================================================
// DISPLAY LIMITS
// ================================================================

export const DISPLAY_LIMITS = {
  // List items to show
  TOP_QUESTIONS: 10,
  KNOWLEDGE_GAPS: 10,
  RECENT_FEEDBACK: 15,
  WEEKLY_HIGHLIGHTS: 5,

  // Chart data points
  TREND_CHART_DAYS: 30, // Default days to show in trends
  MAX_CHART_POINTS: 90, // Maximum data points in a single chart

  // Export limits
  MAX_EXPORT_ROWS: 10000, // CSV/JSON export limit
} as const;

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Determine health status based on value and thresholds
 */
export function getHealthStatus(
  value: number,
  thresholds: { healthy: number; warning: number; critical: number },
  inverted: boolean = false
): 'healthy' | 'warning' | 'critical' {
  if (inverted) {
    // For metrics where lower is better (e.g., error rate, response time)
    if (value <= thresholds.healthy) return 'healthy';
    if (value <= thresholds.warning) return 'warning';
    return 'critical';
  } else {
    // For metrics where higher is better (e.g., satisfaction, coverage)
    if (value >= thresholds.healthy) return 'healthy';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  }
}

/**
 * Determine if a trend is significant
 */
export function isSignificantTrend(changePercent: number): boolean {
  return (
    changePercent >= TREND_THRESHOLDS.SIGNIFICANT_INCREASE ||
    changePercent <= TREND_THRESHOLDS.SIGNIFICANT_DECREASE
  );
}

/**
 * Determine knowledge gap severity
 */
export function getGapSeverity(count: number): 'low' | 'medium' | 'high' {
  if (count >= ALERT_PRIORITIES.KNOWLEDGE_GAP_HIGH) return 'high';
  if (count >= ALERT_PRIORITIES.KNOWLEDGE_GAP_MEDIUM) return 'medium';
  return 'low';
}

/**
 * Determine feedback issue priority
 */
export function getFeedbackPriority(count: number): 'low' | 'medium' | 'high' {
  if (count >= ALERT_PRIORITIES.NEGATIVE_FEEDBACK_HIGH) return 'high';
  if (count >= ALERT_PRIORITIES.NEGATIVE_FEEDBACK_MEDIUM) return 'medium';
  return 'low';
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  HEALTH_THRESHOLDS,
  TREND_THRESHOLDS,
  ALERT_PRIORITIES,
  REFRESH_INTERVALS,
  DISPLAY_LIMITS,
  getHealthStatus,
  isSignificantTrend,
  getGapSeverity,
  getFeedbackPriority,
};
