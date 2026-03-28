'use client';

import CategoryIcon from '@atoms/CategoryIcon';
import { KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import { List, Space, Tag, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuFileText } from 'react-icons/lu';
import ChatHighlight from '@atoms/ChatHighlight';

interface LocalSearchResultsProps {
    query: string;
    categoriesData: KnowledgeBaseCategoriesType | null;
    onClose: () => void;
}

export default function LocalSearchResults({ query, categoriesData, onClose }: LocalSearchResultsProps) {
    const { token } = theme.useToken();
    const [groupedResults, setGroupedResults] = useState<GroupedResult[]>([]);

    interface GroupedResult {
        category: KnowledgeBaseCategory;
        sections: KnowledgeBaseSection[];
        articles: { id: string; title: string }[];
    }


    useEffect(() => {
        const queryWords = query.toLowerCase().split(' ').filter(Boolean);

        if (queryWords.length === 0 || !categoriesData?.categories) {
            setGroupedResults([]);
            return;
        }

        const newGroupedResults: GroupedResult[] = [];

        Object.values(categoriesData.categories).forEach(category => {
            const matchingCategoryArticles = (category.articles || []).filter(article =>
                queryWords.some(word => article.title.toLowerCase().includes(word))
            );

            const sections = category.sections || [];
            const sectionsWithMatches: KnowledgeBaseSection[] = [];

            sections.forEach(section => {
                const articles = section.articles || [];
                const matchingArticles = articles.filter(article =>
                    queryWords.some(word => article.title.toLowerCase().includes(word))
                );

                const sectionTitleMatches = queryWords.some(word => section.title.toLowerCase().includes(word));
                const sectionDescriptionMatches = queryWords.some(word => (section.description || '').toLowerCase().includes(word));

                if (matchingArticles.length > 0 || sectionTitleMatches || sectionDescriptionMatches) {
                    const articlesToList = (sectionTitleMatches || sectionDescriptionMatches) ? articles : matchingArticles;
                    sectionsWithMatches.push({ ...section, articles: articlesToList });
                }
            });

            const categoryTitleMatches = queryWords.some(word => category.title.toLowerCase().includes(word));

            if (matchingCategoryArticles.length > 0 || sectionsWithMatches.length > 0 || categoryTitleMatches) {
                newGroupedResults.push({
                    category,
                    sections: sectionsWithMatches,
                    articles: categoryTitleMatches ? (category.articles || []) : matchingCategoryArticles
                });
            }
        });

        setGroupedResults(newGroupedResults);
    }, [query, categoriesData]);

    const hasResults = groupedResults.length > 0;

    if (!query || !hasResults) {
        return null;
    }

    const containerStyle: React.CSSProperties = {
        padding: 8,
        backgroundColor: token.colorFillQuaternary,
        borderRadius: token.borderRadiusLG,
        marginTop: 16,
    };

    const listItemStyle: React.CSSProperties = {
        padding: 12,
        cursor: 'pointer',
        borderRadius: token.borderRadius,
    };

    return (
        <div style={containerStyle}>
            <List
                dataSource={groupedResults}
                renderItem={group => (
                    <div key={group.category.id}>
                        <Header title={group.category.title} icon={group.category.icon} count={group.sections.length + group.articles.length} />
                        {(group.articles || []).length > 0 && (
                            <List
                                dataSource={group.articles}
                                renderItem={article => (
                                    <List.Item
                                        style={{ ...listItemStyle, paddingLeft: 12 }}
                                        className="list-item-hover"
                                        onClick={() => { /* Handle navigation for article */ onClose(); }}
                                    >
                                        <Space>
                                            <LuFileText size={12} />
                                            <Typography.Text><ChatHighlight text={article.title} query={query} variant="primary" /></Typography.Text>
                                        </Space>
                                    </List.Item>
                                )}
                                split={false}
                            />
                        )}
                        <List
                            dataSource={group.sections}
                            renderItem={section => (
                                <>
                                    <List.Item
                                        style={listItemStyle}
                                        className="list-item-hover"
                                        onClick={() => { /* Handle navigation for section */ onClose(); }}
                                    >
                                        <Space>
                                            <LuFileText />
                                            <Typography.Text><ChatHighlight text={section.title} query={query} variant="primary" /></Typography.Text>
                                        </Space>
                                    </List.Item>
                                    {(section.articles || []).length > 0 && (
                                        <List
                                            dataSource={section.articles}
                                            renderItem={article => (
                                                <List.Item
                                                    style={{ ...listItemStyle, paddingLeft: 36 }}
                                                    className="list-item-hover"
                                                    onClick={() => { /* Handle navigation for article */ onClose(); }}
                                                >
                                                    <Space>
                                                        <LuFileText size={12} />
                                                        <Typography.Text type="secondary"><ChatHighlight text={article.title} query={query} variant="primary" /></Typography.Text>
                                                    </Space>
                                                </List.Item>
                                            )}
                                            split={false}
                                        />
                                    )}
                                </>
                            )}
                            split={false}
                        />
                    </div>
                )}
            />
        </div>
    );
}

function Header({ title, icon, count }: { title: string; icon: string; count: number }) {
    const headerStyle: React.CSSProperties = {
        padding: '8px 12px',
        width: '100%',
        justifyContent: 'space-between',
    };

    return (
        <Space style={headerStyle}>
            <Space>
                <CategoryIcon icon={icon} />
                <Typography.Text style={{ fontSize: 16 }} type="secondary">{title}</Typography.Text>
            </Space>
            <Tag>{count}</Tag>
        </Space>
    );
}
