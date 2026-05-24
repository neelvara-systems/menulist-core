import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CanonicaCompiledSourceVersions, CanonicaContextSourceKey } from '@type/canonica';
import {
    getCanonicaBundleManifestDocId,
    getCanonicaSourceVersionsDocId,
    normalizeCompiledSourceVersions,
} from './compiledContext';

type SourceVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

const getDb = () => {
    if (!canonicaFirestoreAdmin || typeof canonicaFirestoreAdmin.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

const assertScope = (tId: number, sId: number) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Cannot update Canonica source versions without valid tenant and store scope.');
    }
    return { tenantId, storeId };
};

const sanitizeMetadata = (metadata?: SourceVersionBumpMetadata) => ({
    ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
    ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
    ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
});

export const getCanonicaCompiledSourceVersionsAdmin = async (
    tId: number,
    sId: number,
): Promise<CanonicaCompiledSourceVersions> => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const snap = await getDb()
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getCanonicaSourceVersionsDocId(tenantId, storeId))
        .get();
    return normalizeCompiledSourceVersions(snap.exists ? snap.data() as any : null);
};

export const initializeCanonicaCompiledContextControlPlaneAdmin = async (
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
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaSourceVersionsDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.CANONICA,
        tId: tenantId,
        sId: storeId,
        ...sourceVersions,
        workspaceProfile: 1,
        widgetConfig: 1,
        surfaces: Number(sourceVersions.surfaces || 0),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaBundleManifestDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.CANONICA,
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

export const markCanonicaCompiledContextSourceChangedAdmin = async (
    source: CanonicaContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const { tenantId, storeId } = assertScope(tId, sId);
    const db = getDb();
    const now = FieldValue.serverTimestamp();
    const metadataFields = sanitizeMetadata(metadata);
    const batch = db.batch();
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaSourceVersionsDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.CANONICA,
        tId: tenantId,
        sId: storeId,
        [source]: FieldValue.increment(1),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getCanonicaBundleManifestDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: PRODUCT_IDS.CANONICA,
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${source}_changed`,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
    await batch.commit();
};
