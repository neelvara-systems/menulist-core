export const dynamic = 'force-dynamic';

import { parseAnswerlatticeContentFeedbackRequest } from '@lib/answerlattice/contentFeedbackContracts';
import { ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS } from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeContentFeedbackError,
    executeAnswerlatticeContentFeedback,
} from '@lib/answerlattice/contentFeedbackServer';
import { buildAnswerlatticeActorSnapshot } from '@lib/answerlattice/customerIdentity';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const CONTENT_FEEDBACK_MAX_BODY_BYTES = 16 * 1024;
const CONTENT_FEEDBACK_RATE_LIMIT = { limit: 30, window: 60 };

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });
    const actor = buildAnswerlatticeActorSnapshot(session);

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-content-feedback', actor.uId, scope.tenantId, scope.storeId),
            ...CONTENT_FEEDBACK_RATE_LIMIT,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Content feedback is temporarily unavailable. Please try again later.'
                        : 'Too many feedback changes. Please wait before trying again.',
                },
                { status: providerUnavailable ? 503 : 429, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }
        const body = await readBoundedJsonBody(request, CONTENT_FEEDBACK_MAX_BODY_BYTES);
        if (body.ok === false) {
            return NextResponse.json(
                { error: 'Invalid content feedback request.' },
                { status: body.response.status, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
            );
        }
        const input = parseAnswerlatticeContentFeedbackRequest(body.data);
        if (!input) return NextResponse.json({ error: 'Invalid content feedback request.' }, { status: 400, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });

        const result = await executeAnswerlatticeContentFeedback(
            input,
            { tId: scope.tenantId, sId: scope.storeId },
            {
                id: actor.uId,
                name: actor.userName,
                email: actor.userEmail || '',
                ...(actor.userPhone ? { phone: actor.userPhone } : {}),
                sourceContext: actor.sourceContext,
            },
        );
        return NextResponse.json(result, { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeContentFeedbackError) {
            return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS });
        }
        logRuntimeFailure('answerlattice_content_feedback_failed', error, {
            endpoint: '/api/answerlattice/content-feedback',
            hasTenantScope: true,
            hasStoreScope: true,
            hasUserId: Boolean(actor.uId),
        });
        return NextResponse.json(
            { error: 'Content feedback could not be saved.' },
            { status: 500, headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS },
        );
    }
});
