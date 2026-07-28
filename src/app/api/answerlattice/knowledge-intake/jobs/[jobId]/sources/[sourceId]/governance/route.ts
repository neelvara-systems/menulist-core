export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import {
    serializeIntakeValue,
    updateKnowledgeSourceGovernance,
    type UpdateSourceGovernanceInput,
} from '@lib/answerlattice/knowledgeIntake';
import { AnswerlatticeSourceGovernanceInputSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import {
    normalizeAnswerlatticeKnowledgeIntakeJobId,
    normalizeAnswerlatticeKnowledgeIntakeSourceId,
} from '@lib/answerlattice/knowledgeIntakeIdBoundary';
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

const SOURCE_GOVERNANCE_MAX_BODY_BYTES = 24 * 1024;

export const PATCH = withAuth(async (
    request: NextRequest,
    session,
    params: { jobId: string; sourceId: string },
) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE) {
        return NextResponse.json({ error: 'Answerlattice source governance is not enabled.' }, { status: 404 });
    }

    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    const sourceId = normalizeAnswerlatticeKnowledgeIntakeSourceId(params.sourceId);
    if (!jobId || !sourceId) {
        return NextResponse.json({ error: 'Invalid knowledge source.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:source-governance',
        rateLimit: 30,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, SOURCE_GOVERNANCE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid source governance details.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid source governance details.' },
                { status: bodyResult.response.status },
            );
        }

        const input = AnswerlatticeSourceGovernanceInputSchema.parse(bodyResult.data) as UpdateSourceGovernanceInput;
        const result = await updateKnowledgeSourceGovernance(
            access.context.scope,
            jobId,
            sourceId,
            input,
            access.context.actor,
        );
        secureLog('[Answerlattice Intake] Source governance updated', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId,
            scope: access.context.scope,
            sourceId,
            sourceType: result.source.type,
        }));
        return NextResponse.json(
            {
                source: serializeIntakeValue(result.source),
                governanceUpdates: serializeIntakeValue(result.governanceUpdates),
            },
            { headers: { 'Cache-Control': 'private, no-store' } },
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid source governance details.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure(
                '[Answerlattice Intake] Failed to update source governance',
                'answerlattice_intake_source_governance_update_failed',
                error,
                {
                    jobId,
                    scope: access.context.scope,
                    sourceId,
                },
            );
        }
        return NextResponse.json(
            { error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to update source governance.') },
            { status },
        );
    }
});
