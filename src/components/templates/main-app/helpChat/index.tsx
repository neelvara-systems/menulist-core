'use client'

import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Modal } from 'antd';
import { useEffect, useReducer, useState } from 'react';
import ChatErrorBoundary from './ChatErrorBoundary';
import ChatHistory from './ChatHistory';
import ChatPanel from './ChatPanel';
import { chatReducer, initialChatState } from './chatState';
import FeedbackModal from './FeedbackModal';
import { useChatData } from './hooks/useChatData';
import { useChatHandlers } from './hooks/useChatHandlers';
import { ChatMode } from './types';

interface HelpChatProps {
    open: boolean;
    onClose: () => void;
}

function HelpChat({ open, onClose }: HelpChatProps) {
    // Auth session
    const loggedInSession = useClientAuthSession();

    // State Management
    const [activeSessionId, setActiveSessionId] = useState<string | null | undefined>(undefined);
    const [currentMode, setCurrentMode] = useState<ChatMode>('qna');
    const [searchQuery, setSearchQuery] = useState('');
    const [queryHistory, setQueryHistory] = useState<string[]>([]);

    // Chat state for typing animation and loading
    const [chatState, dispatchChatState] = useReducer(chatReducer, initialChatState);

    // Feedback state
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
    const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down' | null>>({});

    // Custom hooks for data fetching
    const { chatSessions, setChatSessions, categoriesData, isLoadingSessions } = useChatData({ open, loggedInSession });

    // Get active session
    // Important: activeSessionId can be null (temp new chat), undefined (no selection), or string (existing session)
    const activeSession = activeSessionId === undefined
        ? undefined
        : chatSessions.find(s => s.id === activeSessionId);

    const isNewChat = !activeSession || activeSession.id === null;

    // Custom hooks for handlers
    const handlers = useChatHandlers({
        chatSessions,
        setChatSessions,
        activeSessionId,
        setActiveSessionId,
        activeSession,
        currentMode,
        setCurrentMode,
        setSearchQuery,
        dispatchChatState,
        loggedInSession,
        queryHistory,
        setQueryHistory,
        setMessageFeedback,
        setFeedbackMessageId,
        setFeedbackModalVisible
    });

    // Reset to new chat when modal closes
    useEffect(() => {
        if (!open) {
            setActiveSessionId(undefined);
            setSearchQuery('');
        }
    }, [open]);

    // Auto-complete typing when message is fully loaded
    useEffect(() => {
        if (chatState.status === 'typing' && chatState.typingMessageId) {
            const message = activeSession?.messages.find(m => m.id === chatState.typingMessageId);
            const fullAnswer = message?.craftedAnswer || message?.content || '';
            const typingDuration = fullAnswer.length * 25; // 25ms per character (matches MessageBubble speed)

            const timer = setTimeout(() => {
                dispatchChatState({ type: 'TYPING_COMPLETE' });
            }, typingDuration);

            return () => clearTimeout(timer);
        }
    }, [chatState.status, chatState.typingMessageId, activeSession?.messages]);

    // Handler to wrap feedback submit with feedbackMessageId
    const handleFeedbackSubmit = (values: { reasonsToImprove: any[], comments: string }) => {
        return handlers.handleFeedbackSubmit(values, feedbackMessageId);
    };

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            footer={null}
            width="92vw"
            centered
            aria-label="Help Assistant"
            aria-describedby="help-chat-description"
            style={{
                top: 30,
                maxWidth: 1500
            }}
            styles={{
                body: {
                    height: 'calc(90vh - 55px)',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: 20
                },
                content: {
                    borderRadius: 20
                }
            }}
            destroyOnHidden
            maskClosable={true}
            keyboard={true}
        >
            <ChatErrorBoundary onReset={onClose}>
                <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                    {/* Screen reader description */}
                    <span id="help-chat-description" style={{ position: 'absolute', left: '-9999px' }}>
                        Help assistant for answering questions and providing guidance.
                        Use Tab to navigate, Enter to select, and Escape to close.
                    </span>

                    {/* Left Sidebar - Chat History */}
                    <div style={{ width: 320, flexShrink: 0 }}>
                        <ChatHistory
                            sessions={chatSessions.filter(s => s.id !== null)}
                            activeSessionId={activeSessionId}
                            onSessionClick={handlers.handleSessionClick}
                            onNewChat={handlers.handleNewChat}
                            mode={currentMode}
                            onModeChange={handlers.handleModeChange}
                            hasMessages={activeSession?.messages.length > 0 || false}
                            disableModeToggle={activeSession?.mode === 'assistant' && (activeSession?.messages.length > 0)}
                            onRenameSession={handlers.handleRenameSession}
                            onDeleteSession={handlers.handleDeleteSession}
                            onClearAllData={handlers.handleClearAllData}
                            isLoading={isLoadingSessions}
                            searchQuery={searchQuery}
                        />
                    </div>

                    {/* Right Panel - Chat Interface */}
                    <div style={{ flex: 1 }}>
                        <ChatPanel
                            mode={currentMode}
                            messages={activeSession?.messages || []}
                            searchQuery={searchQuery}
                            categoriesData={categoriesData}
                            onSearchQueryChange={setSearchQuery}
                            onSendMessage={handlers.onSendMessage}
                            onRetry={(query) => handlers.onRetry(query)}
                            isNewChat={isNewChat}
                            sessionId={activeSessionId}
                            sessionTitle={activeSession?.title}
                            chatState={chatState}
                            onSkipTyping={() => dispatchChatState({ type: 'SKIP_TYPING' })}
                            onCopy={handlers.handleCopy}
                            onRegenerate={handlers.handleRegenerate}
                            onFeedback={(messageId, type) => {
                                if (type === 'up') {
                                    handlers.handleFeedbackUp(messageId);
                                } else {
                                    handlers.handleFeedbackDown(messageId);
                                }
                            }}
                            messageFeedback={messageFeedback}
                            showQnAActions={
                                currentMode === 'qna' &&
                                activeSession?.messages.length === 2 &&
                                activeSession?.messages[activeSession.messages.length - 1]?.role === 'assistant' &&
                                chatState.status !== 'loading' &&
                                chatState.status !== 'typing'
                            }
                            onStartFollowUp={handlers.handleStartFollowUp}
                            onNewQuestion={handlers.handleNewChat}
                            onEscalate={handlers.handleEscalate}
                        />
                    </div>
                </div>
            </ChatErrorBoundary>

            {/* Feedback Modal */}
            <FeedbackModal
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
                onSubmit={handleFeedbackSubmit}
            />
        </Modal>
    );
}

export default HelpChat;
