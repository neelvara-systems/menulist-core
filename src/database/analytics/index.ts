import { DB_COLLECTIONS } from "@constant/database";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
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
  projectId?: string
) => {
  // Validate required IDs for project-wise analytics
  if (!tenantId || !storeId || !projectId) {
    console.warn('Analytics tracking skipped: Missing tenantId, storeId, or projectId');
    return false;
  }

  return await apiCallComposer(
    async () => {
      // Get current date in YYYY-MM-DD format (UTC)
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];

      // Reference to daily document: {tId}_{sId}_{projectId}_daily_{date}
      const dailyDocRef = getDailyAnalyticsDocRef(tenantId, storeId, projectId, dateString);

      // Process numeric values to use increment() for atomic updates
      const processedData: any = {};

      // Process the update data to use increment() for numeric values
      Object.keys(updateData).forEach(key => {
        if (typeof updateData[key] === 'number') {
          processedData[key] = increment(updateData[key]);
        } else {
          processedData[key] = updateData[key];
        }
      });

      // Update Firestore document with merge to avoid overwriting existing data
      // COST OPTIMIZATION: Only write to daily document
      // Summary document is updated by nightly Cloud Function (aggregateCustomerAnalytics)
      // This reduces writes by 50% (1 write per event instead of 2)
      await setDoc(dailyDocRef, {
        ...processedData,
        lastUpdated: serverTimestamp()
      }, { merge: true });

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
