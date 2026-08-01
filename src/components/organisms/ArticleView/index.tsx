/**
 * ArticleView - Unified component for displaying articles
 * 
 * Used in:
 * - KB Explorer (full page view)
 * - Modal view (with maxHeight)
 * - Landing page previews
 * 
 * Features:
 * - View tracking
 * - Metadata display (read time, views, updated)
 * - Feedback system (like/dislike)
 * - Copy link with keyboard shortcut
 * - Optional breadcrumbs and tags
 * - Responsive design
 */

'use client';

import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { getHelpCenterArticleRouteSegment, helpCenterArticleRouting, normalizeHelpCenterRouteSegment } from '@constant/navigations';
import { getTiptapExtensions } from '@config/tiptap';
import { updateContentFeedbackWithAudit } from '@database/contentFeedback';
import { useArticleViewTracking } from '@hook/useArticleViewTracking';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { useFeedback } from '@hook/useFeedback';
import { useKeyboardShortcuts } from '@hook/useKeyboardShortcuts';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { getStoredContentFeedback, removeStoredContentFeedback, storeContentFeedback } from '@lib/contentFeedbackStorage';
import { getReadingTime } from '@lib/readingTime';
import { secureError } from '@lib/security/secureLogger';
import { formatViewCountShort, getUserViewCount } from '@lib/viewCount';
import FeedbackSection from '@molecules/FeedbackSection';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Content } from '@tiptap/core';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { Badge, Breadcrumb, Button, Card, Divider, Flex, Grid, message, theme, Tooltip, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCalendar, LuCheck, LuClock, LuEye, LuFolderOpen, LuLink, LuTag } from 'react-icons/lu';

const { Title, Text } = Typography;

type ArticleViewLogContext = Record<string, boolean | number | string | null | undefined>;
const isEditorContent = (value: unknown): value is Content => (
    typeof value === 'string'
    || Array.isArray(value)
    || (Boolean(value) && typeof value === 'object')
);
const normalizeArticleEditorContent = (value: unknown): Content => (
    isEditorContent(value) ? value : ''
);
const ARTICLE_VIEW_LINK_COPY_DOCUMENT_UNAVAILABLE = 'article_view_link_copy_document_unavailable';
const ARTICLE_VIEW_LINK_COPY_FALLBACK_FAILED = 'article_view_link_copy_fallback_failed';

const getBoundedArticleViewStringContext = (
    label: string,
    value: unknown,
): ArticleViewLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getArticleViewErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getArticleViewErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getArticleViewErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const logArticleViewFailure = (
    failureCode: string,
    error?: unknown,
    context: ArticleViewLogContext = {},
): void => {
    secureError('[Article View] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getArticleViewErrorName(error),
        sourceErrorCode: getArticleViewErrorCode(error),
        sourceStatusCode: getArticleViewErrorStatus(error),
    });
};

const copyArticleLinkToClipboard = async (url: string): Promise<void> => {
    await copyAnswerlatticeSupportTextToClipboard(url, {
        unavailable: ARTICLE_VIEW_LINK_COPY_DOCUMENT_UNAVAILABLE,
        fallbackFailed: ARTICLE_VIEW_LINK_COPY_FALLBACK_FAILED,
    });
};

interface ArticleViewProps {
    article: AnswerlatticeReadableArticle;
    /**
     * View mode
     * - 'full': Full page view (KB Explorer)
     * - 'modal': Modal view with max height
     * - 'preview': Preview with breadcrumbs and tags
     */
    mode?: 'full' | 'modal' | 'preview';
    /**
     * Show breadcrumbs (typically for modal/preview)
     */
    showBreadcrumbs?: boolean;
    /**
     * Show tags (typically for modal/preview)
     */
    showTags?: boolean;
    /**
     * Show copy link button
     */
    showCopyLink?: boolean;
    /**
     * Enable keyboard shortcuts
     */
    enableKeyboardShortcuts?: boolean;
    /**
     * Custom max height (for modal view)
     */
    maxHeight?: string;
    /**
     * Disable view tracking (e.g., when viewing from Recently Viewed)
     */
    disableTracking?: boolean;
    /**
     * Show feedback section (likes/dislikes)
     */
    showFeedback?: boolean;
    /**
     * Show metadata (read time, view count, last updated)
     */
    showMetadata?: boolean;
}

