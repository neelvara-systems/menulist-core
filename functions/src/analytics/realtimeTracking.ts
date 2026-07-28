/**
 * Realtime Analytics Tracking
 * Atomic write strategy for today's metrics using FieldValue.increment
 * 
 * Write Strategy:
 * - Only write when chat completes (not per message)
 * - Use atomic increments (no read-before-write)
 * - Estimated writes: 100-200/day per tenant (within free tier)
 */

import { firestoreAdmin } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, getChatAnalyticsDocId } from '../constants/database';
import {
  analyticsLogger,
  getAnalyticsErrorContext,
  getAnalyticsIdContext,
} from './analyticsDiagnostics';
import { getBoundedFunctionsErrorCode } from '../utils/boundedErrorContext';

const REALTIME_CHAT_COMPLETION_TRACKING_FAILED = 'REALTIME_CHAT_COMPLETION_TRACKING_FAILED';
const REALTIME_FEEDBACK_TRACKING_FAILED = 'REALTIME_FEEDBACK_TRACKING_FAILED';
const REALTIME_REGENERATION_TRACKING_FAILED = 'REALTIME_REGENERATION_TRACKING_FAILED';
const REALTIME_TODAY_STATS_FETCH_FAILED = 'REALTIME_TODAY_STATS_FETCH_FAILED';
const REALTIME_TODAY_DOC_INIT_FAILED = 'REALTIME_TODAY_DOC_INIT_FAILED';
const ANALYTICS_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function normalizeAnalyticsDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !ANALYTICS_DATE_KEY_PATTERN.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function requireAnalyticsDateKey(value: unknown): string {
  const normalized = normalizeAnalyticsDateKey(value);
  if (!normalized) throw new Error('Invalid analytics date key.');
  return normalized;
}

