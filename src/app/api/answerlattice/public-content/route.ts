export const dynamic = 'force-dynamic';

import {
    getCachedKnowledgeBaseArticle,
    getCachedKnowledgeBaseCategories,
    getCachedLatestChangelogPage,
    getCachedOlderChangelogPage,
    getCachedPublishedFaqs,
} from '@lib/answerlattice/publicContentCache';
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const publicContentQuerySchema = z.object({
    type: z.enum(['faqs', 'categories', 'article', 'changelog']),
    articleId: z.string().trim().min(1).max(160).optional(),
    beforePageNumber: z.coerce.number().int().positive().optional(),
    maxResults: z.coerce.number().int().positive().max(80).optional(),
});

export const GET = withAuth(async (request: NextRequest, session) => {
    const parsed = publicContentQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid public content request' }, { status: 400 });
    }

    const scope = resolveAnswerlatticePublicContentScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available' }, { status: 400 });
    }

    try {
        const { type, articleId, beforePageNumber, maxResults } = parsed.data;

        if (type === 'faqs') {
            const data = await getCachedPublishedFaqs(scope, maxResults);
            return NextResponse.json({ data });
        }

        if (type === 'categories') {
            const data = await getCachedKnowledgeBaseCategories(scope);
            return NextResponse.json({ data });
        }

        if (type === 'article') {
            if (!articleId) {
                return NextResponse.json({ error: 'Missing articleId' }, { status: 400 });
            }
            const data = await getCachedKnowledgeBaseArticle(scope, articleId);
            return NextResponse.json({ data });
        }

        const data = beforePageNumber
            ? await getCachedOlderChangelogPage(scope, beforePageNumber)
            : await getCachedLatestChangelogPage(scope);
        return NextResponse.json({ data });
    } catch (error) {
        secureError('[Answerlattice Public Content] Failed to load cached content', error as Error, {
            type: parsed.data.type,
            tenantId: scope.tId,
            storeId: scope.sId,
        });
        return NextResponse.json({ error: 'Failed to load public content' }, { status: 500 });
    }
});
