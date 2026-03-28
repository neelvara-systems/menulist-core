/**
 * Centralized Metrics Registry
 * Single source of truth for all metric keys and Firestore paths
 * 
 * This prevents typos, makes refactoring easier, and enables IDE autocomplete
 */

// ================================================================
// METRIC KEYS - All analytics metric identifiers
// ================================================================

export const METRIC_KEYS = {
  // Core Metrics
  TOTAL_CHATS: 'totalChats',
  TODAY_CHATS: 'todayChats',
  SATISFACTION_RATE: 'satisfactionRate',
  AVG_MESSAGES: 'avgMessagesPerChat',
  REGENERATION_RATE: 'regenerationRate',
  
  // Feedback Metrics
  POSITIVE_FEEDBACK: 'positiveFeedback',
  NEGATIVE_FEEDBACK: 'negativeFeedback',
  TOTAL_FEEDBACK: 'totalFeedback',
  FEEDBACK_RESPONSE_RATE: 'feedbackResponseRate',
  
  // Mode Metrics
  QNA_CHATS: 'qnaChats',
  ASSISTANT_CHATS: 'assistantChats',
  
  // Quality Metrics
  TOTAL_REGENERATIONS: 'totalRegenerations',
  TOTAL_MESSAGES: 'totalMessages',
  FIRST_ANSWER_SUCCESS_RATE: 'firstAnswerSuccessRate',
  
  // Time-based Metrics
  AVG_RESPONSE_TIME: 'avgResponseTime',
  AVG_SESSION_DURATION: 'avgSessionDuration',
} as const;

// ================================================================
// COLLECTION NAMES - All Firestore collection identifiers
// ================================================================

export const COLLECTIONS = {
  // Analytics Collections
  ANALYTICS: 'chatAnalytics',
  ANALYTICS_HISTORY: 'chatAnalyticsHistory',
  
  // Insights Collections
  INSIGHTS: 'insights',
  FEEDBACK_SUMMARY: 'feedbackSummary',
  WEEKLY_SUMMARIES: 'weeklySummaries',
  KB_QUALITY: 'kbQuality',
  
  // System Collections
  SYSTEM_LOGS: 'systemLogs',
  SYSTEM_TELEMETRY: 'systemTelemetry',
  SCHEDULER_LOCK: '_system',
  
  // Chat Data Collections
  CHAT_SESSIONS: 'chatSessions',
  AI_SEARCH_HISTORY: 'aiSearchHistory',
  
  // Existing Collections (from your codebase)
  TENANTS: 'tenants',
  STORES: 'stores',
  SUBSCRIPTIONS: 'subscriptions',
} as const;

// ================================================================
// DOCUMENT PATHS - Helper functions for consistent path generation
// ================================================================

export const PATHS = {
  // Analytics paths
  dailyStats: (tenantId: string, storeId: string, date: string) => 
    `${COLLECTIONS.ANALYTICS}/${tenantId}_${storeId}_${date}`,
  
  historicalStats: (tenantId: string, storeId: string) => 
    `${COLLECTIONS.ANALYTICS_HISTORY}/${tenantId}_${storeId}`,
  
  // Insights paths
  insightsRoot: (tenantId: string) => 
    `${COLLECTIONS.INSIGHTS}/${tenantId}`,
  
  feedbackSummary: (tenantId: string, date: string) => 
    `${COLLECTIONS.INSIGHTS}/${tenantId}/${COLLECTIONS.FEEDBACK_SUMMARY}/${date}`,
  
  weeklySummary: (tenantId: string, weekStart: string) => 
    `${COLLECTIONS.INSIGHTS}/${tenantId}/${COLLECTIONS.WEEKLY_SUMMARIES}/${weekStart}`,
  
  kbQuality: (tenantId: string, articleId: string) => 
    `${COLLECTIONS.INSIGHTS}/${tenantId}/${COLLECTIONS.KB_QUALITY}/${articleId}`,
  
  kbQualityAll: (tenantId: string) => 
    `${COLLECTIONS.INSIGHTS}/${tenantId}/${COLLECTIONS.KB_QUALITY}`,
  
  // System paths
  telemetry: (date: string) => 
    `${COLLECTIONS.SYSTEM_TELEMETRY}/${date}`,
  
  systemLogs: (tenantId: string, date: string) => 
    `${COLLECTIONS.SYSTEM_LOGS}/${tenantId}/${date}`,
  
  schedulerLock: () => 
    `${COLLECTIONS.SCHEDULER_LOCK}/schedulerLock`,
  
  // Tenant & Store paths
  tenant: (tenantId: string) => 
    `${COLLECTIONS.TENANTS}/${tenantId}`,
  
  store: (tenantId: string, storeId: string) => 
    `${COLLECTIONS.TENANTS}/${tenantId}/${COLLECTIONS.STORES}/${storeId}`,
  
  subscription: (tenantId: string, storeId: string, subscriptionId: string) => 
    `${COLLECTIONS.TENANTS}/${tenantId}/${COLLECTIONS.STORES}/${storeId}/${COLLECTIONS.SUBSCRIPTIONS}/${subscriptionId}`,
} as const;

// ================================================================
// TYPE EXPORTS - For type safety
// ================================================================

export type MetricKey = keyof typeof METRIC_KEYS;
export type CollectionName = keyof typeof COLLECTIONS;

// ================================================================
// HELPER UTILITIES
// ================================================================

/**
 * Get all metric keys as an array
 */
export function getAllMetricKeys(): string[] {
  return Object.values(METRIC_KEYS);
}

/**
 * Validate if a string is a valid metric key
 */
export function isValidMetricKey(key: string): key is MetricKey {
  return getAllMetricKeys().includes(key);
}

/**
 * Get human-readable label for a metric key
 */
export function getMetricLabel(key: MetricKey | string): string {
  const labels: Record<string, string> = {
    [METRIC_KEYS.TOTAL_CHATS]: 'Total Chats',
    [METRIC_KEYS.TODAY_CHATS]: "Today's Chats",
    [METRIC_KEYS.SATISFACTION_RATE]: 'Satisfaction Rate',
    [METRIC_KEYS.AVG_MESSAGES]: 'Avg Messages per Chat',
    [METRIC_KEYS.REGENERATION_RATE]: 'Regeneration Rate',
    [METRIC_KEYS.POSITIVE_FEEDBACK]: 'Positive Feedback',
    [METRIC_KEYS.NEGATIVE_FEEDBACK]: 'Negative Feedback',
    [METRIC_KEYS.TOTAL_FEEDBACK]: 'Total Feedback',
    [METRIC_KEYS.FEEDBACK_RESPONSE_RATE]: 'Feedback Response Rate',
    [METRIC_KEYS.QNA_CHATS]: 'QnA Mode Chats',
    [METRIC_KEYS.ASSISTANT_CHATS]: 'Assistant Mode Chats',
    [METRIC_KEYS.TOTAL_REGENERATIONS]: 'Total Regenerations',
    [METRIC_KEYS.TOTAL_MESSAGES]: 'Total Messages',
    [METRIC_KEYS.FIRST_ANSWER_SUCCESS_RATE]: 'First Answer Success Rate',
    [METRIC_KEYS.AVG_RESPONSE_TIME]: 'Avg Response Time',
    [METRIC_KEYS.AVG_SESSION_DURATION]: 'Avg Session Duration',
  };
  
  return labels[key] || key;
}

/**
 * Format date for use in document IDs (YYYY-MM-DD)
 */
export function formatDateForId(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start of week (Monday) for weekly summaries
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return formatDateForId(d);
}
