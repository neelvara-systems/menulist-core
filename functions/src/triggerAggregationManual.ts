import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DB_COLLECTIONS, getChatAnalyticsDocId } from './constants/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from './constants/user';
import { firestoreAdmin } from './firebaseAdmin';

/**
 * MANUAL AGGREGATION TRIGGER (PLATFORM OWNER ONLY)
 * ═════════════════════════════════════════════════
 * 
 * Allows platform owners to manually trigger analytics aggregation
 * when dashboard shows stale data (>26 hours since last successful run).
 * 
 * Security: Callable function with role-based access control
 * Features:
 * - Duplicate prevention (checks if already running)
 * - Flexible backfill (1-7 days)
 * - Idempotent (safe to call multiple times)
 * - Per-store isolation
 * 
 * Usage from frontend:
 * ```typescript
 * const triggerFunction = httpsCallable(functions, 'triggerAggregationManual');
 * await triggerFunction({ daysToBackfill: 1 });
 * ```
 */

interface TriggerData {
    daysToBackfill?: number; // Default: 1 (yesterday only)
}

const functionOptions = { region: "us-central1", timeoutSeconds: 540 };

export const triggerAggregationManual = onCall(functionOptions, async (request) => {
    const data = request.data as TriggerData;
    const context = request.auth;
    // ============================================
    // 1. SECURITY: Authentication & Authorization
    // ============================================

    if (!context) {
        throw new HttpsError(
            'unauthenticated',
            'You must be logged in to trigger aggregation'
        );
    }

    // Extract user role and IDs from token
    const userRole = String(context.token.platformRole || context.token.role || '');
    const tId = context.token.tenantId as string;
    const storeId = context.token.storeId as string;

    if (!tId || !storeId) {
        throw new HttpsError(
            'failed-precondition',
            'Tenant ID and Store ID not found in authentication token'
        );
    }

    // Only PLATFORM role can trigger.
    if (userRole !== ECOMSAI_PLATFORM_USER_ROLE) {
        throw new HttpsError(
            'permission-denied',
            'Only platform owners can manually trigger analytics aggregation'
        );
    }

    console.log(`[Manual Trigger] Initiated by ${userRole} for tenant ${tId}, store ${storeId}`);

    // ============================================
    // 2. VALIDATION: Input Parameters
    // ============================================

    const daysToBackfill = Math.min(Math.max(data.daysToBackfill || 1, 1), 7); // Clamp 1-7

    if (daysToBackfill !== (data.daysToBackfill || 1)) {
        console.warn(`[Manual Trigger] Days clamped from ${data.daysToBackfill} to ${daysToBackfill}`);
    }

    // ============================================
    // 3. DUPLICATE PREVENTION: Check if Already Running
    // ============================================

    const db = firestoreAdmin;
    const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(storeId).get();

    if (!storeDoc.exists) {
        throw new HttpsError(
            'not-found',
            'Store not found'
        );
    }

    const storeData = storeDoc.data();
    const currentStatus = storeData?.chatAnalytics?.lastStatus;

    if (currentStatus === 'IN_PROGRESS') {
        const lastAttempted = storeData?.chatAnalytics?.lastAttemptedRun?.toDate();
        const minutesAgo = lastAttempted
            ? Math.floor((Date.now() - lastAttempted.getTime()) / 60000)
            : null;

        console.log(`[Manual Trigger] Aggregation already in progress for store ${storeId} (started ${minutesAgo}m ago)`);

        return {
            status: 'already_running',
            message: `Aggregation is already in progress. Started ${minutesAgo} minutes ago.`,
            lastAttemptedRun: lastAttempted?.toISOString()
        };
    }

    // ============================================
    // 4. EXECUTE: Run Aggregation for Requested Days
    // ============================================

    try {
        // Mark as IN_PROGRESS
        await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
            'chatAnalytics.lastAttemptedRun': FieldValue.serverTimestamp(),
            'chatAnalytics.lastStatus': 'IN_PROGRESS'
        });

        console.log(`[Manual Trigger] Processing ${daysToBackfill} day(s) for store ${storeId}`);

        const results = {
            tenantId: tId,
            storeId: storeId,
            daysProcessed: 0,
            daysSkipped: 0,
            errors: [] as string[]
        };

        // Process each day (most recent first)
        for (let i = 1; i <= daysToBackfill; i++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - i);
            const dateStr = targetDate.toISOString().split('T')[0];

            try {
                console.log(`[Manual Trigger] Processing ${dateStr}...`);

                // Check if aggregation already exists
                const docId = getChatAnalyticsDocId(tId, storeId, dateStr);
                const existingDoc = await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).get();

                if (existingDoc.exists) {
                    console.log(`[Manual Trigger] ${dateStr} already exists. Skipping.`);
                    results.daysSkipped++;
                    continue;
                }

                // Aggregate for this day
                const stats = await aggregateForStoreAndDate(db, tId, storeId, targetDate);

                // Save aggregation
                if (stats.totalChats > 0) {
                    await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).set({
                        ...stats,
                        createdOn: FieldValue.serverTimestamp(),
                        modifiedOn: FieldValue.serverTimestamp()
                    });

                    console.log(`[Manual Trigger] ✓ ${dateStr}: ${stats.totalChats} chats aggregated`);
                    results.daysProcessed++;
                } else {
                    console.log(`[Manual Trigger] - ${dateStr}: No chats`);
                    results.daysSkipped++;
                }

            } catch (dayError) {
                const errorMsg = dayError instanceof Error ? dayError.message : String(dayError);
                console.error(`[Manual Trigger] ✗ Failed ${dateStr}:`, errorMsg);
                results.errors.push(`${dateStr}: ${errorMsg}`);
            }
        }

        // ============================================
        // 5. FINALIZE: Update Status
        // ============================================

        const mostRecentDate = new Date();
        mostRecentDate.setDate(mostRecentDate.getDate() - 1);
        const lastProcessedDate = mostRecentDate.toISOString().split('T')[0];

        if (results.errors.length === 0) {
            // Full success
            await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                'chatAnalytics.lastSuccessfulRun': FieldValue.serverTimestamp(),
                'chatAnalytics.lastStatus': 'SUCCESS',
                'chatAnalytics.lastProcessedDate': lastProcessedDate,
                'chatAnalytics.lastError': FieldValue.delete()
            });

            console.log(`[Manual Trigger] ✓ Success for store ${storeId}`);

            return {
                status: 'success',
                message: `Successfully processed ${results.daysProcessed} day(s)`,
                ...results
            };
        } else {
            // Partial success or full failure
            await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                'chatAnalytics.lastStatus': 'FAILED',
                'chatAnalytics.lastError': results.errors.join('; ')
            });

            console.error(`[Manual Trigger] ✗ Failed for store ${storeId}:`, results.errors);

            throw new HttpsError(
                'internal',
                `Aggregation failed: ${results.errors.join(', ')}`
            );
        }

    } catch (error) {
        // Catch-all error handling
        const errorMessage = error instanceof Error ? error.message : String(error);

        await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
            'chatAnalytics.lastStatus': 'FAILED',
            'chatAnalytics.lastError': errorMessage
        }).catch((err: any) => {
            console.error(`[Manual Trigger] Failed to update error status:`, err);
        });

        console.error(`[Manual Trigger] Critical error:`, error);
        throw error;
    }
});

