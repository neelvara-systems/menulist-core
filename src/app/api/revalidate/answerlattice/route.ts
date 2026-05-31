export const dynamic = 'force-dynamic';

import {
    type AnswerlatticePublicCacheSegment,
    revalidateAnswerlatticePublicCache,
} from '@lib/actions/revalidateAnswerlatticePublicCache';
import { resolveAnswerlatticePublicContentScope } from '@lib/answerlattice/publicContentScope';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const segmentSchema = z.enum(['all', 'kb', 'faqs', 'changelog', 'context']);
const revalidateRequestSchema = z.object({
    segments: z.array(segmentSchema).min(1).max(5).optional(),
    tId: z.union([z.string(), z.number()]).optional(),
    sId: z.union([z.string(), z.number()]).optional(),
}).optional();

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!canUseAnswerlatticeManagement(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = revalidateRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid Answerlattice cache revalidation request' }, { status: 400 });
    }

    const scope = resolveAnswerlatticePublicContentScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available' }, { status: 400 });
    }

    const requestedTId = parsed.data?.tId !== undefined ? Number(parsed.data.tId) : scope.tId;
    const requestedSId = parsed.data?.sId !== undefined ? Number(parsed.data.sId) : scope.sId;
    if (requestedTId !== scope.tId || requestedSId !== scope.sId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const segments = (parsed.data?.segments?.length ? parsed.data.segments : ['all']) as AnswerlatticePublicCacheSegment[];
        const tags = new Set<string>();

        for (const segment of segments) {
            const segmentTags = await revalidateAnswerlatticePublicCache(scope.tId, scope.sId, segment);
            segmentTags.forEach(tag => tags.add(tag));
        }

        secureLog('[Answerlattice Public Cache] Revalidated public content cache', {
            tenantId: scope.tId,
            storeId: scope.sId,
            segments,
            tagCount: tags.size,
        });

        return NextResponse.json({
            revalidated: true,
            tags: Array.from(tags),
            timestamp: Date.now(),
        });
    } catch (error) {
        secureError('[Answerlattice Public Cache] Revalidation failed', error as Error, {
            tenantId: scope.tId,
            storeId: scope.sId,
        });
        return NextResponse.json({ error: 'Answerlattice public cache revalidation failed' }, { status: 500 });
    }
});
