'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import ScrollToBottomButton, { useScrollToBottom } from '@atoms/ScrollToBottomButton/ScrollToBottomButton';
import ArticleViewModal from '@organisms/ArticleViewModal';
import { updateChatSession } from '@database/chatSessions';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { ChatSession, ADMIN_STATUS_OPTIONS, ADMIN_PRIORITY_OPTIONS } from '@type/chatSession';
import { Avatar, Button, Empty, Flex, Input, message, Popover, Tag, theme, Tooltip, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LuDownload, LuMessageSquare, LuPencil, LuSearch, LuSettings, LuSparkles, LuStickyNote, LuUser, LuX } from 'react-icons/lu';
import AdminMetadataPopover from './AdminMetadataPopover';
import MessageBubble from './MessageBubble';
import TeamNoteModal from './TeamNoteModal';

const { Text, Paragraph, Title } = Typography;

interface ConversationDetailProps {
    session: ChatSession | null;
    onNoteUpdate?: (sessionId: string, noteJson: any) => void;
    onSessionUpdate?: (sessionId: string, updates: Partial<ChatSession>) => void; // Callback to refresh session list
}

function ConversationDetail({ session, onNoteUpdate, onSessionUpdate }: ConversationDetailProps) {
    const { token } = theme.useToken();
    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [metadataPopoverOpen, setMetadataPopoverOpen] = useState(false);

    // Single metadata update handler (called from popover)
    const handleMetadataSave = async (updates: Partial<ChatSession>) => {
        if (!session?.id) return;
        try {
            // Single database call with all updates
            await updateChatSession(session.id, updates);
            onSessionUpdate?.(session.id, updates);
            message.success('Metadata updated', 2);
        } catch (error) {
            message.error('Failed to update metadata');
            throw error;
        }
    };

    // Article modal state
    const [articleModal, setArticleModal] = useState<{
        active: boolean;
        article: any | null;
    }>({ active: false, article: null });

    // Scroll-to-bottom functionality
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasMessages = session?.messages && session.messages.length > 0;
    const { showScrollButton, scrollToBottom } = useScrollToBottom({ 
        scrollContainerRef, 
        messagesEndRef, 
        hasMessages: !!hasMessages,
        sessionId: session?.id 
    });

    // In-conversation search
    const [conversationSearchQuery, setConversationSearchQuery] = useState('');
    const [showConversationSearch, setShowConversationSearch] = useState(false);

    // Initialize when session changes
    useEffect(() => {
        // Reset search when session changes
        setConversationSearchQuery('');
        setShowConversationSearch(false);
    }, [session?.id]);

    // Auto-scroll to bottom when session changes
    useEffect(() => {
        if (hasMessages && scrollContainerRef.current) {
            // Wait a bit for rendering to complete
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if (container) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [session?.id, hasMessages]);


    const handleExportTranscript = () => {
        if (!session) return;

        const transcript = generateTranscript(session);
        const blob = new Blob([transcript], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${session.id}-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        message.success('Chat conversation has been saved to your downloads folder');
    };

    const handleArticleModalOpen = (article: any) => {
        setArticleModal({ active: true, article });
    };

    const handleArticleModalClose = () => {
        setArticleModal({ active: false, article: null });
    };

    const handleSearchChange = (value: string) => {
        setConversationSearchQuery(value);
    };

    const closeSearch = () => {
        setShowConversationSearch(false);
        setConversationSearchQuery('');
    };

    const generateTranscript = (session: ChatSession): string => {
        const requester = getAnswerlatticeCustomerIdentity(session);
        const lines: string[] = [];
        lines.push(`# Chat Transcript - ${new Date().toLocaleDateString()}`);
        lines.push(`**Conversation ID:** ${session.id || 'N/A'}`);
        lines.push(`**User:** ${requester.displayName}`);
        if (requester.email) lines.push(`**Email:** ${requester.email}`);
        if (requester.phone) lines.push(`**Phone:** ${requester.phone}`);
        lines.push(`**Mode:** ${session.mode === 'qna' ? 'QnA' : 'Assistant'}`);
        lines.push(`**Created:** ${session.createdOn?.toDate().toLocaleString() || 'N/A'}`);

        // Calculate satisfaction (safe with optional chaining)
        const feedbackMessages = (session.messages || []).filter(m => m.feedback);
        const positive = feedbackMessages.filter(m => m.feedback?.isGood === true).length;
        const negative = feedbackMessages.filter(m => m.feedback?.isGood === false).length;
        if (feedbackMessages.length > 0) {
            lines.push(`**Satisfaction:** ${positive > negative ? '👍 Positive' : '👎 Negative'}`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');

        // Add messages (safe array handling)
        (session.messages || []).forEach((msg, idx) => {
            const timestamp = msg.createdOn?.toDate().toLocaleTimeString() || 'N/A';
            const role = msg.role === 'user' ? 'User' : 'AI Assistant';

            lines.push(`**${role} [${timestamp}]:**`);
            const content = msg.content || msg.craftedAnswer || '[No content]';
            lines.push(content);

            if (msg.feedback) {
                lines.push('');
                lines.push(`**Feedback:** ${msg.feedback.isGood ? '👍 Positive' : '👎 Negative'}`);
                if (msg.feedback.comments) {
                    lines.push(`**Comment:** "${msg.feedback.comments.replace(/"/g, '\\"')}"`);
                }
            }

            if (msg.references && msg.references.length > 0) {
                lines.push('');
                lines.push(`**KB References:** ${msg.references.length} article(s)`);
            }

            lines.push('');
        });

        if (session.internalNotes?.[0]?.content) {
            lines.push('---');
            lines.push('');
            lines.push('**Internal Note:**');
            lines.push(session.internalNotes[0].content);
        }

        return lines.join('\n');
    };

    if (!session) {
        return (
            <Flex
                vertical
                justify="center"
                align="center"
                style={{
                    height: '100%',
                    padding: 40
                }}
            >
                <Empty
                    description={
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 16 }}>
                                No conversation selected
                            </Text>
                            <Text type="secondary" style={{ fontSize: 14 }}>
                                Click on any conversation from the list to view the full chat history and details
                            </Text>
                        </div>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Flex>
        );
    }
    const requester = getAnswerlatticeCustomerIdentity(session);

    return (
        <Flex vertical style={{ height: '100%', overflow: 'hidden' }}>
            {/* Minimal Header */}
            <Flex
                justify="space-between"
                align="center"
                style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${token.colorBorder}`,
                    backgroundColor: token.colorBgContainer
                }}
            >
                <Flex align="center" gap={12}>
                    <Avatar size={40} icon={<LuUser />} style={{ backgroundColor: token.colorPrimary }} />
                    <Flex vertical gap={1}>
                        <Tooltip title={session.title || 'Untitled Conversation'} mouseEnterDelay={0.5}>
                            <div style={{ maxWidth: '400px', overflow: 'hidden' }}>
                                <Text
                                    strong
                                    ellipsis
                                    style={{
                                        fontSize: 16,
                                        lineHeight: 1.3,
                                        display: 'block'
                                    }}
                                >
                                    {session.title || 'Untitled Conversation'}
                                </Text>
                            </div>
                        </Tooltip>
                        <Flex gap={8} align="center">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {requester.displayName}
                            </Text>
                            {requester.email ? (
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    {requester.email}
                                </Text>
                            ) : null}
                            <Tag
                                icon={session.mode === 'qna' ? <LuMessageSquare size={10} /> : <LuSparkles size={10} />}
                                color={session.mode === 'qna' ? 'blue' : 'cyan'}
                                style={{ fontSize: 10, padding: '0 6px', height: 18, lineHeight: '18px', margin: 0 }}
                            >
                                {session.mode === 'qna' ? 'Quick Answer' : 'Chat'}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                <DateTimeDisplay value={session.modifiedOn} mode="fromnow" />
                            </Text>
                        </Flex>
                    </Flex>
                </Flex>
                <Flex gap={8} align="center">
                    {/* In-Conversation Search */}
                    <AnimatePresence mode="wait">
                        {showConversationSearch ? (
                            <motion.div
                                key="search-input"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 250, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                style={{ overflow: 'hidden' }}
                            >
                                <Flex gap={6}>
                                    <Input
                                        placeholder="Search in chat..."
                                        prefix={<LuSearch size={14} />}
                                        value={conversationSearchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onBlur={() => {
                                            if (!conversationSearchQuery.trim()) {
                                                closeSearch();
                                            }
                                        }}
                                        allowClear
                                        autoFocus
                                        size="small"
                                        style={{ borderRadius: 6 }}
                                    />
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<LuX size={14} />}
                                        onClick={closeSearch}
                                    />
                                </Flex>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="search-button"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<LuSearch size={16} />}
                                    onClick={() => setShowConversationSearch(true)}
                                    title="Search in conversation"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {(() => {
                        const positive = session.messages.filter(m => m.feedback?.isGood === true).length;
                        const negative = session.messages.filter(m => m.feedback?.isGood === false).length;
                        const total = positive + negative;
                        if (total > 0) {
                            const satisfaction = Math.round((positive / total) * 100);
                            return (
                                <Tooltip title={`${positive} helpful, ${negative} not helpful`}>
                                    <Tag
                                        color={satisfaction >= 70 ? 'success' : satisfaction >= 40 ? 'warning' : 'error'}
                                        style={{ margin: 0, cursor: 'default' }}
                                    >
                                        {satisfaction}% satisfied
                                    </Tag>
                                </Tooltip>
                            );
                        }
                        return null;
                    })()}
                    <Button
                        icon={<LuDownload />}
                        onClick={handleExportTranscript}
                        size="small"
                        title="Export transcript"
                    />
                </Flex>
            </Flex>

            {/* Admin Metadata Bar - Read-only display with Edit button */}
            <Flex
                gap={8}
                align="center"
                justify="space-between"
                style={{
                    padding: '8px 16px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    backgroundColor: token.colorBgLayout,
                    flexWrap: 'wrap'
                }}
            >
                {/* Current Metadata Badges (Read-only) */}
                <Flex gap={6} wrap="wrap" style={{ flex: 1 }}>
                    {/* Status Badge */}
                    {session.adminStatus && (() => {
                        const statusOption = ADMIN_STATUS_OPTIONS.find(opt => opt.value === session.adminStatus);
                        const colorMap = {
                            'new': 'blue',
                            'in_progress': 'orange',
                            'resolved': 'green',
                            'follow_up': 'purple',
                            'closed': 'default'
                        };
                        return (
                            <Tag color={colorMap[session.adminStatus] || 'default'} style={{ margin: 0 }}>
                                {statusOption?.label || session.adminStatus}
                            </Tag>
                        );
                    })()}

                    {/* Priority Badge */}
                    {session.priority && (() => {
                        const priorityOption = ADMIN_PRIORITY_OPTIONS.find(opt => opt.value === session.priority);
                        const colorMap = {
                            'high': 'red',
                            'normal': 'gold',
                            'low': 'green'
                        };
                        return (
                            <Tag color={colorMap[session.priority] || 'default'} style={{ margin: 0 }}>
                                {priorityOption?.label || session.priority}
                            </Tag>
                        );
                    })()}

                    {/* Tags */}
                    {session.adminTags?.map(tag => (
                        <Tag key={tag} style={{ margin: 0 }}>{tag}</Tag>
                    ))}

                    {/* No metadata set */}
                    {!session.adminStatus && !session.priority && (!session.adminTags || session.adminTags.length === 0) && (
                        <Text type="secondary" style={{ fontSize: 12 }}>No metadata set</Text>
                    )}
                </Flex>

                {/* Edit Button with Popover */}
                <Popover
                    open={metadataPopoverOpen}
                    onOpenChange={setMetadataPopoverOpen}
                    trigger="click"
                    placement="bottomRight"
                    content={
                        <AdminMetadataPopover
                            session={session}
                            onSave={handleMetadataSave}
                            onClose={() => setMetadataPopoverOpen(false)}
                        />
                    }
                >
                    <Button
                        size="small"
                        icon={<LuSettings size={14} />}
                        style={{ flexShrink: 0 }}
                    >
                        Edit
                    </Button>
                </Popover>
            </Flex>

            {/* Messages - Scrollable (Clean like reference) */}
            <div
                ref={scrollContainerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 16px 8px 16px',
                    backgroundColor: token.colorBgLayout,
                    position: 'relative'
                }}
            >
                <Flex vertical gap={0}>
                    {(() => {
                        // Filter messages based on search query
                        const filteredMessages = session.messages.filter((message) => {
                            if (!conversationSearchQuery) return true;

                            // Word-by-word matching
                            const queryWords = conversationSearchQuery.toLowerCase().split(' ').filter(Boolean);
                            const messageText = (message.content || message.craftedAnswer || '').toLowerCase();

                            // Match if ANY word from query is found in message
                            return queryWords.some(word => messageText.includes(word));
                        });

                        // Show empty state if search active and no results
                        if (conversationSearchQuery && filteredMessages.length === 0) {
                            return (
                                <Flex
                                    vertical
                                    justify="center"
                                    align="center"
                                    style={{
                                        height: '100%',
                                        minHeight: 300,
                                        padding: 40
                                    }}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Flex vertical align="center" gap={16}>
                                            <LuSearch size={48} color={token.colorTextTertiary} style={{ opacity: 0.5 }} />
                                            <div style={{ textAlign: 'center' }}>
                                                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                                                    No messages found
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 14 }}>
                                                    No messages match &quot;{conversationSearchQuery}&quot;
                                                </Text>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                onClick={closeSearch}
                                                style={{ marginTop: 8 }}
                                            >
                                                Clear search
                                            </Button>
                                        </Flex>
                                    </motion.div>
                                </Flex>
                            );
                        }

                        // Render filtered messages
                        return filteredMessages.map((msg, idx) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                index={idx}
                                allMessages={session.messages}
                                searchQuery={conversationSearchQuery}
                                onArticleModalOpen={handleArticleModalOpen}
                            />
                        ));
                    })()}
                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </Flex>

                {/* Scroll to Bottom Button */}
                <ScrollToBottomButton visible={showScrollButton} onClick={scrollToBottom} />
            </div>

            {/* Internal Notes - Admin Collaboration */}
            <Button
                icon={session.internalNotes?.[0] ? <LuPencil size={14} /> : <LuStickyNote size={14} />}
                onClick={() => setNoteModalVisible(true)}
                type={session.internalNotes?.[0] ? 'default' : 'dashed'}
                style={{ position: "absolute", bottom: 12, right: 12 }}
            >
                {session.internalNotes?.[0] ? 'Edit Internal Note' : 'Add Internal Note'}
            </Button>

            {/* Article Modal - For viewing full KB articles */}
            <ArticleViewModal
                open={articleModal.active}
                onClose={handleArticleModalClose}
                article={articleModal.article}
            />

            {/* Internal Notes Modal */}
            <TeamNoteModal
                open={noteModalVisible}
                onClose={() => setNoteModalVisible(false)}
                sessionId={session?.id || null}
                initialNote={session?.internalNotes?.[0]?.content}
                noteMetadata={{
                    lastEditedBy: session?.internalNotes?.[0]?.modifiedBy,
                    lastEditedByName: session?.internalNotes?.[0]?.modifiedByName,
                    lastEditedAt: session?.internalNotes?.[0]?.modifiedOn
                }}
                onSave={(noteJson) => {
                    if (session?.id && onNoteUpdate) {
                        onNoteUpdate(session.id, noteJson);
                    }
                }}
            />
        </Flex>
    );
}

export default ConversationDetail;
