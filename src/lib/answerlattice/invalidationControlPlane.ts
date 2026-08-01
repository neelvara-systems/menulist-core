import {
    ANSWERLATTICE_CACHE_SOURCES,
    type AnswerlatticeCacheSource,
} from './cacheVersionManifest';
import {
    ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS,
    EMPTY_BUNDLE_STATS,
    normalizeCompiledSourceVersions,
} from './compiledContext';

type Scope = { tId: number; sId: number };
type MissingBundleManifestBase = {
    activeVersion: number;
    bundleVersion: number;
    bundles: Record<string, never>;
    generatedAt: null;
    lastBuildError: null;
    lastReadyVersion: number;
    limits: typeof ANSWERLATTICE_CONTEXT_BUNDLE_LIMITS;
    pId: 'AL';
    publicBundleId: string;
    schemaVersion: number;
    sourceVersions: ReturnType<typeof normalizeCompiledSourceVersions>;
    stats: typeof EMPTY_BUNDLE_STATS;
    sId: number;
    tId: number;
};

export const getAnswerlatticeMissingSourceVersionsBase = (scope: Scope) => ({
    schemaVersion: 1,
    pId: 'AL',
    ...scope,
    ...normalizeCompiledSourceVersions({}),
});

export const getAnswerlatticeMissingBundleManifestBase = (scope: Scope): MissingBundleManifestBase => ({
    schemaVersion: 1,
    pId: 'AL',
    ...scope,
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

export const getAnswerlatticeInvalidationCacheSources = (options: {
    canonical?: boolean;
    faqs?: boolean;
    kb?: boolean;
}): AnswerlatticeCacheSource[] => [
    ...(options.canonical ? [ANSWERLATTICE_CACHE_SOURCES.CANONICAL] : []),
    ...(options.kb || options.faqs ? [ANSWERLATTICE_CACHE_SOURCES.KB] : []),
];
