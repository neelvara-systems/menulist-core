import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
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
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async () => {
    const session = await getActiveSession().catch(() => null);
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, getKnowledgeBaseCategoriesDocId(session?.tId, session?.sId))
}

const bumpKnowledgeBaseVersionForSession = async (reason: string, sourceId?: string) => {
    const session = await getActiveSession().catch(() => null);
    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    if (!Number.isFinite(tId) || tId <= 0 || !Number.isFinite(sId) || sId <= 0) {
        throw new Error('Cannot update Answerlattice KB cache version without tenant and store scope.');
    }

    await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.KB, tId, sId, {
        reason,
        sourceId,
        sourceType: 'kb_category',
    });

    return { tId, sId };
};

export const getCategories = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession().catch(() => null);
            const scopedDocId = getKnowledgeBaseCategoriesDocId(session?.tId, session?.sId);
            const docRef = doc(answerlatticeFirebaseClient, `${COLLECTION}`, scopedDocId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
            if (scopedDocId !== LEGACY_CATEGORIES_DOC_ID && session?.platformRole === 'PLATFORM') {
                const legacyDocSnap = await getDoc(doc(answerlatticeFirebaseClient, `${COLLECTION}`, LEGACY_CATEGORIES_DOC_ID));
                if (legacyDocSnap.exists()) {
                    const legacyData = legacyDocSnap.data() as KnowledgeBaseCategoriesType;
                    const filteredCategories = Object.fromEntries(
                        Object.entries(legacyData.categories || {}).filter(([, category]: any) => {
                            const categoryTenantId = Number(category?.tId);
                            const categoryStoreId = Number(category?.sId);
                            if (Number.isFinite(categoryTenantId) && Number.isFinite(categoryStoreId)) {
                                return categoryTenantId === Number(session?.tId) && categoryStoreId === Number(session?.sId);
                            }
                            return true;
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
            const scope = await bumpKnowledgeBaseVersionForSession('category_delete');
            await setDoc(await getDocRef(), data);
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'deleteCategory');
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
            const composedCategory = await answerlatticeRequestBodyComposer(category);
            const scope = await bumpKnowledgeBaseVersionForSession('category_create', composedCategory.id);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'addCategory');
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
            const composedCategory = await answerlatticeRequestBodyComposer(category);
            const scope = await bumpKnowledgeBaseVersionForSession('category_update', composedCategory.id);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateCategory');
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
    const scope = await bumpKnowledgeBaseVersionForSession('category_section_articles_update', categoryId);
    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });
    await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateSectionArticles');

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
                    const scope = await bumpKnowledgeBaseVersionForSession('category_article_link_update', categoryId);
                    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });
                    await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateArticleInParent');

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
                    const scope = await bumpKnowledgeBaseVersionForSession('category_article_link_delete', categoryId);
                    await setDoc(docRef, { categories: { [categoryId]: updatedCategory } }, { merge: true });
                    await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'deleteArticleFromParent');

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
