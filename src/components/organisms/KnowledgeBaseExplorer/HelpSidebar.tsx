import CategoryIcon from '@atoms/CategoryIcon';
import { highlightText } from '@lib/searchHighlight';
import SearchSuggestions from '@molecules/SearchSuggestions';
import ArticleView from '@organisms/ArticleView';
import { KnowledgeBaseArticleMeta, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import { Button, Flex, Input, Menu, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuHome } from 'react-icons/lu';

const { Text } = Typography;

interface HelpSidebarProps {
    categories: KnowledgeBaseCategory[];
    selectedCategory: KnowledgeBaseCategory | null;
    selectedKnowledgeBaseSection: KnowledgeBaseSection | null;
    selectedArticle: KnowledgeBaseArticleMeta | null;
    onCategorySelect: (category: KnowledgeBaseCategory) => void;
    onKnowledgeBaseSectionSelect: (section: KnowledgeBaseSection) => void;
    onArticleSelect: (article: KnowledgeBaseArticleMeta) => void;
    resetSelection: () => void;
}

const HelpSidebar = ({ categories, selectedCategory, selectedKnowledgeBaseSection, selectedArticle, onCategorySelect, onKnowledgeBaseSectionSelect, onArticleSelect, resetSelection }: HelpSidebarProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const { token } = theme.useToken();

    // Debounce search term for suggestions
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            if (searchTerm.length > 0) {
                setShowSuggestions(true);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get all articles for suggestions
    const allArticles = useMemo(() => {
        const articles: KnowledgeBaseArticleMeta[] = [];
        categories.forEach(category => {
            // Add category articles
            if (category.articles) {
                articles.push(...category.articles);
            }
            // Add section articles
            category.sections?.forEach(section => {
                if (section.articles) {
                    articles.push(...section.articles);
                }
            });
        });
        return articles;
    }, [categories]);

    // Filter articles for suggestions
    const suggestionArticles = useMemo(() => {
        if (!debouncedSearchTerm) return [];
        const lowercasedFilter = debouncedSearchTerm.toLowerCase();
        return allArticles.filter(article => 
            article.title.toLowerCase().includes(lowercasedFilter)
        );
    }, [allArticles, debouncedSearchTerm]);

    const filteredCategories = useMemo(() => {
        if (!searchTerm) {
            return categories;
        }

        const lowercasedFilter = searchTerm.toLowerCase();

        return categories
            .map(category => {
                const lowercasedTitle = category.title.toLowerCase();
                const categoryTitleMatch = lowercasedTitle.includes(lowercasedFilter);

                const sectionsWithMatchingArticles = (category.sections || []).filter(section => {
                    const sectionTitleMatch = section.title.toLowerCase().includes(lowercasedFilter);
                    const articleTitleMatch = (section.articles || []).some(article =>
                        article.title.toLowerCase().includes(lowercasedFilter)
                    );
                    return sectionTitleMatch || articleTitleMatch;
                });

                const articlesMatch = (category.articles || []).some(article =>
                    article.title.toLowerCase().includes(lowercasedFilter)
                );

                if (categoryTitleMatch) {
                    return category;
                }

                if (sectionsWithMatchingArticles.length > 0) {
                    return { ...category, sections: sectionsWithMatchingArticles };
                }

                if (articlesMatch) {
                    return { ...category, sections: [] }; // Return category if articles match, even with no sections
                }

                return null;
            })
            .filter((category): category is KnowledgeBaseCategory => category !== null);
    }, [categories, searchTerm]);

    const items = filteredCategories.map(category => {
        const children = (category.sections || []).map(section => ({
            key: section.id,
            label: searchTerm ? highlightText(section.title, searchTerm) : section.title,
            style: { paddingLeft: 30 },
        }));

        // If there are no sections, show articles directly under the category
        if (children.length === 0 && category.articles) {
            const articleChildren = category.articles.map(article => ({
                key: article.id,
                label: searchTerm ? highlightText(article.title, searchTerm) : article.title,
                style: { paddingLeft: 30 },
            }));
            children.push(...articleChildren);
        }

        return {
            key: category.id,
            label: (
                <Flex justify='flex-start' align='center' gap="small">
                    <CategoryIcon icon={category.icon} style={{ fontSize: 16, color: selectedCategory?.id === category.id ? token.colorTextBase : token.colorTextSecondary }} />
                    <Text style={{ margin: 'unset', color: selectedCategory?.id === category.id ? token.colorTextBase : token.colorTextSecondary }}>
                        {searchTerm ? highlightText(category.title, searchTerm) : category.title}
                    </Text>
                </Flex>
            ),
            children: children.length > 0 ? children : undefined,
        };
    });

    const handleArticleSelectFromSuggestion = useCallback((article: KnowledgeBaseArticleMeta) => {
        onArticleSelect(article);
        setShowSuggestions(false);
        setSearchTerm(''); // Clear search after selection
    }, [onArticleSelect]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Flex align="flex-start" gap="small" style={{ marginBottom: 16, position: 'relative' }} ref={searchContainerRef}>
                <Button aria-label="Knowledge base home" onClick={resetSelection} icon={<LuHome />} />
                <div style={{ position: 'relative', flex: 1 }}>
                    <Input.Search
                        placeholder="Search articles, categories..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => searchTerm && setShowSuggestions(true)}
                        allowClear
                    />
                    {showSuggestions && debouncedSearchTerm && (
                        <SearchSuggestions
                            searchTerm={debouncedSearchTerm}
                            suggestions={suggestionArticles}
                            onArticleSelect={handleArticleSelectFromSuggestion}
                            onClose={() => setShowSuggestions(false)}
                        />
                    )}
                </div>
            </Flex>
            <Menu
                mode="inline"
                items={items}
                defaultOpenKeys={searchTerm ? filteredCategories.map(c => c.id) : [selectedCategory?.id || '']}
                selectedKeys={[selectedArticle?.id || selectedKnowledgeBaseSection?.id || '']}
                onClick={({ key }) => {
                    for (const category of categories) {
                        if (category.id === key) {
                            onCategorySelect(category);
                            return;
                        }

                        if (category.sections) {
                            for (const section of category.sections) {
                                if (section.id === key) {
                                    onKnowledgeBaseSectionSelect(section);
                                    return;
                                }
                                const article = section.articles?.find(a => a.id === key);
                                if (article) {
                                    onArticleSelect(article);
                                    return;
                                }
                            }
                        }

                        const article = category.articles?.find(a => a.id === key);
                        if (article) {
                            onArticleSelect(article);
                            return;
                        }
                    }
                }}
                style={{ height: '100%' }}
            />
        </div>
    );
};

export default HelpSidebar;
