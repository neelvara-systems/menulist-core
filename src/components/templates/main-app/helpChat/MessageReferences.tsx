'use client'

import ArticleView from '@organisms/ArticleView';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { getArticleById } from '@database/knowledgeBase/articles';
import type { ChatReference } from '@type/chatSession';
import type { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Button, Card, Flex, Space, Tag, Tooltip, Typography, App, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { LuArrowRight, LuChevronDown, LuChevronUp, LuFileText, LuMaximize2 } from 'react-icons/lu';

const { Text } = Typography;

interface MessageReferencesProps {
    references: ChatReference[];
    onArticleModalOpen: (article: ChatReference | KnowledgeBaseArticleType) => void;
    showConfidenceScores?: boolean; // Admin-only feature
    isMobile?: boolean;
}

// Helper to get confidence level and color
const getConfidenceInfo = (score?: number) => {
    if (!score) return { label: 'N/A', color: 'default' };
    
    const percentage = Math.round(score * 100);
    
    if (score >= 0.8) return { label: `${percentage}% - Excellent`, color: 'success' };
    if (score >= 0.6) return { label: `${percentage}% - Good`, color: 'processing' };
    if (score >= 0.4) return { label: `${percentage}% - Fair`, color: 'warning' };
    return { label: `${percentage}% - Low`, color: 'error' };
};

const MessageReferences = ({ references, onArticleModalOpen, showConfidenceScores = false, isMobile = false }: MessageReferencesProps) => {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const cacheScopeKey = useAnswerlatticeCacheScope();
    const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
    const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);
    const [resolvedArticles, setResolvedArticles] = useState<Record<string, KnowledgeBaseArticleType>>({});
    const [resolvedArticlesScopeKey, setResolvedArticlesScopeKey] = useState<string | null>(null);
    const articleRequestRef = useRef(0);
    const currentScopeKeyRef = useRef(cacheScopeKey);
    currentScopeKeyRef.current = cacheScopeKey;
    const visibleResolvedArticles = resolvedArticlesScopeKey === cacheScopeKey ? resolvedArticles : {};

    if (!references || references.length === 0) {
        return null;
    }

    // Sort references by similarity score (highest first) for better admin UX
    const sortedReferences = [...references].sort((a, b) => {
        const scoreA = a.similarityScore || 0;
        const scoreB = b.similarityScore || 0;
        return scoreB - scoreA; // Descending order
    });

    const resolveFullArticle = async (
        reference: ChatReference,
    ): Promise<ChatReference | KnowledgeBaseArticleType | null> => {
        if (visibleResolvedArticles[reference.id]) return visibleResolvedArticles[reference.id];
        const requestScopeKey = cacheScopeKey;
        setLoadingArticleId(reference.id);
        try {
            const article = await getArticleById(reference.id);
            if (currentScopeKeyRef.current !== requestScopeKey) return null;
            if (!article) {
                messageApi.warning('This help article is no longer available.');
                return null;
            }
            setResolvedArticles((current) => (
                resolvedArticlesScopeKey === requestScopeKey ? { ...current, [reference.id]: article } : { [reference.id]: article }
            ));
            setResolvedArticlesScopeKey(requestScopeKey);
            return article;
        } catch {
            messageApi.error('Unable to load this help article.');
            return null;
        } finally {
            setLoadingArticleId((current) => current === reference.id ? null : current);
        }
    };

    const togglePreview = async (reference: ChatReference) => {
        const requestId = articleRequestRef.current + 1;
        articleRequestRef.current = requestId;
        if (expandedArticleId === reference.id) {
            setExpandedArticleId(null);
            return;
        }
        const article = await resolveFullArticle(reference);
        if (article && articleRequestRef.current === requestId) setExpandedArticleId(reference.id);
    };

    const openFullArticle = async (reference: ChatReference) => {
        const requestId = articleRequestRef.current + 1;
        articleRequestRef.current = requestId;
        const article = await resolveFullArticle(reference);
        if (article && articleRequestRef.current === requestId) onArticleModalOpen(article);
    };

    return (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${token.colorBorder}` }}>
            <Text strong style={{ fontSize: 11, color: token.colorTextSecondary, display: 'block', marginBottom: 12, letterSpacing: 0.5 }}>
                📚 HELPFUL RESOURCES
            </Text>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {sortedReferences.map((ref) => {
                    const isExpanded = expandedArticleId === ref.id;
                    const resolvedArticle = visibleResolvedArticles[ref.id];
                    const isLoading = loadingArticleId === ref.id;
                    return (
                        <motion.div
                            key={ref.id}
                            style={{ width: '100%' }}
                            whileHover={{ scale: 1.01 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Card
                                size="small"
                                style={{
                                    background: token.colorBgContainer,
                                    borderRadius: 12,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Flex gap={8} align={isMobile ? 'flex-start' : 'center'} justify="space-between">
                                    <Flex gap={8} align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                                        <LuFileText size={16} color={token.colorPrimary} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Flex align={isMobile ? 'flex-start' : 'center'} gap={8} vertical={isMobile}>
                                                <Text
                                                    strong
                                                    style={{
                                                        fontSize: 13,
                                                        cursor: 'pointer',
                                                        color: token.colorPrimary,
                                                        lineHeight: 1.35,
                                                    }}
                                                    onClick={() => void togglePreview(ref)}
                                                >
                                                    {ref.title}
                                                </Text>
                                                {/* Admin-only: Confidence Score Badge */}
                                                {showConfidenceScores && ref.similarityScore !== undefined && (
                                                    <Tooltip title={`Similarity score: ${(ref.similarityScore * 100).toFixed(1)}% match to query`}>
                                                        <Tag
                                                            color={getConfidenceInfo(ref.similarityScore).color}
                                                            style={{ 
                                                                margin: 0,
                                                                fontSize: 11,
                                                                padding: '0 6px',
                                                                lineHeight: '18px'
                                                            }}
                                                        >
                                                            {getConfidenceInfo(ref.similarityScore).label}
                                                        </Tag>
                                                    </Tooltip>
                                                )}
                                            </Flex>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {ref.categoryTitle}{ref.sectionTitle ? ` / ${ref.sectionTitle}` : ''}
                                            </Text>
                                        </div>
                                    </Flex>
                                    <Space size={4} direction={isMobile ? 'vertical' : 'horizontal'}>
                                        <Tooltip title="Quick preview">
                                            <Button
                                                aria-label={`${isExpanded ? 'Hide' : 'Preview'} ${ref.title}`}
                                                type="text"
                                                size="small"
                                                icon={
                                                    <motion.span
                                                        initial={false}
                                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                        style={{ display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        {isExpanded ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                                                    </motion.span>
                                                }
                                                loading={isLoading}
                                                onClick={() => void togglePreview(ref)}
                                                style={{ borderRadius: 8 }}
                                            >
                                                {isMobile ? null : (isExpanded ? 'Hide' : 'Preview')}
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="View full article">
                                            <Button
                                                aria-label={`View full article: ${ref.title}`}
                                                type="text"
                                                size="small"
                                                icon={<LuMaximize2 size={14} />}
                                                loading={isLoading}
                                                onClick={() => void openFullArticle(ref)}
                                                style={{ borderRadius: 8 }}
                                            />
                                        </Tooltip>
                                    </Space>
                                </Flex>
                            </Card>

                            {/* Expandable Article Preview — current article is loaded on demand. */}
                            <AnimatePresence mode="wait">
                                {isExpanded && resolvedArticle && (
                                    <motion.div
                                        key={`preview-${ref.id}`}
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{
                                            opacity: 1,
                                            height: 'auto',
                                            marginTop: 8,
                                            transition: {
                                                height: { duration: 0.3, ease: 'easeOut' },
                                                opacity: { duration: 0.2, delay: 0.1 }
                                            }
                                        }}
                                        exit={{
                                            opacity: 0,
                                            height: 0,
                                            marginTop: 0,
                                            transition: {
                                                height: { duration: 0.25, ease: 'easeIn' },
                                                opacity: { duration: 0.15 }
                                            }
                                        }}
                                        style={{
                                            overflow: 'hidden',
                                            padding: 2,
                                            backgroundColor: token.colorFillTertiary,
                                            borderRadius: 12,
                                            border: `1px solid ${token.colorBorderSecondary}`
                                        }}
                                    >
                                        <ArticleView
                                            article={resolvedArticle}
                                            mode="preview"
                                            showBreadcrumbs={false}
                                            showTags={false}
                                            showCopyLink={false}
                                            showMetadata={false}
                                            enableKeyboardShortcuts={false}
                                            showFeedback={false}
                                        />
                                        <div style={{ marginTop: 4, borderTop: `1px solid ${token.colorBorder}`, paddingTop: 12 }}>
                                            <Button
                                                icon={<LuArrowRight />}
                                                type="text"
                                                onClick={() => void openFullArticle(ref)}
                                                style={{ borderRadius: 8 }}
                                            >
                                                View full article
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </Space>
        </div>
    );
};

export default MessageReferences;
