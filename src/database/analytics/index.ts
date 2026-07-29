import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getAnalyticsQueueContext, getAnalyticsTrackingContext, getBoundedAnalyticsStringContext, logAnalyticsFailure } from "@lib/analytics/analyticsDiagnostics";
import { getBusinessAnalyticsDateKey } from "@lib/analytics/businessDay";
import {
  normalizeAnalyticsDashboardReadModel,
  normalizeAnalyticsDateKey,
  normalizeAnalyticsProjectId,
  normalizeAnalyticsScopeDocumentId,
  normalizeDailyAnalytics,
} from "@lib/analytics/readBoundary";
import {
  ANALYTICS_QUEUE_MAX_AGE_MS,
  ANALYTICS_QUEUE_MAX_ENTRIES,
  ANALYTICS_QUEUE_MAX_RETRY_COUNT,
  ANALYTICS_QUEUE_MAX_STORAGE_CHARS,
  getAnalyticsQueueKey,
  mergeAnalyticsUpdateData,
  normalizeAnalyticsDeliveryId,
  normalizePersistedAnalyticsQueue,
  subtractFlushedAnalyticsData,
} from "@lib/analytics/queueBoundary";
import { filterAnalyticsUpdateData, type AnalyticsWriteValue } from "@lib/analytics/writePolicy";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { createRandomIdSegment } from "@lib/runtime/randomId";
import { doc, getDoc } from "firebase/firestore";

// Base collection path
const COLLECTION = DB_COLLECTIONS.ANALYTICS;
const DAILY_ANALYTICS_COLLECTION = 'daily';
/**
 * Get reference to a specific daily analytics document
 * Format: {tId}_{sId}_{projectId}_daily_{date}
 */
const getDailyAnalyticsDocRef = (tId: string, sId: string, projectId: string, date: string) => {
  const docId = `${tId}_${sId}_${projectId}_${DAILY_ANALYTICS_COLLECTION}_${date}`;
  return doc(firebaseClient, COLLECTION, docId);
};

const getAnalyticsDashboardSummaryDocRef = (tId: string, sId: string, projectId: string) => {
  const docId = `${tId}_${sId}_${projectId}_dashboard_summary`;
  return doc(firebaseClient, COLLECTION, docId);
};

const ANALYTICS_FLUSH_DELAY_MS = 30000;
const ANALYTICS_FLUSH_MAX_EVENTS = 40;
const ANALYTICS_FLUSH_MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
const ANALYTICS_QUEUE_STORAGE_KEY = 'menulist_pending_analytics_queue_v1';

type QueuedAnalyticsWrite = {
  tenantId: string;
  storeId: string;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  deliveryId: string;
  updateData: Record<string, AnalyticsWriteValue>;
  eventCount: number;
  retryCount: number;
  createdAt: number;
  flushTimer?: ReturnType<typeof setTimeout>;
};

class AnalyticsFlushHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(`Public analytics flush failed with HTTP ${status}`);
    this.name = 'AnalyticsFlushHttpError';
  }
}

const analyticsWriteQueue = new Map<string, QueuedAnalyticsWrite>();
const flushingAnalyticsKeys = new Set<string>();
const reportedAnalyticsQueueFailures = new Set<string>();
let reportedAnalyticsQueuePersistFailure = false;
let reportedAnalyticsQueueCapacityFailure = false;

const getQueuedAnalyticsEventCount = () => (
  Array.from(analyticsWriteQueue.values()).reduce((total, queued) => total + queued.eventCount, 0)
);

const reportAnalyticsQueuePersistError = (
  error: unknown,
  phase: 'remove-empty' | 'serialize' | 'set',
  serializedQueue: string | null,
) => {
  if (reportedAnalyticsQueuePersistFailure) return;
  reportedAnalyticsQueuePersistFailure = true;

  logAnalyticsFailure('analytics_queue_persist_failed', error, {
    phase,
    queueEntryCount: analyticsWriteQueue.size,
    queuedEventCount: getQueuedAnalyticsEventCount(),
    ...getBoundedAnalyticsStringContext('serializedQueue', serializedQueue),
  });
};

