/**
 * Answerlattice Unified Search — Core Pipeline
 *
 * THE single canonical search function that powers ALL Answerlattice search surfaces:
 * - Help Center top search bar (authenticated, full features)
 * - Embeddable Widget (API key auth, compact features)
 * - Future: mobile, Slack bot, API v2, etc.
 *
 * Each surface calls this function through its own thin API route wrapper.
 * The routes handle auth + rate limiting + response formatting.
 * This function handles the retrieval pipeline.
 *
 * Architecture:
 *   /api/helpCenter/search-kb  → withAuth()     → coreSearch()
 *   /api/widget/search         → API key auth   → coreSearch()
 *   /api/future/...            → custom auth    → coreSearch()
 *
 * @see __docs__/answerlattice/help-widget/
 * @see __docs__/answerlattice/help-center/
 */

/**
 * Answerlattice Unified Search — Core Pipeline
 *
 * THE single canonical search function that powers ALL Answerlattice search surfaces:
 * - Help Center top search bar (authenticated, full features)
 * - Embeddable Widget (API key auth, compact features)
 * - Future: mobile, Slack bot, API v2, etc.
 *
 * Each surface calls this function through its own thin API route wrapper.
 * The routes handle auth + rate limiting + response formatting.
 * This function handles the retrieval pipeline.
 *
 * Architecture:
 *   /api/helpCenter/search-kb  → withAuth()     → coreSearch()
 *   /api/widget/search         → API key auth   → coreSearch()
 *   /api/future/...            → custom auth    → coreSearch()
 *
 * @see __docs__/answerlattice/help-widget/
 * @see __docs__/answerlattice/help-center/
 */
import { DB_COLLECTIONS } from '@constant/database';
import { LOG_FILES } from '@constant/logging';
import { ANSWERLATTICE_EMBEDDING_VECTOR_FIELD } from '@constant/answerlattice/ai';
import { addAiSearchHistoryServer, findCachedSearchByCacheKeyServer } from '@database/aiSearchHistory/server';
import { getCachedEmbedding, saveCachedEmbedding } from '@database/queryEmbeddings';
import { answerlatticeFirestoreAdmin as firestoreAdmin, requireAnswerlatticeFirestoreAdmin, } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { normalizeQuery } from '@lib/string';
import { EMBEDDING_CACHE_VERSION, callGeminiChatWithMetadata, callGeminiEmbeddingWithMetadata, generateSearchQueryFromImageWithMetadata, } from '@lib/vectorEmbeddings';
import type { GeminiUsageMetadata } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { getAnswerlatticeTimestampMillis, isCachedSearchResultFresh } from '@lib/answerlattice/cacheFreshness';
import { ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT, fuseAnswerlatticeEvidenceRanks, prepareAnswerlatticeHybridEvidenceQuery, rankAnswerlatticeExactEntityEvidence, } from '@lib/answerlattice/hybridEvidenceRetrieval';
import { normalizeAnswerlatticeProductSurfaceScopeId } from '@lib/answerlattice/productSurfaceContent';
import { normalizeAnswerlatticeVersionLabel } from '@lib/answerlattice/releaseContracts';
import { parseAnswerlatticeRetrievalRelease, parseAnswerlatticeRetrievalSearchIndex, } from '@lib/answerlattice/retrievalContracts';
import { ANSWERLATTICE_CACHE_SOURCES, AnswerlatticeCacheSourceVersions } from '@lib/answerlattice/cacheVersionManifest';
import { getAnswerlatticeCacheVersionServer } from '@lib/answerlattice/cacheVersionServer';
import { ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH, ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES, isAllowedAnswerlatticeChatImageMimeType, normalizeAnswerlatticeChatImageMimeType, stripDataUrlPrefix, } from '@lib/answerlattice/chatImagePolicy';
import { readResponseUint8ArrayWithLimit } from '@lib/security/boundedResponseBody';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { hashString } from '@util/hash';
import { writeLogEntry } from 'logs/utils';
import { z } from 'zod';
import type { AiSearchHistory } from '@type/aiSearchHistory';
import type { AnswerlatticeEntitySearchIndex, AnswerlatticeRelease } from '@type/answerlattice';

import type { CoreSearchInput, CoreSearchReference, CoreSearchResult, SearchPerfMetrics } from './types';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

// Image processing constants
const TRUSTED_STORAGE_HOST = 'firebasestorage.googleapis.com';
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

const SIMILARITY_THRESHOLD = 0.6;
const SIMILARITY_THRESHOLD_LOW = 0.4;
const VECTOR_SEARCH_LIMIT = 12;
const RAG_CONTEXT_LIMIT = 6;
const SEARCH_CACHE_VERSION = 'rag-v4';
const ANSWERLATTICE_LOOKUP_CACHE_TTL_MS = 30_000;
const MAX_ANSWERLATTICE_LOOKUP_CACHE_ENTRIES = 300;

const LOG_FILE = LOG_FILES.KB_SEARCH;
const PERF_LOG = LOG_FILES.KB_SEARCH_PERFORMANCE;

const getSearchCoreErrorName = (error: unknown): string | undefined => {
    const errorName = getBoundedErrorName(error);
    if (errorName) return errorName.slice(0, 80);
    if (error && typeof error === 'object' && 'name' in error) {
        const name = (error as { name?: unknown }).name;
        return typeof name === 'string' ? name.slice(0, 80) : undefined;
    }
    return typeof error === 'string' ? 'StringError' : undefined;
};

const getSearchCoreErrorCode = (error: unknown): string | number | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code.slice(0, 80) : typeof code === 'number' ? code : undefined;
};

const getSearchCoreErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const source = 'status' in error ? (error as { status?: unknown }).status : (error as { statusCode?: unknown }).statusCode;
    const status = Number(source);
    return Number.isFinite(status) ? status : undefined;
};

const getSearchCoreFailureLogData = (code: string, error: unknown) => ({
    code,
    sourceErrorCode: getSearchCoreErrorCode(error),
    sourceErrorName: getSearchCoreErrorName(error),
    sourceErrorStatus: getSearchCoreErrorStatus(error),
});

const writeSearchPerfLogEntry = async (entry: Parameters<typeof writeLogEntry>[0]) => {
    try {
        await writeLogEntry(entry);
    } catch (error) {
        logRuntimeFailure('answerlattice_search_perf_log_write_failed', error, {
            ...getBoundedRuntimeStringContext('logFileName', entry.logFileName),
            ...getBoundedRuntimeStringContext('logType', entry.logType),
            hasData: Boolean(entry.data),
            hasError: Boolean(entry.error),
        });
    }
};

const saveAiSearchHistorySafely = async (
    data: Parameters<typeof addAiSearchHistoryServer>[0],
    context: { mountContext: CoreSearchInput['mountContext']; tId: number; sId: number },
) => {
    try {
        return await addAiSearchHistoryServer(data);
    } catch (error) {
        logRuntimeFailure('answerlattice_search_history_write_failed', error, {
            ...getBoundedRuntimeStringContext('mountContext', context.mountContext),
            ...getBoundedRuntimeStringContext('storeId', context.sId),
            ...getBoundedRuntimeStringContext('tenantId', context.tId),
            answerSource: data.answerSource || null,
            canonical: data.canonical === true,
            hasImage: Boolean(data.imageUrl || data.generatedQueryFromImage),
            referenceCount: Array.isArray(data.references) ? data.references.length : 0,
        });
        return null;
    }
};

type SearchCoreFailureError = Error & {
    code?: string;
    status?: number;
};

const createSearchCoreFailureError = (
    message: string,
    code: string,
    status?: number,
): SearchCoreFailureError => {
    const error = new Error(message) as SearchCoreFailureError;
    error.name = 'SearchCoreFailureError';
    error.code = code;
    if (typeof status === 'number' && Number.isFinite(status)) {
        error.status = status;
    }
    return error;
};

type KnowledgeBaseCacheState = {
    version: string;
    hasPublishedArticles: boolean;
    sourceVersion?: number;
    canonicalSourceVersion?: number;
};

type TimedCacheEntry<T> = {
    value: T;
    expiresAt: number;
};

const entitySearchIndexCache = new Map<string, TimedCacheEntry<AnswerlatticeEntitySearchIndex[]>>();
const latestReleaseCache = new Map<string, TimedCacheEntry<AnswerlatticeRelease | null>>();
const publishedKbStateCache = new Map<string, TimedCacheEntry<{ hasPublishedArticles: boolean; latestModified: number }>>();

const SearchAnswerSchema = z.object({
    craftedAnswer: z.string().trim().min(1).max(12_000),
    references: z.array(z.string().trim().min(1).max(180)).max(8).default([]),
    suggestedQuestions: z.array(z.string().trim().min(1).max(240)).max(3).default([]),
}).strict();

