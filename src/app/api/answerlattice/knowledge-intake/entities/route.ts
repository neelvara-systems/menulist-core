export const dynamic = 'force-dynamic';

import {
    normalizeAnswerlatticeEntityLookupQuery,
    searchAnswerlatticeEntityLookupOptions,
} from '@lib/answerlattice/entityLookup';
import {
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

const EntityLookupSchema = z.object({
    q: z.string().trim().min(3).max(80),
}).strict();

export const GET = withAuth(async (request: NextRequest, session) => {
    const normalizedQuery = normalizeAnswerlatticeEntityLookupQuery(new URL(request.url).searchParams.get('q') || '');
    if (normalizedQuery.length < 3) {
        return answerlatticeKnowledgeIntakeJson({ entities: [] });
    }

    const parsed = EntityLookupSchema.safeParse({ q: normalizedQuery });
    if (!parsed.success) {
        return answerlatticeKnowledgeIntakeJson({ error: 'Enter a valid entity search query.' }, { status: 400 });
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-entities');
    if (rateLimitResponse) return rateLimitResponse;

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const entities = await searchAnswerlatticeEntityLookupOptions(access.context.scope, parsed.data.q);
        return answerlatticeKnowledgeIntakeJson({ entities });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logRuntimeFailure('answerlattice_intake_entity_lookup_failed', error, {
                ...getBoundedRuntimeStringContext('tenantId', access.context.scope.tId),
                ...getBoundedRuntimeStringContext('storeId', access.context.scope.sId),
                queryLength: parsed.data.q.length,
            });
        }
        return answerlatticeKnowledgeIntakeJson({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to search product entities.') }, { status });
    }
});
