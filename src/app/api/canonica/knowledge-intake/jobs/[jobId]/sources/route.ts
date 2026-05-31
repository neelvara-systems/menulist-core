export const dynamic = 'force-dynamic';

import {
    addKnowledgeSource,
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

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const access = await requireCanonicaKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'canonica-intake:add-source',
        rateLimit: 40,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return access.response;

    try {
        const body = await request.json().catch(() => ({}));
        const parsed = SourceSchema.parse(body);
        const source = await addKnowledgeSource(access.context.scope, params.jobId, parsed, access.context.actor);
        secureLog('[Canonica Intake] Source added', {
            jobId: params.jobId,
            sourceId: source.id,
            sourceType: source.type,
            tId: access.context.scope.tId,
            sId: access.context.scope.sId,
        });
        return NextResponse.json({ source: serializeIntakeValue(source) });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid source details.' }, { status: 400 });
        }
        const status = getCanonicaKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            secureError('[Canonica Intake] Failed to add source', error as Error, {
                ...access.context.scope,
                jobId: params.jobId,
            });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to add source.' }, { status });
    }
});
