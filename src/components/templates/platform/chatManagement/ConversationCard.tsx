'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { ADMIN_PRIORITY_OPTIONS, ADMIN_STATUS_OPTIONS, ChatSession } from '@type/chatSession';
import { Card, Flex, Tag, Tooltip, Typography, theme } from 'antd';
import { memo } from 'react';
import { LuMessageSquare, LuSparkles, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';

const { Text } = Typography;

interface ConversationCardProps {
    session: ChatSession;
    isActive: boolean;
    onClick: (session: ChatSession) => void;
}

const ConversationCard = memo(({ session, isActive, onClick }: ConversationCardProps) => {
    const { token } = theme.useToken();

    // Calculate feedback stats
    const messages = session.messages || [];
    const positiveFeedback = messages.filter(msg => msg.feedback?.isGood === true).length;
    const negativeFeedback = messages.filter(msg => msg.feedback?.isGood === false).length;
    const hasFeedback = positiveFeedback > 0 || negativeFeedback > 0;

    // Get last message preview
    const lastMessage = messages[messages.length - 1];
    const preview = lastMessage?.role === 'user'
        ? lastMessage.content
        : lastMessage?.craftedAnswer;
    const previewText = preview ? preview.substring(0, 60) + (preview.length > 60 ? '...' : '') : '';

    return (
        <Card
            hoverable
            onClick={() => onClick(session)}
            style={{
                marginBottom: 6,
                cursor: 'pointer',
                border: `1px solid ${isActive ? token.colorPrimary : token.colorBorderSecondary}`,
                background: isActive ? token.colorPrimaryBg : token.colorBgContainer,
                transition: 'all 0.2s ease',
                borderRadius: 8
            }}
            styles={{ body: { padding: '12px 14px' } }}
        >
            <Flex gap={12} align="flex-start">
                {/* Avatar/Icon */}
                <div
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        // background: session.mode === 'qna'
                        //     ? `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorPrimaryBgHover})`
                        //     : `linear-gradient(135deg, ${token.colorInfoBg}, ${token.colorInfoBgHover})`,
                        // border: `1px solid ${session.mode === 'qna' ? token.colorPrimaryBorder : token.colorInfoBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        position: "absolute",
                        right: 6,
                        bottom: 6
                    }}
                >
                    {session.mode === 'qna'
                        ? <LuMessageSquare size={14} color={token.colorPrimary} />
                        : <LuSparkles size={14} color={token.colorInfo} />
                    }
                </div>

                {/* Content */}
                <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + Time */}
                    <Flex justify="space-between" align="flex-start" gap={8}>
                        <Tooltip title={session.title || 'Untitled Chat'} mouseEnterDelay={0.5}>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <Text
                                    strong
                                    ellipsis
                                    style={{
                                        fontSize: 14,
                                        lineHeight: '20px',
                                        color: isActive ? token.colorPrimary : token.colorText,
                                        display: 'block'
                                    }}
                                >
                                    {session.title || 'Untitled Chat'}
                                </Text>
                            </div>
                        </Tooltip>

                        {/* Time - Right aligned */}
                        {session.createdOn && (
                            <DateTimeDisplay
                                value={session.createdOn}
                                mode="fromnow"
                                style={{
                                    fontSize: 11,
                                    color: token.colorTextTertiary,
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap'
                                }}
                            />
                        )}
                    </Flex>

                    {/* User Name */}
                    <Text
                        type="secondary"
                        ellipsis
                        style={{ fontSize: 12, lineHeight: '18px' }}
                    >
                        {session.userName || `User ${session.uId}`}
                    </Text>

                    {/* Preview Text */}
                    {previewText && (
                        <Text
                            type="secondary"
                            ellipsis
                            style={{
                                fontSize: 12,
                                lineHeight: '18px',
                                color: token.colorTextTertiary
                            }}
                        >
                            {previewText}
                        </Text>
                    )}

                    {/* Admin Metadata: Status, Priority, Tags */}
                    {(session.adminStatus || session.priority || (session.adminTags && session.adminTags.length > 0)) && (
                        <Flex gap={4} wrap="wrap" style={{ marginTop: 4 }}>
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
                                    <Tag
                                        color={colorMap[session.adminStatus] || 'default'}
                                        style={{ margin: 0, fontSize: 10, padding: '0 4px', height: 18, lineHeight: '18px' }}
                                    >
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
                                    <Tag
                                        color={colorMap[session.priority] || 'default'}
                                        style={{ margin: 0, fontSize: 10, padding: '0 4px', height: 18, lineHeight: '18px' }}
                                    >
                                        {priorityOption?.label || session.priority}
                                    </Tag>
                                );
                            })()}

                            {/* Tags */}
                            {session.adminTags?.map(tag => (
                                <Tag
                                    key={tag}
                                    style={{ margin: 0, fontSize: 10, padding: '0 4px', height: 18, lineHeight: '18px' }}
                                >
                                    {tag}
                                </Tag>
                            ))}
                        </Flex>
                    )}

                    {/* Stats Row */}
                    <Flex gap={12} align="center" style={{ marginTop: 2 }}>
                        {/* Message Count */}
                        <Flex align="center" gap={4}>
                            <LuMessageSquare size={12} style={{ color: token.colorTextTertiary }} />
                            <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                {messages.length}
                            </Text>
                        </Flex>

                        {/* Feedback */}
                        {positiveFeedback > 0 && (
                            <Flex align="center" gap={4}>
                                <LuThumbsUp size={12} style={{ color: token.colorSuccess }} />
                                <Text style={{ fontSize: 11, color: token.colorSuccess }}>
                                    {positiveFeedback}
                                </Text>
                            </Flex>
                        )}
                        {negativeFeedback > 0 && (
                            <Flex align="center" gap={4}>
                                <LuThumbsDown size={12} style={{ color: token.colorError }} />
                                <Text style={{ fontSize: 11, color: token.colorError }}>
                                    {negativeFeedback}
                                </Text>
                            </Flex>
                        )}
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: re-render if session metadata changes
    return (
        prevProps.session.id === nextProps.session.id &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.session.adminStatus === nextProps.session.adminStatus &&
        prevProps.session.priority === nextProps.session.priority &&
        JSON.stringify(prevProps.session.adminTags) === JSON.stringify(nextProps.session.adminTags) &&
        prevProps.session.modifiedOn === nextProps.session.modifiedOn
    );
});

ConversationCard.displayName = 'ConversationCard';

export default ConversationCard;
