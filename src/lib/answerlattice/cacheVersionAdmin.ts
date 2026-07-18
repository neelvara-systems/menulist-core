import { DB_COLLECTIONS } from '@constant/database';
import { FieldValue } from 'firebase-admin/firestore';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';

import {
    AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
} from './cacheVersionManifest';
import { appendAnswerlatticeCompiledContextSourceChangeAdmin } from './compiledSourceVersionsAdmin';

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
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('Cannot update Answerlattice cache version without valid tenant and store scope.');
    }
    const tenantId = tId;
    const storeId = sId;

    const data: Record<string, unknown> = {
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        source,
        version: FieldValue.increment(1),
        modifiedOn: FieldValue.serverTimestamp(),
    };

    if (metadata?.reason) data.lastReason = String(metadata.reason).slice(0, 80);
    if (metadata?.sourceId) data.lastSourceId = String(metadata.sourceId).slice(0, 160);
    if (metadata?.sourceType) data.lastSourceType = String(metadata.sourceType).slice(0, 80);

    const batch = firestoreAdmin.batch();
    batch.set(
        firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
            .doc(getAnswerlatticeCacheVersionDocId(source, tenantId, storeId)),
        data,
        { merge: true },
    );
    appendAnswerlatticeCompiledContextSourceChangeAdmin(batch, source, tenantId, storeId, metadata);
    await batch.commit();
};
