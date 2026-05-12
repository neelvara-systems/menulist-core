import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseSection } from "@type/knowledgeBase";
import { updateList } from "@util/utils";

const COLLECTION = DB_COLLECTIONS.KB_CATEGORIES;
const LEGACY_CATEGORIES_DOC_ID = 'categories';

export const getKnowledgeBaseCategoriesDocId = (tId?: unknown, sId?: unknown) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (Number.isFinite(tenantId) && Number.isFinite(storeId) && tenantId > 0 && storeId > 0) {
        return `categories_${tenantId}_${storeId}`;
    }
    return LEGACY_CATEGORIES_DOC_ID;
};

const getCollectionRef = async () => {
    return collection(canonicaFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async () => {
    const session = await getActiveSession().catch(() => null);
    return doc(canonicaFirebaseClient, `${COLLECTION}`, getKnowledgeBaseCategoriesDocId(session?.tId, session?.sId))
}

export const getCategories = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession().catch(() => null);
            const scopedDocId = getKnowledgeBaseCategoriesDocId(session?.tId, session?.sId);
            const docRef = doc(canonicaFirebaseClient, `${COLLECTION}`, scopedDocId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
            if (scopedDocId !== LEGACY_CATEGORIES_DOC_ID) {
                const legacyDocSnap = await getDoc(doc(canonicaFirebaseClient, `${COLLECTION}`, LEGACY_CATEGORIES_DOC_ID));
                if (legacyDocSnap.exists()) {
                    const legacyData = legacyDocSnap.data() as KnowledgeBaseCategoriesType;
                    const filteredCategories = Object.fromEntries(
                        Object.entries(legacyData.categories || {}).filter(([, category]: any) => {
                            const categoryTenantId = Number(category?.tId);
                            const categoryStoreId = Number(category?.sId);
                            if (Number.isFinite(categoryTenantId) && Number.isFinite(categoryStoreId)) {
                                return categoryTenantId === Number(session?.tId) && categoryStoreId === Number(session?.sId);
                            }
                            return session?.platformRole === 'PLATFORM';
                        })
                    );
                    return { categories: filteredCategories, id: legacyDocSnap.id };
                }
            }
            return null;
        },
        "getCategories"
    );
}

export const deleteCategory = async (data: any) => {
    return await apiCallComposer(
        async () => {
            await setDoc(await getDocRef(), data);
            return data;
        },
        data,
        "deleteCategory"
    );
}

export const addCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await canonicaRequestBodyComposer(category);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            return composedCategory;
        },
        category,
        "addCategory"
    );
}

export const updateCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await canonicaRequestBodyComposer(category);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            return composedCategory;
        },
        category,
        "updateCategory"
    );
}

const _updateSectionArticles = async (
    categoriesData: KnowledgeBaseCategoriesType,
    categoryId: string,
    sectionIndex: number,
    articles: KnowledgeBaseArticleMeta[],
    docRef: any
) => {
    const category = categoriesData.categories[categoryId];
    const updatedSections = [...category.sections];
    const updatedSection = {
        ...updatedSections[sectionIndex],
        articles: articles,
    };
    updatedSections[sectionIndex] = updatedSection;

    const updatedCategory = {
        ...category,
        sections: updatedSections,
    };
    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });

    const updatedData = { ...categoriesData };
    updatedData.categories[categoryId] = updatedCategory;
    return updatedData;
};

export const updateArticleInParent = async (categoriesData: KnowledgeBaseCategoriesType, categoryId: string, article: KnowledgeBaseArticleType, sectionId?: string | null) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const category = categoriesData.categories[categoryId];

            if (category) {
                if (sectionId) {
                    const sectionIndex = category.sections.findIndex((s: KnowledgeBaseSection) => s.id === sectionId);
                    if (sectionIndex !== -1) {
                        const section = category.sections[sectionIndex];
                        let articles = section.articles ? [...section.articles] : [];
                        const articleMeta: KnowledgeBaseArticleMeta = {
                            id: article.id,
                            active: article.active,
                            title: article.title,
                            index: article.index,
                            url: article.url,
                        };

                        articles = updateList(articles, articleMeta, "last", "id");
                        return await _updateSectionArticles(categoriesData, categoryId, sectionIndex, articles, docRef);
                    }
                } else {
                    // Handle articles directly under a category
                    let articles = category.articles ? [...category.articles] : [];
                    const articleMeta: KnowledgeBaseArticleMeta = {
                        id: article.id,
                        active: article.active,
                        title: article.title,
                        index: article.index,
                        url: article.url,
                    };

                    articles = updateList(articles, articleMeta, "last", "id");
                    const updatedCategory = {
                        ...category,
                        articles,
                    };
                    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });

                    const updatedData = { ...categoriesData };
                    updatedData.categories[categoryId] = updatedCategory;
                    return updatedData;
                }
            }
            return null;
        },
        { categoryId, sectionId, article },
        "updateArticleInParent"
    );
};

export const deleteArticleFromParent = async (
    categoriesData: KnowledgeBaseCategoriesType,
    categoryId: string,
    articleId: string,
    sectionId?: string | null
) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const category = categoriesData.categories[categoryId];

            if (category) {
                if (sectionId) {
                    const sectionIndex = category.sections.findIndex((s: KnowledgeBaseSection) => s.id === sectionId);
                    if (sectionIndex !== -1) {
                        const section = category.sections[sectionIndex];
                        const articles = section.articles ? section.articles.filter((a: KnowledgeBaseArticleMeta) => a.id !== articleId) : [];
                        return await _updateSectionArticles(categoriesData, categoryId, sectionIndex, articles, docRef);
                    }
                } else {
                    const articles = category.articles ? category.articles.filter((a: KnowledgeBaseArticleMeta) => a.id !== articleId) : [];
                    const updatedCategory = {
                        ...category,
                        articles,
                    };
                    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });

                    const updatedData = { ...categoriesData };
                    updatedData.categories[categoryId] = updatedCategory;
                    return updatedData;
                }
            }
            return null;
        },
        { categoryId, sectionId, articleId },
        "deleteArticleFromParent"
    );
};
