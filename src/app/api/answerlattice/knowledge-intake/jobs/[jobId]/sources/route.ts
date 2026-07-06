export const dynamic = 'force-dynamic';

import {
    addKnowledgeSource,
    serializeIntakeValue,
} from '@lib/answerlattice/knowledgeIntake';
import { normalizeAnswerlatticeKnowledgeIntakeJobId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
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

const SourceSchema = z.object({
    type: z.string().trim().max(80).optional(),
    title: z.string().trim().max(180).optional(),
    originUrl: z.string().trim().max(500).optional(),
    fileName: z.string().trim().max(180).optional(),
    mimeType: z.string().trim().max(120).optional(),
    contentText: z.string().max(50_000).optional(),
    tags: z.array(z.string().trim().max(80)).max(20).optional(),
    contextKeys: z.array(z.string().trim().max(100)).max(20).optional(),
    entityIds: z.array(z.string().trim().max(160)).max(25).optional(),
    metadata: z.record(z.any()).optional(),
});
const KNOWLEDGE_INTAKE_SOURCE_MAX_BODY_BYTES = 128 * 1024;

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return NextResponse.json({ error: 'Invalid knowledge intake job.' }, { status: 400 });
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:add-source',
        rateLimit: 40,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, KNOWLEDGE_INTAKE_SOURCE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid source details.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid source details.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = SourceSchema.parse(bodyResult.data);
        const source = await addKnowledgeSource(access.context.scope, jobId, parsed, access.context.actor);
        secureLog('[Answerlattice Intake] Source added', getAnswerlatticeKnowledgeIntakeLogContext({
            jobId,
            scope: access.context.scope,
            sourceId: source.id,
            sourceType: source.type,
        }));
        return NextResponse.json({ source: serializeIntakeValue(source) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid source details.' }, { status: 400 });
        }
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure('[Answerlattice Intake] Failed to add source', 'answerlattice_intake_source_add_failed', error, {
                jobId: params.jobId,
                scope: access.context.scope,
            });
        }
        return NextResponse.json({ error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Failed to add source.') }, { status });
    }
});
