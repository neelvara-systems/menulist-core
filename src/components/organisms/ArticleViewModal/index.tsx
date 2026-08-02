'use client';

import { useArticleCache } from '@hook/useArticleCache';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import ArticleView from '@organisms/ArticleView';
import { KnowledgeBaseArticleMeta } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { Button, Divider, Flex, Grid, Modal, Skeleton, Space, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { LuFileX, LuSearch } from 'react-icons/lu';

const { Text, Title } = Typography;

interface ArticleViewModalProps {
    open: boolean;
    onClose: () => void;
    article: KnowledgeBaseArticleMeta | AnswerlatticeReadableArticle | null;
}

export default function ArticleViewModal({ open, onClose, article: providedArticle }: ArticleViewModalProps) {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const { cacheScopeKey, getArticle, addArticleToCache } = useArticleCache();
    const [fullArticle, setFullArticle] = useState<AnswerlatticeReadableArticle | null>(null);
    const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isMobile = screens.md === false;
    const requestKey = JSON.stringify([cacheScopeKey, providedArticle?.id || null]);
    const requestIsCurrent = loadedRequestKey === requestKey;
    const visibleArticle = requestIsCurrent ? fullArticle : null;
    const visibleLoading = isLoading || Boolean(open && providedArticle && !requestIsCurrent);

    useEffect(() => {
        if (!open || !providedArticle) {
            setFullArticle(null);
            setLoadedRequestKey(requestKey);
            setIsLoading(false);
            return;
        }

        let active = true;

        // Check if provided article is already full (has content field)
        if ('content' in providedArticle) {
            // Already have full article - use it and cache it
            setFullArticle(providedArticle);
            setLoadedRequestKey(requestKey);
            setIsLoading(false);
            addArticleToCache(providedArticle);
        } else {
            const articleId = providedArticle.id;
            setFullArticle(null);
            setIsLoading(true);

            void getArticle(articleId, {
                onCacheHit: () => {
                    if (active) setIsLoading(false);
                },
                onCacheMiss: () => {
                    if (active) setIsLoading(true);
                },
                })
                .then((article) => {
                    if (active) {
                        setFullArticle(article);
                        setLoadedRequestKey(requestKey);
                    }
                })
                .catch((error) => {
                    if (!active) return;
                    setFullArticle(null);
                    setLoadedRequestKey(requestKey);
                    logRuntimeFailure('answerlattice_article_modal_load_failed', error, {
                        ...getBoundedRuntimeStringContext('articleId', articleId),
                    });
                })
                .finally(() => {
                    if (active) setIsLoading(false);
                });
        }

        return () => {
            active = false;
        };
    }, [addArticleToCache, getArticle, open, providedArticle, requestKey]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={isMobile ? '100vw' : 900}
            style={{
                top: isMobile ? 0 : 20,
                maxWidth: isMobile ? '100vw' : undefined,
                margin: isMobile ? 0 : undefined,
                paddingBottom: isMobile ? 0 : undefined,
            }}
            styles={{
                body: {
                    maxHeight: isMobile ? '100dvh' : 'calc(100vh - 80px)',
                    overflowY: 'auto',
                    padding: isMobile ? 10 : undefined,
                },
                content: {
                    borderRadius: isMobile ? 0 : undefined,
                    minHeight: isMobile ? '100dvh' : undefined,
                    padding: isMobile ? 8 : undefined,
                },
            }}
        >
            {visibleLoading ? (
                /* Loading Skeleton */
                <div style={{ padding: 24 }}>
                    {/* Breadcrumb skeleton */}
                    <Skeleton.Input active size="small" style={{ width: 200, marginBottom: 16 }} />
                    {/* Title skeleton */}
                    <Skeleton.Input active size="large" style={{ width: '80%', height: 40, marginBottom: 24 }} />
                    <Divider style={{ margin: '16px 0' }} />
                    {/* Content skeleton */}
                    <Skeleton active paragraph={{ rows: 8 }} title={false} style={{ marginBottom: 24 }} />
                    {/* Tags skeleton */}
                    <Space size={8}>
                        <Skeleton.Button active size="small" style={{ width: 60 }} />
                        <Skeleton.Button active size="small" style={{ width: 80 }} />
                        <Skeleton.Button active size="small" style={{ width: 70 }} />
                    </Space>
                </div>
            ) : visibleArticle ? (
                /* Article Content */
                <ArticleView
                    article={visibleArticle}
                    mode="modal"
                    showBreadcrumbs={true}
                    showTags={true}
                    maxHeight={isMobile ? 'calc(100dvh - 72px)' : '75vh'}
                />
            ) : (
                /* Article Not Found State */
                <Flex
                    vertical
                    align="center"
                    justify="center"
                    gap={24}
                    style={{ padding: '60px 40px', minHeight: 400 }}
                >
                    <LuFileX size={64} color={token.colorTextTertiary} />

                    <Flex vertical align="center" gap={8}>
                        <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                            Article Not Available
                        </Title>
                        <Text type="secondary" style={{ textAlign: 'center', maxWidth: 400 }}>
                            This article may have been removed, archived, or is no longer accessible.
                        </Text>
                    </Flex>

                    <Flex gap={12}>
                        <Button type="primary" icon={<LuSearch size={16} />} onClick={onClose}>Explore Other Articles</Button>
                        <Button onClick={onClose}>Close</Button>
                    </Flex>

                    <Divider style={{ margin: '16px 0' }} />

                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                        💡 Tip: Try searching for similar topics or browse our knowledge base
                    </Text>
                </Flex>
            )}
        </Modal>
    );
}
