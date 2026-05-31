import { DB_COLLECTIONS } from '@constant/database';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';

import {
    AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
} from './cacheVersionManifest';
import { markAnswerlatticeCompiledContextSourceChangedAdmin } from './compiledSourceVersionsAdmin';

type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

export const bumpAnswerlatticeCacheVersionAdmin = async (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Cannot update Answerlattice cache version without valid tenant and store scope.');
    }

    const data: Record<string, unknown> = {
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        source,
        version: FieldValue.increment(1),
        modifiedOn: Timestamp.now(),
    };

    if (metadata?.reason) data.lastReason = String(metadata.reason).slice(0, 80);
    if (metadata?.sourceId) data.lastSourceId = String(metadata.sourceId).slice(0, 160);
    if (metadata?.sourceType) data.lastSourceType = String(metadata.sourceType).slice(0, 80);

    await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(getAnswerlatticeCacheVersionDocId(source, tenantId, storeId))
        .set(data, { merge: true });

    await markAnswerlatticeCompiledContextSourceChangedAdmin(source, tenantId, storeId, metadata);
};