const normalizeStorageBucket = (value?: string | null): string | null => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;

    try {
        if (/^https?:\/\//i.test(trimmed)) {
            return new URL(trimmed).hostname;
        }
        if (trimmed.startsWith('gs://')) {
            return trimmed.slice('gs://'.length).split('/')[0] || null;
        }
    } catch {
        return null;
    }

    return trimmed.replace(/^\/+|\/+$/g, '');
};

const getDefaultBucketForProject = (projectId?: string | null): string | null => {
    const normalizedProjectId = String(projectId || '').trim();
    return normalizedProjectId ? `${normalizedProjectId}.appspot.com` : null;
};

const getTrustedStorageBucketPaths = (): string[] => {
    const buckets = [
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        process.env.FIREBASE_STORAGE_BUCKET,
        getDefaultBucketForProject(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
        process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_STORAGE_BUCKET,
        process.env.ANSWERLATTICE_FIREBASE_STORAGE_BUCKET,
        getDefaultBucketForProject(process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID || process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID),
    ]
        .map(normalizeStorageBucket)
        .filter((bucket): bucket is string => Boolean(bucket));

    return Array.from(new Set(buckets)).map((bucket) => `/v0/b/${bucket}/o`);
};

const isTrustedFirebaseStorageImageUrl = (url: URL): boolean => (
    url.protocol === 'https:'
    && url.hostname === TRUSTED_STORAGE_HOST
    && getTrustedStorageBucketPaths().some((bucketPath) => url.pathname.startsWith(bucketPath))
);

const getFirebaseStorageObjectPath = (url: URL): string | null => {
    const marker = '/o/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const encodedPath = url.pathname.slice(markerIndex + marker.length);
    if (!encodedPath) return null;

    try {
        return decodeURIComponent(encodedPath);
    } catch {
        return null;
    }
};

const isTrustedAnswerlatticeSearchImageUrl = (url: URL, tId: number, sId: number): boolean => {
    if (!isTrustedFirebaseStorageImageUrl(url)) return false;

    const objectPath = getFirebaseStorageObjectPath(url);
    if (!objectPath) return false;

    return objectPath.startsWith(`chatSessions/chatimages/${tId}/${sId}/`);
};

const isLikelyBase64 = (value: string): boolean => /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const imageMimeMatchesBuffer = (buffer: Buffer, mimeType: string): boolean => {
    if (mimeType === 'image/jpeg') {
        return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === 'image/png') {
        const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        return buffer.length >= png.length && png.every((byte, index) => buffer[index] === byte);
    }
    if (mimeType === 'image/gif') {
        const signature = buffer.subarray(0, 6).toString('ascii');
        return signature === 'GIF87a' || signature === 'GIF89a';
    }
    if (mimeType === 'image/webp') {
        return buffer.length >= 12
            && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
            && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    return false;
};

const detectImageMimeTypeFromBuffer = (buffer: Buffer): string | null => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
        if (imageMimeMatchesBuffer(buffer, mimeType)) return mimeType;
    }
    return null;
};

const readTimedCache = <T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | undefined => {
    const cached = cache.get(key);
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
        cache.delete(key);
        return undefined;
    }
    return cached.value;
};

const rememberTimedCache = <T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T) => {
    if (cache.size >= MAX_ANSWERLATTICE_LOOKUP_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, { value, expiresAt: Date.now() + ANSWERLATTICE_LOOKUP_CACHE_TTL_MS });
};

const getPublishedKnowledgeBaseState = async (
    tId: number,
    sId: number,
    cacheVersionToken: string,
): Promise<{ hasPublishedArticles: boolean; latestModified: number }> => {
    const cacheKey = `${tId}:${sId}:${cacheVersionToken}`;
    const cached = readTimedCache(publishedKbStateCache, cacheKey);
    if (cached !== undefined) return cached;

    const snapshot = await requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.KB_ARTICLES)
        .where('pId', '==', 'AL')
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'published')
        .where('active', '==', true)
        .orderBy('modifiedOn', 'desc')
        .limit(1)
        .select('modifiedOn')
        .get();
    const value = {
        hasPublishedArticles: !snapshot.empty,
        latestModified: snapshot.empty ? 0 : getAnswerlatticeTimestampMillis(snapshot.docs[0].data()?.modifiedOn),
    };
    rememberTimedCache(publishedKbStateCache, cacheKey, value);
    return value;
};

const getKnowledgeBaseCacheState = async (
    tId: number,
    sId: number,
    searchCacheVersion = SEARCH_CACHE_VERSION,
): Promise<KnowledgeBaseCacheState> => {
    let canonicalSourceVersion: number | undefined;
    try {
        const [manifestVersion, canonicalVersion] = await Promise.all([
            getAnswerlatticeCacheVersionServer(ANSWERLATTICE_CACHE_SOURCES.KB, tId, sId).catch(
                (): undefined => undefined,
            ),
            getAnswerlatticeCacheVersionServer(ANSWERLATTICE_CACHE_SOURCES.CANONICAL, tId, sId).catch((error): undefined => {
                logRuntimeFailure('answerlattice_canonical_cache_version_load_failed', error, {
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                });
                return undefined;
            }),
        ]);
        canonicalSourceVersion = canonicalVersion;
        const canonicalVersionToken = canonicalSourceVersion || 0;
        if (manifestVersion) {
            const publishedState = await getPublishedKnowledgeBaseState(tId, sId, `kbv${manifestVersion}`);
            return {
                version: `${searchCacheVersion}:kbv${manifestVersion}:cv${canonicalVersionToken}`,
                hasPublishedArticles: publishedState.hasPublishedArticles,
                sourceVersion: manifestVersion,
                canonicalSourceVersion,
            };
        }

        const publishedState = await getPublishedKnowledgeBaseState(tId, sId, 'legacy');
        if (!publishedState.hasPublishedArticles) {
            return {
                version: `${searchCacheVersion}:empty:cv${canonicalVersionToken}`,
                hasPublishedArticles: false,
                canonicalSourceVersion,
            };
        }

        return {
            version: `${searchCacheVersion}:${publishedState.latestModified || 'unknown'}:cv${canonicalVersionToken}`,
            hasPublishedArticles: true,
            sourceVersion: publishedState.latestModified || undefined,
            canonicalSourceVersion,
        };
    } catch {
        // Do not spend on RAG when knowledge availability cannot be verified.
        return {
            version: `${searchCacheVersion}:cv${canonicalSourceVersion || 0}`,
            hasPublishedArticles: false,
            canonicalSourceVersion,
        };
    }
};

const getAnswerlatticeEntitySearchIndexServer = async (tId: number, sId: number): Promise<AnswerlatticeEntitySearchIndex[]> => {
    const cacheKey = `${tId}:${sId}`;
    const cached = readTimedCache(entitySearchIndexCache, cacheKey);
    if (cached) return cached;

    const snapshot = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('pId', '==', 'AL')
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(501)
        .get();

    if (snapshot.size > 500) {
        throw new Error('Answerlattice entity search index exceeds the supported retrieval boundary.');
    }
    const searchIndex = snapshot.docs.map((doc) => parseAnswerlatticeRetrievalSearchIndex(
        { ...doc.data(), id: doc.id },
        { tId, sId },
    ));
    rememberTimedCache(entitySearchIndexCache, cacheKey, searchIndex);
    return searchIndex;
};

const getAnswerlatticeLatestReleaseServer = async (tId: number, sId: number): Promise<AnswerlatticeRelease | null> => {
    const cacheKey = `${tId}:${sId}`;
    const cached = readTimedCache(latestReleaseCache, cacheKey);
    if (cached !== undefined) return cached;

    const snapshot = await requireAnswerlatticeFirestoreAdmin()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
        .where('pId', '==', 'AL')
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .orderBy('versionNormalized', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        rememberTimedCache(latestReleaseCache, cacheKey, null);
        return null;
    }
    const doc = snapshot.docs[0];
    const release = parseAnswerlatticeRetrievalRelease({ ...doc.data(), id: doc.id }, { tId, sId });
    rememberTimedCache(latestReleaseCache, cacheKey, release);
    return release;
};

const isKnowledgeBaseRefusal = (answer: string): boolean => {
    const normalized = answer.toLowerCase();
    return normalized.includes('not available in the current knowledge base') ||
        normalized.includes("couldn't find") ||
        normalized.includes('could not find') ||
        normalized.includes('not documented') ||
        normalized.includes('no relevant articles');
};

const buildPublicKnowledgeBaseReference = (
    documentId: string,
    data: Record<string, unknown>,
    similarityScore?: number,
) => ({
    id: documentId,
    title: cleanSearchContextText(data.title, 240) || 'Help article',
    url: cleanSearchContextText(data.url, 500) || '',
    categoryId: cleanSearchContextText(data.categoryId, 180) || '',
    sectionId: cleanSearchContextText(data.sectionId, 180) || '',
    categoryTitle: cleanSearchContextText(data.categoryTitle, 180) || '',
    sectionTitle: cleanSearchContextText(data.sectionTitle, 180) || '',
    content: data.content,
    tags: Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20)
        : [],
    ...(typeof similarityScore === 'number' && Number.isFinite(similarityScore)
        ? { similarityScore }
        : {}),
});

