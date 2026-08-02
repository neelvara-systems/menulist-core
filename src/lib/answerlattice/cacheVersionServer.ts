import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin as firestoreAdmin, requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';

import { AnswerlatticeCacheSource, getAnswerlatticeCacheVersionDocId, normalizeCacheVersion, } from './cacheVersionManifest';

export const getAnswerlatticeCacheVersionServer = async (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
): Promise<number | undefined> => {
    const tenantId = normalizeAnswerlatticeScopeDocumentId(tId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(sId);
    if (!tenantId || !storeId) {
        return undefined;
    }

    const doc = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
        .doc(getAnswerlatticeCacheVersionDocId(source, tenantId, storeId))
        .get();

    if (!doc.exists) return undefined;

    const data = doc.data() || {};
    if (
        data.pId !== 'AL'
        || data.source !== source
        || normalizeAnswerlatticeScopeDocumentId(data.tId) !== tenantId
        || normalizeAnswerlatticeScopeDocumentId(data.sId) !== storeId
    ) {
        return undefined;
    }

    return normalizeCacheVersion(data.version);
};
