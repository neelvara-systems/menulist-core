/**
 * Error Tracking System
 * Tracks and logs system errors for monitoring and alerting
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ERROR_DEDUPLICATION } from '../../../src/constants/analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const logger = functions.logger;

// ================================================================
// TYPES
// ================================================================

export interface SystemError {
  id?: string;
  tId: string;
  sId: string;
  errorType: 'api' | 'function' | 'database' | 'integration' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  stackPresent?: boolean;
  stackLength?: number;
  context?: Record<string, any>;
  functionName?: string;
  timestamp: Timestamp;
  resolved: boolean;
  resolvedAt?: Timestamp;
  occurrenceCount: number;
}

export interface ErrorSummary {
  totalErrors: number;
  criticalErrors: number;
  unresolvedErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: SystemError[];
}

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: string } {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  const code = record.code;
  const status = record.status ?? record.statusCode;

  return {
    name: error instanceof Error ? (error.name || 'Error').slice(0, 80) : undefined,
    code: code === undefined || code === null ? undefined : String(code).slice(0, 64),
    status: status === undefined || status === null ? undefined : String(status).slice(0, 32),
  };
}

function getSystemErrorLogContext(
  error: Pick<SystemError, 'tId' | 'sId' | 'errorType' | 'severity' | 'message' | 'functionName'>
) {
  return {
    tIdPresent: error.tId.length > 0,
    tIdLength: error.tId.length,
    sIdPresent: error.sId.length > 0,
    sIdLength: error.sId.length,
    errorType: error.errorType,
    severity: error.severity,
    functionNamePresent: Boolean(error.functionName),
    functionNameLength: error.functionName?.length || 0,
    messageLength: error.message.length,
  };
}

function getBoundedSystemErrorStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = typeof value === 'string' ? value : '';
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getStoredSystemErrorMessage(message: unknown): string {
  const normalized = typeof message === 'string' ? message.trim() : '';
  if (/^[A-Z][A-Z0-9_:-]{2,119}$/.test(normalized)) {
    return normalized;
  }
  return 'SYSTEM_ERROR_RECORDED';
}

function getSafeContextKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60) || 'field';
}

function sanitizeSystemErrorContext(context: unknown): Record<string, boolean | number | string> | undefined {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return undefined;

  const entries = Object.entries(context as Record<string, unknown>).slice(0, 20);
  const sanitized: Record<string, boolean | number | string> = {};

  entries.forEach(([key, value]) => {
    const safeKey = getSafeContextKey(key);
    if (typeof value === 'boolean' || typeof value === 'number') {
      sanitized[safeKey] = value;
      return;
    }
    if (typeof value === 'string') {
      sanitized[`${safeKey}Present`] = value.length > 0;
      sanitized[`${safeKey}Length`] = value.length;
      return;
    }
    sanitized[`${safeKey}Present`] = value !== undefined && value !== null;
    sanitized[`${safeKey}Type`] = Array.isArray(value) ? 'array' : typeof value;
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function buildStoredSystemError(
  error: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'>,
): Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'> {
  const stored: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'> = {
    tId: error.tId,
    sId: error.sId,
    errorType: error.errorType,
    severity: error.severity,
    message: getStoredSystemErrorMessage(error.message),
  };

  if (error.functionName) stored.functionName = error.functionName.slice(0, 120);
  if (error.stack) {
    stored.stackPresent = true;
    stored.stackLength = error.stack.length;
  }

  const sanitizedContext = sanitizeSystemErrorContext(error.context);
  if (sanitizedContext) stored.context = sanitizedContext;

  return stored;
}

function buildSafeSystemErrorFromDoc(id: string, data: FirebaseFirestore.DocumentData): SystemError {
  const rawStack = typeof data.stack === 'string' ? data.stack : '';
  const safe: SystemError = {
    id,
    tId: String(data.tId || 'system'),
    sId: String(data.sId || 'system'),
    errorType: ['api', 'function', 'database', 'integration', 'unknown'].includes(data.errorType)
      ? data.errorType
      : 'unknown',
    severity: ['low', 'medium', 'high', 'critical'].includes(data.severity)
      ? data.severity
      : 'medium',
    message: getStoredSystemErrorMessage(data.message),
    timestamp: data.timestamp,
    resolved: data.resolved === true,
    occurrenceCount: Number(data.occurrenceCount || 1),
  };

  if (data.functionName) safe.functionName = String(data.functionName).slice(0, 120);
  if (rawStack || data.stackPresent || data.stackLength) {
    safe.stackPresent = Boolean(rawStack || data.stackPresent);
    safe.stackLength = Number(data.stackLength || rawStack.length || 0);
  }

  const sanitizedContext = sanitizeSystemErrorContext(data.context);
  if (sanitizedContext) safe.context = sanitizedContext;
  if (data.resolvedAt) safe.resolvedAt = data.resolvedAt;

  return safe;
}

// ================================================================
// ERROR TRACKING
// ================================================================

/**
 * Log a system error
 */
