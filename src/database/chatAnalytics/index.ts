import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_CHAT_ANALYTICS_LIVE_SESSION_LIMIT,
    AnswerlatticeChatAnalyticsDay,
    getAnswerlatticeAnalyticsQueryWindow,
    normalizeAnswerlatticeAnalyticsDays,
    normalizeAnswerlatticeAnalyticsPageSize,
    parseAnswerlatticeAnalyticsDateRange,
    parseAnswerlatticeChatAnalyticsDay,
} from '@lib/answerlattice/chatAnalyticsContracts';
import {
    normalizeAnswerlatticeChatSessionId,
    parseAnswerlatticeChatSessionDocument,
} from '@lib/answerlattice/chatSessionContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { ChatSession } from '@type/chatSession';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore';
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

const toAnalyticsDate = (value: unknown): Date | null => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.toDate === 'function') {
        try {
            const date = (record.toDate as () => Date)();
            return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
        } catch {
            return null;
        }
    }
    if (typeof record.seconds === 'number' && Number.isFinite(record.seconds)) {
        const date = new Date(record.seconds * 1000);
        return Number.isFinite(date.getTime()) ? date : null;
    }
    return null;
};

const getRequiredChatAnalyticsContext = async (): Promise<{
    scope: ChatAnalyticsScope;
    session: any;
}> => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('answerlattice_chat_analytics_scope_missing');
    return {
        session,
        scope: { tId: scope.tenantId, sId: scope.storeId },
    };
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
export type ChatAnalyticsDay = AnswerlatticeChatAnalyticsDay;

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
            const { scope } = await getRequiredChatAnalyticsContext();

            // Nightly chat summaries use UTC date buckets. The live slice must
            // use the same boundary or today's total overlaps adjacent buckets.
            const todayStart = new Date();
            todayStart.setUTCHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setUTCHours(23, 59, 59, 999);

            // Query only today's sessions for THIS STORE
            const q = query(
                await getChatSessionsCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('createdOn', '>=', Timestamp.fromDate(todayStart)),
                where('createdOn', '<=', Timestamp.fromDate(todayEnd)),
                orderBy('createdOn', 'asc'),
                limit(ANSWERLATTICE_CHAT_ANALYTICS_LIVE_SESSION_LIMIT + 1)
            );

            const querySnapshot = await getDocs(q);
            const isPartial = querySnapshot.size > ANSWERLATTICE_CHAT_ANALYTICS_LIVE_SESSION_LIMIT;
            const sessions = querySnapshot.docs
                .slice(0, ANSWERLATTICE_CHAT_ANALYTICS_LIVE_SESSION_LIMIT)
                .flatMap((sessionDoc) => {
                    const parsed = parseAnswerlatticeChatSessionDocument({
                        id: sessionDoc.id,
                        value: sessionDoc.data(),
                        scope,
                    });
                    return parsed ? [parsed] : [];
                });

            // Early return if no chats today (optimization)
            if (sessions.length === 0) {
                return { ...getEmptyChatAnalyticsStats(), isPartial };
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
                totalRegenerations,
                isPartial,
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
            const safeDays = normalizeAnswerlatticeAnalyticsDays(days, 30);
            const { scope } = await getRequiredChatAnalyticsContext();

            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - safeDays);

            // Query aggregated daily stats for THIS STORE (excluding today)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                where('date', '>=', startDate.toISOString().split('T')[0]),
                where('date', '<=', yesterday.toISOString().split('T')[0]),
                orderBy('date', 'desc'),
                limit(safeDays + 1)
            );

            const querySnapshot = await getDocs(q);
            const dailyStats = querySnapshot.docs.flatMap((analyticsDoc) => {
                const parsed = parseAnswerlatticeChatAnalyticsDay({
                    id: analyticsDoc.id,
                    value: analyticsDoc.data(),
                    scope,
                });
                return parsed ? [parsed] : [];
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
                , isPartial: false
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
                , isPartial: dailyStats.some((day) => !day.sourceComplete) || Boolean(todayStats.isPartial)
            };
        },
        { session, days: normalizeAnswerlatticeAnalyticsDays(days, 30) },
        'getChatStatisticsOptimized'
    );
};

