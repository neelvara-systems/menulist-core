import { DB_COLLECTIONS } from '@constant/database';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';

import { AnswerlatticeCacheSource, } from './cacheVersionManifest';
import { getAnswerlatticeInvalidationCacheSources, getAnswerlatticeMissingBundleManifestBase, getAnswerlatticeMissingSourceVersionsBase, readAnswerlatticeInvalidationOwnership, } from './invalidationOwnership';

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

    const scope = { tId: tenantId, sId: storeId };
    const firestoreAdmin = requireAnswerlatticeFirestoreAdmin();
    await firestoreAdmin.runTransaction(async transaction => {
        const ownership = await readAnswerlatticeInvalidationOwnership({
            cacheSources: getAnswerlatticeInvalidationCacheSources({
                canonical: source === 'canonical',
                kb: source === 'kb',
            }),
            db: firestoreAdmin,
            scope,
            transaction,
        });
        transaction.set(ownership.cacheVersionRefs[source]!, data, { merge: true });
        transaction.set(ownership.sourceVersionsRef, {
            ...(!ownership.sourceVersionsExists ? getAnswerlatticeMissingSourceVersionsBase(scope) : {}),
            schemaVersion: 1,
            pId: 'AL',
            ...scope,
            [source]: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
            ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
            ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
            ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
        }, { merge: true });
        transaction.set(ownership.manifestRef, {
            ...(!ownership.manifestExists ? getAnswerlatticeMissingBundleManifestBase(scope) : {}),
            schemaVersion: 1,
            pId: 'AL',
            ...scope,
            status: 'stale',
            staleReason: metadata?.reason || `${source}_changed`,
            updatedAt: FieldValue.serverTimestamp(),
            ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
            ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
            ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
        }, { merge: true });
    });
};
