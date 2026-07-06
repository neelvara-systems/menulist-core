export const dynamic = 'force-dynamic';

import {
    analyzeKnowledgeIntakeJob,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import { normalizeAnswerlatticeKnowledgeIntakeJobId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import {
    getAnswerlatticeKnowledgeIntakeLogContext,
    logAnswerlatticeKnowledgeIntakeFailure,
} from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return NextResponse.json({ error: 'Invalid knowledge intake job.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:analyze',
        rateLimit: 8,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const result = await analyzeKnowledgeIntakeJob(access.context.scope, jobId, access.context.actor);
        secureLog('[Answerlattice Intake] Job analyzed', getAnswerlatticeKnowledgeIntakeLogContext({
            createdCount: result.created,
            jobId,
            scope: access.context.scope,
        }));
        return NextResponse.json({ result: serializeIntakeValue(result) });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to analyze job', 'answerlattice_intake_job_analyze_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to generate review drafts.') }, { status });
    }
});
