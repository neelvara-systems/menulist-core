/**
 * Canonica Unified Search — Core Pipeline
 *
 * THE single canonical search function that powers ALL Canonica search surfaces:
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
 * @see __docs__/canonica/help-widget/
 * @see __docs__/canonica/help-center/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { LOG_FILES } from '@constant/logging';
import { addAiSearchHistory, findCachedSearchByCacheKey } from '@database/aiSearchHistory';
import { getCachedEmbedding, saveCachedEmbedding } from '@database/queryEmbeddings';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { normalizeQuery } from '@lib/string';
import { callGeminiChat, callGeminiEmbedding, generateSearchQueryFromImage } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { hashString } from '@util/hash';
import { writeLogEntry } from 'logs/utils';

import type { CoreSearchInput, CoreSearchResult, SearchPerfMetrics } from './types';

// Image processing constants
const TRUSTED_STORAGE_HOST = 'firebasestorage.googleapis.com';
const TRUSTED_BUCKET_PATH = '/v0/b/ecomsai.appspot.com/o';
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

const SIMILARITY_THRESHOLD = 0.6;
const SIMILARITY_THRESHOLD_LOW = 0.4;
const VECTOR_SEARCH_LIMIT = 12;

const LOG_FILE = LOG_FILES.KB_SEARCH;
const PERF_LOG = LOG_FILES.KB_SEARCH_PERFORMANCE;

const EMPTY_RESULT: CoreSearchResult = {
    craftedAnswer: `I couldn't find any relevant articles in our knowledge base for that specific question.

However, I'm here to help! Here are some things I can assist you with:

- **Getting Started**: Setup guides and first steps
- **Account Settings**: Profile, billing, and preferences
- **Integrations**: API keys, webhooks, and connected tools
- **Troubleshooting**: Common errors and recovery steps

Try asking about one of these topics, or contact support for personalized assistance.`,
    references: [],
    suggestedQuestions: [],
    canonical: false,
    imageProcessed: false,
};

/**
 * Core search pipeline — the single source of truth for Canonica knowledge retrieval.
 *
 * Pipeline stages:
 * 1. SAFE_MODE check
 * 2. Image processing (if imageUrl provided)
 * 2.5. Instant cache lookup (Upstash Redis — canonical answers only)
 * 3. Cache lookup (Firestore aiSearchHistory)
 * 4. Canonical-first retrieval (deterministic, zero LLM cost)
 *    → On canonical HIT: write to instant cache
 * 5. RAG fallback (embedding → vector search → Gemini answer generation)
 * 6. Entity-enriched RAG context (if canonical miss had entity matches)
 * 7. Search history logging + performance metrics
 */
