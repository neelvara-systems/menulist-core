import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc, runTransaction } from "@firebase/firestore";
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { appendAnswerlatticeCacheInvalidation } from "@lib/answerlattice/cacheVersionClient";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { normalizeAnswerlatticeScopeDocumentId } from "@lib/answerlattice/sessionScope";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import {
    addKnowledgeBaseCategory,
    assertKnowledgeBaseCategoriesMapBounds,
    deleteKnowledgeBaseArticleMeta,
    deleteKnowledgeBaseCategory,
    deleteKnowledgeBaseSection,
    normalizeKnowledgeBaseArticleMetaInput,
    normalizeKnowledgeBaseCategoryInput,
    normalizeKnowledgeBaseSectionInput,
    requireKnowledgeBaseNavigationId,
    updateKnowledgeBaseCategoryMetadata,
    upsertKnowledgeBaseArticleMeta,
    upsertKnowledgeBaseSection,
} from '@lib/answerlattice/knowledgeBaseCategoryMutations';
import { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";

const COLLECTION = DB_COLLECTIONS.KB_CATEGORIES;
const LEGACY_CATEGORIES_DOC_ID = 'categories';
const MAX_DENORMALIZED_TITLE_UPDATES = 100;

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
    categories: KnowledgeBaseCategoriesType['categories'];
};

