import { DB_COLLECTIONS } from "@constant/database";
import { ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG } from '@constant/answerlattice/ai';
import { collection, deleteField, doc, documentId, getDoc, getDocs, limit, query, QueryConstraint, runTransaction, Timestamp, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { isAnswerlatticeArticleBulkStatus, normalizeAnswerlatticeArticleMutationIds, resolveSingleAnswerlatticeArticleScope } from '@lib/answerlattice/articleMutationBoundary';
import { appendAnswerlatticeCacheInvalidation } from "@lib/answerlattice/cacheVersionClient";
import { getAnswerlatticeScopeLogContext, getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT } from '@lib/answerlattice/faqContent';
import { normalizeAnswerlatticeFaqId } from '@lib/answerlattice/faqIdBoundary';
import {
    assertKnowledgeBaseCategoriesMapBounds,
    normalizeKnowledgeBaseArticleMetaInput,
    removeKnowledgeBaseArticleMetaEverywhere,
    resolveKnowledgeBaseArticlePlacement,
    upsertKnowledgeBaseArticleMeta,
} from '@lib/answerlattice/knowledgeBaseCategoryMutations';
import { normalizeAnswerlatticeScopeDocumentId } from "@lib/answerlattice/sessionScope";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { ANSWERLATTICE_FAQ_STATUS } from '@type/answerlattice';
import { ARTICLE_STATUS, KnowledgeBaseArticleType } from "@type/knowledgeBase";
import type { KbCategoriesMap } from '@type/knowledgeBase';
import { getKnowledgeBaseCategoriesDocId } from './categories';

const COLLECTION = DB_COLLECTIONS.KB_ARTICLES;
const KB_ARTICLE_LIST_LIMIT = 500;
const KB_ARTICLE_ID_QUERY_CHUNK_SIZE = 30;
const ANSWERLATTICE_PRODUCT_ID = 'AL';
const ARTICLE_ENTITY_EXTRACTION_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const ARTICLE_ENTITY_EXTRACTION_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type ReadableArticleScope = {
    isPlatform: boolean;
    tId?: number;
    sId?: number;
};

type ArticleFaqMaintenanceScope = {
    id: string;
    tId?: number;
    sId?: number;
};

type KnowledgeBaseArticleSessionLookup = {
    session: Awaited<ReturnType<typeof getActiveSession>> | null;
};

export type KnowledgeBaseArticleWriteResult = KnowledgeBaseArticleType & {
    navigationCategories?: KbCategoriesMap;
};

type KnowledgeBaseArticleUpdateOptions = {
    mode?: 'live' | 'generation_review';
};

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async (docId: string) => {
    const articleId = normalizeAnswerlatticeKbArticleId(docId);
    if (!articleId) throw new Error('Knowledge base article ID is invalid.');
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, articleId)
}

const getCategoriesDocRef = (scope: { tId: number; sId: number }) => doc(
    answerlatticeFirebaseClient,
    DB_COLLECTIONS.KB_CATEGORIES,
    getKnowledgeBaseCategoriesDocId(scope.tId, scope.sId),
);

const requireCategoriesMap = (value: unknown): KbCategoriesMap => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('answerlattice_kb_categories_document_invalid');
    }
    return assertKnowledgeBaseCategoriesMapBounds(value as KbCategoriesMap);
};

const LIVE_ARTICLE_MUTATION_KEYS = new Set([
    'id',
    'title',
    'content',
    'categoryId',
    'sectionId',
    'url',
    'index',
    'tags',
    'contextKeys',
]);
const MAX_ARTICLE_CONTENT_BYTES = 512 * 1024;

const normalizeArticleStringList = (value: unknown, maxItems: number, maxLength: number, field: string) => {
    if (!Array.isArray(value) || value.length > maxItems) {
        throw new Error(`Knowledge base article ${field} are invalid.`);
    }
    const normalized = value.map(item => typeof item === 'string' ? item.trim() : '');
    if (normalized.some(item => !item || item.length > maxLength)) {
        throw new Error(`Knowledge base article ${field} are invalid.`);
    }
    return Array.from(new Set(normalized));
};

const normalizeArticleContent = (value: unknown) => {
    if (!value || typeof value !== 'object') {
        throw new Error('Knowledge base article content is invalid.');
    }
    let serialized = '';
    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new Error('Knowledge base article content is invalid.');
    }
    if (!serialized || new TextEncoder().encode(serialized).length > MAX_ARTICLE_CONTENT_BYTES) {
        throw new Error('Knowledge base article content is too large.');
    }
    return value;
};

