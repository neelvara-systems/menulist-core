import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FieldValue, type WriteBatch } from 'firebase-admin/firestore';
import type { AnswerlatticeCompiledSourceVersions, AnswerlatticeContextSourceKey } from '@type/answerlattice';
import {
    areAnswerlatticeCompiledSourceVersionsValid,
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    normalizeCompiledSourceVersions,
} from './compiledContext';

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
    const sourceVersions = normalizeCompiledSourceVersions({});
    const metadataFields = sanitizeMetadata(metadata);

    const batch = db.batch();
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        ...sourceVersions,
        workspaceProfile: 1,
        widgetConfig: 1,
        surfaces: Number(sourceVersions.surfaces || 0),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        publicBundleId: '',
        bundleVersion: 0,
        activeVersion: 0,
        lastReadyVersion: 0,
        status: 'empty',
        sourceVersions: {
            ...sourceVersions,
            workspaceProfile: 1,
            widgetConfig: 1,
        },
        bundles: {},
        stats: {
            entities: 0,
            entityRelations: 0,
            canonicalAnswers: 0,
            surfaces: 0,
            routes: 0,
            articles: 0,
            faqs: 0,
            releases: 0,
            bytesTotal: 0,
            publicBytesTotal: 0,
            privateBytesTotal: 0,
        },
        limits: {
            maxPublicBootstrapBytes: 50_000,
            maxPublicRouteBytes: 50_000,
            maxMcpResponseBytes: 24_000,
            maxMcpToolCallsPerMinute: 60,
        },
        generatedAt: null,
        lastBuildError: null,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    await batch.commit();
};

export const appendAnswerlatticeCompiledContextSourceChangeAdmin = (
    batch: WriteBatch,
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    const metadataFields = sanitizeMetadata(metadata);
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        [source]: FieldValue.increment(1),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${source}_changed`,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
};

export const markAnswerlatticeCompiledContextSourceChangedAdmin = async (
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const batch = getDb().batch();
    appendAnswerlatticeCompiledContextSourceChangeAdmin(batch, source, tId, sId, metadata);
    await batch.commit();
};
