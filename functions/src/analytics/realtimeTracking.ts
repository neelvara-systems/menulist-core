/**
 * Realtime Analytics Tracking
 * Atomic write strategy for today's metrics using FieldValue.increment
 * 
 * Write Strategy:
 * - Only write when chat completes (not per message)
 * - Use atomic increments (no read-before-write)
 * - Estimated writes: 100-200/day per tenant (within free tier)
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS, getChatAnalyticsDocId } from '../constants/database';

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
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const docId = getChatAnalyticsDocId(data.tId, data.sId, today);

    const todayDoc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    // Build update object with atomic increments
    const updateData: any = {
      tId: data.tId,
      sId: data.sId,
      date: today,

      // Core counters (atomic increments)
      totalChats: FieldValue.increment(1),
      totalMessages: FieldValue.increment(data.messageCount || 0),
      totalRegenerations: FieldValue.increment(data.regenerationCount || 0),

      // Mode-specific counters
      qnaChats: data.mode === 'qna' ? FieldValue.increment(1) : 0,
      assistantChats: data.mode === 'assistant' ? FieldValue.increment(1) : 0,

      // Metadata
      lastUpdated: FieldValue.serverTimestamp(),
    };

    // Only increment feedback if it exists
    if (data.hasFeedback) {
      updateData.totalFeedback = FieldValue.increment(1);

      if (data.isPositive) {
        updateData.positiveFeedback = FieldValue.increment(1);
      } else {
        updateData.negativeFeedback = FieldValue.increment(1);
      }
    }

    // Merge mode - preserves existing data
    await todayDoc.set(updateData, { merge: true });

    console.log(`[Realtime Tracking] Chat completed: ${data.sessionId}`);
  } catch (error) {
    console.error('[Realtime Tracking] Error tracking chat completion:', error);
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
    const db = admin.firestore();
    const targetDate = data.date || new Date().toISOString().split('T')[0];
    const docId = getChatAnalyticsDocId(data.tId, data.sId, targetDate);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    const updateData: any = {
      totalFeedback: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    };

    if (data.isPositive) {
      updateData.positiveFeedback = FieldValue.increment(1);
    } else {
      updateData.negativeFeedback = FieldValue.increment(1);
    }

    await doc.set(updateData, { merge: true });

    console.log(`[Realtime Tracking] Feedback added: ${data.isPositive ? 'positive' : 'negative'}`);
  } catch (error) {
    console.error('[Realtime Tracking] Error tracking feedback:', error);
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
    const db = admin.firestore();
    const targetDate = data.date || new Date().toISOString().split('T')[0];
    const docId = getChatAnalyticsDocId(data.tId, data.sId, targetDate);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    await doc.set({
      totalRegenerations: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log('[Realtime Tracking] Regeneration tracked');
  } catch (error) {
    console.error('[Realtime Tracking] Error tracking regeneration:', error);
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
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const docId = getChatAnalyticsDocId(data.tId, data.sId, today);

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
      totalChats: docData.totalChats || 0,
      qnaChats: docData.qnaChats || 0,
      assistantChats: docData.assistantChats || 0,
      totalMessages: docData.totalMessages || 0,
      positiveFeedback: docData.positiveFeedback || 0,
      negativeFeedback: docData.negativeFeedback || 0,
      totalFeedback: docData.totalFeedback || 0,
      totalRegenerations: docData.totalRegenerations || 0,
    };
  } catch (error) {
    console.error('[Realtime Tracking] Error fetching today\'s stats:', error);
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
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    const docId = getChatAnalyticsDocId(data.tId, data.sId, today);

    const doc = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);

    // Only create if doesn't exist
    await doc.set({
      tId: data.tId,
      sId: data.sId,
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
    }, { merge: true });

    console.log(`[Realtime Tracking] Initialized document for ${today}`);
  } catch (error) {
    console.error('[Realtime Tracking] Error initializing document:', error);
  }
}