const persistAnalyticsQueue = () => {
  if (typeof window === 'undefined') return;
  let phase: 'remove-empty' | 'serialize' | 'set' = 'serialize';
  let serializedQueue: string | null = null;

  try {
    const serializable = Array.from(analyticsWriteQueue.entries()).map(([queueKey, queued]) => [
      queueKey,
      {
        tenantId: queued.tenantId,
        storeId: queued.storeId,
        projectId: queued.projectId,
        dateString: queued.dateString,
        storeTimeZone: queued.storeTimeZone,
        businessDayEndTime: queued.businessDayEndTime,
        deliveryId: queued.deliveryId,
        updateData: queued.updateData,
        eventCount: queued.eventCount,
        retryCount: queued.retryCount,
        createdAt: queued.createdAt,
      },
    ]);

    if (serializable.length === 0) {
      phase = 'remove-empty';
      window.localStorage.removeItem(ANALYTICS_QUEUE_STORAGE_KEY);
      reportedAnalyticsQueuePersistFailure = false;
      return;
    }

    serializedQueue = JSON.stringify(serializable);
    if (serializedQueue.length > ANALYTICS_QUEUE_MAX_STORAGE_CHARS) {
      window.localStorage.removeItem(ANALYTICS_QUEUE_STORAGE_KEY);
      reportAnalyticsQueuePersistError(
        new Error('analytics_queue_storage_limit_exceeded'),
        'serialize',
        null,
      );
      return;
    }
    phase = 'set';
    window.localStorage.setItem(ANALYTICS_QUEUE_STORAGE_KEY, serializedQueue);
    reportedAnalyticsQueuePersistFailure = false;
  } catch (error) {
    // Analytics must never break the public menu.
    reportAnalyticsQueuePersistError(error, phase, serializedQueue);
  }
};

const reportAnalyticsQueueFlushError = (
  queueKey: string,
  error: unknown,
  phase: 'flush' | 'retry' | 'persisted'
) => {
  if (reportedAnalyticsQueueFailures.has(queueKey)) return;
  reportedAnalyticsQueueFailures.add(queueKey);

  const queued = analyticsWriteQueue.get(queueKey);
  logAnalyticsFailure('analytics_queue_flush_failed', error, {
    phase,
    ...getAnalyticsQueueContext(queueKey, queued),
  });
};

const writeAnalyticsEventViaPublicApi = async (
  updateData: Record<string, AnalyticsWriteValue>,
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string,
  storeTimeZone?: string,
  businessDayEndTime?: string,
  deliveryId?: string,
) => {
  const policyData = filterAnalyticsUpdateData(updateData);
  if (Object.keys(policyData).length === 0) return;
  const normalizedDeliveryId = normalizeAnalyticsDeliveryId(deliveryId);
  if (!normalizedDeliveryId) throw new Error('Invalid analytics delivery ID');

  const response = await fetch('/api/public/analytics/track', {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    method: 'POST',
    redirect: 'manual',
    body: JSON.stringify({
      updateData: policyData,
      tenantId: String(tenantId),
      storeId: String(storeId),
      projectId,
      dateString,
      storeTimeZone,
      businessDayEndTime,
      deliveryId: normalizedDeliveryId,
    }),
  });

  if (!response.ok) {
    const retryAfterSeconds = Number(response.headers.get('Retry-After'));
    const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(retryAfterSeconds * 1000, ANALYTICS_FLUSH_MAX_RETRY_DELAY_MS)
      : undefined;
    throw new AnalyticsFlushHttpError(response.status, retryAfterMs);
  }
};

const isRetryableAnalyticsFlushError = (error: unknown): boolean => {
  if (!(error instanceof AnalyticsFlushHttpError)) return true;
  return error.status === 408
    || error.status === 425
    || error.status === 429
    || error.status >= 500;
};

const getAnalyticsRetryDelayMs = (error: unknown, retryCount: number): number => {
  if (error instanceof AnalyticsFlushHttpError && error.retryAfterMs) return error.retryAfterMs;
  return Math.min(
    ANALYTICS_FLUSH_DELAY_MS * (2 ** Math.max(0, retryCount - 1)),
    ANALYTICS_FLUSH_MAX_RETRY_DELAY_MS,
  );
};

