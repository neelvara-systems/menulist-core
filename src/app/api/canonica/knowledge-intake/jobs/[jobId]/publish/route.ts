export const dynamic = 'force-dynamic';

import {
    publishKnowledgeIntakeJob,
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

const PublishSchema = z.object({
    itemIds: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
}).optional();

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'canonica-intake:publish',
        rateLimit: 6,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = PublishSchema.parse(body) || {};
        const result = await publishKnowledgeIntakeJob(access.context.scope, params.jobId, parsed.itemIds, access.context.actor);
        secureLog('[Canonica Intake] Job published', {
            jobId: params.jobId,
            published: result.published.length,
            tId: access.context.scope.tId,
            sId: access.context.scope.sId,
        });
        return NextResponse.json({ result: serializeIntakeValue(result) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid publish request.' }, { status: 400 });
        }
        const status = getCanonicaKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Canonica Intake] Failed to publish job', error as Error, {
                ...access.context.scope,
                jobId: params.jobId,
            });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to publish accepted intake items.' }, { status });
    }
});
