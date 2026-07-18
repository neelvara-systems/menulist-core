import type {
    IngestionJobArticle,
    IngestionJobCategoriesMap,
    IngestionJobCategory,
    IngestionJobSection,
    KnowledgeBaseArticleMeta,
    KnowledgeBaseCategory,
    KnowledgeBaseSection,
    KbCategoriesMap,
} from '@type/knowledgeBase';
import { requireKnowledgeBaseNavigationId } from './knowledgeBaseCategoryMutations';

const requireCategory = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
): IngestionJobCategory => {
    const category = categories[categoryId];
    if (!category || category.id !== categoryId) {
        throw new Error('answerlattice_kb_generation_category_not_found');
    }
    return category;
};

const requireSections = (category: IngestionJobCategory): IngestionJobSection[] => {
    if (category.sections === undefined) return [];
    if (!Array.isArray(category.sections)) throw new Error('answerlattice_kb_generation_sections_invalid');
    return category.sections;
};

const requireArticles = (
    articles: IngestionJobArticle[] | undefined,
): IngestionJobArticle[] => {
    if (articles === undefined) return [];
    if (!Array.isArray(articles)) throw new Error('answerlattice_kb_generation_articles_invalid');
    return articles;
};

const markArticlesForEmbedding = (articles: IngestionJobArticle[] | undefined) => (
    requireArticles(articles).map((article) => ({ ...article, reEmbedding: true }))
);

const requireReviewText = (value: unknown, field: string): string => {
    if (typeof value !== 'string') throw new Error(`answerlattice_kb_generation_${field}_invalid`);
    return value;
};

const normalizeReviewIndex = (value: unknown, fallback: number) => (
    typeof value === 'number' && Number.isSafeInteger(value) ? value : fallback
);

export const deleteKnowledgeBaseReviewCategory = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
): IngestionJobCategoriesMap => {
    const id = requireKnowledgeBaseNavigationId(categoryId);
    requireCategory(categories, id);
    const next = { ...categories };
    delete next[id];
    return next;
};

export const deleteKnowledgeBaseReviewSection = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
    sectionId: string,
): IngestionJobCategoriesMap => {
    const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
    const normalizedSectionId = requireKnowledgeBaseNavigationId(sectionId);
    const category = requireCategory(categories, normalizedCategoryId);
    const sections = requireSections(category);
    if (!sections.some((section) => section.id === normalizedSectionId)) {
        throw new Error('answerlattice_kb_generation_section_not_found');
    }
    return {
        ...categories,
        [normalizedCategoryId]: {
            ...category,
            sections: sections.filter((section) => section.id !== normalizedSectionId),
        },
    };
};

export const deleteKnowledgeBaseReviewArticle = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
    articleId: string,
    sectionId?: string | null,
): IngestionJobCategoriesMap => {
    const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
    const normalizedArticleId = requireKnowledgeBaseNavigationId(articleId);
    const normalizedSectionId = sectionId ? requireKnowledgeBaseNavigationId(sectionId) : null;
    const category = requireCategory(categories, normalizedCategoryId);
    if (!normalizedSectionId) {
        return {
            ...categories,
            [normalizedCategoryId]: {
                ...category,
                articles: requireArticles(category.articles).filter((article) => article.id !== normalizedArticleId),
            },
        };
    }
    const sections = requireSections(category);
    const sectionIndex = sections.findIndex((section) => section.id === normalizedSectionId);
    if (sectionIndex < 0) throw new Error('answerlattice_kb_generation_section_not_found');
    return {
        ...categories,
        [normalizedCategoryId]: {
            ...category,
            sections: sections.map((section, index) => index === sectionIndex
                ? {
                    ...section,
                    articles: requireArticles(section.articles).filter((article) => article.id !== normalizedArticleId),
                }
                : section),
        },
    };
};

export const updateKnowledgeBaseReviewCategory = (
    categories: IngestionJobCategoriesMap,
    input: KnowledgeBaseCategory,
): IngestionJobCategoriesMap => {
    const categoryId = requireKnowledgeBaseNavigationId(input.id);
    const category = requireCategory(categories, categoryId);
    return {
        ...categories,
        [categoryId]: {
            ...category,
            title: input.title,
            description: input.description,
            icon: input.icon,
            active: input.active,
            index: input.index,
            url: input.url,
            ...(category.sections?.length ? {
                sections: requireSections(category).map((section) => ({
                    ...section,
                    articles: markArticlesForEmbedding(section.articles),
                })),
            } : {}),
            ...(!category.sections?.length && category.articles?.length ? {
                articles: markArticlesForEmbedding(category.articles),
            } : {}),
        },
    };
};

