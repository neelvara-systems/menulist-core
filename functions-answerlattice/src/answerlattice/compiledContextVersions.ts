import { FieldValue, Firestore, Timestamp, Transaction } from 'firebase-admin/firestore';
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

const ANSWERLATTICE_BUNDLE_STATUS_SET = new Set([
    'empty', 'building', 'ready', 'stale', 'failed', 'superseded',
]);
const EMPTY_BUNDLE_STATS = {
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
};
const ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS = {
    maxPublicBootstrapBytes: 50_000,
    maxPublicRouteBytes: 50_000,
    maxPublicObjectBytes: 512 * 1024,
    maxPrivateObjectBytes: 2 * 1024 * 1024,
    maxMcpResponseBytes: 24_000,
    maxMcpToolCallsPerMinute: 60,
};

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

export const shouldDeleteAnswerlatticeContextBundleVersion = (
    candidateVersion: number,
    activeVersion: number,
    versionsToKeep: ReadonlySet<number>,
): boolean => (
    Number.isSafeInteger(candidateVersion)
    && candidateVersion > 0
    && Number.isSafeInteger(activeVersion)
    && activeVersion > 0
    && candidateVersion <= activeVersion
    && !versionsToKeep.has(candidateVersion)
);

export type AnswerlatticeBundleBuildClaimDecision =
    | { status: 'active'; bundleVersion: number }
    | { status: 'claimable'; bundleVersion: number }
    | { status: 'invalid'; bundleVersion: number };

export const getAnswerlatticeBundleBuildClaimDecision = (
    manifest: unknown,
    lock: unknown,
    nowMillis: number,
): AnswerlatticeBundleBuildClaimDecision => {
    const currentVersion = resolveAnswerlatticeExistingBundleVersion(manifest);
    if (currentVersion === null || !Number.isFinite(nowMillis) || nowMillis < 0) {
        return { status: 'invalid', bundleVersion: currentVersion ?? 0 };
    }
    const lockRecord = lock && typeof lock === 'object' && !Array.isArray(lock)
        ? lock as Record<string, unknown>
        : {};
    const expiresAt = lockRecord.expiresAt as { toMillis?: () => number } | undefined;
    let expiresAtMillis = 0;
    try {
        expiresAtMillis = typeof expiresAt?.toMillis === 'function' ? expiresAt.toMillis() : 0;
    } catch {
        expiresAtMillis = 0;
    }
    if (lockRecord.status === 'building' && Number.isFinite(expiresAtMillis) && expiresAtMillis > nowMillis) {
        return { status: 'active', bundleVersion: currentVersion };
    }

    const abandonedReservedVersion = normalizeAnswerlatticeStoredBundleVersion(lockRecord.bundleVersion) ?? 0;
    const nextVersion = getNextAnswerlatticeBundleVersion({ bundleVersion: Math.max(currentVersion, abandonedReservedVersion) });
    return nextVersion === null
        ? { status: 'invalid', bundleVersion: currentVersion }
        : { status: 'claimable', bundleVersion: nextVersion };
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

export const isOwnedAnswerlatticeBundleManifest = (
    value: unknown,
    tId: number,
    sId: number,
): value is Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const manifest = value as Record<string, unknown>;
    return manifest.schemaVersion === 1
        && manifest.pId === 'AL'
        && manifest.tId === tId
        && manifest.sId === sId
        && ANSWERLATTICE_BUNDLE_STATUS_SET.has(String(manifest.status))
        && normalizeAnswerlatticeStoredBundleVersion(manifest.bundleVersion) !== null
        && normalizeAnswerlatticeStoredBundleVersion(manifest.activeVersion) !== null
        && normalizeAnswerlatticeStoredBundleVersion(manifest.lastReadyVersion) !== null
        && areAnswerlatticeCompiledSourceVersionsValid(manifest.sourceVersions)
        && Boolean(manifest.bundles)
        && typeof manifest.bundles === 'object'
        && !Array.isArray(manifest.bundles);
};

export const getMissingAnswerlatticeSourceVersionsBase = (tId: number, sId: number) => ({
    schemaVersion: 1,
    pId: 'AL',
    tId,
    sId,
    ...normalizeCompiledSourceVersions({}),
});

export const getMissingAnswerlatticeBundleManifestBase = (tId: number, sId: number) => ({
    schemaVersion: 1,
    pId: 'AL',
    tId,
    sId,
    publicBundleId: '',
    bundleVersion: 0,
    activeVersion: 0,
    lastReadyVersion: 0,
    sourceVersions: normalizeCompiledSourceVersions({}),
    bundles: {},
    stats: EMPTY_BUNDLE_STATS,
    limits: ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    generatedAt: null,
    lastBuildError: null,
});

export const appendCompiledContextSourceChanges = async (
    transaction: Transaction,
    db: Firestore,
    sources: readonly AnswerlatticeContextSourceKey[],
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    const uniqueSources = Array.from(new Set(sources));
    if (uniqueSources.length === 0) {
        throw new Error('Cannot update Answerlattice compiled context without at least one source.');
    }
    uniqueSources.forEach(assertSource);
    const { tenantId, storeId } = assertScope(tId, sId);
    const now = Timestamp.now();
    const metadataFields = sanitizeMetadata(metadata);
    const sourceVersionsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(tenantId, storeId));
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(tenantId, storeId));
    const [sourceVersionsSnapshot, manifestSnapshot] = await Promise.all([
        transaction.get(sourceVersionsRef),
        transaction.get(manifestRef),
    ]);
    const sourceVersions = sourceVersionsSnapshot.data();
    if (sourceVersionsSnapshot.exists && (
        sourceVersions?.pId !== 'AL'
        || sourceVersions?.tId !== tenantId
        || sourceVersions?.sId !== storeId
        || !areAnswerlatticeCompiledSourceVersionsValid(sourceVersions)
    )) {
        throw new Error('Answerlattice compiled source-version ownership conflict.');
    }
    if (
        manifestSnapshot.exists
        && !isOwnedAnswerlatticeBundleManifest(manifestSnapshot.data(), tenantId, storeId)
    ) {
        throw new Error('Answerlattice compiled bundle-manifest ownership conflict.');
    }

    transaction.set(sourceVersionsRef, {
        ...(!sourceVersionsSnapshot.exists ? getMissingAnswerlatticeSourceVersionsBase(tenantId, storeId) : {}),
        schemaVersion: 1,
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        ...Object.fromEntries(uniqueSources.map(source => [source, FieldValue.increment(1)])),
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });

    transaction.set(manifestRef, {
        ...(!manifestSnapshot.exists ? getMissingAnswerlatticeBundleManifestBase(tenantId, storeId) : {}),
        schemaVersion: 1,
        pId: 'AL',
        tId: tenantId,
        sId: storeId,
        status: 'stale',
        staleReason: metadata?.reason || `${uniqueSources.join('_')}_changed`,
        updatedAt: now,
        ...metadataFields,
    }, { merge: true });
};

export const appendCompiledContextSourceChange = async (
    transaction: Transaction,
    db: Firestore,
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => appendCompiledContextSourceChanges(transaction, db, [source], tId, sId, metadata);

export const markCompiledContextSourceChanged = async (
    db: Firestore,
    source: AnswerlatticeContextSourceKey,
    tId: number,
    sId: number,
    metadata?: SourceVersionBumpMetadata,
) => {
    await db.runTransaction(async transaction => {
        await appendCompiledContextSourceChange(transaction, db, source, tId, sId, metadata);
    });
};
