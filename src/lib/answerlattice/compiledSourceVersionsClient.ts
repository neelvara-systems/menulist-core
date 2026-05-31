import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { doc, increment, serverTimestamp, writeBatch } from '@firebase/firestore';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { AnswerlatticeContextSourceKey } from '@type/answerlattice';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
} from './compiledContext';

type SourceVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const assertScope = (tId: number, sId: number) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Cannot update Answerlattice source versions without valid tenant and store scope.');
    }
    return { tenantId, storeId };
};

const sanitizeMetadata = (metadata?: SourceVersionBumpMetadata) => ({
    ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
    ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
    ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
});

export const markAnswerlatticeCompiledContextSourceChanged = async (
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const now = serverTimestamp();
    const sourceRef = doc(
        answerlatticeFirebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        getAnswerlatticeSourceVersionsDocId(tenantId, storeId),
    );
    const manifestRef = doc(
        answerlatticeFirebaseClient,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        getAnswerlatticeBundleManifestDocId(tenantId, storeId),
    );

    const metadataFields = sanitizeMetadata(metadata);
    const batch = writeBatch(answerlatticeFirebaseClient);
    batch.set(sourceRef, {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        [source]: increment(1),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    batch.set(manifestRef, {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${source}_changed`,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    await batch.commit();
};
