'use client';
import { useAppDispatch } from '@hook/useAppDispatch';
import { normalizeHelpCenterRouteSegment } from '@constant/navigations';
import { useKBCategoriesCache } from '@hook/useKBCategoriesCache';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import { Breadcrumb, Empty, Flex, Grid, message, Typography } from 'antd';
import type { BreadcrumbProps } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import Articles from './Articles';
import Categories from './Categories';
import HelpSidebar from './HelpSidebar';
import OnThisPage from './OnThisPage';
import Sections from './Sections';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface KnowledgeBaseExplorerProps {
    from?: string;
    initialArticleId?: string;
    initialCategoryData?: KnowledgeBaseCategoriesType | null;
}

const KnowledgeBaseExplorer = ({ from = "", initialArticleId, initialCategoryData = null }: KnowledgeBaseExplorerProps) => {
    const screens = useBreakpoint();
    const dispatch = useAppDispatch();
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(initialCategoryData);
    const [articles, setArticles] = useState<KnowledgeBaseArticleMeta[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | null>(null);
    const [selectedKnowledgeBaseSection, setSelectedKnowledgeBaseSection] = useState<KnowledgeBaseSection | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticleMeta | null>(null);
    const { getCategoriesCached, setCategoriesCache } = useKBCategoriesCache();
    const initialArticleAppliedRef = useRef(false);

    const isModalView = from == "modal";

    const findArticleLocation = useCallback((articleId: string, data: KnowledgeBaseCategoriesType | null = categoriesData) => {
        const categories = Object.values(data?.categories || {});
        const requestedSegment = normalizeHelpCenterRouteSegment(articleId);
        const matchesArticle = (article: KnowledgeBaseArticleMeta) => {
            return article.id === articleId
                || article.url === articleId
                || normalizeHelpCenterRouteSegment(article.url) === requestedSegment
                || normalizeHelpCenterRouteSegment(article.title) === requestedSegment;
        };

        for (const category of categories) {
            const directArticle = category.articles?.find(matchesArticle);
            if (directArticle) {
                return { article: directArticle, category, section: null };
            }

            for (const section of category.sections || []) {
                const sectionArticle = section.articles?.find(matchesArticle);
                if (sectionArticle) {
                    return { article: sectionArticle, category, section };
                }
            }
        }

        return null;
    }, [categoriesData]);

    const selectArticleById = useCallback((articleId: string, data: KnowledgeBaseCategoriesType | null = categoriesData) => {
        const location = findArticleLocation(articleId, data);
        if (!location) return false;

        setSelectedCategory(location.category);
        setSelectedKnowledgeBaseSection(location.section);
        setSelectedArticle(location.article);
        return true;
    }, [categoriesData, findArticleLocation]);

    const handleCategorySelect = (category: KnowledgeBaseCategory) => {
        setSelectedCategory(category);
        setSelectedKnowledgeBaseSection(null);
        setSelectedArticle(null);
    };

    const handleKnowledgeBaseSectionSelect = (section: KnowledgeBaseSection) => {
        setSelectedKnowledgeBaseSection(section);
        setSelectedArticle(null);
    };

    const handleArticleSelect = (article: KnowledgeBaseArticleMeta) => {
        if (!selectArticleById(article.id)) {
            setSelectedArticle(article);
        }
    };

    const resetSelection = () => {
        setSelectedCategory(null);
        setSelectedKnowledgeBaseSection(null);
        setSelectedArticle(null);
    };

    useEffect(() => {
        const fetchCategories = async () => {
            dispatch(startLoader('Fetching knowledge base categories'));
            try {
                const categoriesResult = await getCategoriesCached();
                if (categoriesResult) {
                    setCategoriesData(categoriesResult);
                }
            } catch (error) {
                message.error('Failed to fetch knowledge base categories.');
            } finally {
                dispatch(stopLoader('Fetching knowledge base categories'));
            }
        };
        if (Boolean(initialCategoryData)) {
            setCategoriesData(initialCategoryData);
            setCategoriesCache(initialCategoryData);
        } else {
            fetchCategories();
        }
    }, [dispatch, getCategoriesCached, initialCategoryData, setCategoriesCache]);

    useEffect(() => {
        // Use articles already embedded in category/section structure
        if (selectedKnowledgeBaseSection?.articles) {
            setArticles(selectedKnowledgeBaseSection.articles);
        } else if (selectedCategory?.articles) {
            setArticles(selectedCategory.articles);
        } else {
            setArticles([]);
        }
    }, [selectedKnowledgeBaseSection, selectedCategory]);

    useEffect(() => {
        if (!initialArticleId || !categoriesData || initialArticleAppliedRef.current) return;

        initialArticleAppliedRef.current = selectArticleById(initialArticleId, categoriesData);
    }, [categoriesData, initialArticleId, selectArticleById]);

    const renderContent = () => {
        if (selectedKnowledgeBaseSection) {
            return <Articles activeArticleId={selectedArticle?.id} parent={selectedKnowledgeBaseSection} articles={articles} />;
        }
        if (selectedCategory) {
            return (
                <>
                    {selectedCategory.sections && selectedCategory.sections.length > 0 && (
                        <Sections category={selectedCategory} onSectionSelect={handleKnowledgeBaseSectionSelect} />
                    )}
                    {articles.length > 0 && <Articles activeArticleId={selectedArticle?.id} parent={selectedCategory} articles={articles} />}
                </>
            );
        }
        return <Categories categories={categoriesData ? Object.values(categoriesData.categories) : []} onCategorySelect={handleCategorySelect} />;
    };

    const breadcrumbItems: BreadcrumbProps['items'] = [
        { title: <a onClick={resetSelection}>Help Center</a> },
        ...(selectedCategory ? [{ title: <a onClick={() => handleCategorySelect(selectedCategory)}>{selectedCategory.title}</a> }] : []),
        ...(selectedKnowledgeBaseSection ? [{ title: selectedKnowledgeBaseSection.title }] : []),
    ];

    return (
        <>
            {!categoriesData && <><Empty /></>}
            {!isModalView ? (
                <Flex style={{ marginBottom: 16 }} vertical>
                    <Title level={3} style={{ margin: 0 }}>Knowledge Base</Title>
                </Flex>
            ) : null}
            <Flex style={{ width: '100%' }} justify="space-between">
                {selectedCategory && screens.lg && (
                    <div style={{ width: '25%', paddingRight: '24px', position: 'sticky', top: isModalView ? 15 : 74, height: 'fit-content' }}>
                        <HelpSidebar
                            categories={categoriesData ? Object.values(categoriesData.categories) : []}
                            selectedCategory={selectedCategory}
                            selectedKnowledgeBaseSection={selectedKnowledgeBaseSection}
                            selectedArticle={selectedArticle}
                            onCategorySelect={handleCategorySelect}
                            onKnowledgeBaseSectionSelect={handleKnowledgeBaseSectionSelect}
                            onArticleSelect={handleArticleSelect}
                            resetSelection={resetSelection}
                        />
                    </div>
                )}
                <div style={{ flex: 1, maxWidth: '100%' }} id="knowledge-base-content">
                    <Flex vertical gap="large">
                        {selectedCategory && <Breadcrumb items={breadcrumbItems} />}
                        {renderContent()}
                    </Flex>
                </div>
                {(selectedKnowledgeBaseSection || (selectedCategory && articles.length > 0)) && screens.lg && (
                    <div style={{ width: '20.83%', paddingLeft: '24px', position: 'sticky', top: isModalView ? 15 : 74, height: 'fit-content' }}>
                        <OnThisPage articles={articles} from={from} />
                    </div>
                )}
            </Flex>
        </>
    );
};

export default KnowledgeBaseExplorer;
