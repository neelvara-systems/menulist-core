import {
    assertChatSessionDeleteSucceeded,
    assertChatSessionSaveSucceeded,
    assertChatSessionUpdateSucceeded,
    deleteChatSession,
    getUserChatSessions,
    saveChatSession,
    updateChatSession,
    uploadChatImage,
} from '@database/chatSessions';
import { buildAnswerlatticeActorSnapshot } from '@lib/answerlattice/customerIdentity';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { ChatSession } from '@type/chatSession';
import { UserUploadedFileType } from '@type/common';
import { message as antMessage } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { searchKnowledgeBase, submitSearchFeedback } from '../api';
import { SearchAPIResponseType } from '../apiTypes';
import { clearDraft, detectSimilarQueries, trimMessages } from '../chatUtils';
import { feedbackOptions } from '../FeedbackModal';
import { getBoundedHelpChatStringContext, logHelpChatFailure } from '../helpChatDiagnostics';
import { ChatMessage, ChatMode } from '../types';
import { useRequestQueue } from './useRequestQueue';

const HELP_CHAT_SEARCH_FAILED_MESSAGE = 'Something went wrong while searching.';
const HELP_CHAT_MESSAGE_COPY_CLIPBOARD_UNAVAILABLE = 'help_chat_message_copy_clipboard_unavailable';
const HELP_CHAT_MESSAGE_COPY_FALLBACK_FAILED = 'help_chat_message_copy_fallback_failed';

const copyHelpChatMessageToClipboard = async (text: string): Promise<void> => {
    await copyAnswerlatticeSupportTextToClipboard(text, {
        unavailable: HELP_CHAT_MESSAGE_COPY_CLIPBOARD_UNAVAILABLE,
        fallbackFailed: HELP_CHAT_MESSAGE_COPY_FALLBACK_FAILED,
    });
};

