import { getBusinessAnalyticsDateKey, parseBusinessDayEndMinutes } from './businessDay';
import { addDaysToAnalyticsDateKey } from './dateKey';
import {
  normalizeAnalyticsDateKey,
  normalizeAnalyticsProjectId,
  normalizeAnalyticsScopeDocumentId,
} from './readBoundary';
import { filterAnalyticsUpdateData, type AnalyticsWriteValue } from './writePolicy';

export const ANALYTICS_QUEUE_MAX_ENTRIES = 20;
export const ANALYTICS_QUEUE_MAX_FIELDS = 100;
export const ANALYTICS_QUEUE_MAX_STORAGE_CHARS = 512 * 1024;
export const ANALYTICS_QUEUE_MAX_RETRY_COUNT = 12;
export const ANALYTICS_QUEUE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type NormalizedAnalyticsQueueEntry = {
  queueKey: string;
  tenantId: string;
  storeId: string;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  updateData: Record<string, AnalyticsWriteValue>;
  eventCount: number;
  retryCount: number;
  createdAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeTimeZone = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 80 || value.trim() !== value) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return undefined;
  }
};

const normalizeBusinessDayEndTime = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() === value && parseBusinessDayEndMinutes(value) !== null
    ? value
    : undefined
);

export const getAnalyticsQueueKey = (
  tenantId: string,
  storeId: string,
  projectId: string,
  dateString: string,
): string => `${tenantId}_${storeId}_${projectId}_${dateString}`;

export function mergeAnalyticsUpdateData(
  target: Record<string, AnalyticsWriteValue>,
  source: Record<string, AnalyticsWriteValue>,
): void {
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'number') {
      const existing = target[key];
      const current = typeof existing === 'number' ? existing : 0;
      const next = current + value;
      if (Number.isFinite(next) && next >= 0) target[key] = next;
      return;
    }

    target[key] = value;
  });
}

export function subtractFlushedAnalyticsData(
  current: Record<string, AnalyticsWriteValue>,
  flushed: Record<string, AnalyticsWriteValue>,
): Record<string, AnalyticsWriteValue> {
  const remaining = { ...current };

  Object.entries(flushed).forEach(([key, flushedValue]) => {
    const currentValue = remaining[key];
    if (typeof flushedValue === 'number' && typeof currentValue === 'number') {
      const next = currentValue - flushedValue;
      if (Number.isFinite(next) && next > 0) remaining[key] = next;
      else delete remaining[key];
      return;
    }

    if (currentValue === flushedValue) delete remaining[key];
  });

  return remaining;
}

export function normalizePersistedAnalyticsQueue(
  value: unknown,
  now: Date = new Date(),
): NormalizedAnalyticsQueueEntry[] {
  if (!Array.isArray(value)) return [];

  const nowMs = now.getTime();
  const normalized: NormalizedAnalyticsQueueEntry[] = [];
  const admittedKeys = new Set<string>();

  for (const tuple of value.slice(0, ANALYTICS_QUEUE_MAX_ENTRIES * 5)) {
    if (normalized.length >= ANALYTICS_QUEUE_MAX_ENTRIES) break;
    if (!Array.isArray(tuple) || tuple.length !== 2 || !isRecord(tuple[1])) continue;
    const queued = tuple[1];

    const tenantId = normalizeAnalyticsScopeDocumentId(queued.tenantId);
    const storeId = normalizeAnalyticsScopeDocumentId(queued.storeId);
    const projectId = normalizeAnalyticsProjectId(queued.projectId);
    const dateString = normalizeAnalyticsDateKey(queued.dateString);
    if (!tenantId || !storeId || !projectId || !dateString) continue;

    const storeTimeZone = normalizeTimeZone(queued.storeTimeZone);
    const businessDayEndTime = normalizeBusinessDayEndTime(queued.businessDayEndTime);
    const currentDate = getBusinessAnalyticsDateKey(now, storeTimeZone, businessDayEndTime);
    const oldestDate = addDaysToAnalyticsDateKey(currentDate, -1);
    if (dateString < oldestDate || dateString > currentDate) continue;

    const updateData = isRecord(queued.updateData)
      ? filterAnalyticsUpdateData(queued.updateData)
      : {};
    const fieldCount = Object.keys(updateData).length;
    if (fieldCount === 0 || fieldCount > ANALYTICS_QUEUE_MAX_FIELDS) continue;

    const eventCount = queued.eventCount === undefined ? 1 : queued.eventCount;
    if (!Number.isSafeInteger(eventCount) || Number(eventCount) < 1 || Number(eventCount) > 1000) continue;

    const retryCount = queued.retryCount === undefined ? 0 : queued.retryCount;
    if (!Number.isSafeInteger(retryCount) || Number(retryCount) < 0 || Number(retryCount) >= ANALYTICS_QUEUE_MAX_RETRY_COUNT) continue;

    const createdAt = queued.createdAt === undefined ? nowMs : queued.createdAt;
    if (
      !Number.isSafeInteger(createdAt)
      || Number(createdAt) <= 0
      || Number(createdAt) > nowMs + 5 * 60 * 1000
      || nowMs - Number(createdAt) > ANALYTICS_QUEUE_MAX_AGE_MS
    ) continue;

    const queueKey = getAnalyticsQueueKey(tenantId, storeId, projectId, dateString);
    if (admittedKeys.has(queueKey)) continue;
    admittedKeys.add(queueKey);

    normalized.push({
      queueKey,
      tenantId,
      storeId,
      projectId,
      dateString,
      storeTimeZone,
      businessDayEndTime,
      updateData,
      eventCount: Number(eventCount),
      retryCount: Number(retryCount),
      createdAt: Number(createdAt),
    });
  }

  return normalized;
}
