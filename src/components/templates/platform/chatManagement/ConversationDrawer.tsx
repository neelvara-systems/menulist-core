'use client';

import DrawerElement from '@antdComponent/drawerElement';
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { updateSessionInternalNote } from '@database/chatSessions';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { ChatMessage, ChatSession } from '@type/chatSession';
import { Avatar, Button, Card, Descriptions, Divider, Flex, Input, message, Statistic, Tag, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuBot, LuDownload, LuMessageSquare, LuSave, LuSparkles, LuStickyNote, LuThumbsDown, LuThumbsUp, LuUser } from 'react-icons/lu';

const { Text, Paragraph, Title } = Typography;
const { TextArea } = Input;

interface ConversationDrawerProps {
    open: boolean;
    session: ChatSession | null;
    onClose: () => void;
}

function ConversationDrawer({ open, session, onClose }: ConversationDrawerProps) {
    const { token } = theme.useToken();
    const [internalNote, setInternalNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    // Initialize internal note when session changes
    useEffect(() => {
        if (session) {
            setInternalNote(session.internalNotes?.[0]?.content || '');
        } else {
            setInternalNote('');
        }
    }, [session]);

    const handleSaveNote = async () => {
        if (!session?.id) return;

        setSavingNote(true);
        try {
            await updateSessionInternalNote(session.id, internalNote);
            message.success('Internal note has been saved successfully');
        } catch (error) {
            message.error('Failed to save internal note. Please try again');
        } finally {
            setSavingNote(false);
        }
    };

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

        message.success('Conversation transcript has been downloaded');
    };

    const generateTranscript = (session: ChatSession): string => {
        const lines: string[] = [];
        const requester = getAnswerlatticeCustomerIdentity(session);
        lines.push(`# Chat Transcript - ${new Date().toLocaleDateString()}`);
        lines.push(`**Conversation ID:** ${session.id || 'N/A'}`);
        lines.push(`**User:** ${requester.displayName}`);
        if (requester.email) lines.push(`**Email:** ${requester.email}`);
        if (requester.phone) lines.push(`**Phone:** ${requester.phone}`);
        if (requester.origin || requester.path) lines.push(`**Location:** ${[requester.origin, requester.path].filter(Boolean).join(' · ')}`);
        if (requester.sessionId) lines.push(`**Widget Session:** ${requester.sessionId}`);
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
                    // Escape quotes for markdown
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

    const renderMessage = (message: ChatMessage, index: number, allMessages: ChatMessage[]) => {
        const isUser = message.role === 'user';
        const prevMessage = index > 0 ? allMessages[index - 1] : null;
        const isSameAuthor = prevMessage?.role === message.role;
        const showHeader = !isSameAuthor; // Only show avatar/name when author changes

        return (
            <Flex
                key={message.id}
                justify={isUser ? 'flex-end' : 'flex-start'}
                gap={8}
                style={{ marginBottom: isSameAuthor ? 6 : 16 }}
            >
                <Flex
                    vertical
                    gap={4}
                    style={{
                        maxWidth: '75%',
                        alignItems: isUser ? 'flex-end' : 'flex-start'
                    }}
                >
                    {/* Show header only when author changes */}
                    {showHeader && (
                        <Flex align="center" gap={8} style={{ paddingLeft: isUser ? 0 : 40 }}>
                            {!isUser && (
                                <Avatar
                                    size={32}
                                    icon={<LuBot />}
                                    style={{
                                        backgroundColor: token.colorSuccess
                                    }}
                                />
                            )}
                            <Text strong style={{ fontSize: 13, color: token.colorTextSecondary }}>
                                {isUser ? 'Customer' : 'AI Assistant'}
                            </Text>
                            {message.createdOn && (
                                <DateTimeDisplay
                                    value={message.createdOn}
                                    mode="fromnow"
                                    style={{ fontSize: 11, color: token.colorTextTertiary }}
                                />
                            )}
                            {message.generationMetadata?.isRetry && (
                                <Tag color="warning" style={{ height: 20, fontSize: 10 }}>
                                    Regenerated
                                </Tag>
                            )}
                        </Flex>
                    )}

                    {/* Message Bubble */}
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: isUser ? token.colorPrimary : token.colorBgContainer,
                            border: isUser ? 'none' : `1px solid ${token.colorBorder}`,
                            maxWidth: '100%'
                        }}
                    >
                        <Paragraph
                            style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                color: isUser ? token.colorBgBase : token.colorText,
                                fontSize: 14,
                                lineHeight: 1.6
                            }}
                        >
                            {message.content || message.craftedAnswer}
                        </Paragraph>

                        {/* Message Image */}
                        {message.image && (
                            <img
                                src={message.image.url || message.image.source}
                                alt="User uploaded"
                                style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8 }}
                            />
                        )}
                    </div>

                    {/* KB References - Compact */}
                    {message.references && message.references.length > 0 && (
                        <div
                            style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                backgroundColor: token.colorInfoBg,
                                border: `1px solid ${token.colorInfoBorder}`,
                                fontSize: 12
                            }}
                        >
                            <Flex align="center" gap={6}>
                                <span>📚</span>
                                <Text style={{ fontSize: 12, color: token.colorInfoText }}>
                                    Referenced {message.references.length} KB article{message.references.length > 1 ? 's' : ''}
                                </Text>
                            </Flex>
                        </div>
                    )}

                    {/* Suggested Questions - Compact */}
                    {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 4 }}>
                            {message.suggestedQuestions.slice(0, 3).map((q, i) => (
                                <Tag
                                    key={i}
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        fontSize: 11,
                                        cursor: 'default'
                                    }}
                                >
                                    💡 {q}
                                </Tag>
                            ))}
                        </Flex>
                    )}

                    {/* Feedback - Inline */}
                    {message.feedback && (
                        <div
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                backgroundColor: message.feedback.isGood ? token.colorSuccessBg : token.colorErrorBg,
                                border: `1px solid ${message.feedback.isGood ? token.colorSuccessBorder : token.colorErrorBorder}`,
                                marginTop: 4
                            }}
                        >
                            <Flex vertical gap={6}>
                                <Flex justify="space-between" align="center">
                                    <Flex gap={6} align="center">
                                        {message.feedback.isGood ? (
                                            <>
                                                <LuThumbsUp size={14} />
                                                <Text strong style={{ fontSize: 12 }}>Positive</Text>
                                            </>
                                        ) : (
                                            <>
                                                <LuThumbsDown size={14} />
                                                <Text strong style={{ fontSize: 12 }}>Negative</Text>
                                            </>
                                        )}
                                    </Flex>
                                    {message.feedback.submittedAt && (
                                        <DateTimeDisplay
                                            value={message.feedback.submittedAt}
                                            mode="fromnow"
                                            style={{ fontSize: 10, color: token.colorTextTertiary }}
                                        />
                                    )}
                                </Flex>
                                {message.feedback.comments && (
                                    <Text style={{ fontSize: 12, fontStyle: 'italic' }}>
                                        &ldquo;{message.feedback.comments}&rdquo;
                                    </Text>
                                )}
                                {message.feedback.reasonsToImprove && message.feedback.reasonsToImprove.length > 0 && (
                                    <Flex gap={4} wrap="wrap">
                                        {message.feedback.reasonsToImprove.map((reason: any, i: number) => (
                                            <Tag key={i} style={{ fontSize: 10, padding: '0 6px', height: 18 }}>
                                                {reason.label || reason}
                                            </Tag>
                                        ))}
                                    </Flex>
                                )}
                            </Flex>
                        </div>
                    )}
                </Flex>
            </Flex>
        );
    };

    if (!session) {
        return null;
    }

    const requester = getAnswerlatticeCustomerIdentity(session);
    const messages = session.messages || [];
    const contact = [requester.email, requester.phone].filter(Boolean).join(' · ') || 'No contact saved';
    const location = [requester.origin, requester.path].filter(Boolean).join(' · ');

    return (
        <DrawerElement
            open={open}
            onClose={onClose}
            title="Conversation Details"
            width={720}
            styles={{
                body: { paddingTop: 16 }
            }}
        >
            <Flex vertical gap={20}>
                {/* Conversation Header */}
                <Card>
                    <Flex justify="space-between" align="flex-start" style={{ marginBottom: 16 }}>
                        <div>
                            <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                                {session.title || 'Untitled Chat'}
                            </Title>
                            <Flex gap={8} wrap="wrap" style={{ marginTop: 8 }}>
                                <Tag
                                    icon={session.mode === 'qna' ? <LuMessageSquare size={12} /> : <LuSparkles size={12} />}
                                    color={session.mode === 'qna' ? 'blue' : 'cyan'}
                                >
                                    {session.mode === 'qna' ? 'QnA Mode' : 'Assistant Mode'}
                                </Tag>
                                <Tag icon={<LuUser size={12} />}>
                                    {requester.displayName}
                                </Tag>
                                {requester.email ? <Tag>{requester.email}</Tag> : null}
                            </Flex>
                        </div>
                        <Button
                            icon={<LuDownload />}
                            onClick={handleExportTranscript}
                        >
                            Export Transcript
                        </Button>
                    </Flex>

                    <Descriptions column={2} size="small" bordered>
                        <Descriptions.Item label="Customer">
                            {requester.displayName}
                        </Descriptions.Item>
                        <Descriptions.Item label="Contact">
                            {contact}
                        </Descriptions.Item>
                        {location ? (
                            <Descriptions.Item label="Where it happened" span={2}>
                                {location}
                            </Descriptions.Item>
                        ) : null}
                        {requester.sessionId ? (
                            <Descriptions.Item label="Widget Session" span={2}>
                                <Text code style={{ fontSize: 11 }}>{requester.sessionId}</Text>
                            </Descriptions.Item>
                        ) : null}
                        <Descriptions.Item label="Total Messages">
                            {messages.length}
                        </Descriptions.Item>
                        <Descriptions.Item label="Created">
                            <DateTimeDisplay value={session.createdOn} mode="fromnow" />
                        </Descriptions.Item>
                        <Descriptions.Item label="Last Updated">
                            <DateTimeDisplay value={session.modifiedOn} mode="fromnow" />
                        </Descriptions.Item>
                        <Descriptions.Item label="Conversation ID">
                            <Text code style={{ fontSize: 11 }}>{session.id}</Text>
                        </Descriptions.Item>
                    </Descriptions>

                    {/* Feedback Summary */}
                    {(() => {
                        const positive = messages.filter(m => m.feedback?.isGood === true).length;
                        const negative = messages.filter(m => m.feedback?.isGood === false).length;
                        const total = positive + negative;
                        if (total > 0) {
                            const satisfaction = Math.round((positive / total) * 100);
                            return (
                                <>
                                    <Divider style={{ margin: '16px 0' }} />
                                    <div>
                                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                                            Customer Satisfaction
                                        </Text>
                                        <Flex gap={24}>
                                            <Statistic
                                                title="Positive"
                                                value={positive}
                                                prefix={<LuThumbsUp />}
                                                valueStyle={{ color: token.colorSuccess, fontSize: 20 }}
                                            />
                                            <Statistic
                                                title="Negative"
                                                value={negative}
                                                prefix={<LuThumbsDown />}
                                                valueStyle={{ color: token.colorError, fontSize: 20 }}
                                            />
                                            <Statistic
                                                title="Satisfaction Rate"
                                                value={satisfaction}
                                                suffix="%"
                                                valueStyle={{
                                                    color: satisfaction >= 70 ? token.colorSuccess : satisfaction >= 40 ? token.colorWarning : token.colorError,
                                                    fontSize: 20
                                                }}
                                            />
                                        </Flex>
                                    </div>
                                </>
                            );
                        }
                        return null;
                    })()}
                </Card>

                {/* Messages Thread - Chat Style */}
                <Card
                    title={
                        <Flex justify="space-between" align="center">
                            <Text strong style={{ fontSize: 15 }}>
                                Conversation ({messages.length} messages)
                            </Text>
                        </Flex>
                    }
                    style={{ height: '500px', display: 'flex', flexDirection: 'column' }}
                    styles={{ body: { flex: 1, overflowY: 'auto', padding: 16 } }}
                >
                    <Flex vertical gap={0}>
                        {messages.map((msg, idx) => renderMessage(msg, idx, messages))}
                    </Flex>
                </Card>

                {/* Internal Notes Section */}
                <Card
                    title={
                        <Flex gap={8} align="center">
                            <LuStickyNote />
                            <Text strong>Internal Notes</Text>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                                (Team collaboration - not visible to users)
                            </Text>
                        </Flex>
                    }
                >
                    <Flex vertical gap={12}>
                        <TextArea
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            placeholder="Add notes about this conversation for your team..."
                            rows={4}
                            maxLength={1000}
                            showCount
                        />
                        <Flex justify="flex-end">
                            <Button
                                type="primary"
                                icon={<LuSave />}
                                onClick={handleSaveNote}
                                loading={savingNote}
                                disabled={internalNote === (session.internalNotes?.[0]?.content || '')}
                            >
                                Save Note
                            </Button>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </DrawerElement>
    );
}

export default ConversationDrawer;
