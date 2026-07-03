'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { getHelpCenterArticleRouteSegment, helpCenterArticleRouting, helpCenterChangelogRouting, helpCenterTabRouting } from '@constant/navigations';
import FeedbackSection from '@molecules/FeedbackSection';
import { addContentFeedback, getContentFeedbackForEntry, type ContentFeedbackItem } from '@database/contentFeedback';
import { updateChangelogFeedbackGeneric } from '@database/feedback/genericFeedback';
import { useContentViewTracking } from '@hook/useContentViewTracking';
import { useFeedback } from '@hook/useFeedback';
import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import { getAnswerlatticeCustomerIdentity } from '@lib/answerlattice/customerIdentity';
import { renderPublicTiptapHtml } from '@lib/answerlattice/publicRichText';
import { getStoredContentFeedback, removeStoredContentFeedback, storeContentFeedback } from '@lib/contentFeedbackStorage';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import ArticleViewModal from '@organisms/ArticleViewModal';
import { ChangelogEntry } from '@type/changelog';
import { KnowledgeBaseArticleMeta } from '@type/knowledgeBase';
import { getYouTubeID } from '@util/utils';
import { Alert, Breadcrumb, Card, Flex, Grid, Image, List, Skeleton, Tag, Typography, theme } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import ChangelogTagRenderer from './ChangelogTagRenderer';

const { Title, Text } = Typography;
const { useToken } = theme;

interface ChangelogPreviewProps {
    item: ChangelogEntry;
    pageId?: string; // Required if showFeedback is true
    mode: 'modal' | 'inline';
    disableTracking?: boolean; // Disable view tracking when viewing from Recently Viewed
    showFeedbackDetails?: boolean;
}

