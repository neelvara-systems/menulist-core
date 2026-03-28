import { DB_COLLECTIONS } from "@constant/database";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, runTransaction, setDoc, where, writeBatch } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { KnowledgeBaseArticleType } from "@type/knowledgeBase";
import { addDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.KB_ARTICLES;

const getCollectionRef = async () => {
    return collection(canonicaFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async (docId: string) => {
    return doc(canonicaFirebaseClient, `${COLLECTION}`, docId)
}

/**
 * @deprecated Use getArticlesByCategoryId() or getArticlesBySectionId() instead.
 * This fetches ALL articles globally with no tenant filter — risky at scale.
 * Kept for backward compatibility but should not be used in new code.
 */
export const getArticles = async () => {
    return await apiCallComposer(
        async () => {
            const q = query(await getCollectionRef(), limit(500));
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
            const submitData = await requestBodyComposer(data);
            const docRef = await addDoc(await getCollectionRef(), submitData);
            const savedArticle = { ...submitData, id: docRef.id };

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
            const composedData = await requestBodyComposer(data);
            await setDoc(await getDocRef(data.id), composedData, { merge: true });

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
            await deleteDoc(docRef);
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

            const batch = writeBatch(canonicaFirebaseClient);
            const composedData = await requestBodyComposer({ status, active: status === 'published' });
            for (const id of ids) {
                const docRef = await getDocRef(id);
                batch.update(docRef, composedData);
            }
            await batch.commit();
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

            const batch = writeBatch(canonicaFirebaseClient);
            for (const id of ids) {
                const docRef = await getDocRef(id);
                batch.delete(docRef);
            }
            await batch.commit();
            return null;
        },
        ids,
        "deleteMultipleArticles"
    );
};

export const getArticlesByCategoryId = async (categoryId: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(await getCollectionRef(), where("categoryId", "==", categoryId));
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
            const q = query(await getCollectionRef(), where("sectionId", "==", sectionId));
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
            const q = query(collectionRef, where('__name__', 'in', ids));
            const querySnapshot = await getDocs(q);
            const articles: KnowledgeBaseArticleType[] = [];
            querySnapshot.forEach((doc) => {
                articles.push({ id: doc.id, ...doc.data() } as KnowledgeBaseArticleType);
            });
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
            const result = await runTransaction(canonicaFirebaseClient, async (transaction) => {
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
// Feature-flagged: ENABLE_CANONICA_ONTOLOGY
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
        if (!FEATURE_FLAGS.ENABLE_CANONICA_ONTOLOGY) return;

        const session = await getActiveSession().catch(() => null);
        if (!session?.tId || !session?.sId) return;

        const { extractEntitiesForArticle } = await import('@lib/canonica/entityExtraction');
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
            const composedData = await requestBodyComposer({ entityIds: result.entityIds });
            await setDoc(await getDocRef(article.id), composedData, { merge: true });
        }
    }).catch(() => {
        // Silent failure — entity extraction must never break article operations
    });
}