interface UseChatHandlersProps {
    chatSessions: ChatSession[];
    setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
    activeSessionId: string | null | undefined;
    setActiveSessionId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
    activeSession: ChatSession | undefined;
    currentMode: ChatMode;
    setCurrentMode: React.Dispatch<React.SetStateAction<ChatMode>>;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    dispatchChatState: React.Dispatch<any>;
    loggedInSession: any;
    productContext?: Record<string, any> | null;
    queryHistory: string[];
    setQueryHistory: React.Dispatch<React.SetStateAction<string[]>>;
    setMessageFeedback: React.Dispatch<React.SetStateAction<Record<string, 'up' | 'down' | null>>>;
    setFeedbackMessageId: React.Dispatch<React.SetStateAction<string | null>>;
    setFeedbackModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useChatHandlers({
    chatSessions,
    setChatSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    currentMode,
    setCurrentMode,
    searchQuery,
    setSearchQuery,
    dispatchChatState,
    loggedInSession,
    productContext,
    queryHistory,
    setQueryHistory,
    setMessageFeedback,
    setFeedbackMessageId,
    setFeedbackModalVisible
}: UseChatHandlersProps) {

    // 🔒 FIX RACE CONDITIONS: Use refs to always have latest state
    const activeSessionRef = useRef(activeSession);
    const chatSessionsRef = useRef(chatSessions);
    const currentModeRef = useRef(currentMode);

    // 🔒 FIX FEEDBACK RACE CONDITIONS: Track in-progress feedback submissions
    const feedbackInProgressRef = useRef<Set<string>>(new Set());

    // AI Failure Escalation (Item #8): Track session failure count for S3 trigger
    const sessionFailureCountRef = useRef(0);

    // Keep refs in sync with state
    useEffect(() => {
        activeSessionRef.current = activeSession;
        chatSessionsRef.current = chatSessions;
        currentModeRef.current = currentMode;
    }, [activeSession, chatSessions, currentMode]);

    // 🔒 FIX RACE CONDITIONS: Add request queue
    const { enqueue, isProcessing } = useRequestQueue();

    const logChatSessionPersistFailure = (
        error: unknown,
        reason: string,
        sessionId: unknown,
        messageCount: number,
    ) => {
        logHelpChatFailure('help_chat_session_persist_failed', error, {
            reason,
            mode: currentModeRef.current,
            messageCount,
            ...getBoundedHelpChatStringContext('sessionId', sessionId),
            ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
            ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
        });
    };

    // Handler: Create New Chat
    const handleNewChat = () => {
        setChatSessions(prev => prev.filter(session => session.id !== null));
        setActiveSessionId(undefined);
        setSearchQuery('');
        setCurrentMode('qna');
        dispatchChatState({ type: 'RESET' });
        sessionFailureCountRef.current = 0; // Reset escalation failure count for new session
    };

    // Handler: Select Existing Chat Session
    const handleSessionClick = (sessionId: string) => {
        const selectedSession = chatSessions.find(s => s.id === sessionId);
        if (selectedSession) {
            setActiveSessionId(sessionId);
            setCurrentMode(selectedSession.mode);
            setSearchQuery('');
        }
    };

    /**
     * Search Handler — calls the unified coreSearch pipeline via API
     */
    const performSearch = async (
        content: string,
        image: UserUploadedFileType | undefined,
        conversationHistory: ChatMessage[] | undefined,
        modeOverride?: ChatMode
    ): Promise<SearchAPIResponseType> => {
        const searchMode = modeOverride || currentModeRef.current;

        const result = await searchKnowledgeBase({
            query: content,
            mode: searchMode,
            conversationHistory,
            image,
            productContext,
            sessionFailureCount: sessionFailureCountRef.current,
        });

        // Track escalation suggestions for S3 repeated failure trigger
        if (result.escalation?.suggested) {
            sessionFailureCountRef.current++;
        }

        return result;
    };

    // Handler: Send Message
    // targetMode: Optional mode override to fix race condition with suggested questions
    const onSendMessage = async (content: string, image?: UserUploadedFileType, targetMode?: ChatMode) => {
        // AI Failure Escalation (Item #8) — S4: Detect explicit escalation intent BEFORE calling API
        // If user types "talk to human", "create ticket", etc., skip search and offer ticket creation
        if (content) {
            const { ESCALATION_INTENT_PATTERNS } = await import('@lib/answerlattice/escalationTypes');
            const isExplicitEscalation = ESCALATION_INTENT_PATTERNS.some(p => p.test(content));
            if (isExplicitEscalation) {
                // Build a synthetic escalation message and trigger ticket creation
                const syntheticMessage: ChatMessage = {
                    id: `msg-${Date.now()}-escalation`,
                    role: 'assistant',
                    createdOn: Timestamp.now(),
                        escalation: {
                            suggested: true,
                            type: 'hard',
                            triggers: ['explicit_user_request'],
                            context: {
                                triggerTypes: ['explicit_user_request'],
                                query: content,
                                conversationId: activeSession?.id || undefined,
                                productContext: productContext ? {
                                    contextKey: String(productContext.contextKey || ''),
                                    feature: String(productContext.feature || ''),
                                    page: String(productContext.page || ''),
                                    workflow: String(productContext.workflow || ''),
                                    plan: String(productContext.plan || ''),
                                    userRole: String(productContext.userRole || ''),
                                } : undefined,
                                escalatedAt: new Date().toISOString(),
                            },
                        },
                };
                handleEscalate(syntheticMessage);
                return;
            }
        }

        // 🔒 FIX: Prevent rapid sends while previous request is processing
        if (isProcessing()) {
            antMessage.warning('Please wait for the previous message to complete');
            return;
        }

        const requestId = `req-${Date.now()}`;

        // ✅ Use targetMode if provided (for suggested questions), otherwise use currentMode
        const effectiveMode = targetMode || currentModeRef.current;

        // 🔒 FIX: Queue the request to prevent race conditions
        enqueue({
            id: requestId,
            execute: async () => {
                // Upload image to storage if present and is base64
                let uploadedImage = image;
                if (image) {
                    // Pass full session for tenant/store-scoped storage path
                    uploadedImage = await uploadChatImage(image, loggedInSession);
                }

                const newUserMessage: ChatMessage = {
                    id: `msg-${Date.now()}-user`,
                    role: 'user',
                    content,
                    createdOn: Timestamp.now(),
                    image: uploadedImage || null
                };

                // Add user message immediately
                if (activeSession) {
                    setChatSessions(prev => prev.map(session => {
                        if (session.id === activeSession.id) {
                            return {
                                ...session,
                                messages: [...session.messages, newUserMessage],
                                modifiedOn: Timestamp.now()
                            };
                        }
                        return session;
                    }));
                } else {
                    // New session: create temporary session
                    // Truncate title to 150 chars (industry standard, prevents DB bloat from long pastes)
                    // Future: Replace with AI-generated title after first exchange
                    const tempSession: ChatSession = {
                        id: null,
                        title: content.slice(0, 150) + (content.length > 150 ? '...' : ''),
                        mode: effectiveMode, // ✅ Use effectiveMode instead of currentMode
                        messages: [newUserMessage],
                        createdOn: Timestamp.now(),
                        modifiedOn: Timestamp.now()
                    };
                    setChatSessions(prev => [tempSession, ...prev]);
                    setActiveSessionId(null);
                }

                setSearchQuery('');

                // Track query for smart context detection
                setQueryHistory(prev => {
                    const newHistory = [...prev, content.toLowerCase()].slice(-5);
                    const similarQueries = detectSimilarQueries(newHistory, content.toLowerCase());
                    if (similarQueries.length >= 2) {
                        // Smart context detected — similar questions pattern
                    }
                    return newHistory;
                });

                // Start loading
                dispatchChatState({ type: 'SEARCH_START', payload: { query: content } });

                try {
                    // ✅ Get conversation context for Assistant mode (use effectiveMode)
                    const conversationHistory = effectiveMode === 'assistant' && activeSession
                        ? activeSession.messages
                        : undefined;

                    // Call API via unified coreSearch pipeline
                    const result: SearchAPIResponseType = await performSearch(
                        content,
                        uploadedImage,
                        conversationHistory,
                        effectiveMode
                    );

                    // Create AI message
                    const aiMessage: ChatMessage = {
                        id: `msg-${Date.now()}-ai`,
                        role: 'assistant',
                        createdOn: Timestamp.now(),
                        craftedAnswer: result.craftedAnswer,
                        searchHistoryId: result.id,
                        references: result.references, // Includes similarityScore for quality calculation
                        answerSource: result.answerSource,
                        relatedContent: result.relatedContent,
                        suggestedQuestions: result.suggestedQuestions, // AI-generated follow-up questions
                        // AI Failure Escalation (Item #8) — attach escalation data to message
                        ...(result.escalation?.suggested && { escalation: result.escalation }),
                    };

                    if (activeSession) {
                        // Update existing session
                        setChatSessions(prev => prev.map(session => {
                            if (session.id === activeSession.id) {
                                // Safely add user message only if not already present (React state may or may not have flushed)
                                const hasUserMessage = session.messages.some(m => m.id === newUserMessage.id);
                                const updatedMessages = trimMessages(hasUserMessage
                                    ? [...session.messages, aiMessage]
                                    : [...session.messages, newUserMessage, aiMessage]);

                                // Persist to Firestore
                                if (activeSession.id) {
                                    const isModeTransition = activeSession.mode === 'qna' && effectiveMode === 'assistant';
                                    const updateData: any = {
                                        messages: updatedMessages,
                                        modifiedOn: Timestamp.now()
                                    };
                                    if (isModeTransition) {
                                        updateData.mode = 'assistant';
                                    }
                                    updateChatSession(activeSession.id, updateData).then((result) => {
                                        assertChatSessionUpdateSucceeded(
                                            result,
                                            activeSession.id,
                                            'help_chat_message_append_session_update_rejected',
                                        );
                                    }).catch((error) => {
                                        logChatSessionPersistFailure(
                                            error,
                                            isModeTransition ? 'message_append_mode_transition' : 'message_append',
                                            activeSession.id,
                                            updatedMessages.length
                                        );
                                    });
                                }

                                return {
                                    ...session,
                                    messages: updatedMessages,
                                    modifiedOn: Timestamp.now(),
                                    mode: activeSession.mode === 'qna' && effectiveMode === 'assistant' ? 'assistant' : session.mode
                                };
                            }
                            return session;
                        }));
                    } else {
                        // New session: save to Firestore
                        // Truncate title to 150 chars (industry standard, prevents DB bloat from long pastes)
                        // Future: Replace with AI-generated title after first exchange
                        const newSession: ChatSession = {
                            title: content.slice(0, 150) + (content.length > 150 ? '...' : ''),
                            mode: effectiveMode,
                            messages: [newUserMessage, aiMessage],
                            ...buildAnswerlatticeActorSnapshot(loggedInSession)
                        };

                        try {
                            const savedSession = await saveChatSession(newSession);
                            assertChatSessionSaveSucceeded(
                                savedSession,
                                'help_chat_new_session_save_rejected',
                            );
                            setChatSessions(prev => {
                                const withoutTemp = prev.filter(s => s.id !== null || s.messages.length > 1);
                                return [savedSession, ...withoutTemp];
                            });
                            setActiveSessionId(savedSession.id);
                        } catch (err) {
                            antMessage.error('Failed to save chat session');
                            setChatSessions(prev => prev.map((session, index) =>
                                index === 0 && session.id === null
                                    ? { ...session, messages: [newUserMessage, aiMessage] }
                                    : session
                            ));
                        }
                    }

                    // Clear draft after successful response
                    clearDraft(activeSessionId);

                    // Start typing animation
                    dispatchChatState({
                        type: 'SEARCH_SUCCESS',
                        payload: { messageId: aiMessage.id }
                    });

                } catch (error) {
                    logHelpChatFailure('help_chat_search_failed', error, {
                        mode: effectiveMode,
                        ...getBoundedHelpChatStringContext('query', content),
                        ...getBoundedHelpChatStringContext('activeSessionId', activeSessionId),
                        ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
                        ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
                    });
                    dispatchChatState({
                        type: 'SEARCH_ERROR',
                        payload: `${HELP_CHAT_SEARCH_FAILED_MESSAGE} You can still find answers in our documentation.`
                    });
                    antMessage.error('Search failed. Please try again.');
                }
            }
        });
    };

    // Handler: Retry search
    const onRetry = async (content: string, image?: UserUploadedFileType, retryReason: 'error' | 'regenerate' = 'error', replacedMessageId?: string) => {
        setSearchQuery('');
        dispatchChatState({ type: 'SEARCH_START', payload: { query: content } });

        try {
            const retryMode = currentModeRef.current;
            const conversationHistory = retryMode === 'assistant' && activeSession
                ? activeSession.messages
                : undefined;

            // Use performSearch via unified coreSearch pipeline
            const result = await performSearch(content, image, conversationHistory, retryMode);

            // Calculate retry attempt number
            const previousMessages = activeSession?.messages || [];
            const lastUserMessage = previousMessages.slice().reverse().find(m => m.role === 'user');
            const attemptNumber = lastUserMessage
                ? previousMessages.filter(m => m.role === 'assistant' && m.createdOn && lastUserMessage.createdOn && m.createdOn > lastUserMessage.createdOn).length + 1
                : 1;

            const aiMessage: ChatMessage = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                createdOn: Timestamp.now(),
                craftedAnswer: result.craftedAnswer,
                searchHistoryId: result.id,
                references: result.references, // Includes similarityScore for quality calculation
                answerSource: result.answerSource,
                relatedContent: result.relatedContent,
                suggestedQuestions: result.suggestedQuestions, // AI-generated follow-up questions
                generationMetadata: {
                    isRetry: true,
                    attempt: attemptNumber,
                    retryReason: retryReason,
                    previousMessageId: replacedMessageId || undefined
                }
            };

            if (activeSession) {
                // For regenerate: Remove the replaced message AND all messages after it (ChatGPT/Claude behavior)
                // This is because messages after the regenerated point are contextually invalid
                let baseMessages = activeSession.messages;

                if (replacedMessageId) {
                    const replacedIndex = activeSession.messages.findIndex(m => m.id === replacedMessageId);
                    if (replacedIndex !== -1) {
                        // Keep only messages up to (but not including) the replaced message
                        baseMessages = activeSession.messages.slice(0, replacedIndex);
                    }
                }

                const updatedSession = {
                    ...activeSession,
                    messages: trimMessages([...baseMessages, aiMessage])
                };

                setChatSessions(prev => prev.map(session =>
                    session.id === activeSession.id ? updatedSession : session
                ));

                if (activeSession.id) {
                    try {
                        const updateResult = await updateChatSession(activeSession.id, {
                            messages: updatedSession.messages
                        });
                        assertChatSessionUpdateSucceeded(
                            updateResult,
                            activeSession.id,
                            retryReason === 'regenerate'
                                ? 'help_chat_retry_regenerate_session_update_rejected'
                                : 'help_chat_retry_error_session_update_rejected',
                        );
                    } catch (error) {
                        logChatSessionPersistFailure(
                            error,
                            retryReason === 'regenerate' ? 'retry_regenerate_replace' : 'retry_error_replace',
                            activeSession.id,
                            updatedSession.messages.length
                        );
                    }
                }
            }

            clearDraft(activeSessionId);

            dispatchChatState({
                type: 'SEARCH_SUCCESS',
                payload: { messageId: aiMessage.id }
            });

        } catch (error) {
            logHelpChatFailure('help_chat_retry_failed', error, {
                mode: currentModeRef.current,
                retryReason,
                ...getBoundedHelpChatStringContext('query', content),
                ...getBoundedHelpChatStringContext('activeSessionId', activeSession?.id || activeSessionId),
                ...getBoundedHelpChatStringContext('replacedMessageId', replacedMessageId),
                ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
                ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
            });
            dispatchChatState({
                type: 'SEARCH_ERROR',
                payload: `${HELP_CHAT_SEARCH_FAILED_MESSAGE} You can still find answers in our documentation.`
            });
            antMessage.error('Search failed. Please try again.');
        }
    };

