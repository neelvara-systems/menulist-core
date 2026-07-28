export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    AnswerlatticeAnswerTestReleaseCheckSchema,
    projectAnswerlatticeAnswerTestRunForClient,
    projectAnswerlatticeAnswerTestSummaryForClient,
} from '@lib/answerlattice/answerTestContracts';
import {
    AnswerlatticeAnswerTestCapacityError,
    AnswerlatticeAnswerTestRunConflictError,
    getAnswerlatticeAnswerTestRelease,
    loadAnswerlatticeAnswerTestSummary,
    releaseAnswerlatticeAnswerTestRun,
    reserveAnswerlatticeAnswerTestRun,
    runAnswerlatticeAnswerTests,
    saveAnswerlatticeAnswerTestRun,
    selectAnswerlatticeReleaseTestCases,
} from '@lib/answerlattice/answerTestServer';
import { getAnswerlatticeAnswerTestRunRequestFingerprint } from '@lib/answerlattice/answerTestRunIdentity';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { getAnswerlatticeCompiledSourceVersionsAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const RELEASE_CHECK_MAX_BODY_BYTES = 4 * 1024;
const PRIVATE_NO_STORE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', PRIVATE_NO_STORE_HEADERS['Cache-Control']);
    response.headers.set('X-Content-Type-Options', PRIVATE_NO_STORE_HEADERS['X-Content-Type-Options']);
    return response;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) {
        return NextResponse.json(
            { error: 'Answer tests are not enabled.' },
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
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS });
    }
    let reservedRunId: string | null = null;
    let executionCompleted = false;

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-release-answer-check',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            limit: 5,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Release checks are temporarily unavailable. Please try again shortly.'
                        : 'Too many release checks. Please wait before trying again.',
                },
                { status: providerUnavailable ? 503 : 429, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) return withPrivateHeaders(permission.response);
        const access = permission.access;
        if (!access) return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );

        const bodyResult = await readBoundedJsonBody(request, RELEASE_CHECK_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid release check request.' },
                { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeAnswerTestReleaseCheckSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid release check request.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (parsed.data.mode === 'full_runtime') {
            const { checkSafeMode } = await import('@lib/ops/safeMode');
            const safeModeResponse = await checkSafeMode();
            if (safeModeResponse) return withPrivateHeaders(safeModeResponse);
        }

        const scope = { tId: access.scope.tenantId, sId: access.scope.storeId };
        const includeLaunchProof = request.nextUrl.searchParams.get('includeLaunchProof') === '1';
        const [summary, release] = await Promise.all([
            loadAnswerlatticeAnswerTestSummary(scope),
            getAnswerlatticeAnswerTestRelease(scope, parsed.data.releaseId),
        ]);
        if (!release) return NextResponse.json(
            { error: 'Release not found.' },
            { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
        );

        const selectedCases = selectAnswerlatticeReleaseTestCases(summary.cases, release);
        if (selectedCases.length === 0) {
            return NextResponse.json(
                { error: 'No active answer tests are linked to entities changed by this release.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            return NextResponse.json(
                { error: `This release affects ${selectedCases.length} tests. Keep each release check to ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} or fewer linked tests.` },
                { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (
            parsed.data.mode === 'full_runtime'
            && selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES
        ) {
            return NextResponse.json(
                { error: `This release affects more than ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} full-runtime tests. Run a smaller selection from Answer Tests.` },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const requestFingerprint = getAnswerlatticeAnswerTestRunRequestFingerprint({
            kind: 'release_check',
            mode: parsed.data.mode,
            suiteRevision: summary.revision,
            caseIds: selectedCases.map(testCase => testCase.id),
            releaseId: release.id,
        });

        const reservation = await reserveAnswerlatticeAnswerTestRun(
            scope,
            parsed.data.requestId,
            requestFingerprint,
            summary.revision,
            String(access.user.email || access.user.name || access.user.id || 'unknown'),
        );
        if (reservation.completedRun) {
            const launchProof = includeLaunchProof
                ? buildAnswerlatticeActivationAnswerTestSummary(
                    reservation.summary,
                    scope.tId,
                    scope.sId,
                    await getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId),
                )
                : undefined;
            return NextResponse.json({
                run: projectAnswerlatticeAnswerTestRunForClient(reservation.completedRun),
                summary: projectAnswerlatticeAnswerTestSummaryForClient(reservation.summary),
                ...(launchProof ? { launchProof } : {}),
                idempotent: true,
            }, { headers: PRIVATE_NO_STORE_HEADERS });
        }
        reservedRunId = parsed.data.requestId;

        const run = await runAnswerlatticeAnswerTests({
            actor: access.user,
            cases: selectedCases,
            mode: parsed.data.mode,
            requestFingerprint,
            release,
            runId: parsed.data.requestId,
            scope,
            suiteRevision: summary.revision,
        });
        executionCompleted = true;
        const nextSummary = await saveAnswerlatticeAnswerTestRun(scope, run);
        const launchProof = includeLaunchProof
            ? buildAnswerlatticeActivationAnswerTestSummary(
                nextSummary,
                scope.tId,
                scope.sId,
                await getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId),
            )
            : undefined;
        reservedRunId = null;
        return NextResponse.json({
            run: projectAnswerlatticeAnswerTestRunForClient(run),
            summary: projectAnswerlatticeAnswerTestSummaryForClient(nextSummary),
            ...(launchProof ? { launchProof } : {}),
        }, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        if (reservedRunId && !executionCompleted) {
            try {
                await releaseAnswerlatticeAnswerTestRun(
                    { tId: sessionScope.tenantId, sId: sessionScope.storeId },
                    reservedRunId,
                );
            } catch (recoveryError) {
                logRuntimeFailure('answerlattice_release_answer_check_reservation_release_failed', recoveryError, {
                    ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
                    ...getBoundedRuntimeStringContext('runId', reservedRunId),
                });
            }
        }
        if (error instanceof AnswerlatticeAnswerTestRunConflictError) {
            return NextResponse.json(
                { error: error.message, code: error.reason, retryAfter: error.retryAfter },
                {
                    status: 409,
                    headers: {
                        ...PRIVATE_NO_STORE_HEADERS,
                        'Retry-After': String(error.retryAfter),
                    },
                },
            );
        }
        if (error instanceof AnswerlatticeAnswerTestCapacityError) {
            return NextResponse.json({
                error: error.message,
                remainingCredits: error.remaining,
                requiredCredits: error.required,
            }, { status: 402, headers: PRIVATE_NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_release_answer_check_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not complete the release answer check.' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
});
