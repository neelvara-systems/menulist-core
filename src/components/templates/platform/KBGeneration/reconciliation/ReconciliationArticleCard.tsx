'use client';

import TiptapEditor from '@atoms/TiptapEditor';
import { KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { Breadcrumb, Card, Typography } from 'antd';
import ArticleMetadata from './ArticleMetadata';

const { Title } = Typography;

interface ReconciliationArticleCardProps {
    article: KnowledgeBaseArticleType;
}

const ReconciliationArticleCard = ({ article }: ReconciliationArticleCardProps) => {
    return (
        <Card style={{ flex: 1, overflowY: 'auto' }} variant='borderless'>
            <Breadcrumb
                style={{ marginBottom: 8 }}
                items={[
                    { title: article.categoryTitle },
                    ...(article.sectionTitle ? [{ title: article.sectionTitle }] : []),
                ]}
            />
            <Title level={5}>{article.title}</Title>
            <TiptapEditor value={article.content} isEditable={false} editorBoxHeight={"100%"} />
            <ArticleMetadata article={article} />
        </Card>
    );
};

export default ReconciliationArticleCard;
