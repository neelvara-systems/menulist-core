import { REFRESH_INTERVALS } from '@constant/metrics';
import { getUserChatSessions } from '@database/chatSessions';
import { getCategories } from '@database/knowledgeBase/categories';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ChatSession } from '@type/chatSession';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { message as antMessage } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import useSWR from 'swr';

interface UseChatDataProps {
    open: boolean;
    loggedInSession: any;
}

export function useChatData({ open, loggedInSession }: UseChatDataProps) {
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(null);

    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Generate SWR cache key for chat sessions
    const sessionsCacheKey = (open && loggedInSession?.tId && loggedInSession?.uId)
        ? `user-chat-sessions-${loggedInSession.tId}-${loggedInSession.uId}`
        : null;

    // Fetch chat sessions with SWR (automatic caching & deduplication)
    const { data: swrData, error, isLoading, mutate } = useSWR(
        sessionsCacheKey,
        async () => {
            if (!loggedInSession) return [];
            const sessions = await getUserChatSessions(loggedInSession);
            return sessions || [];
        },
        {
            dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE, // 60 seconds
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true, // ✅ INDUSTRY STANDARD: Refetch in background when modal opens (ChatGPT/Claude pattern)
            fallbackData: []
        }
    );

    // Get sessions from SWR data
    const chatSessions = swrData || [];

    // Custom setter that also updates SWR cache
    const setChatSessions = (updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
        const newSessions = typeof updater === 'function' ? updater(chatSessions) : updater;
        mutate(newSessions, false); // Update SWR cache without revalidation
    };

    // Handle SWR errors
    if (error) {
        antMessage.error('Failed to load chat history. Please try again.');
    }

    // Fetch categories on mount (keep existing context-based caching)
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const hasCachedCategories = cachedKBCategories?.kBCategories &&
                    Object.keys(cachedKBCategories.kBCategories).length > 0;

                if (hasCachedCategories) {
                    // Use cached categories
                    setCategoriesData({ categories: cachedKBCategories.kBCategories });
                } else {
                    // Fetch and cache categories
                    const categoriesResult = await getCategories();
                    if (categoriesResult) {
                        setCategoriesData(categoriesResult);

                        // Cache only the categories map for future use
                        if (categoriesResult.categories) {
                            setCachedKBCategories({
                                cachedOn: Timestamp.now(),
                                kBCategories: categoriesResult.categories
                            });
                        }
                    }
                }
            } catch (error) {
                antMessage.error('Failed to load categories. Please try again.');
            }
        };

        if (open) {
            fetchCategories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return {
        chatSessions,
        setChatSessions,
        categoriesData,
        isLoadingSessions: isLoading
    };
}
