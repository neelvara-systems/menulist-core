import { REFRESH_INTERVALS } from '@constant/metrics';
import { getUserChatSessions } from '@database/chatSessions';
import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import { getAnswerlatticeUserChatSessionsCacheKey } from '@lib/answerlattice/chatSessionContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { ChatSession } from '@type/chatSession';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { message as antMessage } from 'antd';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface UseChatDataProps {
    open: boolean;
    loggedInSession: any;
}

export function useChatData({ open, loggedInSession }: UseChatDataProps) {
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(null);
    const { getCategoriesCached } = useKBCategoriesCache();

    const scope = resolveAnswerlatticeSessionScope(loggedInSession);
    const userId = String(loggedInSession?.user?.id || loggedInSession?.uId || '').trim();
    // Query identity and SWR identity must include the exact Answerlattice
    // tenant, workspace, and actor dimensions.
    const sessionsCacheKey = open
        ? getAnswerlatticeUserChatSessionsCacheKey(scope, userId)
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

    // Fetch categories on open using shared in-flight/context cache.
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesResult = await getCategoriesCached();
                if (categoriesResult) {
                    setCategoriesData(categoriesResult);
                }
            } catch (error) {
                antMessage.error('Failed to load categories. Please try again.');
            }
        };

        if (open) {
            fetchCategories();
        }
    }, [getCategoriesCached, open]);

    return {
        chatSessions,
        setChatSessions,
        categoriesData,
        isLoadingSessions: isLoading
    };
}
