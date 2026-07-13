import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, getDoc, setDoc } from "@firebase/firestore";
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { normalizeAnswerlatticeScopeDocumentId } from "@lib/answerlattice/sessionScope";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseSection } from "@type/knowledgeBase";
import { updateList } from "@util/utils";

const COLLECTION = DB_COLLECTIONS.KB_CATEGORIES;
const LEGACY_CATEGORIES_DOC_ID = 'categories';

type KnowledgeBaseCategorySessionLookup = {
    failed: boolean;
    session: Awaited<ReturnType<typeof getActiveSession>> | null;
};

type KnowledgeBaseCategoryScope = {
    tId: number;
    sId: number;
};

export type KnowledgeBaseCategoryWriteResult = KnowledgeBaseCategoriesType['categories'][string] & {
    success: true;
};

export type KnowledgeBaseCategoriesMutationResult = KnowledgeBaseCategoriesType & {
    success: true;
    categoryCount: number;
    mutation: 'deleteCategory' | 'updateArticleInParent' | 'deleteArticleFromParent';
    categoryId?: string;
    articleId?: string;
    sectionId?: string | null;
};

export const getKnowledgeBaseCategoriesDocId = (tId?: unknown, sId?: unknown) => {
    const tenantId = normalizeAnswerlatticeScopeDocumentId(tId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(sId);
    if (tenantId && storeId) {
        return `categories_${tenantId}_${storeId}`;
    }
    return LEGACY_CATEGORIES_DOC_ID;
};

const getKnowledgeBaseCategoryScope = (source: unknown): KnowledgeBaseCategoryScope | null => {
    const record = source as any;
    const tId = normalizeAnswerlatticeScopeDocumentId(record?.tId ?? record?.tenantId ?? record?.user?.tenantId);
    const sId = normalizeAnswerlatticeScopeDocumentId(record?.sId ?? record?.storeId ?? record?.user?.storeId);
    if (!tId || !sId) return null;
    return { tId, sId };
};

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const resolveKnowledgeBaseCategorySession = async (operation: string): Promise<KnowledgeBaseCategorySessionLookup> => {
    try {
        return {
            failed: false,
            session: await getActiveSession(),
        };
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_kb_categories_session_lookup_failed',
            error,
            getBoundedAnswerlatticeStringContext('operation', operation),
        );
        return {
            failed: true,
            session: null,
        };
    }
};

const getDocRef = async () => {
    const { session } = await resolveKnowledgeBaseCategorySession('doc_ref');
    const scope = getKnowledgeBaseCategoryScope(session);
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, getKnowledgeBaseCategoriesDocId(scope?.tId, scope?.sId))
}

const bumpKnowledgeBaseVersionForSession = async (reason: string, sourceId?: string) => {
    const { session } = await resolveKnowledgeBaseCategorySession('cache_version_bump');
    const scope = getKnowledgeBaseCategoryScope(session);
    if (!scope) {
        throw new Error('Cannot update Answerlattice KB cache version without tenant and store scope.');
    }

    await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId, {
        reason,
        sourceId,
        sourceType: 'kb_category',
    });

    return scope;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const withCategoriesMutationResult = (
    data: KnowledgeBaseCategoriesType,
    mutation: KnowledgeBaseCategoriesMutationResult['mutation'],
    metadata: Pick<KnowledgeBaseCategoriesMutationResult, 'categoryId' | 'articleId' | 'sectionId'> = {},
): KnowledgeBaseCategoriesMutationResult => ({
    ...data,
    success: true,
    categoryCount: Object.keys(data.categories || {}).length,
    mutation,
    ...metadata,
});

export function assertKnowledgeBaseCategoryWriteSucceeded(
    result: unknown,
    expectedCategoryId: string,
    rejectionCode = 'knowledge_base_category_write_rejected',
): asserts result is KnowledgeBaseCategoryWriteResult {
    if (!isRecord(result) || result.success !== true || result.id !== expectedCategoryId) {
        throw new Error(rejectionCode);
    }
}