const normalizeLiveArticleMutation = (
    value: Partial<KnowledgeBaseArticleType>,
    options: { isNew: boolean },
): Record<string, unknown> => {
    const source = value as Record<string, unknown>;
    if (Object.keys(source).some(key => !LIVE_ARTICLE_MUTATION_KEYS.has(key))) {
        throw new Error('Knowledge base article update contains unsupported fields.');
    }
    const normalized: Record<string, unknown> = {};
    if (source.id !== undefined) normalized.id = source.id;
    if (source.title !== undefined) {
        const title = typeof source.title === 'string' ? source.title.trim() : '';
        if (!title || title.length > 240) throw new Error('Knowledge base article title is invalid.');
        normalized.title = title;
    }
    if (source.content !== undefined) normalized.content = normalizeArticleContent(source.content);
    if (source.categoryId !== undefined) normalized.categoryId = source.categoryId;
    if (source.sectionId !== undefined) normalized.sectionId = source.sectionId || null;
    if (source.url !== undefined) normalized.url = source.url;
    if (source.index !== undefined) normalized.index = source.index;
    if (source.tags !== undefined) normalized.tags = normalizeArticleStringList(source.tags, 30, 80, 'tags');
    if (source.contextKeys !== undefined) normalized.contextKeys = normalizeArticleStringList(source.contextKeys, 50, 180, 'product surfaces');
    if (options.isNew) {
        for (const requiredField of ['title', 'content', 'categoryId', 'url', 'index']) {
            if (normalized[requiredField] === undefined) {
                throw new Error(`Knowledge base article ${requiredField} is required.`);
            }
        }
    }
    return normalized;
};

const resolveKnowledgeBaseArticleSession = async (operation: string): Promise<KnowledgeBaseArticleSessionLookup> => {
    try {
        return {
            session: await getActiveSession(),
        };
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_kb_articles_session_lookup_failed',
            error,
            getBoundedAnswerlatticeStringContext('operation', operation),
        );
        return {
            session: null,
        };
    }
};

const normalizeKnowledgeBaseArticleScope = (source?: Record<string, unknown> | null) => {
    const tId = normalizeAnswerlatticeScopeDocumentId(source?.tId ?? source?.tenantId);
    const sId = normalizeAnswerlatticeScopeDocumentId(source?.sId ?? source?.storeId);
    if (!tId || !sId) return null;
    return { tId, sId };
};

const normalizeKnowledgeBaseArticleSessionScope = (session: Awaited<ReturnType<typeof getActiveSession>> | null) => {
    const record = session as any;
    return normalizeKnowledgeBaseArticleScope({
        tId: record?.tId ?? record?.tenantId ?? record?.user?.tenantId,
        sId: record?.sId ?? record?.storeId ?? record?.user?.storeId,
    });
};

const resolveReadableArticleScope = async (): Promise<ReadableArticleScope> => {
    const { session } = await resolveKnowledgeBaseArticleSession('resolve_readable_article_scope');
    const scope = normalizeKnowledgeBaseArticleSessionScope(session);
    return {
        isPlatform: (session as any)?.platformRole === 'PLATFORM',
        ...(scope ? { tId: scope.tId, sId: scope.sId } : {}),
    };
};

const getReadableScopeFilters = (scope: ReadableArticleScope): QueryConstraint[] => {
    if (scope.tId && scope.sId) {
        return [
            where("pId", "==", ANSWERLATTICE_PRODUCT_ID),
            where("tId", "==", scope.tId),
            where("sId", "==", scope.sId),
        ];
    }
    if (scope.isPlatform) {
        return [where("pId", "==", ANSWERLATTICE_PRODUCT_ID)];
    }
    if (!scope.tId || !scope.sId) {
        return [];
    }
    return [
        where("pId", "==", ANSWERLATTICE_PRODUCT_ID),
        where("tId", "==", scope.tId),
        where("sId", "==", scope.sId),
    ];
};

const logArticleFaqMaintenanceFailure = (
    failureCode: string,
    error: unknown,
    article: ArticleFaqMaintenanceScope,
) => {
    logAnswerlatticeFailure(failureCode, error, {
        ...getAnswerlatticeScopeLogContext({
            articleId: article.id,
            tId: article.tId,
            sId: article.sId,
        }),
    });
};

type ArticleEntityExtractionResponse = {
    ok: true;
    entityIds: unknown[];
    newCandidateCount: number;
};

const isArticleEntityExtractionResponse = (value: unknown): value is ArticleEntityExtractionResponse => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { ok?: unknown }).ok === true
    && Array.isArray((value as { entityIds?: unknown }).entityIds)
    && typeof (value as { newCandidateCount?: unknown }).newCandidateCount === 'number'
);

const getArticleEntityExtractionResponseLogContext = (
    response: Response,
    article: ArticleFaqMaintenanceScope,
) => ({
    ...getAnswerlatticeScopeLogContext({
        articleId: article.id,
        tId: article.tId,
        sId: article.sId,
    }),
    responseOk: response.ok,
    responseStatus: response.status,
});

