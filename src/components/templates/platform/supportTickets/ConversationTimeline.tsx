import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { addTicketMessage } from '@database/tickets';
import { useAppDispatch } from '@hook/useAppDispatch';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { SupportTicketType, TicketMessage } from '@type/supportTicket';
import { Button, Card, Flex, Form, Input, Typography, message as antdMessage, theme } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import React, { useEffect, useMemo, useRef } from 'react';
import { LuArrowRight, LuSend } from 'react-icons/lu';

const { Text, Paragraph } = Typography;

interface ConversationTimelineProps {
    ticket: SupportTicketType;
    onReply: (values: Partial<SupportTicketType>) => Promise<void>;
    onMessageAdded?: (updatedTicket: Partial<SupportTicketType>) => void;
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({ ticket, onReply, onMessageAdded }) => {
    const [form] = Form.useForm();
    const { data: session } = useSession();
    const { token } = theme.useToken();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();

    // Backwards compatibility: Use messages if available, otherwise convert statuses to messages
    const messages = useMemo<TicketMessage[]>(() => {
        if (ticket.messages && ticket.messages.length > 0) {
            return ticket.messages;
        }
        // Fallback: Convert old statuses with remarks to messages
        return ticket.statuses
            .filter(s => s.remark)
            .map(s => ({
                id: `${s.timestamp.seconds}-${s.createdBy.id}`,
                text: s.remark,
                sender: s.createdBy,
                timestamp: s.timestamp
            }));
    }, [ticket.messages, ticket.statuses]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + Enter to send
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                form.submit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form]);

    const handleReplySubmit = async (values: { replyMessage: string }) => {
        if (!session?.user) return;

        // Sanitize user input before storing
        const sanitizedMessage = sanitizeFeedbackComment(values.replyMessage, 1000);

        if (!sanitizedMessage) {
            return; // Don't submit empty messages
        }

        dispatch(startLoader('Sending message...'));
        try {
            // Create new message object
            const newMessage: TicketMessage = {
                id: `${Date.now()}-${session.user.id}`, // Generate unique ID
                text: sanitizedMessage,
                type: 'user', // Regular user message
                sender: {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                },
                timestamp: Timestamp.now(),
            };

            // Add message to ticket via DAL (writes messages ONLY - status is separate)
            await addTicketMessage(
                ticket.id,
                ticket.messages || [], // Pass existing messages (no DB read needed)
                newMessage
            );

            // Update local state only (no second DB write)
            const updatedMessages = [...(ticket.messages || []), newMessage];
            const updatedTicket: Partial<SupportTicketType> = {
                messages: updatedMessages
            };

            // Call message-specific handler (doesn't write to DB)
            if (onMessageAdded) {
                onMessageAdded(updatedTicket);
            }

            form.resetFields();
            antdMessage.success('Message sent successfully');
        } catch (error) {
            antdMessage.error('Failed to send message. Please try again.');
        } finally {
            dispatch(stopLoader('Sending message...'));
        }
    };

