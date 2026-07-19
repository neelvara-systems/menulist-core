'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveAnswerlatticeHelpChatDraftScope } from '@lib/answerlattice/helpChatDrafts';
import { Button, Drawer, Flex, Grid, Modal, Typography, theme } from 'antd';
import { useEffect, useReducer, useState } from 'react';
import { LuHistory, LuPlus, LuX } from 'react-icons/lu';
import ChatErrorBoundary from './ChatErrorBoundary';
import ChatHistory from './ChatHistory';
import ChatPanel from './ChatPanel';
import { chatReducer, initialChatState } from './chatState';
import FeedbackModal from './FeedbackModal';
import { useChatData } from './hooks/useChatData';
import { useChatHandlers } from './hooks/useChatHandlers';
import { ChatMode } from './types';

const { Text } = Typography;

interface HelpChatProps {
    open: boolean;
    onClose: () => void;
    productContext?: Record<string, any> | null;
}

function HelpChat({ open, onClose, productContext }: HelpChatProps) {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md === false || (typeof window !== 'undefined' && window.innerWidth < 768);

    // Auth session
    const loggedInSession = useClientAuthSession();
    const draftScope = resolveAnswerlatticeHelpChatDraftScope(loggedInSession);

    // State Management
    const [activeSessionId, setActiveSessionId] = useState<string | null | undefined>(undefined);
    const [currentMode, setCurrentMode] = useState<ChatMode>('qna');
    const [searchQuery, setSearchQuery] = useState('');
    const [queryHistory, setQueryHistory] = useState<string[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);

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
    });

    // Reset to new chat when modal closes
    useEffect(() => {
        if (!open) {
            setActiveSessionId(undefined);
            setSearchQuery('');
            setHistoryOpen(false);
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

    const handleMobileNewChat = () => {
        handlers.handleNewChat();
        setHistoryOpen(false);
    };

    const handleMobileSessionClick = (sessionId: string) => {
        handlers.handleSessionClick(sessionId);
        setHistoryOpen(false);
    };

    const chatHistoryNode = (
        <ChatHistory
            sessions={chatSessions.filter(s => s.id !== null)}
            activeSessionId={activeSessionId}
            onSessionClick={isMobile ? handleMobileSessionClick : handlers.handleSessionClick}
            onNewChat={isMobile ? handleMobileNewChat : handlers.handleNewChat}
            mode={currentMode}
            onModeChange={handlers.handleModeChange}
            hasMessages={activeSession?.messages.length > 0 || false}
            disableModeToggle={activeSession?.mode === 'assistant' && (activeSession?.messages.length > 0)}
            onRenameSession={handlers.handleRenameSession}
            onDeleteSession={handlers.handleDeleteSession}
            onClearAllData={handlers.handleClearAllData}
            isLoading={isLoadingSessions}
            searchQuery={searchQuery}
            isMobile={isMobile}
            isNewChat={isNewChat}
        />
    );

    const chatPanelNode = (
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
            draftScope={draftScope}
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
            onNewQuestion={isMobile ? handleMobileNewChat : handlers.handleNewChat}
            onEscalate={
                FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AI_ESCALATION
                    ? handlers.handleEscalate
                    : undefined
            }
            isMobile={isMobile}
        />
    );

    return (
        <Modal
            title={null}
            open={open}
            onCancel={onClose}
            footer={null}
            width={isMobile ? '100vw' : '92vw'}
            centered={!isMobile}
            aria-label="Help Assistant"
            aria-describedby="help-chat-description"
            style={{
                top: isMobile ? 0 : 30,
                maxWidth: isMobile ? 'none' : 1500,
                margin: isMobile ? 0 : undefined,
                paddingBottom: isMobile ? 0 : undefined
            }}
            styles={{
                body: {
                    height: isMobile ? '100dvh' : 'calc(90vh - 55px)',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: isMobile ? 0 : 20
                },
                content: {
                    borderRadius: isMobile ? 0 : 20,
                    padding: 0
                }
            }}
            closable={!isMobile}
            destroyOnHidden
            maskClosable={true}
            keyboard={true}
        >
            <ChatErrorBoundary onReset={onClose}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        height: '100%',
                        overflow: 'hidden',
                        background: token.colorBgLayout
                    }}
                >
                    {/* Screen reader description */}
                    <span id="help-chat-description" style={{ position: 'absolute', left: '-9999px' }}>
                        Help assistant for answering questions and providing guidance.
                        Use Tab to navigate, Enter to select, and Escape to close.
                    </span>

                    {isMobile ? (
                        <>
                            <Flex
                                align="center"
                                justify="space-between"
                                gap={8}
                                style={{
                                    height: 56,
                                    padding: '6px 10px',
                                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                    background: token.colorBgContainer,
                                    flexShrink: 0
                                }}
                            >
                                <Button
                                    icon={<LuHistory size={18} />}
                                    onClick={() => setHistoryOpen(true)}
                                    aria-label="Open chat history"
                                    style={{ height: 44, width: 44, minWidth: 44, borderRadius: 10, fontWeight: 600 }}
                                />

                                <Text strong style={{ fontSize: 15, textAlign: 'center', flex: 1 }}>
                                    Help Assistant
                                </Text>

                                <Flex gap={6} align="center">
                                    {!isNewChat && (
                                        <Button
                                            type="primary"
                                            icon={<LuPlus size={17} />}
                                            onClick={handleMobileNewChat}
                                            aria-label="Start new chat"
                                            style={{ height: 44, borderRadius: 10, fontWeight: 600 }}
                                        >
                                            New
                                        </Button>
                                    )}
                                    <Button
                                        type="text"
                                        icon={<LuX size={20} />}
                                        onClick={onClose}
                                        aria-label="Close assistant"
                                        style={{ height: 44, width: 44, minWidth: 44, borderRadius: 10 }}
                                    />
                                </Flex>
                            </Flex>

                            <div style={{ flex: 1, minHeight: 0 }}>
                                {chatPanelNode}
                            </div>

                            <Drawer
                                title="Chat history"
                                placement="left"
                                open={historyOpen}
                                onClose={() => setHistoryOpen(false)}
                                width="92vw"
                                zIndex={1100}
                                styles={{
                                    body: { padding: 0 },
                                    header: {
                                        minHeight: 56,
                                        padding: '12px 16px',
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`
                                    },
                                    content: {
                                        borderTopRightRadius: 16,
                                        borderBottomRightRadius: 16,
                                        overflow: 'hidden'
                                    }
                                }}
                            >
                                {chatHistoryNode}
                            </Drawer>
                        </>
                    ) : (
                        <>
                            {/* Left Sidebar - Chat History */}
                            <div style={{ width: 320, flexShrink: 0 }}>
                                {chatHistoryNode}
                            </div>

                            {/* Right Panel - Chat Interface */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {chatPanelNode}
                            </div>
                        </>
                    )}
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
