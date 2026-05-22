'use client';

import { deleteArticle, getArticleById, getArticlesByCategoryId, getArticlesBySectionId } from "@database/knowledgeBase/articles";
import { deleteArticleFromParent, deleteCategory, getCategories, updateArticleInParent, updateCategory } from "@database/knowledgeBase/categories";
import { useAppDispatch } from "@hook/useAppDispatch";
import AISearchModal from "@organisms/AISearchModal";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { Alert, Flex, FloatButton, Form, Grid, Layout, message, Modal, Splitter, Typography } from "antd";
import { useEffect, useState } from "react";
import { LuBookOpen, LuMessageCircle, LuView } from "react-icons/lu";
import ArticleModal from "./ArticleModal";
import ArticlePane from "./ArticlePane";
import CategoryModal from "./CategoryModal";
import CategoryPane from "./CategoryPane";
import KnowledgeBaseModal from './KnowledgeBaseModal';
import SectionModal from "./SectionModal";
import SectionPane from "./SectionPane";

const { Title, Paragraph } = Typography;

function PlatformKnowledgeBase() {
    const dispatch = useAppDispatch()
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | null>(null);
    const [selectedSection, setSelectedSection] = useState<KnowledgeBaseSection | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticleType | null>(null);
    const [isArticleModalVisible, setIsArticleModalVisible] = useState(false);
    const [editingArticle, setEditingArticle] = useState<KnowledgeBaseArticleType | null>(null);
    const [showTextSearchModal, setShowTextSearchModal] = useState(false);
    const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
    const [isArticleLoading, setIsArticleLoading] = useState(false);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    const [form] = Form.useForm();
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [isSectionModalVisible, setIsSectionModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<KnowledgeBaseCategory | null>(null);
    const [editingSection, setEditingSection] = useState<KnowledgeBaseSection | null>(null);
    const [categoryForm] = Form.useForm();
    const [sectionForm] = Form.useForm();

    const fetchCategories = async () => {
        setIsCategoriesLoading(true);
        dispatch(startLoader("Fetching knowledge base categories"));
        try {
            const categoriesResult = await getCategories();
            if (categoriesResult) {
                setCategoriesData(categoriesResult);
            }
        } catch (error) {
            message.error("Failed to fetch knowledge base categories.");
        } finally {
            dispatch(stopLoader("Fetching knowledge base categories"));
            setIsCategoriesLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (editingArticle) {
            form.setFieldsValue(editingArticle);
        } else {
            form.resetFields();
        }
    }, [editingArticle, form]);

    useEffect(() => {
        if (editingCategory) {
            categoryForm.setFieldsValue(editingCategory);
        } else {
            categoryForm.resetFields();
        }
    }, [editingCategory, categoryForm]);


    const handleCategorySelect = async (category: KnowledgeBaseCategory) => {
        const sortedSections = category.sections ? [...category.sections].sort((a, b) => a.index - b.index) : [];
        const sortedCategory = {
            ...category,
            sections: sortedSections,
        };
        setSelectedCategory(sortedCategory);
        setSelectedSection(null);
        setSelectedArticle(null);
    };

    const handleSectionSelect = (section: KnowledgeBaseSection) => {
        setSelectedSection(section);
        setSelectedArticle(null);
    };

    const handleArticleSelect = async (articleMeta: KnowledgeBaseArticleMeta) => {
        dispatch(startLoader('Fetching article content'));
        setIsArticleLoading(true);
        try {
            const fullArticle = await getArticleById(articleMeta.id);
            if (fullArticle) {
                handleEditArticle(fullArticle);
            } else {
                message.error('Could not find the selected article.');
            }
        } catch (error) {
            message.error('Failed to fetch article content.');
        } finally {
            dispatch(stopLoader('Fetching article content'));
            setIsArticleLoading(false);
        }
    };

    const handleEditArticle = (article: KnowledgeBaseArticleType) => {
        setEditingArticle(article);
        setIsArticleModalVisible(true);
    };

    const handleAddArticle = () => {
        if (!selectedCategory) {
            message.warning('Please select a category first.');
            return;
        }
        setEditingArticle(null);
        form.resetFields();
        setIsArticleModalVisible(true);
    };

    const handleArticleSuccess = async (article: KnowledgeBaseArticleType) => {
        dispatch(startLoader('Updating article metadata'));
        try {
            if (categoriesData) {
                const updatedCategoriesData = await updateArticleInParent(categoriesData, article.categoryId, article, article.sectionId);
                if (updatedCategoriesData) {
                    setCategoriesData(updatedCategoriesData);

                    // Refresh selected category/section to reflect the change
                    if (selectedCategory?.id === article.categoryId) {
                        setSelectedCategory(updatedCategoriesData.categories[article.categoryId]);
                    }
                    if (selectedSection?.id === article.sectionId) {
                        const cat = updatedCategoriesData.categories[article.categoryId];
                        const sec = cat.sections.find(s => s.id === article.sectionId);
                        if (sec) setSelectedSection(sec);
                    }
                    setSelectedArticle(article);
                    message.success('Article saved successfully!');
                }
            }
        } catch (error) {
            message.error('Failed to update article metadata in parent.');
        } finally {
            dispatch(stopLoader('Updating article metadata'));
            setIsArticleModalVisible(false);
            setEditingArticle(null);
        }
    };

    const handleCategorySuccess = (updatedCategories: KnowledgeBaseCategoriesType) => {
        setCategoriesData(updatedCategories);
        const updatedCategory = editingCategory ? updatedCategories.categories[editingCategory.id] : null;
        if (updatedCategory) {
            const sortedSections = updatedCategory.sections ? [...updatedCategory.sections].sort((a, b) => a.index - b.index) : [];
            setSelectedCategory({ ...updatedCategory, sections: sortedSections });
        }
        setIsCategoryModalVisible(false);
        setEditingCategory(null);
    };

    const handleSectionSuccess = (updatedCategories: KnowledgeBaseCategoriesType) => {
        setCategoriesData(updatedCategories);
        if (selectedCategory) {
            const updatedCategoryData = updatedCategories.categories[selectedCategory.id];
            const sortedSections = updatedCategoryData.sections ? [...updatedCategoryData.sections].sort((a, b) => a.index - b.index) : [];
            const updatedSelectedCategory = { ...updatedCategoryData, sections: sortedSections };
            setSelectedCategory(updatedSelectedCategory);

            if (editingSection) {
                const updatedSection = updatedSelectedCategory.sections.find(s => s.id === editingSection.id);
                if (updatedSection) {
                    setSelectedSection(updatedSection);
                }
            }
        }
        setIsSectionModalVisible(false);
        setEditingSection(null);
    };

    const handleDelete = (type: 'category' | 'section' | 'article', id: string) => {
        Modal.confirm({
            title: `Are you sure you want to delete this ${type}?`,
            content: 'This action cannot be undone.',
            onOk: async () => {
                dispatch(startLoader(`Deleting ${type}`))
                try {
                    if (type === 'article' && selectedCategory && categoriesData) {
                        await deleteArticle(id);
                        const updatedCategoriesData = await deleteArticleFromParent(categoriesData, selectedCategory.id, id, selectedSection?.id);
                        if (updatedCategoriesData) {
                            setCategoriesData(updatedCategoriesData);
                        }

                        if (selectedArticle?.id === id) setSelectedArticle(null);
                    } else if (type === 'section' && selectedCategory && categoriesData) {
                        const articlesToDelete = await getArticlesBySectionId(id);
                        if (articlesToDelete) {
                            await Promise.all(articlesToDelete.map(a => deleteArticle(a.id)));
                        }
                        const newCategoriesData = { ...categoriesData.categories };
                        const updatedSections = newCategoriesData[selectedCategory.id].sections.filter(s => s.id !== id);
                        newCategoriesData[selectedCategory.id].sections = updatedSections;
                        await updateCategory(newCategoriesData[selectedCategory.id]);

                        setCategoriesData({ categories: newCategoriesData });
                        setSelectedCategory(newCategoriesData[selectedCategory.id]);

                        if (selectedSection?.id === id) {
                            setSelectedSection(null);
                            setSelectedArticle(null);
                        }
                    } else if (type === 'category' && categoriesData) {
                        const articlesToDelete = await getArticlesByCategoryId(id);
                        if (articlesToDelete) {
                            await Promise.all(articlesToDelete.map(a => deleteArticle(a.id)));
                        }
                        const newCategoriesData = { ...categoriesData.categories };
                        delete newCategoriesData[id];
                        await deleteCategory({ categories: newCategoriesData });

                        setCategoriesData({ categories: newCategoriesData });

                        if (selectedCategory?.id === id) {
                            setSelectedCategory(null);
                            setSelectedSection(null);
                            setSelectedArticle(null);
                        }
                    }
                    message.success(`${type} deleted successfully!`);
                } catch (error) {
                    message.error(`Failed to delete ${type}.`);
                } finally {
                    dispatch(stopLoader(`Deleting ${type}`))
                }
            }
        });
    };

    const categoriesList = categoriesData ? Object.values(categoriesData.categories).sort((a, b) => a.index - b.index) : [];

    const categoryPane = (
        <CategoryPane
            isLoading={isCategoriesLoading}
            categories={categoriesList}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            onAddCategory={() => {
                setEditingCategory(null);
                setIsCategoryModalVisible(true);
            }}
            onEditCategory={(cat) => {
                setEditingCategory(cat);
                setIsCategoryModalVisible(true);
            }}
            onDeleteCategory={(id) => handleDelete('category', id)}
        />
    );

    const sectionPane = (
        <SectionPane
            isLoading={isCategoriesLoading && !categoriesData}
            selectedCategory={selectedCategory}
            selectedSection={selectedSection}
            onSectionSelect={handleSectionSelect}
            onAddSection={() => {
                setEditingSection(null);
                sectionForm.setFieldsValue({
                    title: '',
                    description: '',
                    url: '',
                    active: true,
                    index: selectedCategory?.sections?.length ?? 0
                });
                setIsSectionModalVisible(true);
            }}
            onEditSection={(sec) => {
                setEditingSection(sec);
                sectionForm.setFieldsValue(sec);
                setIsSectionModalVisible(true);
            }}
            onDeleteSection={(id) => handleDelete('section', id)}
        />
    );

    const articlePane = (
        <ArticlePane
            selectedContainer={selectedSection || selectedCategory}
            articles={selectedSection?.articles || selectedCategory?.articles || []}
            selectedArticle={selectedArticle}
            onArticleSelect={handleArticleSelect}
            onAddArticle={handleAddArticle}
            onEditArticle={handleArticleSelect}
            onDeleteArticle={(id) => handleDelete('article', id)}
            isArticleLoading={isArticleLoading}
        />
    );

    return (
        <Layout style={{ minHeight: '100dvh', padding: isMobile ? 12 : 16 }}>
            <Flex vertical gap={4} style={{ marginBottom: 16 }}>
                <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Knowledge Base</Title>
                <Paragraph type="secondary" style={{ margin: 0 }}>
                    Organize the articles that power help-center browsing, widget answers, and product-surface context.
                </Paragraph>
            </Flex>
            {isMobile ? (
                <Flex vertical gap={12}>
                    <Alert
                        type="info"
                        showIcon
                        message="Work top to bottom"
                        description="Choose a category, choose a section when needed, then add or edit articles for that area."
                    />
                    <div style={{ minHeight: 280, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>{categoryPane}</div>
                    <div style={{ minHeight: 240, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>{sectionPane}</div>
                    <div style={{ minHeight: 300, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>{articlePane}</div>
                </Flex>
            ) : (
                <Splitter style={{ flex: 1, minHeight: 'calc(100dvh - 104px)', width: '100%' }}>
                    <Splitter.Panel defaultSize="33%" min={300}>
                        {categoryPane}
                    </Splitter.Panel>
                    <Splitter.Panel defaultSize="33%" min={300}>
                        {sectionPane}
                    </Splitter.Panel>
                    <Splitter.Panel min={300}>
                        {articlePane}
                    </Splitter.Panel>
                </Splitter>
            )}
            <FloatButton.Group
                trigger="click"
                type="primary"
                style={{ insetInlineEnd: 24 }}
                icon={<LuView />}
            >
                <FloatButton onClick={() => setShowKnowledgeBase(true)} icon={<LuBookOpen />} />
                <FloatButton onClick={() => setShowTextSearchModal(true)} icon={<LuMessageCircle />} />
            </FloatButton.Group>
            <CategoryModal
                open={isCategoryModalVisible}
                editingCategory={editingCategory}
                categoriesData={categoriesData}
                form={categoryForm}
                onOk={() => categoryForm.submit()}
                onCancel={() => {
                    setIsCategoryModalVisible(false);
                    setEditingCategory(null);
                }}
                onSuccess={handleCategorySuccess}
            />
            <ArticleModal
                open={isArticleModalVisible}
                editingArticle={editingArticle}
                form={form}
                onOk={() => form.submit()}
                onCancel={() => {
                    setIsArticleModalVisible(false);
                    setEditingArticle(null);
                }}
                onSuccess={handleArticleSuccess}
                selectedCategory={selectedCategory}
                selectedSection={selectedSection}
                categoriesData={categoriesData}
            />
            <SectionModal
                open={isSectionModalVisible}
                editingSection={editingSection}
                form={sectionForm}
                onOk={() => sectionForm.submit()}
                onCancel={() => {
                    setIsSectionModalVisible(false);
                    setEditingSection(null);
                }}
                onSuccess={handleSectionSuccess}
                categoriesData={categoriesData}
                selectedCategory={selectedCategory}
            />
            <AISearchModal
                initialCategories={categoriesData}
                open={showTextSearchModal}
                onClose={() => setShowTextSearchModal(false)}
            />
            <KnowledgeBaseModal
                categoriesData={categoriesData}
                isOpen={showKnowledgeBase}
                onClose={() => setShowKnowledgeBase(false)}
            />
        </Layout>
    );
}

export default PlatformKnowledgeBase;
