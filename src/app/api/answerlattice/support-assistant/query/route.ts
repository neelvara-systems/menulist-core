export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeOwnerAssistantQuerySchema,
    answerAnswerlatticeOwnerQuestion,
} from '@lib/answerlattice/ownerSupportAssistant';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const SUPPORT_ASSISTANT_QUERY_MAX_BODY_BYTES = 4 * 1024;
const PRIVATE_NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) {
        return NextResponse.json(
            { error: 'Support Assistant is not enabled.' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }

    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
    const userId = session.uId || session.user?.id || 'unknown';

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-owner-support-assistant',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            limit: 20,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many questions. Please wait before trying again.' },
                { status: 429, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

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
                { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const bodyResult = await readBoundedJsonBody(request, SUPPORT_ASSISTANT_QUERY_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid support question.' },
                { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeOwnerAssistantQuerySchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Enter a support operations question.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const answer = await answerAnswerlatticeOwnerQuestion(
            access.scope.tenantId,
            access.scope.storeId,
            parsed.data.question,
        );
        return NextResponse.json({ answer }, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error) {
        logRuntimeFailure('answerlattice_owner_support_assistant_query_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not answer that support question.' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
});
