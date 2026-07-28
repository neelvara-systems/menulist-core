/**
 * MenuList Functions monitoring thresholds.
 *
 * This module is intentionally owned by the Functions bundle. Importing an
 * extensionless TypeScript source from outside `functions/src` caused the
 * compiled CommonJS runtime to resolve a checked-in JavaScript shadow instead
 * of the TypeScript contract reviewed by the compiler.
 */

export const ALERT_THRESHOLDS = {
  ERROR_RATE_HIGH: 10,
  CRITICAL_ERROR_COUNT: 0,
  SATISFACTION_LOW: 60,
  RESPONSE_TIME_SLOW: 5000,
  KB_ARTICLES_MIN: 5,
  FIRESTORE_RESPONSE_SLOW: 500,
} as const;

export const ALERT_COOLDOWNS = {
  HIGH_ERROR_RATE: 60,
  LOW_SATISFACTION: 1440,
  LOW_KB_COVERAGE: 10080,
  SLOW_RESPONSE: 120,
  SYSTEM_DOWN: 15,
  DEFAULT: 60,
} as const;

export const ERROR_DEDUPLICATION = {
  WINDOW_HOURS: 1,
  MAX_OCCURRENCES: 5,
} as const;