const acknowledgeArticleEntityExtractionResponse = async (
    response: Response,
    article: ArticleFaqMaintenanceScope,
): Promise<void> => {
    const context = getArticleEntityExtractionResponseLogContext(response, article);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ARTICLE_ENTITY_EXTRACTION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAnswerlatticeFailure('answerlattice_article_entity_extraction_response_parse_failed', error, context);
        return;
    }

    if (!response.ok) {
        logAnswerlatticeFailure('answerlattice_article_entity_extraction_response_rejected', undefined, context);
        return;
    }

    if (!isArticleEntityExtractionResponse(payload)) {
        logAnswerlatticeFailure('answerlattice_article_entity_extraction_response_invalid', undefined, context);
    }
};

const readableScopeAllowsArticle = (scope: ReadableArticleScope, article: Partial<KnowledgeBaseArticleType> | null | undefined) => {
    if (article?.pId !== ANSWERLATTICE_PRODUCT_ID) return false;
    const record = article as Record<string, unknown> | null | undefined;
    const articleTId = normalizeAnswerlatticeScopeDocumentId(record?.tId ?? record?.tenantId);
    const articleSId = normalizeAnswerlatticeScopeDocumentId(record?.sId ?? record?.storeId);
    if (!articleTId || !articleSId) return false;
    if (scope.isPlatform) {
        return !scope.tId || !scope.sId || (articleTId === scope.tId && articleSId === scope.sId);
    }
    return Boolean(
        scope.tId
        && scope.sId
        && articleTId === scope.tId
        && articleSId === scope.sId
    );
};

const getStoredArticleScope = (article: Partial<KnowledgeBaseArticleType> | null | undefined) => {
    if (article?.pId !== ANSWERLATTICE_PRODUCT_ID) return null;
    return normalizeKnowledgeBaseArticleScope(article as Record<string, unknown> | null);
};

const assertArticleMutationAccess = (
    scope: ReadableArticleScope,
    articleId: string,
    article: Partial<KnowledgeBaseArticleType> | null | undefined,
) => {
    const articleScope = getStoredArticleScope(article);
    if (!articleScope || !readableScopeAllowsArticle(scope, article)) {
        throw new Error(`Knowledge base article ${articleId} is outside this workspace.`);
    }
    return articleScope;
};

const resolveArticleMutationScope = async () => {
    const scope = await resolveReadableArticleScope();
    if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
        throw new Error('Answerlattice workspace scope is not available.');
    }
    return scope;
};

const resolveArticleCreateScope = async (data: Partial<KnowledgeBaseArticleType>) => {
    const scope = await resolveArticleMutationScope();
    const requestedScope = normalizeKnowledgeBaseArticleScope(data as Record<string, unknown>);
    const suppliedScope = data.tId !== undefined || data.sId !== undefined;
    if (suppliedScope && !requestedScope) {
        throw new Error('Knowledge base article workspace is invalid.');
    }
    if (scope.isPlatform) {
        const target = requestedScope || (scope.tId && scope.sId ? { tId: scope.tId, sId: scope.sId } : null);
        if (!target) throw new Error('Select an Answerlattice workspace before creating an article.');
        return target;
    }
    if (!scope.tId || !scope.sId) throw new Error('Answerlattice workspace scope is not available.');
    if (requestedScope && (requestedScope.tId !== scope.tId || requestedScope.sId !== scope.sId)) {
        throw new Error('Knowledge base article workspace does not match the active session.');
    }
    return { tId: scope.tId, sId: scope.sId };
};

/**
 * @deprecated Use getArticlesByCategoryId() or getArticlesBySectionId() instead.
 * Kept for backward compatibility. Non-platform callers are still scoped to
 * the active tenant/store so future imports cannot accidentally read globally.
 */
export const getArticles = async () => {
    return await apiCallComposer(
        async () => {
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters = getReadableScopeFilters(scope);
            const q = query(await getCollectionRef(), ...filters, limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                const article = { ...doc.data(), id: doc.id } as KnowledgeBaseArticleType;
                if (readableScopeAllowsArticle(scope, article)) {
                    list.push(article);
                }
            });
            return list;
        },
        "getArticles"
    );
}

