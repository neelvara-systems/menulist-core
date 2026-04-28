const SEARCH_SESSION_KEY_PREFIX = 'menulist_search_terms_';
const MAX_TRACKED_SEARCH_TERMS = 25;

function normalizeSearchTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__menulist_search_test__';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
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
  if (!isSessionStorageAvailable()) return false;

  const key = `${SEARCH_SESSION_KEY_PREFIX}${storeId}_${projectId}`;

  try {
    const raw = window.sessionStorage.getItem(key);
    const trackedTerms = raw ? JSON.parse(raw) : [];
    return Array.isArray(trackedTerms) && trackedTerms.includes(normalized);
  } catch {
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
  if (!isSessionStorageAvailable()) return;

  const key = `${SEARCH_SESSION_KEY_PREFIX}${storeId}_${projectId}`;

  try {
    const raw = window.sessionStorage.getItem(key);
    const trackedTerms = raw ? JSON.parse(raw) : [];
    const nextTerms = Array.isArray(trackedTerms) ? trackedTerms : [];
    if (nextTerms.includes(normalized)) return;
    window.sessionStorage.setItem(
      key,
      JSON.stringify([...nextTerms, normalized].slice(-MAX_TRACKED_SEARCH_TERMS)),
    );
  } catch {
    /* noop */
  }
}
