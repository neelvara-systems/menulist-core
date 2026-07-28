/**
 * Error Tracking System
 * Tracks and logs system errors for monitoring and alerting
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ERROR_DEDUPLICATION } from './analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorName,
  getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';
import {
  getSystemErrorDocumentId,
  getSystemErrorOccurrenceDecision,
  normalizeSystemErrorScopeId,
} from './systemErrorBoundary';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../sharedData/platformNotificationRegistry';

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

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: string } {
  return {
    name: getBoundedFunctionsErrorName(error),
    code: getBoundedFunctionsErrorCode(error),
    status: getBoundedFunctionsErrorStatus(error)?.toString(),
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
    tId: normalizeSystemErrorScopeId(error.tId),
    sId: normalizeSystemErrorScopeId(error.sId),
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
    const nowMillis = Date.now();
    const errorId = getSystemErrorDocumentId(storedError);
    const errorRef = db.collection(DB_COLLECTIONS.SYSTEM_ERRORS).doc(errorId);
    const transactionResult = await db.runTransaction(async transaction => {
      const currentSnapshot = await transaction.get(errorRef);
      const currentData = currentSnapshot.data();
      const currentTimestamp = currentData?.timestamp;
      const currentTimestampMillis = currentTimestamp instanceof Timestamp
        ? currentTimestamp.toMillis()
        : null;
      const occurrence = getSystemErrorOccurrenceDecision(
        currentTimestampMillis,
        currentData?.occurrenceCount,
        nowMillis,
        ERROR_DEDUPLICATION.WINDOW_HOURS * 60 * 60 * 1000,
      );

      transaction.set(errorRef, {
        ...storedError,
        timestamp: Timestamp.fromMillis(nowMillis),
        expiresAt: Timestamp.fromMillis(nowMillis + 30 * 24 * 60 * 60 * 1000),
        resolved: false,
        occurrenceCount: occurrence.occurrenceCount,
      });

      return occurrence;
    });

    if (transactionResult.startsNewWindow) {
      logger.info('[Error Tracking] Logged new error', getSystemErrorLogContext(storedError));

      if (storedError.severity === 'critical') {
        await triggerCriticalAlert(storedError);
      }
    } else {
      logger.info('[Error Tracking] Updated existing error occurrence', {
        ...getSystemErrorLogContext(storedError),
        ...getBoundedSystemErrorStringContext('errorId', errorId),
      });
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
 * Trigger critical error alert
 */
async function triggerCriticalAlert(error: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'>): Promise<void> {
  try {
    // Dynamic import avoids the alerts -> errorTracking diagnostic dependency
    // becoming a module-initialization cycle.
    const { createAlert } = await import('./alerts');
    await createAlert({
      type: 'error',
      severity: 'critical',
      tId: error.tId,
      sId: error.sId,
      title: 'Critical system error recorded',
      message: 'Critical system error recorded',
      metadata: {
        errorType: error.errorType,
        functionName: error.functionName,
        errorMessageLength: error.message.length,
      },
      triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.CRITICAL_SYSTEM_ERROR,
      productId: 'PLATFORM',
      category: 'system',
      actionRequired: true,
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
  ERROR_CATEGORIES,
  SEVERITY_LEVELS,
};
