import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { doc, increment, setDoc, Timestamp } from '@firebase/firestore';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';

import {
    AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
} from './cacheVersionManifest';
import { markAnswerlatticeCompiledContextSourceChanged } from './compiledSourceVersionsClient';

type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const isValidScope = (tId: unknown, sId: unknown): tId is number => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    return Number.isFinite(tenantId) && tenantId > 0 && Number.isFinite(storeId) && storeId > 0;
};

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

    const tenantId = Number(tId);
    const storeId = Number(sId);
    const ref = doc(
        answerlatticeFirebaseClient,
        DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS,
        getAnswerlatticeCacheVersionDocId(source, tenantId, storeId),
    );

    await setDoc(
        ref,
        {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            sId: storeId,
            source,
            version: increment(1),
            modifiedOn: Timestamp.now(),
            ...sanitizeMetadata(metadata),
        },
        { merge: true },
    );

    await markAnswerlatticeCompiledContextSourceChanged(source, tenantId, storeId, metadata);
};
