'use client'
import CategoryIcon from '@atoms/CategoryIcon';
import { getCategories } from '@database/knowledgeBase/categories';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KbCategoriesMap, KnowledgeBaseCategory } from '@type/knowledgeBase';
import { Button, Card, Col, Empty, Flex, Row, Typography, message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo } from 'react';
import { LuArrowRight } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

function BrowseCategories() {
    const t = useTranslations('HelpCenter');
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    useEffect(() => {
        const fetchKbData = async () => {
            try {
                if (!cachedKBCategories?.kBCategories) {
                    const res: KbCategoriesMap = await getCategories();
                    setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: res });
                }
            } catch (error) {
                message.error(t('failedToLoadCategories'));
            }
        };

        fetchKbData();
    }, [cachedKBCategories, setCachedKBCategories]);

    const categories = useMemo<KnowledgeBaseCategory[]>(
        () => Object.values(cachedKBCategories?.kBCategories?.categories || {}) as KnowledgeBaseCategory[],
        [cachedKBCategories?.kBCategories?.categories]
    );

    return (
        <Flex vertical gap="large" style={{ width: '100%', maxWidth: 1200 }}>
            <Title level={4}>{t('browseByCategory')}</Title>
            {categories.length === 0 ? (
                <Empty description={t('noCategories')} />
            ) : (
                <Row gutter={[16, 16]}>
                    {categories.map(category => {
                        const sectionCount = category.sections?.length || 0;
                        const sectionArticles = category.sections?.reduce((total, section) => total + (section.articles?.length || 0), 0) || 0;
                        const directArticles = category.articles?.length || 0;
                        const articleCount = sectionArticles + directArticles;

                        const sectionLabel = `${sectionCount} section${sectionCount === 1 ? '' : 's'}`;
                        const articleLabel = `${articleCount} article${articleCount === 1 ? '' : 's'}`;

                        return (
                            <Col key={category.id} xs={24} sm={12} md={6}>
                                <Card
                                    hoverable
                                    style={{ height: '100%', borderRadius: 16 }}
                                    styles={{ body: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20 } }}
                                >
                                    <Flex align="center" justify="flex-start" gap="middle">
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(82, 82, 255, 0.08)' }}
                                        >
                                            <CategoryIcon icon={category.icon} style={{ fontSize: 24 }} />
                                        </Flex>
                                        <Title level={5} style={{ margin: 0 }}>{category.title}</Title>
                                    </Flex>
                                    {category.description && (
                                        <Paragraph type="secondary" style={{ margin: 0 }} ellipsis={{ rows: 2 }}>
                                            {category.description}
                                        </Paragraph>
                                    )}
                                    <Flex justify="space-between" align="center">
                                        {sectionLabel ? <Text type="secondary">{`${sectionLabel} · ${articleLabel}`}</Text> : <Text type="secondary">{`${articleLabel}`}</Text>}
                                        <Button type="link" size="small">
                                            <Flex align="center" gap={4}>
                                                <span>{t('explore')}</span>
                                                <LuArrowRight />
                                            </Flex>
                                        </Button>
                                    </Flex>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </Flex>
    );
}

export default BrowseCategories;
