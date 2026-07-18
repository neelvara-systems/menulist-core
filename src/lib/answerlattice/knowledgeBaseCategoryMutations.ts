import type {
    KnowledgeBaseArticleMeta,
    KnowledgeBaseCategory,
    KnowledgeBaseSection,
    KbCategoriesMap,
} from '@type/knowledgeBase';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

const MAX_NAVIGATION_INDEX = 1_000_000;
const UNSAFE_NAVIGATION_URL_PATTERN = /(?:^[a-z][a-z\d+.-]*:|^\/\/|\\|[\u0000-\u001f\u007f])/i;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const requireText = (value: unknown, field: string, maxLength: number): string => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || normalized.length > maxLength) {
        throw new Error(`answerlattice_kb_${field}_invalid`);
    }
    return normalized;
};

const requireIndex = (value: unknown): number => {
    if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_NAVIGATION_INDEX) {
        throw new Error('answerlattice_kb_navigation_index_invalid');
    }
    return value as number;
};

const requireActive = (value: unknown): boolean => {
    if (typeof value !== 'boolean') throw new Error('answerlattice_kb_navigation_active_invalid');
    return value;
};

const requireNavigationUrl = (value: unknown): string => {
    const normalized = requireText(value, 'navigation_url', 500);
    if (UNSAFE_NAVIGATION_URL_PATTERN.test(normalized)) {
        throw new Error('answerlattice_kb_navigation_url_invalid');
    }
    return normalized;
};

export const requireKnowledgeBaseNavigationId = (value: unknown): string => {
    const id = typeof value === 'string' ? value.trim() : '';
    if (id !== value || id.length > 180 || !isValidFirestoreDocumentId(id)) {
        throw new Error('answerlattice_kb_navigation_id_invalid');
    }
    return id;
};

export const normalizeKnowledgeBaseCategoryInput = (value: unknown): KnowledgeBaseCategory => {
    if (!isRecord(value)) throw new Error('answerlattice_kb_category_input_invalid');
    return {
        id: requireKnowledgeBaseNavigationId(value.id),
        title: requireText(value.title, 'category_title', 160),
        description: requireText(value.description, 'category_description', 2_000),
        icon: requireText(value.icon, 'category_icon', 100),
        url: requireNavigationUrl(value.url),
        active: requireActive(value.active),
        index: requireIndex(value.index),
    };
};

export const normalizeKnowledgeBaseSectionInput = (value: unknown): KnowledgeBaseSection => {
    if (!isRecord(value)) throw new Error('answerlattice_kb_section_input_invalid');
    return {
        id: requireKnowledgeBaseNavigationId(value.id),
        title: requireText(value.title, 'section_title', 160),
        description: requireText(value.description, 'section_description', 2_000),
        url: requireNavigationUrl(value.url),
        active: requireActive(value.active),
        index: requireIndex(value.index),
    };
};

export const normalizeKnowledgeBaseArticleMetaInput = (value: unknown): KnowledgeBaseArticleMeta => {
    if (!isRecord(value)) throw new Error('answerlattice_kb_article_meta_input_invalid');
    return {
        id: requireKnowledgeBaseNavigationId(value.id),
        title: requireText(value.title, 'article_title', 240),
        url: requireNavigationUrl(value.url),
        active: requireActive(value.active),
        index: requireIndex(value.index),
    };
};

const requireStoredCategory = (
    categories: KbCategoriesMap,
    categoryId: string,
): KnowledgeBaseCategory => {
    const category = categories[categoryId];
    if (!isRecord(category) || category.id !== categoryId) {
        throw new Error(category
            ? 'answerlattice_kb_categories_document_invalid'
            : 'answerlattice_kb_category_not_found');
    }
    return category;
};

const requireOptionalArray = <T>(value: T[] | null | undefined, field: string): T[] => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new Error(`answerlattice_kb_${field}_invalid`);
    return value;
};

export const addKnowledgeBaseCategory = (
    categories: KbCategoriesMap,
    category: KnowledgeBaseCategory,
): KbCategoriesMap => {
    if (categories[category.id]) throw new Error('answerlattice_kb_category_already_exists');
    return { ...categories, [category.id]: category };
};

