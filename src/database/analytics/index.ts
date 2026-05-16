import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getBusinessAnalyticsDateKey } from "@lib/analytics/businessDay";
import { addDaysToAnalyticsDateKey } from "@lib/analytics/dateKey";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { logger } from "@lib/monitoring/logger";
import { collection, doc, DocumentData, getDoc, getDocs, increment, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from "firebase/firestore";

// Base collection path
const COLLECTION = DB_COLLECTIONS.ANALYTICS;
const DAILY_ANALYTICS_COLLECTION = 'daily';
const OVERALL_ANALYTICS_COLLECTION = 'overall';
const SUMMARY_ANALYTICS_DOC = 'summary';


/**
 * Get reference to a specific daily analytics document
 * Format: {tId}_{sId}_{projectId}_daily_{date}
 */
const getDailyAnalyticsDocRef = (tId: string | number, sId: string | number, projectId: string, date: string) => {
  const docId = `${tId}_${sId}_${projectId}_${DAILY_ANALYTICS_COLLECTION}_${date}`;
  return doc(firebaseClient, COLLECTION, docId);
};

/**
 * Get reference to the analytics summary document
 * Format: {tId}_{sId}_{projectId}_overall_summary
 */
const getAnalyticsSummaryDocRef = (tId: string | number, sId: string | number, projectId: string) => {
  const docId = `${tId}_${sId}_${projectId}_${OVERALL_ANALYTICS_COLLECTION}_${SUMMARY_ANALYTICS_DOC}`;
  return doc(firebaseClient, COLLECTION, docId);
};

const getAnalyticsDashboardSummaryDocRef = (tId: string | number, sId: string | number, projectId: string) => {
  const docId = `${tId}_${sId}_${projectId}_dashboard_summary`;
  return doc(firebaseClient, COLLECTION, docId);
};

const ANALYTICS_FLUSH_DELAY_MS = 30000;
const ANALYTICS_FLUSH_MAX_EVENTS = 40;
const ANALYTICS_QUEUE_STORAGE_KEY = 'menulist_pending_analytics_queue_v1';

type QueuedAnalyticsWrite = {
  tenantId: string;
  storeId: string;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  businessDayEndTime?: string;
  updateData: Record<string, any>;
  eventCount: number;
  flushTimer?: ReturnType<typeof setTimeout>;
};

const analyticsWriteQueue = new Map<string, QueuedAnalyticsWrite>();
const flushingAnalyticsKeys = new Set<string>();
const reportedAnalyticsQueueFailures = new Set<string>();

const persistAnalyticsQueue = () => {
  if (typeof window === 'undefined') return;
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
        updateData: queued.updateData,
        eventCount: queued.eventCount,
      },
    ]);

    if (serializable.length === 0) {
      window.localStorage.removeItem(ANALYTICS_QUEUE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ANALYTICS_QUEUE_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Analytics must never break the public menu.
  }
};

const getAnalyticsQueueKey = (
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string
) => `${tenantId}_${storeId}_${projectId}_${dateString}`;

const reportAnalyticsQueueFlushError = (
  queueKey: string,
  error: unknown,
  phase: 'flush' | 'retry' | 'persisted'
) => {
  if (reportedAnalyticsQueueFailures.has(queueKey)) return;
  reportedAnalyticsQueueFailures.add(queueKey);

  const queued = analyticsWriteQueue.get(queueKey);
  logger.error('[AnalyticsQueue] Queued analytics flush failed', error, {
    phase,
    queueKey,
    tenantId: queued?.tenantId,
    storeId: queued?.storeId,
    projectId: queued?.projectId,
    dateString: queued?.dateString,
    eventCount: queued?.eventCount,
  });
};

const mergeQueuedAnalyticsData = (target: Record<string, any>, source: Record<string, any>) => {
  Object.entries(source).forEach(([key, value]) => {
    if (typeof value === 'number') {
      target[key] = (target[key] || 0) + value;
      return;
    }

    target[key] = value;
  });
};

