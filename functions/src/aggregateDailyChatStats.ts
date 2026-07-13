import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import * as functions from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FUNCTION_MAX_INSTANCES } from './config/secrets';
import { DB_COLLECTIONS, getChatAnalyticsDocId } from './constants/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from './constants/user';
import { firestoreAdmin } from './firebaseAdmin';
import { parsePlatformStoreSummary } from './sharedData/storeSummaryBoundary';
import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analytics/analyticsDiagnostics';
import { validateNetworkTargetUrl } from './utils/networkTarget';

const logger = functions.logger;
const CHAT_DAILY_AGGREGATION_FAILED = 'CHAT_DAILY_AGGREGATION_FAILED';
const CHAT_DAILY_STORE_AGGREGATION_FAILED = 'CHAT_DAILY_STORE_AGGREGATION_FAILED';
const CHAT_DAILY_STATUS_UPDATE_FAILED = 'CHAT_DAILY_STATUS_UPDATE_FAILED';
const CHAT_DAILY_SLACK_ALERT_FAILED = 'CHAT_DAILY_SLACK_ALERT_FAILED';
const CHAT_DAILY_SLACK_TARGET_REJECTED = 'CHAT_DAILY_SLACK_TARGET_REJECTED';
const CHAT_BACKFILL_DAY_FAILED = 'CHAT_BACKFILL_DAY_FAILED';
const CHAT_BACKFILL_DAY_FAILED_MESSAGE = 'Report generation failed for this day.';

function getSlackTargetContext(result: { addressCount?: number; error?: string; errorName?: string }) {
    return {
        addressCount: result.addressCount || 0,
        targetError: typeof result.error === 'string' ? result.error.slice(0, 80) : undefined,
        targetErrorName: typeof result.errorName === 'string' ? result.errorName.slice(0, 80) : undefined,
    };
}

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
 * Runtime:
 * - Daily production execution is owned by menulistMaintenanceScheduler.
 * - backfillAggregates remains callable for manual historical backfills.
 */

interface DailyStats {
    pId: 'AL';
    tId: number;
    sId: number; // Store ID (critical for multi-store tenants)
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
    sourceComplete: boolean;
    sourceSessionCount: number;
    sourceLimit: number;
}

const ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT = 2000;