    // Handler: Mode Change
    const handleModeChange = (mode: ChatMode) => {
        const canChangeMode = !activeSession ||
            (activeSession.mode === 'qna') ||
            activeSession.messages.length === 0;

        if (canChangeMode) {
            setCurrentMode(mode);
        }
    };

    // Handler: Copy Message
    const handleCopy = async (messageId: string) => {
        const message = activeSession?.messages.find(m => m.id === messageId);
        if (message) {
            const textToCopy = message.craftedAnswer || message.content || '';
            try {
                await copyHelpChatMessageToClipboard(textToCopy);
                antMessage.success('Copied to clipboard');
            } catch (error) {
                logHelpChatFailure('help_chat_message_copy_failed', error, {
                    mode: currentModeRef.current,
                    messageRole: message.role,
                    hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                    hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                    hasCraftedAnswer: Boolean(message.craftedAnswer),
                    ...getBoundedHelpChatStringContext('messageId', messageId),
                    ...getBoundedHelpChatStringContext('activeSessionId', activeSession?.id || activeSessionId),
                    ...getBoundedHelpChatStringContext('copiedMessageText', textToCopy),
                    ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
                    ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
                });
                antMessage.error('Failed to copy');
            }
        }
    };

    // Handler: Regenerate Response
    const handleRegenerate = (messageId: string) => {
        const message = activeSession?.messages.find(m => m.id === messageId);
        if (message && message.role === 'assistant') {
            const messageIndex = activeSession.messages.findIndex(m => m.id === messageId);
            const previousUserMessage = activeSession.messages
                .slice(0, messageIndex)
                .reverse()
                .find(m => m.role === 'user');

            if (previousUserMessage) {
                // Don't remove message here - let onRetry handle it to avoid race condition
                // Just pass the messageId so onRetry can filter it out atomically
                onRetry(previousUserMessage.content, previousUserMessage.image, 'regenerate', messageId);
            }
        }
    };

