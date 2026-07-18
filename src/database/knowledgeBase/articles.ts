import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, documentId, getDoc, getDocs, limit, query, QueryConstraint, runTransaction, Timestamp, where } from "@firebase/firestore";
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
import { normalizeAnswerlatticeScopeDocumentId } from "@lib/answerlattice/sessionScope";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { ANSWERLATTICE_FAQ_STATUS } from '@type/answerlattice';
import { ARTICLE_STATUS, KnowledgeBaseArticleType } from "@type/knowledgeBase";

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

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async (docId: string) => {
    const articleId = normalizeAnswerlatticeKbArticleId(docId);
    if (!articleId) throw new Error('Knowledge base article ID is invalid.');
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, articleId)
}

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
        return true;
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
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
            }, { isNew: true });
            const docRef = doc(await getCollectionRef());
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    targetScope.tId,
                    targetScope.sId,
                    { reason: 'article_create', sourceId: docRef.id, sourceType: 'kb_article' },
                );
                transaction.set(docRef, submitData);
            });
            const savedArticle = { ...submitData, id: docRef.id };
            await revalidateAnswerlatticePublicClientCache(targetScope, ['kb', 'context'], 'addArticle');

            // E4: Fire-and-forget entity extraction after article creation
            _triggerEntityExtraction(savedArticle as KnowledgeBaseArticleType);

            return savedArticle;
        },
        data,
        "addArticle"
    );
}

export const updateArticle = async (data: Partial<KnowledgeBaseArticleType>) => {
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
            const composedData = await answerlatticeRequestBodyComposer({
                ...data,
                id: articleId,
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId: targetScope.tId,
                sId: targetScope.sId,
            }, { isNew: false });
            const shouldRequestFaqReview = Boolean(data.content || data.title);
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
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(articleRef);
                if (!currentSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                const currentArticle = { ...currentSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                const currentScope = assertArticleMutationAccess(mutationScope, articleId, currentArticle);
                if (currentScope.tId !== targetScope.tId || currentScope.sId !== targetScope.sId) {
                    throw new Error('Knowledge base article workspace changed before update.');
                }
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
                    appendAnswerlatticeCacheInvalidation(
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
                    appendAnswerlatticeCacheInvalidation(
                        transaction,
                        ANSWERLATTICE_CACHE_SOURCES.KB,
                        targetScope.tId,
                        targetScope.sId,
                        { reason: 'article_update', sourceId: articleId, sourceType: 'kb_article' },
                    );
                }
                transaction.set(articleRef, composedData, { merge: true });
            });
            await revalidateAnswerlatticePublicClientCache(
                targetScope,
                shouldRequestFaqReview ? ['faqs', 'kb', 'context'] : ['kb', 'context'],
                'updateArticle',
            );

            // E4: Re-evaluate entity links when extraction-relevant article truth changes.
            const shouldTriggerEntityExtraction = data.content !== undefined
                || data.title !== undefined
                || data.categoryTitle !== undefined;
            if (shouldTriggerEntityExtraction) {
                _triggerEntityExtraction({
                    id: articleId,
                    title: data.title ?? initialArticle.title,
                    content: data.content ?? initialArticle.content,
                    categoryTitle: data.categoryTitle ?? initialArticle.categoryTitle,
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId: targetScope.tId,
                    sId: targetScope.sId,
                } as KnowledgeBaseArticleType);
            }

            return { ...composedData, id: articleId };
        },
        data,
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
};

export type KnowledgeBaseArticleBulkStatusUpdateResult = {
    success: true;
    ids: string[];
    status: string;
    updatedCount: number;
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
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const currentSnapshot = await transaction.get(docRef);
                if (!currentSnapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                const currentArticle = { ...currentSnapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                const currentScope = assertArticleMutationAccess(mutationScope, articleId, currentArticle);
                if (currentScope.tId !== targetScope.tId || currentScope.sId !== targetScope.sId) {
                    throw new Error('Knowledge base article workspace changed before deletion.');
                }
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
                appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    targetScope.tId,
                    targetScope.sId,
                    { reason: 'article_delete', sourceId: articleId, sourceType: 'kb_article' },
                );
                faqDocs.forEach((faqDoc, index) => {
                    if (faqDoc.exists()) transaction.set(faqRefs[index], faqArchiveData, { merge: true });
                });
                transaction.delete(docRef);
            });
            await revalidateAnswerlatticePublicClientCache(targetScope, ['faqs', 'kb', 'context'], 'deleteArticle');
            const article = { id: articleId, tId: targetScope.tId, sId: targetScope.sId };
            return { success: true, id: articleId } satisfies KnowledgeBaseArticleDeleteResult;
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
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshots = await Promise.all(articleRefs.map(articleRef => transaction.get(articleRef)));
                snapshots.forEach((snapshot, index) => {
                    const articleId = articleIds[index];
                    if (!snapshot.exists()) throw new Error(`Knowledge base article ${articleId} was not found.`);
                    const article = { ...snapshot.data(), id: articleId } as KnowledgeBaseArticleType;
                    const articleScope = assertArticleMutationAccess(mutationScope, articleId, article);
                    if (articleScope.tId !== finalTargetScope.tId || articleScope.sId !== finalTargetScope.sId) {
                        throw new Error('Knowledge base article workspace changed before bulk update.');
                    }
                });
                appendAnswerlatticeCacheInvalidation(
                    transaction,
                    ANSWERLATTICE_CACHE_SOURCES.KB,
                    finalTargetScope.tId,
                    finalTargetScope.sId,
                    { reason: 'article_bulk_status', sourceType: 'kb_article' },
                );
                articleRefs.forEach(articleRef => transaction.update(articleRef, composedData));
            });
            await revalidateAnswerlatticePublicClientCache(finalTargetScope, ['kb', 'context'], 'bulkUpdateArticleStatus');
            return {
                success: true,
                ids: articleIds,
                updatedCount: articleIds.length,
                status,
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
