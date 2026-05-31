export const dynamic = 'force-dynamic';

import {
    createKnowledgeIntakeJob,
    listKnowledgeIntakeJobs,
    serializeIntakeValue,
} from '@lib/canonica/knowledgeIntake';
import {
    getCanonicaKnowledgeIntakeErrorStatus,
    requireCanonicaKnowledgeIntakeContext,
} from '@lib/canonica/knowledgeIntakeApi';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const CreateJobSchema = z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    productWebsiteUrl: z.string().trim().max(300).optional(),
    appUrl: z.string().trim().max(300).optional(),
    targetAudience: z.string().trim().max(160).optional(),
}).optional();

export const GET = withAuth(async (request: NextRequest, session) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session);
    if (access.response) return access.response;

    try {
        const jobs = await listKnowledgeIntakeJobs(access.context.scope);
        return NextResponse.json({ jobs: serializeIntakeValue(jobs) }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        secureError('[Canonica Intake] Failed to list jobs', error as Error, access.context.scope);
        return NextResponse.json({ error: 'Failed to load knowledge intake jobs.' }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, session) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'canonica-intake:create-job',
        rateLimit: 12,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = CreateJobSchema.parse(body) || {};
        const job = await createKnowledgeIntakeJob(access.context.scope, parsed, access.context.actor);
        secureLog('[Canonica Intake] Job created', {
            jobId: job.id,
            tId: access.context.scope.tId,
            sId: access.context.scope.sId,
        });
        return NextResponse.json({ job: serializeIntakeValue(job) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid intake job details.' }, { status: 400 });
        }
        const status = getCanonicaKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Canonica Intake] Failed to create job', error as Error, access.context.scope);
        }
        return NextResponse.json({ error: status >= 500 ? 'Failed to create knowledge intake job.' : (error instanceof Error ? error.message : 'Failed to create knowledge intake job.') }, { status });
    }
});
