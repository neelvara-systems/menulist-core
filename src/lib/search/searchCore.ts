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
import { addAiSearchHistoryServer, findCachedSearchByCacheKeyServer } from '@database/aiSearchHistory/server';
import { getCachedEmbedding, saveCachedEmbedding } from '@database/queryEmbeddings';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { normalizeQuery } from '@lib/string';
import {
    EMBEDDING_CACHE_VERSION,
    callGeminiChatWithMetadata,
    callGeminiEmbeddingWithMetadata,
    generateSearchQueryFromImageWithMetadata,
} from '@lib/vectorEmbeddings';
import type { GeminiUsageMetadata } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { getAnswerlatticeTimestampMillis, isCachedSearchResultFresh } from '@lib/answerlattice/cacheFreshness';
import { ANSWERLATTICE_CACHE_SOURCES, AnswerlatticeCacheSourceVersions } from '@lib/answerlattice/cacheVersionManifest';
import { getAnswerlatticeCacheVersionServer } from '@lib/answerlattice/cacheVersionServer';
import {
    ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH,
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
    stripDataUrlPrefix,
} from '@lib/answerlattice/chatImagePolicy';
import { hashString } from '@util/hash';
import { writeLogEntry } from 'logs/utils';

import type { CoreSearchInput, CoreSearchResult, SearchPerfMetrics } from './types';

// Image processing constants
const TRUSTED_STORAGE_HOST = 'firebasestorage.googleapis.com';
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

const SIMILARITY_THRESHOLD = 0.6;
const SIMILARITY_THRESHOLD_LOW = 0.4;
const VECTOR_SEARCH_LIMIT = 12;
const RAG_CONTEXT_LIMIT = 6;
const SEARCH_CACHE_VERSION = 'rag-v3';
const ANSWERLATTICE_LOOKUP_CACHE_TTL_MS = 30_000;
const MAX_ANSWERLATTICE_LOOKUP_CACHE_ENTRIES = 300;

const LOG_FILE = LOG_FILES.KB_SEARCH;
const PERF_LOG = LOG_FILES.KB_SEARCH_PERFORMANCE;

type KnowledgeBaseCacheState = {
    version: string;
    hasPublishedArticles: boolean;
    sourceVersion?: number;
};

type TimedCacheEntry<T> = {
    value: T;
    expiresAt: number;
};

const entitySearchIndexCache = new Map<string, TimedCacheEntry<any[]>>();
const latestReleaseCache = new Map<string, TimedCacheEntry<any | null>>();

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

    return objectPath.startsWith(`chatSessions/chatimages/${Number(tId)}/${Number(sId)}/`);
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

const getKnowledgeBaseCacheState = async (tId: number, sId: number): Promise<KnowledgeBaseCacheState> => {
    try {
        const manifestVersion = await getAnswerlatticeCacheVersionServer(ANSWERLATTICE_CACHE_SOURCES.KB, tId, sId);
        if (manifestVersion) {
            return {
                version: `${SEARCH_CACHE_VERSION}:kbv${manifestVersion}`,
                hasPublishedArticles: true,
                sourceVersion: manifestVersion,
            };
        }

        const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES)
            .where('status', '==', 'published')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .orderBy('modifiedOn', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { version: `${SEARCH_CACHE_VERSION}:empty`, hasPublishedArticles: false };
        }

        const latestModified = getAnswerlatticeTimestampMillis(snapshot.docs[0].data()?.modifiedOn);
        return {
            version: `${SEARCH_CACHE_VERSION}:${latestModified || 'unknown'}`,
            hasPublishedArticles: true,
            sourceVersion: latestModified || undefined,
        };
    } catch {
        // Cache invalidation should improve correctness, not block retrieval if the index is unavailable.
        return { version: SEARCH_CACHE_VERSION, hasPublishedArticles: true };
    }
};

const getAnswerlatticeEntitySearchIndexServer = async (tId: number, sId: number): Promise<any[]> => {
    const cacheKey = `${Number(tId)}:${Number(sId)}`;
    const cached = readTimedCache(entitySearchIndexCache, cacheKey);
    if (cached) return cached;

    const snapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(500)
        .get();

    const searchIndex = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    rememberTimedCache(entitySearchIndexCache, cacheKey, searchIndex);
    return searchIndex;
};

