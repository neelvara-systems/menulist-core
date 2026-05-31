import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getAnswerlatticeTimestampMillis } from '@lib/answerlattice/cacheFreshness';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;

const createTraceId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `al_${crypto.randomUUID()}`;
    }
    return `al_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
        pId: PRODUCT_IDS.ANSWERLATTICE,
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
        .where('tId', '==', Number(session.tId))
        .where('sId', '==', Number(session.sId))
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const candidates = snapshot.docs
        .map((docSnapshot) => ({ ...docSnapshot.data(), id: docSnapshot.id } as AiSearchHistory))
        .sort((a, b) => {
            const bCreated = getAnswerlatticeTimestampMillis(b.createdOn || b.modifiedOn);
            const aCreated = getAnswerlatticeTimestampMillis(a.createdOn || a.modifiedOn);
            return bCreated - aCreated;
        });

    return candidates[0] || null;
};
