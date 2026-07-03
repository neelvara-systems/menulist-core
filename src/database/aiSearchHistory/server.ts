import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { createRuntimeId } from '@lib/runtime/randomId';
import { AiSearchHistory } from '@type/aiSearchHistory';
import LoginUserType from '@type/loginUser';

const COLLECTION = DB_COLLECTIONS.AI_SEARCH_HISTORY;
const MAX_QUERY_CHARS = 500;
const MAX_ANSWER_CHARS = 12000;
const MAX_REFERENCE_COUNT = 8;
const MAX_REFERENCE_STRING_CHARS = 4000;
const MAX_NESTED_ARRAY_ITEMS = 25;
const MAX_NESTED_DEPTH = 4;
const SEARCH_HISTORY_OMIT_KEYS = new Set([
    'embedding',
    'embeddingVector',
    'contentEmbedding',
    'rawEmbedding',
    'vector',
    '_vector',
]);

const createTraceId = () => createRuntimeId('al');

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function' || typeof value?.toMillis === 'function') return value;
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

const truncateString = (value: unknown, maxLength: number): unknown => {
    if (typeof value !== 'string') return value;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
};

const compactNestedValue = (value: any, depth = 0): any => {
    if (value === undefined || value === null) return value;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function' || typeof value?.toMillis === 'function') return value;
    if (typeof value === 'string') return truncateString(value, MAX_REFERENCE_STRING_CHARS);
    if (typeof value !== 'object') return value;
    if (depth >= MAX_NESTED_DEPTH) return null;
    if (Array.isArray(value)) {
        return value
            .slice(0, MAX_NESTED_ARRAY_ITEMS)
            .map((item) => compactNestedValue(item, depth + 1));
    }

    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
        if (SEARCH_HISTORY_OMIT_KEYS.has(key)) return;
        result[key] = compactNestedValue(nestedValue, depth + 1);
    });
    return result;
};

const compactAiSearchHistoryPayload = (
    data: Omit<AiSearchHistory, 'id'> | Partial<AiSearchHistory>
) => {
    const payload: Record<string, any> = {
        ...data,
        query: truncateString((data as any).query, MAX_QUERY_CHARS),
        craftedAnswer: truncateString((data as any).craftedAnswer, MAX_ANSWER_CHARS),
        generatedQueryFromImage: truncateString((data as any).generatedQueryFromImage, MAX_QUERY_CHARS),
        imageUrl: truncateString((data as any).imageUrl, 1000),
    };

    if (Array.isArray((data as any).references)) {
        payload.references = (data as any).references
            .slice(0, MAX_REFERENCE_COUNT)
            .map((reference: any) => compactNestedValue(reference));
    }

    if (Array.isArray((data as any).matchedEntityIds)) {
        payload.matchedEntityIds = (data as any).matchedEntityIds
            .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
            .slice(0, 50);
    }

    return payload;
};

const composeAiSearchHistory = (data: Omit<AiSearchHistory, 'id'> | Partial<AiSearchHistory>) => {
    const now = new Date();
    const traceId = (data as any).traceId || createTraceId();
    const compactData = compactAiSearchHistoryPayload(data);

    return sanitizeForFirestore({
        ...compactData,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: Number(data.tId || 0),
        sId: Number(data.sId || 0),
        uId: data.uId || 'system',
        modifiedOn: now,
        createdOn: (data as any).createdOn || now,
        createdBy: (data as any).createdBy || data.uId || 'system',
        traceId,
        requestId: (data as any).requestId || traceId,
        ...getAnswerlatticeRetentionFields('aiSearchHistory', now),
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
        .orderBy('createdOn', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const docSnapshot = snapshot.docs[0];
    return { ...docSnapshot.data(), id: docSnapshot.id } as AiSearchHistory;
};
