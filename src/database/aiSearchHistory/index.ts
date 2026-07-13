import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticeChatFeedback } from '@lib/answerlattice/chatSessionContracts';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, runTransaction, Timestamp, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;

const getDocRef = async (docId: string) => {
    return doc(answerlatticeFirebaseClient, `${COLLECTION}`, docId)
}

const getCollectionRef = async () => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}`)
}

export type AiSearchHistoryFeedbackUpdateResult = {
    searchHistoryId: string;
    success: true;
    updatedFields: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isAiSearchHistoryFeedbackUpdateResult = (
    value: unknown
): value is AiSearchHistoryFeedbackUpdateResult => (
    isRecord(value)
    && value.success === true
    && typeof value.searchHistoryId === 'string'
    && Array.isArray(value.updatedFields)
);

export function assertAiSearchHistoryFeedbackUpdateSucceeded(
    result: unknown,
    expectedSearchHistoryId?: string,
    rejectionCode = 'ai_search_history_feedback_update_rejected',
): asserts result is AiSearchHistoryFeedbackUpdateResult {
    if (
        !isAiSearchHistoryFeedbackUpdateResult(result)
        || (expectedSearchHistoryId !== undefined && result.searchHistoryId !== expectedSearchHistoryId)
    ) {
        throw new Error(rejectionCode);
    }
}

export const addAiSearchHistory = async (data: Omit<AiSearchHistory, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await answerlatticeRequestBodyComposer(data, { isNew: true });
            const docRef = await addDoc(await getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id };
        },
        data,
        "addAiSearchHistory"
    );
}

/**
 * Find cached search result by cache key
 * Single source of truth for cache lookups
 * 
 * @param cacheKey - The unique cache key (text-only: normalized query, with image: normalized + hash)
 * @param session - User session containing tId, sId, uId
 * @returns Cached search result or null if not found
 */
export const findCachedSearchByCacheKey = async (
    cacheKey: string,
    session: LoginUserType
): Promise<AiSearchHistory | null> => {
    return await apiCallComposer(async () => {
        const collRef = await getCollectionRef();

        const q = query(
            collRef,
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where("cacheKey", "==", cacheKey),
            where("tId", "==", session.tId),
            where("sId", "==", session.sId),
            orderBy("createdOn", "desc"),
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const docSnapshot = snapshot.docs[0];
            const data = docSnapshot.data();
            return {
                ...data,
                id: docSnapshot.id,
            } as AiSearchHistory;
        }

        return null;
    }, 'findCachedSearchByCacheKey');
};

export const updateAiSearchHistoryWithFeedback = async (data: Partial<AiSearchHistory>) => {
    return await apiCallComposer(
        async () => {
            const searchHistoryId = normalizeAnswerlatticeSearchHistoryId(data.id);
            if (!searchHistoryId) throw new Error('ai_search_history_feedback_missing_id');
            const session = await getActiveSession();
            const scope = resolveAnswerlatticeSessionScope(session);
            const actorName = String(session?.user?.name || session?.user?.email || '').trim();
            if (!scope || !actorName) throw new Error('ai_search_history_feedback_scope_missing');
            const feedback = normalizeAnswerlatticeChatFeedback(data, Timestamp.now());
            let wrote = false;
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const searchHistoryRef = await getDocRef(searchHistoryId);
                const snapshot = await transaction.get(searchHistoryRef);
                if (!snapshot.exists()) throw new Error('ai_search_history_not_found');
                const current = snapshot.data();
                if (
                    current.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || Number(current.tId) !== scope.tenantId
                    || Number(current.sId) !== scope.storeId
                ) throw new Error('ai_search_history_feedback_scope_invalid');
                if (typeof current.isGood === 'boolean') {
                    const existingComparable = {
                        isGood: current.isGood,
                        reasonsToImprove: Array.isArray(current.reasonsToImprove) ? current.reasonsToImprove : [],
                        comments: String(current.comments || ''),
                    };
                    const nextComparable = {
                        isGood: feedback.isGood,
                        reasonsToImprove: feedback.reasonsToImprove || [],
                        comments: feedback.comments || '',
                    };
                    if (JSON.stringify(existingComparable) !== JSON.stringify(nextComparable)) {
                        throw new Error('ai_search_history_feedback_already_submitted');
                    }
                    return;
                }
                transaction.update(searchHistoryRef, {
                    ...feedback,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: scope.tenantId,
                    sId: scope.storeId,
                    modifiedBy: actorName,
                    modifiedOn: Timestamp.now(),
                });
                wrote = true;
            });
            return {
                searchHistoryId,
                success: true,
                updatedFields: wrote ? ['isGood', 'reasonsToImprove', 'comments', 'submittedAt'] : [],
            } satisfies AiSearchHistoryFeedbackUpdateResult;
        },
        data,
        "updateAiSearchHistoryWithFeedback"
    );
}
