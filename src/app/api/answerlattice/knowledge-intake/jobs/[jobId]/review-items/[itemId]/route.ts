export const dynamic = 'force-dynamic';

import {
    serializeIntakeValue,
    updateKnowledgeIntakeReviewItem,
} from '@lib/answerlattice/knowledgeIntake';
import {
    normalizeAnswerlatticeKnowledgeIntakeJobId,
    normalizeAnswerlatticeKnowledgeIntakeReviewItemId,
} from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { logAnswerlatticeKnowledgeIntakeFailure } from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';

const ReviewItemPatchSchema = z.object({
    status: z.string().trim().max(80).optional(),
    target: z.string().trim().max(80).optional(),
    title: z.string().trim().max(180).optional(),
    body: z.string().max(12_500).optional(),
    question: z.string().trim().max(260).optional(),
    answer: z.string().max(2200).optional(),
    routePath: z.string().trim().max(240).nullable().optional(),
    versionLabel: z.string().trim().max(40).nullable().optional(),
    tags: z.array(z.string().trim().max(80)).max(20).optional(),
    contextKeys: z.array(z.string().trim().max(100)).max(20).optional(),
    entityIds: z.array(z.string().trim().max(160)).max(25).optional(),
});
const KNOWLEDGE_INTAKE_REVIEW_ITEM_MAX_BODY_BYTES = 32 * 1024;

export const PATCH = withAuth(async (request: NextRequest, session, params: { jobId: string; itemId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    const itemId = normalizeAnswerlatticeKnowledgeIntakeReviewItemId(params.itemId);
    if (!jobId || !itemId) {
        return NextResponse.json({ error: 'Invalid review item.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:update-review-item',
        rateLimit: 80,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_REVIEW_ITEM_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid review item update.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid review item update.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = ReviewItemPatchSchema.parse(bodyResult.data);
        const item = await updateKnowledgeIntakeReviewItem(access.context.scope, jobId, itemId, parsed as any, access.context.actor);
        return NextResponse.json({ item: serializeIntakeValue(item) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid review item update.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to update review item', 'answerlattice_intake_review_item_update_failed', error, {
                itemId: params.itemId,
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to update review item.') }, { status });
    }
});
