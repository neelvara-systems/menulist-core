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
    themes?: unknown[];
    trends?: unknown[];
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
  [key: string]: unknown;
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
type UnknownRecord = Record<string, unknown>;

const UNSAFE_NORMALIZER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is UnknownRecord => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeDateKey = (value: unknown): string | null => {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
};

const normalizeNonNegativeNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

const normalizeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeIdentifier = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
  return normalizeText(String(value), maxLength);
};

const normalizeTextArray = (value: unknown, maxItems: number, maxLength: number): string[] => (
  Array.isArray(value)
    ? value.slice(0, maxItems).flatMap((entry) => {
      const normalized = normalizeText(entry, maxLength);
      return normalized ? [normalized] : [];
    })
    : []
);

const toTimestampMillis = (value: unknown): number | null => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (!isRecord(value)) return null;
  if (typeof value.toDate === 'function') {
    try {
      const date = (value.toDate as () => unknown)();
      return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
    } catch {
      return null;
    }
  }
  if (typeof value.seconds === 'number' && Number.isSafeInteger(value.seconds)) {
    const millis = value.seconds * 1000;
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
};

const copySafeRecord = (value: UnknownRecord): UnknownRecord => {
  const copied: UnknownRecord = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (!UNSAFE_NORMALIZER_KEYS.has(key)) copied[key] = entry;
  });
  return copied;
};

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
  doc: unknown,
  source: 'realtime' | 'aggregated' = 'aggregated'
): NormalizedMetrics {
  const today = new Date().toISOString().split('T')[0];
  const record = isRecord(doc) ? doc : {};
  const docDate = normalizeDateKey(record.date) || today;
  const metric = (key: string) => normalizeNonNegativeNumber(record[key]) ?? 0;
  const summary = normalizeText(isRecord(record.insights) ? record.insights.summary : undefined, 20_000);
  const recommendations = normalizeTextArray(
    isRecord(record.insights) ? record.insights.recommendations : undefined,
    20,
    1_000,
  );
  const insightsRecord = isRecord(record.insights) ? record.insights : null;
  const insights = summary
    || recommendations.length > 0
    || Array.isArray(insightsRecord?.themes)
    || Array.isArray(insightsRecord?.trends)
    ? {
      ...(summary ? { summary } : {}),
      ...(recommendations.length > 0 ? { recommendations } : {}),
      ...(Array.isArray(insightsRecord?.themes) ? { themes: insightsRecord.themes.slice(0, 100) } : {}),
      ...(Array.isArray(insightsRecord?.trends) ? { trends: insightsRecord.trends.slice(0, 100) } : {}),
    }
    : undefined;
  const tenantId = normalizeIdentifier(record.tId, 120) || '';
  const storeId = normalizeIdentifier(record.sId, 120) || '';
  const id = normalizeIdentifier(record.id, 500) || `${tenantId}_${storeId}_${docDate}`;
  
  return {
    id,
    date: docDate,
    metrics: {
      // Core metrics with safe fallbacks
      [METRIC_KEYS.TOTAL_CHATS]: metric('totalChats'),
      [METRIC_KEYS.TODAY_CHATS]: metric('todayChats'),
      [METRIC_KEYS.SATISFACTION_RATE]: metric('satisfactionRate'),
      [METRIC_KEYS.AVG_MESSAGES]: metric('avgMessagesPerChat'),
      [METRIC_KEYS.REGENERATION_RATE]: metric('regenerationRate'),
      
      // Feedback metrics
      [METRIC_KEYS.POSITIVE_FEEDBACK]: metric('positiveFeedback'),
      [METRIC_KEYS.NEGATIVE_FEEDBACK]: metric('negativeFeedback'),
      [METRIC_KEYS.TOTAL_FEEDBACK]: metric('totalFeedback'),
      
      // Mode metrics
      [METRIC_KEYS.QNA_CHATS]: metric('qnaChats'),
      [METRIC_KEYS.ASSISTANT_CHATS]: metric('assistantChats'),
      
      // Quality metrics
      [METRIC_KEYS.TOTAL_REGENERATIONS]: metric('totalRegenerations'),
      [METRIC_KEYS.TOTAL_MESSAGES]: metric('totalMessages'),
    },
    ...(insights ? { insights } : {}),
    metadata: {
      source,
      lastUpdated: toTimestampMillis(record.lastUpdated ?? record.modifiedOn) ?? Date.now(),
      tenantId,
      storeId,
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
  const observedCounts: Record<string, number> = {};
  
  // Sum all metrics
  metricsList.forEach(metrics => {
    Object.entries(metrics.metrics).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      aggregated[key] = (aggregated[key] || 0) + value;
      observedCounts[key] = (observedCounts[key] || 0) + 1;
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
      aggregated[key] = Math.round(aggregated[key] / observedCounts[key]);
    }
  });
  
  return aggregated;
}

/**
 * Normalize chart data for Recharts
 */
export function normalizeChartData(
  data: unknown,
  dateKey: string = 'date',
  valueKey: string = 'count'
): NormalizedChartData[] {
  if (!Array.isArray(data)) return [];
  const today = new Date().toISOString().split('T')[0];
  return data.flatMap((item) => {
    if (!isRecord(item)) return [];
    const normalized: NormalizedChartData = {
      ...copySafeRecord(item),
      date: normalizeDateKey(item[dateKey]) || today,
      count: normalizeNonNegativeNumber(item[valueKey]) ?? 0,
    };
    const label = normalizeText(item.label, 500);
    if (label) normalized.label = label;
    else delete normalized.label;
    return [normalized];
  });
}

/**
 * Normalize knowledge gaps data
 */
export function normalizeKnowledgeGaps(
  gaps: unknown,
): NormalizedKnowledgeGap[] {
  if (!Array.isArray(gaps)) return [];
  return gaps.flatMap((gap) => {
    if (!isRecord(gap)) return [];
    const question = normalizeText(gap.question, 500);
    const count = normalizeNonNegativeNumber(gap.count);
    if (!question || count === null) return [];
    const lastOccurrence = normalizeDateKey(gap.lastOccurrence);
    return [{
      question,
      count,
      examples: normalizeTextArray(gap.examples, 3, 1_000),
      severity: determineSeverity(count),
      ...(lastOccurrence ? { lastOccurrence } : {}),
    }];
  });
}

/**
 * Normalize top questions data
 */
export function normalizeTopQuestions(
  questions: unknown,
): NormalizedTopQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions.flatMap((questionRecord) => {
    if (!isRecord(questionRecord)) return [];
    const question = normalizeText(questionRecord.question, 500);
    const count = normalizeNonNegativeNumber(questionRecord.count);
    if (!question || count === null) return [];
    const category = normalizeText(questionRecord.category, 120);
    const lastAsked = normalizeDateKey(questionRecord.lastAsked);
    return [{
      question,
      count,
      ...(category ? { category } : {}),
      ...(lastAsked ? { lastAsked } : {}),
    }];
  });
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Determine severity based on count
 */
function determineSeverity(count: unknown): 'low' | 'medium' | 'high' {
  const normalizedCount = normalizeNonNegativeNumber(count) ?? 0;
  if (normalizedCount >= 10) return 'high';
  if (normalizedCount >= 5) return 'medium';
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
  metrics: unknown,
): boolean {
  try {
    if (!isRecord(metrics)) return false;
    // Check required fields
    if (!metrics.id || !metrics.date || !metrics.metrics || !metrics.metadata) {
      return false;
    }
    
    // Check metadata
    if (!isRecord(metrics.metadata) || !metrics.metadata.tenantId || !metrics.metadata.storeId) {
      return false;
    }
    
    // Check metrics object
    if (!isRecord(metrics.metrics)) {
      return false;
    }

    if (Object.values(metrics.metrics).some((value) => normalizeNonNegativeNumber(value) === null)) return false;
    if (!normalizeDateKey(metrics.date)) return false;
    if (typeof metrics.id !== 'string' || !metrics.id.trim()) return false;
    if (typeof metrics.metadata.lastUpdated !== 'number' || !Number.isFinite(metrics.metadata.lastUpdated)) return false;
    if (!['realtime', 'aggregated', 'hybrid'].includes(String(metrics.metadata.source))) return false;
    
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
  metrics: unknown,
  key: string,
  fallback: number = 0
): number {
  const safeFallback = Number.isFinite(fallback) ? fallback : 0;
  if (!isRecord(metrics) || !isRecord(metrics.metrics)) return safeFallback;
  return normalizeNonNegativeNumber(metrics.metrics[key]) ?? safeFallback;
}
