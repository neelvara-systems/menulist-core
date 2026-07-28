export const dynamic = 'force-dynamic';

import {
    getCachedKnowledgeBaseArticle,
    getCachedKnowledgeBaseCategories,
    getCachedLatestChangelogPage,
    getCachedOlderChangelogPage,
    getCachedPublishedFaqs,
} from '@lib/answerlattice/publicContentCache';
import {
    ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH,
    normalizeAnswerlatticeKbArticleId,
} from '@lib/answerlattice/kbArticleIdBoundary';
import { ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS } from '@lib/answerlattice/accessControl';
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const publicContentQuerySchema = z.object({
    type: z.enum(['faqs', 'categories', 'article', 'changelog']),
    articleId: z.string().trim().max(ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH)
        .refine((value) => normalizeAnswerlatticeKbArticleId(value) === value)
        .optional(),
    beforePageNumber: z.coerce.number().int().positive().optional(),
    maxResults: z.coerce.number().int().positive().max(80).optional(),
    expectedTenantId: z.coerce.number().int().positive(),
    expectedStoreId: z.coerce.number().int().positive(),
}).strict();

const privateJson = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
    headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    status,
});

export const GET = withAuth(async (request: NextRequest, session) => {
    const parsed = publicContentQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
        return privateJson({ error: 'Invalid public content request' }, 400);
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'public-content');
    if (rateLimitResponse) return rateLimitResponse;

    const scope = resolveAnswerlatticePublicContentScope(session);
    if (!scope) {
        return privateJson({ error: 'Answerlattice workspace is not available' }, 400);
    }
    if (
        parsed.data.expectedTenantId !== scope.tId
        || parsed.data.expectedStoreId !== scope.sId
    ) {
        return privateJson({ error: 'Answerlattice workspace changed' }, 409);
    }

    try {
        const { type, articleId, beforePageNumber, maxResults } = parsed.data;

        if (type === 'faqs') {
            const data = await getCachedPublishedFaqs(scope, maxResults);
            return privateJson({ data, scope });
        }

        if (type === 'categories') {
            const data = await getCachedKnowledgeBaseCategories(scope);
            return privateJson({ data, scope });
        }

        if (type === 'article') {
            if (!articleId) {
                return privateJson({ error: 'Missing articleId' }, 400);
            }
            const data = await getCachedKnowledgeBaseArticle(scope, articleId);
            return privateJson({ data, scope });
        }

        const data = beforePageNumber
            ? await getCachedOlderChangelogPage(scope, beforePageNumber)
            : await getCachedLatestChangelogPage(scope);
        return privateJson({ data, scope });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_content_cache_load_failed', error, {
            contentType: parsed.data.type,
            ...getBoundedRuntimeStringContext('tenantId', scope.tId),
            ...getBoundedRuntimeStringContext('storeId', scope.sId),
        });
        return privateJson({ error: 'Failed to load public content' }, 500);
    }
});