export const addArticle = async (data: Omit<KnowledgeBaseArticleType, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const targetScope = await resolveArticleCreateScope(data);
            const normalizedMutation = normalizeLiveArticleMutation(data, { isNew: true });
            const submitData = await answerlatticeRequestBodyComposer({
                ...normalizedMutation,
                active: true,
                status: ARTICLE_STATUS.PUBLISHED,
                tags: normalizedMutation.tags || [],
                contextKeys: normalizedMutation.contextKeys || [],
                sources: null,
                jobId: 'manual',
                likes: 0,
                dislikes: 0,
                embeddingStatus: 'pending',
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
            }, { isNew: true }) as Record<string, any>;
            const docRef = doc(await getCollectionRef());
            const result = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const categoriesRef = getCategoriesDocRef(targetScope);
                const categoriesSnapshot = await transaction.get(categoriesRef);
                if (!categoriesSnapshot.exists()) throw new Error('answerlattice_kb_categories_document_not_found');
                const categories = requireCategoriesMap(categoriesSnapshot.data().categories);
                const placement = resolveKnowledgeBaseArticlePlacement(
                    categories,
                    submitData.categoryId,
                    submitData.sectionId,
                );
                const article = {
                    ...submitData,
                    ...placement,
                    id: docRef.id,
                } as unknown as KnowledgeBaseArticleType;
                const articleMeta = normalizeKnowledgeBaseArticleMetaInput(article);
                const nextCategories = assertKnowledgeBaseCategoriesMapBounds(upsertKnowledgeBaseArticleMeta(
                    categories,
                    placement.categoryId,
                    articleMeta,
                    placement.sectionId,
                ));
                await appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    targetScope.tId,
                    targetScope.sId,
                    { reason: 'article_create', sourceId: docRef.id, sourceType: 'kb_article' },
                );
                transaction.set(docRef, { ...submitData, ...placement });
                transaction.update(categoriesRef, { categories: nextCategories });
                return { article, navigationCategories: nextCategories };
            });
            await revalidateAnswerlatticePublicClientCache(targetScope, ['kb', 'context'], 'addArticle');

            // E4: Fire-and-forget entity extraction after article creation
            _triggerEntityExtraction(result.article);

            return {
                ...result.article,
                navigationCategories: result.navigationCategories,
            } satisfies KnowledgeBaseArticleWriteResult;
        },
        data,
        "addArticle"
    );
}