const EMPTY_RESULT: CoreSearchResult = {
    craftedAnswer: `I couldn't find any relevant articles in our knowledge base for that specific question.

Try asking about another documented topic, or contact support if you need a confirmed answer.`,
    references: [],
    suggestedQuestions: [],
    canonical: false,
    answerSource: 'empty',
    imageProcessed: false,
};

const buildProductContextCacheToken = (productContext: CoreSearchInput['productContext']): string => {
    if (!productContext) return 'none';

    const stableContext = {
        contextVersion: productContext.contextVersion || 1,
        contextKey: productContext.contextKey || '',
        entityHints: Array.isArray(productContext.entityHints)
            ? productContext.entityHints.map(String).sort()
            : [],
        feature: productContext.feature || '',
        page: productContext.page || '',
        plan: productContext.plan || '',
        state: productContext.state || '',
        version: productContext.version || '',
        surfaceEntityIds: Array.isArray(productContext.surfaceEntityIds)
            ? productContext.surfaceEntityIds.map(String).sort()
            : [],
        userRole: productContext.userRole || '',
        workflow: productContext.workflow || '',
    };

    return hashString(JSON.stringify(stableContext));
};

const cleanSearchContextText = (value: unknown, maxLength = 140): string | undefined => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return undefined;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const getSearchTextLogContext = (query: unknown, effectiveQuery?: unknown) => ({
    queryLength: String(query || '').length,
    ...(effectiveQuery === undefined ? {} : {
        effectiveQueryLength: String(effectiveQuery || '').length,
        imageChangedQuery: String(effectiveQuery || '') !== String(query || ''),
    }),
});

const buildSearchHistoryRequestFields = (requestMetadata: CoreSearchInput['requestMetadata']) => {
    if (!requestMetadata) return {};

    const visitorId = cleanSearchContextText(requestMetadata.visitorId, 120);
    const visitorName = cleanSearchContextText(requestMetadata.visitorName, 160);
    const visitorEmail = cleanSearchContextText(requestMetadata.visitorEmail, 180);
    const widgetSessionId = cleanSearchContextText(requestMetadata.widgetSessionId, 120);
    const requestOrigin = cleanSearchContextText(requestMetadata.requestOrigin, 180);
    const requestPath = cleanSearchContextText(requestMetadata.requestPath, 180);
    const userAgentFamily = cleanSearchContextText(requestMetadata.userAgentFamily, 40);
    const evidenceLinks = Array.isArray(requestMetadata.evidenceLinks)
        ? requestMetadata.evidenceLinks.slice(0, 3).flatMap((link) => {
            const url = cleanSearchContextText(link?.url, 1000);
            if (!url) return [];
            const label = cleanSearchContextText(link?.label, 80);
            return [{ url, ...(label ? { label } : {}) }];
        })
        : [];

    return {
        ...(visitorId ? { visitorId } : {}),
        ...(visitorName ? { visitorName } : {}),
        ...(visitorEmail ? { visitorEmail } : {}),
        ...(widgetSessionId ? { widgetSessionId } : {}),
        ...(requestOrigin ? { requestOrigin } : {}),
        ...(requestPath ? { requestPath } : {}),
        ...(userAgentFamily ? { userAgentFamily } : {}),
        ...(requestMetadata.visitorVerified === true ? { visitorVerified: true } : {}),
        ...(evidenceLinks.length > 0 ? { debugEvidenceLinks: evidenceLinks } : {}),
    };
};

/**
 * Core search pipeline — the single source of truth for Answerlattice knowledge retrieval.
 *
 * Pipeline stages:
 * 1. SAFE_MODE check
 * 2. Image processing (if imageUrl or inline image buffer provided)
 * 2.5. Instant cache lookup (Upstash Redis — canonical answers only)
 * 3. Cache lookup (Firestore aiSearchHistory)
 * 4. Canonical-first retrieval (deterministic, zero LLM cost)
 *    → On canonical HIT: write to instant cache
 * 5. Owner FAQ/custom answer retrieval (deterministic, zero LLM cost)
 * 6. RAG fallback (embedding → vector search → optional exact/entity lane → Gemini answer generation)
 * 7. Entity-enriched RAG context (if canonical miss had entity matches)
 * 8. Search history logging + performance metrics
 */
