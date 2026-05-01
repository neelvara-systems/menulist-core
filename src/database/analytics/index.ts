import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { getAnalyticsDateKey } from "@lib/analytics/dateKey";
import { firebaseClient } from "@lib/firebase/firebaseClient";
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

const ANALYTICS_FLUSH_DELAY_MS = 3000;
const ANALYTICS_FLUSH_MAX_EVENTS = 8;
const IMMEDIATE_ANALYTICS_FIELDS = new Set([
  'totalMenuActionClicks',
  'totalOBPActionClicks',
  'totalOBPMenuClicks',
  'totalOBPLinkClicks',
  'totalOBPShares',
  'totalInstallStarted',
  'totalInstalled',
]);

type QueuedAnalyticsWrite = {
  tenantId: string;
  storeId: string;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  updateData: Record<string, any>;
  eventCount: number;
  flushTimer?: ReturnType<typeof setTimeout>;
};

const analyticsWriteQueue = new Map<string, QueuedAnalyticsWrite>();

const getAnalyticsQueueKey = (
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string
) => `${tenantId}_${storeId}_${projectId}_${dateString}`;

const shouldWriteImmediately = (updateData: Record<string, any>): boolean => {
  return Object.keys(updateData).some((key) => (
    IMMEDIATE_ANALYTICS_FIELDS.has(key) ||
    key.startsWith('menuActionClicks.') ||
    key.startsWith('obpActionClicks.') ||
    key.startsWith('obpLinkClicks.') ||
    key.startsWith('shortcutClicks.')
  ));
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

const writeAnalyticsEventNow = async (
  updateData: Record<string, any>,
  tenantId: string | number,
  storeId: string | number,
  projectId: string,
  dateString: string,
  storeTimeZone?: string,
) => {
  const dailyDocRef = getDailyAnalyticsDocRef(tenantId, storeId, projectId, dateString);
  const processedData: any = {};

  Object.keys(updateData).forEach(key => {
    if (typeof updateData[key] === 'number') {
      processedData[key] = increment(updateData[key]);
    } else {
      processedData[key] = updateData[key];
    }
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
    ...processedData,
    lastUpdated: serverTimestamp()
  }, { merge: true });
};

const flushAnalyticsQueueKey = async (queueKey: string) => {
  const queued = analyticsWriteQueue.get(queueKey);
  if (!queued) return;

  analyticsWriteQueue.delete(queueKey);
  if (queued.flushTimer) clearTimeout(queued.flushTimer);

  await writeAnalyticsEventNow(
    queued.updateData,
    queued.tenantId,
    queued.storeId,
    queued.projectId,
    queued.dateString,
    queued.storeTimeZone,
  );
};

const flushAllAnalyticsQueue = () => {
  analyticsWriteQueue.forEach((_, queueKey) => {
    void flushAnalyticsQueueKey(queueKey).catch((error) => {
      console.error('Error flushing queued analytics event:', error);
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
) => {
  const queueKey = getAnalyticsQueueKey(tenantId, storeId, projectId, dateString);
  const existing = analyticsWriteQueue.get(queueKey);

  if (existing) {
    mergeQueuedAnalyticsData(existing.updateData, updateData);
    existing.eventCount += 1;

    if (existing.eventCount >= ANALYTICS_FLUSH_MAX_EVENTS) {
      void flushAnalyticsQueueKey(queueKey).catch((error) => {
        console.error('Error flushing queued analytics event:', error);
      });
    }
    return;
  }

  const queued: QueuedAnalyticsWrite = {
    tenantId: String(tenantId),
    storeId: String(storeId),
    projectId: String(projectId),
    dateString,
    storeTimeZone,
    updateData: { ...updateData },
    eventCount: 1,
  };

  queued.flushTimer = setTimeout(() => {
    void flushAnalyticsQueueKey(queueKey).catch((error) => {
      console.error('Error flushing queued analytics event:', error);
    });
  }, ANALYTICS_FLUSH_DELAY_MS);

  analyticsWriteQueue.set(queueKey, queued);
};

if (typeof window !== 'undefined') {
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
) => {
  return await apiCallComposer(
    async () => {
      const dashboardRef = getAnalyticsDashboardSummaryDocRef(tId, sId, projectId);
      const dashboardSnap = await getDoc(dashboardRef);
      const todayKey = getAnalyticsDateKey(new Date(), timeZone);

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
  storeTimeZone?: string
) => {
  // Validate required IDs for project-wise analytics
  if (!tenantId || !storeId || !projectId) {
    console.warn('Analytics tracking skipped: Missing tenantId, storeId, or projectId');
    return false;
  }

  return await apiCallComposer(
    async () => {
      const dateString = getAnalyticsDateKey(new Date(), storeTimeZone);

      // Update Firestore document with merge to avoid overwriting existing data
      // COST OPTIMIZATION: Only write to daily document
      // Summary document is updated by nightly Cloud Function (aggregateCustomerAnalytics)
      // This reduces writes by 50% (1 write per event instead of 2)
      // COST OPTIMIZATION: passive/engagement events are coalesced for a short
      // window, so a menu view + item tap + search burst can become one write.
      // Final conversion actions stay immediate because losing those events is
      // more damaging to owner decision-making than saving a write.
      if (shouldWriteImmediately(updateData)) {
        await writeAnalyticsEventNow(updateData, tenantId, storeId, projectId, dateString, storeTimeZone);
      } else {
        enqueueAnalyticsWrite(updateData, tenantId, storeId, projectId, dateString, storeTimeZone);
      }

      // NOTE: Summary updates moved to Cloud Function for cost optimization
      // See: functions/src/aggregateCustomerAnalytics.ts (TODO: implement)

      return true;
    },
    "trackAnalyticsEvent"
  );
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
