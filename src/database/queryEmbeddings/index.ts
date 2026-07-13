import { createHash } from 'crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY } from '@constant/answerlattice/ai';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { answerlatticeFirestoreAdmin as firestoreAdmin, AnswerlatticeVector as Vector } from '@lib/firebase/answerlatticeFirebaseAdmin';

const COLLECTION = DB_COLLECTIONS.QUERY_EMBEDDINGS;

type VectorInstance = InstanceType<typeof Vector>;

export interface QueryEmbeddingCache {
    pId: 'AL';
    tId: number;
    sId: number;
    cacheKeyHash: string;
    queryLength: number;
    vector: number[]; // Array of embedding values
    createdAt: Date;
    hitCount: number; // Track how often this embedding is reused
    expiresAt?: any;
    retentionDays?: number;
}

/**
 * Get cached embedding for a query
 * Uses cacheKey as document ID for fast lookups
 * 
 * @param cacheKey - The cache key (normalized query or query+image hash)
 * @returns Cached Vector instance or null if not found
 */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPECTED_VECTOR_DIMENSIONS = ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY;

const getCacheDocumentId = (cacheKey: string): string => (
    `qe_${createHash('sha256').update(cacheKey).digest('hex')}`
);

const normalizeScope = (scope: { tId: unknown; sId: unknown }) => {
    const tId = Number(scope.tId);
    const sId = Number(scope.sId);
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('Answerlattice query embedding scope is invalid.');
    }
    return { tId, sId };
};

const getVectorValues = (value: VectorInstance): number[] => {
    const vector = value as VectorInstance & {
        values?: unknown;
        _values?: unknown;
        toArray?: () => number[];
    };
    const values = typeof vector.toArray === 'function'
        ? vector.toArray()
        : vector.values || vector._values;
    if (
        !Array.isArray(values)
        || values.length !== EXPECTED_VECTOR_DIMENSIONS
        || values.some(item => typeof item !== 'number' || !Number.isFinite(item))
    ) {
        throw new Error('Answerlattice query embedding vector is invalid.');
    }
    return values;
};

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getCachedEmbedding = async (
    cacheKey: string,
    scopeInput: { tId: number; sId: number },
): Promise<VectorInstance | null> => {
    const scope = normalizeScope(scopeInput);
    const cacheKeyHash = createHash('sha256').update(cacheKey).digest('hex');
    const docRef = firestoreAdmin.collection(COLLECTION).doc(getCacheDocumentId(cacheKey));
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return null;
    }

    const data = docSnap.data() as QueryEmbeddingCache;
    if (
        data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || Number(data.tId) !== scope.tId
        || Number(data.sId) !== scope.sId
        || data.cacheKeyHash !== cacheKeyHash
    ) return null;

    // TTL check: skip stale entries (>30 days). They'll be regenerated on next use.
    if (data.createdAt) {
        const createdMs = toMillis(data.createdAt);
        if (Date.now() - createdMs > CACHE_TTL_MS) {
            await docRef.delete().catch((error) => {
                logAnswerlatticeFailure('answerlattice_query_embedding_stale_delete_failed', error, {
                    ...getBoundedAnswerlatticeStringContext('cacheKey', cacheKey),
                    cacheAgeDays: Math.max(0, Math.floor((Date.now() - createdMs) / DAY_MS)),
                });
            });
            return null;
        }
    }

    if (
        !Array.isArray(data.vector)
        || data.vector.length !== EXPECTED_VECTOR_DIMENSIONS
        || data.vector.some(item => typeof item !== 'number' || !Number.isFinite(item))
    ) return null;

    return new Vector(data.vector);
};

/**
 * Save embedding to cache
 * 
 * @param cacheKey - The cache key (normalized query or query+image hash)
 * @param query - Original query text
 * @param vector - Vector instance from Gemini
 */
export const saveCachedEmbedding = async (
    cacheKey: string,
    query: string,
    vector: VectorInstance,
    scopeInput: { tId: number; sId: number },
): Promise<void> => {
    const scope = normalizeScope(scopeInput);
    const cacheKeyHash = createHash('sha256').update(cacheKey).digest('hex');
    const docRef = firestoreAdmin.collection(COLLECTION).doc(getCacheDocumentId(cacheKey));
    const vectorValues = getVectorValues(vector);

    const cacheData: QueryEmbeddingCache = {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        cacheKeyHash,
        queryLength: query.length,
        vector: vectorValues,
        createdAt: new Date(),
        hitCount: 0,
        ...getAnswerlatticeRetentionFields('queryEmbeddings'),
    };

    await docRef.set(cacheData);
};
