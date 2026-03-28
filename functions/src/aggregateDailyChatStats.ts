import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DB_COLLECTIONS, getChatAnalyticsDocId } from './constants/database';
import { ECOMSAI_USER_ROLE } from './constants/user';
import { firestoreAdmin } from './firebaseAdmin';

/**
 * DAILY CHAT STATS AGGREGATION (COST-OPTIMIZED)
 * ══════════════════════════════════════════════
 * 
 * Runs daily at 1:00 AM UTC to create aggregated summary documents.
 * This enables cheap dashboard reads (30 docs) vs expensive full scans (1,000+ docs).
 * 
 * IMPORTANT: Processes at STORE level (not tenant level)
 * - One tenant can have multiple stores
 * - Each store gets its own analytics document
 * - Document ID format: {tId}_{storeId}_{YYYY-MM-DD}
 * 
 * Cost Savings: 97.6% reduction in dashboard read operations!
 * 
 * Deployment:
 * 1. firebase deploy --only functions:aggregateDailyChatStats
 * 2. Verify in Firebase Console → Functions
 * 3. Check Cloud Scheduler → Job should show next run time
 * 
 * Manual Trigger (for testing/backfill):
 * firebase functions:shell
 * > aggregateDailyChatStats()
 */

interface DailyStats {
    tId: string;
    sId: string; // Store ID (critical for multi-store tenants)
    date: string;
    totalChats: number;
    qnaChats: number;
    assistantChats: number;
    totalMessages: number;
    positiveFeedback: number;
    negativeFeedback: number;
    totalFeedback: number;
    totalRegenerations: number;
    topQuestions: Array<{ question: string; count: number }>;
    knowledgeGaps: Array<{ question: string; count: number; examples: string[] }>;
}

