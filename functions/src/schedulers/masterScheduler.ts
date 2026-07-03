/**
 * Analytics Manual Triggers
 * 
 * Manual callable functions for testing/admin purposes.
 * The SCHEDULED tasks have been migrated to the unified nightly scheduler
 * in decisionBlocksScoring.ts (runs hourly at :30, timezone-aware).
 * 
 * Exports:
 * - triggerSchedulerManually — Run all analytics tasks on demand
 * - triggerWeeklyNarrativeManually — Regenerate weekly narrative for a specific store
 * 
 * @see functions/src/decisionBlocksScoring.ts (unified nightly scheduler)
 * @see __docs__/patterns/nightly-scheduler-architecture.md
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  analyticsLogger,
  getAnalyticsErrorContext,
  getAnalyticsIdContext,
} from '../analytics/analyticsDiagnostics';
import { generateWeeklyNarrativeForStore } from '../analytics/weeklyNarrative';
import { FUNCTION_MAX_INSTANCES, SECRETS } from '../config/secrets';
import { DB_COLLECTIONS, SYSTEM_DOCS } from '../constants/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from '../constants/user';

const MANUAL_TRIGGER_FEEDBACK_INTELLIGENCE_FAILED = 'MANUAL_TRIGGER_FEEDBACK_INTELLIGENCE_FAILED';
const MANUAL_TRIGGER_KB_QUALITY_FAILED = 'MANUAL_TRIGGER_KB_QUALITY_FAILED';
const MANUAL_TRIGGER_WEEKLY_NARRATIVE_FAILED = 'MANUAL_TRIGGER_WEEKLY_NARRATIVE_FAILED';
const MANUAL_TRIGGER_HEALTH_SIGNALS_FAILED = 'MANUAL_TRIGGER_HEALTH_SIGNALS_FAILED';
const MANUAL_TRIGGER_FAILED = 'MANUAL_TRIGGER_FAILED';
const MANUAL_WEEKLY_NARRATIVE_FAILED = 'MANUAL_WEEKLY_NARRATIVE_FAILED';
const MANUAL_SCHEDULER_LOCK_ACQUIRE_FAILED = 'MANUAL_SCHEDULER_LOCK_ACQUIRE_FAILED';
const MANUAL_SCHEDULER_LOCK_RELEASE_FAILED = 'MANUAL_SCHEDULER_LOCK_RELEASE_FAILED';

async function runManualSchedulerTask(
  taskName: string,
  failureCode: string,
  task: () => Promise<void>,
  results: string[],
): Promise<void> {
  try {
    await task();
    results.push(`${taskName}: success`);
  } catch (error) {
    analyticsLogger.error('[ManualTrigger] Task failed', {
      taskName,
      failureCode,
      error: getAnalyticsErrorContext(error),
    });
    results.push(`${taskName}: failed (${failureCode})`);
  }
}

function assertPlatformOwner(request: { auth?: { token?: Record<string, any> } }, action: string) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', `Must be authenticated to ${action}.`);
  }

  const requesterRole = String(request.auth.token?.platformRole || request.auth.token?.role || '');
  if (requesterRole !== ECOMSAI_PLATFORM_USER_ROLE) {
    throw new HttpsError('permission-denied', `Only platform owners can ${action}.`);
  }
}

// ================================================================
// LOCK MANAGEMENT (used by manual triggers to prevent overlap)
// ================================================================

async function acquireLock(): Promise<boolean> {
  try {
    const db = admin.firestore();
    const lockRef = db.collection(DB_COLLECTIONS.SYSTEM).doc(SYSTEM_DOCS.SCHEDULER_LOCK);
    const lock = await lockRef.get();

    if (lock.exists && lock.data()?.isRunning) {
      const startedAt = lock.data()?.startedAt?.toDate();
      const elapsed = startedAt ? (Date.now() - startedAt.getTime()) / 1000 : 0;
      if (elapsed > 600) {
        await lockRef.set({ isRunning: false, lastRun: Timestamp.now() }, { merge: true });
        return true;
      }
      return false;
    }

    await lockRef.set({ isRunning: true, startedAt: Timestamp.now(), functionName: 'manualTrigger' }, { merge: true });
    return true;
  } catch (error) {
    analyticsLogger.error('[ManualTrigger] Lock acquire failed', {
      failureCode: MANUAL_SCHEDULER_LOCK_ACQUIRE_FAILED,
      error: getAnalyticsErrorContext(error),
    });
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(DB_COLLECTIONS.SYSTEM).doc(SYSTEM_DOCS.SCHEDULER_LOCK)
      .set({ isRunning: false, lastRun: Timestamp.now() }, { merge: true });
  } catch (error) {
    analyticsLogger.error('[ManualTrigger] Lock release failed', {
      failureCode: MANUAL_SCHEDULER_LOCK_RELEASE_FAILED,
      error: getAnalyticsErrorContext(error),
    });
  }
}

// ================================================================
// MANUAL TRIGGER — Run All Analytics Tasks
// ================================================================

/**
 * Manually trigger analytics tasks (for testing/admin).
 * Calls the same real worker functions used by the nightly scheduler.
 */
