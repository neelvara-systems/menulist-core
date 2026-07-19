export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { getAnswerlatticeOwnerAssistantBrief } from '@lib/answerlattice/ownerSupportAssistant';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../readRateLimit';

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) {
        return NextResponse.json(
            { error: 'Support Assistant is not enabled.' },
            { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'support-assistant-brief');
    if (rateLimitResponse) return rateLimitResponse;
    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    );
    if (permission.response) return permission.response;
    const access = permission.access;
    if (!access) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }

    try {
        const brief = await getAnswerlatticeOwnerAssistantBrief(
            access.scope.tenantId,
            access.scope.storeId,
            access.permissions,
        );
        return NextResponse.json({ brief }, { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });
    } catch (error) {
        logRuntimeFailure('answerlattice_owner_support_assistant_brief_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not load the support brief.' },
            { status: 500, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
});