    return (
        <Flex vertical style={{ height: '100%', position: 'relative' }}>
            {/* Chat Messages - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
                {messages.length === 0 ? (
                    /* Empty State */
                    <Flex
                        vertical
                        align="center"
                        justify="center"
                        style={{ height: '100%', opacity: 0.5 }}
                        gap={8}
                    >
                        <Text type="secondary" style={{ fontSize: 16 }}>No messages yet</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>Start the conversation by sending a reply below</Text>
                    </Flex>
                ) : (
                    <Flex vertical gap={16}>
                        {messages.map((message, index) => {
                            // System messages (status changes) - centered and styled differently
                            // Default to 'user' type for backwards compatibility
                            const messageType = message.type || 'user';

                            if (messageType === 'system') {
                                return (
                                    <Flex
                                        key={index}
                                        justify="center"
                                        align="center"
                                        gap={8}
                                        style={{ margin: '8px 0' }}
                                    >
                                        <div
                                            style={{
                                                padding: '6px 16px',
                                                borderRadius: 16,
                                                backgroundColor: token.colorBgTextHover,
                                                border: `1px dashed ${token.colorBorder}`,
                                            }}
                                        >
                                            <Flex align="center" gap={8}>
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: 12,
                                                        fontStyle: 'italic'
                                                    }}
                                                >
                                                    {message.text}
                                                </Text>
                                                <DateTimeDisplay
                                                    style={{ fontSize: 10, color: token.colorTextTertiary }}
                                                    value={message.timestamp}
                                                    mode='datetime'
                                                />
                                            </Flex>
                                        </div>
                                    </Flex>
                                );
                            }

                            // Regular user messages
                            const isCurrentUser = session?.user?.id === message.sender.id;
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const prevMessageType = prevMessage?.type || 'user';
                            const isSameAuthor = prevMessage?.sender.id === message.sender.id && prevMessageType !== 'system';
                            const showHeader = !isSameAuthor; // Only show name/time if author changed

                            return (
                                <Flex
                                    key={index}
                                    justify={isCurrentUser ? 'flex-end' : 'flex-start'}
                                    gap={8}
                                >
                                    <Flex
                                        vertical
                                        gap={4}
                                        style={{
                                            maxWidth: '70%',
                                            alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        {showHeader && (
                                            <Flex align="center" gap={8}>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: 12,
                                                        color: token.colorTextSecondary
                                                    }}
                                                >
                                                    {isCurrentUser ? 'You' : message.sender.name}
                                                </Text>
                                                <DateTimeDisplay
                                                    style={{ fontSize: 11, color: token.colorTextTertiary }}
                                                    value={message.timestamp}
                                                    mode='datetime'
                                                />
                                            </Flex>
                                        )}
                                        <div
                                            style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: isCurrentUser ? token.colorPrimary : token.colorBgContainer,
                                                border: isCurrentUser ? 'none' : `1px solid ${token.colorBorder}`,
                                                maxWidth: '100%'
                                            }}
                                        >
                                            <Paragraph
                                                style={{
                                                    margin: 0,
                                                    whiteSpace: 'pre-wrap',
                                                    color: isCurrentUser ? token.colorBgBase : token.colorText,
                                                    fontSize: 14,
                                                    lineHeight: 1.6
                                                }}
                                            >
                                                {sanitizeFeedbackComment(message.text || '', 1000)}
                                            </Paragraph>
                                        </div>
                                    </Flex>
                                </Flex>
                            );
                        })}
                        {/* Auto-scroll anchor */}
                        <div ref={messagesEndRef} />
                    </Flex>
                )}
            </div>

            {/* Reply Form - Sticky at bottom */}
            <Card
                title={
                    <Flex align="center" gap={8}>
                        <LuArrowRight size={16} />
                        <Text strong>Add your reply</Text>
                    </Flex>
                }
                size="small"
                styles={{
                    body: { padding: 16 },
                    header: { borderBottom: `1px solid ${token.colorBorder}` }
                }}
                style={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    marginTop: 16,
                    borderRadius: 14
                }}
            >
                <Form form={form} onFinish={handleReplySubmit} layout="vertical">
                    <Form.Item
                        name="replyMessage"
                        rules={[{ required: true, message: 'Reply message cannot be empty.' }]}
                        style={{ marginBottom: 16 }}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder="Type your response here... (Ctrl+Enter to send)"
                            style={{ fontSize: 14, borderRadius: 8 }}
                        />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Press <Text keyboard>Ctrl</Text> + <Text keyboard>Enter</Text> to send
                            </Text>
                            <Button type="primary" htmlType="submit" icon={<LuSend />}>
                                Send Reply
                            </Button>
                        </Flex>
                    </Form.Item>
                </Form>
            </Card>
        </Flex>
    );
};

export default ConversationTimeline;