export const aggregateDailyChatStats = onSchedule({
    schedule: '0 1 * * *', // Runs daily at 1:00 AM UTC
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 540
}, async (event) => {
    console.log('=== Daily Chat Stats Aggregation Started ===');
    console.log('Triggered at:', new Date().toISOString());

    const db = firestoreAdmin;
    const results = {
        totalTenants: 0,
        totalStores: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [] as Array<{ tId: string; storeId: string; error: string }>
    };

    try {
        // COST OPTIMIZATION: Use storesSummary instead of fetching all tenants + stores
        // This reduces N tenant reads + N store queries to 1 read
        // See: __docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const storesSummary = storesSummaryDoc.exists ? storesSummaryDoc.data()?.stores || {} : {};
        const storeEntries = Object.entries(storesSummary) as [string, { tId: number | string; active?: boolean }][];

        // Count unique tenants for logging
        const uniqueTenants = new Set(storeEntries.map(([, info]) => String(info.tId)));
        results.totalTenants = uniqueTenants.size;
        results.totalStores = storeEntries.length;

        console.log(`Found ${results.totalStores} stores across ${results.totalTenants} tenants (from storesSummary)`);

        // Process yesterday's data (today's data will be aggregated tomorrow)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Process each store directly from summary
        for (const [storeId, storeInfo] of storeEntries) {
            const tId = storeInfo.tId != null ? String(storeInfo.tId) : '';

            // Skip inactive stores
            if (storeInfo.active === false || !tId) {
                console.log(`  Skipping inactive store ${storeId}`);
                results.skippedCount++;
                continue;
            }

            try {
                console.log(`  Processing store ${storeId}...`);

                // Mark job as IN_PROGRESS
                await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                    'chatAnalytics.lastAttemptedRun': FieldValue.serverTimestamp(),
                    'chatAnalytics.lastStatus': 'IN_PROGRESS'
                });

                // Check if aggregation already exists for this day
                const dateStr = yesterday.toISOString().split('T')[0];
                const docId = getChatAnalyticsDocId(tId, storeId, dateStr);
                const existingDoc = await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).get();

                if (existingDoc.exists) {
                    console.log(`    Aggregation for store ${storeId} on ${dateStr} already exists. Skipping.`);
                    results.skippedCount++;

                    // Still mark as success since data exists
                    await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                        'chatAnalytics.lastSuccessfulRun': FieldValue.serverTimestamp(),
                        'chatAnalytics.lastStatus': 'SUCCESS',
                        'chatAnalytics.lastProcessedDate': dateStr,
                        'chatAnalytics.lastError': FieldValue.delete()
                    });
                    continue;
                }

                const stats = await aggregateForStore(db, tId, storeId, yesterday);

                // Only create document if there's data
                if (stats.totalChats > 0) {
                    await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).set({
                        ...stats,
                        createdOn: FieldValue.serverTimestamp(),
                        modifiedOn: FieldValue.serverTimestamp()
                    });

                    // Mark as SUCCESS
                    await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                        'chatAnalytics.lastSuccessfulRun': FieldValue.serverTimestamp(),
                        'chatAnalytics.lastStatus': 'SUCCESS',
                        'chatAnalytics.lastProcessedDate': dateStr,
                        'chatAnalytics.lastError': FieldValue.delete()
                    });

                    console.log(`    ✓ Store ${storeId}: ${stats.totalChats} chats aggregated`);
                    results.successCount++;
                } else {
                    console.log(`    - Store ${storeId}: No chats for this day`);

                    // Mark as SUCCESS (no data is not a failure)
                    await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                        'chatAnalytics.lastSuccessfulRun': FieldValue.serverTimestamp(),
                        'chatAnalytics.lastStatus': 'SUCCESS',
                        'chatAnalytics.lastProcessedDate': dateStr,
                        'chatAnalytics.lastError': FieldValue.delete()
                    });
                    results.skippedCount++;
                }

            } catch (storeError) {
                // Log error but continue with other stores
                const errorMessage = storeError instanceof Error ? storeError.message : String(storeError);
                console.error(`    ✗ Failed to process store ${storeId}:`, errorMessage);

                // Mark as FAILED
                await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                    'chatAnalytics.lastStatus': 'FAILED',
                    'chatAnalytics.lastError': errorMessage
                }).catch(err => {
                    console.error(`Failed to update error status for store ${storeId}:`, err);
                });

                results.failedCount++;
                results.errors.push({ tId, storeId, error: errorMessage });
            }
        }

        // Log final summary
        console.log('=== Daily Chat Stats Aggregation Complete ===');
        console.log(`Total Tenants: ${results.totalTenants}`);
        console.log(`Total Stores: ${results.totalStores}`);
        console.log(`Success: ${results.successCount}`);
        console.log(`Skipped: ${results.skippedCount}`);
        console.log(`Failed: ${results.failedCount}`);

        if (results.errors.length > 0) {
            console.error('Errors encountered:', JSON.stringify(results.errors, null, 2));
        }

        // Send alert if too many failures
        if (results.failedCount > results.totalStores * 0.1) { // More than 10% failed
            await sendAggregationFailureAlert(results);
        }

    } catch (error) {
        console.error('Critical error in aggregation function:', error);
        throw error; // Let Cloud Functions retry
    }

    // Log final results (scheduled functions don't return values)
    console.log('Final Results:', JSON.stringify(results, null, 2));
});

/**
 * Aggregate stats for a single STORE on a specific date
 * Idempotent: Can be run multiple times safely
 */
