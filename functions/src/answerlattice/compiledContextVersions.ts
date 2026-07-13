import { FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { parseExactAnswerlatticeScope } from './scopeBoundary';

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

const normalizeStoredSourceVersion = (value: unknown): number | null => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) ? normalized : null;
};

export const areAnswerlatticeCompiledSourceVersionsValid = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return ANSWERLATTICE_CONTEXT_SOURCE_KEYS.every((key) => normalizeStoredSourceVersion(record[key]) !== null);
};

export const normalizeAnswerlatticeStoredBundleVersion = (value: unknown): number | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
    }
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null;
    const normalized = Number(value);
    return Number.isSafeInteger(normalized) ? normalized : null;
};

export const resolveAnswerlatticeExistingBundleVersion = (manifest: unknown): number | null => {
    if (manifest === null || manifest === undefined) return 0;
    if (typeof manifest !== 'object' || Array.isArray(manifest)) return null;
    const record = manifest as Record<string, unknown>;
    const candidates = [record.bundleVersion, record.activeVersion, record.lastReadyVersion]
        .filter((value) => value !== undefined && value !== null)
        .map(normalizeAnswerlatticeStoredBundleVersion)
        .filter((value): value is number => value !== null);
    return candidates.length > 0 ? Math.max(...candidates) : null;
};

export const getNextAnswerlatticeBundleVersion = (manifest: unknown): number | null => {
    const current = resolveAnswerlatticeExistingBundleVersion(manifest);
    return current === null || current >= Number.MAX_SAFE_INTEGER ? null : current + 1;
};

export const hasExactAnswerlatticeReadyBundleVersions = (manifest: Record<string, unknown>): boolean => (
    typeof manifest.bundleVersion === 'number'
    && normalizeAnswerlatticeStoredBundleVersion(manifest.bundleVersion) !== null
    && typeof manifest.activeVersion === 'number'
    && normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion) !== null
    && typeof manifest.lastReadyVersion === 'number'
    && normalizeAnswerlatticeStoredBundleVersion(manifest.lastReadyVersion) !== null
);

export const normalizeCompiledSourceVersions = (
    value: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
): AnswerlatticeCompiledSourceVersions => ({
    ...Object.fromEntries(ANSWERLATTICE_CONTEXT_SOURCE_KEYS.map((key) => [key, normalizeStoredSourceVersion(value?.[key]) ?? 0])),
});

export const compiledSourceVersionsEqual = (
    left: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
    right: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
) => {
    if (!areAnswerlatticeCompiledSourceVersionsValid(left) || !areAnswerlatticeCompiledSourceVersionsValid(right)) return false;
    const a = normalizeCompiledSourceVersions(left);
    const b = normalizeCompiledSourceVersions(right);
    return ANSWERLATTICE_CONTEXT_SOURCE_KEYS.every(key => a[key] === b[key]);
};

const assertScope = (tId: number, sId: number) => {
    const scope = parseExactAnswerlatticeScope(tId, sId);
    if (!scope) {
        throw new Error('Cannot update Answerlattice compiled context versions without valid tenant and store scope.');
    }
    return { tenantId: scope.tId, storeId: scope.sId };
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
