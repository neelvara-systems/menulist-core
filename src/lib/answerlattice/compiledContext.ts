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
): boolean => {
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
    ].every((key) => Number(a[key as AnswerlatticeContextSourceKey] || 0) === Number(b[key as AnswerlatticeContextSourceKey] || 0));
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
