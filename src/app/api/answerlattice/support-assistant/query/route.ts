export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeOwnerAssistantQuerySchema,
    answerAnswerlatticeOwnerQuestion,
} from '@lib/answerlattice/ownerSupportAssistant';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const SUPPORT_ASSISTANT_QUERY_MAX_BODY_BYTES = 4 * 1024;
export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) {
        return NextResponse.json(
            { error: 'Support Assistant is not enabled.' },
            { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }

    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }

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
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Support assistant is temporarily unavailable. Please try again later.'
                        : 'Too many questions. Please wait before trying again.',
                },
                { status: providerUnavailable ? 503 : 429, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
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
                { status: 403, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }

        const bodyResult = await readBoundedJsonBody(request, SUPPORT_ASSISTANT_QUERY_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid support question.' },
                { status: bodyResult.response.status, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }
        const parsed = AnswerlatticeOwnerAssistantQuerySchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Enter a support operations question.' },
                { status: 400, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }

        const answer = await answerAnswerlatticeOwnerQuestion(
            access.scope.tenantId,
            access.scope.storeId,
            parsed.data.question,
            access.permissions,
        );
        return NextResponse.json({ answer }, { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });
    } catch (error) {
        logRuntimeFailure('answerlattice_owner_support_assistant_query_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not answer that support question.' },
            { status: 500, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
});