    // Handler: Feedback Up
    const handleFeedbackUp = async (messageId: string) => {
        // 🔒 Prevent concurrent feedback submissions
        if (feedbackInProgressRef.current.has(messageId)) {
            logHelpChatFailure('help_chat_feedback_duplicate_ignored', undefined, {
                ...getBoundedHelpChatStringContext('messageId', messageId),
                ...getBoundedHelpChatStringContext('activeSessionId', activeSession?.id),
                feedbackInProgressCount: feedbackInProgressRef.current.size,
            });
            return;
        }

        const message = activeSession?.messages.find(m => m.id === messageId);
        if (message?.searchHistoryId && activeSession?.id) {
            feedbackInProgressRef.current.add(messageId);

            try {
                const feedbackData = { isGood: true, submittedAt: Timestamp.now() };

                // Update database first
                await submitSearchFeedback({
                    searchHistoryId: message.searchHistoryId,
                    sessionId: activeSession.id,
                    messageId: messageId,
                    isGood: true,
                    tId: loggedInSession?.tId,
                    sId: loggedInSession?.sId,
                });

                // Update UI state
                setMessageFeedback(prev => ({ ...prev, [messageId]: 'up' }));

                // Update local state atomically using prev callback
                setChatSessions(prev => prev.map(session => {
                    if (session.id === activeSession.id) {
                        return {
                            ...session,
                            messages: session.messages.map(msg =>
                                msg.id === messageId ? { ...msg, feedback: feedbackData } : msg
                            )
                        };
                    }
                    return session;
                }));

                antMessage.success('Thank you for your feedback!');
            } catch (error) {
                logHelpChatFailure('help_chat_feedback_up_submit_failed', error, {
                    ...getBoundedHelpChatStringContext('messageId', messageId),
                    ...getBoundedHelpChatStringContext('activeSessionId', activeSession.id),
                    ...getBoundedHelpChatStringContext('searchHistoryId', message.searchHistoryId),
                    ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
                    ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
                });
                antMessage.error('Failed to submit feedback');
            } finally {
                feedbackInProgressRef.current.delete(messageId);
            }
        }
    };