export async function aggregateDailyChatStatsLogic(): Promise<{
    totalTenants: number;
    totalStores: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    errors: Array<{ tId: string; storeId: string; error: string }>;
}> {
    logger.info('[ChatAggregation] Daily chat stats aggregation started', {
        triggeredAt: new Date().toISOString(),
    });

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
        // See: __docs__/patterns/summary-document-pattern.md
        const storesSummaryDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const storesSummary = parsePlatformStoreSummary(storesSummaryDoc.exists ? storesSummaryDoc.data() : undefined);
        const storeEntries = Object.entries(storesSummary);

        // Count unique tenants for logging
        const uniqueTenants = new Set(storeEntries.map(([, info]) => String(info.tId)));
        results.totalTenants = uniqueTenants.size;
        results.totalStores = storeEntries.length;

        logger.info('[ChatAggregation] Stores loaded from summary', {
            totalStores: results.totalStores,
            totalTenants: results.totalTenants,
        });

        // Process yesterday's data (today's data will be aggregated tomorrow)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Process each store directly from summary
        for (const [storeId, storeInfo] of storeEntries) {
            const tId = Number(storeInfo.tId);
            const numericStoreId = Number(storeId);

            // Skip inactive stores
            if (storeInfo.active === false || !Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(numericStoreId) || numericStoreId <= 0) {
                logger.info('[ChatAggregation] Skipping inactive or unscoped store', {
                    storeId: getAnalyticsIdContext(storeId),
                    hasTenantId: Boolean(tId),
                    inactive: storeInfo.active === false,
                });
                results.skippedCount++;
                continue;
            }

            try {
                logger.info('[ChatAggregation] Processing store', {
                    tId: getAnalyticsIdContext(tId),
                    storeId: getAnalyticsIdContext(storeId),
                });

                // Mark job as IN_PROGRESS
                await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                    'chatAnalytics.lastAttemptedRun': FieldValue.serverTimestamp(),
                    'chatAnalytics.lastStatus': 'IN_PROGRESS'
                });

                // Check if aggregation already exists for this day
                const dateStr = yesterday.toISOString().split('T')[0];
                const docId = getChatAnalyticsDocId(tId, numericStoreId, dateStr);
                const existingDoc = await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).get();

                const stats = await aggregateForStore(db, tId, numericStoreId, yesterday);
                const sourceHash = createHash('sha256').update(JSON.stringify(stats)).digest('hex');
                const summaryChanged = !existingDoc.exists || existingDoc.get('sourceHash') !== sourceHash;

                // Persist only changed summaries. Existing non-empty summaries are
                // overwritten with zeroes if their source chats were removed.
                if ((stats.totalChats > 0 || existingDoc.exists) && summaryChanged) {
                    await db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId).set({
                        ...stats,
                        sourceHash,
                        createdOn: existingDoc.exists
                            ? existingDoc.get('createdOn') || FieldValue.serverTimestamp()
                            : FieldValue.serverTimestamp(),
                        modifiedOn: FieldValue.serverTimestamp()
                    });

                    // Mark as SUCCESS
                    await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                        'chatAnalytics.lastSuccessfulRun': FieldValue.serverTimestamp(),
                        'chatAnalytics.lastStatus': 'SUCCESS',
                        'chatAnalytics.lastProcessedDate': dateStr,
                        'chatAnalytics.lastError': FieldValue.delete()
                    });

                    logger.info('[ChatAggregation] Store aggregation written', {
                        tId: getAnalyticsIdContext(tId),
                        storeId: getAnalyticsIdContext(numericStoreId),
                        date: dateStr,
                        totalChats: stats.totalChats,
                    });
                    results.successCount++;
                } else {
                    logger.info(stats.totalChats > 0
                        ? '[ChatAggregation] Store summary unchanged'
                        : '[ChatAggregation] Store had no chats for date', {
                        tId: getAnalyticsIdContext(tId),
                        storeId: getAnalyticsIdContext(storeId),
                        date: dateStr,
                    });

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
                logger.error('[ChatAggregation] Store aggregation failed', {
                    failureCode: CHAT_DAILY_STORE_AGGREGATION_FAILED,
                    tId: getAnalyticsIdContext(tId),
                    storeId: getAnalyticsIdContext(storeId),
                    error: getAnalyticsErrorContext(storeError),
                });

                // Mark as FAILED
                await db.collection(DB_COLLECTIONS.STORES).doc(storeId).update({
                    'chatAnalytics.lastStatus': 'FAILED',
                    'chatAnalytics.lastError': CHAT_DAILY_STORE_AGGREGATION_FAILED
                }).catch(err => {
                    logger.warn('[ChatAggregation] Failed to persist store failure status', {
                        failureCode: CHAT_DAILY_STATUS_UPDATE_FAILED,
                        tId: getAnalyticsIdContext(tId),
                        storeId: getAnalyticsIdContext(storeId),
                        error: getAnalyticsErrorContext(err),
                    });
                });

                results.failedCount++;
                results.errors.push({ tId: String(tId), storeId, error: CHAT_DAILY_STORE_AGGREGATION_FAILED });
            }
        }

        // Log final summary
        logger.info('[ChatAggregation] Daily chat stats aggregation complete', {
            totalTenants: results.totalTenants,
            totalStores: results.totalStores,
            successCount: results.successCount,
            skippedCount: results.skippedCount,
            failedCount: results.failedCount,
            errorCount: results.errors.length,
        });

        if (results.errors.length > 0) {
            logger.warn('[ChatAggregation] Daily chat stats completed with store failures', {
                failureCode: CHAT_DAILY_STORE_AGGREGATION_FAILED,
                failedCount: results.failedCount,
                errorCount: results.errors.length,
            });
        }

        // Send alert if too many failures
        if (results.failedCount > results.totalStores * 0.1) { // More than 10% failed
            await sendAggregationFailureAlert(results);
        }

    } catch (error) {
        logger.error('[ChatAggregation] Daily chat stats aggregation failed', {
            failureCode: CHAT_DAILY_AGGREGATION_FAILED,
            error: getAnalyticsErrorContext(error),
        });
        throw new Error(CHAT_DAILY_AGGREGATION_FAILED); // Let Cloud Functions retry with stable text
    }

    return results;
}

