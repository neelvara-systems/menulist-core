export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    normalizeAnswerlatticeEntityLookupQuery,
    searchAnswerlatticeEntityLookupOptions,
} from '@lib/answerlattice/entityLookup';
import {
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

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

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-entities');
    if (rateLimitResponse) return rateLimitResponse;

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const entities = await searchAnswerlatticeEntityLookupOptions(access.context.scope, parsed.data.q);
        return NextResponse.json({ entities }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logRuntimeFailure('answerlattice_intake_entity_lookup_failed', error, {
                ...getBoundedRuntimeStringContext('tenantId', access.context.scope.tId),
                ...getBoundedRuntimeStringContext('storeId', access.context.scope.sId),
                ...getBoundedRuntimeStringContext('query', parsed.data.q),
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to search product entities.') }, { status });
    }
});