    // Handler: Feedback Down
    const handleFeedbackDown = (messageId: string) => {
        setFeedbackMessageId(messageId);
        setFeedbackModalVisible(true);
    };

    // Handler: Submit Detailed Feedback
    const handleFeedbackSubmit = async (values: { reasonsToImprove: string[], comments: string }, feedbackMessageId: string | null) => {
        if (!feedbackMessageId || !activeSession?.id) return;

        // 🔒 Prevent concurrent feedback submissions
        if (feedbackInProgressRef.current.has(feedbackMessageId)) {
            logHelpChatFailure('help_chat_feedback_duplicate_ignored', undefined, {
                ...getBoundedHelpChatStringContext('messageId', feedbackMessageId),
                ...getBoundedHelpChatStringContext('activeSessionId', activeSession.id),
                feedbackInProgressCount: feedbackInProgressRef.current.size,
            });
            return;
        }

        const message = activeSession.messages.find(m => m.id === feedbackMessageId);
        if (message?.searchHistoryId) {
            feedbackInProgressRef.current.add(feedbackMessageId);

            try {
                // Transform reasonsToImprove from string[] to {value, label}[]
                const transformedReasons = (values.reasonsToImprove || []).map(value => {
                    const option = feedbackOptions.find(opt => opt.value === value);
                    return { value, label: option?.label || value };
                });

                const feedbackData = {
                    isGood: false,
                    reasonsToImprove: transformedReasons,
                    comments: values.comments || '',
                    submittedAt: Timestamp.now()
                };

                // Update database first
                await submitSearchFeedback({
                    searchHistoryId: message.searchHistoryId,
                    sessionId: activeSession.id,
                    messageId: feedbackMessageId,
                    isGood: false,
                    reasonsToImprove: transformedReasons,
                    comments: values.comments || '',
                    tId: loggedInSession?.tId,
                    sId: loggedInSession?.sId,
                });

                // Update UI state
                setMessageFeedback(prev => ({ ...prev, [feedbackMessageId]: 'down' }));

                // Update local state atomically using prev callback
                setChatSessions(prev => prev.map(session => {
                    if (session.id === activeSession.id) {
                        return {
                            ...session,
                            messages: session.messages.map(msg =>
                                msg.id === feedbackMessageId ? { ...msg, feedback: feedbackData } : msg
                            )
                        };
                    }
                    return session;
                }));

                antMessage.success('Thank you for your feedback!');
            } catch (error) {
                logHelpChatFailure('help_chat_feedback_down_submit_failed', error, {
                    ...getBoundedHelpChatStringContext('messageId', feedbackMessageId),
                    ...getBoundedHelpChatStringContext('activeSessionId', activeSession.id),
                    ...getBoundedHelpChatStringContext('searchHistoryId', message.searchHistoryId),
                    ...getBoundedHelpChatStringContext('tenantId', loggedInSession?.tId),
                    ...getBoundedHelpChatStringContext('storeId', loggedInSession?.sId),
                    reasonCount: values.reasonsToImprove?.length || 0,
                    hasComments: Boolean(values.comments),
                });
                antMessage.error('Failed to submit feedback');
            } finally {
                feedbackInProgressRef.current.delete(feedbackMessageId);
            }
        }
    };

