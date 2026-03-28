import { highlightText } from '@lib/searchHighlight';
import { KnowledgeBaseArticleMeta } from '@type/knowledgeBase';
import { Divider, Empty, Flex, List, Typography, theme } from 'antd';
import React from 'react';
import { LuFileText, LuSearch } from 'react-icons/lu';

const { Text } = Typography;

// Extended article type for suggestions (embedded articles have more fields)
type ArticleSuggestion = KnowledgeBaseArticleMeta & {
    categoryTitle?: string;
    sectionTitle?: string;
};

interface SearchSuggestionsProps {
    searchTerm: string;
    suggestions: ArticleSuggestion[];
    onArticleSelect: (article: ArticleSuggestion) => void;
    onClose?: () => void;
    maxSuggestions?: number;
}

/**
 * Search suggestions dropdown component
 * Shows matching articles as user types
 */
const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    searchTerm,
    suggestions,
    onArticleSelect,
    onClose,
    maxSuggestions = 5,
}) => {
    const { token } = theme.useToken();

    if (!searchTerm) return null;

    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    if (limitedSuggestions.length === 0) {
        return (
            <div
                style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                    zIndex: 1000,
                    maxHeight: 400,
                    overflowY: 'auto',
                    padding: 16,
                }}
            >
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text type="secondary">
                            No results for &quot;<strong>{searchTerm}</strong>&quot;
                        </Text>
                    }
                />
            </div>
        );
    }

    return (
        <div
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: token.colorBgElevated,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
                zIndex: 1000,
                maxHeight: 400,
                overflowY: 'auto',
            }}
        >
            {/* Header */}
            <Flex
                align="center"
                gap={8}
                style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
            >
                <LuSearch size={14} style={{ color: token.colorTextSecondary }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Showing {limitedSuggestions.length} of {suggestions.length} results
                </Text>
            </Flex>

            {/* Suggestions List */}
            <List
                dataSource={limitedSuggestions}
                renderItem={(article) => (
                    <List.Item
                        onClick={() => {
                            onArticleSelect(article);
                            onClose?.();
                        }}
                        style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = token.colorBgTextHover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <Flex align="flex-start" gap={12} style={{ width: '100%' }}>
                            <LuFileText
                                size={16}
                                style={{ color: token.colorTextSecondary, marginTop: 2, flexShrink: 0 }}
                            />
                            <Flex vertical gap={4} style={{ flex: 1, overflow: 'hidden' }}>
                                <Text strong style={{ fontSize: 14 }}>
                                    {highlightText(article.title, searchTerm)}
                                </Text>
                                {article.categoryTitle && (
                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: 12,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {article.categoryTitle}
                                        {article.sectionTitle && ` › ${article.sectionTitle}`}
                                    </Text>
                                )}
                            </Flex>
                        </Flex>
                    </List.Item>
                )}
            />

            {/* Show more indicator */}
            {suggestions.length > maxSuggestions && (
                <>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ padding: '8px 16px', textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            +{suggestions.length - maxSuggestions} more results
                        </Text>
                    </div>
                </>
            )}
        </div>
    );
};

export default SearchSuggestions;