const getAnswerlatticeLatestReleaseServer = async (tId: number, sId: number): Promise<any | null> => {
    const cacheKey = `${Number(tId)}:${Number(sId)}`;
    const cached = readTimedCache(latestReleaseCache, cacheKey);
    if (cached !== undefined) return cached;

    const snapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
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
    const release = { ...doc.data(), id: doc.id };
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
        contextKey: (productContext as any).contextKey || '',
        entityHints: Array.isArray(productContext.entityHints)
            ? productContext.entityHints.map(String).sort()
            : [],
        feature: productContext.feature || '',
        page: productContext.page || '',
        plan: productContext.plan || '',
        surfaceEntityIds: Array.isArray((productContext as any).surfaceEntityIds)
            ? (productContext as any).surfaceEntityIds.map(String).sort()
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

const buildSearchHistoryContextFields = (productContext: CoreSearchInput['productContext']) => {
    if (!productContext) return {};

    const contextKey = cleanSearchContextText((productContext as any).contextKey, 140);
    const surfaceFeature = cleanSearchContextText(productContext.feature, 120);
    const surfacePage = cleanSearchContextText(productContext.page, 120);
    const surfaceWorkflow = cleanSearchContextText(productContext.workflow, 120);

    return {
        ...(contextKey ? { contextKey } : {}),
        ...(surfaceFeature ? { surfaceFeature } : {}),
        ...(surfacePage ? { surfacePage } : {}),
        ...(surfaceWorkflow ? { surfaceWorkflow } : {}),
    };
};

const buildSearchHistoryRequestFields = (requestMetadata: CoreSearchInput['requestMetadata']) => {
    if (!requestMetadata) return {};

    const visitorId = cleanSearchContextText(requestMetadata.visitorId, 120);
    const visitorName = cleanSearchContextText(requestMetadata.visitorName, 160);
    const visitorEmail = cleanSearchContextText(requestMetadata.visitorEmail, 180);
    const widgetSessionId = cleanSearchContextText(requestMetadata.widgetSessionId, 120);
    const requestOrigin = cleanSearchContextText(requestMetadata.requestOrigin, 180);
    const requestPath = cleanSearchContextText(requestMetadata.requestPath, 180);
    const userAgentFamily = cleanSearchContextText(requestMetadata.userAgentFamily, 40);

    return {
        ...(visitorId ? { visitorId } : {}),
        ...(visitorName ? { visitorName } : {}),
        ...(visitorEmail ? { visitorEmail } : {}),
        ...(widgetSessionId ? { widgetSessionId } : {}),
        ...(requestOrigin ? { requestOrigin } : {}),
        ...(requestPath ? { requestPath } : {}),
        ...(userAgentFamily ? { userAgentFamily } : {}),
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
 * 6. RAG fallback (embedding → vector search → Gemini answer generation)
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
        tId,
        sId,
        uId,
        mode,
        conversationHistory,
        imageUrl,
        imageBuffer: inlineImageBuffer,
        productContext,
        requestMetadata,
    } = input;

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
    const hasConversationHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;

    if (!Number.isFinite(Number(tId)) || !Number.isFinite(Number(sId)) || Number(tId) <= 0 || Number(sId) <= 0) {
        try {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'ERROR_INVALID_TENANT_CONTEXT',
                data: {
                    mountContext,
                    hasTenantId: tId !== undefined && tId !== null,
                    hasStoreId: sId !== undefined && sId !== null,
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
            const db = firestoreAdmin as any;
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
        } catch {
            // Fail-open: don't block operations if check fails
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
                if (!isTrustedAnswerlatticeSearchImageUrl(url, Number(tId), Number(sId))) {
                    throw new Error('Untrusted or invalid image URL');
                }

                // Fetch image with timeout and size check
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

                let response: Response;
                try {
                    response = await fetch(imageUrl, { signal: controller.signal });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }

                const contentLength = Number(response.headers.get('content-length') || 0);
                if (contentLength > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error(`Image size (${contentLength} bytes) exceeds ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / 1024 / 1024}MB limit`);
                }

                const buffer = await response.arrayBuffer();

                if (!buffer.byteLength || buffer.byteLength > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error(`Image size (${buffer.byteLength} bytes) exceeds ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / 1024 / 1024}MB limit`);
                }

                const nodeBuffer = Buffer.from(buffer);
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
            const imageQueryResult = await generateSearchQueryFromImageWithMetadata(
                searchQuery,
                imageBufferForAi.imageBase64,
                imageBufferForAi.mimeType
            );
            generatedQueryFromImage = imageQueryResult.text;
            aiProviderOperations.add('image_query_generation');
            addAiProviderTokenUsage(imageQueryResult.usageMetadata);

        } catch (imageError: any) {
            // Graceful degradation: fallback to text-only search
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'WARNING_IMAGE_PROCESSING_FALLBACK',
                data: { error: imageError.message, query: searchQuery, mountContext }
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
                tId: Number(tId),
                sId: Number(sId),
                context: productContext,
                target: mountContext === 'widget' ? 'helpWidget' : 'helpCenter',
            });
            effectiveProductContext = resolved.retrievalContext as typeof effectiveProductContext;
            relatedContent = resolved.relatedContent;
        } catch (error: any) {
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'PRODUCT_SURFACE_CONTEXT_ERROR',
                data: {
                    error: error?.message || String(error),
                    mountContext,
                },
            }).catch(() => undefined);
        }
    }

    // ===== STAGE 2.5: INSTANT CACHE (Upstash Redis) =====
    // Only for canonical answers — deterministic, versioned, perfect cache objects.
    // Feature-flagged: ENABLE_ANSWERLATTICE_INSTANT_CACHE
    let instantCacheSearchIndex: any[] | undefined;
    let instantCacheLatestRelease: any | null | undefined;
    if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) {
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

                    const cached = await instantCacheLookup(
                        tId, sId, topEntityId, version, effectivePlan, effectiveRole
                    );

                    if (cached) {
                        perfMetrics.total = Date.now() - perfStart;

                        // Still save to aiSearchHistory for analytics (INV-4)
                        const normalizedTextQueryForKey = normalizeQuery(searchQuery);
                        const instantCacheKeyBase = imageCacheToken
                            ? `${normalizedTextQueryForKey}::IMAGE::${imageCacheToken}`
                            : normalizedTextQueryForKey;
                        const instantCacheContextToken = buildProductContextCacheToken(effectiveProductContext);
                        const instantCacheMode = hasConversationHistory ? 'assistant' : 'qna';
                        const instantCacheKey = `${tId}:${sId}:${SEARCH_CACHE_VERSION}:${instantCacheKeyBase}::CTX::${instantCacheContextToken}::MODE::${instantCacheMode}`;

                        const savedHistory = await addAiSearchHistoryServer({
                            query: searchQuery,
                            cacheKey: instantCacheKey,
                            tId,
                            sId,
                            uId,
                            mountContext,
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
                            canonical: true,
                            answerSource: 'canonical',
                            canonicalAnswerId: cached.canonicalAnswerId,
                            matchedEntityIds: cached.matchedEntityIds,
                            confidence: cached.confidence,
                            sourceVersions: cached.sourceVersions,
                            ...buildSearchHistoryContextFields(effectiveProductContext),
                            ...buildSearchHistoryRequestFields(requestMetadata),
                        });

                        await writeLogEntry({
                            logFileName: PERF_LOG,
                            userId: uId,
                            logType: 'INSTANT_CACHE_HIT',
                            data: {
                                query: searchQuery,
                                totalMs: perfMetrics.total,
                                entityId: topEntityId,
                                answerId: cached.canonicalAnswerId,
                                mountContext,
                            }
                        });

                        return withAiProviderUsage({
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
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
                    await writeLogEntry({
                        logFileName: PERF_LOG,
                        userId: uId,
                        logType: 'INSTANT_CACHE_MISS',
                        data: { query: searchQuery, entityId: topEntityId, mountContext }
                    });
                }
            }
        } catch {
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
    const kbCacheState = await getKnowledgeBaseCacheState(tId, sId);
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
        const matchedEntityIds = Array.isArray(historyContext.matchedEntityIds)
            ? historyContext.matchedEntityIds.filter((id): id is string => typeof id === 'string' && Boolean(id)).slice(0, 20)
            : undefined;
        const savedHistory = await addAiSearchHistoryServer({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            mountContext,
            generatedQueryFromImage,
            imageUrl: imageUrl || undefined,
            craftedAnswer: result.craftedAnswer,
            references: result.references || [],
            canonical: Boolean(result.canonical),
            answerSource: result.answerSource || (result.canonical ? 'canonical' : result.references?.length ? 'rag' : 'empty'),
            canonicalAnswerId: result.canonicalAnswerId,
            faqAnswerId: result.faqAnswerId,
            matchedEntityIds,
            fallbackReason: historyContext.fallbackReason,
            confidence: result.confidence || historyContext.confidence,
            sourceVersions: kbCacheState.sourceVersion
                ? { [ANSWERLATTICE_CACHE_SOURCES.KB]: kbCacheState.sourceVersion }
                : undefined,
            ...buildSearchHistoryContextFields(effectiveProductContext),
            ...buildSearchHistoryRequestFields(requestMetadata),
        });

        return withAiProviderUsage({
            ...result,
            searchHistoryId: result.searchHistoryId || savedHistory?.id,
        });
    };

    // Cache lookup only for stateless authenticated Q&A.
    // Assistant-mode history and product context are part of the cache key so stale
    // or context-crossed answers cannot bypass canonical retrieval.
    // Widget skips shared search-history cache because feedback needs a per-answer record.
    let cachedResult: any = null;
    if (mountContext === 'help_center' && uId && !hasConversationHistory) {
        cachedResult = await findCachedSearchByCacheKeyServer(
            cacheLookupKey,
            { tId, sId, uId } as any
        );
    }
    perfMetrics.cacheLookup = Date.now() - cacheStart;

    if (cachedResult) {
        const currentSourceVersions: AnswerlatticeCacheSourceVersions = {};
        if (kbCacheState.sourceVersion) {
            currentSourceVersions[ANSWERLATTICE_CACHE_SOURCES.KB] = kbCacheState.sourceVersion;
        }
        const cacheFresh = await isCachedSearchResultFresh(cachedResult, tId, sId, currentSourceVersions);
        if (!cacheFresh) {
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'CACHE_STALE_BYPASS',
                data: {
                    query: searchQuery,
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

        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CACHE_HIT',
            data: {
                query: searchQuery,
                totalMs: perfMetrics.total,
                cacheLookupMs: perfMetrics.cacheLookup,
                mountContext,
                cached: true
            }
        });

        return withAiProviderUsage({
            craftedAnswer: cachedResult.craftedAnswer,
            references: cachedResult.references || [],
            suggestedQuestions: cachedResult.suggestedQuestions || [],
            searchHistoryId: cachedResult.id,
            canonical: !!cachedResult.canonical,
            answerSource: cachedResult.answerSource || (cachedResult.canonical ? 'canonical' : cachedResult.references?.length ? 'rag' : 'cache'),
            canonicalAnswerId: cachedResult.canonicalAnswerId,
            faqAnswerId: cachedResult.faqAnswerId,
            confidence: cachedResult.confidence,
            answerType: cachedResult.answerType,
            imageProcessed: imageProcessed || !!cachedResult.imageUrl,
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

    const { attemptCanonicalRetrieval } = await import('@lib/answerlattice/canonicalRetrieval');
    const canonicalStart = Date.now();
    const canonicalResult = await attemptCanonicalRetrieval(searchQuery, {
        tId,
        sId,
        context: validatedContext,
        preloadedSearchIndex: instantCacheSearchIndex,
        preloadedLatestRelease: instantCacheLatestRelease,
    });
    perfMetrics.canonicalRetrieval = Date.now() - canonicalStart;

    if (canonicalResult.found && canonicalResult.canonical && canonicalResult.answer) {
        const answer = canonicalResult.answer;
        const canonicalCacheVersion = await getAnswerlatticeCacheVersionServer(
            ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
            tId,
            sId,
        ).catch(() => undefined);
        const canonicalSourceVersions = canonicalCacheVersion
            ? { [ANSWERLATTICE_CACHE_SOURCES.CANONICAL]: canonicalCacheVersion }
            : undefined;

        // Save to search history for analytics
        const savedHistory = await addAiSearchHistoryServer({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            mountContext,
            craftedAnswer: answer.content.structuredSummary,
            references: [],
            canonical: true,
            answerSource: 'canonical',
            canonicalAnswerId: answer.id,
            matchedEntityIds: canonicalResult.matchedEntityIds,
            confidence: canonicalResult.confidence,
            sourceVersions: canonicalSourceVersions,
            ...buildSearchHistoryContextFields(effectiveProductContext),
            ...buildSearchHistoryRequestFields(requestMetadata),
        });

        perfMetrics.total = Date.now() - perfStart;

        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CANONICAL_HIT',
            data: {
                query: searchQuery,
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
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'GRAPH_EXPANSION_HIT',
                data: {
                    query: searchQuery,
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
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INSTANT_CACHE && canonicalResult.matchedEntityIds.length > 0) {
            try {
                const { instantCacheWrite } = await import('@lib/answerlattice/instantCache');
                instantCacheWrite(
                    tId, sId,
                    canonicalResult.matchedEntityIds[0],
                    answer,
                    canonicalResult.matchedEntityIds,
                    effectiveProductContext?.plan,
                    effectiveProductContext?.userRole,
                    canonicalSourceVersions,
                );
            } catch {
                // Silent failure — cache write is best-effort
            }
        }

        return withAiProviderUsage(result);
    }

    // Log canonical miss for mutation proposal tracking
    if (!canonicalResult.found && canonicalResult.fallbackReason) {
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'CANONICAL_MISS',
            data: {
                query: searchQuery,
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
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'FAQ_ANSWER_HIT',
                data: {
                    query: searchQuery,
                    effectiveQuery: queryForEmbedding,
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
    } catch (error: any) {
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'FAQ_RETRIEVAL_ERROR',
            data: {
                query: searchQuery,
                effectiveQuery: queryForEmbedding,
                error: error?.message || String(error),
                mountContext,
            },
        }).catch(() => undefined);
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
                sessionFailureCount: input.sessionFailureCount,
                productContext: effectiveProductContext,
                effectiveQuery: queryForEmbedding,
                answerWasEmpty: true,
            });
        } catch { return undefined; }
    };

    if (!kbCacheState.hasPublishedArticles) {
        perfMetrics.total = Date.now() - perfStart;
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'KB_EMPTY_SKIP_RAG',
            data: {
                query: searchQuery,
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    // ===== STAGE 5: RAG FALLBACK (Vector Search) =====
    const embeddingStart = Date.now();
    let queryVector = await getCachedEmbedding(effectiveCacheKey);

    if (!queryVector) {
        const embeddingResult = await callGeminiEmbeddingWithMetadata(queryForEmbedding, { taskType: 'RETRIEVAL_QUERY' });
        queryVector = embeddingResult.vector;
        aiProviderOperations.add('embedding_generation');
        addAiProviderTokenUsage(embeddingResult.usageMetadata);
        await saveCachedEmbedding(effectiveCacheKey, queryForEmbedding, queryVector);
    }

    perfMetrics.embeddingGeneration = Date.now() - embeddingStart;

    const vectorSearchStart = Date.now();
    const articlesRef = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES);

    // Multi-tenant KB filtering is mandatory for every Answerlattice mount.
    const articleQuery = articlesRef
        .where('status', '==', 'published')
        .where('tId', '==', tId)
        .where('sId', '==', sId);

    let snapshot;
    try {
        snapshot = await articleQuery
            .findNearest({
                vectorField: 'embedding',
                queryVector: queryVector,
                limit: VECTOR_SEARCH_LIMIT,
                distanceMeasure: 'COSINE',
                distanceResultField: 'distance',
            }).get();
    } catch (vectorError: any) {
        perfMetrics.vectorSearch = Date.now() - vectorSearchStart;
        perfMetrics.total = Date.now() - perfStart;
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'VECTOR_SEARCH_ERROR',
            data: {
                query: searchQuery,
                error: vectorError?.message || String(vectorError),
                code: vectorError?.code || null,
                vectorSearchMs: perfMetrics.vectorSearch,
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    perfMetrics.vectorSearch = Date.now() - vectorSearchStart;

    if (snapshot.empty) {
        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    const documentsFound = snapshot.docs.map(doc => {
        const data = { ...doc.data() };
        const document: any = {
            ...data,
            id: doc.id,
            similarityScore: 1 - doc.get('distance')
        };
        delete document.embedding;
        delete document.distance;
        return document;
    });

    let documentsMatched = documentsFound.filter(doc => doc.similarityScore > SIMILARITY_THRESHOLD);

    if (documentsFound.length && !documentsMatched.length) {
        documentsMatched = documentsFound.filter(doc => doc.similarityScore > SIMILARITY_THRESHOLD_LOW);
    }

    if (!documentsFound.length) {
        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    if (!documentsMatched.length) {
        perfMetrics.total = Date.now() - perfStart;
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'VECTOR_LOW_CONFIDENCE_MISS',
            data: {
                query: searchQuery,
                topScore: documentsFound[0]?.similarityScore || 0,
                threshold: SIMILARITY_THRESHOLD_LOW,
                totalMs: perfMetrics.total,
                mountContext,
            }
        });

        return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
    }

    const documentsForPrompt = documentsMatched.slice(0, RAG_CONTEXT_LIMIT);

    const payloadToGemini = documentsForPrompt.map((d: any) => ({
        docId: d.id,
        category: d.category,
        section: d.section,
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
        let generatedData: any;
        try {
            generatedData = JSON.parse(geminiAnswer);
        } catch (parseError: any) {
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_JSON_PARSE_FAILED',
                data: {
                    query: searchQuery,
                    error: parseError?.message || String(parseError),
                    responsePreview: String(geminiAnswer).slice(0, 500),
                    mountContext,
                }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        const craftedAnswer = typeof generatedData.craftedAnswer === 'string'
            ? generatedData.craftedAnswer.trim()
            : '';
        const generatedReferenceIds = Array.isArray(generatedData.references)
            ? generatedData.references.filter((refDocId: unknown): refDocId is string => typeof refDocId === 'string')
            : [];
        const suggestedQuestions = Array.isArray(generatedData.suggestedQuestions)
            ? generatedData.suggestedQuestions
                .filter((question: unknown): question is string => typeof question === 'string')
                .map(question => question.trim())
                .filter(Boolean)
                .slice(0, 3)
            : [];

        if (!craftedAnswer) {
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_EMPTY',
                data: { query: searchQuery, mountContext }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        // Resolve reference IDs to full document objects
        const resolvedReferences: any[] = [];
        if (generatedReferenceIds.length) {
            generatedReferenceIds.forEach((refDocId: string) => {
                const doc = documentsForPrompt.find(d => d.id === refDocId);
                if (doc) {
                    resolvedReferences.push(doc);
                }
            });
        }

        if (!resolvedReferences.length && !isKnowledgeBaseRefusal(craftedAnswer)) {
            await writeLogEntry({
                logFileName: PERF_LOG,
                userId: uId,
                logType: 'ANSWER_WITHOUT_VALID_REFERENCES_BLOCKED',
                data: {
                    query: searchQuery,
                    referenceIds: generatedReferenceIds.slice(0, 10),
                    promptDocumentCount: documentsForPrompt.length,
                    mountContext,
                }
            });
            return saveWithCanonicalMissContext({ ...EMPTY_RESULT, escalation: await buildEmptyEscalation(), imageProcessed });
        }

        // Save search history
        const savedHistory = await addAiSearchHistoryServer({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            mountContext,
            generatedQueryFromImage,
            imageUrl: imageUrl || undefined,
            craftedAnswer,
            references: resolvedReferences,
            answerSource: 'rag',
            matchedEntityIds: canonicalMissHistoryContext.matchedEntityIds,
            fallbackReason: canonicalMissHistoryContext.fallbackReason,
            confidence: canonicalMissHistoryContext.confidence,
            sourceVersions: kbCacheState.sourceVersion
                ? { [ANSWERLATTICE_CACHE_SOURCES.KB]: kbCacheState.sourceVersion }
                : undefined,
            ...buildSearchHistoryContextFields(effectiveProductContext),
            ...buildSearchHistoryRequestFields(requestMetadata),
        });

        perfMetrics.total = Date.now() - perfStart;

        // Log performance metrics
        await writeLogEntry({
            logFileName: PERF_LOG,
            userId: uId,
            logType: 'SEARCH_COMPLETE',
            data: {
                query: searchQuery,
                cached: false,
                hasImage: imageProcessed,
                assistantMode: mode === 'assistant',
                totalMs: perfMetrics.total,
                imageProcessingMs: perfMetrics.imageProcessing || 0,
                cacheLookupMs: perfMetrics.cacheLookup,
                embeddingGenerationMs: perfMetrics.embeddingGeneration,
                vectorSearchMs: perfMetrics.vectorSearch,
                answerGenerationMs: perfMetrics.answerGeneration,
                answerLength: craftedAnswer.length,
                promptDocumentCount: documentsForPrompt.length,
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
                    ragDocuments: documentsMatched.slice(0, 5).map(d => ({
                        id: d.id,
                        title: d.title || 'Untitled',
                        similarityScore: d.similarityScore,
                    })),
                    searchQuery,
                    sessionFailureCount: input.sessionFailureCount,
                    productContext: effectiveProductContext,
                    effectiveQuery: queryForEmbedding,
                    answerWasEmpty: !craftedAnswer,
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
