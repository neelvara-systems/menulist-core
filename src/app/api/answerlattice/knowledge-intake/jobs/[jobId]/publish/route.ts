export const dynamic = 'force-dynamic';

import {
    publishKnowledgeIntakeJob,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import {
    getAnswerlatticeKnowledgeIntakeLogContext,
    logAnswerlatticeKnowledgeIntakeFailure,
} from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const PublishSchema = z.object({
    itemIds: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
}).optional();
const KNOWLEDGE_INTAKE_PUBLISH_MAX_BODY_BYTES = 16 * 1024;

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
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
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid publish request.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = PublishSchema.parse(bodyResult.data) || {};
        const result = await publishKnowledgeIntakeJob(access.context.scope, params.jobId, parsed.itemIds, access.context.actor);
        secureLog('[Answerlattice Intake] Job published', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId: params.jobId,
            publishedCount: result.published.length,
            scope: access.context.scope,
        }));
        return NextResponse.json({ result: serializeIntakeValue(result) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid publish request.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to publish job', 'answerlattice_intake_job_publish_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to publish accepted intake items.') }, { status });
    }
});
