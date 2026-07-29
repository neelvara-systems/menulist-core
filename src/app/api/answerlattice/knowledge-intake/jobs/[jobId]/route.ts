export const dynamic = 'force-dynamic';

import {
    getKnowledgeIntakeBundle,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import { normalizeAnswerlatticeKnowledgeIntakeJobId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { logAnswerlatticeKnowledgeIntakeFailure } from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../../readRateLimit';

export const GET = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return answerlatticeKnowledgeIntakeJson({ error: 'Invalid knowledge intake job.' }, { status: 400 });
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-job');
    if (rateLimitResponse) return rateLimitResponse;
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const bundle = await getKnowledgeIntakeBundle(access.context.scope, jobId);
        return answerlatticeKnowledgeIntakeJson({ bundle: serializeIntakeValue(bundle) });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to load job bundle', 'answerlattice_intake_job_bundle_load_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return answerlatticeKnowledgeIntakeJson({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to load knowledge intake job.') }, { status });
    }
});
