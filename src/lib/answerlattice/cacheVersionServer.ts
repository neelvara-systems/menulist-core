import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';

import {
    AnswerlatticeCacheSource,
    getAnswerlatticeCacheVersionDocId,
    normalizeCacheVersion,
} from './cacheVersionManifest';

export const getAnswerlatticeCacheVersionServer = async (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
): Promise<number | undefined> => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return undefined;
    }

    const doc = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(getAnswerlatticeCacheVersionDocId(source, tenantId, storeId))
        .get();

    if (!doc.exists) return undefined;

    const data = doc.data() || {};
    if (data.source !== source || Number(data.tId) !== tenantId || Number(data.sId) !== storeId) {
        return undefined;
    }

    return normalizeCacheVersion(data.version);
};
