export const dynamic = 'force-dynamic';

import {
    analyzeKnowledgeIntakeJob,
    serializeIntakeValue,
} from '@lib/canonica/knowledgeIntake';
import {
    getCanonicaKnowledgeIntakeErrorStatus,
    requireCanonicaKnowledgeIntakeContext,
} from '@lib/canonica/knowledgeIntakeApi';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'canonica-intake:analyze',
        rateLimit: 8,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const result = await analyzeKnowledgeIntakeJob(access.context.scope, params.jobId, access.context.actor);
        secureLog('[Canonica Intake] Job analyzed', {
            jobId: params.jobId,
            created: result.created,
            tId: access.context.scope.tId,
            sId: access.context.scope.sId,
        });
        return NextResponse.json({ result: serializeIntakeValue(result) });
    } catch (error) {
        const status = getCanonicaKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Canonica Intake] Failed to analyze job', error as Error, {
                ...access.context.scope,
                jobId: params.jobId,
            });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate review drafts.' }, { status });
    }
});
