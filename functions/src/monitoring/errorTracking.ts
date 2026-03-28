/**
 * Error Tracking System
 * Tracks and logs system errors for monitoring and alerting
 */

import { Timestamp } from 'firebase-admin/firestore';
import { ERROR_DEDUPLICATION } from '../../../src/constants/analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

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

// ================================================================
// ERROR TRACKING
// ================================================================

/**
 * Log a system error
 */
export async function logSystemError(
  error: Omit<SystemError, 'id' | 'timestamp' | 'resolved' | 'occurrenceCount'>
): Promise<void> {
  try {
    // Check if similar error exists (within configured deduplication window)
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - ERROR_DEDUPLICATION.WINDOW_HOURS);

    const existingErrorsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ERRORS)
      .where('tId', '==', error.tId)
      .where('sId', '==', error.sId)
      .where('errorType', '==', error.errorType)
      .where('message', '==', error.message)
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

      console.log(`[Error Tracking] Updated existing error occurrence: ${error.message}`);
    } else {
      // Create new error document
      await db.collection(DB_COLLECTIONS.SYSTEM_ERRORS).add({
        ...error,
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000), // TTL: 30 days
        resolved: false,
        occurrenceCount: 1,
      });

      console.log(`[Error Tracking] Logged new error: ${error.errorType} - ${error.message}`);

      // Check if critical error and trigger alert
      if (error.severity === 'critical') {
        await triggerCriticalAlert(error);
      }
    }
  } catch (err) {
    console.error('[Error Tracking] Failed to log error:', err);
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

    console.log(`[Error Tracking] Marked error as resolved: ${errorId}`);
  } catch (error) {
    console.error('[Error Tracking] Failed to resolve error:', error);
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

    const errors: SystemError[] = errorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as SystemError));

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
    console.error('[Error Tracking] Failed to get error summary:', error);
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
      message: `Critical Error: ${error.message}`,
      errorType: error.errorType,
      functionName: error.functionName,
      timestamp: Timestamp.now(),
      acknowledged: false,
    });

    console.log(`[Error Tracking] Critical alert triggered for: ${error.message}`);

    // TODO: Send notification (email, Slack, etc.)
    // await sendSlackAlert(error);
    // await sendEmailAlert(error);
  } catch (err) {
    console.error('[Error Tracking] Failed to trigger critical alert:', err);
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