const ArticleView: React.FC<ArticleViewProps> = ({
    article,
    mode = 'full',
    showBreadcrumbs = false,
    showTags = false,
    showCopyLink = true,
    enableKeyboardShortcuts = true,
    maxHeight,
    disableTracking = false,
    showFeedback = true,
    showMetadata = true
}) => {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const session = useClientAuthSession();
    const { user } = session || {};
    const recentlyViewedScope = resolveAnswerlatticeSessionScope(session);
    const [linkCopied, setLinkCopied] = useState(false);
    const isMobile = screens.md === false;

    // Track article view for analytics and recently viewed (disabled when viewing from Recently Viewed)
    const articleRouteSegment = useMemo(() => getHelpCenterArticleRouteSegment(article), [article.id, article.url, article.title]);

    useArticleViewTracking(disableTracking ? null : article, {
        href: helpCenterArticleRouting(articleRouteSegment),
    });

    // Memoize extensions to prevent infinite re-renders
    const extensions = useMemo(() => getTiptapExtensions({ isEditable: false, placeholder: 'Empty content' }), []);
    const editorContent = useMemo(() => normalizeArticleEditorContent(article.content), [article.content]);

    const editor = useEditor({
        editable: false,
        extensions,
        content: editorContent,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'rich-text-editor',
                style: `border:unset;`
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        editor.commands.setContent(editorContent, false);
    }, [editorContent, editor]);

    // Generate slug for anchor link
    const slug = normalizeHelpCenterRouteSegment(article.title);

    // Calculate metadata
    const readingTime = useMemo(() => getReadingTime(article.content), [article.content]);
    const viewCount = useMemo(() => {
        if (!user?.id || !recentlyViewedScope) return 0;
        return getUserViewCount(
            { tId: recentlyViewedScope.tenantId, sId: recentlyViewedScope.storeId },
            user.id,
            article.id,
            'article',
        );
    }, [article.id, recentlyViewedScope?.storeId, recentlyViewedScope?.tenantId, user?.id]);

    // Copy link to clipboard with visual feedback
    const handleCopyLink = useCallback(async () => {
        const url = `${window.location.origin}${helpCenterArticleRouting(articleRouteSegment)}`;
        try {
            await copyArticleLinkToClipboard(url);
            setLinkCopied(true);
            message.success('Link copied to clipboard!');
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            logArticleViewFailure('article_view_link_copy_failed', error, {
                ...getBoundedArticleViewStringContext('articleId', article.id),
                ...getBoundedArticleViewStringContext('articleRouteSegment', articleRouteSegment),
                ...getBoundedArticleViewStringContext('articleUrl', url),
                ...getBoundedArticleViewStringContext('mode', mode),
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                isMobile,
            });
            message.error('Failed to copy link. Please try again.');
        }
    }, [article.id, articleRouteSegment, isMobile, mode]);

    // Feedback functionality
    const feedback = useFeedback(
        {
            contentType: 'article',
            contentId: article.id,
            initialLikes: article.likes || 0,
            initialDislikes: article.dislikes || 0,
        },
        {
            updateFeedback: async (contentId, type, increment, _pageId, comment, action) => {
                return await updateContentFeedbackWithAudit({
                    type: 'article',
                    contentId,
                    sentiment: type,
                    increment,
                    comment,
                    action,
                });
            },
            storeFeedback: (scope, userId, contentId, type) => {
                storeContentFeedback('article', scope, userId, contentId, type);
            },
            getStoredFeedback: (scope, userId, contentId) => {
                return getStoredContentFeedback('article', scope, userId, contentId);
            },
            removeStoredFeedback: (scope, userId, contentId) => {
                removeStoredContentFeedback('article', scope, userId, contentId);
            },
        }
    );

    // Keyboard shortcuts (only if enabled)
    useKeyboardShortcuts(
        [
            {
                key: 'c',
                action: handleCopyLink,
                description: 'Copy article link'
            },
            {
                key: 'l',
                action: () => feedback.handleFeedback('like'),
                description: 'Like article'
            }
        ],
        enableKeyboardShortcuts
    );

    // Breadcrumbs (for modal/preview view)
    const breadcrumbItems = useMemo(() => {
        if (!showBreadcrumbs) return [];

        return [
            {
                title: (
                    <Flex align="center" gap={4}>
                        <LuFolderOpen size={14} />
                        <span>{article.categoryTitle}</span>
                    </Flex>
                ),
            },
            ...(article.sectionTitle ? [{
                title: article.sectionTitle,
            }] : []),
            {
                title: (
                    <Flex align="center" gap={4}>
                        <LuTag size={14} />
                        <span>{article.title}</span>
                    </Flex>
                ),
            },
        ];
    }, [showBreadcrumbs, article.categoryTitle, article.sectionTitle, article.title]);

    // Determine card styles based on mode
    const cardStyles = useMemo(() => {
        const baseStyles: React.CSSProperties = {
            marginBottom: 24,
            borderRadius: 8,
            border: `1px solid ${token.colorBorderSecondary}`,
        };

        if (mode === 'modal') {
            return {
                ...baseStyles,
                border: 'none',
                maxHeight: maxHeight || '75vh',
                overflowY: 'auto' as const,
                marginBottom: isMobile ? 0 : baseStyles.marginBottom,
            };
        }

        return {
            ...baseStyles,
            marginBottom: isMobile ? 12 : baseStyles.marginBottom,
        };
    }, [isMobile, mode, maxHeight, token.colorBorderSecondary]);

    // Memoize title style to prevent re-renders
    const titleStyle = useMemo(() => ({
        margin: 0,
        marginBottom: 0,
        flex: 1,
        fontSize: isMobile ? 18 : undefined,
        lineHeight: 1.3,
        minWidth: 0,
    }), [isMobile]);

    // Memoize header div style
    const headerDivStyle = useMemo(() => ({
        padding: isMobile ? 14 : 18,
        backgroundColor: mode === 'preview' ? token.colorFillQuaternary : 'transparent',
        borderRadius: mode === 'preview' ? token.borderRadiusLG : 0
    }), [isMobile, mode, token.colorFillQuaternary, token.borderRadiusLG]);

    // Memoize other inline styles
    const breadcrumbStyle = useMemo(() => ({ marginBottom: 16 }), []);
    const flexGapStyle = useMemo(() => ({ marginBottom: mode === 'preview' ? 6 : 12 }), [mode]);
    const contentPaddingStyle = useMemo(() => ({ padding: isMobile ? 14 : 24 }), [isMobile]);
    const dividerMarginStyle = useMemo(() => ({ margin: 0 }), []);

    return (
        <Card
            style={cardStyles}
            styles={{ body: { padding: 0 } }}
        >
            <Flex vertical>
                {/* Article Header with Metadata */}
                <div style={headerDivStyle}>
                    {/* Breadcrumbs (optional) */}
                    {showBreadcrumbs && breadcrumbItems.length > 0 && (
                        <Breadcrumb items={breadcrumbItems} separator="›" style={breadcrumbStyle} />
                    )}

                    {/* Title and Copy Link */}
                    <Flex justify="space-between" align="flex-start" gap={isMobile ? 8 : 16} style={flexGapStyle}>
                        <Title
                            level={mode === 'preview' ? 3 : 4}
                            id={slug}
                            style={titleStyle}
                            ellipsis={false}
                        >
                            {article.title}
                        </Title>

                        {/* Copy Link Button */}
                        {showCopyLink && (
                            <Tooltip title={linkCopied ? "Link copied!" : "Copy link to this article (press C)"}>
                                <Button
                                    type="text"
                                    icon={linkCopied ? <LuCheck size={16} /> : <LuLink size={16} />}
                                    onClick={handleCopyLink}
                                    style={{
                                        flexShrink: 0,
                                        color: linkCopied ? token.colorSuccess : token.colorTextSecondary,
                                    }}
                                    aria-label="Copy article link"
                                >
                                    {isMobile ? null : (linkCopied ? 'Copied!' : 'Copy Link')}
                                </Button>
                            </Tooltip>
                        )}
                    </Flex>

                    {/* Metadata Row */}
                    {showMetadata && (
                        <Flex align="center" gap={16} wrap style={{ marginBottom: showTags ? 16 : 0 }}>
                            {/* Read Time */}
                            <Flex align="center" gap={6}>
                                <LuClock size={14} style={{ color: token.colorTextSecondary }} />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {readingTime}
                                </Text>
                            </Flex>

                            {/* View Count */}
                            {viewCount > 0 && (
                                <Flex align="center" gap={6}>
                                    <LuEye size={14} style={{ color: token.colorTextSecondary }} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {formatViewCountShort(viewCount)} {viewCount === 1 ? 'view' : 'views'}
                                    </Text>
                                </Flex>
                            )}

                            {/* Last Updated */}
                            <Flex align="center" gap={6}>
                                <LuCalendar size={14} style={{ color: token.colorTextSecondary }} />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Last updated: <DateTimeDisplay value={article.modifiedOn} mode="date" />
                                </Text>
                            </Flex>
                        </Flex>
                    )}

                    {/* Tags (optional) */}
                    {showTags && article.tags && article.tags.length > 0 && (
                        <Flex align="center" gap={8} wrap>
                            <LuTag size={14} style={{ color: token.colorTextSecondary }} />
                            {article.tags.map((tag, idx) => (
                                <Badge
                                    key={idx}
                                    count={tag}
                                    showZero
                                    style={{
                                        backgroundColor: token.colorFillSecondary,
                                        color: token.colorText,
                                        fontSize: 11,
                                        fontWeight: 400
                                    }}
                                />
                            ))}
                        </Flex>
                    )}
                </div>

                <Divider style={dividerMarginStyle} />

                {/* Article Content */}
                <div style={contentPaddingStyle}>
                    <EditorContent editor={editor} />
                </div>

                {/* Feedback Section */}
                {showFeedback && (
                    <>
                        <Divider style={dividerMarginStyle} />
                        <FeedbackSection
                            likes={feedback.likes}
                            dislikes={feedback.dislikes}
                            feedbackGiven={feedback.feedbackGiven}
                            isFeedbackModalVisible={feedback.isFeedbackModalVisible}
                            isSubmitting={feedback.isSubmitting}
                            onFeedback={feedback.handleFeedback}
                            onFeedbackSubmit={feedback.handleFeedbackSubmit}
                            onModalClose={() => feedback.setIsFeedbackModalVisible(false)}
                            contentLabel="article"
                        />
                    </>
                )}
            </Flex>
        </Card>
    );
};

export default React.memo(ArticleView);
