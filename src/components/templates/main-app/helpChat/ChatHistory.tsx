'use client'

import { ChatMode, ChatSession } from '@type/chatSession';
import { Button, Card, Empty, Flex, Modal, Skeleton, Typography, theme } from 'antd';
import { useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import DevOnlyClearDataButton from './DevOnlyClearDataButton';
import ModeToggle from './ModeToggle';
import SessionCard from './SessionCard';

const { Text } = Typography;

interface ChatHistoryProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSessionClick: (sessionId: string) => void;
    onNewChat: () => void;
    mode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
    hasMessages: boolean;
    disableModeToggle?: boolean;
    onRenameSession?: (sessionId: string, newTitle: string) => void;
    onDeleteSession?: (sessionId: string) => void;
    onClearAllData?: () => void;
    isLoading?: boolean;
    searchQuery?: string; // Used to determine if New Chat button should be disabled
    isMobile?: boolean;
    isNewChat?: boolean;
}

const ChatHistory = ({ sessions, activeSessionId, onSessionClick, onNewChat, mode, onModeChange, hasMessages, disableModeToggle, onRenameSession, onDeleteSession, onClearAllData, isLoading = false, searchQuery = '', isMobile = false, isNewChat = false }: ChatHistoryProps) => {
    const { token } = theme.useToken();
    const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleRenameStart = (session: ChatSession) => {
        setRenamingSessionId(session.id);
        setRenameValue(session.title);
    };

    // Handle rename save
    const handleRenameSave = () => {
        if (renamingSessionId && renameValue.trim()) {
            onRenameSession?.(renamingSessionId, renameValue.trim());
        }
        setRenamingSessionId(null);
    };

    // Handle rename cancel
    const handleRenameCancel = () => {
        setRenamingSessionId(null);
        setRenameValue('');
    };

    // Handle delete
    const handleDelete = (sessionId: string) => {
        onDeleteSession?.(sessionId);
        setDeleteConfirmId(null);
    };

    return (
        <div
            role="navigation"
            aria-label="Chat history sidebar"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRight: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
                borderTopLeftRadius: isMobile ? 0 : 20,
                borderBottomLeftRadius: isMobile ? 0 : 20,
                overflow: 'hidden'
            }}
        >
            {/* Header with New Chat Button */}
            <div
                style={{
                    padding: isMobile ? 12 : 15,
                    borderBottom: `1px solid ${token.colorBorderSecondary}`
                }}
            >
                <Flex gap={8}>
                    {!isNewChat && (
                        <Button
                            // type="primary"
                            // ghost
                            icon={<LuPlus size={16} />}
                            onClick={onNewChat}
                            disabled={!isMobile && activeSessionId === null && !hasMessages && searchQuery.trim() === ''}
                            block
                            size="middle"
                            aria-label="Start new chat conversation"
                            style={{
                                height: isMobile ? 44 : 35,
                                fontWeight: 500,
                                borderRadius: isMobile ? 10 : 6,
                                fontSize: isMobile ? 15 : 14
                            }}
                        >
                            New Chat
                        </Button>
                    )}

                    {/**
                     * DEV-ONLY: Clear All Chat Data Button
                     * 
                     * Renders a button to delete all chat data from database.
                     * Extracted to separate component to:
                     * 1. Keep production code clean (tree-shaking removes this)
                     * 2. Better code organization (dev tools separated)
                     * 3. Clear documentation of dev-only features
                     * 
                     * See: DevOnlyClearDataButton.tsx for full documentation
                     */}
                    {process.env.NODE_ENV !== 'production' && sessions.length !== 0 && onClearAllData && (
                        <DevOnlyClearDataButton onClearAllData={onClearAllData} />
                    )}
                </Flex>
            </div>

            {/* Chat History List */}
            <div
                role="list"
                aria-label="Previous chat conversations"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: isMobile ? '10px 12px' : 12
                }}
            >
                {isLoading ? (
                    /* Loading Skeleton */
                    <Flex vertical gap={8}>
                        {[1, 2, 3].map((i) => (
                            <Card
                                key={i}
                                style={{
                                    background: token.colorBgElevated,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 12
                                }}
                                styles={{ body: { padding: 14 } }}
                            >
                                <Skeleton active paragraph={{ rows: 2 }} title={false} />
                            </Card>
                        ))}
                    </Flex>
                ) : sessions.length === 0 ? (
                    /* Empty State */
                    <Empty
                        description={
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                No conversations yet<br />
                                Start chatting to see your history
                            </Text>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginTop: 64 }}
                    />
                ) : (
                    /* Sessions List */
                    <Flex vertical gap={8}>
                        {sessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                isActive={session.id === activeSessionId}
                                isRenaming={session.id === renamingSessionId}
                                renameValue={renameValue}
                                onSessionClick={onSessionClick}
                                onRenameChange={setRenameValue}
                                onRenameSave={handleRenameSave}
                                onRenameCancel={handleRenameCancel}
                                onRenameStart={() => handleRenameStart(session)}
                                onDeleteRequest={() => setDeleteConfirmId(session.id)}
                            />
                        ))}
                    </Flex>
                )}
            </div>

            {/* Footer with Mode Toggle */}
            {!(isMobile && hasMessages) && (
                <div
                    role="toolbar"
                    aria-label="Chat mode selector"
                    style={{
                        padding: 12,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        background: token.colorBgContainer
                    }}
                >
                    <ModeToggle
                        value={mode}
                        onChange={onModeChange}
                        disabled={disableModeToggle || false}
                    />
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                title="Delete Chat?"
                open={deleteConfirmId !== null}
                onOk={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                onCancel={() => setDeleteConfirmId(null)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                centered
            >
                <Text>
                    Are you sure you want to delete this conversation? This action cannot be undone.
                </Text>
            </Modal>
        </div>
    );
};

export default ChatHistory;