export const updateArticle = async (
    data: Partial<KnowledgeBaseArticleType>,
    options: KnowledgeBaseArticleUpdateOptions = {},
) => {
    return await apiCallComposer(
        async () => {
            const articleId = normalizeAnswerlatticeKbArticleId(data.id);
            if (!articleId) throw new Error('Knowledge base article ID is invalid.');
            const mutationScope = await resolveArticleMutationScope();
            const articleRef = await getDocRef(articleId);
            const initialSnapshot = await getDoc(articleRef);
            if (!initialSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
            const initialArticle = { ...initialSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
            const targetScope = assertArticleMutationAccess(mutationScope, articleId, initialArticle);

            if (options.mode === 'generation_review') {
                const stagedData = await answerlatticeRequestBodyComposer({
                    ...data,
                    id: articleId,
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId: targetScope.tId,
                    sId: targetScope.sId,
                }, { isNew: false });
                await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                    const currentSnapshot = await transaction.get(articleRef);
                    if (!currentSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                    const currentArticle = { ...currentSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                    assertArticleMutationAccess(mutationScope, articleId, currentArticle);
                    transaction.set(articleRef, stagedData, { merge: true });
                });
                return { ...initialArticle, ...stagedData, id: articleId } as KnowledgeBaseArticleWriteResult;
            }

            const normalizedMutationWithId = normalizeLiveArticleMutation(data, { isNew: false });
            const { id: _ignoredId, ...normalizedMutation } = normalizedMutationWithId;
            const composedData = await answerlatticeRequestBodyComposer({
                ...normalizedMutation,
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
            }, { isNew: false });
            const shouldRequestFaqReview = data.content !== undefined || data.title !== undefined;
            const faqSnapshot = shouldRequestFaqReview ? await getDocs(query(
                collection(answerlatticeFirebaseClient, DB_COLLECTIONS.ANSWERLATTICE_FAQS),
                where('tId', '==', targetScope.tId),
                where('sId', '==', targetScope.sId),
                where('articleId', '==', articleId),
                where('active', '==', true),
                limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT + 1),
            )) : null;
            if (faqSnapshot && faqSnapshot.size > ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
                throw new Error('This article has too many linked FAQs to update safely.');
            }
            const faqReviewData = shouldRequestFaqReview ? await answerlatticeRequestBodyComposer({
                status: ANSWERLATTICE_FAQ_STATUS.NEEDS_REVIEW,
                reviewRequestedOn: Timestamp.now(),
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
            }, { isNew: false }) : null;
            const result = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(articleRef);
                const categoriesRef = getCategoriesDocRef(targetScope);
                const categoriesSnapshot = await transaction.get(categoriesRef);
                if (!currentSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                if (!categoriesSnapshot.exists()) throw new Error('answerlattice_kb_categories_document_not_found');
                const currentArticle = { ...currentSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                const currentScope = assertArticleMutationAccess(mutationScope, articleId, currentArticle);
                if (currentScope.tId !== targetScope.tId || currentScope.sId !== targetScope.sId) {
                    throw new Error('Knowledge base article workspace changed before update.');
                }
                const categories = requireCategoriesMap(categoriesSnapshot.data().categories);
                const placement = resolveKnowledgeBaseArticlePlacement(
                    categories,
                    normalizedMutation.categoryId ?? currentArticle.categoryId,
                    normalizedMutation.sectionId !== undefined ? normalizedMutation.sectionId : currentArticle.sectionId,
                );
                if (faqReviewData && faqSnapshot) {
                    const rawLinkedFaqIds = [
                        ...faqSnapshot.docs.map(faqDoc => faqDoc.id),
                        ...(Array.isArray(currentArticle.faqIds) ? currentArticle.faqIds : []),
                    ];
                    const normalizedLinkedFaqIds = rawLinkedFaqIds.map(normalizeAnswerlatticeFaqId);
                    if (normalizedLinkedFaqIds.some(faqId => faqId === null)) {
                        throw new Error('This article has invalid linked FAQ references.');
                    }
                    const linkedFaqIds = Array.from(new Set(normalizedLinkedFaqIds as string[]));
                    if (linkedFaqIds.length > ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
                        throw new Error('This article has too many linked FAQs to update safely.');
                    }
                    const faqRefs = linkedFaqIds.map(faqId => doc(
                        answerlatticeFirebaseClient,
                        DB_COLLECTIONS.ANSWERLATTICE_FAQS,
                        faqId,
                    ));
                    const faqDocs = await Promise.all(faqRefs.map(faqRef => transaction.get(faqRef)));
                    faqDocs.forEach((faqDoc, index) => {
                        if (!faqDoc.exists()) return;
                        const faq = faqDoc.data();
                        if (
                            faq.pId !== ANSWERLATTICE_PRODUCT_ID
                            || normalizeAnswerlatticeScopeDocumentId(faq.tId) !== targetScope.tId
                            || normalizeAnswerlatticeScopeDocumentId(faq.sId) !== targetScope.sId
                            || normalizeAnswerlatticeKbArticleId(faq.articleId) !== articleId
                        ) {
                            throw new Error(`Linked FAQ ${linkedFaqIds[index]} is outside this article workspace.`);
                        }
                    });
                    await appendAnswerlatticeCacheInvalidation(
                        transaction,
                        ANSWERLATTICE_CACHE_SOURCES.KB,
                        targetScope.tId,
                        targetScope.sId,
                        { reason: 'article_update', sourceId: articleId, sourceType: 'kb_article' },
                    );
                    faqDocs.forEach((faqDoc, index) => {
                        if (faqDoc.exists() && faqDoc.data().active === true) {
                            transaction.set(faqRefs[index], faqReviewData, { merge: true });
                        }
                    });
                }
                if (!faqReviewData || !faqSnapshot) {
                    await appendAnswerlatticeCacheInvalidation(
                        transaction,
                        ANSWERLATTICE_CACHE_SOURCES.KB,
                        targetScope.tId,
                        targetScope.sId,
                        { reason: 'article_update', sourceId: articleId, sourceType: 'kb_article' },
                    );
                }
                const invalidatesEmbedding = data.content !== undefined
                    || data.title !== undefined
                    || data.categoryId !== undefined
                    || data.sectionId !== undefined;
                const articleMutation: Record<string, unknown> = {
                    ...composedData,
                    ...placement,
                    ...(invalidatesEmbedding ? {
                        embeddingStatus: 'pending',
                        [ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField]: deleteField(),
                        embeddingCacheVersion: deleteField(),
                        embeddingSourceHash: deleteField(),
                        embeddingRun: deleteField(),
                    } : {}),
                };
                const mergedArticle = {
                    ...currentArticle,
                    ...composedData,
                    ...placement,
                    ...(invalidatesEmbedding ? {
                        embeddingStatus: 'pending' as const,
                        embedding: undefined,
                        embeddingCacheVersion: undefined,
                        embeddingSourceHash: undefined,
                        embeddingRun: undefined,
                    } : {}),
                    id: articleId,
                } as KnowledgeBaseArticleType;
                const articleMeta = normalizeKnowledgeBaseArticleMetaInput(mergedArticle);
                const nextCategories = assertKnowledgeBaseCategoriesMapBounds(upsertKnowledgeBaseArticleMeta(
                    categories,
                    placement.categoryId,
                    articleMeta,
                    placement.sectionId,
                ));
                transaction.set(articleRef, articleMutation, { merge: true });
                transaction.update(categoriesRef, { categories: nextCategories });
                return { article: mergedArticle, navigationCategories: nextCategories };
            });
            await revalidateAnswerlatticePublicClientCache(
                targetScope,
                shouldRequestFaqReview ? ['faqs', 'kb', 'context'] : ['kb', 'context'],
                'updateArticle',
            );

            // E4: Re-evaluate entity links when extraction-relevant article truth changes.
            const shouldTriggerEntityExtraction = data.content !== undefined
                || data.title !== undefined
                || data.categoryId !== undefined
                || data.sectionId !== undefined;
            if (shouldTriggerEntityExtraction) {
                _triggerEntityExtraction(result.article);
            }

            return {
                ...result.article,
                navigationCategories: result.navigationCategories,
            } satisfies KnowledgeBaseArticleWriteResult;
        },
        { data, mode: options.mode || 'live' },
        "updateArticle"
    );
}

export function assertKnowledgeBaseArticleWriteSucceeded(
    result: unknown,
    expectedArticleId?: string,
    rejectionCode = 'knowledge_base_article_write_rejected',
): asserts result is KnowledgeBaseArticleType {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    const article = result as Partial<KnowledgeBaseArticleType>;
    if (typeof article.id !== 'string' || article.id.length === 0) {
        throw new Error(rejectionCode);
    }

    if (expectedArticleId && article.id !== expectedArticleId) {
        throw new Error(rejectionCode);
    }
}

export type KnowledgeBaseArticleDeleteResult = {
    success: true;
    id: string;
    navigationCategories: KbCategoriesMap;
};

export type KnowledgeBaseArticleBulkStatusUpdateResult = {
    success: true;
    ids: string[];
    status: string;
    updatedCount: number;
    navigationCategories: KbCategoriesMap;
};

export const deleteArticle = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const articleId = normalizeAnswerlatticeKbArticleId(id);
            if (!articleId) throw new Error('Knowledge base article ID is invalid.');
            const mutationScope = await resolveArticleMutationScope();
            const docRef = await getDocRef(articleId);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
            const articleData = { ...docSnap.data(), id: articleId } as KnowledgeBaseArticleType;
            const targetScope = assertArticleMutationAccess(mutationScope, articleId, articleData);
            const faqSnapshot = await getDocs(query(
                collection(answerlatticeFirebaseClient, DB_COLLECTIONS.ANSWERLATTICE_FAQS),
                where('tId', '==', targetScope.tId),
                where('sId', '==', targetScope.sId),
                where('articleId', '==', articleId),
                where('active', '==', true),
                limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT + 1),
            ));
            if (faqSnapshot.size > ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
                throw new Error('This article has too many linked FAQs to delete safely.');
            }
            const faqArchiveData = await answerlatticeRequestBodyComposer({
                status: ANSWERLATTICE_FAQ_STATUS.ARCHIVED,
                active: false,
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
                modifiedOn: Timestamp.now(),
            }, { isNew: false });
            const navigationCategories = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(docRef);
                const categoriesRef = getCategoriesDocRef(targetScope);
                const categoriesSnapshot = await transaction.get(categoriesRef);
                if (!currentSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                if (!categoriesSnapshot.exists()) throw new Error('answerlattice_kb_categories_document_not_found');
                const currentArticle = { ...currentSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                const currentScope = assertArticleMutationAccess(mutationScope, articleId, currentArticle);
                if (currentScope.tId !== targetScope.tId || currentScope.sId !== targetScope.sId) {
                    throw new Error('Knowledge base article workspace changed before deletion.');
                }
                const categories = requireCategoriesMap(categoriesSnapshot.data().categories);
                const rawLinkedFaqIds = [
                    ...faqSnapshot.docs.map(faqDoc => faqDoc.id),
                    ...(Array.isArray(currentArticle.faqIds) ? currentArticle.faqIds : []),
                ];
                const normalizedLinkedFaqIds = rawLinkedFaqIds.map(normalizeAnswerlatticeFaqId);
                if (normalizedLinkedFaqIds.some(faqId => faqId === null)) {
                    throw new Error('This article has invalid linked FAQ references.');
                }
                const linkedFaqIds = Array.from(new Set(normalizedLinkedFaqIds as string[]));
                if (linkedFaqIds.length > ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
                    throw new Error('This article has too many linked FAQs to delete safely.');
                }
                const faqRefs = linkedFaqIds.map(faqId => doc(
                    answerlatticeFirebaseClient,
                    DB_COLLECTIONS.ANSWERLATTICE_FAQS,
                    faqId,
                ));
                const faqDocs = await Promise.all(faqRefs.map(faqRef => transaction.get(faqRef)));
                faqDocs.forEach((faqDoc, index) => {
                    if (!faqDoc.exists()) return;
                    const faq = faqDoc.data();
                    if (
                        faq.pId !== ANSWERLATTICE_PRODUCT_ID
                        || normalizeAnswerlatticeScopeDocumentId(faq.tId) !== targetScope.tId
                        || normalizeAnswerlatticeScopeDocumentId(faq.sId) !== targetScope.sId
                        || normalizeAnswerlatticeKbArticleId(faq.articleId) !== articleId
                    ) {
                        throw new Error(`Linked FAQ ${linkedFaqIds[index]} is outside this article workspace.`);
                    }
                });
                await appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    targetScope.tId,
                    targetScope.sId,
                    { reason: 'article_delete', sourceId: articleId, sourceType: 'kb_article' },
                );
                faqDocs.forEach((faqDoc, index) => {
                    if (faqDoc.exists()) transaction.set(faqRefs[index], faqArchiveData, { merge: true });
                });
                const nextCategories = assertKnowledgeBaseCategoriesMapBounds(
                    removeKnowledgeBaseArticleMetaEverywhere(categories, articleId),
                );
                transaction.update(categoriesRef, { categories: nextCategories });
                transaction.delete(docRef);
                return nextCategories;
            });
            await revalidateAnswerlatticePublicClientCache(targetScope, ['faqs', 'kb', 'context'], 'deleteArticle');
            const article = { id: articleId, tId: targetScope.tId, sId: targetScope.sId };
            return { success: true, id: articleId, navigationCategories } satisfies KnowledgeBaseArticleDeleteResult;
        },
        id,
        "deleteArticle"
    );
}

