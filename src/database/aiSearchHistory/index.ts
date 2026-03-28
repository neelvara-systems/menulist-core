import { DB_COLLECTIONS } from '@constant/database';
import { requestBodyComposer } from '@lib/apiHelper';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';
import { addDoc, collection, doc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;

const getDocRef = async (docId: string) => {
    return doc(canonicaFirebaseClient, `${COLLECTION}`, docId)
}

const getCollectionRef = async () => {
    return collection(canonicaFirebaseClient, `${COLLECTION}`)
}

export const addAiSearchHistory = async (data: Omit<AiSearchHistory, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await requestBodyComposer(data);
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
            limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            return {
                ...snapshot.docs[0].data(),
                id: snapshot.docs[0].id,
            } as AiSearchHistory;
        }

        return null;
    }, 'findCachedSearchByCacheKey');
};

export const updateAiSearchHistoryWithFeedback = async (data: Partial<AiSearchHistory>) => {
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer(data);
            await setDoc(await getDocRef(data.id), composedData, { merge: true });
            return composedData;
        },
        data,
        "updateAiSearchHistoryWithFeedback"
    );
}