export function assertKnowledgeBaseCategoriesMutationSucceeded(
    result: unknown,
    expectedMutation: KnowledgeBaseCategoriesMutationResult['mutation'],
    rejectionCode = 'knowledge_base_categories_mutation_rejected',
): asserts result is KnowledgeBaseCategoriesMutationResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.mutation !== expectedMutation
        || !isRecord(result.categories)
        || typeof result.categoryCount !== 'number'
    ) {
        throw new Error(rejectionCode);
    }
}

export const getCategories = async () => {
    return await apiCallComposer(
        async () => {
            const { failed: sessionLookupFailed, session } = await resolveKnowledgeBaseCategorySession('get_categories');
            if (sessionLookupFailed) {
                return null;
            }
            const scope = getKnowledgeBaseCategoryScope(session);
            const isPlatform = session?.platformRole === 'PLATFORM';
            if (!scope && !isPlatform) {
                return null;
            }
            const scopedDocId = getKnowledgeBaseCategoriesDocId(scope?.tId, scope?.sId);
            const docRef = doc(answerlatticeFirebaseClient, `${COLLECTION}`, scopedDocId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const scopedData = docSnap.data();
                return isRecord(scopedData.categories)
                    ? { categories: scopedData.categories as KnowledgeBaseCategoriesType['categories'] }
                    : null;
            }
            if (scopedDocId !== LEGACY_CATEGORIES_DOC_ID && isPlatform) {
                const legacyDocSnap = await getDoc(doc(answerlatticeFirebaseClient, `${COLLECTION}`, LEGACY_CATEGORIES_DOC_ID));
                if (legacyDocSnap.exists()) {
                    const legacyData = legacyDocSnap.data() as KnowledgeBaseCategoriesType;
                    const filteredCategories = Object.fromEntries(
                        Object.entries(legacyData.categories || {}).filter(([, category]: any) => {
                            const categoryTenantId = normalizeAnswerlatticeScopeDocumentId(category?.tId);
                            const categoryStoreId = normalizeAnswerlatticeScopeDocumentId(category?.sId);
                            if (scope && categoryTenantId && categoryStoreId) {
                                return categoryTenantId === scope.tId && categoryStoreId === scope.sId;
                            }
                            return true;
                        })
                    );
                    return { categories: filteredCategories };
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
            return withCategoriesMutationResult(data, 'deleteCategory');
        },
        data,
        "deleteCategory"
    );
}

export const addCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await answerlatticeRequestBodyComposer(category, { isNew: true });
            const scope = await bumpKnowledgeBaseVersionForSession('category_create', composedCategory.id);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'addCategory');
            return {
                ...composedCategory,
                success: true,
            } satisfies KnowledgeBaseCategoryWriteResult;
        },
        category,
        "addCategory"
    );
}

export const updateCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await answerlatticeRequestBodyComposer(category, { isNew: false });
            const scope = await bumpKnowledgeBaseVersionForSession('category_update', composedCategory.id);
            await setDoc(docRef, { categories: { [composedCategory.id]: composedCategory } }, { merge: true });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateCategory');
            return {
                ...composedCategory,
                success: true,
            } satisfies KnowledgeBaseCategoryWriteResult;
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
    return withCategoriesMutationResult(updatedData, 'updateArticleInParent', { categoryId });
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
                    return withCategoriesMutationResult(updatedData, 'updateArticleInParent', {
                        articleId: article.id,
                        categoryId,
                        sectionId,
                    });
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
                        const updatedData = await _updateSectionArticles(categoriesData, categoryId, sectionIndex, articles, docRef);
                        return {
                            ...updatedData,
                            mutation: 'deleteArticleFromParent',
                            articleId,
                            sectionId,
                        } satisfies KnowledgeBaseCategoriesMutationResult;
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
                    return withCategoriesMutationResult(updatedData, 'deleteArticleFromParent', {
                        articleId,
                        categoryId,
                        sectionId,
                    });
                }
            }
            return null;
        },
        { categoryId, sectionId, articleId },
        "deleteArticleFromParent"
    );
};
