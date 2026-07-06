import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, where } from 'firebase/firestore';
import {
    getBoundedChatAnalyticsStringContext,
    logChatAnalyticsFailure,
} from './diagnostics';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * COST-OPTIMIZED CHAT ANALYTICS
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Problem: Fetching all chat sessions for stats = expensive Firebase reads
 * Solution: Aggregated stats collection updated via Cloud Functions/webhooks
 * 
 * Cost Comparison:
 * - OLD: 4,000 reads per dashboard load (if 1,000 sessions)
 * - NEW: 1-2 reads per dashboard load (only aggregated stats)
 * - Savings: 99.95% reduction in read operations!
 */

const ANALYTICS_COLLECTION = 'chatAnalytics'; // New collection for aggregated stats
const CHAT_SESSIONS_COLLECTION = DB_COLLECTIONS.CHAT_SESSIONS;
const TODAY_LIVE_STATS_LIMIT = 500;
const MAX_ANALYTICS_RANGE_DAYS = 90;

type ChatAnalyticsScope = {
    tId: number;
    sId: number;
};

const getEmptyChatAnalyticsStats = () => ({
    totalChats: 0,
    qnaChats: 0,
    assistantChats: 0,
    totalMessages: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    totalFeedback: 0,
    totalRegenerations: 0,
});

const getChatAnalyticsScope = (session: any): ChatAnalyticsScope | null => {
    const tId = normalizeAnswerlatticeScopeDocumentId(session?.tId ?? session?.tenantId ?? session?.user?.tenantId);
    const sId = normalizeAnswerlatticeScopeDocumentId(session?.sId ?? session?.storeId ?? session?.user?.storeId);

    if (!tId || !sId) return null;
    return { tId, sId };
};

const normalizeAnalyticsDays = (days: number, fallback = 30) => {
    if (!Number.isFinite(days)) return fallback;
    return Math.min(Math.max(Math.floor(days), 1), MAX_ANALYTICS_RANGE_DAYS);
};

const getChatAnalyticsScopeContext = (
    session: any,
    operation: string,
    days: number,
) => ({
    operation,
    days,
    ...getBoundedChatAnalyticsStringContext('tenantId', session?.tId),
    ...getBoundedChatAnalyticsStringContext('storeId', session?.sId),
});

const getDocRef = async (docId: string) => {
    return doc(answerlatticeFirebaseClient, ANALYTICS_COLLECTION, docId);
};

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, ANALYTICS_COLLECTION);
};

const getChatSessionsCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, CHAT_SESSIONS_COLLECTION);
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * AGGREGATED STATS STRUCTURE (1 document per store per day)
 * ═══════════════════════════════════════════════════════════════════════
 */
export interface ChatAnalyticsDay {
    id?: string; // Format: {tId}_{sId}_{YYYY-MM-DD}
    tId: number;
    sId: number; // Store ID (required for multi-store tenants)
    date: string; // YYYY-MM-DD
    totalChats: number;
    qnaChats: number;
    assistantChats: number;
    totalMessages: number;
    positiveFeedback: number;
    negativeFeedback: number;
    totalFeedback: number;
    totalRegenerations: number;
    topQuestions: Array<{ question: string; count: number }>; // Top 10
    knowledgeGaps: Array<{ question: string; count: number; examples: string[] }>; // Top 10
    createdOn?: Timestamp;
    modifiedOn?: Timestamp;
}

/**
 * Get today's live stats from chatSessions (HYBRID MODEL COMPONENT)
 * Fetches only today's sessions for real-time dashboard updates
 * 
 * @param session - User session containing tId and sId
 * @returns Today's statistics
 * 
 * Cost: 10-50 reads (only today's sessions) vs 0 cost but stale data
 * This solves the "Today's Chats shows 0" problem until aggregation runs
 */