export const updateKnowledgeBaseReviewSection = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
    input: KnowledgeBaseSection,
): IngestionJobCategoriesMap => {
    const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
    const sectionId = requireKnowledgeBaseNavigationId(input.id);
    const category = requireCategory(categories, normalizedCategoryId);
    const sections = requireSections(category);
    const sectionIndex = sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) throw new Error('answerlattice_kb_generation_section_not_found');
    return {
        ...categories,
        [normalizedCategoryId]: {
            ...category,
            sections: sections.map((section, index) => index === sectionIndex
                ? {
                    ...section,
                    title: input.title,
                    description: input.description,
                    active: input.active,
                    index: input.index,
                    url: input.url,
                    articles: markArticlesForEmbedding(section.articles),
                }
                : section),
        },
    };
};

export const upsertKnowledgeBaseReviewArticle = (
    categories: IngestionJobCategoriesMap,
    categoryId: string,
    article: KnowledgeBaseArticleMeta,
    sectionId?: string | null,
): IngestionJobCategoriesMap => {
    const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
    const normalizedArticleId = requireKnowledgeBaseNavigationId(article.id);
    const normalizedSectionId = sectionId ? requireKnowledgeBaseNavigationId(sectionId) : null;
    const category = requireCategory(categories, normalizedCategoryId);
    const articleForReview: IngestionJobArticle = {
        ...article,
        id: normalizedArticleId,
        reEmbedding: true,
    };
    const upsert = (articles: IngestionJobArticle[] | undefined) => {
        const current = requireArticles(articles);
        const index = current.findIndex((item) => item.id === normalizedArticleId);
        return index < 0
            ? [...current, articleForReview]
            : current.map((item, itemIndex) => itemIndex === index ? { ...item, ...articleForReview } : item);
    };
    if (!normalizedSectionId) {
        return {
            ...categories,
            [normalizedCategoryId]: { ...category, articles: upsert(category.articles) },
        };
    }
    const sections = requireSections(category);
    const sectionIndex = sections.findIndex((section) => section.id === normalizedSectionId);
    if (sectionIndex < 0) throw new Error('answerlattice_kb_generation_section_not_found');
    return {
        ...categories,
        [normalizedCategoryId]: {
            ...category,
            sections: sections.map((section, index) => index === sectionIndex
                ? { ...section, articles: upsert(section.articles) }
                : section),
        },
    };
};

export const toKnowledgeBaseReviewNavigation = (
    categories: IngestionJobCategoriesMap,
): KbCategoriesMap => Object.fromEntries(Object.entries(categories).map(([categoryKey, category], categoryIndex) => {
    const categoryId = requireKnowledgeBaseNavigationId(categoryKey);
    if (!category || requireKnowledgeBaseNavigationId(category.id) !== categoryId) {
        throw new Error('answerlattice_kb_generation_category_invalid');
    }
    const toArticleMeta = (article: IngestionJobArticle, articleIndex: number): KnowledgeBaseArticleMeta => ({
        id: requireKnowledgeBaseNavigationId(article.id),
        title: requireReviewText(article.title, 'article_title'),
        active: article.active !== false,
        index: normalizeReviewIndex(article.index, articleIndex),
        url: typeof article.url === 'string' ? article.url : '',
    });
    return [categoryId, {
        id: categoryId,
        title: requireReviewText(category.title, 'category_title'),
        description: requireReviewText(category.description, 'category_description'),
        icon: typeof category.icon === 'string' ? category.icon : '',
        active: category.active !== false,
        index: normalizeReviewIndex(category.index, categoryIndex),
        url: typeof category.url === 'string' ? category.url : '',
        articles: requireArticles(category.articles).map(toArticleMeta),
        sections: requireSections(category).map((section, sectionIndex) => ({
            id: requireKnowledgeBaseNavigationId(section.id),
            title: requireReviewText(section.title, 'section_title'),
            description: requireReviewText(section.description, 'section_description'),
            active: section.active !== false,
            index: normalizeReviewIndex(section.index, sectionIndex),
            url: typeof section.url === 'string' ? section.url : '',
            articles: requireArticles(section.articles).map(toArticleMeta),
        })),
    }];
}));
