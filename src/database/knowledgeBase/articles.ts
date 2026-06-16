import { DB_COLLECTIONS } from "@constant/database";
import { collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, query, runTransaction, setDoc, where, writeBatch } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { revalidateAnswerlatticePublicClientCache } from "@lib/cache/answerlatticePublicClientCache";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { KnowledgeBaseArticleType } from "@type/knowledgeBase";
import { addDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.KB_ARTICLES;
const KB_ARTICLE_LIST_LIMIT = 500;
const KB_ARTICLE_ID_QUERY_CHUNK_SIZE = 30;

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
 * This fetches ALL articles globally with no tenant filter — risky at scale.
 * Kept for backward compatibility but should not be used in new code.
 */
export const getArticles = async () => {
    return await apiCallComposer(
        async () => {
            const q = query(await getCollectionRef(), limit(KB_ARTICLE_LIST_LIMIT));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id })
            });
            return (list);
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
                import('@database/answerlattice/faqs')
                    .then(({ markFaqsNeedReviewForArticle }) => {
                        markFaqsNeedReviewForArticle({ id: data.id as string, tId: data.tId, sId: data.sId }).catch(() => undefined);
                    })
                    .catch(() => undefined);
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

export const deleteArticle = async (id: string) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef(id);
            const docSnap = await getDoc(docRef);
            const articleData = docSnap.exists() ? docSnap.data() as Partial<KnowledgeBaseArticleType> : null;
            await bumpKnowledgeBaseVersion(articleData, 'article_delete', id);
            await deleteDoc(docRef);
            await revalidateAnswerlatticePublicClientCache(await resolveArticleScope(articleData), ['kb', 'context'], 'deleteArticle');
            import('@database/answerlattice/faqs')
                .then(({ archiveFaqsForArticle }) => {
                    archiveFaqsForArticle({ id, tId: articleData?.tId, sId: articleData?.sId }).catch(() => undefined);
                })
                .catch(() => undefined);
            return null;
        },
        id,
        "deleteArticle"
    );
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
            return { updatedCount: ids.length, status };
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
            const session = await getActiveSession().catch(() => null);
            const filters: any[] = [where("categoryId", "==", categoryId)];
            if (session?.tId && session?.sId) {
                filters.push(where("tId", "==", session.tId), where("sId", "==", session.sId));
            }
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
            const session = await getActiveSession().catch(() => null);
            const filters: any[] = [where("sectionId", "==", sectionId)];
            if (session?.tId && session?.sId) {
                filters.push(where("tId", "==", session.tId), where("sId", "==", session.sId));
            }
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
            const articles: KnowledgeBaseArticleType[] = [];
            for (let index = 0; index < uniqueIds.length; index += KB_ARTICLE_ID_QUERY_CHUNK_SIZE) {
                const chunk = uniqueIds.slice(index, index + KB_ARTICLE_ID_QUERY_CHUNK_SIZE);
                const q = query(collectionRef, where(documentId(), 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    articles.push({ id: doc.id, ...doc.data() } as KnowledgeBaseArticleType);
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
            const docRef = await getDocRef(id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as KnowledgeBaseArticleType;
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

        const { extractEntitiesForArticle } = await import('@lib/answerlattice/entityExtraction');
        const { callGeminiChat } = await import('@lib/vectorEmbeddings');

        const result = await extractEntitiesForArticle(
            {
                id: article.id,
                title: article.title,
                content: article.content,
                categoryTitle: article.categoryTitle,
            },
            session.tId,
            session.sId,
            async (systemPrompt: string, userPrompt: string) => {
                // Combine system + user prompt since callGeminiChat doesn't take system prompt separately
                const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
                return callGeminiChat(combinedPrompt, []);
            }
        );

        // If extraction found entity matches, update article with entityIds
        if (result && result.entityIds.length > 0) {
            const composedData = await answerlatticeRequestBodyComposer({ entityIds: result.entityIds });
            await setDoc(await getDocRef(article.id), composedData, { merge: true });
        }
    }).catch(() => {
        // Silent failure — entity extraction must never break article operations
    });
}