export const getTodayLiveStats = async (session: any) => {
    return await apiCallComposer(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) return getEmptyChatAnalyticsStats();

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            // Query only today's sessions for THIS STORE
            const q = query(
                await getChatSessionsCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('createdOn', '>=', Timestamp.fromDate(todayStart)),
                where('createdOn', '<=', Timestamp.fromDate(todayEnd)),
                limit(TODAY_LIVE_STATS_LIMIT)
            );

            const querySnapshot = await getDocs(q);
            const sessions: any[] = [];

            querySnapshot.forEach((doc) => {
                sessions.push({ ...doc.data(), id: doc.id });
            });

            // Early return if no chats today (optimization)
            if (sessions.length === 0) {
                return getEmptyChatAnalyticsStats();
            }

            // Calculate today's stats
            let totalChats = sessions.length;
            let qnaChats = 0;
            let assistantChats = 0;
            let totalMessages = 0;
            let positiveFeedback = 0;
            let negativeFeedback = 0;
            let totalRegenerations = 0;

            sessions.forEach((session) => {
                if (session.mode === 'qna') qnaChats++;
                else assistantChats++;

                session.messages?.forEach((msg: any) => {
                    totalMessages++;

                    if (msg.feedback) {
                        if (msg.feedback.isGood) positiveFeedback++;
                        else negativeFeedback++;
                    }

                    if (msg.generationMetadata?.isRetry) {
                        totalRegenerations++;
                    }
                });
            });

            return {
                totalChats,
                qnaChats,
                assistantChats,
                totalMessages,
                positiveFeedback,
                negativeFeedback,
                totalFeedback: positiveFeedback + negativeFeedback,
                totalRegenerations
            };
        },
        { session },
        'getTodayLiveStats'
    );
};

/**
 * Get aggregated statistics for dashboard (HYBRID MODEL)
 * Combines historical aggregated data + today's live data for freshness
 * 
 * @param session - User session containing tId and sId
 * @param days - Number of days to aggregate (default: 30)
 * @returns Aggregated statistics with live today's data
 * 
 * Cost: ~30 reads (historical) + 10-50 reads (today) = 40-80 reads
 * Still 98% cheaper than old approach (4,000+ reads)!
 */