/**
 * Get the full chat dashboard aggregate from one daily analytics query.
 * Cost: ~30 daily aggregate reads + today's live reads, instead of three
 * separate daily aggregate queries over the same date range.
 */
export const getChatDashboardAggregatesOptimized = async (
    session: any,
    dateRange: { start: Date; end: Date },
) => {
    return await apiCallComposer(
        async () => {
            const queryWindow = getAnswerlatticeAnalyticsQueryWindow(dateRange);
            if (!queryWindow) throw new Error('answerlattice_chat_analytics_date_range_invalid');
            const { scope } = await getRequiredChatAnalyticsContext();

            const dailyStats = queryWindow.historicalEndDateKey
                ? (await getDocs(query(
                    await getCollectionRef(),
                    where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                    where('tId', '==', scope.tId),
                    where('sId', '==', scope.sId),
                    where('date', '>=', queryWindow.startDateKey),
                    where('date', '<=', queryWindow.historicalEndDateKey),
                    orderBy('date', 'desc'),
                    limit(queryWindow.dayCount),
                ))).docs.flatMap((analyticsDoc) => {
                    const parsed = parseAnswerlatticeChatAnalyticsDay({
                        id: analyticsDoc.id,
                        value: analyticsDoc.data(),
                        scope,
                    });
                    return parsed ? [parsed] : [];
                })
                : [];

            const historicalDays = dailyStats;
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
                totalRegenerations: 0,
                isPartial: false,
            };

            if (queryWindow.includesToday) {
                try {
                    todayStats = await getTodayLiveStats(session);
                } catch (error) {
                    logChatAnalyticsFailure(
                        'answerlattice_chat_analytics_today_live_stats_failed',
                        error,
                        getChatAnalyticsScopeContext(
                            session,
                            'getChatDashboardAggregatesOptimized',
                            queryWindow.dayCount,
                        ),
                    );
                }
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

            const questionCounts = new Map<string, number>();
            const gapCounts = new Map<string, { question: string; count: number; examples: string[] }>();

            dailyStats.forEach((day) => {
                day.topQuestions?.forEach((question) => {
                    questionCounts.set(
                        question.question,
                        (questionCounts.get(question.question) || 0) + question.count,
                    );
                });

                day.knowledgeGaps?.forEach((gap) => {
                    if (!gapCounts.has(gap.question)) {
                        gapCounts.set(gap.question, {
                            question: gap.question,
                            count: 0,
                            examples: []
                        });
                    }
                    const entry = gapCounts.get(gap.question)!;
                    entry.count += gap.count;
                    gap.examples?.forEach((example) => {
                        if (entry.examples.length < 3 && !entry.examples.includes(example)) {
                            entry.examples.push(example);
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
                    regenerationRate,
                    isPartial: historicalDays.some((day) => !day.sourceComplete) || Boolean(todayStats.isPartial),
                },
                topQuestions: Array.from(questionCounts.entries())
                    .map(([question, count]) => ({ question, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10),
                knowledgeGaps: Array.from(gapCounts.values())
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 20),
            };
        },
        {
            session,
            startDate: dateRange?.start,
            endDate: dateRange?.end,
        },
        'getChatDashboardAggregatesOptimized'
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
            const { scope } = await getRequiredChatAnalyticsContext();
            const safePageSize = normalizeAnswerlatticeAnalyticsPageSize(pageSize, 20);
            if (filters?.mode && filters.mode !== 'qna' && filters.mode !== 'assistant') {
                throw new Error('answerlattice_chat_analytics_mode_invalid');
            }
            const userName = typeof filters?.userName === 'string'
                ? filters.userName.trim().slice(0, 200)
                : '';
            const searchQuery = typeof filters?.searchQuery === 'string'
                ? filters.searchQuery.trim().toLowerCase().slice(0, 200)
                : '';
            const dateRange = filters?.dateRange
                ? parseAnswerlatticeAnalyticsDateRange(filters.dateRange)
                : null;
            if (filters?.dateRange && !dateRange) {
                throw new Error('answerlattice_chat_analytics_date_range_invalid');
            }

            // Build query with limit (CRITICAL for cost control)
            let q = query(
                await getChatSessionsCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId), // CRITICAL: Filter by storeId
                orderBy('modifiedOn', 'desc'),
                limit(safePageSize + 1) // +1 to check if there's next page
            );

            // Add filters
            if (filters?.mode) {
                q = query(q, where('mode', '==', filters.mode));
            }

            // userName exact match (useful for filtering by specific user)
            if (userName) {
                q = query(q, where('userName', '==', userName));
            }

            if (dateRange) {
                q = query(
                    q,
                    where('modifiedOn', '>=', Timestamp.fromDate(dateRange.start)),
                    where('modifiedOn', '<=', Timestamp.fromDate(dateRange.end))
                );
            }

            // Pagination cursor
            if (filters?.lastDocId) {
                const cursorId = normalizeAnswerlatticeChatSessionId(filters.lastDocId);
                if (!cursorId) throw new Error('answerlattice_chat_analytics_cursor_invalid');
                const lastDocRef = doc(answerlatticeFirebaseClient, CHAT_SESSIONS_COLLECTION, cursorId);
                const lastDocSnap = await getDoc(lastDocRef);
                if (lastDocSnap.exists()) {
                    const parsedCursor = parseAnswerlatticeChatSessionDocument({
                        id: cursorId,
                        value: lastDocSnap.data(),
                        scope,
                    });
                    if (!parsedCursor) throw new Error('answerlattice_chat_analytics_cursor_scope_invalid');
                    q = query(q, startAfter(lastDocSnap));
                }
            }

            const querySnapshot = await getDocs(q);
            const parsedSessions = querySnapshot.docs.flatMap((sessionDoc) => {
                const parsed = parseAnswerlatticeChatSessionDocument({
                    id: sessionDoc.id,
                    value: sessionDoc.data(),
                    scope,
                });
                return parsed ? [parsed] : [];
            });
            const hasNextPage = parsedSessions.length > safePageSize;
            const pageSessions = parsedSessions.slice(0, safePageSize);
            const nextPageCursor = hasNextPage
                ? pageSessions[pageSessions.length - 1]?.id || null
                : null;
            let sessions: ChatSession[] = pageSessions;

            // CLIENT-SIDE FILTERING (Firestore doesn't support case-insensitive partial text search)
            // This filters the already-fetched data to reduce what's sent to client
            if (searchQuery) {
                sessions = sessions.filter(session => {
                    // Search in title
                    if (session.title?.toLowerCase().includes(searchQuery)) return true;
                    // Search in userName
                    if (session.userName?.toLowerCase().includes(searchQuery)) return true;
                    if (session.userEmail?.toLowerCase().includes(searchQuery)) return true;
                    if (String(session.uId || '').toLowerCase().includes(searchQuery)) return true;
                    const sourceContext: Record<string, unknown> = session.sourceContext && typeof session.sourceContext === 'object'
                        ? session.sourceContext as unknown as Record<string, unknown>
                        : {};
                    if (String(sourceContext.email || '').toLowerCase().includes(searchQuery)) return true;
                    if (String(sourceContext.name || '').toLowerCase().includes(searchQuery)) return true;
                    // Note: Message content search happens client-side for better UX
                    return false;
                });
            }

            return {
                sessions,
                hasNextPage,
                nextPageCursor,
            };
        },
        { session, pageSize, filters },
        'getConversationsPaginated'
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
            const { scope } = await getRequiredChatAnalyticsContext();

            const q = query(
                await getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('modifiedOn', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const analyticsDoc = querySnapshot.docs[0];
            const data = parseAnswerlatticeChatAnalyticsDay({
                id: analyticsDoc.id,
                value: analyticsDoc.data(),
                scope,
            });
            if (!data) return null;

            return toAnalyticsDate(data.modifiedOn);
        },
        { session },
        'getLastAnalyticsUpdate'
    );
};
