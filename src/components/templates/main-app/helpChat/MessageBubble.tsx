'use client'

import ChatHighlight from '@atoms/ChatHighlight';
import ArticleViewModal from '@organisms/ArticleViewModal';
import { helpCenterArticleRouting } from '@constant/navigations';
import { Button, Card, Flex, Image, Typography, message as antMessage, theme } from 'antd';
import { motion } from 'framer-motion';
import { memo, useEffect, useState } from 'react';
import { LuAlertCircle, LuBookOpen, LuCheckCircle, LuHelpCircle, LuFileText, LuReceipt, LuSparkles, LuUser } from 'react-icons/lu';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import MessageActions from './MessageActions';
import styles from './MessageBubble.module.scss';
import MessageReferences from './MessageReferences';
import { ChatMessage } from './types';
import { getBoundedHelpChatStringContext, logHelpChatFailure } from './helpChatDiagnostics';

const { Text, Paragraph } = Typography;

interface MessageBubbleProps {
    message: ChatMessage;
    onCopy?: () => void;
    onRegenerate?: () => void;
    onFeedback?: (type: 'up' | 'down') => void;
    isTyping?: boolean;
    onSkipTyping?: () => void;
    feedbackState?: 'up' | 'down' | null;
    searchQuery?: string;
    onEscalate?: () => void;
    isMobile?: boolean;
}