export async function coreSearch(input: CoreSearchInput): Promise<CoreSearchResult> {
    const perfStart = Date.now();
    const perfMetrics: SearchPerfMetrics = {};

    let imageProcessed = false;
    let generatedQueryFromImage: string | undefined;
    let imageBuffer: { imageBase64: string; mimeType: string } | undefined;

    const {
        query: searchQuery,
        mountContext,
        tId,
        sId,
        uId,
        mode,
        conversationHistory,
        imageUrl,
        productContext,
    } = input;

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
            const { getFirestore } = await import('firebase-admin/firestore');
            const db = getFirestore();
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
    if (imageUrl) {
        const imageStart = Date.now();

        try {
            // Security validation
            const url = new URL(imageUrl);
            if (
                url.protocol !== 'https:' ||
                url.hostname !== TRUSTED_STORAGE_HOST ||
                !url.pathname.includes(TRUSTED_BUCKET_PATH)
            ) {
                throw new Error('Untrusted or invalid image URL');
            }

            // Fetch image with timeout and size check
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            const response = await fetch(imageUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();

            if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
                throw new Error(`Image size (${buffer.byteLength} bytes) exceeds ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`);
            }

            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/png';
            imageBuffer = { imageBase64: base64, mimeType };
            imageProcessed = true;

            // Generate search query from image
            generatedQueryFromImage = await generateSearchQueryFromImage(
                searchQuery,
                imageBuffer.imageBase64,
                imageBuffer.mimeType
            );

        } catch (imageError: any) {
            // Graceful degradation: fallback to text-only search
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'WARNING_IMAGE_PROCESSING_FALLBACK',
                data: { error: imageError.message, query: searchQuery, mountContext }
            });
            imageProcessed = false;
        }

        perfMetrics.imageProcessing = Date.now() - imageStart;
    }

    const queryForEmbedding = generatedQueryFromImage || searchQuery;

    // ===== STAGE 2.5: INSTANT CACHE (Upstash Redis) =====
    // Only for canonical answers — deterministic, versioned, perfect cache objects.
    // Feature-flagged: ENABLE_CANONICA_INSTANT_CACHE
    let instantCacheSearchIndex: any[] | null = null; // Shared with Stage 4 to avoid re-reading
    if (FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE && FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS) {
        try {
            const { instantCacheLookup } = await import('@lib/canonica/instantCache');
            const { getEntitySearchIndex } = await import('@database/canonica/entities');
            const { canonicaTokenize } = await import('@lib/canonica/tokenizer');

            const searchIndex = await getEntitySearchIndex(tId, sId);
            if (searchIndex && searchIndex.length > 0) {
                instantCacheSearchIndex = searchIndex; // Save for Stage 4 reuse
                const queryTokens = canonicaTokenize(searchQuery);

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
                    const { getLatestRelease } = await import('@database/canonica/releases');
                    const release = await getLatestRelease(tId, sId);
                    const version = release?.versionNormalized || 0;

                    const effectivePlan = productContext?.plan;
                    const effectiveRole = productContext?.userRole;

                    const cached = await instantCacheLookup(
                        tId, sId, topEntityId, version, effectivePlan, effectiveRole
                    );

                    if (cached) {
                        perfMetrics.total = Date.now() - perfStart;

                        // Still save to aiSearchHistory for analytics (INV-4)
                        const normalizedTextQueryForKey = normalizeQuery(searchQuery);
                        const instantCacheKeyBase = imageUrl
                            ? `${normalizedTextQueryForKey}::IMAGE::${hashString(imageUrl)}`
                            : normalizedTextQueryForKey;
                        const instantCacheKey = `${tId}:${sId}:${instantCacheKeyBase}`;

                        const savedHistory = await addAiSearchHistory({
                            query: searchQuery,
                            cacheKey: instantCacheKey,
                            tId,
                            sId,
                            uId,
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
                            canonical: true,
                            canonicalAnswerId: cached.canonicalAnswerId,
                            matchedEntityIds: cached.matchedEntityIds,
                            confidence: cached.confidence,
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

                        return {
                            craftedAnswer: cached.craftedAnswer,
                            references: [],
                            suggestedQuestions: [],
                            searchHistoryId: savedHistory?.id,
                            canonical: true,
                            canonicalAnswerId: cached.canonicalAnswerId,
                            confidence: cached.confidence,
                            answerType: cached.answerType,
                            procedure: cached.procedure || undefined,
                            imageProcessed,
                        };
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
    const cacheLookupKeyBase = imageUrl
        ? `${normalizedTextQuery}::IMAGE::${hashString(imageUrl)}`
        : normalizedTextQuery;
    const cacheLookupKey = `${tId}:${sId}:${cacheLookupKeyBase}`;

    const cacheStart = Date.now();
    // Widget searches use a prefixed cache key to avoid collision, but hit same pipeline
    const effectiveCacheKey = mountContext === 'widget' ? `widget:${cacheLookupKey}` : cacheLookupKey;

    // Cache lookup only for authenticated contexts (help_center has session for findCachedSearchByCacheKey)
    // Widget skips session-based cache — uses embedding cache only
    let cachedResult: any = null;
    if (mountContext === 'help_center' && uId) {
        cachedResult = await findCachedSearchByCacheKey(
            cacheLookupKey,
            { tId, sId, uId } as any
        );
    }
    perfMetrics.cacheLookup = Date.now() - cacheStart;

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

        return {
            craftedAnswer: cachedResult.craftedAnswer,
            references: cachedResult.references || [],
            suggestedQuestions: cachedResult.suggestedQuestions || [],
            searchHistoryId: cachedResult.id,
            canonical: !!cachedResult.canonical,
            imageProcessed: !!cachedResult.imageUrl,
        };
    }

    // ===== STAGE 4: CANONICAL-FIRST RETRIEVAL =====
    const { FEATURE_FLAGS: contextFlags } = await import('@config/features');

    // Parse product context (feature-flagged)
    let validatedContext = productContext;
    if (!validatedContext && contextFlags.ENABLE_CANONICA_CONTEXT_AWARE) {
        // Context already validated by caller if provided
        validatedContext = undefined;
    }

    const { attemptCanonicalRetrieval } = await import('@lib/canonica/canonicalRetrieval');
    const canonicalStart = Date.now();
    const canonicalResult = await attemptCanonicalRetrieval(searchQuery, {
        tId,
        sId,
        context: validatedContext,
    });
    perfMetrics.canonicalRetrieval = Date.now() - canonicalStart;

    if (canonicalResult.found && canonicalResult.canonical && canonicalResult.answer) {
        const answer = canonicalResult.answer;

        // Save to search history for analytics
        const savedHistory = await addAiSearchHistory({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            craftedAnswer: answer.content.structuredSummary,
            references: [],
            canonical: true,
            canonicalAnswerId: answer.id,
            matchedEntityIds: canonicalResult.matchedEntityIds,
            confidence: canonicalResult.confidence,
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
        if (FEATURE_FLAGS.ENABLE_CANONICA_INSTANT_CACHE && canonicalResult.matchedEntityIds.length > 0) {
            try {
                const { instantCacheWrite } = await import('@lib/canonica/instantCache');
                instantCacheWrite(
                    tId, sId,
                    canonicalResult.matchedEntityIds[0],
                    answer,
                    canonicalResult.matchedEntityIds,
                    productContext?.plan,
                    productContext?.userRole
                );
            } catch {
                // Silent failure — cache write is best-effort
            }
        }

        return result;
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

    // ===== STAGE 5: RAG FALLBACK (Vector Search) =====
    const embeddingStart = Date.now();
    let queryVector = await getCachedEmbedding(effectiveCacheKey);

    if (!queryVector) {
        queryVector = await callGeminiEmbedding(queryForEmbedding);
        await saveCachedEmbedding(effectiveCacheKey, queryForEmbedding, queryVector);
    }

    perfMetrics.embeddingGeneration = Date.now() - embeddingStart;

    const vectorSearchStart = Date.now();
    const articlesRef = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES);

    // Multi-tenant KB filtering is mandatory for every Canonica mount.
    const articleQuery = articlesRef
        .where('status', '==', 'published')
        .where('tId', '==', tId)
        .where('sId', '==', sId);

    const snapshot = await articleQuery
        .findNearest({
            vectorField: 'embedding',
            queryVector: queryVector,
            limit: VECTOR_SEARCH_LIMIT,
            distanceMeasure: 'COSINE',
            distanceResultField: 'distance',
        }).get();

    perfMetrics.vectorSearch = Date.now() - vectorSearchStart;

    // Helper: evaluate escalation for empty/no-result paths (avoids code duplication)
    const buildEmptyEscalation = async () => {
        if (!FEATURE_FLAGS.ENABLE_CANONICA_AI_ESCALATION) return undefined;
        try {
            const { evaluateEscalation } = await import('@lib/canonica/escalationEvaluator');
            return evaluateEscalation({
                canonicalResult,
                ragDocuments: [],
                searchQuery,
                sessionFailureCount: input.sessionFailureCount,
                productContext,
                effectiveQuery: queryForEmbedding,
                answerWasEmpty: true,
            });
        } catch { return undefined; }
    };

    if (snapshot.empty) {
        return { ...EMPTY_RESULT, escalation: await buildEmptyEscalation() };
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
        return { ...EMPTY_RESULT, escalation: await buildEmptyEscalation() };
    }

    const payloadToGemini = documentsMatched.map((d: any) => ({
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
            const { getEntityDescriptions, buildEntityContextBlock } = await import('@lib/canonica/canonicalRetrieval');
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

    const geminiAnswer = await callGeminiChat(
        searchQuery,
        payloadToGemini,
        imageBuffer,
        conversationHistory
    );
    perfMetrics.answerGeneration = Date.now() - answerStart;

    if (geminiAnswer) {
        const generatedData: any = JSON.parse(geminiAnswer);

        // Resolve reference IDs to full document objects
        const resolvedReferences: any[] = [];
        if (generatedData.references?.length) {
            generatedData.references.forEach((refDocId: any) => {
                const doc = documentsMatched.find(d => d.id === refDocId);
                if (doc) {
                    resolvedReferences.push(doc);
                }
            });
        }

        // Save search history
        const savedHistory = await addAiSearchHistory({
            query: searchQuery,
            cacheKey: cacheLookupKey,
            tId,
            sId,
            uId,
            generatedQueryFromImage,
            imageUrl: imageUrl || undefined,
            craftedAnswer: generatedData.craftedAnswer,
            references: resolvedReferences,
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
                hasImage: !!imageUrl,
                assistantMode: mode === 'assistant',
                totalMs: perfMetrics.total,
                imageProcessingMs: perfMetrics.imageProcessing || 0,
                cacheLookupMs: perfMetrics.cacheLookup,
                embeddingGenerationMs: perfMetrics.embeddingGeneration,
                vectorSearchMs: perfMetrics.vectorSearch,
                answerGenerationMs: perfMetrics.answerGeneration,
                answerLength: generatedData.craftedAnswer?.length || 0,
                mountContext,
            }
        });

        // ===== STAGE 7.5: ESCALATION EVALUATION =====
        let escalation: import('@lib/canonica/escalationTypes').EscalationMetadata | undefined;
        if (FEATURE_FLAGS.ENABLE_CANONICA_AI_ESCALATION) {
            try {
                const { evaluateEscalation } = await import('@lib/canonica/escalationEvaluator');
                escalation = evaluateEscalation({
                    canonicalResult,
                    ragDocuments: documentsMatched.slice(0, 5).map(d => ({
                        id: d.id,
                        title: d.title || 'Untitled',
                        similarityScore: d.similarityScore,
                    })),
                    searchQuery,
                    sessionFailureCount: input.sessionFailureCount,
                    productContext,
                    effectiveQuery: queryForEmbedding,
                    answerWasEmpty: !generatedData.craftedAnswer,
                });
            } catch {
                // Graceful degradation — escalation failure never blocks search
            }
        }

        return {
            craftedAnswer: generatedData.craftedAnswer,
            references: resolvedReferences,
            suggestedQuestions: generatedData.suggestedQuestions || [],
            searchHistoryId: savedHistory?.id,
            canonical: false,
            imageProcessed,
            escalation,
        };
    }

    // Gemini returned null — use shared empty escalation helper
    return { ...EMPTY_RESULT, escalation: await buildEmptyEscalation() };
}
