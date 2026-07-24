import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AnswerlatticeCompiledSourceVersions, AnswerlatticeContextSourceKey } from '@type/answerlattice';
import {
    ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    EMPTY_BUNDLE_STATS,
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
    normalizeCompiledSourceVersions,
} from './compiledContext';
import {
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
    readAnswerlatticeInvalidationOwnership,
} from './invalidationOwnership';

type SourceVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
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

export const getAnswerlatticeCompiledSourceVersionsAdmin = async (
    tId: number,
    sId: number,
): Promise<AnswerlatticeCompiledSourceVersions> => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const snap = await getDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId))
        .get();
    const data = snap.exists ? snap.data() : null;
    if (data && (
        data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || data.tId !== tenantId
        || data.sId !== storeId
        || !areAnswerlatticeCompiledSourceVersionsValid(data)
    )) throw new Error('Answerlattice compiled source versions are invalid for this workspace.');
    return normalizeCompiledSourceVersions(data);
};

export const initializeAnswerlatticeCompiledContextControlPlaneAdmin = async (
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    const metadataFields = sanitizeMetadata(metadata);
    const sourceRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId));
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId));

    await db.runTransaction(async (transaction) => {
        const [sourceSnap, manifestSnap] = await Promise.all([
            transaction.get(sourceRef),
            transaction.get(manifestRef),
        ]);
        const existingSource = sourceSnap.exists ? sourceSnap.data() : null;
        const existingManifest = manifestSnap.exists ? manifestSnap.data() : null;
        if (existingSource && (
            existingSource.pId !== PRODUCT_IDS.ANSWERLATTICE
            || existingSource.tId !== tenantId
            || existingSource.sId !== storeId
            || !areAnswerlatticeCompiledSourceVersionsValid(existingSource)
        )) {
            throw new Error('Answerlattice compiled source versions are invalid for this workspace.');
        }
        if (existingManifest && !isAnswerlatticeContextBundleManifestForScope(existingManifest, tenantId, storeId)) {
            throw new Error('Answerlattice compiled context manifest is invalid for this workspace.');
        }

        const initialSourceVersions = existingSource
            ? normalizeCompiledSourceVersions(existingSource)
            : existingManifest
                ? normalizeCompiledSourceVersions(existingManifest.sourceVersions)
                : {
                    ...normalizeCompiledSourceVersions({}),
                    workspaceProfile: 1,
                    widgetConfig: 1,
                };

        if (!sourceSnap.exists) {
            transaction.create(sourceRef, {
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: tenantId,
                sId: storeId,
                ...initialSourceVersions,
                updatedAt: now,
                ...metadataFields,
            });
        }
        if (!manifestSnap.exists) {
            transaction.create(manifestRef, {
                schemaVersion: 1,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: tenantId,
                sId: storeId,
                publicBundleId: '',
                bundleVersion: 0,
                activeVersion: 0,
                lastReadyVersion: 0,
                status: 'empty',
                sourceVersions: initialSourceVersions,
                bundles: {},
                stats: EMPTY_BUNDLE_STATS,
                limits: ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
                generatedAt: null,
                lastBuildError: null,
                updatedAt: now,
                ...metadataFields,
            });
        }
    });
};

export const markAnswerlatticeCompiledContextSourceChangedAdmin = async (
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const db = getDb();
    const metadataFields = sanitizeMetadata(metadata);
    await db.runTransaction(async transaction => {
        const scope = { tId: tenantId, sId: storeId };
        const ownership = await readAnswerlatticeInvalidationOwnership({ db, scope, transaction });
        const now = FieldValue.serverTimestamp();
        transaction.set(ownership.sourceVersionsRef, {
            ...(!ownership.sourceVersionsExists ? getAnswerlatticeMissingSourceVersionsBase(scope) : {}),
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            [source]: FieldValue.increment(1),
            updatedAt: now,
            ...metadataFields,
        }, { merge: true });
        transaction.set(ownership.manifestRef, {
            ...(!ownership.manifestExists ? getAnswerlatticeMissingBundleManifestBase(scope) : {}),
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            status: 'stale',
            staleReason: metadata?.reason || `${source}_changed`,
            updatedAt: now,
            ...metadataFields,
        }, { merge: true });
    });
};
