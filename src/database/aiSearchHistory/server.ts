import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;

const createTraceId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `cn_${crypto.randomUUID()}`;
    }
    return `cn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (typeof value === 'object') {
        const result: Record<string, any> = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
            result[key] = sanitizeForFirestore(nestedValue);
        });
        return result;
    }
    return value;
};

const composeAiSearchHistory = (data: Omit<AiSearchHistory, 'id'> | Partial<AiSearchHistory>) => {
    const now = new Date();
    const traceId = (data as any).traceId || createTraceId();

    return sanitizeForFirestore({
        ...data,
        pId: PRODUCT_IDS.CANONICA,
        tId: Number(data.tId || 0),
        sId: Number(data.sId || 0),
        uId: data.uId || 'system',
        modifiedOn: now,
        createdOn: (data as any).createdOn || now,
        createdBy: (data as any).createdBy || data.uId || 'system',
        traceId,
        requestId: (data as any).requestId || traceId,
    });
};

export const addAiSearchHistoryServer = async (data: Omit<AiSearchHistory, 'id'>) => {
    const submitData = composeAiSearchHistory(data);
    const docRef = await firestoreAdmin.collection(COLLECTION).add(submitData);
    return { ...submitData, id: docRef.id } as AiSearchHistory;
};

export const findCachedSearchByCacheKeyServer = async (
    cacheKey: string,
    session: LoginUserType
): Promise<AiSearchHistory | null> => {
    const snapshot = await firestoreAdmin.collection(COLLECTION)
        .where('cacheKey', '==', cacheKey)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data();
    if (
        Number(data.tId) !== Number(session.tId) ||
        Number(data.sId) !== Number(session.sId)
    ) {
        return null;
    }

    return {
        ...data,
        id: docSnapshot.id,
    } as AiSearchHistory;
};