    // Handler: Rename Session
    const handleRenameSession = async (sessionId: string, newTitle: string) => {
        setChatSessions(prev => prev.map(session =>
            session.id === sessionId ? { ...session, title: newTitle } : session
        ));

        try {
            const updateResult = await updateChatSession(sessionId, { title: newTitle });
            assertChatSessionUpdateSucceeded(
                updateResult,
                sessionId,
                'help_chat_rename_session_update_rejected',
            );
            antMessage.success('Chat renamed');
        } catch (error) {
            antMessage.error('Failed to rename chat');
            const sessions = await getUserChatSessions(loggedInSession);
            setChatSessions(sessions || []);
        }
    };

    // Handler: Start Follow-up
    const handleStartFollowUp = () => {
        if (!activeSession) return;
        setCurrentMode('assistant');
    };

    // Handler: AI Failure Escalation — create support ticket from failed AI answer (Item #8)
    const handleEscalate = async (message: ChatMessage) => {
        if (!message.escalation?.context) return;

        try {
            const ticketsDal: typeof import('@database/tickets/index') = await import('@database/tickets/index');
            const { SUPPORT_TICKET_PRIORITY, SUPPORT_TICKET_CATEGORY } = await import('@type/supportTicket');

            const escalationContext = {
                ...message.escalation.context,
                conversationId: activeSession?.id || undefined,
            };

            const createdTicket = await ticketsDal.addTicket({
                subject: `AI couldn't help: ${escalationContext.query?.slice(0, 100) || 'Support needed'}`,
                category: SUPPORT_TICKET_CATEGORY.GENERAL_QUESTION,
                priority: SUPPORT_TICKET_PRIORITY.NORMAL,
                message: escalationContext.query || '',
                status: 'Open',
                documents: [],
                platformNotes: '',
                platformTags: [],
                contextKeys: message.relatedContent?.key ? [message.relatedContent.key] : [],
                statuses: [],
                source: 'ai_escalation',
                knowledgeCandidate: true,
                escalationContext,
                clientDetails: {
                    storeName: loggedInSession?.storeName || '',
                    tenantName: loggedInSession?.tenantName || '',
                    email: loggedInSession?.user?.email || '',
                    phone: '',
                },
            } as any);
            ticketsDal.assertSupportTicketCreateSucceeded(
                createdTicket,
                'help_chat_escalation_ticket_create_rejected',
            );

            antMessage.success('Support ticket created. Our team will get back to you soon.');
        } catch {
            antMessage.error('Failed to create support ticket. Please try again.');
        }
    };

