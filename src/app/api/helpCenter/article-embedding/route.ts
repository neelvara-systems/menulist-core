export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { embedAnswerlatticeArticle } from '@lib/answerlattice/articleEmbeddingServer';
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import {
    ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH,
    normalizeAnswerlatticeKbArticleId,
} from '@lib/answerlattice/kbArticleIdBoundary';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const ARTICLE_EMBEDDING_MAX_BODY_BYTES = 256 * 1024;
const articleEmbeddingJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
};
const withArticleEmbeddingPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};
const ArticleEmbeddingRequestSchema = z.object({
    embeddingPayload: z.object({
        articleId: z.string().trim().max(ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH)
            .refine((value) => normalizeAnswerlatticeKbArticleId(value) === value),
        // Kept for backward-compatible callers. Runtime truth is always re-read
        // from the scoped article document before the provider call.
        content: z.unknown().optional(),
        categoryId: z.string().trim().max(160).optional(),
        sectionId: z.string().trim().max(160).optional(),
        articleTitle: z.string().trim().max(300).optional(),
        categoryTitle: z.string().trim().max(300).optional(),
        sectionTitle: z.string().trim().max(300).optional(),
    }).strict(),
}).strict();

export const POST = withAuth(async (request: NextRequest, session) => {
    let operationScope: { tId: number; sId: number } | null = null;
    try {
        const { checkAnswerlatticeSafeMode } = await import('@lib/answerlattice/safeMode');
        const safeModeResponse = await checkAnswerlatticeSafeMode();
        if (safeModeResponse) return withArticleEmbeddingPrivateHeaders(safeModeResponse);

        const rateLimitResponse = await checkAIOperationLimit({ session });
        if (rateLimitResponse) return withArticleEmbeddingPrivateHeaders(rateLimitResponse);

        const actorId = resolveCurrentSessionUserDocumentId(session);
        if (!actorId) {
            return articleEmbeddingJson({ error: 'Forbidden' }, { status: 403 });
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
        );
        if (permission.response) return withArticleEmbeddingPrivateHeaders(permission.response);
        operationScope = {
            tId: permission.access.scope.tenantId,
            sId: permission.access.scope.storeId,
        };

        const bodyResult = await readBoundedJsonBody(request, ARTICLE_EMBEDDING_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return withArticleEmbeddingPrivateHeaders(bodyResult.response);
        const { embeddingPayload } = ArticleEmbeddingRequestSchema.parse(bodyResult.data);
        const result = await embedAnswerlatticeArticle({
            actor: {
                id: actorId,
                name: session.user?.name,
                email: session.user?.email,
            },
            articleId: embeddingPayload.articleId,
            scope: operationScope,
            source: 'help_center_article_embedding',
        });
        return articleEmbeddingJson({ ok: true, status: 200, ...result });
    } catch (error) {
        if (error instanceof ZodError) {
            return articleEmbeddingJson({ error: 'Invalid article embedding request' }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : '';
        if (message === 'Article not found.') {
            return articleEmbeddingJson({ error: 'Article not found' }, { status: 404 });
        }
        if (message === 'Article embedding is already running.') {
            return articleEmbeddingJson({ error: message }, { status: 409 });
        }
        if (message === 'Article content is too short to embed.') {
            return articleEmbeddingJson({ error: message }, { status: 400 });
        }
        if (isAIProviderRateLimitError(error)) {
            const retryAfter = getAIProviderRetryAfter(error) || 60;
            return articleEmbeddingJson(
                { error: `Embedding generation is temporarily busy. Please wait ${retryAfter} seconds before trying again.`, retryAfter },
                { status: 429, headers: { 'Retry-After': String(retryAfter) } },
            );
        }
        logAnswerlatticeFailure('answerlattice_article_embedding_route_failed', error, getAnswerlatticeScopeLogContext({
            tId: operationScope?.tId,
            sId: operationScope?.sId,
        }));
        return articleEmbeddingJson({ error: 'Embedding generation failed. Please try again.' }, { status: 500 });
    }
});
