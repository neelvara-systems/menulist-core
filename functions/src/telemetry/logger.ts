/**
 * Telemetry Logger
 * Tracks Cloud Function execution health and performance
 */

import * as functions from 'firebase-functions';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';

const telemetryLogger = functions.logger;
const TELEMETRY_LOG_WRITE_FAILED = 'TELEMETRY_LOG_WRITE_FAILED';
const TELEMETRY_WRAPPED_FUNCTION_FAILED = 'TELEMETRY_WRAPPED_FUNCTION_FAILED';
const TELEMETRY_TODAY_READ_FAILED = 'TELEMETRY_TODAY_READ_FAILED';
const TELEMETRY_RANGE_READ_FAILED = 'TELEMETRY_RANGE_READ_FAILED';
const TELEMETRY_HEALTH_READ_FAILED = 'TELEMETRY_HEALTH_READ_FAILED';

function getTelemetryErrorContext(error: unknown): {
  name?: string;
  code?: string;
  status?: number;
} {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: error instanceof Error ? error.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

// ================================================================
// TYPES
// ================================================================

export interface TelemetryLog {
  date: string;
  timestamp: Timestamp;
  functions: {
    aggregateFn?: FunctionResult;
    feedbackFn?: FunctionResult;
    kbQualityFn?: FunctionResult;
    weeklyNarrativeFn?: FunctionResult;
  };
  summary: {
    totalRunTime: number;
    successCount: number;
    failureCount: number;
    skippedCount: number;
  };
}

export interface FunctionResult {
  status: 'success' | 'failed' | 'skipped';
  runTime: number; // milliseconds
  error?: string;
  recordsProcessed?: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

// ================================================================
// LOGGER FUNCTIONS
// ================================================================

/**
 * Log telemetry for a Cloud Function execution
 */
export async function logTelemetry(
  functionName: string,
  result: FunctionResult
): Promise<void> {
  try {
    const db = firestoreAdmin;
    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection(DB_COLLECTIONS.SYSTEM_TELEMETRY).doc(today);

    // Update or create telemetry document
    await docRef.set({
      date: today,
      timestamp: FieldValue.serverTimestamp(),
      [`functions.${functionName}`]: result,
      [`summary.${result.status}Count`]: FieldValue.increment(1),
      'summary.totalRunTime': FieldValue.increment(result.runTime),
    }, { merge: true });

    telemetryLogger.info('[Telemetry] Logged function execution', {
      functionName,
      status: result.status,
      runTime: result.runTime,
    });
  } catch (error) {
    telemetryLogger.error('[Telemetry] Failed to log function execution', {
      functionName,
      status: result.status,
      failureCode: TELEMETRY_LOG_WRITE_FAILED,
      error: getTelemetryErrorContext(error),
    });
    // Don't throw - telemetry failures shouldn't break functions
  }
}

/**
 * Start a function execution timer
 */
export function startTimer(): {
  getElapsed: () => number;
  stop: () => FunctionResult;
} {
  const startTime = Date.now();
  const startedAt = Timestamp.now();

  return {
    getElapsed: () => Date.now() - startTime,
    stop: () => ({
      status: 'success',
      runTime: Date.now() - startTime,
      startedAt,
      completedAt: Timestamp.now(),
    }),
  };
}

/**
 * Wrap a function with automatic telemetry logging
 */
export async function withTelemetry<T>(
  functionName: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = startTimer();

  try {
    const result = await fn();

    await logTelemetry(functionName, {
      status: 'success',
      runTime: timer.getElapsed(),
      startedAt: timer.stop().startedAt,
      completedAt: Timestamp.now(),
    });

    return result;
  } catch (error) {
    await logTelemetry(functionName, {
      status: 'failed',
      runTime: timer.getElapsed(),
      error: TELEMETRY_WRAPPED_FUNCTION_FAILED,
      startedAt: timer.stop().startedAt,
      completedAt: Timestamp.now(),
    });

    throw error;
  }
}

/**
 * Get today's telemetry data
 */
export async function getTodayTelemetry(): Promise<TelemetryLog | null> {
  try {
    const db = firestoreAdmin;
    const today = new Date().toISOString().split('T')[0];
    const docRef = db.collection(DB_COLLECTIONS.SYSTEM_TELEMETRY).doc(today);

    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }

    return doc.data() as TelemetryLog;
  } catch (error) {
    telemetryLogger.error('[Telemetry] Failed to fetch today data', {
      failureCode: TELEMETRY_TODAY_READ_FAILED,
      error: getTelemetryErrorContext(error),
    });
    return null;
  }
}

/**
 * Get telemetry for a date range
 */
export async function getTelemetryRange(
  startDate: string,
  endDate: string
): Promise<TelemetryLog[]> {
  try {
    const db = firestoreAdmin;
    const snapshot = await db.collection(DB_COLLECTIONS.SYSTEM_TELEMETRY)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as TelemetryLog);
  } catch (error) {
    telemetryLogger.error('[Telemetry] Failed to fetch telemetry range', {
      failureCode: TELEMETRY_RANGE_READ_FAILED,
      error: getTelemetryErrorContext(error),
    });
    return [];
  }
}

/**
 * Get function health status
 */
export async function getFunctionHealth(
  functionName: string,
  days: number = 7
): Promise<{
  totalRuns: number;
  successRate: number;
  avgRunTime: number;
  lastRun?: TelemetryLog;
}> {
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const logs = await getTelemetryRange(startDateStr, endDate);

    let totalRuns = 0;
    let successCount = 0;
    let totalRunTime = 0;

    logs.forEach(log => {
      const fnResult = log.functions[functionName as keyof typeof log.functions];
      if (fnResult) {
        totalRuns++;
        if (fnResult.status === 'success') {
          successCount++;
        }
        totalRunTime += fnResult.runTime || 0;
      }
    });

    return {
      totalRuns,
      successRate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
      avgRunTime: totalRuns > 0 ? totalRunTime / totalRuns : 0,
      lastRun: logs[0],
    };
  } catch (error) {
    telemetryLogger.error('[Telemetry] Failed to calculate function health', {
      failureCode: TELEMETRY_HEALTH_READ_FAILED,
      error: getTelemetryErrorContext(error),
    });
    return {
      totalRuns: 0,
      successRate: 0,
      avgRunTime: 0,
    };
  }
}