export type KnowledgeBaseCategoriesMutationResult = KnowledgeBaseCategoriesType & {
    success: true;
    categoryCount: number;
    mutation: 'deleteCategory' | 'upsertSection' | 'deleteSection' | 'updateArticleInParent' | 'deleteArticleFromParent';
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

const getDocRef = (scope: KnowledgeBaseCategoryScope) => doc(
    answerlatticeFirebaseClient,
    `${COLLECTION}`,
    getKnowledgeBaseCategoriesDocId(scope.tId, scope.sId),
);

const getRequiredKnowledgeBaseCategoryScope = async (operation: string): Promise<KnowledgeBaseCategoryScope> => {
    const { failed, session } = await resolveKnowledgeBaseCategorySession(operation);
    const scope = failed ? null : getKnowledgeBaseCategoryScope(session);
    if (!scope) throw new Error('answerlattice_kb_category_scope_invalid');
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

const requireCategoriesMap = (value: unknown): KnowledgeBaseCategoriesType['categories'] => {
    if (!isRecord(value)) throw new Error('answerlattice_kb_categories_document_invalid');
    return value as KnowledgeBaseCategoriesType['categories'];
};

const mutateCategories = async (
    scope: KnowledgeBaseCategoryScope,
    invalidation: { reason: string; sourceId?: string },
    mutate: (current: KnowledgeBaseCategoriesType['categories']) => KnowledgeBaseCategoriesType['categories'],
): Promise<KnowledgeBaseCategoriesType> => runTransaction(answerlatticeFirebaseClient, async (transaction) => {
    const categoryRef = getDocRef(scope);
    const snapshot = await transaction.get(categoryRef);
    const current = snapshot.exists()
        ? requireCategoriesMap(snapshot.data().categories)
        : {};
    const next = mutate(current);
    assertKnowledgeBaseCategoriesMapBounds(next);
    appendAnswerlatticeCacheInvalidation(transaction, ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId, {
        ...invalidation,
        sourceType: 'kb_category',
    });
    if (snapshot.exists()) transaction.update(categoryRef, { categories: next });
    else transaction.set(categoryRef, { categories: next });
    return { categories: next };
});

const getCategoryArticleIds = (category: KnowledgeBaseCategory) => Array.from(new Set([
    ...(category.articles || []).map(article => article.id),
    ...(category.sections || []).flatMap(section => (section.articles || []).map(article => article.id)),
]));

const mutateCategoriesWithArticleTitlePropagation = async (
    scope: KnowledgeBaseCategoryScope,
    invalidation: { reason: string; sourceId?: string },
    resolveArticleIds: (current: KnowledgeBaseCategoriesType['categories']) => string[],
    mutate: (current: KnowledgeBaseCategoriesType['categories']) => KnowledgeBaseCategoriesType['categories'],
    articleUpdate: Record<string, unknown>,
    articleMatches: (article: KnowledgeBaseArticleType) => boolean,
): Promise<KnowledgeBaseCategoriesType> => {
    return runTransaction(answerlatticeFirebaseClient, async (transaction) => {
        const categoryRef = getDocRef(scope);
        const categorySnapshot = await transaction.get(categoryRef);
        if (!categorySnapshot.exists()) throw new Error('answerlattice_kb_categories_document_not_found');
        const current = requireCategoriesMap(categorySnapshot.data().categories);
        const articleIds = Array.from(new Set(resolveArticleIds(current)));
        if (articleIds.length > MAX_DENORMALIZED_TITLE_UPDATES) {
            throw new Error('answerlattice_kb_title_propagation_too_large');
        }
        const next = assertKnowledgeBaseCategoriesMapBounds(mutate(current));
        const articleRefs = articleIds.map(articleId => doc(
            answerlatticeFirebaseClient,
            DB_COLLECTIONS.KB_ARTICLES,
            requireKnowledgeBaseNavigationId(articleId),
        ));
        const articleSnapshots = await Promise.all(articleRefs.map(articleRef => transaction.get(articleRef)));
        articleSnapshots.forEach((articleSnapshot, index) => {
            if (!articleSnapshot.exists()) {
                throw new Error(`Knowledge base navigation references missing article ${articleIds[index]}.`);
            }
            const article = { ...articleSnapshot.data(), id: articleSnapshot.id } as KnowledgeBaseArticleType;
            if (
                article.pId !== 'AL'
                || normalizeAnswerlatticeScopeDocumentId(article.tId) !== scope.tId
                || normalizeAnswerlatticeScopeDocumentId(article.sId) !== scope.sId
                || !articleMatches(article)
            ) {
                throw new Error(`Knowledge base article ${article.id} is outside this navigation update.`);
            }
        });
        appendAnswerlatticeCacheInvalidation(transaction, ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId, {
            ...invalidation,
            sourceType: 'kb_category',
        });
        transaction.update(categoryRef, { categories: next });
        articleRefs.forEach(articleRef => transaction.update(articleRef, articleUpdate));
        return { categories: next };
    });
};

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

export const deleteCategory = async (data: { categoryId: string }) => {
    return await apiCallComposer(
        async () => {
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_delete');
            const categoryId = requireKnowledgeBaseNavigationId(data?.categoryId);
            const updated = await mutateCategories(scope, { reason: 'category_delete', sourceId: categoryId }, (current) => {
                if (!current[categoryId]) throw new Error('answerlattice_kb_category_not_found');
                return deleteKnowledgeBaseCategory(current, categoryId);
            });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'deleteCategory');
            return withCategoriesMutationResult(updated, 'deleteCategory', { categoryId });
        },
        data,
        "deleteCategory"
    );
}

export const addCategory = async (category: KnowledgeBaseCategory) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategory = normalizeKnowledgeBaseCategoryInput(category);
            const composedCategory = await answerlatticeRequestBodyComposer(normalizedCategory, { isNew: true });
            const categoryId = normalizedCategory.id;
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_create');
            const updated = await mutateCategories(scope, { reason: 'category_create', sourceId: categoryId }, (current) => addKnowledgeBaseCategory(
                current,
                composedCategory as KnowledgeBaseCategory,
            ));
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'addCategory');
            return {
                ...composedCategory,
                success: true,
                categories: updated.categories,
            } satisfies KnowledgeBaseCategoryWriteResult;
        },
        category,
        "addCategory"
    );
}

export const updateCategory = async (category: KnowledgeBaseCategory) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategory = normalizeKnowledgeBaseCategoryInput(category);
            const composedCategory = await answerlatticeRequestBodyComposer(normalizedCategory, { isNew: false });
            const categoryId = normalizedCategory.id;
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_update');
            const updated = await mutateCategoriesWithArticleTitlePropagation(
                scope,
                { reason: 'category_update', sourceId: categoryId },
                current => {
                    const storedCategory = current[categoryId];
                    if (!storedCategory) throw new Error('answerlattice_kb_category_not_found');
                    return getCategoryArticleIds(storedCategory);
                },
                current => updateKnowledgeBaseCategoryMetadata(current, composedCategory as KnowledgeBaseCategory),
                { categoryTitle: normalizedCategory.title },
                article => article.categoryId === categoryId,
            );
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateCategory');
            return {
                ...composedCategory,
                success: true,
                categories: updated.categories,
            } satisfies KnowledgeBaseCategoryWriteResult;
        },
        category,
        "updateCategory"
    );
}

