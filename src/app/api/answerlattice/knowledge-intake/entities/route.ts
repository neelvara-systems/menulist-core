export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    normalizeAnswerlatticeEntityLookupQuery,
    searchAnswerlatticeEntityLookupOptions,
} from '@lib/answerlattice/entityLookup';
import {
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const EntityLookupSchema = z.object({
    q: z.string().trim().min(3).max(80),
});

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_REPEATED_REPLY_IMPORT) {
        return NextResponse.json({ error: 'Repeated reply import is not enabled.' }, { status: 404 });
    }

    const normalizedQuery = normalizeAnswerlatticeEntityLookupQuery(new URL(request.url).searchParams.get('q') || '');
    if (normalizedQuery.length < 3) {
        return NextResponse.json({ entities: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const parsed = EntityLookupSchema.safeParse({ q: normalizedQuery });
    if (!parsed.success) {
        return NextResponse.json({ error: 'Enter a valid entity search query.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:entity-search',
        rateLimit: 60,
        rateWindow: 60,
    });
    if (access.response) return access.response;

    try {
        const entities = await searchAnswerlatticeEntityLookupOptions(access.context.scope, parsed.data.q);
        return NextResponse.json({ entities }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Answerlattice Intake] Entity lookup failed', error as Error, access.context.scope);
        }
        return NextResponse.json({ error: status >= 500 ? 'Failed to search product entities.' : (error instanceof Error ? error.message : 'Failed to search product entities.') }, { status });
    }
});