export const getChatStatisticsOptimized = async (session: any, days: number = 30) => {
    return await apiCallComposer(
        async () => {
            const safeDays = normalizeAnalyticsDays(days, 30);
            const scope = getChatAnalyticsScope(session);
            if (!scope) {
                return {
                    ...getEmptyChatAnalyticsStats(),
                    todayChats: 0,
                    satisfactionRate: 0,
                    avgMessagesPerChat: 0,
                    regenerationRate: 0,
                };
            }

            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);

            // Query aggregated daily stats for THIS STORE (excluding today)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', yesterday.toISOString().split('T')[0]),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const dailyStats: ChatAnalyticsDay[] = [];

            querySnapshot.forEach((doc) => {
                dailyStats.push({ ...doc.data(), id: doc.id } as ChatAnalyticsDay);
            });

            // Aggregate historical data
            const historicalStats = dailyStats.reduce(
                (acc, day) => ({
                    totalChats: acc.totalChats + day.totalChats,
                    qnaChats: acc.qnaChats + day.qnaChats,
                    assistantChats: acc.assistantChats + day.assistantChats,
                    totalMessages: acc.totalMessages + day.totalMessages,
                    positiveFeedback: acc.positiveFeedback + day.positiveFeedback,
                    negativeFeedback: acc.negativeFeedback + day.negativeFeedback,
                    totalFeedback: acc.totalFeedback + day.totalFeedback,
                    totalRegenerations: acc.totalRegenerations + day.totalRegenerations
                }),
                {
                    totalChats: 0,
                    qnaChats: 0,
                    assistantChats: 0,
                    totalMessages: 0,
                    positiveFeedback: 0,
                    negativeFeedback: 0,
                    totalFeedback: 0,
                    totalRegenerations: 0
                }
            );

            // Fetch today's live data (HYBRID MODEL - for data freshness)
            // Wrap in try-catch to handle errors gracefully
            let todayStats = {
                totalChats: 0,
                qnaChats: 0,
                assistantChats: 0,
                totalMessages: 0,
                positiveFeedback: 0,
                negativeFeedback: 0,
                totalFeedback: 0,
                totalRegenerations: 0
            };

            try {
                todayStats = await getTodayLiveStats(session);
            } catch (error) {
                logChatAnalyticsFailure(
                    'answerlattice_chat_analytics_today_live_stats_failed',
                    error,
                    getChatAnalyticsScopeContext(session, 'getChatStatisticsOptimized', safeDays),
                );
                // Continue with historical stats only
            }

            // Combine historical + today's live data (safe with fallbacks)
            const combinedStats = {
                totalChats: historicalStats.totalChats + todayStats.totalChats,
                qnaChats: historicalStats.qnaChats + todayStats.qnaChats,
                assistantChats: historicalStats.assistantChats + todayStats.assistantChats,
                totalMessages: historicalStats.totalMessages + todayStats.totalMessages,
                positiveFeedback: historicalStats.positiveFeedback + todayStats.positiveFeedback,
                negativeFeedback: historicalStats.negativeFeedback + todayStats.negativeFeedback,
                totalFeedback: historicalStats.totalFeedback + todayStats.totalFeedback,
                totalRegenerations: historicalStats.totalRegenerations + todayStats.totalRegenerations
            };

            // Calculate derived metrics
            const satisfactionRate = combinedStats.totalFeedback > 0
                ? Math.round((combinedStats.positiveFeedback / combinedStats.totalFeedback) * 100)
                : 0;

            const avgMessagesPerChat = combinedStats.totalChats > 0
                ? Math.round((combinedStats.totalMessages / combinedStats.totalChats) * 10) / 10
                : 0;

            const regenerationRate = combinedStats.totalMessages > 0
                ? Math.round((combinedStats.totalRegenerations / combinedStats.totalMessages) * 100)
                : 0;

            return {
                ...combinedStats,
                todayChats: todayStats.totalChats, // Always fresh!
                satisfactionRate,
                avgMessagesPerChat,
                regenerationRate
            };
        },
        { session, days: normalizeAnalyticsDays(days, 30) },
        'getChatStatisticsOptimized'
    );
};

/**
 * Get top questions (from aggregated data)
 * Cost: ~30 reads for 30 days vs 1,000+ reads for old approach
 */
export const getTopQuestionsOptimized = async (session: any, days: number = 30) => {
    return await apiCallComposer(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) return [];

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - normalizeAnalyticsDays(days, 30));

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', endDate.toISOString().split('T')[0]),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const questionCounts: Record<string, number> = {};

            // Aggregate questions across days
            querySnapshot.forEach((doc) => {
                const data = doc.data() as ChatAnalyticsDay;
                data.topQuestions?.forEach((q) => {
                    questionCounts[q.question] = (questionCounts[q.question] || 0) + q.count;
                });
            });

            // Sort and return top 10
            return Object.entries(questionCounts)
                .map(([question, count]) => ({ question, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        },
        { session, days: normalizeAnalyticsDays(days, 30) },
        'getTopQuestionsOptimized'
    );
};

/**
 * Get knowledge gaps (from aggregated data)
 * Cost: ~30 reads for 30 days vs 1,000+ reads for old approach
 */
