import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import {
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_MODEL,
    ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
} from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { embedStoredAnswerlatticeArticle } from '../logic/articleEmbedding';

const PRODUCT_ID = 'AL';
const MIGRATION_STATE_DOC_ID = 'answerlatticeEmbeddingV2Migration';
const MIGRATION_BATCH_SIZE = 100;
const MIGRATION_CONCURRENCY = 3;
const MIGRATION_FAILED_CODE = 'ANSWERLATTICE_EMBEDDING_V2_MIGRATION_FAILED';

type MigrationState = {
    lastCursor?: unknown;
    status?: unknown;
};

const getStateRef = () => db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(MIGRATION_STATE_DOC_ID);

const normalizeCursor = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const cursor = value.trim();
    if (!cursor || cursor !== value || cursor.length > 180 || cursor.includes('/')) return null;
    return cursor;
};

const getErrorContext = (error: unknown) => {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number'
            ? String(source.code).slice(0, 80)
            : null,
        sourceStatusCode: typeof source.status === 'number' ? source.status : null,
    };
};

export async function runAnswerlatticeEmbeddingV2Migration(params: {
    runId: string;
}): Promise<{ activity: boolean; details: Record<string, unknown> }> {
    const stateRef = getStateRef();
    const stateSnapshot = await stateRef.get();
    const state = (stateSnapshot.data() || {}) as MigrationState;
    if (
        state.status === 'completed'
        && stateSnapshot.data()?.cacheVersion === ANSWERLATTICE_EMBEDDING_CACHE_VERSION
    ) {
        return {
            activity: false,
            details: {
                cacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
                reason: 'migration_complete',
            },
        };
    }

    const cursor = normalizeCursor(state.lastCursor);
    let query = db.collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('pId', '==', PRODUCT_ID)
        .where('status', '==', 'published')
        .where('active', '==', true)
        .orderBy(FieldPath.documentId())
        .limit(MIGRATION_BATCH_SIZE + 1);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    const batchDocs = snapshot.docs.slice(0, MIGRATION_BATCH_SIZE);
    let embedded = 0;
    let reused = 0;

    try {
        for (let offset = 0; offset < batchDocs.length; offset += MIGRATION_CONCURRENCY) {
            const chunk = batchDocs.slice(offset, offset + MIGRATION_CONCURRENCY);
            const results = await Promise.all(chunk.map(async (document) => {
                const data = document.data() || {};
                const tId = Number(data.tId);
                const sId = Number(data.sId);
                if (
                    !Number.isSafeInteger(tId)
                    || tId <= 0
                    || !Number.isSafeInteger(sId)
                    || sId <= 0
                ) {
                    throw new Error('Answerlattice article migration scope is invalid.');
                }
                return embedStoredAnswerlatticeArticle({
                    articleId: document.id,
                    expectedScope: { tId, sId },
                    source: 'answerlattice_embedding_v2_migration',
                });
            }));
            embedded += results.filter(result => !result.reused).length;
            reused += results.filter(result => result.reused).length;
        }
    } catch (error) {
        const failedAt = Timestamp.now();
        await stateRef.set({
            cacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
            lastFailureAt: failedAt,
            lastFailureCode: MIGRATION_FAILED_CODE,
            lastRunId: params.runId,
            model: ANSWERLATTICE_EMBEDDING_MODEL,
            pId: PRODUCT_ID,
            schemaVersion: 1,
            status: 'failed',
            updatedAt: failedAt,
            vectorField: ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
        }, { merge: true });
        logger.error('[Answerlattice Embedding Migration] Batch failed', {
            failureCode: MIGRATION_FAILED_CODE,
            scanned: batchDocs.length,
            ...getErrorContext(error),
        });
        throw error;
    }

    const completed = snapshot.size <= MIGRATION_BATCH_SIZE;
    const lastCursor = batchDocs[batchDocs.length - 1]?.id || cursor || null;
    const finishedAt = Timestamp.now();
    await stateRef.set({
        cacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
        ...(completed ? { completedAt: finishedAt } : {}),
        embeddedCount: FieldValue.increment(embedded),
        lastCursor,
        lastRunId: params.runId,
        model: ANSWERLATTICE_EMBEDDING_MODEL,
        pId: PRODUCT_ID,
        reusedCount: FieldValue.increment(reused),
        scannedCount: FieldValue.increment(batchDocs.length),
        schemaVersion: 1,
        status: completed ? 'completed' : 'running',
        updatedAt: finishedAt,
        vectorField: ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
    }, { merge: true });

    logger.info('[Answerlattice Embedding Migration] Batch complete', {
        completed,
        embedded,
        reused,
        scanned: batchDocs.length,
    });
    return {
        activity: batchDocs.length > 0,
        details: {
            cacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
            completed,
            embedded,
            reused,
            scanned: batchDocs.length,
        },
    };
}