export const upsertSectionInCategory = async (categoryId: string, section: KnowledgeBaseSection) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
            const normalizedSection = normalizeKnowledgeBaseSectionInput(section);
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_section_upsert');
            const updated = await mutateCategoriesWithArticleTitlePropagation(
                scope,
                { reason: 'category_section_upsert', sourceId: normalizedCategoryId },
                current => {
                    const storedCategory = current[normalizedCategoryId];
                    if (!storedCategory) throw new Error('answerlattice_kb_category_not_found');
                    const storedSection = storedCategory.sections?.find(item => item.id === normalizedSection.id);
                    return (storedSection?.articles || []).map(article => article.id);
                },
                current => upsertKnowledgeBaseSection(current, normalizedCategoryId, normalizedSection),
                { sectionTitle: normalizedSection.title },
                article => article.categoryId === normalizedCategoryId && article.sectionId === normalizedSection.id,
            );
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'upsertSectionInCategory');
            return withCategoriesMutationResult(updated, 'upsertSection', {
                categoryId: normalizedCategoryId,
                sectionId: normalizedSection.id,
            });
        },
        { categoryId, section },
        'upsertSectionInCategory',
    );
};

export const deleteSectionFromCategory = async (categoryId: string, sectionId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
            const normalizedSectionId = requireKnowledgeBaseNavigationId(sectionId);
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_section_delete');
            const updated = await mutateCategories(scope, { reason: 'category_section_delete', sourceId: normalizedCategoryId }, (current) => deleteKnowledgeBaseSection(
                current,
                normalizedCategoryId,
                normalizedSectionId,
            ));
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'deleteSectionFromCategory');
            return withCategoriesMutationResult(updated, 'deleteSection', {
                categoryId: normalizedCategoryId,
                sectionId: normalizedSectionId,
            });
        },
        { categoryId, sectionId },
        'deleteSectionFromCategory',
    );
};

export const updateArticleInParent = async (_categoriesData: KnowledgeBaseCategoriesType, categoryId: string, article: KnowledgeBaseArticleType, sectionId?: string | null) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
            const articleMeta = normalizeKnowledgeBaseArticleMetaInput(article);
            const articleId = articleMeta.id;
            const normalizedSectionId = sectionId ? requireKnowledgeBaseNavigationId(sectionId) : null;
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_article_link_update');
            const updated = await mutateCategories(scope, { reason: 'category_article_link_update', sourceId: normalizedCategoryId }, (current) => {
                return upsertKnowledgeBaseArticleMeta(current, normalizedCategoryId, articleMeta, normalizedSectionId);
            });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'updateArticleInParent');
            return withCategoriesMutationResult(updated, 'updateArticleInParent', {
                articleId,
                categoryId: normalizedCategoryId,
                sectionId: normalizedSectionId,
            });
        },
        { categoryId, sectionId, article },
        "updateArticleInParent"
    );
};

export const deleteArticleFromParent = async (
    _categoriesData: KnowledgeBaseCategoriesType,
    categoryId: string,
    articleId: string,
    sectionId?: string | null
) => {
    return await apiCallComposer(
        async () => {
            const normalizedCategoryId = requireKnowledgeBaseNavigationId(categoryId);
            const normalizedArticleId = requireKnowledgeBaseNavigationId(articleId);
            const normalizedSectionId = sectionId ? requireKnowledgeBaseNavigationId(sectionId) : null;
            const scope = await getRequiredKnowledgeBaseCategoryScope('category_article_link_delete');
            const updated = await mutateCategories(scope, { reason: 'category_article_link_delete', sourceId: normalizedCategoryId }, (current) => {
                return deleteKnowledgeBaseArticleMeta(
                    current,
                    normalizedCategoryId,
                    normalizedArticleId,
                    normalizedSectionId,
                );
            });
            await revalidateAnswerlatticePublicClientCache(scope, ['kb', 'context'], 'deleteArticleFromParent');
            return withCategoriesMutationResult(updated, 'deleteArticleFromParent', {
                articleId: normalizedArticleId,
                categoryId: normalizedCategoryId,
                sectionId: normalizedSectionId,
            });
        },
        { categoryId, sectionId, articleId },
        "deleteArticleFromParent"
    );
};
