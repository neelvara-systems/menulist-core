export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { getAiMenuManagerInbox } from '@database/aiMenuManager/server';
import {
    applyAiMenuManagerRateLimit,
    buildAiMenuManagerInvalidRequestResponse,
    resolveAiMenuManagerSelectedStoreScope,
} from '@lib/ai-menu-manager/apiGuards';
import { buildDailySessionId, todaySessionDate } from '@lib/ai-menu-manager/idempotency';
import { serializeAiMenuManagerInboxForJson } from '@lib/ai-menu-manager/inboxJsonBoundary';
import { AiMenuManagerInboxRequestSchema } from '@lib/ai-menu-manager/schemas';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const rateLimit = await applyAiMenuManagerRateLimit({
        request,
        session,
        feature: 'DATA_READ',
        keyPrefix: 'ai-menu-manager-inbox',
    });
    if (rateLimit) return rateLimit;

    const parsed = AiMenuManagerInboxRequestSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
        return buildAiMenuManagerInvalidRequestResponse(request, session, 'inbox');
    }

    const scope = resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId);
    if ('error' in scope && scope.error) return scope.error;

    const permissionError = await requireAnyStorePermissionForStore(
        request,
        session,
        [PERMISSIONS.MANAGE_MENU],
        'AI Menu Manager inbox',
        scope.sId,
        scope.tId,
    );
    if (permissionError) return permissionError;

    const sessionId = parsed.data.sessionId || buildDailySessionId({
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        sessionDate: parsed.data.sessionDate || todaySessionDate(),
    });
    const inbox = await getAiMenuManagerInbox({
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
    });

    return NextResponse.json(serializeAiMenuManagerInboxForJson({
        ...inbox,
        sessionId,
    }));
});
