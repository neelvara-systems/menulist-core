'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import FeedbackSection from '@molecules/FeedbackSection';
import { getTiptapExtensions } from '@config/tiptap';
import { addContentFeedback } from '@database/contentFeedback';
import { updateChangelogFeedbackGeneric } from '@database/feedback/genericFeedback';
import { useContentViewTracking } from '@hook/useContentViewTracking';
import { useFeedback } from '@hook/useFeedback';
import { getStoredContentFeedback, removeStoredContentFeedback, storeContentFeedback } from '@lib/contentFeedbackStorage';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { generateHTML } from '@tiptap/core';
import { ChangelogEntry } from '@type/changelog';
import { getYouTubeID } from '@util/utils';
import { Breadcrumb, Card, Flex, Image, Typography, theme } from 'antd';
import React, { useContext, useMemo } from 'react';
import ChangelogTagRenderer from './ChangelogTagRenderer';

const { Title, Text } = Typography;
const { useToken } = theme;

interface ChangelogPreviewProps {
    item: ChangelogEntry;
    pageId?: string; // Required if showFeedback is true
    mode: 'modal' | 'inline';
    disableTracking?: boolean; // Disable view tracking when viewing from Recently Viewed
}

const ChangelogPreview: React.FC<ChangelogPreviewProps> = ({ item, pageId, mode, disableTracking = false }) => {
    const { token } = useToken();
    const { cachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Track changelog view for analytics and recently viewed (disabled when viewing from Recently Viewed)
    useContentViewTracking(
        !disableTracking && item
            ? {
                  id: item.id,
                  type: 'changelog',
                  title: item.title,
                  href: `/app/help-center/changelog/${item.id}`,
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

    // Memoize displayExtensions to prevent infinite re-renders
    const displayExtensions = useMemo(() => getTiptapExtensions({ isEditable: false }), []);

    // Memoize title style to prevent re-renders
    const titleStyle = useMemo(() => ({ margin: 0 }), []);

    const parsedDescription = useMemo(() => {
        const improvements: any[] = [];
        const bugfixes: any[] = [];
        let hasSections = false;

        if (item.description && Array.isArray(item.description.content)) {
            let currentSection: 'improvements' | 'bugfixes' | null = null;

            item.description.content.forEach(node => {
                if (node.type === 'heading' && node.content) {
                    const text = node.content[0].text.toLowerCase();
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
                            // Generate HTML only for the paragraph content
                            return generateHTML({ type: 'doc', content: [{ type: 'paragraph', content: paragraphNode.content }] }, displayExtensions);
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
            const html = generateHTML(item.description, displayExtensions);
            improvements.push(html);
        }

        return { improvements, bugfixes };
    }, [item.description, displayExtensions]);

    return (
        <Card
            style={{
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden',
            }}
            styles={{ body: { padding: 16 } }}
        >
            <div style={{ maxHeight: mode === 'modal' ? '70vh' : 'max-content', overflowY: 'auto', paddingRight: 16 }}>
                <Flex vertical gap="large">
                    <Flex gap="small" align="center" justify="between">
                        <Title level={3} style={titleStyle} ellipsis={false}>{item.title}</Title>
                        {mode === 'modal' && (
                            <Flex align="center" gap="middle">
                                <DateTimeDisplay value={item.releasedOn} />
                                {item.version && <Text type="secondary">Version {item.version}</Text>}
                            </Flex>
                        )}
                    </Flex>

                    <Flex wrap gap={8}>
                        {item.tags.map(tag => <ChangelogTagRenderer key={tag} tag={tag} />)}
                    </Flex>

                    {parsedDescription.improvements.length > 0 && (
                        <div>
                            <Title level={5}>Improvements & Changes</Title>
                            <ul style={{ paddingLeft: 20, margin: 0, color: token.colorText }}>
                                {parsedDescription.improvements.map((html, i) => (
                                    <li key={`imp-${i}`} dangerouslySetInnerHTML={{ __html: html.replace(/<p>|<\/p>/g, '') }} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {parsedDescription.bugfixes.length > 0 && (
                        <div style={{ marginTop: parsedDescription.improvements.length > 0 ? 16 : 0 }}>
                            <Title level={5}>Bugfixes</Title>
                            <ul style={{ paddingLeft: 20, margin: 0, color: token.colorText }}>
                                {parsedDescription.bugfixes.map((html, i) => (
                                    <li key={`fix-${i}`} dangerouslySetInnerHTML={{ __html: html.replace(/<p>|<\/p>/g, '') }} />
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
                                            width="240"
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
                                    const category = cachedKBCategories?.kBCategories?.categories?.[source.categoryId];
                                    const section = category?.sections?.find(s => s.id === source.sectionId);
                                    const article = section?.articles?.find(a => a.id === source.articleId) || category?.articles?.find(a => a.id === source.articleId);

                                    const breadcrumbItems = [
                                        category ? { title: <a href={`/help/${category.url}`} target="_blank">{category.title}</a> } : null,
                                        section ? { title: <a href={`/help/${category?.url}/${section.url}`} target="_blank">{section.title}</a> } : null,
                                        article ? { title: <a href={`/help/${category?.url}/${section ? section.url + '/' : ''}${article.url}`} target="_blank">{article.title}</a> } : null,
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
        </Card>
    );
};

export default React.memo(ChangelogPreview);