/**
 * Aggregate stats for a single STORE on a specific date
 * Idempotent: Can be run multiple times safely
 */
async function aggregateForStore(
    db: Firestore,  // ✅ Using imported type (no shadowing)
    tId: number,
    storeId: number,
    date: Date
): Promise<DailyStats> {
    const dateStr = date.toISOString().split('T')[0];

    // Define day boundaries
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 🔍 CRITICAL: Convert tId and storeId to numbers (Firebase stores them as numbers)
    const tIdNumber = tId;
    const storeIdNumber = storeId;

    logger.info('[ChatAggregation] Querying daily chat stats', {
        tId: getAnalyticsIdContext(tIdNumber),
        storeId: getAnalyticsIdContext(storeIdNumber),
        date: dateStr,
    });

    // Query all chats for this STORE on this date
    const chatsSnapshot = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
        .where('pId', '==', 'AL')
        .where('tId', '==', tIdNumber)  // ✅ Use number
        .where('sId', '==', storeIdNumber)  // ✅ Use number
        .where('createdOn', '>=', Timestamp.fromDate(startOfDay))  // ✅ Direct import
        .where('createdOn', '<=', Timestamp.fromDate(endOfDay))    // ✅ Direct import
        .orderBy('createdOn', 'asc')
        .limit(ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT + 1)
        .get();

    logger.info('[ChatAggregation] Daily chat session query completed', {
        tId: getAnalyticsIdContext(tIdNumber),
        storeId: getAnalyticsIdContext(storeIdNumber),
        date: dateStr,
        chatCount: chatsSnapshot.size,
    });

    if (chatsSnapshot.size === 0) {
        // Query without date filter to see if there are any sessions at all
        const anyChats = await db.collection(DB_COLLECTIONS.CHAT_SESSIONS)
            .where('pId', '==', 'AL')
            .where('tId', '==', tIdNumber)
            .where('sId', '==', storeIdNumber)
            .limit(1)
            .get();
        logger.info('[ChatAggregation] Store chat existence check completed', {
            tId: getAnalyticsIdContext(tIdNumber),
            storeId: getAnalyticsIdContext(storeIdNumber),
            hasAnyChats: anyChats.size > 0,
        });
    }

    // Initialize stats
    const stats: DailyStats = {
        pId: 'AL',
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
        knowledgeGaps: [],
        sourceComplete: chatsSnapshot.size <= ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT,
        sourceSessionCount: Math.min(chatsSnapshot.size, ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT),
        sourceLimit: ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT,
    };

    const questionCounts: Record<string, number> = {};
    const gapCounts: Record<string, { question: string; count: number; examples: string[] }> = {};

    // Process each chat session
    chatsSnapshot.docs.slice(0, ANSWERLATTICE_CHAT_DAILY_SESSION_LIMIT).forEach((doc) => {
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
        logger.info('[ChatAggregation] Slack webhook not configured; skipping failure alert', {
            failedCount: results.failedCount || 0,
        });
        return;
    }

    try {
        const targetValidation = await validateNetworkTargetUrl(String(webhookUrl));
        if (!targetValidation.valid || !targetValidation.normalizedUrl) {
            logger.warn('[ChatAggregation] Slack webhook target rejected', {
                failureCode: CHAT_DAILY_SLACK_TARGET_REJECTED,
                failedCount: results.failedCount || 0,
                ...getSlackTargetContext(targetValidation),
            });
            return;
        }

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
                        text: `*Failure Code:* ${CHAT_DAILY_STORE_AGGREGATION_FAILED}\nCheck Functions logs for bounded store context.`
                    }
                }
            ]
        };

        await fetch(targetValidation.normalizedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        logger.info('[ChatAggregation] Failure alert sent to Slack', {
            failedCount: results.failedCount || 0,
        });
    } catch (error) {
        logger.warn('[ChatAggregation] Failed to send failure alert', {
            failureCode: CHAT_DAILY_SLACK_ALERT_FAILED,
            failedCount: results.failedCount || 0,
            error: getAnalyticsErrorContext(error),
        });
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
    memory: "1GiB" as const,  // Increased from default 256MB for large datasets
    maxInstances: FUNCTION_MAX_INSTANCES.scheduler
};

