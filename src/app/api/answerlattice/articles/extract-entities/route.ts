export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { ANSWERLATTICE_TEXT_MODEL } from '@constant/answerlattice/ai';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import { extractEntitiesFromArticles, extractPlainTextFromTipTap } from '@lib/answerlattice/entityExtraction';
import { normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';
import { upsertAnswerlatticeExtractedEntityCandidate } from '@lib/answerlattice/ontologyServer';
import {
    AnswerlatticeInvalidationOwnershipError,
    getAnswerlatticeMissingBundleManifestBase,
    getAnswerlatticeMissingSourceVersionsBase,
    readAnswerlatticeInvalidationOwnership,
    type AnswerlatticeInvalidationOwnership,
} from '@lib/answerlattice/invalidationOwnership';
import {
    ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH,
    normalizeAnswerlatticeKbArticleId,
} from '@lib/answerlattice/kbArticleIdBoundary';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { callGeminiChatWithMetadata } from '@lib/vectorEmbeddings';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const ArticleSchema = z.object({
    categoryTitle: z.string().trim().max(180).optional().nullable(),
    content: z.any().optional(),
    id: z.string().trim().max(ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH)
        .refine((value) => normalizeAnswerlatticeKbArticleId(value) === value),
    title: z.string().trim().min(1).max(240).optional(),
}).strict();
const ARTICLE_ENTITY_EXTRACTION_MAX_BODY_BYTES = 256 * 1024;
const ARTICLE_ENTITY_ID_LIMIT = 10;

class ArticleEntityExtractionConflictError extends Error {}

const stableSerialize = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
};

const buildArticleSourceFingerprint = (value: Record<string, unknown>): string => createHash('sha256')
    .update(stableSerialize({
        pId: value.pId,
        tId: value.tId,
        sId: value.sId,
        title: value.title,
        categoryTitle: value.categoryTitle,
        sectionTitle: value.sectionTitle,
        content: value.content,
        active: value.active,
        status: value.status,
    }))
    .digest('hex');

const addArticleEntityLinkInvalidationWrites = (
    transaction: Transaction,
    scope: { tId: number; sId: number },
    ownership: AnswerlatticeInvalidationOwnership,
    articleId: string,
) => {
    const now = FieldValue.serverTimestamp();
    transaction.set(
        ownership.cacheVersionRefs[ANSWERLATTICE_CACHE_SOURCES.KB]!,
        {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            source: ANSWERLATTICE_CACHE_SOURCES.KB,
            version: FieldValue.increment(1),
            modifiedOn: now,
            lastReason: 'article_entity_links_updated',
            lastSourceId: articleId,
            lastSourceType: DB_COLLECTIONS.KB_ARTICLES,
        },
        { merge: true },
    );
    transaction.set(
        ownership.sourceVersionsRef,
        {
            ...(!ownership.sourceVersionsExists ? getAnswerlatticeMissingSourceVersionsBase(scope) : {}),
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            kb: FieldValue.increment(1),
            updatedAt: now,
            lastReason: 'article_entity_links_updated',
            lastSourceId: articleId,
            lastSourceType: DB_COLLECTIONS.KB_ARTICLES,
        },
        { merge: true },
    );
    transaction.set(
        ownership.manifestRef,
        {
            ...(!ownership.manifestExists ? getAnswerlatticeMissingBundleManifestBase(scope) : {}),
            schemaVersion: 1,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            status: 'stale',
            staleReason: 'article_entity_links_updated',
            updatedAt: now,
            lastReason: 'article_entity_links_updated',
            lastSourceId: articleId,
        },
        { merge: true },
    );
};

