import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, setDoc, where } from 'firebase/firestore';

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
            const submitData = await answerlatticeRequestBodyComposer(data);
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
            if (!data.id) {
                throw new Error('ai_search_history_feedback_missing_id');
            }
            const composedData = await answerlatticeRequestBodyComposer(data);
            await setDoc(await getDocRef(data.id), composedData, { merge: true });
            return {
                searchHistoryId: data.id,
                success: true,
                updatedFields: Object.keys(composedData),
            } satisfies AiSearchHistoryFeedbackUpdateResult;
        },
        data,
        "updateAiSearchHistoryWithFeedback"
    );
}
