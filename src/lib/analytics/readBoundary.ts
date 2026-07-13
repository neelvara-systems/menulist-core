import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { AnalyticsSummary, DailyAnalytics } from './types';

const ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ANALYTICS_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

const DAILY_NUMERIC_FIELDS = [
  'totalClicks',
  'totalMenuActionClicks',
  'totalSearches',
  'totalUnavailableItemTaps',
  'totalViews',
  'zeroResultSearches',
] as const;

const DAILY_NUMERIC_MAP_FIELDS = [
  'clicksByDevice',
  'clicksByItem',
  'clicksByLocation',
  'hourlyClicks',
  'hourlyItemViews',
  'hourlyMenuActionClicks',
  'hourlySearches',
  'hourlyUnavailableItemTaps',
  'hourlyViews',
  'menuActionClicks',
  'searchTerms',
  'unavailableItemTapsByItem',
  'viewsByDevice',
  'viewsByItem',
  'viewsByLocation',
  'zeroResultSearchTerms',
] as const;

const SUMMARY_NUMERIC_FIELDS = [
  'lifetimeTotalClicks',
  'lifetimeTotalMenuActionClicks',
  'lifetimeTotalSearches',
  'lifetimeTotalUnavailableItemTaps',
  'lifetimeTotalViews',
  'lifetimeZeroResultSearches',
] as const;

const SUMMARY_NUMERIC_MAP_FIELDS = [
  'menuActionClicks',
  'searchTerms',
  'unavailableItemTapsByItem',
  'viewsByCampaign',
  'viewsByContent',
  'viewsByMedium',
  'viewsBySource',
] as const;

const CUSTOMER_APP_SUMMARY_NUMERIC_FIELDS = [
  'lifetimeTotalPromptShown',
  'lifetimeTotalPromptDismissed',
  'lifetimeTotalInstallStarted',
  'lifetimeTotalInstalled',
  'lifetimeUniqueInstalls',
  'lifetimeTotalAppOpens',
] as const;
const CUSTOMER_APP_DAILY_NUMERIC_FIELDS = [
  'totalPromptShown',
  'totalPromptDismissed',
  'totalInstallStarted',
  'totalInstalled',
  'uniqueInstallSessions',
  'totalAppOpens',
] as const;
const CUSTOMER_APP_MAP_FIELDS = [
  'shortcutClicks',
  'installsByDevice',
  'installsByLocation',
  'installsByPlatform',
  'installsBySource',
  'appOpensByPlatform',
] as const;

export interface CustomerAppAnalyticsSummary {
  lifetimeTotalPromptShown?: number;
  lifetimeTotalPromptDismissed?: number;
  lifetimeTotalInstallStarted?: number;
  lifetimeTotalInstalled?: number;
  lifetimeUniqueInstalls?: number;
  lifetimeTotalAppOpens?: number;
  shortcutClicks?: Record<string, number>;
  installsByDevice?: Record<string, number>;
  installsByLocation?: Record<string, number>;
  installsByPlatform?: Record<string, number>;
  installsBySource?: Record<string, number>;
  appOpensByPlatform?: Record<string, number>;
}

export interface CustomerAppDailyAnalytics {
  date: string;
  totalPromptShown?: number;
  totalPromptDismissed?: number;
  totalInstallStarted?: number;
  totalInstalled?: number;
  uniqueInstallSessions?: number;
  totalAppOpens?: number;
  shortcutClicks?: Record<string, number>;
  installsByDevice?: Record<string, number>;
  installsByLocation?: Record<string, number>;
  installsByPlatform?: Record<string, number>;
  installsBySource?: Record<string, number>;
  appOpensByPlatform?: Record<string, number>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeNonNegativeNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
);

const normalizeNumberMap = (value: unknown): Record<string, number> | undefined => {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, number] => (
    isValidFirestoreDocumentId(entry[0]) && normalizeNonNegativeNumber(entry[1]) !== undefined
  ));
  return entries.length === Object.keys(value).length ? Object.fromEntries(entries) : undefined;
};

const normalizeStringMap = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, string] => (
    isValidFirestoreDocumentId(entry[0])
    && typeof entry[1] === 'string'
    && entry[1].trim().length > 0
    && entry[1].length <= 120
  ));
  return entries.length === Object.keys(value).length ? Object.fromEntries(entries) : undefined;
};