const TWO_LEVEL_ANALYTICS_MAP_FIELDS = new Set([
  'actionSessionsBySource',
  'appOpensByPlatform',
  'appOpensBySurface',
  'attributeFilterActionClicks',
  'attributeFilterInteractions',
  'attributeFilterItemTaps',
  'attributeFilterItemViews',
  'attributeFilterNames',
  'attributeFilterSearches',
  'attributeFilterUnavailableTaps',
  'categoryNames',
  'clicksByCategory',
  'clicksByDevice',
  'clicksByItem',
  'clicksByLocation',
  'decisionBlocksRendered',
  'hourlyAppOpens',
  'hourlyClicks',
  'hourlyDecisionBlocksRendered',
  'hourlyItemViews',
  'hourlyMenuActionClicks',
  'hourlyOBPActionClicks',
  'hourlyOBPLinkClicks',
  'hourlyOBPMenuClicks',
  'hourlyPromptShown',
  'hourlyRecommendationClicks',
  'hourlySearches',
  'hourlyUnavailableItemTaps',
  'hourlyViews',
  'installsByDevice',
  'installsByLocation',
  'installsByPlatform',
  'installsBySource',
  'installsBySurface',
  'itemNames',
  'languageAdoptions',
  'languageNames',
  'menuActionClicks',
  'menuActionClicksBySource',
  'menuResolutionLayer',
  'menuSessionsByLanguage',
  'menuSessionsBySource',
  'obpActionClicks',
  'obpLinkClicks',
  'obpLanguageAdoptions',
  'obpLanguageNames',
  'obpSessionsByLanguage',
  'obpMenuClicksBySurface',
  'obpShares',
  'obpViewsByLanguage',
  'recommendationClicks',
  'recommendationClicksByItem',
  'searchTerms',
  'shortcutClicks',
  'unavailableItemTapsByItem',
  'viewsByCampaign',
  'viewsByCategory',
  'viewsByDevice',
  'viewsByEntrySource',
  'menuViewsByLanguage',
  'viewsByLocation',
  'viewsByMedium',
  'viewsBySource',
  'viewsByItem',
  'zeroResultSearchTerms',
]);

const setAnalyticsObjectValue = (target: Record<string, any>, key: string, value: any) => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
};

const ensureAnalyticsObject = (target: Record<string, any>, key: string): Record<string, any> => {
  const existing = Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined;
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) return existing;
  const next: Record<string, any> = {};
  setAnalyticsObjectValue(target, key, next);
  return next;
};

const assignProcessedAnalyticsField = (
  target: Record<string, any>,
  key: string,
  value: any
) => {
  const firstDotIndex = key.indexOf('.');
  if (firstDotIndex === -1) {
    setAnalyticsObjectValue(target, key, value);
    return;
  }

  const parent = key.slice(0, firstDotIndex);
  const childPath = key.slice(firstDotIndex + 1);

  if (parent === 'hourlyClicksByItem') {
    const lastDotIndex = childPath.lastIndexOf('.');
    if (lastDotIndex === -1) {
      target[key] = value;
      return;
    }

    const itemId = childPath.slice(0, lastDotIndex);
    const hour = childPath.slice(lastDotIndex + 1);
    const parentMap = ensureAnalyticsObject(target, parent);
    const itemMap = ensureAnalyticsObject(parentMap, itemId);
    setAnalyticsObjectValue(itemMap, hour, value);
    return;
  }

  if (!TWO_LEVEL_ANALYTICS_MAP_FIELDS.has(parent)) {
    setAnalyticsObjectValue(target, key, value);
    return;
  }

  const parentMap = ensureAnalyticsObject(target, parent);
  setAnalyticsObjectValue(parentMap, childPath, value);
};