const ChangelogPreview: React.FC<ChangelogPreviewProps> = ({ item, pageId, mode, disableTracking = false, showFeedbackDetails = false }) => {
    const { token } = useToken();
    const screens = Grid.useBreakpoint();
    const { categoriesData, getCategoriesCached } = useKBCategoriesCache();
    const [articleModal, setArticleModal] = useState<{ active: boolean; article: KnowledgeBaseArticleMeta | null }>({ active: false, article: null });
    const [feedbackEvents, setFeedbackEvents] = useState<ContentFeedbackItem[]>([]);
    const [feedbackEventsLoading, setFeedbackEventsLoading] = useState(false);
    const [feedbackEventsError, setFeedbackEventsError] = useState<string | null>(null);
    const isMobile = screens.md === false;

    useEffect(() => {
        if (!item.kbSources?.length) return;
        void getCategoriesCached().catch((error) => {
            logRuntimeFailure('answerlattice_changelog_preview_kb_categories_prefetch_failed', error, {
                ...getBoundedRuntimeStringContext('changelogEntryId', item.id),
                ...getBoundedRuntimeStringContext('changelogPageId', pageId),
            });
        });
    }, [getCategoriesCached, item.id, item.kbSources?.length, pageId]);

    useEffect(() => {
        if (!showFeedbackDetails || !item.id) return;
        let mounted = true;
        setFeedbackEventsLoading(true);
        setFeedbackEventsError(null);
        getContentFeedbackForEntry('changelog', item.id)
            .then((events) => {
                if (!mounted) return;
                setFeedbackEvents(events || []);
            })
            .catch(() => {
                if (!mounted) return;
                setFeedbackEventsError('Could not load reaction details.');
                setFeedbackEvents([]);
            })
            .finally(() => {
                if (!mounted) return;
                setFeedbackEventsLoading(false);
            });
        return () => { mounted = false; };
    }, [item.id, showFeedbackDetails]);

    // Track changelog view for analytics and recently viewed (disabled when viewing from Recently Viewed)
    useContentViewTracking(
        !disableTracking && item
            ? {
                  id: item.id,
                  type: 'changelog',
                  title: item.title,
                  href: helpCenterChangelogRouting(item.id),
                  meta: {
                      tags: item.tags,
                      version: item.version || null,
                      releasedOn: item.releasedOn || null,
                      fullEntry: item, // Store complete changelog entry
                      pageId: pageId || '', // Store pageId for feedback
                  },
              }
            : null
    );

    // Use generic feedback hook
    const feedback = useFeedback(
        {
            contentType: 'changelog',
            contentId: item.id,
            pageId: pageId,
            initialLikes: item.likes,
            initialDislikes: item.dislikes,
        },
        {
            updateFeedback: async (contentId, type, increment, pageId) => {
                if (!pageId) throw new Error('pageId required for changelog');
                return await updateChangelogFeedbackGeneric(pageId, contentId, type, increment);
            },
            storeFeedback: (userId, contentId, type) => {
                storeContentFeedback('changelog', userId, contentId, type);
            },
            getStoredFeedback: (userId, contentId) => {
                return getStoredContentFeedback('changelog', userId, contentId);
            },
            removeStoredFeedback: (userId, contentId) => {
                removeStoredContentFeedback('changelog', userId, contentId);
            },
            submitComment: addContentFeedback,
        }
    );

    // Memoize title style to prevent re-renders
    const titleStyle = useMemo(() => ({ margin: 0 }), []);

    const parsedDescription = useMemo(() => {
        const improvements: any[] = [];
        const bugfixes: any[] = [];
        let hasSections = false;
        let fullHtml = '';

        if (item.description && Array.isArray(item.description.content)) {
            let currentSection: 'improvements' | 'bugfixes' | null = null;

            item.description.content.forEach(node => {
                if (node.type === 'heading' && node.content) {
                    const text = String(node.content?.[0]?.text || '').toLowerCase();
                    if (text.includes('improvements') || text.includes('changes')) {
                        currentSection = 'improvements';
                        hasSections = true;
                    } else if (text.includes('bugfixes')) {
                        currentSection = 'bugfixes';
                        hasSections = true;
                    }
                } else if (node.type === 'bulletList' && currentSection) {
                    const listItems = node.content?.map(listItemNode => {
                        const paragraphNode = listItemNode.content?.[0];
                        if (paragraphNode?.content) {
                            return renderPublicTiptapHtml({ type: 'doc', content: paragraphNode.content });
                        }
                        return '';
                    }).filter(Boolean);

                    if (listItems) {
                        if (currentSection === 'improvements') {
                            improvements.push(...listItems);
                        } else {
                            bugfixes.push(...listItems);
                        }
                    }
                }
            });
        }

        // Fallback for descriptions that don't follow the section structure
        if (!hasSections && item.description) {
            fullHtml = renderPublicTiptapHtml(item.description);
        }

        return { improvements, bugfixes, fullHtml };
    }, [item.description]);

    return (
        <Card
            style={{
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden',
            }}
            styles={{ body: { padding: 16 } }}
        >
            <style jsx global>{`
                .changelog-rich-text {
                    color: ${token.colorText};
                }
                .changelog-rich-text p,
                .changelog-rich-text li {
                    line-height: 1.7;
                }
                .changelog-rich-text blockquote {
                    background: ${token.colorFillAlter};
                    border-left: 3px solid ${token.colorPrimary};
                    color: ${token.colorTextSecondary};
                    margin: 16px 0;
                    padding: 8px 12px;
                }
                .changelog-rich-text code {
                    background: ${token.colorFillSecondary};
                    border-radius: 4px;
                    padding: 2px 5px;
                }
                .changelog-rich-text pre {
                    background: #111827;
                    border-radius: 8px;
                    color: #f9fafb;
                    overflow-x: auto;
                    padding: 12px;
                }
                .changelog-rich-text pre code {
                    background: transparent;
                    color: inherit;
                    padding: 0;
                }
                .changelog-rich-text img {
                    border-radius: 8px;
                    display: block;
                    height: auto;
                    margin: 16px auto;
                    max-width: 100%;
                }
                .changelog-rich-text table {
                    border-collapse: collapse;
                    display: block;
                    overflow-x: auto;
                    width: 100%;
                }
                .changelog-rich-text td,
                .changelog-rich-text th {
                    border: 1px solid ${token.colorBorderSecondary};
                    padding: 8px 10px;
                }
                .changelog-rich-text ul[data-type="taskList"] {
                    list-style: none;
                    padding-left: 0;
                }
                .changelog-rich-text li[data-checked] {
                    align-items: flex-start;
                    display: flex;
                    gap: 8px;
                }
                .changelog-rich-text li[data-checked] input {
                    margin-top: 6px;
                }
            `}</style>
            <div style={{ maxHeight: mode === 'modal' ? '70vh' : 'max-content', overflowY: 'auto', paddingRight: 16 }}>
                <Flex vertical gap="large">
                    <Flex gap="small" align={isMobile ? 'flex-start' : 'center'} justify="space-between" vertical={isMobile}>
                        <Title level={isMobile ? 4 : 3} style={titleStyle} ellipsis={false}>{item.title}</Title>
                        {mode === 'modal' && (
                            <Flex align="center" gap="middle" wrap>
                                <DateTimeDisplay value={item.releasedOn} />
                                {item.version && <Text type="secondary">Version {item.version}</Text>}
                            </Flex>
                        )}
                    </Flex>

                    <Flex wrap gap={8}>
                        {item.tags.map(tag => <ChangelogTagRenderer key={tag} tag={tag} />)}
                    </Flex>

                    {parsedDescription.fullHtml ? (
                        <div>
                            <Title level={5}>Details</Title>
                            <div
                                className="changelog-rich-text"
                                style={{ color: token.colorText }}
                                dangerouslySetInnerHTML={{ __html: parsedDescription.fullHtml }}
                            />
                        </div>
                    ) : null}

                    {parsedDescription.improvements.length > 0 && (
                        <div>
                            <Title level={5}>Improvements & Changes</Title>
                            <ul style={{ paddingLeft: 20, margin: 0, color: token.colorText }}>
                                {parsedDescription.improvements.map((html, i) => (
                                    <li key={`imp-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {parsedDescription.bugfixes.length > 0 && (
                        <div style={{ marginTop: parsedDescription.improvements.length > 0 ? 16 : 0 }}>
                            <Title level={5}>Bugfixes</Title>
                            <ul style={{ paddingLeft: 20, margin: 0, color: token.colorText }}>
                                {parsedDescription.bugfixes.map((html, i) => (
                                    <li key={`fix-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {item.youtubeLinks && item.youtubeLinks.length > 0 && (
                        <div>
                            <Title level={5}>Videos</Title>
                            <Flex gap="middle" wrap>
                                {item.youtubeLinks.map((link, index) => {
                                    const videoId = getYouTubeID(link);
                                    if (!videoId) return null;
                                    return (
                                        <iframe
                                            key={index}
                                            width={isMobile ? "100%" : "240"}
                                            height="135"
                                            src={`https://www.youtube.com/embed/${videoId}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            style={{ borderRadius: '8px' }}
                                        ></iframe>
                                    );
                                })}
                            </Flex>
                        </div>
                    )}

                    {item.files && item.files.length > 0 && (
                        <div>
                            <Title level={5}>Attachments</Title>
                            <Image.PreviewGroup>
                                <Flex gap={8} wrap>
                                    {item.files.map((file, i) => (
                                        <Image key={i} width={100} height={100} src={file.url} alt={file.name} style={{ objectFit: 'cover', borderRadius: 8 }} />
                                    ))}
                                </Flex>
                            </Image.PreviewGroup>
                        </div>
                    )}

                    {item.kbSources && item.kbSources.length > 0 && (
                        <div>
                            <Title level={5}>Related Articles</Title>
                            <Flex vertical gap={8}>
                                {item.kbSources.map((source, i) => {
                                    const category = categoriesData?.categories?.[source.categoryId];
                                    const section = category?.sections?.find(s => s.id === source.sectionId);
                                    const article = section?.articles?.find(a => a.id === source.articleId) || category?.articles?.find(a => a.id === source.articleId);

                                    const openArticle = (event: React.MouseEvent<HTMLAnchorElement>) => {
                                        if (!article) return;
                                        event.preventDefault();
                                        setArticleModal({ active: true, article });
                                    };

                                    const breadcrumbItems = [
                                        category ? { title: <a href={helpCenterTabRouting('kb')}>{category.title}</a> } : null,
                                        section ? { title: <a href={helpCenterTabRouting('kb')}>{section.title}</a> } : null,
                                        article ? { title: <a href={helpCenterArticleRouting(getHelpCenterArticleRouteSegment(article))} onClick={openArticle}>{article.title}</a> } : null,
                                    ].filter(Boolean);

                                    return <Breadcrumb key={i} items={breadcrumbItems as any} />;
                                })}
                            </Flex>
                        </div>
                    )}
                </Flex>
            </div>

            {/* Feedback Section - Reusable Component */}
            <FeedbackSection
                likes={feedback.likes}
                dislikes={feedback.dislikes}
                feedbackGiven={feedback.feedbackGiven}
                isFeedbackModalVisible={feedback.isFeedbackModalVisible}
                onFeedback={feedback.handleFeedback}
                onFeedbackSubmit={feedback.handleFeedbackSubmit}
                onModalClose={() => feedback.setIsFeedbackModalVisible(false)}
                contentLabel="changelog entry"
            />
            {showFeedbackDetails ? (
                <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, padding: 16 }}>
                    <Title level={5} style={{ marginTop: 0 }}>Reaction activity</Title>
                    {feedbackEventsError ? (
                        <Alert type="warning" showIcon message={feedbackEventsError} />
                    ) : feedbackEventsLoading ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                    ) : feedbackEvents.length === 0 ? (
                        <Text type="secondary">No identified reaction activity yet.</Text>
                    ) : (
                        <List
                            size="small"
                            dataSource={feedbackEvents}
                            renderItem={(event) => {
                                const requester = getAnswerlatticeCustomerIdentity(event as any);
                                const actionLabel = event.action === 'removed' ? 'removed' : 'added';
                                return (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={(
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Text strong>{requester.displayName}</Text>
                                                    {requester.email ? <Text type="secondary">{requester.email}</Text> : null}
                                                    <Tag color={event.sentiment === 'like' ? 'success' : 'warning'}>
                                                        {actionLabel} {event.sentiment}
                                                    </Tag>
                                                </Flex>
                                            )}
                                            description={(
                                                <Flex vertical gap={4}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        <DateTimeDisplay value={event.createdOn} mode="datetime" />
                                                    </Text>
                                                    {event.comment ? (
                                                        <Text style={{ wordBreak: 'break-word' }}>{event.comment}</Text>
                                                    ) : null}
                                                </Flex>
                                            )}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </div>
            ) : null}
            <ArticleViewModal
                open={articleModal.active}
                onClose={() => setArticleModal({ active: false, article: null })}
                article={articleModal.article}
            />
        </Card>
    );
};

export default React.memo(ChangelogPreview);
