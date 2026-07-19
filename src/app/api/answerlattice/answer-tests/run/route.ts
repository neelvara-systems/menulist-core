export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    AnswerlatticeAnswerTestRunRequestSchema,
    projectAnswerlatticeAnswerTestRunForClient,
    projectAnswerlatticeAnswerTestSummaryForClient,
} from '@lib/answerlattice/answerTestContracts';
import {
    AnswerlatticeAnswerTestCapacityError,
    AnswerlatticeAnswerTestRunConflictError,
    loadAnswerlatticeAnswerTestSummary,
    releaseAnswerlatticeAnswerTestRun,
    reserveAnswerlatticeAnswerTestRun,
    runAnswerlatticeAnswerTests,
    saveAnswerlatticeAnswerTestRun,
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

const ANSWER_TEST_RUN_MAX_BODY_BYTES = 8 * 1024;
const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

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
    const userId = session.uId || session.user?.id || 'unknown';
    let reservedRunId: string | null = null;
    let executionCompleted = false;

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-answer-test-run',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            limit: 5,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many test runs. Please wait before trying again.' },
                { status: 429, headers: PRIVATE_NO_STORE_HEADERS },
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

        const bodyResult = await readBoundedJsonBody(request, ANSWER_TEST_RUN_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid answer test request.',
            tooLargeMessage: 'Answer test request is too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid answer test request.' },
                { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeAnswerTestRunRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid answer test request.' },
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
        const summary = await loadAnswerlatticeAnswerTestSummary(scope);
        const selectedIds = new Set(parsed.data.caseIds || []);
        const selectedCases = summary.cases
            .filter(testCase => testCase.active && (selectedIds.size === 0 || selectedIds.has(testCase.id)));
        if (selectedCases.length === 0) {
            return NextResponse.json(
                { error: 'Select at least one active answer test.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (selectedIds.size > 0 && selectedCases.length !== selectedIds.size) {
            return NextResponse.json(
                { error: 'One or more selected tests changed or are no longer active. Reload before running them.' },
                { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            return NextResponse.json(
                { error: `Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests for one run.` },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        if (
            parsed.data.mode === 'full_runtime'
            && selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES
        ) {
            return NextResponse.json(
                { error: `Full-runtime runs are limited to ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} tests at a time.` },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const requestFingerprint = getAnswerlatticeAnswerTestRunRequestFingerprint({
            kind: 'answer_test',
            mode: parsed.data.mode,
            suiteRevision: summary.revision,
            caseIds: selectedCases.map(testCase => testCase.id),
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
                logRuntimeFailure('answerlattice_answer_test_reservation_release_failed', recoveryError, {
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
        logRuntimeFailure('answerlattice_answer_test_run_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not complete the answer test run.' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
});
