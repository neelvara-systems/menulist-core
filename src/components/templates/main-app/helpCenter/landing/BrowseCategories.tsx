'use client'
import CategoryIcon from '@atoms/CategoryIcon';
import { helpCenterTabRouting } from '@constant/navigations';
import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import { KnowledgeBaseCategory } from '@type/knowledgeBase';
import { Alert, Button, Card, Col, Empty, Flex, Row, Typography, App, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuRefreshCw } from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

function BrowseCategories() {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('HelpCenter');
    const { token } = theme.useToken();
    const router = useRouter();
    const { categoriesMap, getCategoriesCached } = useKBCategoriesCache();
    const [loadFailed, setLoadFailed] = useState(false);

    const fetchKbData = useCallback(async (forceRefresh = false) => {
        setLoadFailed(false);
        try {
            await getCategoriesCached({ forceRefresh });
        } catch {
            setLoadFailed(true);
            messageApi.error(t('failedToLoadCategories'));
        }
    }, [getCategoriesCached, t]);

    useEffect(() => {
        void fetchKbData();
    }, [fetchKbData]);

    const categories = useMemo<KnowledgeBaseCategory[]>(
        () => Object.values(categoriesMap) as KnowledgeBaseCategory[],
        [categoriesMap]
    );

    return (
        <Flex vertical gap="large" style={{ width: '100%', maxWidth: 1200 }}>
            <Title level={4}>{t('browseByCategory')}</Title>
            {loadFailed ? (
                <Alert
                    action={(
                        <Button
                            aria-label={t('failedToLoadCategories')}
                            icon={<LuRefreshCw aria-hidden="true" />}
                            onClick={() => void fetchKbData(true)}
                            size="small"
                        />
                    )}
                    message={t('failedToLoadCategories')}
                    showIcon
                    type="error"
                />
            ) : categories.length === 0 ? (
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
                                            style={{ width: 48, height: 48, borderRadius: 16, background: token.colorPrimaryBg }}
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
                                        <Button type="link" size="small" onClick={() => router.push(helpCenterTabRouting('kb'))}>
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