function requireNumericScopeDocumentId(value: unknown, field: string): string {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  if (!/^[1-9]\d*$/.test(raw)) throw new Error(`Invalid ${field}.`);
  const numeric = Number(raw);
  if (!Number.isSafeInteger(numeric) || String(numeric) !== raw) throw new Error(`Invalid ${field}.`);
  return raw;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${field}.`);
  return value;
}

function requireNonNegativeCount(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new Error(`Invalid ${field}.`);
  }
  return Number(value);
}

function readNonNegativeCount(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = getBoundedFunctionsErrorCode(error);
  return code === '6' || code === 'already-exists';
}

function getRealtimeScope(data: {
  tId: string;
  sId: string;
  sessionId?: string;
}): {
  tenantId: ReturnType<typeof getAnalyticsIdContext>;
  storeId: ReturnType<typeof getAnalyticsIdContext>;
  sessionId?: ReturnType<typeof getAnalyticsIdContext>;
} {
  return {
    tenantId: getAnalyticsIdContext(data.tId),
    storeId: getAnalyticsIdContext(data.sId),
    ...(data.sessionId ? { sessionId: getAnalyticsIdContext(data.sessionId) } : {}),
  };
}

// ================================================================
// TYPES
// ================================================================

export interface ChatCompletionData {
  tId: string;
  sId: string;
  mode: 'qna' | 'assistant';
  messageCount: number;
  regenerationCount: number;
  hasFeedback: boolean;
  isPositive: boolean;
  sessionId: string;
}

// ================================================================
// REALTIME TRACKING FUNCTIONS
// ================================================================

/**
 * Track chat completion in today's analytics document
 * Uses atomic increments for race-condition-free updates
 */
export async function onChatComplete(data: ChatCompletionData): Promise<void> {
  try {
    const db = firestoreAdmin;
    const today = getUtcDateKey();
    const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');
    const sId = requireNumericScopeDocumentId(data.sId, 'store ID');
    if (data.mode !== 'qna' && data.mode !== 'assistant') throw new Error('Invalid chat mode.');
    const hasFeedback = requireBoolean(data.hasFeedback, 'feedback presence');
    const isPositive = requireBoolean(data.isPositive, 'feedback sentiment');
    const docId = getChatAnalyticsDocId(tId, sId, today);
    const messageCount = requireNonNegativeCount(data.messageCount, 'message count');
    const regenerationCount = requireNonNegativeCount(data.regenerationCount, 'regeneration count');

    const todayDoc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    // Build update object with atomic increments
    const updateData: Record<string, string | FieldValue> = {
      tId,
      sId,
      date: today,

      // Core counters (atomic increments)
      totalChats: FieldValue.increment(1),
      totalMessages: FieldValue.increment(messageCount),
      totalRegenerations: FieldValue.increment(regenerationCount),

      // Metadata
      lastUpdated: FieldValue.serverTimestamp(),
    };

    // Increment only the selected mode. Writing zero for the other mode would
    // overwrite its previously accumulated counter on every completion.
    updateData[data.mode === 'qna' ? 'qnaChats' : 'assistantChats'] = FieldValue.increment(1);

    // Only increment feedback if it exists
    if (hasFeedback) {
      updateData.totalFeedback = FieldValue.increment(1);

      if (isPositive) {
        updateData.positiveFeedback = FieldValue.increment(1);
      } else {
        updateData.negativeFeedback = FieldValue.increment(1);
      }
    }

    // Merge mode - preserves existing data
    await todayDoc.set(updateData, { merge: true });

    analyticsLogger.info('[Realtime Tracking] Chat completion tracked', {
      ...getRealtimeScope(data),
      mode: data.mode,
      messageCount,
      regenerationCount,
      hasFeedback,
    });
  } catch (error) {
    analyticsLogger.error('[Realtime Tracking] Chat completion tracking failed', {
      ...getRealtimeScope(data),
      failureCode: REALTIME_CHAT_COMPLETION_TRACKING_FAILED,
      error: getAnalyticsErrorContext(error),
    });
    // Don't throw - tracking failures shouldn't break chat flow
  }
}

/**
 * Track feedback update (when user gives feedback after chat)
 */
export async function onFeedbackAdded(data: {
  tId: string;
  sId: string;
  isPositive: boolean;
  date?: string;
}): Promise<void> {
  try {
    const db = firestoreAdmin;
    const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');
    const sId = requireNumericScopeDocumentId(data.sId, 'store ID');
    const isPositive = requireBoolean(data.isPositive, 'feedback sentiment');
    const targetDate = data.date === undefined ? getUtcDateKey() : requireAnalyticsDateKey(data.date);
    const docId = getChatAnalyticsDocId(tId, sId, targetDate);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    const updateData: Record<string, string | FieldValue> = {
      tId,
      sId,
      date: targetDate,
      totalFeedback: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    };

    if (isPositive) {
      updateData.positiveFeedback = FieldValue.increment(1);
    } else {
      updateData.negativeFeedback = FieldValue.increment(1);
    }

    await doc.set(updateData, { merge: true });

    analyticsLogger.info('[Realtime Tracking] Feedback tracked', {
      ...getRealtimeScope(data),
      targetDate,
      isPositive,
    });
  } catch (error) {
    analyticsLogger.error('[Realtime Tracking] Feedback tracking failed', {
      ...getRealtimeScope(data),
      failureCode: REALTIME_FEEDBACK_TRACKING_FAILED,
      error: getAnalyticsErrorContext(error),
    });
  }
}

/**
 * Track regeneration event
 */
export async function onRegenerationEvent(data: {
  tId: string;
  sId: string;
  date?: string;
}): Promise<void> {
  try {
    const db = firestoreAdmin;
    const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');
    const sId = requireNumericScopeDocumentId(data.sId, 'store ID');
    const targetDate = data.date === undefined ? getUtcDateKey() : requireAnalyticsDateKey(data.date);
    const docId = getChatAnalyticsDocId(tId, sId, targetDate);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    await doc.set({
      tId,
      sId,
      date: targetDate,
      totalRegenerations: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    analyticsLogger.info('[Realtime Tracking] Regeneration tracked', {
      ...getRealtimeScope(data),
      targetDate,
    });
  } catch (error) {
    analyticsLogger.error('[Realtime Tracking] Regeneration tracking failed', {
      ...getRealtimeScope(data),
      failureCode: REALTIME_REGENERATION_TRACKING_FAILED,
      error: getAnalyticsErrorContext(error),
    });
  }
}

/**
 * Get today's live stats for a store
 * Used for dashboard display (combines with historical data)
 */
export async function getTodayLiveStats(data: {
  tId: string;
  sId: string;
}): Promise<{
  totalChats: number;
  qnaChats: number;
  assistantChats: number;
  totalMessages: number;
  positiveFeedback: number;
  negativeFeedback: number;
  totalFeedback: number;
  totalRegenerations: number;
}> {
  try {
    const db = firestoreAdmin;
    const today = getUtcDateKey();
    const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');
    const sId = requireNumericScopeDocumentId(data.sId, 'store ID');
    const docId = getChatAnalyticsDocId(tId, sId, today);

    const doc = await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).get();

    if (!doc.exists) {
      return {
        totalChats: 0,
        qnaChats: 0,
        assistantChats: 0,
        totalMessages: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalFeedback: 0,
        totalRegenerations: 0,
      };
    }

    const docData = doc.data() || {};

    return {
      totalChats: readNonNegativeCount(docData.totalChats),
      qnaChats: readNonNegativeCount(docData.qnaChats),
      assistantChats: readNonNegativeCount(docData.assistantChats),
      totalMessages: readNonNegativeCount(docData.totalMessages),
      positiveFeedback: readNonNegativeCount(docData.positiveFeedback),
      negativeFeedback: readNonNegativeCount(docData.negativeFeedback),
      totalFeedback: readNonNegativeCount(docData.totalFeedback),
      totalRegenerations: readNonNegativeCount(docData.totalRegenerations),
    };
  } catch (error) {
    analyticsLogger.error('[Realtime Tracking] Today stats fetch failed', {
      ...getRealtimeScope(data),
      failureCode: REALTIME_TODAY_STATS_FETCH_FAILED,
      error: getAnalyticsErrorContext(error),
    });
    return {
      totalChats: 0,
      qnaChats: 0,
      assistantChats: 0,
      totalMessages: 0,
      positiveFeedback: 0,
      negativeFeedback: 0,
      totalFeedback: 0,
      totalRegenerations: 0,
    };
  }
}

/**
 * Initialize today's document if it doesn't exist
 * Called at the start of each day
 */
export async function initializeTodayDoc(data: {
  tId: string;
  sId: string;
}): Promise<void> {
  try {
    const db = firestoreAdmin;
    const today = getUtcDateKey();
    const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');
    const sId = requireNumericScopeDocumentId(data.sId, 'store ID');
    const docId = getChatAnalyticsDocId(tId, sId, today);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    // create() is atomic and never overwrites counters if tracking won the
    // race and created today's document first.
    try {
      await doc.create({
        tId,
        sId,
        date: today,
        totalChats: 0,
        qnaChats: 0,
        assistantChats: 0,
        totalMessages: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalFeedback: 0,
        totalRegenerations: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) return;
      throw error;
    }

    analyticsLogger.info('[Realtime Tracking] Initialized today document', {
      ...getRealtimeScope(data),
      date: today,
    });
  } catch (error) {
    analyticsLogger.error('[Realtime Tracking] Today document initialization failed', {
      ...getRealtimeScope(data),
      failureCode: REALTIME_TODAY_DOC_INIT_FAILED,
      error: getAnalyticsErrorContext(error),
    });
  }
}