export function assertKnowledgeBaseArticleDeleteSucceeded(
    result: unknown,
    expectedArticleId: string,
    rejectionCode = 'knowledge_base_article_delete_rejected',
): asserts result is KnowledgeBaseArticleDeleteResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    const deleteResult = result as Partial<KnowledgeBaseArticleDeleteResult>;
    if (deleteResult.success !== true || deleteResult.id !== expectedArticleId) {
        throw new Error(rejectionCode);
    }
}

export function assertKnowledgeBaseArticleBulkStatusUpdateSucceeded(
    result: unknown,
    expectedIds: string[],
    expectedStatus: string,
    rejectionCode = 'knowledge_base_article_bulk_status_update_rejected',
): asserts result is KnowledgeBaseArticleBulkStatusUpdateResult {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error(rejectionCode);
    }

    const updateResult = result as Partial<KnowledgeBaseArticleBulkStatusUpdateResult>;
    if (
        updateResult.success !== true
        || updateResult.status !== expectedStatus
        || updateResult.updatedCount !== expectedIds.length
        || !Array.isArray(updateResult.ids)
        || updateResult.ids.length !== expectedIds.length
    ) {
        throw new Error(rejectionCode);
    }

    const expectedIdSet = new Set(expectedIds);
    if (updateResult.ids.some((id) => !expectedIdSet.has(id))) {
        throw new Error(rejectionCode);
    }
}