async function aggregateForStore(
    db: Firestore,  // ✅ Using imported type (no shadowing)
    tId: string,
    storeId: string,
    date: Date
): Promise<DailyStats> {
    const dateStr = date.toISOString().split('T')[0];

    // Define day boundaries
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 🔍 CRITICAL: Convert tId and storeId to numbers (Firebase stores them as numbers)
    const tIdNumber = typeof tId === 'string' ? parseInt(tId) : tId;
    const storeIdNumber = typeof storeId === 'string' ? parseInt(storeId) : storeId;

    // 🔍 DEBUG: Log query parameters
    console.log(`[aggregateForStore] Querying for:`, {
        tId: tIdNumber,
        storeId: storeIdNumber,
        date: dateStr,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
    });

    // Query all chats for this STORE on this date
    const chatsSnapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
        .where('tId', '==', tIdNumber)  // ✅ Use number
        .where('sId', '==', storeIdNumber)  // ✅ Use number
        .where('createdOn', '>=', Timestamp.fromDate(startOfDay))  // ✅ Direct import
        .where('createdOn', '<=', Timestamp.fromDate(endOfDay))    // ✅ Direct import
        .get();

    // 🔍 DEBUG: Log query results
    console.log(`[aggregateForStore] Found ${chatsSnapshot.size} chat sessions for ${dateStr}`);

    // 🔍 DEBUG: Log first document to see its structure
    if (chatsSnapshot.size > 0) {
        const firstDoc = chatsSnapshot.docs[0].data();
        console.log(`[aggregateForStore] Sample document:`, {
            id: chatsSnapshot.docs[0].id,
            tId: firstDoc.tId,
            sId: firstDoc.sId,
            createdOn: firstDoc.createdOn?.toDate?.() || firstDoc.createdOn,
            mode: firstDoc.mode
        });
    } else {
        console.log(`[aggregateForStore] ⚠️ No documents found. Checking if ANY chat sessions exist...`);
        // Query without date filter to see if there are any sessions at all
        const anyChats = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
            .where('tId', '==', tIdNumber)
            .where('sId', '==', storeIdNumber)
            .limit(1)
            .get();
        console.log(`[aggregateForStore] Found ${anyChats.size} chat sessions (any date) for tId=${tIdNumber}, sId=${storeIdNumber}`);
        if (anyChats.size > 0) {
            const sample = anyChats.docs[0].data();
            console.log(`[aggregateForStore] Sample ANY chat:`, {
                id: anyChats.docs[0].id,
                tId: sample.tId,
                sId: sample.sId,
                createdOn: sample.createdOn?.toDate?.() || sample.createdOn
            });
        }
    }

    // Initialize stats
    const stats: DailyStats = {
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
        topQuestions: [],
        knowledgeGaps: []
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
                                question: q, // Keep original case
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

/**
 * Send alert if aggregation has too many failures
 */
async function sendAggregationFailureAlert(results: any) {
    const webhookUrl = functions.config().slack?.webhook_url;

    if (!webhookUrl) {
        console.warn('Slack webhook not configured. Skipping failure alert.');
        return;
    }

    try {
        const fetch = (await import('node-fetch')).default;

        const message = {
            text: '🚨 Chat Aggregation Failure Alert',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🚨 Daily Chat Aggregation Failed'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Total Tenants:* ${results.totalTenants}\n*Failed:* ${results.failedCount}\n*Success:* ${results.successCount}\n*Skipped:* ${results.skippedCount}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Errors:*\n${results.errors.map((e: any) => `• Tenant ${e.tId}: ${e.error}`).join('\n').substring(0, 500)}`
                    }
                }
            ]
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        console.log('Failure alert sent to Slack');
    } catch (error) {
        console.error('Failed to send failure alert:', error);
    }
}

/**
 * Manual backfill function for Analytics Backfill UI
 * Usage: Called from /platform/admin/analytics-backfill page
 * 
 * Increased timeout and memory for large backfills (up to 90 days)
 */
const backfillOptions = {
    region: "us-central1",
    timeoutSeconds: 540,  // 9 minutes (sufficient for up to 30 days)
    memory: "1GiB" as const  // Increased from default 256MB for large datasets
};

export const backfillAggregates = onCall(backfillOptions, async (request) => {
    const data = request.data as { tenantId?: string; storeId?: string; days?: number };
    const context = request.auth;

    // DEBUG: Log auth context
    console.log('🔍 Auth context:', {
        hasContext: !!context,
        uid: context?.uid,
        hasToken: !!context?.token,
        role: context?.token?.role,
        tenantId: context?.token?.tenantId,
        storeId: context?.token?.storeId
    });

    // Security: Only allow PLATFORM role (owner access)
    if (!context || context.token.role !== ECOMSAI_USER_ROLE) {
        throw new HttpsError('permission-denied', 'Only platform owners can run backfill operations');
    }

    const { tenantId, storeId, days = 30 } = data;

    if (!tenantId || !storeId) {
        throw new HttpsError('invalid-argument', 'tenantId and storeId are required');
    }

    const db = firestoreAdmin;
    const results = [];

    for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
            console.log(`[backfillAggregates] Processing date ${dateStr} for tenant=${tenantId}, store=${storeId}`);
            const stats = await aggregateForStore(db, tenantId, storeId, date);

            if (stats.totalChats > 0) {
                const docId = getChatAnalyticsDocId(tenantId, storeId, dateStr);
                await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).set({
                    ...stats,
                    createdOn: FieldValue.serverTimestamp(),
                    modifiedOn: FieldValue.serverTimestamp()
                }, { merge: true }); // merge: true makes it idempotent

                results.push({ date: dateStr, chats: stats.totalChats, status: 'success' });
            } else {
                results.push({ date: dateStr, chats: 0, status: 'skipped' });
            }
        } catch (error) {
            results.push({
                date: dateStr,
                status: 'error',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    return { tenantId, days, results };
});