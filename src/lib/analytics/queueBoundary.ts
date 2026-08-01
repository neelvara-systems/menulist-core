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
export const ANALYTICS_DELIVERY_ID_PATTERN = /^[a-z0-9]{32}$/;

export type AnalyticsDeliverySnapshot = {
  deliveryId: string;
  updateData: Record<string, AnalyticsWriteValue>;
  eventCount: number;
};

export type NormalizedAnalyticsQueueEntry = {
  queueKey: string;
  tenantId: string;
  storeId: string;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  deliveryId: string;
  updateData: Record<string, AnalyticsWriteValue>;
  eventCount: number;
  activeDelivery?: AnalyticsDeliverySnapshot;
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

export const normalizeAnalyticsDeliveryId = (value: unknown): string | null => (
  typeof value === 'string' && ANALYTICS_DELIVERY_ID_PATTERN.test(value)
    ? value
    : null
);

const normalizeAnalyticsDeliverySnapshot = (
  value: unknown,
): AnalyticsDeliverySnapshot | null => {
  if (!isRecord(value)) return null;
  const deliveryId = normalizeAnalyticsDeliveryId(value.deliveryId);
  const updateData = isRecord(value.updateData)
    ? filterAnalyticsUpdateData(value.updateData)
    : {};
  const eventCount = value.eventCount;
  if (
    !deliveryId
    || Object.keys(updateData).length === 0
    || Object.keys(updateData).length > ANALYTICS_QUEUE_MAX_FIELDS
    || !Number.isSafeInteger(eventCount)
    || Number(eventCount) < 1
    || Number(eventCount) > 1000
  ) {
    return null;
  }
  return {
    deliveryId,
    updateData,
    eventCount: Number(eventCount),
  };
};

const buildLegacyAnalyticsDeliveryId = (createdAt: number): string => (
  `legacy${createdAt.toString(36).padStart(26, '0')}`
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

export function canMergeAnalyticsUpdateData(
  target: Record<string, AnalyticsWriteValue>,
  source: Record<string, AnalyticsWriteValue>,
): boolean {
  return new Set([
    ...Object.keys(target),
    ...Object.keys(source),
  ]).size <= ANALYTICS_QUEUE_MAX_FIELDS;
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
    if (fieldCount > ANALYTICS_QUEUE_MAX_FIELDS) continue;

    const activeDelivery = queued.activeDelivery === undefined
      ? null
      : normalizeAnalyticsDeliverySnapshot(queued.activeDelivery);
    if (queued.activeDelivery !== undefined && !activeDelivery) continue;

    const eventCount = queued.eventCount === undefined ? (fieldCount > 0 ? 1 : 0) : queued.eventCount;
    if (
      !Number.isSafeInteger(eventCount)
      || Number(eventCount) < 0
      || Number(eventCount) > 1000
      || (fieldCount === 0) !== (Number(eventCount) === 0)
      || fieldCount === 0 && !activeDelivery
    ) continue;

    const retryCount = queued.retryCount === undefined ? 0 : queued.retryCount;
    if (!Number.isSafeInteger(retryCount) || Number(retryCount) < 0 || Number(retryCount) >= ANALYTICS_QUEUE_MAX_RETRY_COUNT) continue;

    const createdAt = queued.createdAt === undefined ? nowMs : queued.createdAt;
    if (
      !Number.isSafeInteger(createdAt)
      || Number(createdAt) <= 0
      || Number(createdAt) > nowMs + 5 * 60 * 1000
      || nowMs - Number(createdAt) > ANALYTICS_QUEUE_MAX_AGE_MS
    ) continue;
    const deliveryId = queued.deliveryId === undefined
      ? buildLegacyAnalyticsDeliveryId(Number(createdAt))
      : normalizeAnalyticsDeliveryId(queued.deliveryId);
    if (!deliveryId) continue;

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
      deliveryId,
      updateData,
      eventCount: Number(eventCount),
      activeDelivery: activeDelivery || undefined,
      retryCount: Number(retryCount),
      createdAt: Number(createdAt),
    });
  }

  return normalized;
}