/**
 * Helper function: Aggregate stats for a specific STORE and date
 * (Extracted from aggregateDailyChatStats.ts for reusability)
 */
async function aggregateForStoreAndDate(
    db: Firestore,  // ✅ Using imported type (no shadowing)
    tId: string,
    storeId: string,
    date: Date
) {
    const dateStr = date.toISOString().split('T')[0];

    // Define day boundaries
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 🔍 CRITICAL: Convert tId and storeId to numbers (Firebase stores them as numbers)
    const tIdNumber = typeof tId === 'string' ? parseInt(tId) : tId;
    const storeIdNumber = typeof storeId === 'string' ? parseInt(storeId) : storeId;

    // Query all chats for this STORE on this date
    const chatsSnapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
        .where('tId', '==', tIdNumber)  // ✅ Use number
        .where('sId', '==', storeIdNumber)  // ✅ Use number (CRITICAL: Filter by storeId)
        .where('createdOn', '>=', Timestamp.fromDate(startOfDay))  // ✅ Direct import
        .where('createdOn', '<=', Timestamp.fromDate(endOfDay))    // ✅ Direct import
        .get();

    // Initialize stats
    const stats = {
        tId,
        sId: storeId, // CRITICAL: Include storeId
        date: dateStr,
        totalChats: 0,
        qnaChats: 0,
        assistantChats: 0,
        totalMessages: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalFeedback: 0,
        totalRegenerations: 0,
        topQuestions: [] as Array<{ question: string; count: number }>,
        knowledgeGaps: [] as Array<{ question: string; count: number; examples: string[] }>
    };

    const questionCounts: Record<string, number> = {};
    const gapCounts: Record<string, { question: string; count: number; examples: string[] }> = {};

    // Process each chat session
    chatsSnapshot.forEach((doc) => {
        const data = doc.data();
        stats.totalChats++;

        // Count by mode
        if (data.mode === 'qna') {
            stats.qnaChats++;
        } else {
            stats.assistantChats++;
        }

        // Process messages
        data.messages?.forEach((msg: any, index: number) => {
            stats.totalMessages++;

            // Count user questions
            if (msg.role === 'user' && msg.content) {
                const q = msg.content.trim().toLowerCase();
                questionCounts[q] = (questionCounts[q] || 0) + 1;
            }

            // Count feedback
            if (msg.feedback) {
                stats.totalFeedback++;

                if (msg.feedback.isGood) {
                    stats.positiveFeedback++;
                } else {
                    stats.negativeFeedback++;

                    // Track knowledge gaps (negative feedback questions)
                    const userMsg = data.messages[index - 1];
                    if (userMsg?.role === 'user' && userMsg.content) {
                        const q = userMsg.content.trim();
                        const qLower = q.toLowerCase();

                        if (!gapCounts[qLower]) {
                            gapCounts[qLower] = {
                                question: q,
                                count: 0,
                                examples: []
                            };
                        }

                        gapCounts[qLower].count++;

                        // Keep up to 3 example comments
                        if (msg.feedback.comments && gapCounts[qLower].examples.length < 3) {
                            gapCounts[qLower].examples.push(msg.feedback.comments);
                        }
                    }
                }
            }

            // Count regenerations
            if (msg.generationMetadata?.isRetry) {
                stats.totalRegenerations++;
            }
        });
    });

    // Generate top 10 questions
    stats.topQuestions = Object.entries(questionCounts)
        .map(([question, count]) => ({ question, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Generate top 10 knowledge gaps
    stats.knowledgeGaps = Object.values(gapCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return stats;
}
