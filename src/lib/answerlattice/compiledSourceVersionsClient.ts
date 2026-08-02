import { PRODUCT_IDS } from '@constant/product';
import { increment, runTransaction, serverTimestamp, type Transaction } from '@firebase/firestore';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { AnswerlatticeContextSourceKey } from '@type/answerlattice';
import {
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
} from './invalidationControlPlane';
import {
    readAnswerlatticeClientInvalidationOwnership,
    type AnswerlatticeClientInvalidationOwnership,
} from './invalidationOwnershipClient';

// @firestore-collection-evidence DB_COLLECTIONS.PLATFORM_SUMMARY operations=read/query|write|transaction/batch
type SourceVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const assertScope = (tId: number, sId: number) => {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error('Cannot update Answerlattice source versions without valid tenant and store scope.');
    }
    return { tenantId: tId, storeId: sId };
};

const sanitizeMetadata = (metadata?: SourceVersionBumpMetadata) => ({
    ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
    ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
    ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
});

export const appendAnswerlatticeCompiledContextSourceChange = async (
    transaction: Transaction,
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
    currentOwnership?: AnswerlatticeClientInvalidationOwnership,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const scope = { tId: tenantId, sId: storeId };
    const ownership = currentOwnership
        || await readAnswerlatticeClientInvalidationOwnership({ scope, transaction });
    const now = serverTimestamp();

    const metadataFields = sanitizeMetadata(metadata);
    const sourceVersionUpdate = {
        ...(!ownership.sourceVersionsExists ? getAnswerlatticeMissingSourceVersionsBase(scope) : {}),
        ...ownership.sourceVersions,
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        [source]: increment(1),
        updatedAt: now,
        ...metadataFields,
    };
    const manifestUpdate = {
        ...(!ownership.manifestExists ? getAnswerlatticeMissingBundleManifestBase(scope) : {}),
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${source}_changed`,
        updatedAt: now,
        ...metadataFields,
    };
    transaction.set(ownership.sourceVersionsRef, sourceVersionUpdate, { merge: true });
    transaction.set(ownership.manifestRef, manifestUpdate, { merge: true });
};

export const markAnswerlatticeCompiledContextSourceChanged = async (
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    await runTransaction(answerlatticeFirebaseClient, async transaction => {
        await appendAnswerlatticeCompiledContextSourceChange(transaction, source, tId, sId, metadata);
    });
};
