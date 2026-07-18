import type {
    AnswerlatticeCompiledSourceVersions,
    AnswerlatticeContextBundleLimits,
    AnswerlatticeContextBundleStats,
    AnswerlatticeContextSourceKey,
} from '@type/answerlattice';

export const ANSWERLATTICE_CONTEXT_BUNDLE_SCHEMA_VERSION = 1;
export const ANSWERLATTICE_CONTEXT_SOURCE_VERSION_DOC_PREFIX = 'sourceVersions';
export const ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_DOC_PREFIX = 'bundleManifest';
export const ANSWERLATTICE_CONTEXT_BUNDLE_LOCK_DOC_PREFIX = 'bundleBuildLock';
export const ANSWERLATTICE_MCP_SIGNAL_DOC_PREFIX = 'mcpSignal';

export const ANSWERLATTICE_CONTEXT_BUNDLE_ROOT = 'answerlattice-context';
export const ANSWERLATTICE_CONTEXT_PUBLIC_ROOT = `${ANSWERLATTICE_CONTEXT_BUNDLE_ROOT}/public`;
export const ANSWERLATTICE_CONTEXT_PRIVATE_ROOT = `${ANSWERLATTICE_CONTEXT_BUNDLE_ROOT}/private`;

export const ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS: AnswerlatticeContextBundleLimits = {
    maxPublicBootstrapBytes: 50_000,
    maxPublicRouteBytes: 50_000,
    maxPrivateObjectBytes: 2 * 1024 * 1024,
    maxMcpResponseBytes: 24_000,
    maxMcpToolCallsPerMinute: 60,
};

export const EMPTY_BUNDLE_STATS: AnswerlatticeContextBundleStats = {
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

export const getAnswerlatticeSourceVersionsDocId = (tId: number, sId: number) =>
    `${ANSWERLATTICE_CONTEXT_SOURCE_VERSION_DOC_PREFIX}_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeBundleManifestDocId = (tId: number, sId: number) =>
    `${ANSWERLATTICE_CONTEXT_BUNDLE_MANIFEST_DOC_PREFIX}_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeBundleLockDocId = (tId: number, sId: number) =>
    `${ANSWERLATTICE_CONTEXT_BUNDLE_LOCK_DOC_PREFIX}_${Number(tId)}_${Number(sId)}`;

export const getAnswerlatticeMcpSignalDocId = (tId: number, sId: number, dateKey: string) =>
    `${ANSWERLATTICE_MCP_SIGNAL_DOC_PREFIX}_${Number(tId)}_${Number(sId)}_${dateKey}`;

export const getPublicBundlePath = (publicBundleId: string, bundleVersion: number, filePath: string) =>
    `${ANSWERLATTICE_CONTEXT_PUBLIC_ROOT}/${publicBundleId}/v${Number(bundleVersion)}/${filePath.replace(/^\/+/, '')}`;

export const getPrivateBundlePath = (tId: number, sId: number, bundleVersion: number, filePath: string) =>
    `${ANSWERLATTICE_CONTEXT_PRIVATE_ROOT}/${Number(tId)}/${Number(sId)}/v${Number(bundleVersion)}/${filePath.replace(/^\/+/, '')}`;

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
    return [
        'workspaceProfile', 'widgetConfig', 'kb', 'docsNav', 'entities', 'entityRelations',
        'canonical', 'surfaces', 'releases', 'branding', 'mcpPolicy', 'predictiveTriggers',
    ].every((key) => normalizeStoredSourceVersion(record[key]) !== null);
};

export const normalizeCompiledSourceVersions = (
    value: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
): AnswerlatticeCompiledSourceVersions => ({
    workspaceProfile: normalizeStoredSourceVersion(value?.workspaceProfile) ?? 0,
    widgetConfig: normalizeStoredSourceVersion(value?.widgetConfig) ?? 0,
    kb: normalizeStoredSourceVersion(value?.kb) ?? 0,
    docsNav: normalizeStoredSourceVersion(value?.docsNav) ?? 0,
    entities: normalizeStoredSourceVersion(value?.entities) ?? 0,
    entityRelations: normalizeStoredSourceVersion(value?.entityRelations) ?? 0,
    canonical: normalizeStoredSourceVersion(value?.canonical) ?? 0,
    surfaces: normalizeStoredSourceVersion(value?.surfaces) ?? 0,
    releases: normalizeStoredSourceVersion(value?.releases) ?? 0,
    branding: normalizeStoredSourceVersion(value?.branding) ?? 0,
    mcpPolicy: normalizeStoredSourceVersion(value?.mcpPolicy) ?? 0,
    predictiveTriggers: normalizeStoredSourceVersion(value?.predictiveTriggers) ?? 0,
});

export const compiledSourceVersionsEqual = (
    left: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
    right: Partial<AnswerlatticeCompiledSourceVersions> | null | undefined,
): boolean => {
    if (!areAnswerlatticeCompiledSourceVersionsValid(left) || !areAnswerlatticeCompiledSourceVersionsValid(right)) return false;
    const a = normalizeCompiledSourceVersions(left);
    const b = normalizeCompiledSourceVersions(right);
    return [
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
    ].every((key) => a[key as AnswerlatticeContextSourceKey] === b[key as AnswerlatticeContextSourceKey]);
};

export const normalizeAnswerlatticeRoutePath = (value: unknown): string => {
    if (typeof value !== 'string') return '/';
    let path = value.trim();
    if (!path) return '/';
    try {
        if (/^https?:\/\//i.test(path)) path = new URL(path).pathname || '/';
    } catch {
        return '/';
    }
    path = path
        .split(/[?#]/)[0]
        .toLowerCase()
        .replace(/\/[0-9a-f-]{16,}/g, '/:id')
        .replace(/\/\d+/g, '/:id')
        .replace(/\/{2,}/g, '/');
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
};

export const buildAnswerlatticeRouteKey = (value: unknown): string => {
    const normalized = normalizeAnswerlatticeRoutePath(value);
    if (normalized === '*') return 'r_all';
    const key = normalized
        .replace(/[^a-z0-9:/_-]/g, '_')
        .replace(/[:/]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    return `r_${key || 'root'}`.slice(0, 96);
};
