import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';

const SEARCH_SESSION_KEY_PREFIX = 'menulist_search_terms_';
const MAX_TRACKED_SEARCH_TERMS = 25;
const SEARCH_SESSION_STORAGE_TEST_KEY = '__menulist_search_test__';

type SearchDedupStorageOperation = 'read' | 'write';

const reportedSearchDedupStorageAvailabilityFailures = new Set<SearchDedupStorageOperation>();

function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getSearchDedupStorageContext(
  key: string,
  rawTerms?: string | null,
  includeRawTerms = false,
) {
  return {
    ...getBoundedAnalyticsStringContext('storageKey', key),
    ...(includeRawTerms ? getBoundedAnalyticsStringContext('storedSearchTerms', rawTerms) : {}),
  };
}

function getSearchDedupTermContext(normalizedTerm: string) {
  return getBoundedAnalyticsStringContext('normalizedSearchTerm', normalizedTerm);
}

function isSessionStorageAvailable(operation: SearchDedupStorageOperation): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(SEARCH_SESSION_STORAGE_TEST_KEY, '1');
    window.sessionStorage.removeItem(SEARCH_SESSION_STORAGE_TEST_KEY);
    return true;
  } catch (error) {
    if (!reportedSearchDedupStorageAvailabilityFailures.has(operation)) {
      reportedSearchDedupStorageAvailabilityFailures.add(operation);
      logAnalyticsFailure('analytics_search_dedup_storage_unavailable', error, { operation });
    }
    return false;
  }
}

export function getNormalizedSearchTerm(term: string): string {
  return normalizeSearchTerm(term);
}

export function hasTrackedSearchTermInSession(
  storeId: string | number,
  projectId: string,
  term: string,
): boolean {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return false;
  if (!isSessionStorageAvailable('read')) return false;

  const key = `${SEARCH_SESSION_KEY_PREFIX}${storeId}_${projectId}`;
  let raw: string | null = null;

  try {
    raw = window.sessionStorage.getItem(key);
    const trackedTerms = raw ? JSON.parse(raw) : [];
    return Array.isArray(trackedTerms) && trackedTerms.includes(normalized);
  } catch (error) {
    logAnalyticsFailure('analytics_search_dedup_read_failed', error, {
      ...getSearchDedupStorageContext(key, raw, true),
      ...getSearchDedupTermContext(normalized),
    });
    return false;
  }
}

export function markSearchTermTrackedInSession(
  storeId: string | number,
  projectId: string,
  term: string,
): void {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) return;
  if (!isSessionStorageAvailable('write')) return;

  const key = `${SEARCH_SESSION_KEY_PREFIX}${storeId}_${projectId}`;
  let raw: string | null = null;
  let serializedTerms = '';

  try {
    raw = window.sessionStorage.getItem(key);
    const trackedTerms = raw ? JSON.parse(raw) : [];
    const nextTerms = Array.isArray(trackedTerms) ? trackedTerms : [];
    if (nextTerms.includes(normalized)) return;
    serializedTerms = JSON.stringify([...nextTerms, normalized].slice(-MAX_TRACKED_SEARCH_TERMS));
    window.sessionStorage.setItem(
      key,
      serializedTerms,
    );
  } catch (error) {
    logAnalyticsFailure('analytics_search_dedup_write_failed', error, {
      ...getSearchDedupStorageContext(key, raw, true),
      ...getSearchDedupTermContext(normalized),
      ...getBoundedAnalyticsStringContext('serializedSearchTerms', serializedTerms),
    });
  }
}
