import { useArticleCache } from '@hook/useArticleCache';
import { normalizeHelpCenterRouteSegment } from '@constant/navigations';
import ArticleView from '@organisms/ArticleView';
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { Button, Empty, Flex, Skeleton, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { LuFileSearch, LuRefreshCw } from 'react-icons/lu';

const { Title, Text } = Typography;

interface ArticlesProps {
    activeArticleId?: string | null;
    parent: KnowledgeBaseCategory | KnowledgeBaseSection;
    articles: KnowledgeBaseArticleMeta[];
    searchTerm?: string;
    onResetSearch?: () => void;
}

const Articles = ({ activeArticleId, parent, articles, searchTerm, onResetSearch }: ArticlesProps) => {
    const { cacheScopeKey, getArticle } = useArticleCache();
    const getArticleRef = useRef(getArticle);
    const [fullArticles, setFullArticles] = useState<(AnswerlatticeReadableArticle | null)[]>([]);
    const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const requestKey = JSON.stringify([cacheScopeKey, articles.map((article) => article.id)]);
    const requestIsCurrent = loadedRequestKey === requestKey;
    const visibleArticles = requestIsCurrent ? fullArticles : [];
    const visibleLoading = loading || !requestIsCurrent;

    useEffect(() => {
        getArticleRef.current = getArticle;
    }, [getArticle]);

    useEffect(() => {
        let active = true;

        const fetchAllArticles = async () => {
            setLoading(true);
            const promises = articles.map(article =>
                getArticleRef.current(article.id).catch((): null => null)
            );
            const results = await Promise.all(promises);
            if (!active) return;
            setFullArticles(results);
            setLoadedRequestKey(requestKey);
            setLoading(false);
        };

        if (articles.length > 0) {
            void fetchAllArticles();
        } else {
            setFullArticles([]);
            setLoadedRequestKey(requestKey);
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [articles, requestKey]);

    useEffect(() => {
        if (visibleLoading || !activeArticleId || visibleArticles.length === 0) return;

        const activeArticle = visibleArticles.find(article => article?.id === activeArticleId);
        if (!activeArticle) return;

        const slug = normalizeHelpCenterRouteSegment(activeArticle.title);
        const scrollTimer = window.setTimeout(() => {
            document.getElementById(slug)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);

        return () => window.clearTimeout(scrollTimer);
    }, [activeArticleId, visibleArticles, visibleLoading]);

    return (
        <Flex vertical gap="large">
            <div>
                <Title level={4}>{parent.title}</Title>
                <Text type="secondary">{parent.description}</Text>
            </div>
            {visibleLoading ? (
                // Show skeletons while loading
                <Flex vertical gap="middle">
                    {articles.map(article => (
                        <Skeleton key={article.id} active paragraph={{ rows: 4 }} />
                    ))}
                </Flex>
            ) : visibleArticles.length > 0 ? (
                visibleArticles.map(article => article && (
                    <ArticleView
                        key={article.id}
                        article={article}
                        mode="full"
                        showCopyLink={true}
                        enableKeyboardShortcuts={true}
                    />
                ))
            ) : (
                <Empty
                    image={<LuFileSearch size={64} style={{ color: '#d9d9d9' }} />}
                    description={
                        <Flex vertical gap={8} align="center">
                            <Text strong style={{ fontSize: 16 }}>
                                No articles found
                            </Text>
                            {searchTerm ? (
                                <>
                                    <Text type="secondary">
                                        No results for &quot;{searchTerm}&quot; in {parent.title}
                                    </Text>
                                    {onResetSearch && (
                                        <Button
                                            type="primary"
                                            icon={<LuRefreshCw size={14} />}
                                            onClick={onResetSearch}
                                            style={{ marginTop: 8 }}
                                        >
                                            Clear Search
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Text type="secondary">
                                    No articles available in this section yet.
                                </Text>
                            )}
                            {searchTerm && (
                                <Flex vertical gap={4} align="center" style={{ marginTop: 16 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Try searching for:
                                    </Text>
                                    <Flex gap={8} wrap justify="center">
                                        {['Getting Started', 'Upload', 'Settings', 'Account'].map(term => (
                                            <Button
                                                key={term}
                                                size="small"
                                                type="text"
                                                style={{ fontSize: 12 }}
                                                onClick={() => {
                                                    onResetSearch?.();
                                                }}
                                            >
                                                {term}
                                            </Button>
                                        ))}
                                    </Flex>
                                </Flex>
                            )}
                        </Flex>
                    }
                    style={{ padding: '40px 20px' }}
                />
            )}
        </Flex>
    );
};

export default Articles;