const scheduleAnalyticsQueueFlush = (
  queueKey: string,
  delayMs: number,
  forceEarlier = false,
): void => {
  const queued = analyticsWriteQueue.get(queueKey);
  if (!queued) return;
  if (queued.flushTimer && !forceEarlier) return;
  if (queued.flushTimer) clearTimeout(queued.flushTimer);

  queued.flushTimer = setTimeout(() => {
    const current = analyticsWriteQueue.get(queueKey);
    if (current) current.flushTimer = undefined;
    void flushAnalyticsQueueKey(queueKey).catch((error) => {
      reportAnalyticsQueueFlushError(queueKey, error, 'retry');
    });
  }, delayMs);
};

const flushAnalyticsQueueKey = async (queueKey: string) => {
  const queued = analyticsWriteQueue.get(queueKey);
  if (!queued) return;
  if (flushingAnalyticsKeys.has(queueKey)) return;

  flushingAnalyticsKeys.add(queueKey);
  if (queued.flushTimer) clearTimeout(queued.flushTimer);
  queued.flushTimer = undefined;
  const flushedData = { ...queued.updateData };
  const flushedEventCount = queued.eventCount;
  const flushedDeliveryId = queued.deliveryId;

  try {
    await writeAnalyticsEventViaPublicApi(
      flushedData,
      queued.tenantId,
      queued.storeId,
      queued.projectId,
      queued.dateString,
      queued.storeTimeZone,
      queued.businessDayEndTime,
      flushedDeliveryId,
    );

    const current = analyticsWriteQueue.get(queueKey);
    if (current) {
      current.updateData = subtractFlushedAnalyticsData(current.updateData, flushedData);
      current.eventCount = Math.max(0, current.eventCount - flushedEventCount);
      current.retryCount = 0;
      current.createdAt = Date.now();
      if (current.eventCount === 0 || Object.keys(current.updateData).length === 0) {
        analyticsWriteQueue.delete(queueKey);
      } else {
        current.deliveryId = createRandomIdSegment(32);
      }
    }
    reportedAnalyticsQueueFailures.delete(queueKey);
    persistAnalyticsQueue();
  } catch (error) {
    const current = analyticsWriteQueue.get(queueKey);
    const retryable = isRetryableAnalyticsFlushError(error);
    if (current) {
      current.retryCount += 1;
      const expired = Date.now() - current.createdAt > ANALYTICS_QUEUE_MAX_AGE_MS;
      if (!retryable || expired || current.retryCount >= ANALYTICS_QUEUE_MAX_RETRY_COUNT) {
        analyticsWriteQueue.delete(queueKey);
      } else {
        scheduleAnalyticsQueueFlush(queueKey, getAnalyticsRetryDelayMs(error, current.retryCount), true);
      }
    }
    persistAnalyticsQueue();
    throw error;
  } finally {
    flushingAnalyticsKeys.delete(queueKey);
    const pending = analyticsWriteQueue.get(queueKey);
    if (pending && !pending.flushTimer) {
      scheduleAnalyticsQueueFlush(
        queueKey,
        pending.eventCount >= ANALYTICS_FLUSH_MAX_EVENTS ? 0 : ANALYTICS_FLUSH_DELAY_MS,
      );
    }
  }
};

const flushAllAnalyticsQueue = () => {
  analyticsWriteQueue.forEach((_, queueKey) => {
    void flushAnalyticsQueueKey(queueKey).catch((error) => {
      reportAnalyticsQueueFlushError(queueKey, error, 'flush');
    });
  });
};

