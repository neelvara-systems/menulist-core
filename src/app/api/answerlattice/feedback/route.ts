export const dynamic = 'force-dynamic';

import { buildAnswerlatticeActorSnapshot } from '@lib/answerlattice/customerIdentity';
import { resolveExactSessionStoreRole } from '@lib/auth/sessionPlatformRole';
import { parseAnswerlatticeFeedbackSubmitRequest } from '@lib/answerlattice/feedbackBoundary';
import {
    AnswerlatticeFeedbackSubmissionError,
    executeAnswerlatticeFeedbackSubmission,
} from '@lib/answerlattice/feedbackSubmissionServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const FEEDBACK_MAX_BODY_BYTES = 16 * 1024;
const FEEDBACK_RATE_LIMIT = { limit: 12, window: 60 * 60 };
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: NO_STORE_HEADERS });
    const actor = buildAnswerlatticeActorSnapshot(session);

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-feedback', actor.uId, scope.tenantId, scope.storeId),
            ...FEEDBACK_RATE_LIMIT,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1);
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Feedback is temporarily unavailable. Please try again later.'
                        : 'Too many feedback submissions. Please wait before trying again.',
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: { ...NO_STORE_HEADERS, 'Retry-After': String(retryAfter) },
                },
            );
        }

        const body = await readBoundedJsonBody(request, FEEDBACK_MAX_BODY_BYTES);
        if (body.ok === false) {
            return NextResponse.json(
                { error: 'Invalid feedback request.' },
                { status: body.response.status, headers: NO_STORE_HEADERS },
            );
        }
        const input = parseAnswerlatticeFeedbackSubmitRequest(body.data);
        if (!input) {
            return NextResponse.json({ error: 'Invalid feedback request.' }, { status: 400, headers: NO_STORE_HEADERS });
        }

        const result = await executeAnswerlatticeFeedbackSubmission(
            input,
            { tId: scope.tenantId, sId: scope.storeId },
            {
                id: actor.uId,
                name: actor.userName,
                role: resolveExactSessionStoreRole(session) || 'CUSTOMER',
                sourceContext: actor.userEmail ? actor.sourceContext : null,
            },
        );
        const {
            createdOn,
            modifiedOn,
            submissionFingerprint: _submissionFingerprint,
            ...feedback
        } = result.record;
        return NextResponse.json({
            success: true,
            id: result.id,
            created: result.created,
            replayed: result.replayed,
            feedback: {
                ...feedback,
                createdOnMillis: createdOn.toMillis(),
                modifiedOnMillis: modifiedOn.toMillis(),
            },
        }, { headers: NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeFeedbackSubmissionError) {
            return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_feedback_submission_failed', error, {
            endpoint: '/api/answerlattice/feedback',
            hasTenantScope: true,
            hasStoreScope: true,
            hasUserId: Boolean(actor.uId && actor.uId !== 'unknown'),
        });
        return NextResponse.json(
            { error: 'Feedback could not be saved.' },
            { status: 500, headers: NO_STORE_HEADERS },
        );
    }
});
