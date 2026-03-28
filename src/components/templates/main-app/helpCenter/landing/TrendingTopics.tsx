'use client'
import { Button, Card, Empty, Flex, List, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';

import { getCategories } from '@database/knowledgeBase/categories';
import ArticleViewModal from '@organisms/ArticleViewModal';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KbCategoriesMap, KnowledgeBaseArticleMeta, KnowledgeBaseSection } from '@type/knowledgeBase';
import { Timestamp } from 'firebase/firestore';


function TrendingTopics() {
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [hovered, setHovered] = useState<string | null>(null);
    const [articles, setArticles] = useState<(KnowledgeBaseArticleMeta & { categoryTitle?: string, sectionTitle?: string })[]>([]);
    const [modal, setModal] = useState<{ active: boolean; article: KnowledgeBaseArticleMeta | null }>({ active: false, article: null });

    const fetchInitialData = async () => {

        const getArticles = (categories: KbCategoriesMap["categories"]) => {
            const allArticles: (KnowledgeBaseArticleMeta & { categoryTitle?: string, sectionTitle?: string })[] = [];
            Object.values(categories).forEach(category => {
                if (category.articles) {
                    allArticles.push(...category.articles.map(article => ({ ...article, categoryTitle: category.title })));
                }
                category.sections.forEach((section: KnowledgeBaseSection) => {
                    if (section.articles) {
                        allArticles.push(
                            ...section.articles.map(article => ({
                                ...article,
                                categoryTitle: category.title,
                                sectionTitle: section.title,
                            }))
                        );
                    }
                });
            });

            const sortedArticles = allArticles.sort((a, b) => b.index - a.index);
            setArticles(sortedArticles.slice(0, 5));
        }
        try {
            if (!cachedKBCategories?.kBCategories) {
                const res: KbCategoriesMap = await getCategories();

                setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: res });
                getArticles(res.categories);
            } else {
                getArticles(cachedKBCategories.kBCategories.categories);
            }
        } catch (error) {
            message.error(t('failedToLoadArticles'));
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleArticleClick = (articleMeta: KnowledgeBaseArticleMeta & { categoryTitle?: string, sectionTitle?: string }) => {
        // Set article metadata - ArticleViewModal will handle fetching
        setModal({ active: true, article: articleMeta });
    };

    const handleModalClose = () => {
        setModal({ active: false, article: null });
    };

    return (
        <Card variant="borderless" style={{ width: '100%', height: '100%' }}>
            <Flex vertical gap="large">
                <Flex justify="space-between" align="center">
                    <Typography.Title level={4} style={{ margin: 0 }}>{t('popularResources')}</Typography.Title>
                    <Button type="text" size="small" icon={<LuArrowRight />} iconPosition='end'>{t('viewAll')}</Button>
                </Flex>
                {cachedKBCategories?.kBCategories ? <List
                    dataSource={articles}
                    renderItem={(item, index) => (
                        <List.Item
                            onClick={() => handleArticleClick(item)}
                            style={{
                                cursor: 'pointer',
                                padding: '12px 0',
                                borderBlockEnd: index === articles.length - 1 ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                            }}
                            onMouseEnter={() => setHovered(item.id)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                                <Flex vertical gap="small" style={{ maxWidth: '75%' }}>
                                    <Typography.Text strong style={{ color: token.colorPrimary }}>
                                        {item.title}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                                        {item.categoryTitle}
                                        {item.sectionTitle ? ` • ${item.sectionTitle}` : ''}
                                    </Typography.Text>
                                </Flex>
                                <Flex align="center" gap={8}>
                                    {hovered === item.id && <LuArrowRight />}
                                </Flex>
                            </Flex>
                        </List.Item>
                    )}
                    split={false}
                /> : <Empty description={t('noArticles')} />}
            </Flex>

            {/* Article Modal with built-in caching */}
            <ArticleViewModal
                open={modal.active}
                onClose={handleModalClose}
                article={modal.article}
            />
        </Card>
    );
}

export default TrendingTopics;
