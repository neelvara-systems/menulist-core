export const dynamic = 'force-dynamic';

import {
    publishKnowledgeIntakeJob,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import {
    normalizeAnswerlatticeKnowledgeIntakeJobId,
} from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { AnswerlatticeKnowledgeIntakePublishRequestSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import {
    getAnswerlatticeKnowledgeIntakeLogContext,
    logAnswerlatticeKnowledgeIntakeFailure,
} from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const KNOWLEDGE_INTAKE_PUBLISH_MAX_BODY_BYTES = 16 * 1024;

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return answerlatticeKnowledgeIntakeJson({ error: 'Invalid knowledge intake job.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:publish',
        rateLimit: 6,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_PUBLISH_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid publish request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return answerlatticeKnowledgeIntakeJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid publish request.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = AnswerlatticeKnowledgeIntakePublishRequestSchema.parse(bodyResult.data) || {};
        const result = await publishKnowledgeIntakeJob(access.context.scope, jobId, parsed.itemIds, access.context.actor);
        secureLog('[Answerlattice Intake] Job published', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId,
            publishedCount: result.published.length,
            scope: access.context.scope,
        }));
        return answerlatticeKnowledgeIntakeJson({ result: serializeIntakeValue(result) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return answerlatticeKnowledgeIntakeJson({ error: 'Invalid publish request.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to publish job', 'answerlattice_intake_job_publish_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return answerlatticeKnowledgeIntakeJson({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to publish accepted intake items.') }, { status });
    }
});