const normalizeHourlyClicksByItem = (value: unknown): DailyAnalytics['hourlyClicksByItem'] | undefined => {
  if (!isRecord(value)) return undefined;
  const normalized: NonNullable<DailyAnalytics['hourlyClicksByItem']> = {};
  for (const [itemId, hours] of Object.entries(value)) {
    if (!isValidFirestoreDocumentId(itemId)) return undefined;
    const hourMap = normalizeNumberMap(hours);
    if (!hourMap || Object.keys(hourMap).some((hour) => !/^(?:[01]\d|2[0-3]|\d)$/.test(hour))) {
      return undefined;
    }
    normalized[itemId] = hourMap;
  }
  return normalized;
};

export function normalizeAnalyticsScopeDocumentId(value: unknown): string | null {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  if (!/^\d+$/.test(raw) || !isValidFirestoreDocumentId(raw)) return null;
  const numeric = Number(raw);
  return Number.isSafeInteger(numeric) && numeric > 0 && String(numeric) === raw ? raw : null;
}

export function normalizeAnalyticsProjectId(value: unknown): string | null {
  return typeof value === 'string'
    && ANALYTICS_PROJECT_ID_PATTERN.test(value)
    && isValidFirestoreDocumentId(value)
    ? value
    : null;
}

export function normalizeAnalyticsDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !ANALYTICS_DATE_KEY_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function normalizeDailyAnalytics(value: unknown, fallbackDate?: string): DailyAnalytics | null {
  if (!isRecord(value)) return null;
  const date = normalizeAnalyticsDateKey(value.date ?? value.localDate ?? fallbackDate);
  if (!date) return null;

  const normalized: DailyAnalytics = { date };
  for (const field of DAILY_NUMERIC_FIELDS) {
    const number = normalizeNonNegativeNumber(value[field]);
    if (number !== undefined) normalized[field] = number;
  }
  for (const field of DAILY_NUMERIC_MAP_FIELDS) {
    const map = normalizeNumberMap(value[field]);
    if (map) normalized[field] = map;
  }
  const itemNames = normalizeStringMap(value.itemNames);
  if (itemNames) normalized.itemNames = itemNames;
  const hourlyClicksByItem = normalizeHourlyClicksByItem(value.hourlyClicksByItem);
  if (hourlyClicksByItem) normalized.hourlyClicksByItem = hourlyClicksByItem;
  const lastUpdated = value.lastUpdated;
  if (lastUpdated instanceof Date && Number.isFinite(lastUpdated.getTime())) {
    normalized.lastUpdated = lastUpdated;
  } else if (isRecord(lastUpdated) && typeof lastUpdated.toDate === 'function') {
    const converted = lastUpdated.toDate();
    if (converted instanceof Date && Number.isFinite(converted.getTime())) normalized.lastUpdated = converted;
  }
  return normalized;
}

const normalizePeriod = (value: unknown): AnalyticsSummary['last7Days'] | undefined => {
  if (!isRecord(value)) return undefined;
  const totalViews = normalizeNonNegativeNumber(value.totalViews);
  const totalClicks = normalizeNonNegativeNumber(value.totalClicks);
  const startDate = normalizeAnalyticsDateKey(value.startDate);
  const endDate = normalizeAnalyticsDateKey(value.endDate);
  return totalViews !== undefined && totalClicks !== undefined && startDate && endDate && startDate <= endDate
    ? { totalViews, totalClicks, startDate, endDate }
    : undefined;
};

