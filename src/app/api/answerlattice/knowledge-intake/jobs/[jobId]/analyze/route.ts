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
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
    withAnswerlatticeKnowledgeIntakePrivateHeaders,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { secureLog } from '@lib/security/secureLogger';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const AnalyzeSchema = z.object({}).strict().optional();
const KNOWLEDGE_INTAKE_ANALYZE_MAX_BODY_BYTES = 1024;

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return answerlatticeKnowledgeIntakeJson({ error: 'Invalid knowledge intake job.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:analyze',
        rateLimit: 8,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_ANALYZE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid analyze request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return withAnswerlatticeKnowledgeIntakePrivateHeaders(bodyResult.response);
        }
        AnalyzeSchema.parse(bodyResult.data);
        const result = await analyzeKnowledgeIntakeJob(access.context.scope, jobId, access.context.actor);
        secureLog('[Answerlattice Intake] Job analyzed', getAnswerlatticeKnowledgeIntakeLogContext({
            createdCount: result.created,
            jobId,
            scope: access.context.scope,
        }));
        return answerlatticeKnowledgeIntakeJson({ result: serializeIntakeValue(result) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return answerlatticeKnowledgeIntakeJson({ error: 'Invalid analyze request.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to analyze job', 'answerlattice_intake_job_analyze_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return answerlatticeKnowledgeIntakeJson({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to generate review drafts.') }, { status });
    }
});