    // Handler: Delete Session
    const handleDeleteSession = async (sessionId: string) => {
        const wasActiveSession = sessionId === activeSessionId;
        const previousActiveSessionId = activeSessionId;
        const previousSearchQuery = searchQuery;

        setChatSessions(prev => prev.filter(session => session.id !== sessionId));

        if (wasActiveSession) {
            setActiveSessionId(null);
            setSearchQuery('');
        }

        try {
            const deleteResult = await deleteChatSession(sessionId);
            assertChatSessionDeleteSucceeded(
                deleteResult,
                sessionId,
                'help_chat_session_delete_rejected',
            );
            antMessage.success('Chat deleted');
        } catch (error) {
            antMessage.error('Failed to delete chat');
            const sessions = await getUserChatSessions(loggedInSession);
            setChatSessions(sessions || []);
            if (wasActiveSession) {
                setActiveSessionId(previousActiveSessionId);
                setSearchQuery(previousSearchQuery);
            }
        }
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * DEV-ONLY HANDLER: Clear All Chat Data
     * ═══════════════════════════════════════════════════════════════════════
     * 
     * PURPOSE:
     * Provides a handler function to delete all chat-related data from 
     * Firestore during development/testing. This is passed to the 
     * DevOnlyClearDataButton component.
     * 
     * WHY IN useChatHandlers:
     * - Needs access to state setters (setChatSessions, setActiveSessionId, etc.)
     * - Follows consistent pattern with other handlers (handleDeleteSession, etc.)
     * - Centralizes business logic separate from UI components
     * 
     * WHAT IT DOES:
     * 1. Environment check (production safety)
     * 2. Calls database deletion function from devUtils
     * 3. Clears all local React state (sessions, active session, search)
     * 4. Shows success/error messages to user
     * 
     * COLLECTIONS DELETED:
     * - aiSearchHistory   - All AI search analytics
     * - chatSessions      - All chat conversations  
     * - queryEmbeddings   - All cached vector embeddings
     * 
     * SAFETY:
     * - Dynamic import: devUtils code is tree-shaken from production
     * - Environment check: Double verification before execution
     * - Called only from DevOnlyClearDataButton which is also dev-only
     * 
     * See also:
     * - /database/devUtils/index.ts - Database deletion logic
     * - /components/.../DevOnlyClearDataButton.tsx - UI component
     * ═══════════════════════════════════════════════════════════════════════
     */
    const handleClearAllData = async () => {
        // Double-check environment (defensive programming)
        if (process.env.NODE_ENV === 'production') {
            antMessage.error('This feature is disabled in production');
            return;
        }

        try {
            // Dynamic import: This code is removed from production bundle
            const { clearAllChatData } = await import('@database/devUtils');
            const result = await clearAllChatData();

            // Clear all local state after successful deletion
            setChatSessions([]);           // Clear all sessions
            setActiveSessionId(undefined); // Reset active session
            setSearchQuery('');            // Clear search input

            // Show success with count of deleted documents and images
            const message = result.imagesDeleted > 0
                ? `🗑️ Deleted ${result.totalDeleted} documents and ${result.imagesDeleted} images`
                : `🗑️ Deleted ${result.totalDeleted} documents`;
            antMessage.success(message);
        } catch (error) {
            antMessage.error('Failed to clear data');
        }
    };

    return {
        handleNewChat,
        handleSessionClick,
        onSendMessage,
        onRetry,
        handleModeChange,
        handleCopy,
        handleRegenerate,
        handleFeedbackUp,
        handleFeedbackDown,
        handleFeedbackSubmit,
        handleRenameSession,
        handleStartFollowUp,
        handleEscalate,
        handleDeleteSession,
        handleClearAllData
    };
}
