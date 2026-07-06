import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { FieldValue } from 'firebase-admin/firestore';
import { filterAnalyticsUpdateData, TWO_LEVEL_ANALYTICS_MAP_FIELDS } from './writePolicy';

const DAILY_ANALYTICS_COLLECTION = 'daily';
const PUBLIC_ANALYTICS_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;
const ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizePublicAnalyticsWriteScopeDocumentId(value: unknown): string | null {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const documentId = raw.trim();
  if (documentId !== raw || !/^\d+$/.test(documentId) || !isValidFirestoreDocumentId(documentId)) return null;

  const numericId = Number(documentId);
  return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
    ? documentId
    : null;
}

function normalizePublicAnalyticsWriteProjectId(value: unknown): string | null {
  const raw = typeof value === 'string' ? value : '';
  const projectDocumentId = raw.trim();
  return projectDocumentId === raw
    && PUBLIC_ANALYTICS_PROJECT_ID_PATTERN.test(projectDocumentId)
    && isValidFirestoreDocumentId(projectDocumentId)
    ? projectDocumentId
    : null;
}

function normalizePublicAnalyticsWriteDateKey(value: unknown): string | null {
  const dateKey = typeof value === 'string' ? value.trim() : '';
  if (dateKey !== value || !ANALYTICS_DATE_KEY_PATTERN.test(dateKey)) return null;

  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateKey
    ? null
    : dateKey;
}

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
  const tenantDocumentId = normalizePublicAnalyticsWriteScopeDocumentId(tenantId);
  const storeDocumentId = normalizePublicAnalyticsWriteScopeDocumentId(storeId);
  const analyticsProjectId = normalizePublicAnalyticsWriteProjectId(projectId);
  const analyticsDateKey = normalizePublicAnalyticsWriteDateKey(dateString);
  if (!tenantDocumentId || !storeDocumentId || !analyticsProjectId || !analyticsDateKey) {
    throw new Error('Invalid public analytics write scope.');
  }

  const docId = `${tenantDocumentId}_${storeDocumentId}_${analyticsProjectId}_${DAILY_ANALYTICS_COLLECTION}_${analyticsDateKey}`;
  const processedData: Record<string, any> = {};
  const policyData = filterAnalyticsUpdateData(updateData);
  if (Object.keys(policyData).length === 0) return;

  Object.keys(policyData).forEach((key) => {
    if (key === 'date') return;
    const rawValue = policyData[key];
    if (typeof rawValue === 'number') {
      assignProcessedAnalyticsField(processedData, key, FieldValue.increment(rawValue));
      return;
    }
    assignProcessedAnalyticsField(processedData, key, rawValue);
  });

  await firestoreAdmin.collection(DB_COLLECTIONS.ANALYTICS).doc(docId).set({
    tId: tenantDocumentId,
    sId: storeDocumentId,
    projectId: analyticsProjectId,
    grain: DAILY_ANALYTICS_COLLECTION,
    analyticsScope: 'customer',
    surface: analyticsProjectId === 'obp'
      ? 'obp'
      : analyticsProjectId === 'customerApp'
        ? 'customerApp'
        : 'menu',
    localDate: analyticsDateKey,
    storeTimeZone: storeTimeZone || 'UTC',
    businessDayEndTime: businessDayEndTime || null,
    ...processedData,
    lastUpdated: FieldValue.serverTimestamp(),
  }, { merge: true });
}
