'use client';

import ChatHighlight from '@atoms/ChatHighlight';
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import MessageReferences from '@template/main-app/helpChat/MessageReferences';
import { ChatMessage } from '@type/chatSession';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { calculateQualityFlags } from '@util/qualityMetrics';
import { Alert, message as antMessage, Button, Card, Flex, Image, Tag, theme, Tooltip, Typography } from 'antd';
import { motion } from 'framer-motion';
import { LuCopy, LuSparkles, LuThumbsDown, LuThumbsUp, LuUser } from 'react-icons/lu';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const { Text, Paragraph } = Typography;

const PLATFORM_CHAT_MESSAGE_COPY_CLIPBOARD_UNAVAILABLE = 'platform_chat_message_copy_clipboard_unavailable';
const PLATFORM_CHAT_MESSAGE_COPY_FALLBACK_FAILED = 'platform_chat_message_copy_fallback_failed';

const copyPlatformChatMessageToClipboard = async (text: string) => {
    await copyAnswerlatticeSupportTextToClipboard(text, {
        unavailable: PLATFORM_CHAT_MESSAGE_COPY_CLIPBOARD_UNAVAILABLE,
        fallbackFailed: PLATFORM_CHAT_MESSAGE_COPY_FALLBACK_FAILED,
    });
};

interface MessageBubbleProps {
    message: ChatMessage;
    index: number;
    allMessages: ChatMessage[];
    searchQuery?: string;
    onArticleModalOpen?: (article: any) => void;
}

/**
 * MessageBubble Component
 * Renders a single chat message with user/AI avatar, content, feedback, and references
 * Supports text highlighting for search functionality
 */
