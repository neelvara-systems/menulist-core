import { useArticleCache } from '@hook/useArticleCache';
import { normalizeHelpCenterRouteSegment } from '@constant/navigations';
import ArticleView from '@organisms/ArticleView';
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { Button, Empty, Flex, Skeleton, Typography } from 'antd';
import { useEffect, useState } from 'react';
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
    const { getArticle } = useArticleCache();
    const [fullArticles, setFullArticles] = useState<(AnswerlatticeReadableArticle | null)[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllArticles = async () => {
            setLoading(true);
            const promises = articles.map(article =>
                getArticle(article.id).catch((): null => null)
            );
            const results = await Promise.all(promises);
            setFullArticles(results);
            setLoading(false);
        };

        if (articles.length > 0) {
            fetchAllArticles();
        } else {
            setFullArticles([]);
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articles]);

    useEffect(() => {
        if (loading || !activeArticleId || fullArticles.length === 0) return;

        const activeArticle = fullArticles.find(article => article?.id === activeArticleId);
        if (!activeArticle) return;

        const slug = normalizeHelpCenterRouteSegment(activeArticle.title);
        const scrollTimer = window.setTimeout(() => {
            document.getElementById(slug)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);

        return () => window.clearTimeout(scrollTimer);
    }, [activeArticleId, fullArticles, loading]);

    return (
        <Flex vertical gap="large">
            <div>
                <Title level={4}>{parent.title}</Title>
                <Text type="secondary">{parent.description}</Text>
            </div>
            {loading ? (
                // Show skeletons while loading
                <Flex vertical gap="middle">
                    {articles.map(article => (
                        <Skeleton key={article.id} active paragraph={{ rows: 4 }} />
                    ))}
                </Flex>
            ) : fullArticles.length > 0 ? (
                fullArticles.map(article => article && (
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
