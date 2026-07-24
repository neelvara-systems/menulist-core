import { emitAnswerlatticeSignal } from '@lib/answerlattice/signalEmitter';
import type { AnswerlatticeChatSessionActorScope } from '@lib/answerlattice/chatSessionContracts';
import {
    HELP_CENTER_SEARCH_REQUEST_POLICY,
    readHelpCenterSearchResponse,
} from '@lib/search/helpCenterSearchResponse';
import { createRuntimeId } from '@lib/runtime/randomId';
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
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
    productContext?: Record<string, any> | null;
}

export async function searchKnowledgeBase({ query, mode, conversationHistory, image, productContext }: SearchKnowledgeBaseParams): Promise<SearchAPIResponseType> {
    // Strip unnecessary fields from conversation history before sending to AI.
    // Prior image URLs are intentionally not replayed; each image is context for
    // the single question it was attached to.
    // This reduces payload size, protects privacy, and saves tokens
    const cleanContext = mode === 'assistant' && conversationHistory
        ? conversationHistory.slice(-5).map(msg => ({
            role: msg.role,
            ...(msg.role === 'user'
                ? { content: msg.content || '' }
                : { craftedAnswer: msg.craftedAnswer || msg.content || '' }),
        }))
        : undefined;

    const response = await fetch('/api/helpCenter/search-kb', {
        ...HELP_CENTER_SEARCH_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requestId: createRuntimeId('help_search'),
            query,
            mode,
            context: cleanContext, // Send cleaned conversation history
            productContext: productContext || undefined,
            imageUrl: image?.url?.startsWith('https://') ? image.url : undefined,
        })
    });

    // Return the exact response DTO after bounded runtime validation.
    return await readHelpCenterSearchResponse(response, 'help_chat') as SearchAPIResponseType;
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
    expectedActorScope,
}: {
    searchHistoryId: string;
    sessionId: string;      // Chat session ID
    messageId: string;      // Message ID in the session
    isGood: boolean;
    reasonsToImprove?: Array<{ value: string; label: string; }>;
    comments?: string;
    expectedActorScope: AnswerlatticeChatSessionActorScope;
}) {
    const chatSessionsDal: typeof import('@database/chatSessions') = await import('@database/chatSessions');
    const assertChatMessageFeedbackUpdateSucceeded: typeof chatSessionsDal.assertChatMessageFeedbackUpdateSucceeded =
        chatSessionsDal.assertChatMessageFeedbackUpdateSucceeded;

    const feedbackData = {
        isGood,
        reasonsToImprove: reasonsToImprove || [],
        comments: comments || '',
        submittedAt: Timestamp.now() // Changed from createdOn to submittedAt
    };

    // Keep analytics and the reopenable chat message consistent in one Firestore transaction.
    const messageFeedbackUpdateResult = await chatSessionsDal.updateMessageFeedback(
        sessionId,
        messageId,
        searchHistoryId,
        feedbackData,
        expectedActorScope,
    );
    assertChatMessageFeedbackUpdateSucceeded(
        messageFeedbackUpdateResult,
        sessionId,
        messageId,
        'help_chat_message_feedback_update_rejected',
    );

    // Answerlattice: emit chat negative feedback signal (fire-and-forget)
    if (!isGood) {
        emitAnswerlatticeSignal({
            type: ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE,
            tId: expectedActorScope.tId,
            sId: expectedActorScope.sId,
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
