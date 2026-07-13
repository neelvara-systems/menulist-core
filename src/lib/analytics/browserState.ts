export type AnalyticsSessionMilestoneState = {
  menuSession?: boolean;
  engaged?: boolean;
  intent?: boolean;
  action?: boolean;
  itemIds?: string[];
  viewedItemIds?: string[];
  languageSessions?: string[];
  languageAdoptions?: string[];
};

import {
  ANALYTICS_ENTRY_SOURCES,
  normalizeAnalyticsEnum,
  type AnalyticsEntrySource,
} from './eventPayload';

export type { AnalyticsEntrySource } from './eventPayload';

export type AnalyticsAttributeFilterState = {
  filter: string;
  label?: string;
  selectedAt?: number;
};

export const ALLOWED_ANALYTICS_ATTRIBUTE_FILTERS = new Set([
  'popular',
  'veg',
  'nonveg',
  'forMen',
  'forWomen',
]);

const SAFE_ANALYTICS_ID = /^[A-Za-z0-9_:-]{1,120}$/;
const SAFE_ANALYTICS_LANGUAGE = /^[a-z0-9_-]{1,16}$/;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeStringList = (
  value: unknown,
  pattern: RegExp,
  maxEntries: number,
): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized = Array.from(new Set(value.filter((entry): entry is string => (
    typeof entry === 'string' && pattern.test(entry)
  )))).slice(-maxEntries);

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeLabel = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return normalized || undefined;
};

export function normalizeAnalyticsSessionMilestoneState(
  value: unknown,
): AnalyticsSessionMilestoneState | null {
  if (!isRecord(value)) return null;

  const normalized: AnalyticsSessionMilestoneState = {};
  if (value.menuSession === true) normalized.menuSession = true;
  if (value.engaged === true) normalized.engaged = true;
  if (value.intent === true) normalized.intent = true;
  if (value.action === true) normalized.action = true;

  normalized.itemIds = normalizeStringList(value.itemIds, SAFE_ANALYTICS_ID, 10);
  normalized.viewedItemIds = normalizeStringList(value.viewedItemIds, SAFE_ANALYTICS_ID, 20);
  normalized.languageSessions = normalizeStringList(value.languageSessions, SAFE_ANALYTICS_LANGUAGE, 8);
  normalized.languageAdoptions = normalizeStringList(value.languageAdoptions, SAFE_ANALYTICS_LANGUAGE, 8);

  return normalized;
}

export function normalizeStoredAnalyticsEntrySource(value: unknown): AnalyticsEntrySource | null {
  return normalizeAnalyticsEnum(value, ANALYTICS_ENTRY_SOURCES) || null;
}

export function normalizeAnalyticsAttributeFilterState(
  value: unknown,
): AnalyticsAttributeFilterState | null {
  if (!isRecord(value) || typeof value.filter !== 'string') return null;
  const filter = value.filter.trim();
  if (!ALLOWED_ANALYTICS_ATTRIBUTE_FILTERS.has(filter)) return null;

  const selectedAt = typeof value.selectedAt === 'number'
    && Number.isSafeInteger(value.selectedAt)
    && value.selectedAt > 0
    ? value.selectedAt
    : undefined;

  return {
    filter,
    label: normalizeLabel(value.label) || filter,
    selectedAt,
  };
}
