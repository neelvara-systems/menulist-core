'use client'

import ArticleViewModal from '@organisms/ArticleViewModal';
import { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Button, Card, Flex, Space, Tooltip, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { LuFileText, LuMaximize2, LuSearch, LuSparkles } from 'react-icons/lu';
import ChatHighlight from '@atoms/ChatHighlight';

const { Text: AntText } = Typography;

interface LocalSearchResultsProps {
    query: string;
    categoriesData: KnowledgeBaseCategoriesType | null;
}

interface SearchResult {
    articleId: string;
    title: string;
    category: string;
    section?: string;
}

export default function LocalSearchResults({ query, categoriesData }: LocalSearchResultsProps) {
    const { token } = theme.useToken();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [modal, setModal] = useState<{ active: boolean; article: KnowledgeBaseArticleMeta | null }>({ active: false, article: null });

    useEffect(() => {
        const queryWords = query.toLowerCase().split(' ').filter(Boolean);

        if (queryWords.length === 0 || !categoriesData?.categories) {
            setResults([]);
            return;
        }

        // Handle both nested and flat category structures
        // If categoriesData.categories has a 'categories' property, use that instead
        const categoriesMap = categoriesData.categories as any;
        const actualCategories = categoriesMap.categories 
            ? categoriesMap.categories 
            : categoriesData.categories;

        const searchResults: SearchResult[] = [];

        Object.values(actualCategories as Record<string, any>).forEach((category: any) => {
            // Skip if category or title is missing
            if (!category || !category.title) return;

            // Check if category title matches
            const categoryTitleMatches = queryWords.some(word =>
                category.title.toLowerCase().includes(word)
            );

            // If category title matches, include ALL articles from category
            if (categoryTitleMatches) {
                (category.articles || []).forEach(article => {
                    if (!article || !article.title) return;
                    searchResults.push({
                        articleId: article.id,
                        title: article.title,
                        category: category.title
                    });
                });
            } else {
                // Otherwise, check each category-level article individually
                (category.articles || []).forEach(article => {
                    if (!article || !article.title) return;
                    const matches = queryWords.some(word =>
                        article.title.toLowerCase().includes(word)
                    );
                    if (matches) {
                        searchResults.push({
                            articleId: article.id,
                            title: article.title,
                            category: category.title
                        });
                    }
                });
            }

            // Search in sections
            (category.sections || []).forEach(section => {
                // Skip if section or title is missing
                if (!section || !section.title) return;

                const sectionTitleMatches = queryWords.some(word =>
                    section.title.toLowerCase().includes(word)
                );
                const sectionDescriptionMatches = queryWords.some(word =>
                    (section.description || '').toLowerCase().includes(word)
                );

                // If section title or description matches, include ALL articles from that section
                if (sectionTitleMatches || sectionDescriptionMatches) {
                    (section.articles || []).forEach(article => {
                        if (!article || !article.title) return;
                        searchResults.push({
                            articleId: article.id,
                            title: article.title,
                            category: category.title,
                            section: section.title
                        });
                    });
                } else {
                    // Otherwise, check each article individually
                    (section.articles || []).forEach(article => {
                        if (!article || !article.title) return;
                        const matches = queryWords.some(word =>
                            article.title.toLowerCase().includes(word)
                        );
                        if (matches) {
                            searchResults.push({
                                articleId: article.id,
                                title: article.title,
                                category: category.title,
                                section: section.title
                            });
                        }
                    });
                }
            });
        });

        setResults(searchResults.slice(0, 5)); // Limit to 5 results
    }, [query, categoriesData]);

    const handleArticleClick = (result: SearchResult) => {
        // Set article metadata - ArticleViewModal will handle fetching
        setModal({
            active: true,
            article: {
                id: result.articleId,
                title: result.title,
                active: true,
                index: 0,
                url: '',
            } as KnowledgeBaseArticleMeta
        });
    };

    const handleModalClose = () => {
        setModal({ active: false, article: null });
    };

    // Don't show anything if no query
    if (!query.trim()) {
        return null;
    }

    return (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${token.colorBorder}` }}>
            <AntText strong style={{ fontSize: 11, color: token.colorTextSecondary, display: 'block', marginBottom: 12, letterSpacing: 0.5 }}>
                {results.length > 0 ? '📚 SUGGESTED ARTICLES' : '🔍 NO MATCHES FOUND'}
            </AntText>

            {results.length === 0 ? (
                /* No Results Empty State */
                <Card
                    size="small"
                    style={{
                        background: token.colorBgContainer,
                        borderRadius: 12,
                        border: `1px dashed ${token.colorBorderSecondary}`,
                        textAlign: 'center'
                    }}
                >
                    <Flex vertical align="center" gap={12} style={{ padding: '16px 8px' }}>
                        <LuSearch size={32} color={token.colorTextTertiary} />
                        <div>
                            <AntText strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                                No articles match &quot;{query}&quot;
                            </AntText>
                            <AntText type="secondary" style={{ fontSize: 12 }}>
                                Try different keywords or press <strong>Enter</strong> to ask your question
                            </AntText>
                        </div>
                        <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                            <LuSparkles size={14} color={token.colorPrimary} />
                            <AntText type="secondary" style={{ fontSize: 11 }}>
                                The assistant can help answer questions not covered in our docs
                            </AntText>
                        </Flex>
                    </Flex>
                </Card>
            ) : (
                /* Results List */
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {results.map((result) => (
                        <Card
                            key={result.articleId}
                            size="small"
                            style={{
                                background: token.colorBgContainer,
                                borderRadius: 12,
                                border: `1px solid ${token.colorBorderSecondary}`
                            }}
                        >
                            <Flex gap={8} align="center" justify="space-between">
                                <Flex
                                    gap={8}
                                    align="center"
                                    style={{ flex: 1, cursor: 'pointer' }}
                                    onClick={() => handleArticleClick(result)}
                                >
                                    <LuFileText size={16} color={token.colorPrimary} />
                                    <div style={{ flex: 1 }}>
                                        <AntText strong style={{ fontSize: 13, display: 'block' }}>
                                            <ChatHighlight text={result.title} query={query} variant="primary" />
                                        </AntText>
                                        <AntText type="secondary" style={{ fontSize: 12 }}>
                                            {result.category}{result.section ? ` / ${result.section}` : ''}
                                        </AntText>
                                    </div>
                                </Flex>
                                <Tooltip title="Open article">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<LuMaximize2 size={14} />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleArticleClick(result);
                                        }}
                                        style={{ borderRadius: 8 }}
                                    />
                                </Tooltip>
                            </Flex>
                        </Card>
                    ))}
                </Space>
            )}

            {/* Article Modal with built-in caching */}
            <ArticleViewModal
                open={modal.active}
                onClose={handleModalClose}
                article={modal.article}
            />
        </div>
    );
}
