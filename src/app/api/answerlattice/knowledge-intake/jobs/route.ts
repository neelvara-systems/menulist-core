export const dynamic = 'force-dynamic';

import {
    createKnowledgeIntakeJob,
    listKnowledgeIntakeJobs,
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
import { isAnswerlatticeKnowledgeIntakeHttpUrl } from '@lib/answerlattice/knowledgeIntakeUrlContracts';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

const CreateJobSchema = z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    productWebsiteUrl: z.string().trim().max(300).url().refine(isAnswerlatticeKnowledgeIntakeHttpUrl).optional(),
    appUrl: z.string().trim().max(300).url().refine(isAnswerlatticeKnowledgeIntakeHttpUrl).optional(),
    targetAudience: z.string().trim().max(160).optional(),
}).strict().optional();
const KNOWLEDGE_INTAKE_CREATE_JOB_MAX_BODY_BYTES = 8 * 1024;

export const GET = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'knowledge-intake-jobs');
    if (rateLimitResponse) return rateLimitResponse;
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const jobs = await listKnowledgeIntakeJobs(access.context.scope);
        return NextResponse.json({ jobs: serializeIntakeValue(jobs) }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to list jobs', 'answerlattice_intake_jobs_list_failed', error, {
            scope: access.context.scope,
        });
        return NextResponse.json({ error: 'Failed to load knowledge intake jobs.' }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:create-job',
        rateLimit: 12,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_CREATE_JOB_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid intake job details.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid intake job details.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = CreateJobSchema.parse(bodyResult.data) || {};
        const job = await createKnowledgeIntakeJob(access.context.scope, parsed, access.context.actor);
        secureLog('[Answerlattice Intake] Job created', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId: job.id,
            scope: access.context.scope,
        }));
        return NextResponse.json({ job: serializeIntakeValue(job) }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid intake job details.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to create job', 'answerlattice_intake_job_create_failed', error, {
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to create knowledge intake job.') }, { status });
    }
});