export async function logSystemError(
  error: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'>
): Promise<void> {
  const storedError = buildStoredSystemError(error);

  try {
    // Check if similar error exists (within configured deduplication window)
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - ERROR_DEDUPLICATION.WINDOW_HOURS);

    const existingErrorsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ERRORS)
      .where('tId', '==', storedError.tId)
      .where('sId', '==', storedError.sId)
      .where('errorType', '==', storedError.errorType)
      .where('message', '==', storedError.message)
      .where('timestamp', '>=', Timestamp.fromDate(windowStart))
      .limit(1)
      .get();

    if (!existingErrorsSnapshot.empty) {
      // Update existing error occurrence count
      const existingError = existingErrorsSnapshot.docs[0];
      await existingError.ref.update({
        occurrenceCount: (existingError.data().occurrenceCount || 1) + 1,
        timestamp: Timestamp.now(), // Update to latest occurrence
      });

      logger.info('[Error Tracking] Updated existing error occurrence', {
        ...getSystemErrorLogContext(storedError),
        ...getBoundedSystemErrorStringContext('errorId', existingError.id),
      });
    } else {
      // Create new error document
      await db.collection(DB_COLLECTIONS.SYSTEM_ERRORS).add({
        ...storedError,
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000), // TTL: 30 days
        resolved: false,
        occurrenceCount: 1,
      });

      logger.info('[Error Tracking] Logged new error', getSystemErrorLogContext(storedError));

      // Check if critical error and trigger alert
      if (storedError.severity === 'critical') {
        await triggerCriticalAlert(storedError);
      }
    }
  } catch (err) {
    logger.error('[Error Tracking] Failed to log error', {
      ...getSystemErrorLogContext(storedError),
      error: getErrorLogContext(err),
    });
    // Don't throw - avoid infinite error loops
  }
}

/**
 * Mark error as resolved
 */
export async function resolveError(errorId: string): Promise<void> {
  try {
    await db.collection(DB_COLLECTIONS.SYSTEM_ERRORS).doc(errorId).update({
      resolved: true,
      resolvedAt: Timestamp.now(),
    });

    logger.info(
      '[Error Tracking] Marked error as resolved',
      getBoundedSystemErrorStringContext('errorId', errorId)
    );
  } catch (error) {
    logger.error('[Error Tracking] Failed to resolve error', {
      ...getBoundedSystemErrorStringContext('errorId', errorId),
      error: getErrorLogContext(error),
    });
    throw error;
  }
}

/**
 * Get error summary for a store
 */
export async function getErrorSummary(
  tId: string,
  sId: string,
  daysBack: number = 7
): Promise<ErrorSummary> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const errorsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ERRORS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .orderBy('timestamp', 'desc')
      .get();

    const errors: SystemError[] = errorsSnapshot.docs.map(doc => (
      buildSafeSystemErrorFromDoc(doc.id, doc.data())
    ));

    const summary: ErrorSummary = {
      totalErrors: errors.length,
      criticalErrors: errors.filter(e => e.severity === 'critical').length,
      unresolvedErrors: errors.filter(e => !e.resolved).length,
      errorsByType: {},
      errorsBySeverity: {},
      recentErrors: errors.slice(0, 10),
    };

    // Count by type
    errors.forEach(error => {
      summary.errorsByType[error.errorType] =
        (summary.errorsByType[error.errorType] || 0) + 1;
      summary.errorsBySeverity[error.severity] =
        (summary.errorsBySeverity[error.severity] || 0) + 1;
    });

    return summary;
  } catch (error) {
    logger.error('[Error Tracking] Failed to get error summary', {
      ...getBoundedSystemErrorStringContext('tId', tId),
      ...getBoundedSystemErrorStringContext('sId', sId),
      daysBack,
      error: getErrorLogContext(error),
    });
    throw error;
  }
}

/**
 * Trigger critical error alert
 */
async function triggerCriticalAlert(error: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'>): Promise<void> {
  try {
    // Store alert in alerts collection
    await db.collection(DB_COLLECTIONS.SYSTEM_ALERTS).add({
      type: 'critical_error',
      tId: error.tId,
      sId: error.sId,
      message: 'Critical system error recorded',
      errorType: error.errorType,
      functionName: error.functionName,
      metadata: {
        errorMessageLength: error.message.length,
      },
      timestamp: Timestamp.now(),
      acknowledged: false,
    });

    logger.error('[Error Tracking] Critical alert triggered', getSystemErrorLogContext(error));

    // Notification fanout is handled by platform notification delivery surfaces.
    // await sendSlackAlert(error);
    // await sendEmailAlert(error);
  } catch (err) {
    logger.error('[Error Tracking] Failed to trigger critical alert', {
      ...getSystemErrorLogContext(error),
      error: getErrorLogContext(err),
    });
  }
}

// ================================================================
// ERROR CATEGORIES
// ================================================================

export const ERROR_CATEGORIES = {
  API: 'api',
  FUNCTION: 'function',
  DATABASE: 'database',
  INTEGRATION: 'integration',
  UNKNOWN: 'unknown',
} as const;

export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// ================================================================
// EXPORTS
// ================================================================

export default {
  logSystemError,
  resolveError,
  getErrorSummary,
  ERROR_CATEGORIES,
  SEVERITY_LEVELS,
};
