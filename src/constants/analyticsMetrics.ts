/**
 * Centralized Analytics & Monitoring Thresholds
 * 
 * Single source of truth for all alert thresholds, health check limits,
 * and performance benchmarks across the Admin Intelligence Layer.
 * 
 * WHY THIS FILE EXISTS:
 * - Eliminates scattered magic numbers across codebase
 * - Makes tuning thresholds after production analysis easy
 * - Enables AI-powered threshold optimization in the future
 * - Ensures consistency across frontend and backend
 * 
 * WHEN TO TUNE:
 * - After 7+ days of production monitoring
 * - When false alert rate is too high (>10%)
 * - When scaling to higher traffic volumes
 * - Based on industry benchmarks for your scale
 * 
 * HOW TO USE:
 * ```typescript
 * import { ALERT_THRESHOLDS } from '@constants/analyticsMetrics';
 * 
 * if (errorCount > ALERT_THRESHOLDS.ERROR_RATE_HIGH) {
 *   createAlert('High error rate');
 * }
 * ```
 */

// ================================================================
// ALERT THRESHOLDS
// ================================================================

export const ALERT_THRESHOLDS = {
  /**
   * Error Rate Threshold (errors per hour)
   * 
   * Current: 10 errors/hour triggers critical alert
   * Used in: alerts.ts (line 51), healthCheck.ts (line 236)
   * 
   * Tuning Guide:
   * - Low traffic (<100 users/day): 3-5 errors
   * - Medium traffic (100-1000 users/day): 5-10 errors
   * - High traffic (>1000 users/day): 10-20 errors
   * 
   * Example: If you have 500 users/day and getting false alerts,
   * increase this to 15.
   */
  ERROR_RATE_HIGH: 10,

  /**
   * Critical Error Threshold
   * 
   * Current: ANY critical error triggers immediate alert
   * Used in: healthCheck.ts (line 234)
   * 
   * Note: Critical errors always trigger alerts regardless of count
   */
  CRITICAL_ERROR_COUNT: 0,

  /**
   * Satisfaction Rate Threshold (percentage)
   * 
   * Current: Below 60% triggers warning alert
   * Used in: alerts.ts (line 62)
   * 
   * Industry Standards:
   * - Excellent: >80%
   * - Good: 70-80%
   * - Needs attention: 60-70%
   * - Critical: <60%
   * 
   * Example: SaaS industry average is 75%. Set to 65% if you're
   * building a complex product where users need time to learn.
   */
  SATISFACTION_LOW: 60,

  /**
   * Response Time Threshold (milliseconds)
   * 
   * Current: >5000ms (5 seconds) triggers slow response alert
   * Used in: alerts.ts (line 84)
   * 
   * Best Practices:
   * - Fast: <1000ms (1 second)
   * - Acceptable: 1000-3000ms
   * - Slow: 3000-5000ms
   * - Critical: >5000ms
   * 
   * Example: If using Gemini AI which takes 2-4 seconds normally,
   * set this to 8000ms to avoid false alerts.
   */
  RESPONSE_TIME_SLOW: 5000,

  /**
   * Knowledge Base Coverage Threshold (article count)
   * 
   * Current: <5 articles triggers low coverage warning
   * Used in: alerts.ts (line 73), healthCheck.ts (line 188)
   * 
   * Recommended Minimums:
   * - MVP: 5-10 articles
   * - Beta: 20-50 articles
   * - Production: 50+ articles
   * 
   * Example: If you cover 3 main topics with 2 articles each,
   * set this to 6.
   */
  KB_ARTICLES_MIN: 5,

  /**
   * Firestore Response Time (milliseconds)
   * 
   * Current: >500ms is considered slow
   * Used in: healthCheck.ts (line 115)
   * 
   * Typical Ranges:
   * - Same region: 50-200ms
   * - Cross-region: 200-500ms
   * - Slow/Issues: >500ms
   */
  FIRESTORE_RESPONSE_SLOW: 500,
} as const;

// ================================================================
// ALERT COOLDOWN PERIODS
// ================================================================

export const ALERT_COOLDOWNS = {
  /**
   * High Error Rate Cooldown
   * 
   * Current: 60 minutes (1 hour)
   * Used in: alerts.ts (line 57)
   * 
   * Prevents spam when errors persist. If same error condition
   * exists after 1 hour, a new alert will be sent.
   */
  HIGH_ERROR_RATE: 60, // minutes

  /**
   * Low Satisfaction Cooldown
   * 
   * Current: 1440 minutes (24 hours)
   * Used in: alerts.ts (line 68)
   * 
   * Satisfaction changes slowly. Daily alerts are sufficient.
   */
  LOW_SATISFACTION: 1440, // minutes

  /**
   * Low KB Coverage Cooldown
   * 
   * Current: 10080 minutes (1 week)
   * Used in: alerts.ts (line 79)
   * 
   * KB growth is gradual. Weekly reminders avoid spam.
   */
  LOW_KB_COVERAGE: 10080, // minutes

  /**
   * Slow Response Time Cooldown
   * 
   * Current: 120 minutes (2 hours)
   * Used in: alerts.ts (line 90)
   * 
   * Performance issues may be temporary. Check every 2 hours.
   */
  SLOW_RESPONSE: 120, // minutes

  /**
   * System Down Cooldown
   * 
   * Current: 15 minutes
   * Used in: alerts.ts (line 101)
   * 
   * Critical issues need frequent monitoring until resolved.
   */
  SYSTEM_DOWN: 15, // minutes

  /**
   * Default Cooldown
   * 
   * For alerts without specific cooldown defined
   */
  DEFAULT: 60, // minutes
} as const;