export const backfillAggregates = onCall(backfillOptions, async (request) => {
    const data = request.data && typeof request.data === 'object'
        ? request.data as Record<string, unknown>
        : {};
    const context = request.auth;

    if (!context) {
        throw new HttpsError('unauthenticated', 'You must be logged in to run backfill operations');
    }

    const requesterRole = String(context.token?.platformRole || context.token?.role || '');

    // Security: Only allow PLATFORM role.
    if (requesterRole !== ECOMSAI_PLATFORM_USER_ROLE) {
        throw new HttpsError('permission-denied', 'Only platform owners can run backfill operations');
    }

    const tenantId = String(data.tenantId || '').trim();
    const storeId = String(data.storeId || '').trim();
    const requestedDays = Number(data.days ?? 30);

    if (!/^[1-9]\d*$/.test(tenantId) || !/^[1-9]\d*$/.test(storeId)) {
        throw new HttpsError('invalid-argument', 'tenantId and storeId are required');
    }
    if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 90) {
        throw new HttpsError('invalid-argument', 'days must be an integer between 1 and 90');
    }
    const tenantIdNumber = Number(tenantId);
    const storeIdNumber = Number(storeId);

    const db = firestoreAdmin;
    const results = [];

    for (let i = 1; i <= requestedDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
            logger.info('[ChatAggregation] Processing backfill date', {
                tenantId: getAnalyticsIdContext(tenantId),
                storeId: getAnalyticsIdContext(storeId),
                date: dateStr,
            });
            const stats = await aggregateForStore(db, tenantIdNumber, storeIdNumber, date);

            const docId = getChatAnalyticsDocId(tenantIdNumber, storeIdNumber, dateStr);
            const summaryRef = db.collection(DB_COLLECTIONS.CHAT_ANALYTICS).doc(docId);
            const existing = await summaryRef.get();
            if (stats.totalChats > 0 || existing.exists) {
                await summaryRef.set({
                    ...stats,
                    createdOn: existing.exists
                        ? existing.get('createdOn') || FieldValue.serverTimestamp()
                        : FieldValue.serverTimestamp(),
                    modifiedOn: FieldValue.serverTimestamp()
                }, { merge: true }); // merge: true makes it idempotent

                results.push({ date: dateStr, chats: stats.totalChats, status: 'success' });
            } else {
                results.push({ date: dateStr, chats: 0, status: 'skipped' });
            }
        } catch (error) {
            logger.warn('[ChatAggregation] Backfill date failed', {
                failureCode: CHAT_BACKFILL_DAY_FAILED,
                tenantId: getAnalyticsIdContext(tenantId),
                storeId: getAnalyticsIdContext(storeId),
                date: dateStr,
                error: getAnalyticsErrorContext(error),
            });
            results.push({
                date: dateStr,
                status: 'error',
                error: CHAT_BACKFILL_DAY_FAILED_MESSAGE
            });
        }
    }

    return { tenantId, storeId, days: requestedDays, results };
});
