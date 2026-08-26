'use client'

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { ChatSession } from '@type/chatSession';
import { Button, Card, Dropdown, Flex, Input, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { LuMessageSquare, LuMoreVertical, LuPencil, LuSparkles, LuTrash2 } from 'react-icons/lu';

const { Text } = Typography;

interface SessionCardProps {
    session: ChatSession;
    isActive: boolean;
    isRenaming: boolean;
    renameValue: string;
    onSessionClick: (sessionId: string) => void;
    onRenameChange: (value: string) => void;
    onRenameSave: () => void;
    onRenameCancel: () => void;
    onRenameStart: () => void;
    onDeleteRequest: () => void;
}

/**
 * SessionCard Component
 * Displays individual chat session with rename/delete functionality
 */
const SessionCard = ({
    session,
    isActive,
    isRenaming,
    renameValue,
    onSessionClick,
    onRenameChange,
    onRenameSave,
    onRenameCancel,
    onRenameStart,
    onDeleteRequest
}: SessionCardProps) => {
    const { token } = theme.useToken();

    return (
        <motion.div
            role="listitem"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            <Card
                hoverable
                onClick={() => {
                    // Don't switch sessions while renaming
                    if (!isRenaming) {
                        onSessionClick(session.id!);
                    }
                }}
                role="button"
                aria-label={`Open chat: ${session.title}`}
                aria-current={isActive ? 'true' : 'false'}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // Don't switch sessions while renaming
                        if (!isRenaming) {
                            onSessionClick(session.id!);
                        }
                    }
                }}
                style={{
                    background: isActive ? token.colorPrimaryBg : token.colorBgElevated,
                    border: `1px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                    cursor: isRenaming ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: 12
                }}
                styles={{
                    body: {
                        padding: 14
                    }
                }}
            >
                <Flex vertical gap={8}>
                    {/* Title and Mode Tag */}
                    <Flex justify="space-between" align="flex-start" gap={8}>
                        {/* Rename Input or Title */}
                        {isRenaming ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.15 }}
                                style={{ flex: 1 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Flex vertical gap={4}>
                                    <Input
                                        value={renameValue}
                                        onChange={(e) => onRenameChange(e.target.value)}
                                        onPressEnter={onRenameSave}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                onRenameCancel();
                                            }
                                            e.stopPropagation();
                                        }}
                                        onBlur={onRenameSave}
                                        autoFocus
                                        size="small"
                                        placeholder="Enter chat title..."
                                        style={{ 
                                            fontSize: 13,
                                            boxShadow: `0 0 0 2px ${token.colorPrimaryBg}`,
                                            borderColor: token.colorPrimary
                                        }}
                                    />
                                    <Text 
                                        type="secondary" 
                                        style={{ 
                                            fontSize: 10, 
                                            lineHeight: 1,
                                            opacity: 0.7
                                        }}
                                    >
                                        ↵ Save · Esc Cancel
                                    </Text>
                                </Flex>
                            </motion.div>
                        ) : (
                            <Text
                                strong
                                ellipsis
                                style={{
                                    flex: 1,
                                    fontSize: 13,
                                    color: isActive ? token.colorPrimary : token.colorText
                                }}
                            >
                                {session.title}
                            </Text>
                        )}

                        {/* Mode Badge and Kebab Menu */}
                        <Flex gap={4} align="center">
                            {/* Mode Badge */}
                            <div
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: session.mode === 'qna' ? token.colorPrimaryBg : token.colorInfoBg,
                                    border: `1px solid ${session.mode === 'qna' ? token.colorPrimaryBorder : token.colorInfoBorder}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                {session.mode === 'qna'
                                    ? <LuMessageSquare size={12} color={token.colorPrimary} />
                                    : <LuSparkles size={12} color={token.colorInfo} />
                                }
                            </div>

                            {/* Kebab Menu */}
                            <Dropdown
                                menu={{
                                    items: [
                                        {
                                            key: 'rename',
                                            label: 'Rename',
                                            icon: <LuPencil size={14} />,
                                            onClick: onRenameStart
                                        },
                                        {
                                            type: 'divider'
                                        },
                                        {
                                            key: 'delete',
                                            label: 'Delete',
                                            icon: <LuTrash2 size={14} />,
                                            danger: true,
                                            onClick: onDeleteRequest
                                        }
                                    ]
                                }}
                                trigger={['click']}
                                placement="bottomRight"
                            >
                                <Button
                                    aria-label="Conversation actions"
                                    type="text"
                                    size="small"
                                    icon={<LuMoreVertical size={14} />}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: token.colorTextTertiary
                                    }}
                                />
                            </Dropdown>
                        </Flex>
                    </Flex>

                    {/* Message Count and Timestamp */}
                    <Flex justify="space-between" align="center">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {session.messages.length} {session.messages.length === 1 ? 'message' : 'messages'}
                        </Text>
                        <DateTimeDisplay
                            value={session.modifiedOn}
                            mode="fromnow"
                            style={{
                                fontSize: 11,
                                color: token.colorTextTertiary
                            }}
                        />
                    </Flex>
                </Flex>
            </Card>
        </motion.div>
    );
};

export default SessionCard;
