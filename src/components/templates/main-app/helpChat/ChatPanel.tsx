'use client'

import ScrollToBottomButton, { useScrollToBottom } from '@atoms/ScrollToBottomButton/ScrollToBottomButton';
import { UserUploadedFileType } from '@type/common';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ChatFooter from './ChatFooter';
import ConversationHeader from './ConversationHeader';
import ErrorMessage from './ErrorMessage';
import LocalSearchResults from './LocalSearchResults';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';
import { ChatState } from './chatState';
import { ChatMessage, ChatMode } from './types';

interface ChatPanelProps {
    mode: ChatMode;
    messages: ChatMessage[];
    searchQuery: string;
    categoriesData: KnowledgeBaseCategoriesType | null;
    onSearchQueryChange: (query: string) => void;
    onSendMessage: (message: string, image?: UserUploadedFileType, targetMode?: ChatMode) => void;
    onRetry?: (query: string, image?: UserUploadedFileType) => void;
    isNewChat: boolean;
    sessionId?: string | null;
    sessionTitle?: string;
    chatState?: ChatState;
    onSkipTyping?: () => void;
    onCopy?: (messageId: string) => void;
    onRegenerate?: (messageId: string) => void;
    onFeedback?: (messageId: string, type: 'up' | 'down') => void;
    messageFeedback?: Record<string, 'up' | 'down' | null>;
    // QnA Post-Answer Actions
    showQnAActions?: boolean;
    onStartFollowUp?: () => void;
    onNewQuestion?: () => void;
    // AI Failure Escalation (Item #8)
    onEscalate?: (message: ChatMessage) => void;
    isMobile?: boolean;
}

const ChatPanel = ({
    mode,
    messages,
    searchQuery,
    categoriesData,
    onSearchQueryChange,
    onSendMessage,
    onRetry,
    isNewChat,
    sessionId,
    sessionTitle,
    chatState,
    onSkipTyping,
    onCopy,
    onRegenerate,
    onFeedback,
    messageFeedback,
    showQnAActions,
    onStartFollowUp,
    onNewQuestion,
    onEscalate,
    isMobile = false
}: ChatPanelProps) => {
    const { token } = theme.useToken();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const hasMessages = messages.length > 0;

    // In-conversation search (managed by ConversationHeader)
    const [conversationSearchQuery, setConversationSearchQuery] = useState('');

    // Scroll-to-bottom functionality
    const { showScrollButton, scrollToBottom } = useScrollToBottom({ scrollContainerRef, messagesEndRef, hasMessages });
    const showLiveSearch = isNewChat && !hasMessages;

    // Auto-scroll to bottom when new messages arrive OR when switching sessions
    useEffect(() => {
        if (hasMessages && scrollContainerRef.current) {
            // Wait for AnimatePresence animation to complete (300ms transition)
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 350);
        }
    }, [messages, hasMessages, sessionId]);

    // Auto-scroll to show local search results when user types in conversation view
    useEffect(() => {
        if (hasMessages && searchQuery) {
            // Small delay to ensure DOM is updated with search results
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [searchQuery, hasMessages]);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: token.colorBgLayout,
                borderTopRightRadius: isMobile ? 0 : 20,
                borderBottomRightRadius: isMobile ? 0 : 20,
                overflow: 'hidden'
            }}
        >
            {/* Header with Chat Title and Mode Badge - Only show when there are messages */}
            {hasMessages && (
                <ConversationHeader
                    sessionTitle={sessionTitle}
                    firstMessageContent={messages[0]?.content}
                    mode={mode}
                    isMobile={isMobile}
                    onSearch={setConversationSearchQuery}
                />
            )}

            {/* Main Content Area */}
            <div
                role="main"
                aria-label="Chat conversation area"
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
            >
                <AnimatePresence mode="wait">
                    {showLiveSearch ? (
                        /* Pre-Conversation State: Welcome + Live Search */
                        <motion.div
                            key="welcome-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: isMobile ? '24px 14px' : '48px 24px'
                            }}
                        >
                            {/* Welcome Message - Ultra Clean Design */}
                            {!searchQuery && (
                                <WelcomeScreen onSendMessage={onSendMessage} isMobile={isMobile} />
                            )}

                            {/* Local Search Results */}
                            {searchQuery && (
                                <div style={{ width: '100%', maxWidth: 800 }}>
                                    <LocalSearchResults
                                        query={searchQuery}
                                        categoriesData={categoriesData}
                                    />
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* Conversation State: Chat Messages */
                        <motion.div
                            key="conversation-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                flex: 1,
                                padding: isMobile ? 12 : 24
                            }}
                        >
                            <MessageList
                                messages={messages}
                                conversationSearchQuery={conversationSearchQuery}
                                chatState={chatState}
                                messageFeedback={messageFeedback}
                                onCopy={onCopy}
                                onRegenerate={onRegenerate}
                                onFeedback={onFeedback}
                                onSkipTyping={onSkipTyping}
                                onSendMessage={onSendMessage}
                                mode={mode}
                                onStartFollowUp={onStartFollowUp}
                                onEscalate={onEscalate}
                                isMobile={isMobile}
                            />

                            {/* Local Search Results - Show while typing */}
                            {searchQuery && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ marginTop: 16 }}
                                >
                                    <LocalSearchResults
                                        query={searchQuery}
                                        categoriesData={categoriesData}
                                    />
                                </motion.div>
                            )}

                            {/* Loading Indicator */}
                            {chatState?.status === 'loading' && <TypingIndicator />}

                            {/* Error Message */}
                            {chatState?.status === 'error' && chatState.error && (
                                <ErrorMessage
                                    message={chatState.error}
                                    onRetry={() => {
                                        // Retry without adding duplicate user message
                                        if (chatState.lastQuery && onRetry) {
                                            onRetry(chatState.lastQuery);
                                        }
                                    }}
                                />
                            )}

                            <div ref={messagesEndRef} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scroll to Bottom Button */}
                <ScrollToBottomButton visible={showScrollButton && hasMessages} onClick={scrollToBottom} />
            </div>

            {/* Footer: Disclaimer + Chat Input */}
            <ChatFooter
                hasMessages={hasMessages}
                mode={mode}
                disabled={chatState?.status === 'loading' || chatState?.status === 'typing'}
                sessionId={sessionId}
                searchQuery={searchQuery}
                showQnAActions={showQnAActions}
                onSendMessage={onSendMessage}
                onSearchQueryChange={onSearchQueryChange}
                onStartFollowUp={onStartFollowUp}
                onNewQuestion={onNewQuestion}
                isMobile={isMobile}
            />
        </div>
    );
};

export default ChatPanel;