export const getKnowledgeGapsOptimized = async (session: any, days: number = 30) => {
    return await apiCallComposer(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) return [];

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - normalizeAnalyticsDays(days, 30));

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', endDate.toISOString().split('T')[0]),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const gapCounts: Record<string, { question: string; count: number; examples: string[] }> = {};

            // Aggregate gaps across days
            querySnapshot.forEach((doc) => {
                const data = doc.data() as ChatAnalyticsDay;
                data.knowledgeGaps?.forEach((gap) => {
                    if (!gapCounts[gap.question]) {
                        gapCounts[gap.question] = {
                            question: gap.question,
                            count: 0,
                            examples: []
                        };
                    }
                    gapCounts[gap.question].count += gap.count;
                    // Add unique examples (limit to 3)
                    gap.examples?.forEach((ex) => {
                        if (gapCounts[gap.question].examples.length < 3 && !gapCounts[gap.question].examples.includes(ex)) {
                            gapCounts[gap.question].examples.push(ex);
                        }
                    });
                });
            });

            // Sort and return top 20
            return Object.values(gapCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
        },
        { session, days: normalizeAnalyticsDays(days, 30) },
        'getKnowledgeGapsOptimized'
    );
};

/**
 * Get the full chat dashboard aggregate from one daily analytics query.
 * Cost: ~30 daily aggregate reads + today's live reads, instead of three
 * separate daily aggregate queries over the same date range.
 */
