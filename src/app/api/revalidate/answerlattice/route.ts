export const dynamic = 'force-dynamic';

import {
    type AnswerlatticePublicCacheSegment,
    revalidateAnswerlatticePublicCache,
} from '@lib/actions/revalidateAnswerlatticePublicCache';
import {
    getAnswerlatticeScopeLogContext,
    logAnswerlatticeDiagnostic,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import {
    canUseAnswerlatticeManagement,
    normalizeAnswerlatticeScopeDocumentId,
} from '@lib/answerlattice/sessionScope';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const segmentSchema = z.enum(['all', 'kb', 'faqs', 'changelog', 'context', 'predictive']);
const revalidateRequestSchema = z.object({
    segments: z.array(segmentSchema).min(1).max(5).optional(),
    tId: z.union([z.string(), z.number()]).optional(),
    sId: z.union([z.string(), z.number()]).optional(),
}).optional();
const ANSWERLATTICE_REVALIDATE_MAX_BODY_BYTES = 4 * 1024;
const ANSWERLATTICE_REVALIDATE_RATE_LIMIT_KEY = 'answerlattice-cache-revalidate';

function getAnswerlatticeRevalidationLogContext(
    scope: { tId?: unknown; sId?: unknown } | null,
    segmentCount: number,
    tagCount?: number,
) {
    return {
        ...getAnswerlatticeScopeLogContext({
            tId: scope?.tId,
            sId: scope?.sId,
        }),
        segmentCount,
        tagCount,
    };
}

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!canUseAnswerlatticeManagement(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const rateLimit = await checkRateLimit({
        key: `${ANSWERLATTICE_REVALIDATE_RATE_LIMIT_KEY}:${hashPublicRateLimitValue(actorId)}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                error: rateLimit.reason === 'provider_unavailable'
                    ? 'Answerlattice cache revalidation is temporarily unavailable'
                    : 'Too many requests',
            },
            { status: rateLimit.reason === 'provider_unavailable' ? 503 : 429 },
        );
    }

    const bodyResult = await readOptionalBoundedJsonBody(request, ANSWERLATTICE_REVALIDATE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid Answerlattice cache revalidation request',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === false) {
        return NextResponse.json(
            { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid Answerlattice cache revalidation request' },
            { status: bodyResult.response.status },
        );
    }

    const parsed = revalidateRequestSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid Answerlattice cache revalidation request' }, { status: 400 });
    }

    const scope = resolveAnswerlatticePublicContentScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available' }, { status: 400 });
    }

    const requestedTId = parsed.data?.tId !== undefined
        ? normalizeAnswerlatticeScopeDocumentId(parsed.data.tId)
        : scope.tId;
    const requestedSId = parsed.data?.sId !== undefined
        ? normalizeAnswerlatticeScopeDocumentId(parsed.data.sId)
        : scope.sId;
    if (!requestedTId || !requestedSId) {
        return NextResponse.json({ error: 'Invalid Answerlattice cache revalidation request' }, { status: 400 });
    }
    if (requestedTId !== scope.tId || requestedSId !== scope.sId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let segmentCount = 0;
    let tagCount = 0;

    try {
        const segments = (parsed.data?.segments?.length ? parsed.data.segments : ['all']) as AnswerlatticePublicCacheSegment[];
        segmentCount = segments.length;
        const tags = new Set<string>();

        for (const segment of segments) {
            const segmentTags = await revalidateAnswerlatticePublicCache(scope.tId, scope.sId, segment);
            segmentTags.forEach(tag => tags.add(tag));
        }
        tagCount = tags.size;

        logAnswerlatticeDiagnostic(
            'answerlattice_public_cache_revalidated',
            getAnswerlatticeRevalidationLogContext(scope, segmentCount, tagCount),
        );

        return NextResponse.json({
            revalidated: true,
            tags: Array.from(tags),
            timestamp: Date.now(),
        });
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_public_cache_revalidation_failed',
            error,
            getAnswerlatticeRevalidationLogContext(scope, segmentCount, tagCount),
        );
        return NextResponse.json({ error: 'Answerlattice public cache revalidation failed' }, { status: 500 });
    }
});
