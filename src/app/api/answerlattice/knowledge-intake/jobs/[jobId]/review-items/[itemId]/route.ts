export const dynamic = 'force-dynamic';

import {
    serializeIntakeValue,
    updateKnowledgeIntakeReviewItem,
} from '@lib/answerlattice/knowledgeIntake';
import {
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { secureError } from '@lib/security/secureLogger';
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

export const PATCH = withAuth(async (request: NextRequest, session, params: { jobId: string; itemId: string }) => {
    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:update-review-item',
        rateLimit: 80,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = ReviewItemPatchSchema.parse(body);
        const item = await updateKnowledgeIntakeReviewItem(access.context.scope, params.jobId, params.itemId, parsed as any, access.context.actor);
        return NextResponse.json({ item: serializeIntakeValue(item) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid review item update.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Answerlattice Intake] Failed to update review item', error as Error, {
                ...access.context.scope,
                jobId: params.jobId,
                itemId: params.itemId,
            });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update review item.' }, { status });
    }
});
