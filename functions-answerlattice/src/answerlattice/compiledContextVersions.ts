import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';

export const ANSWERLATTICE_CONTEXT_SOURCE_KEYS = [
    'workspaceProfile',
    'widgetConfig',
    'kb',
    'docsNav',
    'entities',
    'entityRelations',
    'canonical',
    'surfaces',
    'releases',
    'branding',
    'mcpPolicy',
    'predictiveTriggers',
] as const;

export type AnswerlatticeContextSourceKey = typeof ANSWERLATTICE_CONTEXT_SOURCE_KEYS[number];

type SourceVersionBumpMetadata = {
    reason?: string;
    sourceId?: string;
    sourceType?: string;
};

export const getAnswerlatticeSourceVersionsDocId = (tId: number, sId: number) =>
    `sourceVersions_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeBundleManifestDocId = (tId: number, sId: number) =>
    `bundleManifest_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeBundleLockDocId = (tId: number, sId: number) =>
    `bundleBuildLock_${Number(tId)}_${Number(sId)}`;

export type AnswerlatticeCompiledSourceVersions = Partial<Record<AnswerlatticeContextSourceKey, number>>;

export const normalizeCompiledSourceVersions = (
    value: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
): AnswerlatticeCompiledSourceVersions => ({
    workspaceProfile: Number(value?.workspaceProfile || 0),
    widgetConfig: Number(value?.widgetConfig || 0),
    kb: Number(value?.kb || 0),
    docsNav: Number(value?.docsNav || 0),
    entities: Number(value?.entities || 0),
    entityRelations: Number(value?.entityRelations || 0),
    canonical: Number(value?.canonical || 0),
    surfaces: Number(value?.surfaces || 0),
    releases: Number(value?.releases || 0),
    branding: Number(value?.branding || 0),
    mcpPolicy: Number(value?.mcpPolicy || 0),
    predictiveTriggers: Number(value?.predictiveTriggers || 0),
});

export const compiledSourceVersionsEqual = (
    left: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
    right: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
) => {
    const a = normalizeCompiledSourceVersions(left);
    const b = normalizeCompiledSourceVersions(right);
    return ANSWERLATTICE_CONTEXT_SOURCE_KEYS.every(key => Number(a[key] || 0) === Number(b[key] || 0));
};

const assertScope = (tId: number, sId: number) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Cannot update Answerlattice compiled context versions without valid tenant and store scope.');
    }
    return { tenantId, storeId };
};

const assertSource = (source: AnswerlatticeContextSourceKey) => {
    if (!ANSWERLATTICE_CONTEXT_SOURCE_KEYS.includes(source)) {
        throw new Error(`Unsupported Answerlattice compiled context source: ${source}`);
    }
};

const sanitizeMetadata = (metadata?: SourceVersionBumpMetadata) => ({
    ...(metadata?.reason ? { lastReason: String(metadata.reason).slice(0, 80) } : {}),
    ...(metadata?.sourceId ? { lastSourceId: String(metadata.sourceId).slice(0, 160) } : {}),
    ...(metadata?.sourceType ? { lastSourceType: String(metadata.sourceType).slice(0, 80) } : {}),
});

export const markCompiledContextSourceChanged = async (
    db: Firestore,
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    assertSource(source);
    const { tenantId, storeId } = assertScope(tId, sId);
    const now = Timestamp.now();
    const metadataFields = sanitizeMetadata(metadata);
    const batch = db.batch();

    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        [source]: FieldValue.increment(1),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });

    batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId)), {
        schemaVersion: 1,
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${source}_changed`,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });

    await batch.commit();
};
