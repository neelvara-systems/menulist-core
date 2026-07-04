import { DB_COLLECTIONS } from "@constant/database";
import { collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, query, QueryConstraint, runTransaction, setDoc, where, writeBatch } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { KnowledgeBaseArticleType } from "@type/knowledgeBase";
import { addDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.KB_ARTICLES;
const KB_ARTICLE_LIST_LIMIT = 500;
const KB_ARTICLE_ID_QUERY_CHUNK_SIZE = 30;
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

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async (docId: string) => {
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId)
}

const resolveArticleScope = async (data?: Partial<KnowledgeBaseArticleType> | null) => {
    const dataTId = Number(data?.tId);
    const dataSId = Number(data?.sId);
    if (Number.isFinite(dataTId) && dataTId > 0 && Number.isFinite(dataSId) && dataSId > 0) {
        return { tId: dataTId, sId: dataSId };
    }

    const session = await getActiveSession().catch(() => null);
    const sessionTId = Number(session?.tId);
    const sessionSId = Number(session?.sId);
    if (Number.isFinite(sessionTId) && sessionTId > 0 && Number.isFinite(sessionSId) && sessionSId > 0) {
        return { tId: sessionTId, sId: sessionSId };
    }

    return null;
};

const resolveReadableArticleScope = async (): Promise<ReadableArticleScope> => {
    const session = await getActiveSession().catch(() => null);
    const tId = Number(session?.tId);
    const sId = Number(session?.sId);
    return {
        isPlatform: (session as any)?.platformRole === 'PLATFORM',
        ...(Number.isFinite(tId) && tId > 0 ? { tId } : {}),
        ...(Number.isFinite(sId) && sId > 0 ? { sId } : {}),
    };
};

const getReadableScopeFilters = (scope: ReadableArticleScope): QueryConstraint[] => {
    if (scope.isPlatform) {
        return [];
    }
    if (!scope.tId || !scope.sId) {
        return [];
    }
    return [
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
    if (scope.isPlatform) {
        return true;
    }
    return Boolean(
        scope.tId
        && scope.sId
        && Number(article?.tId) === scope.tId
        && Number(article?.sId) === scope.sId
    );
};

const bumpKnowledgeBaseVersion = async (
    data: Partial<KnowledgeBaseArticleType> | null,
    reason: string,
    sourceId?: string,
) => {
    const scope = await resolveArticleScope(data);
    if (!scope) {
        throw new Error('Cannot update Answerlattice KB cache version without tenant and store scope.');
    }

    await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.KB, scope.tId, scope.sId, {
        reason,
        sourceId,
        sourceType: 'kb_article',
    });
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
            const submitData = await answerlatticeRequestBodyComposer(data);
            await bumpKnowledgeBaseVersion(submitData as Partial<KnowledgeBaseArticleType>, 'article_create');
            const docRef = await addDoc(await getCollectionRef(), submitData);
            const savedArticle = { ...submitData, id: docRef.id };
            await revalidateAnswerlatticePublicClientCache(await resolveArticleScope(savedArticle as Partial<KnowledgeBaseArticleType>), ['kb', 'context'], 'addArticle');

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
            const composedData = await answerlatticeRequestBodyComposer(data);
            await bumpKnowledgeBaseVersion(composedData as Partial<KnowledgeBaseArticleType>, 'article_update', data.id);
            await setDoc(await getDocRef(data.id), composedData, { merge: true });
            await revalidateAnswerlatticePublicClientCache(await resolveArticleScope(composedData as Partial<KnowledgeBaseArticleType>), ['kb', 'context'], 'updateArticle');

            // Mark linked FAQs for review when article truth changes.
            if ((data.content || data.title) && data.id) {
                const article = { id: data.id as string, tId: data.tId, sId: data.sId };
                void import('@database/answerlattice/faqs')
                    .then(({ markFaqsNeedReviewForArticle }) => markFaqsNeedReviewForArticle(article))
                    .catch((error) => {
                        logArticleFaqMaintenanceFailure('answerlattice_article_faq_review_marker_failed', error, article);
                    });
            }

            // E4: Fire-and-forget entity extraction when article content changes
            if (data.content && data.id && data.title) {
                _triggerEntityExtraction({
                    id: data.id,
                    title: data.title,
                    content: data.content,
                    categoryTitle: data.categoryTitle,
                } as KnowledgeBaseArticleType);
            }

            return composedData;
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
            const docRef = await getDocRef(id);
            const docSnap = await getDoc(docRef);
            const articleData = docSnap.exists() ? docSnap.data() as Partial<KnowledgeBaseArticleType> : null;
            await bumpKnowledgeBaseVersion(articleData, 'article_delete', id);
            await deleteDoc(docRef);
            await revalidateAnswerlatticePublicClientCache(await resolveArticleScope(articleData), ['kb', 'context'], 'deleteArticle');
            const article = { id, tId: articleData?.tId, sId: articleData?.sId };
            void import('@database/answerlattice/faqs')
                .then(({ archiveFaqsForArticle }) => archiveFaqsForArticle(article))
                .catch((error) => {
                    logArticleFaqMaintenanceFailure('answerlattice_article_faq_archive_failed', error, article);
                });
            return { success: true, id } satisfies KnowledgeBaseArticleDeleteResult;
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
            if (!ids || ids.length === 0) return;

            const batch = writeBatch(answerlatticeFirebaseClient);
            const composedData = await answerlatticeRequestBodyComposer({ status, active: status === 'published' });
            await bumpKnowledgeBaseVersion(composedData as Partial<KnowledgeBaseArticleType>, 'article_bulk_status');
            for (const id of ids) {
                const docRef = await getDocRef(id);
                batch.update(docRef, composedData);
            }
            await batch.commit();
            await revalidateAnswerlatticePublicClientCache(await resolveArticleScope(composedData as Partial<KnowledgeBaseArticleType>), ['kb', 'context'], 'bulkUpdateArticleStatus');
            return {
                success: true,
                ids,
                updatedCount: ids.length,
                status,
            } satisfies KnowledgeBaseArticleBulkStatusUpdateResult;
        },
        { ids, status },
        "bulkUpdateArticleStatus"
    );
};

