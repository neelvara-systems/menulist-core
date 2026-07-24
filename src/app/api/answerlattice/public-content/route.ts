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
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

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

export const GET = withAuth(async (request: NextRequest, session) => {
    const parsed = publicContentQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid public content request' }, { status: 400 });
    }

    const scope = resolveAnswerlatticePublicContentScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available' }, { status: 400 });
    }
    if (
        parsed.data.expectedTenantId !== scope.tId
        || parsed.data.expectedStoreId !== scope.sId
    ) {
        return NextResponse.json({ error: 'Answerlattice workspace changed' }, { status: 409 });
    }

    try {
        const { type, articleId, beforePageNumber, maxResults } = parsed.data;

        if (type === 'faqs') {
            const data = await getCachedPublishedFaqs(scope, maxResults);
            return NextResponse.json({ data, scope });
        }

        if (type === 'categories') {
            const data = await getCachedKnowledgeBaseCategories(scope);
            return NextResponse.json({ data, scope });
        }

        if (type === 'article') {
            if (!articleId) {
                return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
            }
            const data = await getCachedKnowledgeBaseArticle(scope, articleId);
            return NextResponse.json({ data, scope });
        }

        const data = beforePageNumber
            ? await getCachedOlderChangelogPage(scope, beforePageNumber)
            : await getCachedLatestChangelogPage(scope);
        return NextResponse.json({ data, scope });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_content_cache_load_failed', error, {
            contentType: parsed.data.type,
            ...getBoundedRuntimeStringContext('tenantId', scope.tId),
            ...getBoundedRuntimeStringContext('storeId', scope.sId),
        });
        return NextResponse.json({ error: 'Failed to load public content' }, { status: 500 });
    }
});
