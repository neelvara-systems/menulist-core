import { emitCanonicaSignal } from '@lib/canonica/signalEmitter';
import { CANONICA_SIGNAL_TYPE } from '@type/canonica';
import { UserUploadedFileType } from '@type/common';
import { Timestamp } from 'firebase/firestore';
import { SearchAPIResponseType } from './apiTypes';
import { ChatMessage, ChatMode } from './types';

/**
 * Search knowledge base with AI
 * Supports both QnA (single query) and Assistant (with conversation context) modes
 * Returns backend response structure as-is (no enrichment)
 */

interface SearchKnowledgeBaseParams {
    query: string;
    mode: ChatMode;
    conversationHistory?: ChatMessage[];
    image?: UserUploadedFileType;
    sessionFailureCount?: number;
}

export async function searchKnowledgeBase({ query, mode, conversationHistory, image, sessionFailureCount }: SearchKnowledgeBaseParams): Promise<SearchAPIResponseType> {
    // ✅ Strip unnecessary fields from conversation history before sending to AI
    // Only send essential data: role, content/craftedAnswer, and image
    // This reduces payload size, protects privacy, and saves tokens
    const cleanContext = mode === 'assistant' && conversationHistory
        ? conversationHistory.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.role === 'user' ? msg.content : (msg.craftedAnswer || msg.content),
            ...(msg.image?.url && { imageUrl: msg.image.url }) // Include image URL if present
        }))
        : undefined;

    const response = await fetch('/api/helpCenter/search-kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            mode,
            context: cleanContext, // Send cleaned conversation history
            imageUrl: image?.url, // Send uploaded image URL to backend
            sessionFailureCount, // AI Failure Escalation (Item #8) — S3 trigger
        })
    });

    const data: SearchAPIResponseType = await response.json();

    // 🔒 Handle rate limit error with user-friendly message
    if (response.status === 429) {
        const retryAfter = (data as any).retryAfter || 60;
        throw new Error(`You've reached the request limit. Please wait ${retryAfter} seconds before trying again.`);
    }

    if (!response.ok) {
        throw new Error((data as any).error || 'Search failed');
    }

    // Return backend response as-is
    // Backend already includes full KnowledgeBaseArticleType objects with all necessary fields
    return data;
}

/**
 * Submit feedback for AI search response
 * Stores feedback in BOTH aiSearchHistory (analytics) and chatSession (UI)
 */
export async function submitSearchFeedback({
    searchHistoryId,
    sessionId,
    messageId,
    isGood,
    reasonsToImprove,
    comments,
    tId,
    sId
}: {
    searchHistoryId: string;
    sessionId: string;      // Chat session ID
    messageId: string;      // Message ID in the session
    isGood: boolean;
    reasonsToImprove?: Array<{ value: string; label: string; }>;
    comments?: string;
    tId?: number;
    sId?: number;
}) {
    const { updateAiSearchHistoryWithFeedback } = await import('@database/aiSearchHistory');
    const { updateMessageFeedback } = await import('@database/chatSessions');

    const feedbackData = {
        isGood,
        reasonsToImprove: reasonsToImprove || [],
        comments: comments || '',
        submittedAt: Timestamp.now() // Changed from createdOn to submittedAt
    };

    // Save to aiSearchHistory (for analytics)
    await updateAiSearchHistoryWithFeedback({ id: searchHistoryId, ...feedbackData });

    // Save to chatSession message (for UI display)
    await updateMessageFeedback(sessionId, messageId, feedbackData);

    // Canonica: emit chat negative feedback signal (fire-and-forget)
    if (!isGood) {
        emitCanonicaSignal({
            type: CANONICA_SIGNAL_TYPE.CHAT_NEGATIVE,
            tId,
            sId,
            metadata: {
                searchHistoryId,
                sessionId,
                messageId,
                reasons: reasonsToImprove,
                comments,
            },
        });
    }
}