export const updateKnowledgeBaseCategoryMetadata = (
    categories: KbCategoriesMap,
    category: KnowledgeBaseCategory,
): KbCategoriesMap => {
    const current = requireStoredCategory(categories, category.id);
    const { articles: _staleArticles, sections: _staleSections, ...metadata } = category;
    return {
        ...categories,
        [category.id]: {
            ...current,
            ...metadata,
        },
    };
};

export const deleteKnowledgeBaseCategory = (
    categories: KbCategoriesMap,
    categoryId: string,
): KbCategoriesMap => {
    requireStoredCategory(categories, categoryId);
    const next = { ...categories };
    delete next[categoryId];
    return next;
};

export const upsertKnowledgeBaseSection = (
    categories: KbCategoriesMap,
    categoryId: string,
    section: KnowledgeBaseSection,
): KbCategoriesMap => {
    const category = requireStoredCategory(categories, categoryId);
    const sections = requireOptionalArray(category.sections, 'sections_document');
    const existingIndex = sections.findIndex((item) => item.id === section.id);
    const nextSection = existingIndex < 0
        ? section
        : {
            ...sections[existingIndex],
            ...section,
            ...(Array.isArray(sections[existingIndex].articles)
                ? { articles: sections[existingIndex].articles }
                : {}),
        };
    const nextSections = existingIndex < 0
        ? [...sections, nextSection]
        : sections.map((item, index) => index === existingIndex ? nextSection : item);
    return {
        ...categories,
        [categoryId]: { ...category, sections: nextSections },
    };
};

export const deleteKnowledgeBaseSection = (
    categories: KbCategoriesMap,
    categoryId: string,
    sectionId: string,
): KbCategoriesMap => {
    const category = requireStoredCategory(categories, categoryId);
    const sections = requireOptionalArray(category.sections, 'sections_document');
    if (!sections.some((section) => section.id === sectionId)) {
        throw new Error('answerlattice_kb_section_not_found');
    }
    return {
        ...categories,
        [categoryId]: {
            ...category,
            sections: sections.filter((section) => section.id !== sectionId),
        },
    };
};

export const upsertKnowledgeBaseArticleMeta = (
    categories: KbCategoriesMap,
    categoryId: string,
    article: KnowledgeBaseArticleMeta,
    sectionId?: string | null,
): KbCategoriesMap => {
    const category = requireStoredCategory(categories, categoryId);
    if (!sectionId) {
        const articles = requireOptionalArray(category.articles, 'articles_document');
        const existingIndex = articles.findIndex((item) => item.id === article.id);
        const nextArticles = existingIndex < 0
            ? [...articles, article]
            : articles.map((item, index) => index === existingIndex ? article : item);
        return { ...categories, [categoryId]: { ...category, articles: nextArticles } };
    }

    const sections = requireOptionalArray(category.sections, 'sections_document');
    const sectionIndex = sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) throw new Error('answerlattice_kb_section_not_found');
    const nextSections = sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        const articles = requireOptionalArray(section.articles, 'articles_document');
        const existingIndex = articles.findIndex((item) => item.id === article.id);
        return {
            ...section,
            articles: existingIndex < 0
                ? [...articles, article]
                : articles.map((item, articleIndex) => articleIndex === existingIndex ? article : item),
        };
    });
    return { ...categories, [categoryId]: { ...category, sections: nextSections } };
};

export const deleteKnowledgeBaseArticleMeta = (
    categories: KbCategoriesMap,
    categoryId: string,
    articleId: string,
    sectionId?: string | null,
): KbCategoriesMap => {
    const category = requireStoredCategory(categories, categoryId);
    if (!sectionId) {
        return {
            ...categories,
            [categoryId]: {
                ...category,
                articles: requireOptionalArray(category.articles, 'articles_document').filter((item) => item.id !== articleId),
            },
        };
    }

    const sections = requireOptionalArray(category.sections, 'sections_document');
    const sectionIndex = sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) throw new Error('answerlattice_kb_section_not_found');
    return {
        ...categories,
        [categoryId]: {
            ...category,
            sections: sections.map((section, index) => index === sectionIndex
                ? {
                    ...section,
                    articles: requireOptionalArray(section.articles, 'articles_document')
                        .filter((item) => item.id !== articleId),
                }
                : section),
        },
    };
};
