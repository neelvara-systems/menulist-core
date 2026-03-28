'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import KbSourceFile from '@atoms/KbSourceFile';
import { KnowledgeBaseArticleSource, KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Collapse, Flex, Space, Typography } from 'antd';

const { Text } = Typography;

interface ArticleMetadataProps {
    article: KnowledgeBaseArticleType;
}

const ArticleMetadata = ({ article }: ArticleMetadataProps) => {
    return (
        <Collapse
            accordion
            ghost
            bordered={false}
            items={[
                {
                    styles: { body: { padding: 0 } },
                    key: 'metadata',
                    label: <Text type="secondary">Metadata</Text>,
                    children: (
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Flex gap={16} align='center'>
                                <DateTimeDisplay label="Created" value={article.createdOn} mode="datetime" />
                                <DateTimeDisplay label="Last Modified" value={article.modifiedOn} mode="datetime" />
                            </Flex>
                            {article.sources && article.sources.length > 0 && (
                                <Space direction="vertical" size="small">
                                    <Text type="secondary">Sources:</Text>
                                    <Space wrap>
                                        {article.sources.map((source: KnowledgeBaseArticleSource, index) => (
                                            <KbSourceFile key={index} file={source} onClickSource={() => window.open(source.url, '_blank')} />
                                        ))}
                                    </Space>
                                </Space>
                            )}
                        </Space>
                    ),
                },
            ]}
        />
    );
};

export default ArticleMetadata;
