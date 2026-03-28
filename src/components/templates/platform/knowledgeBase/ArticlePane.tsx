import { bulkUpdateArticleStatus } from "@database/knowledgeBase/articles";
import { ARTICLE_STATUS, KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { Button, Flex, message, Popconfirm, Space, Spin, theme, Typography } from "antd";
import { useMemo, useState } from "react";
import { LuArchive, LuCheckSquare, LuFileCheck2 } from "react-icons/lu";
import PaneContent from './PaneContent';
import PaneHeader from './PaneHeader';

const { Text } = Typography;

interface ArticlePaneProps {
    selectedContainer: KnowledgeBaseCategory | KnowledgeBaseSection | null;
    articles: KnowledgeBaseArticleMeta[];
    selectedArticle: KnowledgeBaseArticleType | null;
    onArticleSelect: (article: KnowledgeBaseArticleMeta) => void;
    onAddArticle: () => void;
    onDeleteArticle: (id: string) => void;
    onEditArticle: (article: KnowledgeBaseArticleType) => void;
    isArticleLoading: boolean;
}

function ArticlePane({ selectedContainer, articles, selectedArticle, onArticleSelect, onAddArticle, onDeleteArticle, onEditArticle, isArticleLoading }: ArticlePaneProps) {
    const { token } = theme.useToken();
    const [searchValue, setSearchValue] = useState('');
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredArticles = useMemo(() => {
        if (!searchValue.trim()) return articles;
        const term = searchValue.toLowerCase();
        return articles.filter(a => a.title.toLowerCase().includes(term));
    }, [articles, searchValue]);

    const handleBulkAction = async (status: string) => {
        if (selectedIds.length === 0) return;
        try {
            await bulkUpdateArticleStatus(selectedIds, status);
            message.success(`${selectedIds.length} article(s) ${status === ARTICLE_STATUS.PUBLISHED ? 'published' : 'archived'}`);
            setSelectedIds([]);
            setBulkMode(false);
        } catch {
            message.error(`Failed to update articles`);
        }
    };

    const toggleBulkMode = () => {
        setBulkMode(!bulkMode);
        setSelectedIds([]);
    };

    if (!selectedContainer) {
        return (
            <div style={{ background: token.colorBgContainer, padding: '16px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Text type="secondary">Select a category or section to see articles</Text>
            </div>
        );
    }

    const bulkActions = bulkMode && selectedIds.length > 0 ? (
        <Flex gap={4}>
            <Popconfirm title={`Publish ${selectedIds.length} article(s)?`} onConfirm={() => handleBulkAction(ARTICLE_STATUS.PUBLISHED)}>
                <Button size="small" icon={<LuFileCheck2 />} type="primary">Publish ({selectedIds.length})</Button>
            </Popconfirm>
            <Popconfirm title={`Archive ${selectedIds.length} article(s)?`} onConfirm={() => handleBulkAction(ARTICLE_STATUS.ARCHIVED)}>
                <Button size="small" icon={<LuArchive />} danger>Archive ({selectedIds.length})</Button>
            </Popconfirm>
        </Flex>
    ) : null;

    return (
        <div style={{ background: token.colorBgContainer, padding: '16px', height: '100%', overflowY: 'auto' }}>
            <Spin spinning={isArticleLoading} size="large">
                <PaneHeader
                    title={selectedContainer.title}
                    buttonText="Add Article"
                    onButtonClick={onAddArticle}
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    extra={
                        <Space size={4}>
                            {bulkActions}
                            {articles.length > 0 && (
                                <Button
                                    size="small"
                                    type={bulkMode ? "primary" : "text"}
                                    icon={<LuCheckSquare />}
                                    onClick={toggleBulkMode}
                                >
                                    {bulkMode ? 'Done' : 'Select'}
                                </Button>
                            )}
                        </Space>
                    }
                />
                <PaneContent
                    from="Article"
                    dataSource={filteredArticles}
                    selectedItem={selectedArticle}
                    onItemSelect={onArticleSelect}
                    onEditItem={onEditArticle}
                    onDeleteItem={onDeleteArticle}
                    selectedIds={bulkMode ? selectedIds : undefined}
                    onSelectionChange={bulkMode ? setSelectedIds : undefined}
                    emptyState={{
                        description: searchValue ? `No articles matching "${searchValue}"` : `No articles in this ${'sections' in selectedContainer ? 'category' : 'section'}`,
                        buttonText: searchValue ? "" : "Add Article",
                        onButtonClick: onAddArticle
                    }}
                />
            </Spin>
        </div>
    );
}

export default ArticlePane;
