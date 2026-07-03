/**
 * Data Normalization Layer
 * Converts raw Firestore data into consistent UI-friendly format
 * 
 * This prevents undefined errors, ensures consistent structure for charts,
 * and makes debugging easier
 */

import { METRIC_KEYS } from './registry';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

// ================================================================
// NORMALIZED DATA TYPES
// ================================================================

export interface NormalizedMetrics {
  id: string;
  date: string;
  metrics: Record<string, number>;
  insights?: {
    summary?: string;
    recommendations?: string[];
    themes?: any[];
    trends?: any[];
  };
  metadata: {
    source: 'realtime' | 'aggregated' | 'hybrid';
    lastUpdated: number;
    tenantId: string;
    storeId: string;
    isToday?: boolean;
  };
}

export interface NormalizedChartData {
  date: string;
  count: number;
  label?: string;
  [key: string]: any; // Allow additional dynamic properties
}

export interface NormalizedKnowledgeGap {
  question: string;
  count: number;
  examples: string[];
  severity?: 'low' | 'medium' | 'high';
  lastOccurrence?: string;
}

export interface NormalizedTopQuestion {
  question: string;
  count: number;
  category?: string;
  lastAsked?: string;
}

type AnalyticsNormalizerLogContext = Record<string, boolean | number | string | null | undefined>;

const getAnalyticsNormalizerValidationContext = (metrics: unknown): AnalyticsNormalizerLogContext => {
  const record = metrics && typeof metrics === 'object'
    ? metrics as Partial<NormalizedMetrics>
    : {};
  const metadata = record.metadata && typeof record.metadata === 'object'
    ? record.metadata as Partial<NormalizedMetrics['metadata']>
    : {};

  return {
    ...getBoundedAnalyticsStringContext('metricsId', record.id),
    ...getBoundedAnalyticsStringContext('metricsDate', record.date),
    ...getBoundedAnalyticsStringContext('tenantId', metadata.tenantId),
    ...getBoundedAnalyticsStringContext('storeId', metadata.storeId),
    hasMetricsRecord: Boolean(metrics && typeof metrics === 'object'),
    hasMetricsMap: Boolean(record.metrics && typeof record.metrics === 'object'),
    hasMetadata: Boolean(record.metadata && typeof record.metadata === 'object'),
  };
};

// ================================================================
// NORMALIZATION FUNCTIONS
// ================================================================

/**
 * Normalize Firestore document to consistent metrics format
 */
export function normalizeFirestoreDoc(
  doc: any,
  source: 'realtime' | 'aggregated' = 'aggregated'
): NormalizedMetrics {
  const today = new Date().toISOString().split('T')[0];
  const docDate = doc.date || today;
  
  return {
    id: doc.id || `${doc.tId}_${doc.sId}_${docDate}`,
    date: docDate,
    metrics: {
      // Core metrics with safe fallbacks
      [METRIC_KEYS.TOTAL_CHATS]: Number(doc.totalChats) || 0,
      [METRIC_KEYS.TODAY_CHATS]: Number(doc.todayChats) || 0,
      [METRIC_KEYS.SATISFACTION_RATE]: Number(doc.satisfactionRate) || 0,
      [METRIC_KEYS.AVG_MESSAGES]: Number(doc.avgMessagesPerChat) || 0,
      [METRIC_KEYS.REGENERATION_RATE]: Number(doc.regenerationRate) || 0,
      
      // Feedback metrics
      [METRIC_KEYS.POSITIVE_FEEDBACK]: Number(doc.positiveFeedback) || 0,
      [METRIC_KEYS.NEGATIVE_FEEDBACK]: Number(doc.negativeFeedback) || 0,
      [METRIC_KEYS.TOTAL_FEEDBACK]: Number(doc.totalFeedback) || 0,
      
      // Mode metrics
      [METRIC_KEYS.QNA_CHATS]: Number(doc.qnaChats) || 0,
      [METRIC_KEYS.ASSISTANT_CHATS]: Number(doc.assistantChats) || 0,
      
      // Quality metrics
      [METRIC_KEYS.TOTAL_REGENERATIONS]: Number(doc.totalRegenerations) || 0,
      [METRIC_KEYS.TOTAL_MESSAGES]: Number(doc.totalMessages) || 0,
    },
    insights: doc.insights || undefined,
    metadata: {
      source,
      lastUpdated: Date.now(),
      tenantId: String(doc.tId || ''),
      storeId: String(doc.sId || ''),
      isToday: docDate === today,
    },
  };
}