export function normalizeAnalyticsSummary(value: unknown): AnalyticsSummary | null {
  if (!isRecord(value)) return null;
  const normalized: AnalyticsSummary = {};
  for (const field of SUMMARY_NUMERIC_FIELDS) {
    const number = normalizeNonNegativeNumber(value[field]);
    if (number !== undefined) normalized[field] = number;
  }
  for (const field of SUMMARY_NUMERIC_MAP_FIELDS) {
    const map = normalizeNumberMap(value[field]);
    if (map) normalized[field] = map;
  }
  if (Array.isArray(value.topItems)) {
    const topItems = value.topItems.flatMap((item) => {
      if (!isRecord(item)) return [];
      const menuItemId = normalizeAnalyticsProjectId(item.menuItemId);
      const name = typeof item.name === 'string' && item.name.trim() && item.name.length <= 120 ? item.name.trim() : null;
      const totalClicks = normalizeNonNegativeNumber(item.totalClicks);
      const lastClicked = normalizeAnalyticsDateKey(item.lastClicked);
      return menuItemId && name && totalClicks !== undefined && lastClicked
        ? [{ menuItemId, name, totalClicks, lastClicked }]
        : [];
    }).slice(0, 100);
    if (topItems.length === value.topItems.length) normalized.topItems = topItems;
  }
  const last7Days = normalizePeriod(value.last7Days);
  if (last7Days) normalized.last7Days = last7Days;
  const last30Days = normalizePeriod(value.last30Days);
  if (last30Days) normalized.last30Days = last30Days;
  const lastAggregatedDate = normalizeAnalyticsDateKey(value.lastAggregatedDate);
  if (lastAggregatedDate) normalized.lastAggregatedDate = lastAggregatedDate;
  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function normalizeAnalyticsDashboardReadModel(
  value: unknown,
  expectedTenantId: string,
  expectedStoreId: string,
  expectedProjectId: string,
) {
  if (!isRecord(value)) return null;
  if (
    String(value.tId ?? '') !== expectedTenantId
    || String(value.sId ?? '') !== expectedStoreId
    || value.projectId !== expectedProjectId
  ) return null;

  const lastSettledLocalDate = normalizeAnalyticsDateKey(value.lastSettledLocalDate);
  if (!lastSettledLocalDate || !Array.isArray(value.daily30d)) return null;
  const daily30d = value.daily30d.map((day) => normalizeDailyAnalytics(day));
  if (daily30d.some((day) => day === null)) return null;

  return {
    analyticsSummary: normalizeAnalyticsSummary(value.analyticsSummary),
    daily30d: daily30d as DailyAnalytics[],
    lastSettledLocalDate,
  };
}

export function normalizeCustomerAppDashboardReadModel(
  value: unknown,
  expectedTenantId: string,
  expectedStoreId: string,
) {
  if (!isRecord(value)) return null;
  if (
    String(value.tId ?? '') !== expectedTenantId
    || String(value.sId ?? '') !== expectedStoreId
    || value.projectId !== 'customerApp'
    || value.kind !== 'customerAppDashboardSummary'
  ) return null;
  const generatedForLocalDate = normalizeAnalyticsDateKey(value.generatedForLocalDate);
  const lastSettledLocalDate = normalizeAnalyticsDateKey(value.lastSettledLocalDate);
  if (!generatedForLocalDate || !lastSettledLocalDate || generatedForLocalDate <= lastSettledLocalDate) return null;
  if (!isRecord(value.summary) || !Array.isArray(value.daily30d)) return null;

  const summary: CustomerAppAnalyticsSummary = {};
  for (const field of CUSTOMER_APP_SUMMARY_NUMERIC_FIELDS) {
    const number = normalizeNonNegativeNumber(value.summary[field]);
    if (value.summary[field] !== undefined && number === undefined) return null;
    if (number !== undefined) summary[field] = number;
  }
  for (const field of CUSTOMER_APP_MAP_FIELDS) {
    const map = normalizeNumberMap(value.summary[field]);
    if (value.summary[field] !== undefined && !map) return null;
    if (map) summary[field] = map;
  }

  const daily30d: CustomerAppDailyAnalytics[] = [];
  for (const row of value.daily30d) {
    if (!isRecord(row)) return null;
    const date = normalizeAnalyticsDateKey(row.date);
    if (!date) return null;
    const normalized: CustomerAppDailyAnalytics = { date };
    for (const field of CUSTOMER_APP_DAILY_NUMERIC_FIELDS) {
      const number = normalizeNonNegativeNumber(row[field]);
      if (row[field] !== undefined && number === undefined) return null;
      if (number !== undefined) normalized[field] = number;
    }
    for (const field of CUSTOMER_APP_MAP_FIELDS) {
      const map = normalizeNumberMap(row[field]);
      if (row[field] !== undefined && !map) return null;
      if (map) normalized[field] = map;
    }
    daily30d.push(normalized);
  }
  if (daily30d.some((row) => row.date > lastSettledLocalDate)) return null;

  return {
    tId: expectedTenantId,
    sId: expectedStoreId,
    projectId: 'customerApp' as const,
    kind: 'customerAppDashboardSummary' as const,
    summary,
    daily30d,
    generatedForLocalDate,
    lastSettledLocalDate,
  };
}