export const triggerSchedulerManually = onCall({
  region: 'us-central1',
  timeoutSeconds: 540,
  memory: '512MiB' as const,
  maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
  secrets: [
    SECRETS.GEMINI_AI_KEY,
    SECRETS.GEMINI_AI_KEY_2,
    SECRETS.GEMINI_AI_KEY_3,
    SECRETS.GEMINI_AI_KEY_4,
  ],
}, async (request) => {
  assertPlatformOwner(request, 'trigger scheduler');

  analyticsLogger.info('[ManualTrigger] Initiated', {
    requesterId: getAnalyticsIdContext(request.auth?.uid),
  });

  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return { status: 'already_running', message: 'Scheduler is already running.' };
  }

  const results: string[] = [];

  try {
    // Call real worker functions directly (same ones used by decisionBlocksScoring.ts)
    await runManualSchedulerTask(
      'feedback_intelligence',
      MANUAL_TRIGGER_FEEDBACK_INTELLIGENCE_FAILED,
      async () => {
        const { processFeedbackIntelligenceForAllStores } = await import('../analytics/feedbackIntelligence');
        await processFeedbackIntelligenceForAllStores();
      },
      results,
    );

    await runManualSchedulerTask(
      'kb_quality',
      MANUAL_TRIGGER_KB_QUALITY_FAILED,
      async () => {
        const { processKBQualityForAllStores } = await import('../analytics/kbQuality');
        await processKBQualityForAllStores();
      },
      results,
    );

    await runManualSchedulerTask(
      'weekly_narrative',
      MANUAL_TRIGGER_WEEKLY_NARRATIVE_FAILED,
      async () => {
        const { processWeeklyNarrativeForAllStores } = await import('../analytics/weeklyNarrative');
        await processWeeklyNarrativeForAllStores();
      },
      results,
    );

    await runManualSchedulerTask(
      'health_signals',
      MANUAL_TRIGGER_HEALTH_SIGNALS_FAILED,
      async () => {
        const { processHealthSignalsForAllStores } = await import('../analytics/healthSignalsComputation');
        await processHealthSignalsForAllStores();
      },
      results,
    );

    return { status: 'success', message: 'Manual trigger completed.', results };
  } catch (error) {
    analyticsLogger.error('[ManualTrigger] Manual trigger failed', {
      failureCode: MANUAL_TRIGGER_FAILED,
      error: getAnalyticsErrorContext(error),
    });
    throw new HttpsError(
      'internal',
      'Manual trigger failed.'
    );
  } finally {
    await releaseLock();
  }
});

// ================================================================
// MANUAL WEEKLY NARRATIVE TRIGGER (For Manual Regeneration)
// ================================================================

/**
 * Manually trigger weekly narrative generation for a specific store.
 * Bypasses the Sunday-only restriction for manual regeneration.
 */
export const triggerWeeklyNarrativeManually = onCall({
  region: 'us-central1',
  timeoutSeconds: 540,
  memory: '512MiB' as const,
  maxInstances: FUNCTION_MAX_INSTANCES.scheduler,
  secrets: [
    SECRETS.GEMINI_AI_KEY,
    SECRETS.GEMINI_AI_KEY_2,
    SECRETS.GEMINI_AI_KEY_3,
    SECRETS.GEMINI_AI_KEY_4,
  ],
}, async (request) => {
  assertPlatformOwner(request, 'trigger weekly narrative generation');

  const tId = request.data?.tId;
  const sId = request.data?.sId;

  if (!tId || !sId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing tenant ID (tId) or store ID (sId). Please ensure you are logged in.'
    );
  }

  analyticsLogger.info('[Weekly Narrative] Manual trigger started', {
    tenantId: getAnalyticsIdContext(tId),
    storeId: getAnalyticsIdContext(sId),
  });

  try {
    const result = await generateWeeklyNarrativeForStore(String(tId), String(sId));

    if (!result) {
      return {
        status: 'no_data',
        message: 'No analytics data found for the past week. Run daily aggregation first.',
      };
    }

    return {
      status: 'success',
      message: 'Weekly narrative generated successfully.',
      data: {
        weekStart: result.weekStart,
        weekEnd: result.weekEnd,
        narrativeLength: result.narrative.length,
        highlightsCount: result.highlights.length,
      },
    };
  } catch (error) {
    analyticsLogger.error('[Weekly Narrative] Manual trigger failed', {
      tenantId: getAnalyticsIdContext(tId),
      storeId: getAnalyticsIdContext(sId),
      failureCode: MANUAL_WEEKLY_NARRATIVE_FAILED,
      error: getAnalyticsErrorContext(error),
    });
    throw new HttpsError(
      'internal',
      'Weekly narrative generation failed.'
    );
  }
});
