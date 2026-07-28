/**
 * Telemetry Logger
 * Tracks Cloud Function execution health and performance
 */

import * as functions from 'firebase-functions';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, TTL_CONFIG } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

const telemetryLogger = functions.logger;
// The collection reference and terminal set live in separate chained lines.
// Keep the generated reverse-flow catalog bound to both real writer families.
// @firestore-collection-evidence DB_COLLECTIONS.SYSTEM_TELEMETRY operations=write
const TELEMETRY_LOG_WRITE_FAILED = 'TELEMETRY_LOG_WRITE_FAILED';
const TELEMETRY_COST_WRITE_FAILED = 'TELEMETRY_COST_WRITE_FAILED';
const DAY_MS = 24 * 60 * 60 * 1000;

function getTelemetryExpiry(): Timestamp {
  return Timestamp.fromMillis(
    Date.now() + TTL_CONFIG.SYSTEM_TELEMETRY_DAYS * DAY_MS
  );
}

function getTelemetryErrorContext(error: unknown): {
  name?: string;
  code?: string;
  status?: number;
} {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: getBoundedFunctionsErrorName(error),
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

// ================================================================
// TYPES
// ================================================================

export interface FunctionResult {
  status: 'success' | 'failed' | 'skipped';
  runTime: number; // milliseconds
  error?: string;
  recordsProcessed?: number;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface MenuDriftCostTelemetry {
  readsCount: number;
  writesCount: number;
  executionMs: number;
  storesProcessed: number;
  itemsProcessed: number;
  errors: number;
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

    // `set(..., { merge: true })` does not interpret dotted object keys as
    // nested field paths. Preserve the declared document contract by passing
    // actual nested maps; merge recursively protects results from concurrent
    // function executions.
    await docRef.set({
      date: today,
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: getTelemetryExpiry(),
      functions: {
        [functionName]: result,
      },
      summary: {
        [`${result.status}Count`]: FieldValue.increment(1),
        totalRunTime: FieldValue.increment(result.runTime),
      },
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
 * Record the latest bounded Menu Observation Layer cost sample for the day.
 *
 * Telemetry is deliberately best-effort: a monitoring write must not convert
 * already-completed menu-drift work into a failed scheduler task that retries
 * the full computation. Exact replacement also prunes retired fields from
 * older daily samples.
 */
export async function logMenuDriftCostTelemetry(
  result: MenuDriftCostTelemetry
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    await firestoreAdmin
      .collection(DB_COLLECTIONS.SYSTEM_TELEMETRY)
      .doc(`mol_costs_${today}`)
      .set({
        type: 'mol_cost_telemetry',
        functionName: 'menuDriftMetrics',
        date: today,
        ...result,
        timestamp: FieldValue.serverTimestamp(),
        expiresAt: getTelemetryExpiry(),
      });
  } catch (error) {
    telemetryLogger.error('[Telemetry] Failed to log menu drift cost sample', {
      failureCode: TELEMETRY_COST_WRITE_FAILED,
      error: getTelemetryErrorContext(error),
    });
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
