import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';

import {
    CanonicaCacheSource,
    getCanonicaCacheVersionDocId,
    normalizeCacheVersion,
} from './cacheVersionManifest';

export const getCanonicaCacheVersionServer = async (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
): Promise<number | undefined> => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return undefined;
    }

    const doc = await firestoreAdmin
        .collection(DB_COLLECTIONS.CANONICA_CACHE_VERSIONS)
        .doc(getCanonicaCacheVersionDocId(source, tenantId, storeId))
        .get();

    if (!doc.exists) return undefined;

    const data = doc.data() || {};
    if (data.source !== source || Number(data.tId) !== tenantId || Number(data.sId) !== storeId) {
        return undefined;
    }

    return normalizeCacheVersion(data.version);
};