// ================================================================
// HEALTH CHECK THRESHOLDS
// ================================================================

export const HEALTH_THRESHOLDS = {
  /**
   * Health Score Ranges
   * 
   * Used for determining overall system status color/badge
   * Used in: SystemHealthDashboard.tsx
   */
  EXCELLENT: 90,  // Green status (90-100%)
  WARNING: 70,    // Yellow status (70-89%)
  // Below 70 = Red status (critical)

  /**
   * Component Status Determination
   * 
   * How many components need to fail before overall status changes
   */
  MAX_DEGRADED_COMPONENTS: 1,  // More than 1 degraded = system degraded
  MAX_DOWN_COMPONENTS: 0,      // ANY component down = system down
} as const;

// ================================================================
// PERFORMANCE BENCHMARKS
// ================================================================

export const PERFORMANCE_BENCHMARKS = {
  /**
   * First Response Time (seconds)
   * 
   * Time from user question to first AI response
   * Used in: AdvancedMetricsCards.tsx
   */
  FRT_FAST: 10,       // <10s = Instant
  FRT_ACCEPTABLE: 30, // 10-30s = Fast
  FRT_SLOW: 60,       // 30-60s = Acceptable
  // >60s = Slow

  /**
   * Resolution Rate (percentage)
   * 
   * How many questions get resolved without escalation
   * Used in: AdvancedMetricsCards.tsx
   */
  RESOLUTION_EXCELLENT: 90,  // >90% = Excellent
  RESOLUTION_GOOD: 80,       // 80-90% = Good
  RESOLUTION_LOW: 75,        // <75% = Needs improvement

  /**
   * Session Duration (seconds)
   * 
   * Average time users spend in a chat session
   */
  SESSION_SHORT: 60,    // <1 min = Quick resolution
  SESSION_NORMAL: 300,  // 1-5 min = Normal interaction
  SESSION_LONG: 600,    // >10 min = Complex issue
} as const;

// ================================================================
// DATA FRESHNESS THRESHOLDS
// ================================================================

export const DATA_FRESHNESS = {
  /**
   * Max age before data is considered stale (hours)
   * 
   * Used for: Determining when to show "data may be outdated" warning
   */
  STALE_AFTER_HOURS: 26,

  /**
   * Max age before forcing manual refresh (hours)
   * 
   * Used for: Blocking dashboard access until refresh
   */
  FORCE_REFRESH_AFTER_HOURS: 48,

  /**
   * Cache TTL (milliseconds)
   * 
   * Used for: SWR cache duration
   */
  CACHE_TTL: 60000, // 60 seconds
} as const;

// ================================================================
// ERROR DEDUPLICATION
// ================================================================

export const ERROR_DEDUPLICATION = {
  /**
   * Time window for grouping similar errors (hours)
   * 
   * Used in: errorTracking.ts (line 50)
   * 
   * Errors with same message within this window are counted
   * as occurrences rather than separate errors.
   */
  WINDOW_HOURS: 1,

  /**
   * Max occurrences before escalating severity
   * 
   * If same error occurs this many times, upgrade severity
   */
  MAX_OCCURRENCES: 5,
} as const;

// ================================================================
// AGGREGATED EXPORT
// ================================================================

/**
 * Export all thresholds as single object for convenience
 * 
 * Usage:
 * ```typescript
 * import { ANALYTICS_METRICS } from '@constants/analyticsMetrics';
 * 
 * const errorThreshold = ANALYTICS_METRICS.THRESHOLDS.ERROR_RATE_HIGH;
 * const cooldown = ANALYTICS_METRICS.COOLDOWNS.HIGH_ERROR_RATE;
 * ```
 */
export const ANALYTICS_METRICS = {
  THRESHOLDS: ALERT_THRESHOLDS,
  COOLDOWNS: ALERT_COOLDOWNS,
  HEALTH: HEALTH_THRESHOLDS,
  PERFORMANCE: PERFORMANCE_BENCHMARKS,
  FRESHNESS: DATA_FRESHNESS,
  ERROR_DEDUP: ERROR_DEDUPLICATION,
} as const;

/**
 * Helper function to convert minutes to milliseconds
 * 
 * Usage:
 * ```typescript
 * const cooldownMs = minutesToMs(ALERT_COOLDOWNS.HIGH_ERROR_RATE);
 * ```
 */
export const minutesToMs = (minutes: number): number => minutes * 60 * 1000;

/**
 * Helper function to convert hours to milliseconds
 */
export const hoursToMs = (hours: number): number => hours * 60 * 60 * 1000;

// ================================================================
// TYPE EXPORTS
// ================================================================

/**
 * Make all threshold values available as TypeScript types
 * Useful for type-safe threshold validation
 */
export type AlertThresholdKey = keyof typeof ALERT_THRESHOLDS;
export type AlertCooldownKey = keyof typeof ALERT_COOLDOWNS;
export type HealthThresholdKey = keyof typeof HEALTH_THRESHOLDS;
