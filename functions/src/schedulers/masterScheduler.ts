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
import { generateWeeklyNarrativeForStore } from '../analytics/weeklyNarrative';
import { SECRETS } from '../config/secrets';
import { DB_COLLECTIONS, SYSTEM_DOCS } from '../constants/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from '../constants/user';

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
  } catch {
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(DB_COLLECTIONS.SYSTEM).doc(SYSTEM_DOCS.SCHEDULER_LOCK)
      .set({ isRunning: false, lastRun: Timestamp.now() }, { merge: true });
  } catch { /* non-blocking */ }
}

// ================================================================
// MANUAL TRIGGER — Run All Analytics Tasks
// ================================================================

/**
 * Manually trigger analytics tasks (for testing/admin).
 * Calls the same real worker functions used by the nightly scheduler.
 */
export const triggerSchedulerManually = onCall({
  secrets: [
    SECRETS.GEMINI_AI_KEY,
    SECRETS.GEMINI_AI_KEY_2,
    SECRETS.GEMINI_AI_KEY_3,
    SECRETS.GEMINI_AI_KEY_4,
  ],
}, async (request) => {
  assertPlatformOwner(request, 'trigger scheduler');

  console.log('[ManualTrigger] Initiated by:', request.auth?.uid);

  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    return { status: 'already_running', message: 'Scheduler is already running.' };
  }

  const results: string[] = [];

  try {
    // Call real worker functions directly (same ones used by decisionBlocksScoring.ts)
    try {
      const { processFeedbackIntelligenceForAllStores } = await import('../analytics/feedbackIntelligence');
      await processFeedbackIntelligenceForAllStores();
      results.push('feedback_intelligence: success');
    } catch (e: any) {
      results.push(`feedback_intelligence: failed (${e.message})`);
    }

    try {
      const { processKBQualityForAllStores } = await import('../analytics/kbQuality');
      await processKBQualityForAllStores();
      results.push('kb_quality: success');
    } catch (e: any) {
      results.push(`kb_quality: failed (${e.message})`);
    }

    try {
      const { processWeeklyNarrativeForAllStores } = await import('../analytics/weeklyNarrative');
      await processWeeklyNarrativeForAllStores();
      results.push('weekly_narrative: success');
    } catch (e: any) {
      results.push(`weekly_narrative: failed (${e.message})`);
    }

    try {
      const { processHealthSignalsForAllStores } = await import('../analytics/healthSignalsComputation');
      await processHealthSignalsForAllStores();
      results.push('health_signals: success');
    } catch (e: any) {
      results.push(`health_signals: failed (${e.message})`);
    }

    return { status: 'success', message: 'Manual trigger completed.', results };
  } catch (error) {
    throw new HttpsError(
      'internal',
      'Manual trigger failed: ' + (error instanceof Error ? error.message : 'Unknown error')
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

  console.log(`[Weekly Narrative] Manual trigger for tenant ${tId}, store ${sId}`);

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
    console.error('[Weekly Narrative] Manual trigger failed:', error);
    throw new HttpsError(
      'internal',
      'Weekly narrative generation failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
  }
});
