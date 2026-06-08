import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessAnalyticsPeriod,
  OwnerBusinessAnalyticsPeriodKey,
} from '../types';

const PERIOD_SYNONYMS: Array<{ key: OwnerBusinessAnalyticsPeriodKey; patterns: RegExp[] }> = [
  { key: 'today', patterns: [/today/i, /so far/i] },
  { key: 'yesterday', patterns: [/yesterday/i] },
  { key: 'thisWeek', patterns: [/this week/i, /current week/i] },
  { key: 'lastWeek', patterns: [/last week/i, /previous week/i] },
  { key: 'thisMonth', patterns: [/this month/i, /current month/i] },
  { key: 'lastMonth', patterns: [/last month/i, /previous month/i] },
  { key: 'last7Days', patterns: [/last 7/i, /seven days/i, /7 days/i] },
  { key: 'last30Days', patterns: [/last 30/i, /thirty days/i, /30 days/i] },
  { key: 'overall', patterns: [/overall/i, /all time/i, /total/i] },
];

const CUSTOM_DATE_PATTERNS = [
  /\b\d{4}-\d{1,2}-\d{1,2}\b/,
  /\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i,
  /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i,
  /\b(?:between|from)\b.+\b(?:and|to)\b/i,
];

const hasUnsupportedCustomDate = (question: string) => (
  CUSTOM_DATE_PATTERNS.some((pattern) => pattern.test(question))
);

export function resolveOwnerBusinessAnalyticsPeriod(
  question: string,
  analytics?: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods'>,
): OwnerBusinessAnalyticsPeriod | null {
  if (!analytics) return null;

  const matched = PERIOD_SYNONYMS.find((entry) => entry.patterns.some((pattern) => pattern.test(question)));
  if (matched) return analytics.periods[matched.key] || null;
  if (hasUnsupportedCustomDate(question)) return null;

  return analytics.periods.today
    || analytics.periods.thisWeek
    || analytics.periods.last7Days
    || null;
}