export const POST = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    const userIdForLog = session.uId || session.user?.id;
    let articleIdForLog: string | undefined;

    try {
        const scope = resolveAnswerlatticeSessionScope(session);
        tenantIdForLog = scope?.tenantId;
        storeIdForLog = scope?.storeId;
        if (!scope) {
            return NextResponse.json({ error: 'Answerlattice account scope is missing' }, { status: 400 });
        }

        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const userId = userIdForLog || 'unknown';
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-article-entity-extraction', userId, scope.tenantId, scope.storeId),
            ...rateLimitConfig,
        });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                endpoint: '/api/answerlattice/articles/extract-entities',
                limit: rateLimitConfig.limit,
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('userId', userId),
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;

        const bodyResult = await readBoundedJsonBody(request, ARTICLE_ENTITY_EXTRACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid entity extraction request',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid entity extraction request' },
                { status: bodyResult.response.status },
            );
        }

        const validation = ArticleSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid entity extraction request', details: getSafeZodValidationDetails(validation.error) },
                { status: 400 },
            );
        }

        const article = validation.data;
        articleIdForLog = article.id;
        const tenantId = scope.tenantId;
        const storeId = scope.storeId;
        const articleRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(article.id);
        const articleSnap = await articleRef.get();
        if (!articleSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const persistedArticle = articleSnap.data() || {};
        const articleTenantId = normalizeAnswerlatticeScopeDocumentId(persistedArticle.tId ?? persistedArticle.tenantId);
        const articleStoreId = normalizeAnswerlatticeScopeDocumentId(persistedArticle.sId ?? persistedArticle.storeId);
        if (
            persistedArticle.pId !== PRODUCT_IDS.ANSWERLATTICE
            || !articleTenantId
            || !articleStoreId
            || articleTenantId !== tenantId
            || articleStoreId !== storeId
        ) {
            logger.security('Authorization Failed - Answerlattice Article Entity Extraction Scope Mismatch', {
                ...getBoundedRuntimeStringContext('articleId', article.id),
                ...getBoundedRuntimeStringContext('requestedStoreId', storeId),
                ...getBoundedRuntimeStringContext('requestedTenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', persistedArticle.sId),
                ...getBoundedRuntimeStringContext('tenantId', persistedArticle.tId),
                ...getBoundedRuntimeStringContext('userId', userId),
            }, 'critical');
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const sourceFingerprint = buildArticleSourceFingerprint(persistedArticle);
        const sourceContent = persistedArticle.content;
        const textContent = extractPlainTextFromTipTap(sourceContent);
        const syncArticleEntityIds = async (nextEntityIds: unknown): Promise<string[]> => {
            const normalizedNextEntityIds = normalizeAnswerlatticeResolvedEntityIds(
                nextEntityIds,
                ARTICLE_ENTITY_ID_LIMIT,
            ).sort();

            return answerlatticeFirestoreAdmin.runTransaction(async (transaction) => {
                const currentArticleSnapshot = await transaction.get(articleRef);
                if (!currentArticleSnapshot.exists) {
                    throw new ArticleEntityExtractionConflictError('article_deleted_during_entity_extraction');
                }
                const currentArticle = currentArticleSnapshot.data() || {};
                const currentTenantId = normalizeAnswerlatticeScopeDocumentId(currentArticle.tId);
                const currentStoreId = normalizeAnswerlatticeScopeDocumentId(currentArticle.sId);
                if (
                    currentArticle.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || currentTenantId !== tenantId
                    || currentStoreId !== storeId
                    || buildArticleSourceFingerprint(currentArticle) !== sourceFingerprint
                ) {
                    throw new ArticleEntityExtractionConflictError('article_changed_during_entity_extraction');
                }

                const entitySnapshots = await Promise.all(normalizedNextEntityIds.map((entityId) => (
                    transaction.get(answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(entityId))
                )));
                if (entitySnapshots.some((snapshot) => {
                    const data = snapshot.data() || {};
                    return !snapshot.exists
                        || data.pId !== PRODUCT_IDS.ANSWERLATTICE
                        || data.tId !== tenantId
                        || data.sId !== storeId
                        || data.status !== 'active';
                })) {
                    throw new ArticleEntityExtractionConflictError('matched_entity_changed_during_extraction');
                }

                const storedEntityIdsValue = currentArticle.entityIds;
                const storedEntityIds = Array.isArray(storedEntityIdsValue) ? storedEntityIdsValue : [];
                const sortedStoredEntityIds = [...storedEntityIds].sort();
                const normalizedStoredEntityIds = normalizeAnswerlatticeResolvedEntityIds(
                    storedEntityIds,
                    ARTICLE_ENTITY_ID_LIMIT,
                ).sort();
                const storedEntityIdsAreValid = (
                    storedEntityIdsValue === undefined
                    || Array.isArray(storedEntityIdsValue)
                )
                    && normalizedStoredEntityIds.length === storedEntityIds.length
                    && normalizedStoredEntityIds.every((entityId, index) => entityId === sortedStoredEntityIds[index]);
                const entityLinksChanged = !storedEntityIdsAreValid
                    || normalizedStoredEntityIds.length !== normalizedNextEntityIds.length
                    || normalizedStoredEntityIds.some((entityId, index) => entityId !== normalizedNextEntityIds[index]);

                if (entityLinksChanged) {
                    const invalidationOwnership = await readAnswerlatticeInvalidationOwnership({
                        cacheSources: [ANSWERLATTICE_CACHE_SOURCES.KB],
                        db: answerlatticeFirestoreAdmin,
                        scope: { tId: tenantId, sId: storeId },
                        transaction,
                    });
                    transaction.update(articleRef, {
                        entityIds: normalizedNextEntityIds,
                        modifiedOn: FieldValue.serverTimestamp(),
                    });
                    addArticleEntityLinkInvalidationWrites(
                        transaction,
                        { tId: tenantId, sId: storeId },
                        invalidationOwnership,
                        article.id,
                    );
                }

                return normalizedNextEntityIds;
            });
        };

        if (!textContent || textContent.length < 20) {
            const entityIds = await syncArticleEntityIds([]);
            return NextResponse.json({ ok: true, entityIds, newCandidateCount: 0 });
        }

        const existingEntitiesSnap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tenantId)
            .where('sId', '==', storeId)
            .limit(500)
            .get();
        const existingEntities = existingEntitiesSnap.docs.flatMap((doc) => {
            const data = doc.data();
            if (
                data.pId !== PRODUCT_IDS.ANSWERLATTICE
                || data.status !== 'active'
            ) {
                return [];
            }
            const entity = {
                aliases: Array.isArray(data.aliases) ? data.aliases : [],
                id: doc.id,
                name: String(data.name || ''),
                slug: String(data.slug || ''),
            };
            return entity.name && entity.slug ? [entity] : [];
        });

        const result = await extractEntitiesFromArticles(
            [{
                title: String(persistedArticle.title || article.title || ''),
                content: textContent,
                category: String(persistedArticle.categoryTitle || article.categoryTitle || '') || undefined,
            }],
            tenantId,
            storeId,
            async (systemPrompt: string, userPrompt: string) => {
                const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
                const startedAt = Date.now();
                const geminiResult = await callGeminiChatWithMetadata(combinedPrompt, []);

                await recordAnswerlatticeAiOperation({
                    tId: tenantId,
                    sId: storeId,
                }, {
                    action: AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION,
                    billingMode: 'internal',
                    clientResponse: {
                        articleId: article.id,
                        categoryTitle: persistedArticle.categoryTitle || article.categoryTitle || null,
                    },
                    model: ANSWERLATTICE_TEXT_MODEL,
                    processingTime: Date.now() - startedAt,
                    source: 'answerlattice_article_entity_extraction',
                    candidatesTokenCount: geminiResult.usageMetadata.candidatesTokenCount || 0,
                    promptTokenCount: geminiResult.usageMetadata.promptTokenCount || 0,
                    tokenCountSource: geminiResult.usageMetadata.tokenCountSource || 'none',
                    totalTokenCount: geminiResult.usageMetadata.totalTokenCount || 0,
                    unitsConsumed: getUnitCost(AI_ACTIONS_TYPES.ANSWERLATTICE_ENTITY_EXTRACTION),
                }, {
                    id: userId,
                    email: session.user?.email,
                    name: session.user?.name,
                });

                return geminiResult.text;
            },
            existingEntities,
            async () => undefined,
            { persistCandidates: false },
        );

        if (result.successfulBatchCount < 1 || result.failedBatchCount > 0) {
            throw new Error('Article entity extraction did not complete successfully');
        }

        const matchedEntityIds = await syncArticleEntityIds(result?.matchedEntityIds);
        let newCandidateCount = 0;
        for (const candidate of result.candidateDrafts || []) {
            try {
                const storedCandidate = await upsertAnswerlatticeExtractedEntityCandidate({
                    scope: { tId: tenantId, sId: storeId },
                    actorLabel: String(session.user?.email || session.user?.name || userId),
                    candidate: {
                        tId: tenantId,
                        sId: storeId,
                        name: candidate.name,
                        type: candidate.type,
                        confidence: candidate.confidence,
                        frequency: { articles: 1, tickets: 0, chat: 0 },
                        description: candidate.description,
                        status: 'pending',
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                    },
                    sourceArticleId: article.id,
                });
                if (storedCandidate.created) newCandidateCount += 1;
            } catch (candidateError) {
                logRuntimeFailure('answerlattice_article_entity_candidate_store_failed', candidateError, {
                    ...getBoundedRuntimeStringContext('articleId', article.id),
                    ...getBoundedRuntimeStringContext('entityName', candidate.name),
                    ...getBoundedRuntimeStringContext('storeId', storeId),
                    ...getBoundedRuntimeStringContext('tenantId', tenantId),
                });
            }
        }

        return NextResponse.json({
            ok: true,
            entityIds: matchedEntityIds,
            newCandidateCount,
        });
    } catch (error) {
        if (error instanceof ArticleEntityExtractionConflictError) {
            return NextResponse.json(
                { error: 'The article changed while entity extraction was running. Retry from the latest article.' },
                { status: 409 },
            );
        }
        if (error instanceof AnswerlatticeInvalidationOwnershipError) {
            return NextResponse.json(
                { error: 'Article cache state is invalid for this workspace.' },
                { status: 409 },
            );
        }
        logRuntimeFailure('answerlattice_article_entity_extraction_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('articleId', articleIdForLog),
        });
        return NextResponse.json({ error: 'Could not extract article entities' }, { status: 500 });
    }
});