export const bulkUpdateArticleStatus = async (ids: string[], status: string) => {
    return await apiCallComposer(
        async () => {
            const articleIds = normalizeAnswerlatticeArticleMutationIds(ids);
            if (!articleIds) throw new Error('Knowledge base article selection is invalid.');
            if (!isAnswerlatticeArticleBulkStatus(status)) {
                throw new Error('Knowledge base bulk status is invalid.');
            }
            const mutationScope = await resolveArticleMutationScope();
            const articleRefs = await Promise.all(articleIds.map(getDocRef));
            const initialSnapshots = await Promise.all(articleRefs.map(articleRef => getDoc(articleRef)));
            const initialArticles = initialSnapshots.map((snapshot, index) => {
                const articleId = articleIds[index];
                if (!snapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                const article = { ...snapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                assertArticleMutationAccess(mutationScope, articleId, article);
                return article;
            });
            const targetScope = resolveSingleAnswerlatticeArticleScope(initialArticles);
            if (!targetScope) throw new Error('Knowledge base article selection is invalid.');
            const finalTargetScope = targetScope;
            const composedData = await answerlatticeRequestBodyComposer({
                status,
                active: status === ARTICLE_STATUS.PUBLISHED,
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: finalTargetScope.tId,
                sId: finalTargetScope.sId,
            }, { isNew: false });
            const navigationCategories = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshots = await Promise.all(articleRefs.map(articleRef => transaction.get(articleRef)));
                const categoriesRef = getCategoriesDocRef(finalTargetScope);
                const categoriesSnapshot = await transaction.get(categoriesRef);
                if (!categoriesSnapshot.exists()) throw new Error('answerlattice_kb_categories_document_not_found');
                let nextCategories = requireCategoriesMap(categoriesSnapshot.data().categories);
                snapshots.forEach((snapshot, index) => {
                    const articleId = articleIds[index];
                    if (!snapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                    const article = { ...snapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                    const articleScope = assertArticleMutationAccess(mutationScope, articleId, article);
                    if (articleScope.tId !== finalTargetScope.tId || articleScope.sId !== finalTargetScope.sId) {
                        throw new Error('Knowledge base article workspace changed before bulk update.');
                    }
                    if (
                        status === ARTICLE_STATUS.PUBLISHED
                        && (
                            article.embeddingStatus !== 'embedded'
                            || !article[ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField as keyof KnowledgeBaseArticleType]
                        )
                    ) {
                        throw new Error(`Knowledge base article ${articleId} is not search ready.`);
                    }
                    const articleMeta = normalizeKnowledgeBaseArticleMetaInput({
                        ...article,
                        active: status === ARTICLE_STATUS.PUBLISHED,
                    });
                    nextCategories = upsertKnowledgeBaseArticleMeta(
                        nextCategories,
                        article.categoryId,
                        articleMeta,
                        article.sectionId,
                    );
                });
                nextCategories = assertKnowledgeBaseCategoriesMapBounds(nextCategories);
                await appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    finalTargetScope.tId,
                    finalTargetScope.sId,
                    { reason: 'article_bulk_status', sourceType: 'kb_article' },
                );
                articleRefs.forEach(articleRef => transaction.update(articleRef, composedData));
                transaction.update(categoriesRef, { categories: nextCategories });
                return nextCategories;
            });
            await revalidateAnswerlatticePublicClientCache(finalTargetScope, ['kb', 'context'], 'bulkUpdateArticleStatus');
            return {
                success: true,
                ids: articleIds,
                updatedCount: articleIds.length,
                status,
                navigationCategories,
            } satisfies KnowledgeBaseArticleBulkStatusUpdateResult;
        },
        { ids, status },
        "bulkUpdateArticleStatus"
    );
};

export const getArticlesByCategoryId = async (categoryId: string) => {
    return await apiCallComposer(
        async () => {
            const safeCategoryId = normalizeAnswerlatticeKbArticleId(categoryId);
            if (!safeCategoryId) return [];
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters: QueryConstraint[] = [where("categoryId", "==", safeCategoryId)];
            filters.push(...getReadableScopeFilters(scope));
            const q = query(await getCollectionRef(), ...filters, limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                const article = { ...doc.data(), id: doc.id } as KnowledgeBaseArticleType;
                if (readableScopeAllowsArticle(scope, article)) list.push(article);
            });
            return list;
        },
        categoryId,
        "getArticlesByCategoryId"
    );
}

