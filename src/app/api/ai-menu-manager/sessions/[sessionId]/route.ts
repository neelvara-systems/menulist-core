export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { getAiMenuManagerInbox } from '@database/aiMenuManager/server';
import {
    applyAiMenuManagerRateLimit,
    buildAiMenuManagerInvalidRequestResponse,
    resolveAiMenuManagerSelectedStoreScope,
} from '@lib/ai-menu-manager/apiGuards';
import {
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerSessionId,
} from '@lib/ai-menu-manager/routeIds';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

function serializeForJson(value: any): any {
    if (value == null) return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    if (Array.isArray(value)) return value.map(serializeForJson);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeForJson(entry)]));
    }
    return value;
}

export const GET = withAuth(async (
    request: NextRequest,
    session,
    params?: { sessionId?: string },
) => {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const sessionId = normalizeAiMenuManagerSessionId(params?.sessionId);
    if (!sessionId) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    const rateLimit = await applyAiMenuManagerRateLimit({
        request,
        session,
        feature: 'DATA_READ',
        keyPrefix: 'ai-menu-manager-session',
    });
    if (rateLimit) return rateLimit;

    const storeId = request.nextUrl.searchParams.get('storeId');
    const projectId = normalizeAiMenuManagerProjectId(request.nextUrl.searchParams.get('projectId'));
    if (!projectId) {
        return buildAiMenuManagerInvalidRequestResponse(request, session, 'session');
    }

    const scope = resolveAiMenuManagerSelectedStoreScope(request, session, storeId);
    if ('error' in scope && scope.error) return scope.error;

    const permissionError = await requireAnyStorePermissionForStore(
        request,
        session,
        [PERMISSIONS.MANAGE_MENU],
        'AI Menu Manager session',
        scope.sId,
        scope.tId,
    );
    if (permissionError) return permissionError;

    const inbox = await getAiMenuManagerInbox({
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId,
    });

    return NextResponse.json(serializeForJson({
        sessionId,
        ...inbox,
    }));
});
