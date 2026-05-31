export const dynamic = 'force-dynamic';

import {
    getKnowledgeIntakeBundle,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import {
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const bundle = await getKnowledgeIntakeBundle(access.context.scope, params.jobId);
        return NextResponse.json({ bundle: serializeIntakeValue(bundle) }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Answerlattice Intake] Failed to load job bundle', error as Error, {
                ...access.context.scope,
                jobId: params.jobId,
            });
        }
        return NextResponse.json({ error: status >= 500 ? 'Failed to load knowledge intake job.' : (error instanceof Error ? error.message : 'Failed to load knowledge intake job.') }, { status });
    }
});