export async function coreSearch(input: CoreSearchInput): Promise<CoreSearchResult> {
    const perfStart = Date.now();
    const perfMetrics: SearchPerfMetrics = {};
    const aiProviderOperations = new Set<string>();
    const aiProviderTokenUsage: NonNullable<CoreSearchResult['aiProviderTokenUsage']> = {
        candidatesTokenCount: 0,
        promptTokenCount: 0,
        tokenCountSource: 'none',
        totalTokenCount: 0,
    };

    let imageProcessed = false;
    let generatedQueryFromImage: string | undefined;
    let imageBufferForAi: { imageBase64: string; mimeType: string } | undefined;
    let imageCacheToken: string | undefined;
    let relatedContent: CoreSearchResult['relatedContent'];

    const {
        query: searchQuery,
        mountContext,
        tId: rawTId,
        sId: rawSId,
        uId,
        mode,
        conversationHistory,
        imageUrl,
        imageBuffer: inlineImageBuffer,
        productContext,
        requestMetadata,
        executionContext = 'production',
        retrievalPreload,
        beforeAiProviderCall,
    } = input;
    const isAnswerTestExecution = executionContext === 'answer_test';

    const addAiProviderTokenUsage = (usage?: GeminiUsageMetadata | null) => {
        if (!usage) return;
        const promptTokenCount = Number(usage.promptTokenCount || 0);
        const candidatesTokenCount = Number(usage.candidatesTokenCount || 0);
        const totalTokenCount = Number(usage.totalTokenCount || 0) || promptTokenCount + candidatesTokenCount;
        if (promptTokenCount <= 0 && candidatesTokenCount <= 0 && totalTokenCount <= 0) return;

        aiProviderTokenUsage.promptTokenCount += promptTokenCount;
        aiProviderTokenUsage.candidatesTokenCount += candidatesTokenCount;
        aiProviderTokenUsage.totalTokenCount += totalTokenCount;

        const source = usage.tokenCountSource || 'none';
        if (source === 'none') return;
        if (aiProviderTokenUsage.tokenCountSource === 'none') {
            aiProviderTokenUsage.tokenCountSource = source;
        } else if (aiProviderTokenUsage.tokenCountSource !== source) {
            aiProviderTokenUsage.tokenCountSource = 'mixed';
        }
    };

    const withAiProviderUsage = <T extends CoreSearchResult>(result: T): T => {
        const hasTokenUsage = aiProviderTokenUsage.totalTokenCount > 0
            || aiProviderTokenUsage.promptTokenCount > 0
            || aiProviderTokenUsage.candidatesTokenCount > 0;
        return {
            ...(relatedContent && !result.relatedContent ? { relatedContent } : {}),
            ...result,
            aiProviderOperations: Array.from(aiProviderOperations),
            ...(hasTokenUsage ? { aiProviderTokenUsage } : {}),
            aiProviderUsed: aiProviderOperations.size > 0,
        };
    };
    let aiProviderGatePromise: Promise<void> | null = null;
    const ensureAiProviderAllowed = async () => {
        if (!beforeAiProviderCall) return;
        if (!aiProviderGatePromise) aiProviderGatePromise = beforeAiProviderCall();
        await aiProviderGatePromise;
    };
    const hasConversationHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;

    const tId = normalizeAnswerlatticeProductSurfaceScopeId(rawTId);
    const sId = normalizeAnswerlatticeProductSurfaceScopeId(rawSId);
    if (!tId || !sId) {
        try {
            await writeSearchPerfLogEntry({
                logFileName: LOG_FILE,
                logType: 'ERROR_INVALID_TENANT_CONTEXT',
                data: {
                    mountContext,
                    hasTenantId: rawTId !== undefined && rawTId !== null,
                    hasStoreId: rawSId !== undefined && rawSId !== null,
                },
            });
        } catch {
            // Logging failure should not turn a fail-closed search into a 500.
        }
        return EMPTY_RESULT;
    }

    // ===== STAGE 1: SAFE_MODE =====
    // Pure boolean check — doesn't depend on NextResponse (route-agnostic)
    const { FEATURE_FLAGS } = await import('@config/features');
    if (FEATURE_FLAGS.ENABLE_COST_PROTECTION) {
        try {
            const db = firestoreAdmin;
            if (!db || typeof db.collection !== 'function') {
                throw new Error('Answerlattice Firestore Admin is not configured');
            }
            const doc = await db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
            if (doc.exists && doc.data()?.SAFE_MODE === true) {
                return {
                    ...EMPTY_RESULT,
                    craftedAnswer: 'System is temporarily under maintenance. Please try again shortly.',
                };
            }
        } catch (error) {
            logRuntimeFailure('answerlattice_safe_mode_check_failed_closed', error, {
                ...getBoundedRuntimeStringContext('mountContext', mountContext),
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
            });
            return {
                ...EMPTY_RESULT,
                craftedAnswer: 'System is temporarily under maintenance. Please try again shortly.',
            };
        }
    }

    // ===== STAGE 2: IMAGE PROCESSING =====
    if (inlineImageBuffer || imageUrl) {
        const imageStart = Date.now();

        try {
            if (inlineImageBuffer) {
                const mimeType = normalizeAnswerlatticeChatImageMimeType(inlineImageBuffer.mimeType);
                const imageBase64 = stripDataUrlPrefix(String(inlineImageBuffer.imageBase64 || ''));
                if (!isAllowedAnswerlatticeChatImageMimeType(mimeType)) {
                    throw new Error(`Unsupported image MIME type: ${mimeType || 'missing'}`);
                }
                if (!imageBase64 || imageBase64.length > ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH || !isLikelyBase64(imageBase64)) {
                    throw new Error('Inline image payload is empty or too large');
                }

                const buffer = Buffer.from(imageBase64, 'base64');
                if (!buffer.byteLength || buffer.byteLength > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error(`Inline image size exceeds ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / 1024 / 1024}MB limit`);
                }
                if (!imageMimeMatchesBuffer(buffer, mimeType)) {
                    throw new Error('Inline image content does not match declared MIME type');
                }

                imageBufferForAi = { imageBase64, mimeType };
                imageCacheToken = hashString(imageBase64);
            } else if (imageUrl) {
                // Security validation
                const url = new URL(imageUrl);
                if (!isTrustedAnswerlatticeSearchImageUrl(url, tId, sId)) {
                    throw new Error('Untrusted or invalid image URL');
                }

                // Fetch image with timeout and size check
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

                let response: Response;
                try {
                    response = await fetch(imageUrl, { redirect: 'manual', signal: controller.signal });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    throw createSearchCoreFailureError('Failed to fetch image', 'answerlattice_image_fetch_failed', response.status);
                }

                const imageBytes = await readResponseUint8ArrayWithLimit(response, ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES);
                if (!imageBytes.byteLength) {
                    throw new Error('Fetched image payload is empty');
                }

                const nodeBuffer = Buffer.from(imageBytes);
                const headerMimeType = normalizeAnswerlatticeChatImageMimeType(response.headers.get('content-type'));
                const mimeType = headerMimeType || detectImageMimeTypeFromBuffer(nodeBuffer) || '';
                if (!isAllowedAnswerlatticeChatImageMimeType(mimeType)) {
                    throw new Error(`Unsupported fetched image MIME type: ${mimeType || 'missing'}`);
                }
                if (!imageMimeMatchesBuffer(nodeBuffer, mimeType)) {
                    throw new Error('Fetched image content does not match declared MIME type');
                }

                const base64 = nodeBuffer.toString('base64');
                imageBufferForAi = { imageBase64: base64, mimeType };
                imageCacheToken = hashString(imageUrl);
            }

            if (!imageBufferForAi) {
                throw new Error('No image payload available for processing');
            }
            imageProcessed = true;

            // Generate search query from image
            await ensureAiProviderAllowed();
            const imageQueryResult = await generateSearchQueryFromImageWithMetadata(
                searchQuery,
                imageBufferForAi.imageBase64,
                imageBufferForAi.mimeType
            );
            generatedQueryFromImage = imageQueryResult.text;
            aiProviderOperations.add('image_query_generation');
            addAiProviderTokenUsage(imageQueryResult.usageMetadata);

        } catch (imageError) {
            // Graceful degradation: fallback to text-only search
            await writeSearchPerfLogEntry({
                logFileName: LOG_FILE,
                logType: 'WARNING_IMAGE_PROCESSING_FALLBACK',
                data: {
                    ...getSearchCoreFailureLogData('image_processing_fallback', imageError),
                    ...getSearchTextLogContext(searchQuery),
                    mountContext,
                }
            });
            imageProcessed = false;
            imageBufferForAi = undefined;
            imageCacheToken = undefined;
        }

        perfMetrics.imageProcessing = Date.now() - imageStart;
    }

    const queryForEmbedding = generatedQueryFromImage || searchQuery;
    let effectiveProductContext = productContext;

    if (
        FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES &&
        FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE &&
        productContext
    ) {
        try {
            const { resolveRelatedContentForSearch } = await import('@lib/answerlattice/productSurfaceContentServer');
            const resolved = await resolveRelatedContentForSearch({
                tId,
                sId,
                context: productContext,
                target: mountContext === 'widget' ? 'helpWidget' : 'helpCenter',
            });
            effectiveProductContext = resolved.retrievalContext as typeof effectiveProductContext;
            relatedContent = resolved.relatedContent;
        } catch (error) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'PRODUCT_SURFACE_CONTEXT_ERROR',
                data: {
                    ...getSearchCoreFailureLogData('product_surface_context_error', error),
                    mountContext,
                },
            });
        }
    }

    // ===== STAGE 2.5: INSTANT CACHE (Upstash Redis) =====
    // Only for canonical answers — deterministic, versioned, perfect cache objects.
    // Feature-flagged: ENABLE_ANSWERLATTICE_INSTANT_CACHE
    let instantCacheSearchIndex: AnswerlatticeEntitySearchIndex[] | undefined = retrievalPreload?.searchIndex;
    let instantCacheLatestRelease: AnswerlatticeRelease | null | undefined = retrievalPreload?.latestRelease;
    const instantCacheContextToken = buildProductContextCacheToken(effectiveProductContext);
    if (
        !isAnswerTestExecution
        && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE
        && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS
        // Graph state has no independently versioned cache identity. Until it
        // does, graph-aware selection must always run live.
        && !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH
    ) {
        try {
            const { instantCacheLookup } = await import('@lib/answerlattice/instantCache');
            const { answerlatticeTokenize } = await import('@lib/answerlattice/tokenizer');

            const searchIndex = await getAnswerlatticeEntitySearchIndexServer(tId, sId);
            instantCacheSearchIndex = searchIndex;
            if (searchIndex && searchIndex.length > 0) {
                const queryTokens = answerlatticeTokenize(searchQuery);

                // Quick entity match (same logic as canonicalRetrieval Layer 1)
                let topEntityId: string | null = null;
                let topScore = 0;
                for (const entry of searchIndex) {
                    let score = 0;
                    for (const token of queryTokens) {
                        if (entry.canonicalName.toLowerCase().includes(token)) score += entry.weight * 2;
                        for (const syn of entry.synonyms) {
                            if (syn.toLowerCase().includes(token)) score += entry.weight;
                        }
                        for (const indexToken of entry.normalizedTokens) {
                            if (indexToken === token) score += entry.weight * 1.5;
                        }
                    }
                    if (score > topScore) {
                        topScore = score;
                        topEntityId = entry.entityId;
                    }
                }

                if (topEntityId && topScore >= 2.0) {
                    const release = await getAnswerlatticeLatestReleaseServer(tId, sId);
                    instantCacheLatestRelease = release;
                    const version = release?.versionNormalized || 0;

                    const effectivePlan = effectiveProductContext?.plan;
                    const effectiveRole = effectiveProductContext?.userRole;
                    const effectiveState = effectiveProductContext?.state;

                    const cached = await instantCacheLookup(
                        tId,
                        sId,
                        topEntityId,
                        version,
                        searchQuery,
                        instantCacheContextToken,
                        effectivePlan,
                        effectiveRole,
                        effectiveState,
                    );

                    if (cached) {
                        perfMetrics.total = Date.now() - perfStart;

                        // Still save to aiSearchHistory for analytics (INV-4)
                        const normalizedTextQueryForKey = normalizeQuery(searchQuery);
                        const instantCacheKeyBase = imageCacheToken
                            ? `${normalizedTextQueryForKey}::IMAGE::${imageCacheToken}`
                            : normalizedTextQueryForKey;
                        const instantCacheMode = hasConversationHistory ? 'assistant' : 'qna';
                        const instantCacheKey = `${tId}:${sId}:${SEARCH_CACHE_VERSION}:${instantCacheKeyBase}::CTX::${instantCacheContextToken}::MODE::${instantCacheMode}`;

                        const savedHistory = await saveAiSearchHistorySafely({
                            query: searchQuery,
                            cacheKey: instantCacheKey,
                            tId,
                            sId,
                            uId,
                            mountContext,
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
                            citations: cached.citations || [],
                            suggestedQuestions: [],
                            canonical: true,
                            answerSource: 'canonical',
                            canonicalAnswerId: cached.canonicalAnswerId,
                            answerType: cached.answerType,
                            drifted: false,
                            guidedProcedure: cached.procedure || undefined,
                            matchedEntityIds: cached.matchedEntityIds,
                            confidence: cached.confidence,
                            sourceVersions: cached.sourceVersions,
                            ...buildSearchHistoryRequestFields(requestMetadata),
                        }, { mountContext, tId, sId });

                        await writeSearchPerfLogEntry({
                            logFileName: PERF_LOG,
                            userId: uId,
                            logType: 'INSTANT_CACHE_HIT',
                            data: {
                                ...getSearchTextLogContext(searchQuery),
                                totalMs: perfMetrics.total,
                                entityId: topEntityId,
                                answerId: cached.canonicalAnswerId,
                                mountContext,
                            }
                        });

                        return withAiProviderUsage({
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
                            citations: cached.citations || [],
                            suggestedQuestions: [],
                            searchHistoryId: savedHistory?.id,
                            canonical: true,
                            answerSource: 'canonical',
                            canonicalAnswerId: cached.canonicalAnswerId,
                            confidence: cached.confidence,
                            answerType: cached.answerType,
                            procedure: cached.procedure || undefined,
                            imageProcessed,
                        });
                    }

                    // Log cache miss for monitoring
                    await writeSearchPerfLogEntry({
                        logFileName: PERF_LOG,
                        userId: uId,
                        logType: 'INSTANT_CACHE_MISS',
                        data: { ...getSearchTextLogContext(searchQuery), entityId: topEntityId, mountContext }
                    });
                }
            }
        } catch (error) {
            logRuntimeFailure('answerlattice_instant_cache_stage_failed', error, {
                ...getBoundedRuntimeStringContext('mountContext', mountContext),
                ...getBoundedRuntimeStringContext('searchQuery', searchQuery),
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
            });
            // Graceful degradation — cache failure never blocks pipeline
        }
    }

    // ===== STAGE 3: CACHE LOOKUP =====
    const normalizedTextQuery = normalizeQuery(searchQuery);
    const cacheLookupKeyBase = imageCacheToken
        ? `${normalizedTextQuery}::IMAGE::${imageCacheToken}`
        : normalizedTextQuery;
    const contextCacheToken = buildProductContextCacheToken(effectiveProductContext);
    const modeCacheToken = hasConversationHistory ? 'assistant' : 'qna';
    const scopedCacheLookupKeyBase = `${cacheLookupKeyBase}::CTX::${contextCacheToken}::MODE::${modeCacheToken}`;
    const searchCacheVersion = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL
        ? `${SEARCH_CACHE_VERSION}:hybrid-evidence-v1`
        : SEARCH_CACHE_VERSION;
    const kbCacheState = await getKnowledgeBaseCacheState(tId, sId, searchCacheVersion);
    const cacheLookupKey = `${tId}:${sId}:${kbCacheState.version}:${scopedCacheLookupKeyBase}`;

    const cacheStart = Date.now();
    // Widget searches use a prefixed cache key to avoid collision, but hit same pipeline
    const effectiveCacheKey = `${EMBEDDING_CACHE_VERSION}:${mountContext === 'widget' ? `widget:${cacheLookupKey}` : cacheLookupKey}`;
    const withSavedSearchHistory = async (
        result: CoreSearchResult,
        historyContext: {
            matchedEntityIds?: string[];
            fallbackReason?: string;
            confidence?: CoreSearchResult['confidence'];
        } = {},
    ): Promise<CoreSearchResult> => {
        if (isAnswerTestExecution) {
            return withAiProviderUsage({
                ...result,
                searchHistoryId: undefined,
            });
        }

        const matchedEntityIds = Array.isArray(historyContext.matchedEntityIds)
            ? historyContext.matchedEntityIds.filter((id): id is string => typeof id === 'string' && Boolean(id)).slice(0, 20)
            : undefined;
        const savedHistory = await saveAiSearchHistorySafely({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            mountContext,
            generatedQueryFromImage,
            craftedAnswer: result.craftedAnswer,
            references: result.references || [],
            citations: result.citations || [],
            suggestedQuestions: result.suggestedQuestions || [],
            canonical: Boolean(result.canonical),
            answerSource: result.answerSource || (result.canonical ? 'canonical' : result.references?.length ? 'rag' : 'empty'),
            canonicalAnswerId: result.canonicalAnswerId,
            guidedProcedure: result.canonical && result.procedure ? result.procedure : undefined,
            answerType: result.answerType,
            drifted: result.drifted,
            faqAnswerId: result.faqAnswerId,
            matchedEntityIds,
            fallbackReason: historyContext.fallbackReason,
            clarification: result.clarification,
            confidence: result.confidence || historyContext.confidence,
            sourceVersions: {
                ...(kbCacheState.sourceVersion
                    ? { [ANSWERLATTICE_CACHE_SOURCES.KB]: kbCacheState.sourceVersion }
                    : {}),
                ...(kbCacheState.canonicalSourceVersion
                    ? { [ANSWERLATTICE_CACHE_SOURCES.CANONICAL]: kbCacheState.canonicalSourceVersion }
                    : {}),
            },
            ...buildSearchHistoryRequestFields(requestMetadata),
        }, { mountContext, tId, sId });

        return withAiProviderUsage({
            ...result,
            searchHistoryId: result.searchHistoryId || savedHistory?.id,
        });
    };

    // Cache lookup only for stateless authenticated Q&A.
    // Assistant-mode history and product context are part of the cache key so stale
    // or context-crossed answers cannot bypass canonical retrieval.
    // Widget skips shared search-history cache because feedback needs a per-answer record.
    let cachedResult: AiSearchHistory | null = null;
    if (!isAnswerTestExecution && mountContext === 'help_center' && uId && !hasConversationHistory) {
        try {
            cachedResult = await findCachedSearchByCacheKeyServer(
                cacheLookupKey,
                { tId, sId },
            );
        } catch (error) {
            logRuntimeFailure('answerlattice_search_history_cache_lookup_failed', error, {
                ...getBoundedRuntimeStringContext('mountContext', mountContext),
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
            });
            cachedResult = null;
        }
    }
    perfMetrics.cacheLookup = Date.now() - cacheStart;

    if (cachedResult) {
        const currentSourceVersions: AnswerlatticeCacheSourceVersions = {};
        if (kbCacheState.sourceVersion) {
            currentSourceVersions[ANSWERLATTICE_CACHE_SOURCES.KB] = kbCacheState.sourceVersion;
        }
        if (kbCacheState.canonicalSourceVersion) {
            currentSourceVersions[ANSWERLATTICE_CACHE_SOURCES.CANONICAL] = kbCacheState.canonicalSourceVersion;
        }
        const cacheFresh = await isCachedSearchResultFresh(cachedResult, tId, sId, currentSourceVersions);
        if (!cacheFresh) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'CACHE_STALE_BYPASS',
                data: {
                    ...getSearchTextLogContext(searchQuery),
                    cacheLookupMs: perfMetrics.cacheLookup,
                    mountContext,
                    canonical: !!cachedResult.canonical,
                    canonicalAnswerId: cachedResult.canonicalAnswerId || null,
                    referenceCount: Array.isArray(cachedResult.references) ? cachedResult.references.length : 0,
                }
            });
            cachedResult = null;
        }
    }

    if (cachedResult) {
        perfMetrics.total = Date.now() - perfStart;

        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CACHE_HIT',
            data: {
                ...getSearchTextLogContext(searchQuery),
                totalMs: perfMetrics.total,
                cacheLookupMs: perfMetrics.cacheLookup,
                mountContext,
                cached: true
            }
        });

        return withSavedSearchHistory({
            craftedAnswer: cachedResult.craftedAnswer,
            references: cachedResult.references,
            citations: cachedResult.citations || [],
            suggestedQuestions: cachedResult.suggestedQuestions || [],
            canonical: !!cachedResult.canonical,
            answerSource: cachedResult.answerSource || (cachedResult.canonical ? 'canonical' : cachedResult.references?.length ? 'rag' : 'cache'),
            canonicalAnswerId: cachedResult.canonicalAnswerId,
            faqAnswerId: cachedResult.faqAnswerId,
            confidence: cachedResult.confidence,
            fallbackReason: cachedResult.fallbackReason,
            clarification: cachedResult.clarification,
            answerType: cachedResult.answerType,
            drifted: cachedResult.drifted,
            procedure: cachedResult.guidedProcedure,
            imageProcessed: imageProcessed || !!cachedResult.imageUrl,
        }, {
            matchedEntityIds: cachedResult.matchedEntityIds,
            fallbackReason: cachedResult.fallbackReason,
            confidence: cachedResult.confidence,
        });
    }

    // ===== STAGE 4: CANONICAL-FIRST RETRIEVAL =====
    const { FEATURE_FLAGS: contextFlags } = await import('@config/features');

    // Parse product context (feature-flagged)
    let validatedContext = effectiveProductContext;
    if (!validatedContext && contextFlags.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
        // Context already validated by caller if provided
        validatedContext = undefined;
    }

    const {
        attemptCanonicalRetrieval,
        CANONICAL_GOVERNED_FALLBACK_MESSAGES,
        isCanonicalGovernedFallbackReason,
    } = await import('@lib/answerlattice/canonicalRetrieval');
    const canonicalStart = Date.now();
    const canonicalResult = await attemptCanonicalRetrieval(searchQuery, {
        tId,
        sId,
        currentVersion: normalizeAnswerlatticeVersionLabel(validatedContext?.version)?.normalized,
        context: validatedContext,
        preloadedSearchIndex: instantCacheSearchIndex,
        preloadedLatestRelease: instantCacheLatestRelease,
        activeAnswerCache: retrievalPreload?.activeAnswerCache,
    });
    perfMetrics.canonicalRetrieval = Date.now() - canonicalStart;

    if (canonicalResult.found && canonicalResult.canonical && canonicalResult.answer) {
        const answer = canonicalResult.answer;
        const canonicalCacheVersion = kbCacheState.canonicalSourceVersion;
        const canonicalSourceVersions = canonicalCacheVersion
            ? { [ANSWERLATTICE_CACHE_SOURCES.CANONICAL]: canonicalCacheVersion }
            : undefined;

        // Save to search history for analytics
        const savedHistory = isAnswerTestExecution
            ? null
            : await saveAiSearchHistorySafely({
                query: searchQuery,
                cacheKey: cacheLookupKey,
                tId,
                sId,
                uId,
                mountContext,
                craftedAnswer: answer.content.detailedExplanation || answer.content.structuredSummary,
                references: [],
                citations: canonicalResult.citations || [],
                suggestedQuestions: [],
                canonical: true,
                answerSource: 'canonical',
                canonicalAnswerId: answer.id,
                answerType: answer.answerType || 'explanation',
                drifted: answer.governance.driftFlag,
                guidedProcedure: answer.answerType === 'procedure' ? answer.content.procedure : undefined,
                matchedEntityIds: canonicalResult.matchedEntityIds,
                confidence: canonicalResult.confidence,
                sourceVersions: canonicalSourceVersions,
                ...buildSearchHistoryRequestFields(requestMetadata),
            }, { mountContext, tId, sId });

        perfMetrics.total = Date.now() - perfStart;

        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CANONICAL_HIT',
            data: {
                ...getSearchTextLogContext(searchQuery),
                totalMs: perfMetrics.total,
                canonicalRetrievalMs: perfMetrics.canonicalRetrieval,
                answerId: answer.id,
                confidence: canonicalResult.confidence,
                matchedEntities: canonicalResult.matchedEntityIds,
                drifted: answer.governance.driftFlag,
                mountContext,
            }
        });

        const result: CoreSearchResult = {
            craftedAnswer: answer.content.detailedExplanation || answer.content.structuredSummary,
            references: [],
            citations: canonicalResult.citations || [],
            suggestedQuestions: [],
            canonical: true,
            answerSource: 'canonical',
            canonicalAnswerId: answer.id,
            confidence: canonicalResult.confidence,
            answerType: answer.answerType || 'explanation',
            drifted: answer.governance.driftFlag,
            searchHistoryId: savedHistory?.id,
            imageProcessed,
            graphExpansion: canonicalResult.graphExpansion,
        };

        // Guided Workflows: include procedure structure when available
        if (answer.answerType === 'procedure' && answer.content.procedure) {
            result.procedure = answer.content.procedure;
        }

        // Knowledge Graph: log expansion details for monitoring
        if (canonicalResult.graphExpansion) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'GRAPH_EXPANSION_HIT',
                data: {
                    ...getSearchTextLogContext(searchQuery),
                    originalEntities: canonicalResult.graphExpansion.originalEntities,
                    expandedEntities: canonicalResult.graphExpansion.expandedEntities,
                    expansionCount: canonicalResult.graphExpansion.expandedEntities.length - canonicalResult.graphExpansion.originalEntities.length,
                    interactionDetected: !!canonicalResult.graphExpansion.interactionDetected,
                    suggestionsCount: canonicalResult.graphExpansion.relatedSuggestions?.length || 0,
                    mountContext,
                }
            });
        }

        // Write to instant cache for next time (fire-and-forget)
        if (
            !isAnswerTestExecution
            && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE
            && !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH
            && canonicalResult.matchedEntityIds.length > 0
        ) {
            try {
                const { instantCacheWrite } = await import('@lib/answerlattice/instantCache');
                void instantCacheWrite(
                    tId, sId,
                    canonicalResult.matchedEntityIds[0],
                    answer,
                    canonicalResult.matchedEntityIds,
                    canonicalResult.confidence === 'none' ? 'low' : canonicalResult.confidence,
                    searchQuery,
                    instantCacheContextToken,
                    effectiveProductContext?.plan,
                    effectiveProductContext?.userRole,
                    effectiveProductContext?.state,
                    canonicalSourceVersions,
                ).catch((error) => {
                    logRuntimeFailure('answerlattice_instant_cache_write_invocation_failed', error, {
                        ...getBoundedRuntimeStringContext('answerId', answer.id),
                        ...getBoundedRuntimeStringContext('mountContext', mountContext),
                        ...getBoundedRuntimeStringContext('storeId', sId),
                        ...getBoundedRuntimeStringContext('tenantId', tId),
                        matchedEntityCount: canonicalResult.matchedEntityIds.length,
                    });
                });
            } catch (error) {
                logRuntimeFailure('answerlattice_instant_cache_write_import_failed', error, {
                    ...getBoundedRuntimeStringContext('answerId', answer.id),
                    ...getBoundedRuntimeStringContext('mountContext', mountContext),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    matchedEntityCount: canonicalResult.matchedEntityIds.length,
                });
            }
        }

        return withAiProviderUsage(result);
    }

    // Log canonical miss for mutation proposal tracking
    if (!canonicalResult.found && canonicalResult.fallbackReason) {
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CANONICAL_MISS',
            data: {
                ...getSearchTextLogContext(searchQuery),
                reason: canonicalResult.fallbackReason,
                matchedEntities: canonicalResult.matchedEntityIds,
                canonicalRetrievalMs: perfMetrics.canonicalRetrieval,
                mountContext,
            }
        });
    }

    const canonicalMissHistoryContext = {
        matchedEntityIds: canonicalResult.matchedEntityIds,
        fallbackReason: canonicalResult.fallbackReason,
        confidence: canonicalResult.confidence,
    };
    const saveWithCanonicalMissContext = (result: CoreSearchResult) =>
        withSavedSearchHistory(result, canonicalMissHistoryContext);

    if (isCanonicalGovernedFallbackReason(canonicalResult.fallbackReason)) {
        const fallbackReason = canonicalResult.fallbackReason;
        const governanceReviewRequired = fallbackReason === 'canonical_answer_review_required';
        const safeFallback: CoreSearchResult = {
            craftedAnswer: CANONICAL_GOVERNED_FALLBACK_MESSAGES[fallbackReason],
            references: [],
            suggestedQuestions: [],
            canonical: false,
            answerSource: 'empty',
            confidence: 'low',
            fallbackReason,
            clarification: canonicalResult.clarification,
            drifted: governanceReviewRequired,
            imageProcessed,
        };

        perfMetrics.total = Date.now() - perfStart;
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CANONICAL_GOVERNED_FALLBACK',
            data: {
                reason: fallbackReason,
                matchedEntities: canonicalResult.matchedEntityIds,
                canonicalRetrievalMs: perfMetrics.canonicalRetrieval,
                totalMs: perfMetrics.total,
                mountContext,
            },
        });

        if (isAnswerTestExecution) return withAiProviderUsage(safeFallback);

        const canonicalSourceVersion = await getAnswerlatticeCacheVersionServer(
            ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
            tId,
            sId,
        ).catch((error): undefined => {
            logRuntimeFailure('answerlattice_governance_fallback_cache_version_load_failed', error, {
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
            });
            return undefined;
        });
        const sourceVersions: AnswerlatticeCacheSourceVersions = {};
        if (kbCacheState.sourceVersion) {
            sourceVersions[ANSWERLATTICE_CACHE_SOURCES.KB] = kbCacheState.sourceVersion;
        }
        if (canonicalSourceVersion) {
            sourceVersions[ANSWERLATTICE_CACHE_SOURCES.CANONICAL] = canonicalSourceVersion;
        }
        const savedHistory = await saveAiSearchHistorySafely({
            query: searchQuery,
            cacheKey: `${cacheLookupKey}::${fallbackReason.toUpperCase()}`,
            tId,
            sId,
            uId,
            mountContext,
            generatedQueryFromImage,
            craftedAnswer: safeFallback.craftedAnswer,
            references: [],
            citations: [],
            canonical: false,
            answerSource: 'empty',
            matchedEntityIds: canonicalResult.matchedEntityIds,
            fallbackReason,
            clarification: safeFallback.clarification,
            confidence: safeFallback.confidence,
            sourceVersions,
            ...buildSearchHistoryRequestFields(requestMetadata),
        }, { mountContext, tId, sId });

        return withAiProviderUsage({
            ...safeFallback,
            searchHistoryId: savedHistory?.id,
        });
    }

    // ===== STAGE 5: OWNER FAQ / CUSTOM ANSWER RETRIEVAL =====
    // Published FAQs are owner-approved short answers. They run after canonical
    // miss and before embeddings/RAG, so custom Q&A can resolve common questions
    // without model latency or provider cost.
    try {
        const { attemptFaqAnswerRetrieval } = await import('@lib/answerlattice/faqRetrieval');
        const faqStart = Date.now();
        const faqResult = await attemptFaqAnswerRetrieval(queryForEmbedding, {
            tId,
            sId,
            context: validatedContext,
            relatedContent,
            sourceVersion: kbCacheState.sourceVersion,
            includeFullArticleReference: true,
        });
        perfMetrics.faqRetrieval = Date.now() - faqStart;

        if (faqResult.found && faqResult.faq) {
            perfMetrics.total = Date.now() - perfStart;
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'FAQ_ANSWER_HIT',
                data: {
                    ...getSearchTextLogContext(searchQuery, queryForEmbedding),
                    faqId: faqResult.faq.id,
                    score: faqResult.score || 0,
                    confidence: faqResult.confidence,
                    matchReason: faqResult.matchReason || null,
                    referenceCount: faqResult.references.length,
                    canonicalRetrievalMs: perfMetrics.canonicalRetrieval,
                    faqRetrievalMs: perfMetrics.faqRetrieval,
                    totalMs: perfMetrics.total,
                    mountContext,
                },
            });

            return saveWithCanonicalMissContext({
                craftedAnswer: faqResult.faq.answer,
                references: faqResult.references,
                suggestedQuestions: [],
                canonical: false,
                answerSource: 'faq',
                faqAnswerId: faqResult.faq.id,
                confidence: faqResult.confidence,
                answerType: 'faq',
                imageProcessed,
            });
        }
    } catch (error) {
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'FAQ_RETRIEVAL_ERROR',
            data: {
                ...getSearchTextLogContext(searchQuery, queryForEmbedding),
                ...getSearchCoreFailureLogData('faq_retrieval_error', error),
                mountContext,
            },
        });
    }

    // Helper: evaluate escalation for empty/no-result paths (avoids code duplication)
    const buildEmptyEscalation = async () => {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AI_ESCALATION) return undefined;
        try {
            const { evaluateEscalation } = await import('@lib/answerlattice/escalationEvaluator');
            return evaluateEscalation({
                canonicalResult,
                ragDocuments: [],
                searchQuery,
                productContext: effectiveProductContext,
                effectiveQuery: queryForEmbedding,
                answerWasEmpty: true,
            });
        } catch { return undefined; }
    };

    if (!kbCacheState.hasPublishedArticles) {
        perfMetrics.total = Date.now() - perfStart;
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'KB_EMPTY_SKIP_RAG',
            data: {
                ...getSearchTextLogContext(searchQuery),
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    // ===== STAGE 5: RAG FALLBACK (Vector Search) =====
    const embeddingStart = Date.now();
    let queryVector = null;
    try {
        queryVector = await getCachedEmbedding(effectiveCacheKey, { tId, sId });
    } catch (error) {
        logRuntimeFailure('answerlattice_query_embedding_cache_read_failed', error, {
            ...getBoundedRuntimeStringContext('mountContext', mountContext),
            ...getBoundedRuntimeStringContext('storeId', sId),
            ...getBoundedRuntimeStringContext('tenantId', tId),
        });
    }

    if (!queryVector) {
        await ensureAiProviderAllowed();
        const embeddingResult = await callGeminiEmbeddingWithMetadata(queryForEmbedding, { purpose: 'query' });
        queryVector = embeddingResult.vector;
        aiProviderOperations.add('embedding_generation');
        addAiProviderTokenUsage(embeddingResult.usageMetadata);
        try {
            await saveCachedEmbedding(effectiveCacheKey, queryForEmbedding, queryVector, { tId, sId });
        } catch (error) {
            logRuntimeFailure('answerlattice_query_embedding_cache_write_failed', error, {
                ...getBoundedRuntimeStringContext('mountContext', mountContext),
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
            });
        }
    }

    perfMetrics.embeddingGeneration = Date.now() - embeddingStart;

    const vectorSearchStart = Date.now();
    const articlesRef = requireAnswerlatticeFirestoreAdmin().collection(DB_COLLECTIONS.KB_ARTICLES);

    // Multi-tenant KB filtering is mandatory for every Answerlattice mount.
    const articleQuery = articlesRef
        .where('pId', '==', 'AL')
        .where('status', '==', 'published')
        .where('active', '==', true)
        .where('tId', '==', tId)
        .where('sId', '==', sId);

    let snapshot;
    try {
        snapshot = await articleQuery
            .findNearest({
                vectorField: ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
                queryVector: queryVector,
                limit: VECTOR_SEARCH_LIMIT,
                distanceMeasure: 'COSINE',
                distanceResultField: 'distance',
            }).get();
    } catch (vectorError) {
        perfMetrics.vectorSearch = Date.now() - vectorSearchStart;
        perfMetrics.total = Date.now() - perfStart;
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'VECTOR_SEARCH_ERROR',
            data: {
                ...getSearchTextLogContext(searchQuery),
                ...getSearchCoreFailureLogData('vector_search_error', vectorError),
                vectorSearchMs: perfMetrics.vectorSearch,
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    perfMetrics.vectorSearch = Date.now() - vectorSearchStart;

    const documentsFound = snapshot.docs.map(doc => {
        const distance = Number(doc.get('distance'));
        const similarityScore = Number.isFinite(distance)
            ? Math.max(0, Math.min(1, 1 - distance))
            : 0;
        return buildPublicKnowledgeBaseReference(doc.id, doc.data(), similarityScore);
    });

    let vectorDocumentsMatched = documentsFound.filter(
        (doc) => (doc.similarityScore ?? 0) > SIMILARITY_THRESHOLD,
    );

    if (documentsFound.length && !vectorDocumentsMatched.length) {
        vectorDocumentsMatched = documentsFound.filter(
            (doc) => (doc.similarityScore ?? 0) > SIMILARITY_THRESHOLD_LOW,
        );
    }

    const preparedHybridEvidenceQuery = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL
        ? prepareAnswerlatticeHybridEvidenceQuery(queryForEmbedding, canonicalResult.matchedEntityIds)
        : { eligible: false, entityIds: [], technicalLiterals: [] };
    let exactEntityCandidateCount = 0;
    let exactEntityMatches: ReturnType<typeof rankAnswerlatticeExactEntityEvidence> = [];
    const exactEntityReferences = new Map<string, ReturnType<typeof buildPublicKnowledgeBaseReference>>();

    if (preparedHybridEvidenceQuery.eligible) {
        const entityEvidenceStart = Date.now();
        try {
            const entitySnapshot = await articleQuery
                .where('entityIds', 'array-contains-any', preparedHybridEvidenceQuery.entityIds)
                .limit(ANSWERLATTICE_HYBRID_EVIDENCE_QUERY_LIMIT)
                .get();
            exactEntityCandidateCount = entitySnapshot.size;

            const exactEntityCandidates = entitySnapshot.docs.map(doc => {
                const data = doc.data();
                exactEntityReferences.set(doc.id, buildPublicKnowledgeBaseReference(doc.id, data));
                return {
                    id: doc.id,
                    title: typeof data.title === 'string' ? data.title : '',
                    tags: Array.isArray(data.tags)
                        ? data.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 20)
                        : [],
                    contentText: extractPlainTextFromEditorContent(data.content),
                    entityIds: data.entityIds,
                    modifiedOnMs: getAnswerlatticeTimestampMillis(data.modifiedOn),
                };
            });
            exactEntityMatches = rankAnswerlatticeExactEntityEvidence(
                preparedHybridEvidenceQuery,
                exactEntityCandidates,
            );
        } catch (error) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'HYBRID_EVIDENCE_RETRIEVAL_ERROR',
                data: {
                    ...getSearchCoreFailureLogData('hybrid_evidence_retrieval_error', error),
                    entityCount: preparedHybridEvidenceQuery.entityIds.length,
                    technicalLiteralCount: preparedHybridEvidenceQuery.technicalLiterals.length,
                    mountContext,
                },
            });
        } finally {
            perfMetrics.entityEvidenceRetrieval = Date.now() - entityEvidenceStart;
        }
    }

    let documentsMatched = vectorDocumentsMatched;
    if (exactEntityMatches.length > 0) {
        const documentById = new Map(
            vectorDocumentsMatched.map(document => [document.id, document]),
        );
        for (const match of exactEntityMatches) {
            const reference = exactEntityReferences.get(match.id);
            if (reference && !documentById.has(match.id)) documentById.set(match.id, reference);
        }
        const fusedRanks = fuseAnswerlatticeEvidenceRanks({
            vectorDocumentIds: vectorDocumentsMatched.map(document => document.id),
            exactEntityMatches,
            limit: VECTOR_SEARCH_LIMIT,
        });
        documentsMatched = fusedRanks
            .map(rank => documentById.get(rank.id))
            .filter((document): document is ReturnType<typeof buildPublicKnowledgeBaseReference> => Boolean(document));
    }

    if (!documentsMatched.length) {
        perfMetrics.total = Date.now() - perfStart;
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'VECTOR_LOW_CONFIDENCE_MISS',
            data: {
                ...getSearchTextLogContext(searchQuery),
                topScore: documentsFound[0]?.similarityScore || 0,
                threshold: SIMILARITY_THRESHOLD_LOW,
                hybridEvidenceEligible: preparedHybridEvidenceQuery.eligible,
                exactEntityCandidateCount,
                exactEntityMatchCount: exactEntityMatches.length,
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    const documentsForPrompt = documentsMatched.slice(0, RAG_CONTEXT_LIMIT);

    const payloadToGemini = documentsForPrompt.map((d) => ({
        docId: d.id,
        category: d.categoryTitle,
        section: d.sectionTitle,
        title: d.title,
        content: extractPlainTextFromEditorContent(d.content),
    }));

    // ===== STAGE 6: ENTITY-ENRICHED RAG CONTEXT =====
    // Knowledge Graph: use expanded entities (richer context) when graph expansion is available
    const entityIdsForRagEnrichment = canonicalResult.graphExpansion?.expandedEntities
        ?? canonicalResult.matchedEntityIds;
    if (!canonicalResult.found && entityIdsForRagEnrichment?.length > 0) {
        try {
            const { getEntityDescriptions, buildEntityContextBlock } = await import('@lib/answerlattice/canonicalRetrieval');
            const entityDescs = await getEntityDescriptions(entityIdsForRagEnrichment, tId, sId);
            if (entityDescs.length > 0) {
                const contextBlock = buildEntityContextBlock(entityDescs);
                payloadToGemini.unshift({
                    docId: '_entity_context',
                    category: 'Product Concepts',
                    section: 'Entity Definitions',
                    title: 'Relevant Product Concepts',
                    content: contextBlock,
                });
            }
        } catch {
            // Graceful degradation — entity enrichment failure never blocks RAG
        }
    }

    // ===== STAGE 7: FINAL ANSWER GENERATION =====
    const answerStart = Date.now();

    await ensureAiProviderAllowed();
    const geminiAnswerResult = await callGeminiChatWithMetadata(
        searchQuery,
        payloadToGemini,
        undefined,
        conversationHistory,
        generatedQueryFromImage
    );
    const geminiAnswer = geminiAnswerResult.text;
    aiProviderOperations.add('answer_generation');
    addAiProviderTokenUsage(geminiAnswerResult.usageMetadata);
    perfMetrics.answerGeneration = Date.now() - answerStart;

    if (geminiAnswer) {
        let generatedData: unknown;
        try {
            generatedData = JSON.parse(geminiAnswer);
        } catch (parseError) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_JSON_PARSE_FAILED',
                data: {
                    ...getSearchTextLogContext(searchQuery),
                    ...getSearchCoreFailureLogData('answer_json_parse_failed', parseError),
                    responsePresent: Boolean(geminiAnswer),
                    responseLength: String(geminiAnswer || '').length,
                    mountContext,
                }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        const parsedAnswer = SearchAnswerSchema.safeParse(generatedData);
        if (!parsedAnswer.success) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_SCHEMA_INVALID',
                data: {
                    answerPresent: Boolean(geminiAnswer),
                    responseLength: String(geminiAnswer || '').length,
                    mountContext,
                },
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }
        const craftedAnswer = parsedAnswer.data.craftedAnswer;
        const generatedReferenceIds = Array.from(new Set(parsedAnswer.data.references));
        const suggestedQuestions = parsedAnswer.data.suggestedQuestions;

        if (!craftedAnswer) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_EMPTY',
                data: { ...getSearchTextLogContext(searchQuery), mountContext }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        // Resolve reference IDs to full document objects
        const resolvedReferences: CoreSearchReference[] = [];
        if (generatedReferenceIds.length) {
            generatedReferenceIds.forEach((refDocId: string) => {
                const doc = documentsForPrompt.find(d => d.id === refDocId);
                if (doc) {
                    resolvedReferences.push(doc);
                }
            });
        }

        if (!resolvedReferences.length && !isKnowledgeBaseRefusal(craftedAnswer)) {
            await writeSearchPerfLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_WITHOUT_VALID_REFERENCES_BLOCKED',
                data: {
                    ...getSearchTextLogContext(searchQuery),
                    referenceIds: generatedReferenceIds.slice(0, 10),
                    promptDocumentCount: documentsForPrompt.length,
                    mountContext,
                }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        // Save search history
        const savedHistory = isAnswerTestExecution
            ? null
            : await saveAiSearchHistorySafely({
                query: searchQuery,
                cacheKey: cacheLookupKey,
                tId,
                sId,
                uId,
                mountContext,
                generatedQueryFromImage,
                craftedAnswer,
                references: resolvedReferences,
                suggestedQuestions,
                answerSource: 'rag',
                matchedEntityIds: canonicalMissHistoryContext.matchedEntityIds,
                fallbackReason: canonicalMissHistoryContext.fallbackReason,
                confidence: canonicalMissHistoryContext.confidence,
                sourceVersions: kbCacheState.sourceVersion
                    ? { [ANSWERLATTICE_CACHE_SOURCES.KB]: kbCacheState.sourceVersion }
                    : undefined,
                ...buildSearchHistoryRequestFields(requestMetadata),
            }, { mountContext, tId, sId });

        perfMetrics.total = Date.now() - perfStart;

        // Log performance metrics
        await writeSearchPerfLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'SEARCH_COMPLETE',
            data: {
                ...getSearchTextLogContext(searchQuery),
                cached: false,
                hasImage: imageProcessed,
                assistantMode: mode === 'assistant',
                totalMs: perfMetrics.total,
                imageProcessingMs: perfMetrics.imageProcessing || 0,
                cacheLookupMs: perfMetrics.cacheLookup,
                embeddingGenerationMs: perfMetrics.embeddingGeneration,
                vectorSearchMs: perfMetrics.vectorSearch,
                entityEvidenceRetrievalMs: perfMetrics.entityEvidenceRetrieval || 0,
                answerGenerationMs: perfMetrics.answerGeneration,
                answerLength: craftedAnswer.length,
                promptDocumentCount: documentsForPrompt.length,
                hybridEvidenceEligible: preparedHybridEvidenceQuery.eligible,
                exactEntityCandidateCount,
                exactEntityMatchCount: exactEntityMatches.length,
                mountContext,
            }
        });

        // ===== STAGE 7.5: ESCALATION EVALUATION =====
        let escalation: import('@lib/answerlattice/escalationTypes').EscalationMetadata | undefined;
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AI_ESCALATION) {
            try {
                const { evaluateEscalation } = await import('@lib/answerlattice/escalationEvaluator');
                escalation = evaluateEscalation({
                    canonicalResult,
                    // Escalation evaluates only evidence the final answer actually cited.
                    // Candidate documents that the model ignored are not answer evidence.
                    ragDocuments: resolvedReferences
                        .filter(d => typeof d.similarityScore === 'number')
                        .slice(0, 5)
                        .map(d => ({
                            id: d.id,
                            title: d.title || 'Untitled',
                            similarityScore: d.similarityScore as number,
                    })),
                    searchQuery,
                    productContext: effectiveProductContext,
                    effectiveQuery: queryForEmbedding,
                    answerWasEmpty: !craftedAnswer || isKnowledgeBaseRefusal(craftedAnswer),
                });
            } catch {
                // Graceful degradation — escalation failure never blocks search
            }
        }

        return withAiProviderUsage({
            craftedAnswer,
            references: resolvedReferences,
            suggestedQuestions,
            searchHistoryId: savedHistory?.id,
            canonical: false,
            answerSource: 'rag',
            imageProcessed,
            escalation,
        });
    }

    // Gemini returned null — use shared empty escalation helper
    return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
}