function MessageBubble({
    message,
    index,
    allMessages,
    searchQuery = '',
    onArticleModalOpen
}: MessageBubbleProps) {
    const { token } = theme.useToken();
    const isUser = message.role === 'user';
    const messageText = isUser ? message.content : message.craftedAnswer;

    const handleCopyMessage = async (text: string) => {
        try {
            await copyPlatformChatMessageToClipboard(text);
            antMessage.success('Copied to clipboard');
        } catch (error) {
            logRuntimeFailure('platform_chat_message_copy_failed', error, {
                surface: 'answerlattice_chat_management',
                role: message.role,
                textLength: text.length,
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                ...getBoundedRuntimeStringContext('messageId', message.id),
            });
            antMessage.error('Failed to copy');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 16
            }}
        >
            <div style={{ maxWidth: '80%' }}>
                <Flex gap={8} align="flex-start">
                    {/* AI Avatar */}
                    {!isUser && (
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${token.colorSuccessBg}, ${token.colorSuccessBgHover})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: `0 4px 12px ${token.colorSuccess}30`
                            }}
                        >
                            <LuSparkles size={16} color={token.colorSuccess} />
                        </div>
                    )}

                    <div style={{ flex: 1 }}>
                        <Card
                            style={{
                                background: isUser ? token.colorPrimaryBg : token.colorBgElevated,
                                border: `1px solid ${isUser ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                borderRadius: 16
                            }}
                            styles={{
                                body: {
                                    padding: 18
                                }
                            }}
                        >
                            {/* Quality Flags Alert - Admin Only (Calculated in Real-time) */}
                            {!isUser && (() => {
                                const qualityFlags = calculateQualityFlags(message.references);
                                if (!qualityFlags) return null;

                                return (
                                    <>
                                        {qualityFlags.veryLowConfidence && (
                                            <Alert
                                                type="error"
                                                message="Very Low Confidence Response"
                                                description={`All KB article matches scored below 40% similarity (avg: ${Math.round(qualityFlags.averageSimilarity * 100)}%). Consider creating a new knowledge base article for this topic.`}
                                                showIcon
                                                style={{ marginBottom: 12 }}
                                            />
                                        )}
                                        {!qualityFlags.veryLowConfidence && qualityFlags.lowConfidence && (
                                            <Alert
                                                type="warning"
                                                message="Low Confidence Response"
                                                description={`All KB article matches scored below 60% similarity (avg: ${Math.round(qualityFlags.averageSimilarity * 100)}%). Response quality may be suboptimal.`}
                                                showIcon
                                                style={{ marginBottom: 12 }}
                                            />
                                        )}
                                    </>
                                );
                            })()}

                            {/* Image attachment */}
                            {message.image && (message.image.source || message.image.url) && (
                                <div style={{ marginBottom: messageText ? 12 : 0 }}>
                                    <Image
                                        src={message.image.source || message.image.url}
                                        alt={message.image.name || 'Uploaded image'}
                                        style={{
                                            width: '100%',
                                            maxWidth: 300,
                                            borderRadius: 12,
                                            objectFit: 'cover'
                                        }}
                                    />
                                    {message.image.name && (
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                                            📎 {message.image.name}
                                        </Text>
                                    )}
                                </div>
                            )}

                            {/* Message text */}
                            {messageText && (
                                <>
                                    {isUser ? (
                                        // User messages: plain text with highlighting
                                        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {searchQuery ? (
                                                <ChatHighlight text={messageText || ''} query={searchQuery} variant="warning" />
                                            ) : (
                                                messageText
                                            )}
                                        </Paragraph>
                                    ) : (
                                        // AI messages: Markdown rendering with highlighting
                                        <div
                                            style={{
                                                fontSize: 14,
                                                lineHeight: 1.7,
                                                color: token.colorText
                                            }}
                                        >
                                            {searchQuery ? (
                                                // Show plain text with highlighting during search
                                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                                    <ChatHighlight text={messageText || ''} query={searchQuery} variant="warning" />
                                                </div>
                                            ) : (
                                                // Normal Markdown rendering
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeSanitize]}
                                                    components={{
                                                        a: ({ node, ...props }) => (
                                                            <a {...props} target="_blank" rel="noopener noreferrer" />
                                                        )
                                                    }}
                                                >
                                                    {messageText}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* KB References - Full article list with preview/modal */}
                            {!isUser && onArticleModalOpen && (
                                <MessageReferences
                                    references={message.references || []}
                                    onArticleModalOpen={onArticleModalOpen}
                                    showConfidenceScores={true} // Admin view: Show similarity scores
                                />
                            )}

                            {/* Customer Feedback (Read-only) */}
                            {message.feedback && (
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        backgroundColor: message.feedback.isGood ? token.colorSuccessBg : token.colorErrorBg,
                                        border: `1px solid ${message.feedback.isGood ? token.colorSuccessBorder : token.colorErrorBorder}`
                                    }}
                                >
                                    <Flex vertical gap={6}>
                                        <Flex justify="space-between" align="center">
                                            <Flex gap={6} align="center">
                                                {message.feedback.isGood ? (
                                                    <>
                                                        <LuThumbsUp size={14} color={token.colorSuccess} />
                                                        <Text strong style={{ fontSize: 12 }}>Helpful</Text>
                                                    </>
                                                ) : (
                                                    <>
                                                        <LuThumbsDown size={14} color={token.colorError} />
                                                        <Text strong style={{ fontSize: 12 }}>Not Helpful</Text>
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
                        </Card>

                        {/* Timestamp + Copy Button */}
                        <Flex justify="space-between" align="center" style={{ marginTop: 8 }}>
                            {message.createdOn && (
                                <DateTimeDisplay
                                    value={message.createdOn}
                                    mode="fromnow"
                                    style={{
                                        fontSize: 11,
                                        color: token.colorTextTertiary
                                    }}
                                />
                            )}
                            <Flex gap={4} align="center" style={{ marginLeft: 'auto' }}>
                                {message.generationMetadata?.isRetry && (
                                    <Tag color="warning" style={{ height: 18, fontSize: 10 }}>
                                        Regenerated
                                    </Tag>
                                )}
                                {/* Copy Button */}
                                <Tooltip title={isUser ? "Copy question" : "Copy answer"}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<LuCopy size={14} />}
                                        onClick={() => handleCopyMessage(messageText || '')}
                                        style={{ borderRadius: 8 }}
                                    />
                                </Tooltip>
                            </Flex>
                        </Flex>
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryBorderHover})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <LuUser size={16} color={token.colorTextBase} />
                        </div>
                    )}
                </Flex>
            </div>
        </motion.div>
    );
}

export default MessageBubble;