const enqueueAnalyticsWrite = (
  updateData: Record<string, unknown>,
  tenantId: string,
  storeId: string,
  projectId: string,
  dateString: string,
  storeTimeZone?: string,
  businessDayEndTime?: string,
): boolean => {
  const policyData = filterAnalyticsUpdateData(updateData);
  if (Object.keys(policyData).length === 0) return false;

  const queueKey = getAnalyticsQueueKey(tenantId, storeId, projectId, dateString);
  const existing = analyticsWriteQueue.get(queueKey);

  if (existing) {
    const mergedFieldCount = new Set([
      ...Object.keys(existing.updateData),
      ...Object.keys(policyData),
    ]).size;
    if (mergedFieldCount > 100 && !flushingAnalyticsKeys.has(queueKey)) {
      void flushAnalyticsQueueKey(queueKey).catch((error) => {
        reportAnalyticsQueueFlushError(queueKey, error, 'flush');
      });
    }
    if (mergedFieldCount > 200) return false;

    mergeAnalyticsUpdateData(existing.updateData, policyData);
    existing.eventCount += 1;

    if (existing.eventCount >= ANALYTICS_FLUSH_MAX_EVENTS) {
      scheduleAnalyticsQueueFlush(queueKey, 0, true);
    }
    persistAnalyticsQueue();
    return true;
  }

  if (analyticsWriteQueue.size >= ANALYTICS_QUEUE_MAX_ENTRIES) {
    if (!reportedAnalyticsQueueCapacityFailure) {
      reportedAnalyticsQueueCapacityFailure = true;
      logAnalyticsFailure('analytics_queue_capacity_exceeded', undefined, {
        queueEntryCount: analyticsWriteQueue.size,
        queuedEventCount: getQueuedAnalyticsEventCount(),
      });
    }
    return false;
  }

  const queued: QueuedAnalyticsWrite = {
    tenantId,
    storeId,
    projectId,
    dateString,
    storeTimeZone,
    businessDayEndTime,
    deliveryId: createRandomIdSegment(32),
    updateData: { ...policyData },
    eventCount: 1,
    retryCount: 0,
    createdAt: Date.now(),
  };

  analyticsWriteQueue.set(queueKey, queued);
  reportedAnalyticsQueueCapacityFailure = false;
  scheduleAnalyticsQueueFlush(queueKey, ANALYTICS_FLUSH_DELAY_MS);
  persistAnalyticsQueue();
  return true;
};

if (typeof window !== 'undefined') {
  try {
    const persisted = window.localStorage.getItem(ANALYTICS_QUEUE_STORAGE_KEY);
    if (persisted && persisted.length > ANALYTICS_QUEUE_MAX_STORAGE_CHARS) {
      throw new Error('analytics_persisted_queue_storage_limit_exceeded');
    }
    const entries = normalizePersistedAnalyticsQueue(persisted ? JSON.parse(persisted) : []);
    entries.forEach((queued) => {
      analyticsWriteQueue.set(queued.queueKey, {
        tenantId: queued.tenantId,
        storeId: queued.storeId,
        projectId: queued.projectId,
        dateString: queued.dateString,
        storeTimeZone: queued.storeTimeZone,
        businessDayEndTime: queued.businessDayEndTime,
        deliveryId: queued.deliveryId,
        updateData: queued.updateData,
        eventCount: queued.eventCount,
        retryCount: queued.retryCount,
        createdAt: queued.createdAt,
      });
      void flushAnalyticsQueueKey(queued.queueKey).catch((error) => {
        reportAnalyticsQueueFlushError(queued.queueKey, error, 'persisted');
      });
    });
    persistAnalyticsQueue();
  } catch (error) {
    logAnalyticsFailure('analytics_persisted_queue_invalid', error);
    window.localStorage.removeItem(ANALYTICS_QUEUE_STORAGE_KEY);
  }

  window.addEventListener('pagehide', flushAllAnalyticsQueue);
  window.addEventListener('beforeunload', flushAllAnalyticsQueue);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAllAnalyticsQueue();
    }
  });
}

const getDailyAnalyticsDocument = async (
  tId: string,
  sId: string,
  projectId: string,
  date: string,
) => {
  const docSnap = await getDoc(getDailyAnalyticsDocRef(tId, sId, projectId, date));
  return docSnap.exists() ? normalizeDailyAnalytics(docSnap.data(), date) : null;
};