export const getArticlesBySectionId = async (sectionId: string) => {
    return await apiCallComposer(
        async () => {
            const safeSectionId = normalizeAnswerlatticeKbArticleId(sectionId);
            if (!safeSectionId) return [];
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters: QueryConstraint[] = [where("sectionId", "==", safeSectionId)];
            filters.push(...getReadableScopeFilters(scope));
            const q = query(await getCollectionRef(), ...filters, limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                const article = { ...doc.data(), id: doc.id } as KnowledgeBaseArticleType;
                if (readableScopeAllowsArticle(scope, article)) list.push(article);
            });
            return list;
        },
        sectionId,
        "getArticlesBySectionId"
    );
}

export const getArticlesByIds = async (ids: string[]) => {
    return await apiCallComposer(
        async () => {
            if (!ids || ids.length === 0) {
                return [];
            }
            const collectionRef = await getCollectionRef();
            const uniqueIds = Array.from(new Set(
                ids
                    .map(normalizeAnswerlatticeKbArticleId)
                    .filter((id): id is string => Boolean(id))
            )).slice(0, KB_ARTICLE_LIST_LIMIT);
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const scopeFilters = getReadableScopeFilters(scope);
            const articles: KnowledgeBaseArticleType[] = [];
            for (let index = 0; index < uniqueIds.length; index += KB_ARTICLE_ID_QUERY_CHUNK_SIZE) {
                const chunk = uniqueIds.slice(index, index + KB_ARTICLE_ID_QUERY_CHUNK_SIZE);
                const q = query(collectionRef, where(documentId(), 'in', chunk), ...scopeFilters);
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    const article = { id: doc.id, ...doc.data() } as KnowledgeBaseArticleType;
                    if (readableScopeAllowsArticle(scope, article)) {
                        articles.push(article);
                    }
                });
            }
            return articles;
        },
        ids,
        "getArticlesByIds"
    );
};

export const getArticleById = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const articleId = normalizeAnswerlatticeKbArticleId(id);
            if (!articleId) return null;
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return null;
            }
            const docRef = await getDocRef(articleId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const article = { ...docSnap.data(), id: docSnap.id } as KnowledgeBaseArticleType;
                return readableScopeAllowsArticle(scope, article) ? article : null;
            }
            return null;
        },
        id,
        "getArticleById"
    );
}

// ═══════════════════════════════════════════════════════════════
// E4: AUTO-EXTRACT ENTITIES ON ARTICLE SAVE
// Fire-and-forget — never blocks article save.
// Feature-flagged: ENABLE_ANSWERLATTICE_ONTOLOGY
// ═══════════════════════════════════════════════════════════════

/**
 * Async entity extraction trigger. Called after addArticle/updateArticle.
 * Uses dynamic imports to avoid circular dependencies.
 * Failure is logged with bounded diagnostics and never interrupts article operations.
 */
function _triggerEntityExtraction(article: KnowledgeBaseArticleType): void {
    // Dynamic imports to avoid circular deps + keep bundle lean when flag OFF
    Promise.all([
        import('@config/features'),
    ]).then(async ([{ FEATURE_FLAGS }]) => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) return;

        const { session } = await resolveKnowledgeBaseArticleSession('entity_extraction_trigger');
        if (!normalizeKnowledgeBaseArticleSessionScope(session)) return;

        const response = await fetch('/api/answerlattice/articles/extract-entities', {
            ...ARTICLE_ENTITY_EXTRACTION_REQUEST_POLICY,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: article.id,
            }),
        });
        await acknowledgeArticleEntityExtractionResponse(response, article);
    }).catch((error) => {
        logAnswerlatticeFailure('answerlattice_article_entity_extraction_request_failed', error, {
            ...getAnswerlatticeScopeLogContext({
                articleId: article.id,
                tId: article.tId,
                sId: article.sId,
            }),
        });
        // Silent failure — entity extraction must never break article operations
    });
}
