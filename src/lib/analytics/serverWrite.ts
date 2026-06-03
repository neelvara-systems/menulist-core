import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const DAILY_ANALYTICS_COLLECTION = 'daily';

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
  'recommendationClicks',
  'recommendationClicksByItem',
  'searchTerms',
  'shortcutClicks',
  'unavailableItemTapsByItem',
  'viewsByCampaign',
  'viewsByContent',
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

export async function writePublicAnalyticsEventAdmin({
  updateData,
  tenantId,
  storeId,
  projectId,
  dateString,
  storeTimeZone,
  businessDayEndTime,
}: {
  updateData: Record<string, string | number | boolean | null>;
  tenantId: string | number;
  storeId: string | number;
  projectId: string;
  dateString: string;
  storeTimeZone?: string;
  businessDayEndTime?: string;
}) {
  const docId = `${tenantId}_${storeId}_${projectId}_${DAILY_ANALYTICS_COLLECTION}_${dateString}`;
  const processedData: Record<string, any> = {};

  Object.keys(updateData).forEach((key) => {
    if (key === 'date') return;
    const rawValue = updateData[key];
    if (typeof rawValue === 'number') {
      assignProcessedAnalyticsField(processedData, key, FieldValue.increment(rawValue));
      return;
    }
    assignProcessedAnalyticsField(processedData, key, rawValue);
  });

  await firestoreAdmin.collection(DB_COLLECTIONS.ANALYTICS).doc(docId).set({
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
    lastUpdated: FieldValue.serverTimestamp(),
  }, { merge: true });
}