export const getOptimizedAnalyticsData = async (
  tId: string | number,
  sId: string | number,
  projectId: string,
  startDate: string,
  endDate: string,
  timeZone?: string,
  businessDayEndTime?: string,
) => {
  return await apiCallComposer(
    async () => {
      const tenantId = normalizeAnalyticsScopeDocumentId(tId);
      const storeId = normalizeAnalyticsScopeDocumentId(sId);
      const analyticsProjectId = normalizeAnalyticsProjectId(projectId);
      const normalizedStartDate = normalizeAnalyticsDateKey(startDate);
      const normalizedEndDate = normalizeAnalyticsDateKey(endDate);
      if (
        !tenantId
        || !storeId
        || !analyticsProjectId
        || !normalizedStartDate
        || !normalizedEndDate
        || normalizedStartDate > normalizedEndDate
      ) {
        throw new Error('Invalid analytics read scope or date range');
      }

      const dashboardRef = getAnalyticsDashboardSummaryDocRef(tenantId, storeId, analyticsProjectId);
      const dashboardSnap = await getDoc(dashboardRef);
      const todayKey = getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);

      if (dashboardSnap.exists()) {
        const dashboardData = normalizeAnalyticsDashboardReadModel(
          dashboardSnap.data(),
          tenantId,
          storeId,
          analyticsProjectId,
        );
        if (!dashboardData) throw new Error('Invalid analytics dashboard read model');
        const daily30d = dashboardData.daily30d;
        const lastSettledLocalDate = dashboardData.lastSettledLocalDate;
        const firstCachedDate = daily30d[0]?.date || '';
        const rangeNeedsToday = normalizedEndDate >= todayKey;
        const settledEndDate = rangeNeedsToday ? lastSettledLocalDate : normalizedEndDate;
        const canUseCachedRange = Boolean(
          firstCachedDate &&
          lastSettledLocalDate &&
          normalizedStartDate >= firstCachedDate &&
          settledEndDate <= lastSettledLocalDate
        );

        if (canUseCachedRange) {
          const daily = daily30d.filter((day) => {
            return day.date >= normalizedStartDate && day.date <= settledEndDate;
          });

          if (rangeNeedsToday && todayKey >= normalizedStartDate) {
            const todayDoc = await getDailyAnalyticsDocument(tenantId, storeId, analyticsProjectId, todayKey);
            if (todayDoc) {
              daily.push(todayDoc);
            }
          }

          return {
            summary: dashboardData.analyticsSummary,
            daily,
            source: rangeNeedsToday ? 'dashboard_summary_plus_today' : 'dashboard_summary',
          };
        }
      }

      return {
        summary: null,
        daily: [],
        source: 'read_model_missing_or_range_unavailable',
      };
    },
    "getOptimizedAnalyticsData"
  );
};

/**
 * Track an analytics event by updating the daily document
 * Document key: {tId}_{sId}_{projectId}_daily_{date}
 */
export const trackAnalyticsEvent = async (
  updateData: Record<string, unknown>,
  tenantId?: string | number,
  storeId?: string | number,
  projectId?: string,
  storeTimeZone?: string,
  businessDayEndTime?: string
) => {
  // Validate required IDs for project-wise analytics
  if (!tenantId || !storeId || !projectId) {
    logAnalyticsFailure('analytics_missing_required_identity', undefined, getAnalyticsTrackingContext({
      tenantId,
      storeId,
      projectId,
      storeTimeZone,
      businessDayEndTime,
    }));
    return false;
  }

  try {
    const normalizedTenantId = normalizeAnalyticsScopeDocumentId(tenantId);
    const normalizedStoreId = normalizeAnalyticsScopeDocumentId(storeId);
    const normalizedProjectId = normalizeAnalyticsProjectId(projectId);
    if (!normalizedTenantId || !normalizedStoreId || !normalizedProjectId) {
      logAnalyticsFailure('analytics_invalid_write_scope', undefined, getAnalyticsTrackingContext({
        tenantId,
        storeId,
        projectId,
      }));
      return false;
    }

    const dateString = getBusinessAnalyticsDateKey(new Date(), storeTimeZone, businessDayEndTime);

    // Anonymous customer tracking is browser-only and always crosses the
    // validated Admin-backed public route. Server callers must use an explicit
    // server analytics helper with independently validated scope.
    if (typeof window === 'undefined') return false;
    return enqueueAnalyticsWrite(
      updateData,
      normalizedTenantId,
      normalizedStoreId,
      normalizedProjectId,
      dateString,
      storeTimeZone,
      businessDayEndTime,
    );
  } catch (error) {
    logAnalyticsFailure('analytics_enqueue_failed', error, getAnalyticsTrackingContext({
      tenantId,
      storeId,
      projectId,
      storeTimeZone,
      businessDayEndTime,
    }));
    return false;
  }
};