const MessageBubble = memo(({ message, onCopy, onRegenerate, onFeedback, isTyping, onSkipTyping, feedbackState, searchQuery, onEscalate, isMobile = false }: MessageBubbleProps) => {
    const { token } = theme.useToken();
    const [modal, setModal] = useState<{ active: boolean; article: any | null }>({ active: false, article: null });
    const [displayedText, setDisplayedText] = useState('');

    const isUser = message.role === 'user';
    // Use content for user messages, craftedAnswer for assistant messages
    const fullText = isUser ? message.content : message.craftedAnswer;
    const messageText = isTyping ? displayedText : fullText;
    const relatedContent = !isUser && !isTyping ? message.relatedContent : undefined;

    // Get best reference (highest similarity score) for source tag
    const bestReference = message.references && message.references.length > 0
        ? [...message.references].sort((a, b) => {
            const scoreA = a.similarityScore || 0;
            const scoreB = b.similarityScore || 0;
            return scoreB - scoreA; // Descending order
        })[0]
        : null;

    const handleArticleModalOpen = (article: any) => {
        setModal({ active: true, article });
    };

    const handleArticleModalClose = () => {
        setModal({ active: false, article: null });
    };

    const handleRelatedArticleOpen = (article: any) => {
        const articleId = typeof article?.id === 'string' ? article.id : '';
        if (!articleId) return;

        try {
            const opened = window.open(helpCenterArticleRouting(articleId), '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('help_chat_related_article_open_blocked');
            }
        } catch (error) {
            logHelpChatFailure('help_chat_related_article_open_failed', error, {
                isMobile,
                hasSearchQuery: Boolean(searchQuery),
                relatedArticleCount: relatedContent?.articles?.length || 0,
                ...getBoundedHelpChatStringContext('messageId', message.id),
                ...getBoundedHelpChatStringContext('articleId', article?.id),
                ...getBoundedHelpChatStringContext('articleTitle', article?.title),
                articleRoutePresent: true,
            });
            antMessage.error('Unable to open article');
        }
    };

    // Local typing animation effect (only runs when isTyping prop is true)
    useEffect(() => {
        if (isTyping && fullText) {
            setDisplayedText(''); // Reset
            let index = 0;

            const interval = setInterval(() => {
                if (index < fullText.length) {
                    setDisplayedText(fullText.slice(0, index + 1));
                    index++;
                } else {
                    clearInterval(interval);
                }
            }, 25); // 25ms per character (~40 chars/sec - comfortable reading speed)

            return () => clearInterval(interval);
        }
    }, [isTyping, fullText]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            role="article"
            aria-label={isUser ? 'Your message' : 'AI assistant response'}
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 16
            }}
        >
            <div style={{ maxWidth: isMobile ? '100%' : '80%', width: isMobile ? '100%' : undefined }}>
                <Flex gap={isMobile ? 6 : 8} align="flex-start" justify={isUser ? 'flex-end' : 'flex-start'}>
                    {!isUser && !isMobile && (
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorPrimaryBgHover})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: `0 4px 12px ${token.colorPrimary}30`
                            }}
                        >
                            <LuSparkles size={16} color={token.colorPrimaryActive} />
                            {/* <Text style={{ fontSize: 18 }}>✨</Text> */}
                        </div>
                    )}

                    <div style={{ flex: isMobile ? '0 1 auto' : 1, maxWidth: isMobile ? (isUser ? '88%' : '100%') : '100%', minWidth: 0 }}>
                        <Card
                            style={{
                                background: isUser ? token.colorPrimaryBg : token.colorBgElevated,
                                border: `1px solid ${isUser ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                borderRadius: 16,
                            }}
                            styles={{
                                body: {
                                    padding: isMobile ? 12 : 18
                                }
                            }}
                        >
                            {/* Article Source Tag - Shows BEST KB article AI used (highest similarity score) */}
                            {!isUser && bestReference && (
                                <Flex
                                    gap={8}
                                    align="center"
                                    style={{
                                        padding: '8px 12px',
                                        background: token.colorPrimaryBg,
                                        borderLeft: `3px solid ${token.colorPrimary}`,
                                        borderRadius: 6,
                                        marginBottom: 12,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => handleArticleModalOpen(bestReference)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = token.colorPrimaryBgHover;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = token.colorPrimaryBg;
                                    }}
                                >
                                    <LuFileText size={14} color={token.colorPrimary} />
                                    <Text ellipsis style={{ fontSize: 12, fontWeight: 500, color: token.colorPrimary, minWidth: 0 }}>
                                        Source: {bestReference.title || 'Knowledge Base Article'}
                                    </Text>
                                </Flex>
                            )}

                            {!isUser && message.answerSource === 'faq' && (
                                <Flex
                                    gap={6}
                                    align="center"
                                    style={{
                                        display: 'inline-flex',
                                        padding: '5px 9px',
                                        background: token.colorPrimaryBg,
                                        color: token.colorPrimary,
                                        border: `1px solid ${token.colorPrimaryBorder}`,
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 12,
                                    }}
                                >
                                    <LuCheckCircle size={13} />
                                    Owner answer
                                </Flex>
                            )}

                            {/* Image attachment (if present) */}
                            {message.image && (message.image.source || message.image.url) && (
                                <div style={{ marginBottom: messageText ? 12 : 0 }}>
                                    <Image
                                        src={message.image.source || message.image.url}
                                        alt={message.image.name || 'Uploaded image'}
                                        style={{
                                            width: '100%',
                                            maxWidth: isMobile ? '100%' : 300,
                                            borderRadius: 12,
                                            objectFit: 'cover'
                                        }}
                                    />
                                    {/* Show file name below image */}
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
                                        // User messages: plain text with highlighting (if search active)
                                        <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {searchQuery ? (
                                                <ChatHighlight text={messageText || ''} query={searchQuery} variant="primary" />
                                            ) : (
                                                messageText
                                            )}
                                        </Paragraph>
                                    ) : (
                                        // Assistant messages: Markdown rendering
                                        <div
                                            className={styles.aiAnswerContent}
                                            style={{
                                                // Pass theme colors as CSS variables for proper dark mode support
                                                ['--text-color' as any]: token.colorText,
                                                ['--text-secondary' as any]: token.colorTextSecondary,
                                                ['--heading-color' as any]: token.colorTextHeading,
                                                ['--code-bg' as any]: token.colorBgTextHover,
                                                ['--code-border' as any]: token.colorBorder,
                                                ['--code-text' as any]: token.colorErrorText,
                                                ['--link-color' as any]: token.colorLink,
                                                ['--link-hover' as any]: token.colorLinkHover,
                                                ['--blockquote-border' as any]: token.colorBorder,
                                                ['--table-border' as any]: token.colorBorder,
                                                ['--table-header-bg' as any]: token.colorBgTextHover
                                            }}
                                        >
                                            {isTyping ? (
                                                // During typing: render as plain text with cursor
                                                <>
                                                    <span style={{ whiteSpace: 'pre-wrap' }}>
                                                        {messageText}
                                                    </span>
                                                    <span
                                                        className={styles.blinkingCursor}
                                                        style={{ background: token.colorPrimary }}
                                                    />
                                                </>
                                            ) : (
                                                // After typing: render with Markdown
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeSanitize]}
                                                    components={{
                                                        // Open links in new tab
                                                        a: ({ node, ...props }) => (
                                                            <a {...props} target="_blank" rel="noopener noreferrer" />
                                                        ),
                                                    }}
                                                >
                                                    {messageText}
                                                </ReactMarkdown>
                                            )}
                                        </div>
                                    )}

                                    {/* Skip Typing Button */}
                                    {isTyping && onSkipTyping && (
                                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                                            <Button
                                                size="small"
                                                onClick={onSkipTyping}
                                                style={{ borderRadius: 8 }}
                                            >
                                                Skip
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* References Section with Expandable Preview */}
                            {!isUser && (
                                <MessageReferences
                                    references={message.references || []}
                                    onArticleModalOpen={handleArticleModalOpen}
                                    isMobile={isMobile}
                                />
                            )}

                            {!isUser && relatedContent && (
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: '10px 12px',
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 10,
                                        background: token.colorFillQuaternary,
                                    }}
                                >
                                    <Text strong style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                                        Related to {relatedContent.label}
                                    </Text>
                                    <Flex gap={6} wrap="wrap">
                                        {(relatedContent.articles || []).slice(0, isMobile ? 3 : 5).map(article => (
                                            <Button
                                                key={`article-${article.id}`}
                                                size="small"
                                                type="text"
                                                icon={<LuBookOpen size={13} />}
                                                onClick={() => handleRelatedArticleOpen(article)}
                                                style={{ maxWidth: isMobile ? '100%' : 240 }}
                                            >
                                                <Text ellipsis style={{ maxWidth: isMobile ? 220 : 180 }}>
                                                    {article.title}
                                                </Text>
                                            </Button>
                                        ))}
                                        {(relatedContent.faqs || []).slice(0, isMobile ? 3 : 5).map(faq => (
                                            <Button
                                                key={`faq-${faq.id}`}
                                                size="small"
                                                type="text"
                                                icon={<LuHelpCircle size={13} />}
                                                style={{ maxWidth: isMobile ? '100%' : 240 }}
                                            >
                                                <Text ellipsis style={{ maxWidth: isMobile ? 220 : 180 }}>
                                                    {faq.question}
                                                </Text>
                                            </Button>
                                        ))}
                                        {(relatedContent.changelogs || []).slice(0, 2).map(entry => (
                                            <Button
                                                key={`changelog-${entry.pageId}-${entry.id}`}
                                                size="small"
                                                type="text"
                                                icon={<LuReceipt size={13} />}
                                                style={{ maxWidth: isMobile ? '100%' : 240 }}
                                            >
                                                <Text ellipsis style={{ maxWidth: isMobile ? 220 : 180 }}>
                                                    {entry.title}
                                                </Text>
                                            </Button>
                                        ))}
                                    </Flex>
                                </div>
                            )}

                            {/* AI Failure Escalation — "Still need help?" button (Item #8) */}
                            {!isUser && !isTyping && message.escalation?.suggested && onEscalate && (
                                <Flex
                                    gap={8}
                                    align="center"
                                    style={{
                                        marginTop: 12,
                                        padding: '10px 14px',
                                        background: token.colorWarningBg,
                                        borderLeft: `3px solid ${token.colorWarning}`,
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onClick={onEscalate}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = token.colorWarningBgHover;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = token.colorWarningBg;
                                    }}
                                >
                                    <LuAlertCircle size={16} color={token.colorWarning} />
                                    <Text style={{ fontSize: 13, fontWeight: 500, color: token.colorWarning }}>
                                        Still need help? Create a support ticket
                                    </Text>
                                </Flex>
                            )}
                        </Card>

                        {/* Timestamp + Action Buttons */}
                        {!isTyping && (
                            <MessageActions
                                isUser={isUser}
                                createdOn={message.createdOn}
                                feedbackState={feedbackState}
                                onCopy={onCopy}
                                onRegenerate={onRegenerate}
                                onFeedback={onFeedback}
                            />
                        )}
                    </div>

                    {isUser && !isMobile && (
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

            {/* Article Modal - Reusable component with caching */}
            <ArticleViewModal
                open={modal.active}
                onClose={handleArticleModalClose}
                article={modal.article}
            />
        </motion.div>
    );
});

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
