export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { extractEntitiesFromArticles, extractPlainTextFromTipTap } from '@lib/answerlattice/entityExtraction';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { callGeminiChatWithMetadata } from '@lib/vectorEmbeddings';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const ArticleSchema = z.object({
    categoryTitle: z.string().trim().max(180).optional().nullable(),
    content: z.any(),
    id: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(240),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;

        const validation = ArticleSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid entity extraction request', details: validation.error.flatten() },
                { status: 400 },
            );
        }

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return NextResponse.json({ error: 'Answerlattice account scope is missing' }, { status: 400 });
        }

        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const userId = session.uId || session.user?.id || 'unknown';
        const rateLimit = await checkRateLimit({
            key: `answerlattice-article-entity-extraction:${userId}:${scope.tenantId}:${scope.storeId}`,
            ...rateLimitConfig,
        });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                endpoint: '/api/answerlattice/articles/extract-entities',
                limit: rateLimitConfig.limit,
                storeId: scope.storeId,
                tenantId: scope.tenantId,
                userId,
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

        const article = validation.data;
        const tenantId = Number(scope.tenantId);
        const storeId = Number(scope.storeId);
        const articleRef = answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(article.id);
        const articleSnap = await articleRef.get();
        if (!articleSnap.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const persistedArticle = articleSnap.data() || {};
        if (Number(persistedArticle.tId) !== tenantId || Number(persistedArticle.sId) !== storeId) {
            logger.security('Authorization Failed - Answerlattice Article Entity Extraction Scope Mismatch', {
                articleId: article.id,
                requestedStoreId: storeId,
                requestedTenantId: tenantId,
                storeId: persistedArticle.sId,
                tenantId: persistedArticle.tId,
                userId,
            }, 'critical');
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const sourceContent = persistedArticle.content ?? article.content;
        const textContent = extractPlainTextFromTipTap(sourceContent);
        if (!textContent || textContent.length < 20) {
            return NextResponse.json({ ok: true, entityIds: [], newCandidateCount: 0 });
        }

        const existingEntitiesSnap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
            .where('tId', '==', tenantId)
            .where('sId', '==', storeId)
            .limit(500)
            .get();
        const existingEntities = existingEntitiesSnap.docs.map((doc) => {
            const data = doc.data();
            return {
                aliases: Array.isArray(data.aliases) ? data.aliases : [],
                id: doc.id,
                name: String(data.name || ''),
                slug: String(data.slug || ''),
            };
        }).filter((entity) => entity.name && entity.slug);

        const result = await extractEntitiesFromArticles(
            [{
                title: String(persistedArticle.title || article.title),
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
                    model: 'gemini-2.5-flash',
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
            async (candidate) => {
                await answerlatticeFirestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES).add({
                    ...candidate,
                    createdBy: session.user?.email || session.user?.name || String(userId),
                    createdOn: admin.firestore.FieldValue.serverTimestamp(),
                    modifiedBy: session.user?.email || session.user?.name || String(userId),
                    modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                });
            },
        );

        const matchedEntityIds = result?.matchedEntityIds || [];
        if (matchedEntityIds.length > 0) {
            await articleRef.set({
                entityIds: matchedEntityIds,
                modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        return NextResponse.json({
            ok: true,
            entityIds: matchedEntityIds,
            newCandidateCount: result?.newCandidateCount || 0,
        });
    } catch (error) {
        secureError('[Answerlattice Entity Extraction] Article extraction failed', error as Error, {
            path: request.nextUrl.pathname,
        });
        return NextResponse.json({ error: 'Could not extract article entities' }, { status: 500 });
    }
});
