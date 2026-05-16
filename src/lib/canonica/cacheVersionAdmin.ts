import { DB_COLLECTIONS } from '@constant/database';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';

import {
    CanonicaCacheSource,
    getCanonicaCacheVersionDocId,
} from './cacheVersionManifest';

type CacheVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

export const bumpCanonicaCacheVersionAdmin = async (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
    metadata?: CacheVersionBumpMetadata,
) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Cannot update Canonica cache version without valid tenant and store scope.');
    }

    const data: Record<string, unknown> = {
        pId: 'CN',
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
        .collection(DB_COLLECTIONS.CANONICA_CACHE_VERSIONS)
        .doc(getCanonicaCacheVersionDocId(source, tenantId, storeId))
        .set(data, { merge: true });
};