/**
 * Merge historical and today's data into hybrid format
 */
export function mergeNormalizedMetrics(
  historical: NormalizedMetrics[],
  today: NormalizedMetrics
): NormalizedMetrics[] {
  // Remove today's date from historical if it exists (avoid duplicates)
  const filtered = historical.filter(h => h.date !== today.date);
  
  // Add today's data and sort by date
  return [...filtered, today].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Aggregate multiple normalized metrics into a single summary
 */
export function aggregateMetrics(
  metricsList: NormalizedMetrics[]
): Record<string, number> {
  if (metricsList.length === 0) {
    return {};
  }
  
  const aggregated: Record<string, number> = {};
  
  // Sum all metrics
  metricsList.forEach(metrics => {
    Object.entries(metrics.metrics).forEach(([key, value]) => {
      aggregated[key] = (aggregated[key] || 0) + value;
    });
  });
  
  // Calculate averages for rate-based metrics
  const averageKeys = [
    METRIC_KEYS.SATISFACTION_RATE,
    METRIC_KEYS.AVG_MESSAGES,
    METRIC_KEYS.REGENERATION_RATE,
  ];
  
  averageKeys.forEach(key => {
    if (aggregated[key] !== undefined) {
      aggregated[key] = Math.round(aggregated[key] / metricsList.length);
    }
  });
  
  return aggregated;
}

/**
 * Normalize chart data for Recharts
 */
export function normalizeChartData(
  data: any[],
  dateKey: string = 'date',
  valueKey: string = 'count'
): NormalizedChartData[] {
  return data.map(item => ({
    date: item[dateKey] || new Date().toISOString().split('T')[0],
    count: Number(item[valueKey]) || 0,
    label: item.label || undefined,
    ...item, // Preserve other properties
  }));
}

/**
 * Normalize knowledge gaps data
 */
export function normalizeKnowledgeGaps(
  gaps: any[]
): NormalizedKnowledgeGap[] {
  return gaps.map(gap => ({
    question: String(gap.question || '').trim(),
    count: Number(gap.count) || 0,
    examples: Array.isArray(gap.examples) ? gap.examples.slice(0, 3) : [],
    severity: determineSeverity(gap.count),
    lastOccurrence: gap.lastOccurrence || undefined,
  })).filter(gap => gap.question.length > 0);
}

/**
 * Normalize top questions data
 */
export function normalizeTopQuestions(
  questions: any[]
): NormalizedTopQuestion[] {
  return questions.map(q => ({
    question: String(q.question || '').trim(),
    count: Number(q.count) || 0,
    category: q.category || undefined,
    lastAsked: q.lastAsked || undefined,
  })).filter(q => q.question.length > 0);
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Determine severity based on count
 */
function determineSeverity(count: number): 'low' | 'medium' | 'high' {
  if (count >= 10) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Format metric value for display
 */
export function formatMetricValue(
  value: number,
  metricKey: string
): string {
  // Rate-based metrics (show as percentage)
  const rateKeys: string[] = [
    METRIC_KEYS.SATISFACTION_RATE,
    METRIC_KEYS.REGENERATION_RATE,
    METRIC_KEYS.FEEDBACK_RESPONSE_RATE,
  ];
  
  if (rateKeys.includes(metricKey)) {
    return `${value}%`;
  }
  
  // Average metrics (show with decimal)
  if (metricKey === METRIC_KEYS.AVG_MESSAGES) {
    return value.toFixed(1);
  }
  
  // Count metrics (show as integer)
  return value.toLocaleString();
}

/**
 * Validate normalized metrics structure
 */
export function validateNormalizedMetrics(
  metrics: NormalizedMetrics
): boolean {
  try {
    // Check required fields
    if (!metrics.id || !metrics.date || !metrics.metrics || !metrics.metadata) {
      return false;
    }
    
    // Check metadata
    if (!metrics.metadata.tenantId || !metrics.metadata.storeId) {
      return false;
    }
    
    // Check metrics object
    if (typeof metrics.metrics !== 'object') {
      return false;
    }
    
    return true;
  } catch (error) {
    logAnalyticsFailure('analytics_normalized_metrics_validation_failed', error, getAnalyticsNormalizerValidationContext(metrics));
    return false;
  }
}

/**
 * Safe get metric value with fallback
 */
export function getMetricValue(
  metrics: NormalizedMetrics,
  key: string,
  fallback: number = 0
): number {
  return metrics.metrics[key] !== undefined 
    ? Number(metrics.metrics[key]) 
    : fallback;
}
