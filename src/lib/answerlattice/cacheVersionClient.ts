import { PRODUCT_IDS } from '@constant/product';
import { increment, runTransaction, Timestamp, type Transaction } from '@firebase/firestore';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';

import {
    AnswerlatticeCacheSource,
} from './cacheVersionManifest';
import { appendAnswerlatticeCompiledContextSourceChange } from './compiledSourceVersionsClient';
import { readAnswerlatticeClientInvalidationOwnership } from './invalidationOwnershipClient';

// @firestore-collection-evidence DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS operations=read/query|write|transaction/batch
// @firestore-collection-evidence DB_COLLECTIONS.PLATFORM_SUMMARY operations=read/query|write|transaction/batch
type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const isValidScope = (tId: unknown, sId: unknown): tId is number => (
    Number.isSafeInteger(tId)
    && Number(tId) > 0
    && Number.isSafeInteger(sId)
    && Number(sId) > 0
);

const sanitizeMetadata = (metadata?: CacheVersionBumpMetadata) => {
    const result: Record<string, string> = {};
    if (metadata?.reason) result.lastReason = String(metadata.reason).slice(0, 80);
    if (metadata?.sourceId) result.lastSourceId = String(metadata.sourceId).slice(0, 160);
    if (metadata?.sourceType) result.lastSourceType = String(metadata.sourceType).slice(0, 80);
    return result;
};

export const bumpAnswerlatticeCacheVersion = async (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    if (!isValidScope(tId, sId)) {
        throw new Error('Cannot update Answerlattice cache version without valid tenant and store scope.');
    }

    await runTransaction(answerlatticeFirebaseClient, async transaction => {
        await appendAnswerlatticeCacheInvalidation(transaction, source, tId, sId, metadata);
    });
};

export const appendAnswerlatticeCacheInvalidation = async (
    transaction: Transaction,
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    if (!isValidScope(tId, sId)) {
        throw new Error('Cannot update Answerlattice cache version without valid tenant and store scope.');
    }
    const tenantId = tId;
    const storeId = sId;
    const ownership = await readAnswerlatticeClientInvalidationOwnership({
        cacheSources: [source],
        scope: { tId: tenantId, sId: storeId },
        transaction,
    });
    const versionUpdate = {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        source,
        version: increment(1),
        modifiedOn: Timestamp.now(),
        ...sanitizeMetadata(metadata),
    };
    transaction.set(ownership.cacheVersionRefs[source]!, versionUpdate, { merge: true });
    await appendAnswerlatticeCompiledContextSourceChange(
        transaction,
        source,
        tenantId,
        storeId,
        metadata,
        ownership,
    );
};
