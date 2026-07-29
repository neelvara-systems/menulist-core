/**
 * Session management for analytics tracking
 */
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from './analyticsDiagnostics';
import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'menulist_session_id';
const SESSION_TIMESTAMP_KEY = 'menulist_session_timestamp';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CANONICAL_UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type AnalyticsSessionStorageOperation = 'get' | 'refresh' | 'clear';

const ANALYTICS_SESSION_STORAGE_FAILURE_CODES: Record<AnalyticsSessionStorageOperation, string> = {
  get: 'analytics_session_get_failed',
  refresh: 'analytics_session_refresh_failed',
  clear: 'analytics_session_clear_failed',
};

const reportedAnalyticsSessionStorageFailures = new Set<string>();

const isCanonicalAnalyticsSessionId = (value: unknown): value is string => (
  typeof value === 'string' && CANONICAL_UUID_V4_PATTERN.test(value)
);

const parseAnalyticsSessionTimestamp = (value: unknown, now: number): number | null => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) && timestamp <= now ? timestamp : null;
};

const getAnalyticsSessionStorageFailureContext = (
  operation: AnalyticsSessionStorageOperation,
  values: {
    existingId?: string | null;
    timestamp?: string | null;
  } = {},
) => ({
  operation,
  ...getBoundedAnalyticsStringContext('sessionIdKey', SESSION_ID_KEY),
  ...getBoundedAnalyticsStringContext('sessionTimestampKey', SESSION_TIMESTAMP_KEY),
  ...getBoundedAnalyticsStringContext('existingSessionId', values.existingId),
  ...getBoundedAnalyticsStringContext('sessionTimestamp', values.timestamp),
  timeoutMs: SESSION_TIMEOUT_MS,
  hasWindow: typeof window !== 'undefined',
  hasSessionStorage: typeof sessionStorage !== 'undefined',
  fallback: operation === 'get' ? 'new_anonymous_session_id' : 'skip_session_storage_update',
});

const logAnalyticsSessionStorageFailure = (
  operation: AnalyticsSessionStorageOperation,
  error: unknown,
  values?: {
    existingId?: string | null;
    timestamp?: string | null;
  },
): void => {
  const failureCode = ANALYTICS_SESSION_STORAGE_FAILURE_CODES[operation];
  if (reportedAnalyticsSessionStorageFailures.has(failureCode)) return;
  reportedAnalyticsSessionStorageFailures.add(failureCode);

  logAnalyticsFailure(
    failureCode,
    error,
    getAnalyticsSessionStorageFailureContext(operation, values),
  );
};

/**
 * Gets the current session ID or creates a new one if needed
 * @returns Current session ID
 */
export function getSessionId(): string {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  let existingId: string | null = null;
  let timestampStr: string | null = null;

  try {
    existingId = sessionStorage.getItem(SESSION_ID_KEY);
    timestampStr = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    // Check if we have an existing session
    if (existingId && timestampStr) {
      const now = Date.now();
      const timestamp = parseAnalyticsSessionTimestamp(timestampStr, now);
      
      // If session hasn't expired, update timestamp and return existing ID
      if (
        isCanonicalAnalyticsSessionId(existingId)
        && timestamp !== null
        && now - timestamp < SESSION_TIMEOUT_MS
      ) {
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
        return existingId;
      }
    }
    
    // Create new session
    const newId = uuidv4();
    sessionStorage.setItem(SESSION_ID_KEY, newId);
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    
    return newId;
  } catch (error) {
    logAnalyticsSessionStorageFailure('get', error, {
      existingId,
      timestamp: timestampStr,
    });
    return uuidv4();
  }
}

/**
 * Refreshes the current session timestamp
 */
export function refreshSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  let existingId: string | null = null;

  try {
    existingId = sessionStorage.getItem(SESSION_ID_KEY);
    if (isCanonicalAnalyticsSessionId(existingId)) {
      sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    } else if (existingId !== null) {
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
    }
  } catch (error) {
    logAnalyticsSessionStorageFailure('refresh', error, { existingId });
  }
}

/**
 * Clears the current session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    logAnalyticsSessionStorageFailure('clear', error);
  }
}
