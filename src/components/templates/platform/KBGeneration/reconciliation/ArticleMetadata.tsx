'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import KbSourceFile from '@atoms/KbSourceFile';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { KnowledgeBaseArticleSource, KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Collapse, Flex, message, Space, Typography } from 'antd';

const { Text } = Typography;

interface ArticleMetadataProps {
    article: KnowledgeBaseArticleType;
}

const ArticleMetadata = ({ article }: ArticleMetadataProps) => {
    const handleSourceOpen = (source: KnowledgeBaseArticleSource) => {
        try {
            openIsolatedBrowserUrl(source.url);
        } catch (error) {
            logRuntimeFailure('answerlattice_kb_source_open_failed', error, {
                surface: 'kb_generation_reconciliation_metadata',
                ...getBoundedRuntimeStringContext('articleId', article.id),
                ...getBoundedRuntimeStringContext('jobId', article.jobId),
                ...getBoundedRuntimeStringContext('sourceUrl', source.url),
                ...getBoundedRuntimeStringContext('sourceName', source.name),
                ...getBoundedRuntimeStringContext('sourceType', source.type),
            });
            message.error('Unable to open source');
        }
    };

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
                                            <KbSourceFile key={index} file={source} onClickSource={() => handleSourceOpen(source)} />
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