export const getChatDashboardAggregatesOptimized = async (session: any, days: number = 30) => {
    return await apiCallComposer(
        async () => {
            const safeDays = normalizeAnalyticsDays(days, 30);
            const scope = getChatAnalyticsScope(session);
            if (!scope) {
                return {
                    statistics: {
                        ...getEmptyChatAnalyticsStats(),
                        todayChats: 0,
                        satisfactionRate: 0,
                        avgMessagesPerChat: 0,
                        regenerationRate: 0,
                    },
                    topQuestions: [],
                    knowledgeGaps: [],
                };
            }

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = yesterday.toISOString().split('T')[0];

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', endDate.toISOString().split('T')[0]),
                orderBy('date', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const dailyStats: ChatAnalyticsDay[] = [];
            querySnapshot.forEach((doc) => {
                dailyStats.push({ ...doc.data(), id: doc.id } as ChatAnalyticsDay);
            });

            const historicalDays = dailyStats.filter((day) => day.date <= yesterdayKey);
            const historicalStats = historicalDays.reduce(
                (acc, day) => ({
                    totalChats: acc.totalChats + day.totalChats,
                    qnaChats: acc.qnaChats + day.qnaChats,
                    assistantChats: acc.assistantChats + day.assistantChats,
                    totalMessages: acc.totalMessages + day.totalMessages,
                    positiveFeedback: acc.positiveFeedback + day.positiveFeedback,
                    negativeFeedback: acc.negativeFeedback + day.negativeFeedback,
                    totalFeedback: acc.totalFeedback + day.totalFeedback,
                    totalRegenerations: acc.totalRegenerations + day.totalRegenerations
                }),
                {
                    totalChats: 0,
                    qnaChats: 0,
                    assistantChats: 0,
                    totalMessages: 0,
                    positiveFeedback: 0,
                    negativeFeedback: 0,
                    totalFeedback: 0,
                    totalRegenerations: 0
                }
            );

            let todayStats = {
                totalChats: 0,
                qnaChats: 0,
                assistantChats: 0,
                totalMessages: 0,
                positiveFeedback: 0,
                negativeFeedback: 0,
                totalFeedback: 0,
                totalRegenerations: 0
            };

            try {
                todayStats = await getTodayLiveStats(session);
            } catch (error) {
                logChatAnalyticsFailure(
                    'answerlattice_chat_analytics_today_live_stats_failed',
                    error,
                    getChatAnalyticsScopeContext(session, 'getChatDashboardAggregatesOptimized', safeDays),
                );
            }

            const combinedStats = {
                totalChats: historicalStats.totalChats + todayStats.totalChats,
                qnaChats: historicalStats.qnaChats + todayStats.qnaChats,
                assistantChats: historicalStats.assistantChats + todayStats.assistantChats,
                totalMessages: historicalStats.totalMessages + todayStats.totalMessages,
                positiveFeedback: historicalStats.positiveFeedback + todayStats.positiveFeedback,
                negativeFeedback: historicalStats.negativeFeedback + todayStats.negativeFeedback,
                totalFeedback: historicalStats.totalFeedback + todayStats.totalFeedback,
                totalRegenerations: historicalStats.totalRegenerations + todayStats.totalRegenerations
            };

            const satisfactionRate = combinedStats.totalFeedback > 0
                ? Math.round((combinedStats.positiveFeedback / combinedStats.totalFeedback) * 100)
                : 0;
            const avgMessagesPerChat = combinedStats.totalChats > 0
                ? Math.round((combinedStats.totalMessages / combinedStats.totalChats) * 10) / 10
                : 0;
            const regenerationRate = combinedStats.totalMessages > 0
                ? Math.round((combinedStats.totalRegenerations / combinedStats.totalMessages) * 100)
                : 0;

            const questionCounts: Record<string, number> = {};
            const gapCounts: Record<string, { question: string; count: number; examples: string[] }> = {};

            dailyStats.forEach((day) => {
                day.topQuestions?.forEach((question) => {
                    questionCounts[question.question] = (questionCounts[question.question] || 0) + question.count;
                });

                day.knowledgeGaps?.forEach((gap) => {
                    if (!gapCounts[gap.question]) {
                        gapCounts[gap.question] = {
                            question: gap.question,
                            count: 0,
                            examples: []
                        };
                    }
                    gapCounts[gap.question].count += gap.count;
                    gap.examples?.forEach((example) => {
                        if (gapCounts[gap.question].examples.length < 3 && !gapCounts[gap.question].examples.includes(example)) {
                            gapCounts[gap.question].examples.push(example);
                        }
                    });
                });
            });

            return {
                statistics: {
                    ...combinedStats,
                    todayChats: todayStats.totalChats,
                    satisfactionRate,
                    avgMessagesPerChat,
                    regenerationRate
                },
                topQuestions: Object.entries(questionCounts)
                    .map(([question, count]) => ({ question, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                knowledgeGaps: Object.values(gapCounts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 20),
            };
        },
        { session, days: normalizeAnalyticsDays(days, 30) },
        'getChatDashboardAggregatesOptimized'
    );
};

/**
 * Get chat volume over time (from aggregated data)
 * Cost: ~30 reads for 30 days (one per day)
 */
export const getChatVolumeOverTimeOptimized = async (session: any, days: number = 7) => {
    return await apiCallComposer(
        async () => {
            const safeDays = normalizeAnalyticsDays(days, 7);
            const scope = getChatAnalyticsScope(session);
            if (!scope) return [];

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);
            startDate.setHours(0, 0, 0, 0);

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', endDate.toISOString().split('T')[0]),
                orderBy('date', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const dailyCounts: Record<string, number> = {};

            // Initialize all days with 0
            for (let i = 0; i < safeDays; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateKey = date.toISOString().split('T')[0];
                dailyCounts[dateKey] = 0;
            }

            // Fill in actual counts
            querySnapshot.forEach((doc) => {
                const data = doc.data() as ChatAnalyticsDay;
                if (dailyCounts[data.date] !== undefined) {
                    dailyCounts[data.date] = data.totalChats;
                }
            });

            // Convert to array
            return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
        },
        { session, days: normalizeAnalyticsDays(days, 7) },
        'getChatVolumeOverTimeOptimized'
    );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * CONVERSATIONS LIST - OPTIMIZED WITH PAGINATION
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Get paginated conversations (NOT all at once)
 * Cost: Only reads the current page (20-50 docs per page)
 * 
 * @param session - User session
 * @param pageSize - Number of conversations per page (default: 20)
 * @param filters - Optional filters
 * @returns Paginated conversations
 */
export const getConversationsPaginated = async (
    session: any,
    pageSize: number = 20,
    filters?: {
        mode?: 'qna' | 'assistant';
        dateRange?: { start: Date; end: Date };
        lastDocId?: string;
        userName?: string; // Exact match (for dropdown filter)
        searchQuery?: string; // Client-side filter hint (not used in query)
    }
) => {
    return await apiCallComposer(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) {
                return {
                    sessions: [],
                    hasNextPage: false,
                    nextPageCursor: null,
                };
            }

            // Build query with limit (CRITICAL for cost control)
            let q = query(
                await getChatSessionsCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                orderBy('modifiedOn', 'desc'),
                limit(pageSize + 1) // +1 to check if there's next page
            );

            // Add filters
            if (filters?.mode) {
                q = query(q, where('mode', '==', filters.mode));
            }

            // userName exact match (useful for filtering by specific user)
            if (filters?.userName) {
                q = query(q, where('userName', '==', filters.userName));
            }

            if (filters?.dateRange) {
                q = query(
                    q,
                    where('modifiedOn', '>=', Timestamp.fromDate(filters.dateRange.start)),
                    where('modifiedOn', '<=', Timestamp.fromDate(filters.dateRange.end))
                );
            }

            // Pagination cursor
            if (filters?.lastDocId) {
                const lastDocRef = doc(answerlatticeFirebaseClient, CHAT_SESSIONS_COLLECTION, filters.lastDocId);
                const lastDocSnap = await getDoc(lastDocRef);
                if (lastDocSnap.exists()) {
                    const { startAfter } = await import('firebase/firestore');
                    q = query(q, startAfter(lastDocSnap));
                }
            }

            const querySnapshot = await getDocs(q);
            let sessions: any[] = [];

            querySnapshot.forEach((doc) => {
                sessions.push({ ...doc.data(), id: doc.id });
            });

            // CLIENT-SIDE FILTERING (Firestore doesn't support case-insensitive partial text search)
            // This filters the already-fetched data to reduce what's sent to client
            if (filters?.searchQuery) {
                const searchLower = filters.searchQuery.toLowerCase();
                sessions = sessions.filter(session => {
                    // Search in title
                    if (session.title?.toLowerCase().includes(searchLower)) return true;
                    // Search in userName
                    if (session.userName?.toLowerCase().includes(searchLower)) return true;
                    if (session.userEmail?.toLowerCase().includes(searchLower)) return true;
                    if (String(session.uId || '').toLowerCase().includes(searchLower)) return true;
                    const sourceContext = session.sourceContext && typeof session.sourceContext === 'object'
                        ? session.sourceContext
                        : {};
                    if (String(sourceContext.email || '').toLowerCase().includes(searchLower)) return true;
                    if (String(sourceContext.name || '').toLowerCase().includes(searchLower)) return true;
                    // Note: Message content search happens client-side for better UX
                    return false;
                });
            }

            // Check if there's a next page
            const hasNextPage = sessions.length > pageSize;
            if (hasNextPage) {
                sessions.pop(); // Remove the extra document
            }

            return {
                sessions,
                hasNextPage,
                nextPageCursor: hasNextPage ? sessions[sessions.length - 1].id : null
            };
        },
        { session, pageSize, filters },
        'getConversationsPaginated'
    );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * AGGREGATION HELPER (To be called by Cloud Function or webhook)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This should run:
 * - Daily via Cloud Scheduler
 * - Or after each chat session update (Firebase trigger)
 * 
 * Cost: Processes all sessions ONCE per day (not on every dashboard view)
 */
export const aggregateDailyStats = async (session: any, date: Date) => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) {
                throw new Error('Missing Answerlattice chat analytics scope');
            }

            const dateStr = date.toISOString().split('T')[0];
            const docId = `${scope.tId}_${scope.sId}_${dateStr}`; // CRITICAL: Include storeId

            // Get all sessions for this STORE and day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const q = query(
                await getChatSessionsCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('createdOn', '>=', Timestamp.fromDate(startOfDay)),
                where('createdOn', '<=', Timestamp.fromDate(endOfDay))
            );

            const querySnapshot = await getDocs(q);

            // Calculate stats for this day
            let totalChats = 0;
            let qnaChats = 0;
            let assistantChats = 0;
            let totalMessages = 0;
            let positiveFeedback = 0;
            let negativeFeedback = 0;
            let totalRegenerations = 0;
            const questionCounts: Record<string, number> = {};
            const gapCounts: Record<string, { question: string; count: number; examples: string[] }> = {};

            querySnapshot.forEach((doc) => {
                const sessionData = doc.data();
                totalChats++;

                if (sessionData.mode === 'qna') qnaChats++;
                else assistantChats++;

                sessionData.messages?.forEach((msg: any, index: number) => {
                    totalMessages++;

                    // Track user questions
                    if (msg.role === 'user' && msg.content) {
                        const q = msg.content.trim().toLowerCase();
                        questionCounts[q] = (questionCounts[q] || 0) + 1;
                    }

                    // Track feedback
                    if (msg.feedback) {
                        if (msg.feedback.isGood) positiveFeedback++;
                        else {
                            negativeFeedback++;
                            // Track knowledge gap
                            const userMsg = sessionData.messages[index - 1];
                            if (userMsg?.role === 'user' && userMsg.content) {
                                const q = userMsg.content.trim().toLowerCase();
                                if (!gapCounts[q]) {
                                    gapCounts[q] = { question: userMsg.content, count: 0, examples: [] };
                                }
                                gapCounts[q].count++;
                                if (msg.feedback.comments && gapCounts[q].examples.length < 3) {
                                    gapCounts[q].examples.push(msg.feedback.comments);
                                }
                            }
                        }
                    }

                    // Track regenerations
                    if (msg.generationMetadata?.isRetry) {
                        totalRegenerations++;
                    }
                });
            });

            // Prepare aggregated document
            const aggregatedData: ChatAnalyticsDay = {
                tId: scope.tId,
                sId: scope.sId, // CRITICAL: Include storeId
                date: dateStr,
                totalChats,
                qnaChats,
                assistantChats,
                totalMessages,
                positiveFeedback,
                negativeFeedback,
                totalFeedback: positiveFeedback + negativeFeedback,
                totalRegenerations,
                topQuestions: Object.entries(questionCounts)
                    .map(([question, count]) => ({ question, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                knowledgeGaps: Object.values(gapCounts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
            };

            // Save to chatAnalytics collection
            const docRef = await getDocRef(docId);
            const composedData = await answerlatticeRequestBodyComposer(aggregatedData);
            await setDoc(docRef, composedData, { merge: true });

            return { success: true, date: dateStr, stats: aggregatedData };
        },
        { session, date },
        'aggregateDailyStats'
    );
};

/**
 * Get the most recent analytics update timestamp for a store
 * Used to check data freshness in the UI banner
 * 
 * @param session - User session containing tId and sId
 * @returns Most recent modifiedOn timestamp or null if no data
 */
export const getLastAnalyticsUpdate = async (session: any): Promise<Date | null> => {
    return await apiCallComposer(
        async () => {
            const scope = getChatAnalyticsScope(session);
            if (!scope) return null;

            const q = query(
                await getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('modifiedOn', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const doc = querySnapshot.docs[0];
            const data = doc.data();

            // Handle both Firestore Timestamp and serialized timestamps
            if (data.modifiedOn?.toDate) {
                return data.modifiedOn.toDate();
            } else if (data.modifiedOn?.seconds) {
                return new Date(data.modifiedOn.seconds * 1000);
            } else if (data.modifiedOn instanceof Date) {
                return data.modifiedOn;
            }

            return null;
        },
        { session },
        'getLastAnalyticsUpdate'
    );
};