export const deleteMultipleArticles = async (ids: string[]) => {
    return await apiCallComposer(
        async () => {
            if (!ids || ids.length === 0) return;

            const batch = writeBatch(answerlatticeFirebaseClient);
            await bumpKnowledgeBaseVersion(null, 'article_bulk_delete');
            for (const id of ids) {
                const docRef = await getDocRef(id);
                batch.delete(docRef);
            }
            await batch.commit();
            await revalidateAnswerlatticePublicClientCache(undefined, ['kb', 'context'], 'deleteMultipleArticles');
            return null;
        },
        ids,
        "deleteMultipleArticles"
    );
};

export const getArticlesByCategoryId = async (categoryId: string) => {
    return await apiCallComposer(
        async () => {
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters: any[] = [where("categoryId", "==", categoryId)];
            filters.push(...getReadableScopeFilters(scope));
            const q = query(await getCollectionRef(), ...filters, limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as KnowledgeBaseArticleType);
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
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters: any[] = [where("sectionId", "==", sectionId)];
            filters.push(...getReadableScopeFilters(scope));
            const q = query(await getCollectionRef(), ...filters, limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as KnowledgeBaseArticleType);
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
                    .map(id => String(id || '').trim())
                    .filter(Boolean)
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
            const scope = await resolveReadableArticleScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return null;
            }
            const docRef = await getDocRef(id);
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

export const updateArticleFeedback = async (articleId: string, type: 'like' | 'dislike', increment: boolean = true) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef(articleId);

            // Atomic transaction to prevent concurrent feedback count drift
            const result = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const docSnap = await transaction.get(docRef);

                if (!docSnap.exists()) {
                    throw new Error('Article not found');
                }

                const currentData = docSnap.data();
                const updatedData = {
                    likes: currentData.likes || 0,
                    dislikes: currentData.dislikes || 0,
                };

                if (type === 'like') {
                    updatedData.likes = increment ? updatedData.likes + 1 : Math.max(0, updatedData.likes - 1);
                } else {
                    updatedData.dislikes = increment ? updatedData.dislikes + 1 : Math.max(0, updatedData.dislikes - 1);
                }

                transaction.update(docRef, updatedData);
                return updatedData;
            });

            return result;
        },
        { articleId, type, increment },
        "updateArticleFeedback"
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
 * Failure is silently logged — never interrupts article operations.
 */
function _triggerEntityExtraction(article: KnowledgeBaseArticleType): void {
    // Dynamic imports to avoid circular deps + keep bundle lean when flag OFF
    Promise.all([
        import('@config/features'),
        import('@lib/auth/getActiveSession'),
    ]).then(async ([{ FEATURE_FLAGS }, { default: getActiveSession }]) => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) return;

        const session = await getActiveSession().catch(() => null);
        if (!session?.tId || !session?.sId) return;

        const response = await fetch('/api/answerlattice/articles/extract-entities', {
            ...ARTICLE_ENTITY_EXTRACTION_REQUEST_POLICY,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: article.id,
                title: article.title,
                content: article.content,
                categoryTitle: article.categoryTitle,
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
