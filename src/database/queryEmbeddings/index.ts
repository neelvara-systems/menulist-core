import { DB_COLLECTIONS } from '@constant/database';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { answerlatticeFirestoreAdmin as firestoreAdmin, AnswerlatticeVector as Vector } from '@lib/firebase/answerlatticeFirebaseAdmin';

const COLLECTION = DB_COLLECTIONS.QUERY_EMBEDDINGS;

type VectorInstance = InstanceType<typeof Vector>;

export interface QueryEmbeddingCache {
    cacheKey: string;
    query: string;
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

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

export const getCachedEmbedding = async (cacheKey: string): Promise<VectorInstance | null> => {
    const docRef = firestoreAdmin.collection(COLLECTION).doc(cacheKey);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        return null;
    }

    const data = docSnap.data() as QueryEmbeddingCache;

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
    vector: VectorInstance
): Promise<void> => {
    const docRef = firestoreAdmin.collection(COLLECTION).doc(cacheKey);

    const vectorValues = vector.values || (vector as any)._values;

    const cacheData: QueryEmbeddingCache = {
        cacheKey,
        query,
        vector: vectorValues,
        createdAt: new Date(),
        hitCount: 0,
        ...getAnswerlatticeRetentionFields('queryEmbeddings'),
    };

    await docRef.set(cacheData);
};
