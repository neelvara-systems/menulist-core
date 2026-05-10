'use client';
import { getCategories } from '@database/knowledgeBase/categories';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import { Breadcrumb, Empty, Flex, Grid, message, Typography } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import Articles from './Articles';
import Categories from './Categories';
import HelpSidebar from './HelpSidebar';
import OnThisPage from './OnThisPage';
import Sections from './Sections';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const KnowledgeBaseExplorer = ({ from = "", initialCategoryData = null }) => {
    const screens = useBreakpoint();
    const dispatch = useAppDispatch();
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(initialCategoryData);
    const [articles, setArticles] = useState<KnowledgeBaseArticleMeta[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | null>(null);
    const [selectedKnowledgeBaseSection, setSelectedKnowledgeBaseSection] = useState<KnowledgeBaseSection | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticleMeta | null>(null);
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const isModalView = from == "modal";

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
        setSelectedArticle(article);
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
                const categoriesResult = cachedKBCategories?.kBCategories || await getCategories();
                if (categoriesResult) {
                    setCategoriesData(categoriesResult);
                    setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: categoriesResult });
                }
            } catch (error) {
                message.error('Failed to fetch knowledge base categories.');
            } finally {
                dispatch(stopLoader('Fetching knowledge base categories'));
            }
        };
        if (Boolean(initialCategoryData)) {
            setCategoriesData(initialCategoryData);
        } else {
            fetchCategories();
        }
    }, [dispatch]);

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

    const renderContent = () => {
        if (selectedKnowledgeBaseSection) {
            return <Articles parent={selectedKnowledgeBaseSection} articles={articles} />;
        }
        if (selectedCategory) {
            return (
                <>
                    {selectedCategory.sections && selectedCategory.sections.length > 0 && (
                        <Sections category={selectedCategory} onSectionSelect={handleKnowledgeBaseSectionSelect} />
                    )}
                    {articles.length > 0 && <Articles parent={selectedCategory} articles={articles} />}
                </>
            );
        }
        return <Categories categories={categoriesData ? Object.values(categoriesData.categories) : []} onCategorySelect={handleCategorySelect} />;
    };

    const breadcrumbItems = [
        { title: <a onClick={resetSelection}>Help Center</a> },
        selectedCategory && { title: <a onClick={() => handleCategorySelect(selectedCategory as KnowledgeBaseCategory)}>{selectedCategory.title}</a> },
        selectedKnowledgeBaseSection && { title: selectedKnowledgeBaseSection.title },
    ].filter(Boolean);

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
                        {selectedCategory && <Breadcrumb items={breadcrumbItems as any} />}
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