const writeAnalyticsEventNow = async (
  updateData: Record<string, any>,
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string,
  storeTimeZone?: string,
  businessDayEndTime?: string,
) => {
  const dailyDocRef = getDailyAnalyticsDocRef(tenantId, storeId, projectId, dateString);
  const processedData: any = {};

  Object.keys(updateData).forEach(key => {
    const value = typeof updateData[key] === 'number'
      ? increment(updateData[key])
      : updateData[key];

    assignProcessedAnalyticsField(processedData, key, value);
  });

  await setDoc(dailyDocRef, {
    tId: String(tenantId),
    sId: String(storeId),
    projectId: String(projectId),
    grain: DAILY_ANALYTICS_COLLECTION,
    analyticsScope: 'customer',
    surface: projectId === 'obp'
      ? 'obp'
      : projectId === 'customerApp'
        ? 'customerApp'
        : 'menu',
    localDate: dateString,
    storeTimeZone: storeTimeZone || 'UTC',
    businessDayEndTime: businessDayEndTime || null,
    ...processedData,
    lastUpdated: serverTimestamp()
  }, { merge: true });
};

const flushAnalyticsQueueKey = async (queueKey: string) => {
  const queued = analyticsWriteQueue.get(queueKey);
  if (!queued) return;
  if (flushingAnalyticsKeys.has(queueKey)) return;

  flushingAnalyticsKeys.add(queueKey);
  if (queued.flushTimer) clearTimeout(queued.flushTimer);

  try {
    await writeAnalyticsEventNow(
      queued.updateData,
      queued.tenantId,
      queued.storeId,
      queued.projectId,
      queued.dateString,
      queued.storeTimeZone,
      queued.businessDayEndTime,
    );
    analyticsWriteQueue.delete(queueKey);
    reportedAnalyticsQueueFailures.delete(queueKey);
    persistAnalyticsQueue();
  } catch (error) {
    queued.flushTimer = setTimeout(() => {
      void flushAnalyticsQueueKey(queueKey).catch((retryError) => {
        reportAnalyticsQueueFlushError(queueKey, retryError, 'retry');
      });
    }, ANALYTICS_FLUSH_DELAY_MS);
    analyticsWriteQueue.set(queueKey, queued);
    persistAnalyticsQueue();
    throw error;
  } finally {
    flushingAnalyticsKeys.delete(queueKey);
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
  updateData: Record<string, any>,
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string,
  storeTimeZone?: string,
  businessDayEndTime?: string,
) => {
  const queueKey = getAnalyticsQueueKey(tenantId, storeId, projectId, dateString);
  const existing = analyticsWriteQueue.get(queueKey);

  if (existing) {
    mergeQueuedAnalyticsData(existing.updateData, updateData);
    existing.eventCount += 1;

    if (existing.eventCount >= ANALYTICS_FLUSH_MAX_EVENTS) {
      void flushAnalyticsQueueKey(queueKey).catch((error) => {
        reportAnalyticsQueueFlushError(queueKey, error, 'flush');
      });
    }
    persistAnalyticsQueue();
    return;
  }

  const queued: QueuedAnalyticsWrite = {
    tenantId: String(tenantId),
    storeId: String(storeId),
    projectId: String(projectId),
    dateString,
    storeTimeZone,
    businessDayEndTime,
    updateData: { ...updateData },
    eventCount: 1,
  };

  queued.flushTimer = setTimeout(() => {
    void flushAnalyticsQueueKey(queueKey).catch((error) => {
      reportAnalyticsQueueFlushError(queueKey, error, 'flush');
    });
  }, ANALYTICS_FLUSH_DELAY_MS);

  analyticsWriteQueue.set(queueKey, queued);
  persistAnalyticsQueue();
};

if (typeof window !== 'undefined') {
  try {
    const persisted = window.localStorage.getItem(ANALYTICS_QUEUE_STORAGE_KEY);
    const entries = persisted ? JSON.parse(persisted) : [];
    if (Array.isArray(entries)) {
      entries.forEach(([queueKey, queued]) => {
        if (!queueKey || !queued?.updateData) return;
        const currentLocalDate = getBusinessAnalyticsDateKey(new Date(), queued.storeTimeZone, queued.businessDayEndTime);
        const oldestRecoverableDate = addDaysToAnalyticsDateKey(currentLocalDate, -1);
        if (String(queued.dateString || '') < oldestRecoverableDate) return;
        analyticsWriteQueue.set(queueKey, {
          tenantId: String(queued.tenantId),
          storeId: String(queued.storeId),
          projectId: String(queued.projectId),
          dateString: String(queued.dateString),
          storeTimeZone: queued.storeTimeZone,
          businessDayEndTime: queued.businessDayEndTime,
          updateData: queued.updateData,
          eventCount: queued.eventCount || 1,
        });
        void flushAnalyticsQueueKey(queueKey).catch((error) => {
          reportAnalyticsQueueFlushError(queueKey, error, 'persisted');
        });
      });
      persistAnalyticsQueue();
    }
  } catch (error) {
    logger.warn('[AnalyticsQueue] Dropped invalid persisted analytics queue', {
      error: error instanceof Error ? error.message : String(error),
    });
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

/**
 * Converts Firestore data to proper types
 */
const convertFirestoreData = (doc: DocumentData): any => {
  const data = doc.data();

  // Convert Firestore Timestamps to JavaScript Dates
  if (data) {
    Object.keys(data).forEach(key => {
      if (data[key] instanceof Timestamp) {
        data[key] = data[key].toDate();
      }
    });
    return { ...data, id: doc.id };
  }

  return null;
};

/**
 * Get analytics summary for a specific project
 * Document key: {tId}_{sId}_{projectId}_overall_summary
 */
export const getAnalyticsSummary = async (tId: string | number, sId: string | number, projectId: string) => {
  return await apiCallComposer(
    async () => {
      const summaryDocRef = getAnalyticsSummaryDocRef(tId, sId, projectId);
      const docSnap = await getDoc(summaryDocRef);

      if (docSnap.exists()) {
        return convertFirestoreData(docSnap);
      } else {
        return null;
      }
    },
    "getAnalyticsSummary"
  );
};

/**
 * Get daily analytics for a specific date and project
 * Document key: {tId}_{sId}_{projectId}_daily_{date}
 */
export const getDailyAnalytics = async (tId: string | number, sId: string | number, projectId: string, date: string) => {
  return await apiCallComposer(
    async () => {
      const dailyDocRef = getDailyAnalyticsDocRef(tId, sId, projectId, date);
      const docSnap = await getDoc(dailyDocRef);

      if (docSnap.exists()) {
        return convertFirestoreData(docSnap);
      } else {
        return null;
      }
    },
    "getDailyAnalytics"
  );
};

/**
 * Get daily analytics for a date range for a specific project
 * Document key pattern: {tId}_{sId}_{projectId}_daily_{date}
 */
export const getDailyAnalyticsRange = async (tId: string | number, sId: string | number, projectId: string, startDate: string, endDate: string) => {
  return await apiCallComposer(
    async () => {
      const collectionRef = collection(firebaseClient, COLLECTION);

      // Create the prefix for our documents: {tId}_{sId}_{projectId}_daily_
      const docPrefix = `${tId}_${sId}_${projectId}_${DAILY_ANALYTICS_COLLECTION}_`;

      // Query documents within date range, ordered by date
      const q = query(
        collectionRef,
        where('__name__', '>=', `${docPrefix}${startDate}`),
        where('__name__', '<=', `${docPrefix}${endDate}`),
        orderBy('__name__')
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return [];
      } else {
        return querySnapshot.docs.map(doc => convertFirestoreData(doc));
      }
    },
    "getDailyAnalyticsRange"
  );
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
      const dashboardRef = getAnalyticsDashboardSummaryDocRef(tId, sId, projectId);
      const dashboardSnap = await getDoc(dashboardRef);
      const todayKey = getBusinessAnalyticsDateKey(new Date(), timeZone, businessDayEndTime);

      if (dashboardSnap.exists()) {
        const dashboardData = dashboardSnap.data();
        const daily30d = Array.isArray(dashboardData.daily30d) ? dashboardData.daily30d : [];
        const lastSettledLocalDate = String(dashboardData.lastSettledLocalDate || '');
        const firstCachedDate = daily30d[0]?.date ? String(daily30d[0].date) : '';
        const rangeNeedsToday = endDate >= todayKey;
        const settledEndDate = rangeNeedsToday ? lastSettledLocalDate : endDate;
        const canUseCachedRange = Boolean(
          firstCachedDate &&
          lastSettledLocalDate &&
          startDate >= firstCachedDate &&
          settledEndDate <= lastSettledLocalDate
        );

        if (canUseCachedRange) {
          const daily = daily30d.filter((day: any) => {
            const date = String(day.date || '');
            return date >= startDate && date <= settledEndDate;
          });

          if (rangeNeedsToday && todayKey >= startDate) {
            const todayDoc = await getDailyAnalytics(tId, sId, projectId, todayKey);
            if (todayDoc) {
              daily.push(todayDoc);
            }
          }

          return {
            summary: dashboardData.analyticsSummary || null,
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
 * Get top performing menu items for a specific project
 */
export const getTopItems = async (tId: string | number, sId: string | number, projectId: string, limit: number = 10) => {
  return await apiCallComposer(
    async () => {
      const summaryDocRef = getAnalyticsSummaryDocRef(tId, sId, projectId);
      const docSnap = await getDoc(summaryDocRef);

      if (docSnap.exists() && docSnap.data()?.topItems) {
        // Return top N items from the summary document
        return docSnap.data()?.topItems.slice(0, limit);
      } else {
        return [];
      }
    },
    "getTopItems"
  );
};

/**
 * Track an analytics event by updating the daily document
 * Document key: {tId}_{sId}_{projectId}_daily_{date}
 */
export const trackAnalyticsEvent = async (
  updateData: any,
  tenantId?: string | number,
  storeId?: string | number,
  projectId?: string,
  storeTimeZone?: string,
  businessDayEndTime?: string
) => {
  // Validate required IDs for project-wise analytics
  if (!tenantId || !storeId || !projectId) {
    console.warn('Analytics tracking skipped: Missing tenantId, storeId, or projectId');
    return false;
  }

  try {
    const dateString = getBusinessAnalyticsDateKey(new Date(), storeTimeZone, businessDayEndTime);

    // Public analytics must not go through apiCallComposerClient. That wrapper
    // fetches auth/session state and dispatches global loaders per event, which
    // is wrong for anonymous customer surfaces and defeats the local write queue.
    if (typeof window !== 'undefined') {
      enqueueAnalyticsWrite(updateData, tenantId, storeId, projectId, dateString, storeTimeZone, businessDayEndTime);
      return true;
    }

    // Server-side callers cannot rely on browser localStorage/timers, so keep
    // the write direct outside the client queue.
    await writeAnalyticsEventNow(updateData, tenantId, storeId, projectId, dateString, storeTimeZone, businessDayEndTime);
    return true;
  } catch (error) {
    logger.error('[AnalyticsQueue] Failed to enqueue analytics event', error, {
      tenantId,
      storeId,
      projectId,
    });
    return false;
  }
};

/**
 * Update the analytics summary document with new data
 * Document key: {tId}_{sId}_{projectId}_overall_summary
 */
const updateAnalyticsSummary = async (
  updateData: any,
  tenantId: string | number,
  storeId: string | number,
  projectId: string
) => {
  try {
    // Get reference to summary document: {tId}_{sId}_{projectId}_overall_summary
    const summaryDocRef = getAnalyticsSummaryDocRef(tenantId, storeId, projectId);

    // Prepare data for summary document
    const summaryData: any = {};

    // Process the update data for summary
    Object.keys(updateData).forEach(key => {
      // Skip hourly data in summary
      if (key.startsWith('hourly')) return;

      // For core metrics, update lifetime totals
      if (key === 'totalViews') {
        summaryData['lifetimeTotalViews'] = updateData[key];
      } else if (key === 'totalClicks') {
        summaryData['lifetimeTotalClicks'] = updateData[key];
      } else if (!key.startsWith('itemNames')) {
        // Include other metrics except itemNames
        summaryData[key] = updateData[key];
      }
    });

    // Add last updated timestamp
    summaryData.lastUpdated = serverTimestamp();

    // Update summary document with merge
    await setDoc(summaryDocRef, summaryData, { merge: true });

    // TODO: In a production environment, we would implement a Cloud Function
    // to properly aggregate top items and rolling period data

    return true;
  } catch (error) {
    console.error('Error updating analytics summary:', error);
    return false;
  }
};
