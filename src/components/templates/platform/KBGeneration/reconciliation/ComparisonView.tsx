'use client';

import { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Button, Col, Divider, Drawer, Flex, Modal, Row, Space, Typography } from 'antd';
import { useState } from 'react';
import { LuHand, LuInfo, LuReplace, LuX } from 'react-icons/lu';
import ReconciliationArticleCard from './ReconciliationArticleCard';

const { Title, Paragraph, Text } = Typography;

// The stored reconciliation contract keeps compact summaries. This view
// hydrates those IDs into complete articles before rendering article bodies.
export type ArticleWithResolvedReconciliation = Omit<KnowledgeBaseArticleType, 'reconciliation'> & {
    reconciliation: Omit<NonNullable<KnowledgeBaseArticleType['reconciliation']>, 'similarArticles'> & {
        similarArticles: KnowledgeBaseArticleType[];
    };
};

interface ComparisonViewProps {
    drawerVisible: boolean;
    handleDrawerClose: () => void;
    article: ArticleWithResolvedReconciliation;
    onResolved: (resolution: 'discard' | 'replace' | 'keep_both') => void;
}

const ComparisonView = ({ drawerVisible, handleDrawerClose, article, onResolved }: ComparisonViewProps) => {
    const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);

    const showConfirm = (resolution: 'discard' | 'replace' | 'keep_both') => {
        let title = '';
        let content = '';

        switch (resolution) {
            case 'discard':
                title = 'Are you sure you want to discard this new article?';
                content = 'This action will permanently delete the newly generated article. The existing article(s) will not be affected. This cannot be undone.';
                break;
            case 'keep_both':
                title = 'Are you sure you want to keep both articles?';
                content = 'The new article will be saved as a separate entry in your knowledge base. You will have two separate articles.';
                break;
            case 'replace':
                title = 'Are you sure you want to replace the existing article?';
                content = 'The content of the original article will be replaced with the new version, and the old version will be deleted. This action cannot be undone.';
                break;
        }

        Modal.confirm({
            title,
            content,
            onOk() {
                onResolved(resolution);
            },
            okText: "Confirm",
            cancelText: "Cancel",
        });
    };

    return (
        <>
            <Modal
                title="Action Explanations"
                open={isHelpModalVisible}
                onCancel={() => setIsHelpModalVisible(false)}
                footer={<Button onClick={() => setIsHelpModalVisible(false)}>Got it</Button>}
            >
                <Flex vertical gap="large">
                    <div>
                        <Title level={5}>[Replace Existing with New]</Title>
                        <Paragraph italic>&ldquo;The new version is better. Archive the old one and use this new one in its place.&rdquo;</Paragraph>
                        <Paragraph type="secondary">The content of the existing article will be replaced with the content from the new article. This is useful for updates.</Paragraph>
                    </div>
                    <div>
                        <Title level={5}>[Discard New Article]</Title>
                        <Paragraph italic>&ldquo;This is a duplicate. Delete this new draft.&rdquo;</Paragraph>
                        <Paragraph type="secondary">The newly generated article will be deleted. The existing article(s) will remain unchanged.</Paragraph>
                    </div>
                    <div>
                        <Title level={5}>[Keep Both]</Title>
                        <Paragraph italic>&ldquo;These are different enough. Publish the new one as a separate article.&rdquo;</Paragraph>
                        <Paragraph type="secondary">The new article will be saved as a separate, new entry in your knowledge base. The existing article(s) will not be affected.</Paragraph>
                    </div>
                </Flex>
            </Modal>
            <Drawer
                title={`Resolve Duplicates for: ${article.title}`}
                width={'80vw'}
                onClose={() => handleDrawerClose()}
                open={drawerVisible}
            >
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
                        <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Title level={4}>New Article (From Ingestion)</Title>
                            <ReconciliationArticleCard article={article} />
                        </Col>
                        <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Title level={4}>Existing {article.reconciliation?.similarArticles?.length || 0} Articles (In Production)</Title>
                            <Flex gap={16} vertical style={{ flex: 1, overflowY: 'auto' }}>
                                {article.reconciliation?.similarArticles && article.reconciliation.similarArticles.length > 0 ? (
                                    article.reconciliation.similarArticles.map(prodArticle => (
                                        <ReconciliationArticleCard key={prodArticle.id} article={prodArticle} />
                                    ))
                                ) : (
                                    <Text>No similar production articles found.</Text>
                                )}
                            </Flex>
                        </Col>
                    </Row>
                    <Divider />
                    <Space style={{ justifyContent: 'flex-end' }}>
                        <Button icon={<LuInfo />} shape="circle" onClick={() => setIsHelpModalVisible(true)} />
                        <Button icon={<LuX />} onClick={() => showConfirm('discard')}>Discard New Article</Button>
                        <Button icon={<LuHand />} onClick={() => showConfirm('keep_both')}>Keep Both</Button>
                        <Button icon={<LuReplace />} type="primary" onClick={() => showConfirm('replace')}>Replace Existing with New</Button>
                    </Space>
                </div>
            </Drawer>
        </>
    );
};

export default ComparisonView;
