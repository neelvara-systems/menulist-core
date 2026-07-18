export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    AnswerlatticeAnswerTestReleaseCheckSchema,
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
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { getAnswerlatticeCompiledSourceVersionsAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const RELEASE_CHECK_MAX_BODY_BYTES = 4 * 1024;

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) {
        return NextResponse.json({ error: 'Answer tests are not enabled.' }, { status: 403 });
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    const userId = session.uId || session.user?.id || 'unknown';
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
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many release checks. Please wait before trying again.' },
                { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) return permission.response;
        const access = permission.access;
        if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const bodyResult = await readBoundedJsonBody(request, RELEASE_CHECK_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json({ error: 'Invalid release check request.' }, { status: bodyResult.response.status });
        }
        const parsed = AnswerlatticeAnswerTestReleaseCheckSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid release check request.' }, { status: 400 });
        }
        if (parsed.data.mode === 'full_runtime') {
            const { checkSafeMode } = await import('@lib/ops/safeMode');
            const safeModeResponse = await checkSafeMode();
            if (safeModeResponse) return safeModeResponse;
        }

        const scope = { tId: access.scope.tenantId, sId: access.scope.storeId };
        const includeLaunchProof = request.nextUrl.searchParams.get('includeLaunchProof') === '1';
        const [summary, release] = await Promise.all([
            loadAnswerlatticeAnswerTestSummary(scope),
            getAnswerlatticeAnswerTestRelease(scope, parsed.data.releaseId),
        ]);
        if (!release) return NextResponse.json({ error: 'Release not found.' }, { status: 404 });

        const priorRun = summary.runs.find(run => run.id === parsed.data.requestId);
        if (priorRun) {
            const launchProof = includeLaunchProof
                ? buildAnswerlatticeActivationAnswerTestSummary(
                    summary,
                    scope.tId,
                    scope.sId,
                    await getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId),
                )
                : undefined;
            return NextResponse.json({
                run: priorRun,
                summary,
                ...(launchProof ? { launchProof } : {}),
                idempotent: true,
            }, {
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }

        const selectedCases = selectAnswerlatticeReleaseTestCases(summary.cases, release);
        if (selectedCases.length === 0) {
            return NextResponse.json(
                { error: 'No active answer tests are linked to entities changed by this release.' },
                { status: 400 },
            );
        }
        if (selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            return NextResponse.json(
                { error: `This release affects ${selectedCases.length} tests. Keep each release check to ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} or fewer linked tests.` },
                { status: 409 },
            );
        }
        if (
            parsed.data.mode === 'full_runtime'
            && selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES
        ) {
            return NextResponse.json(
                { error: `This release affects more than ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} full-runtime tests. Run a smaller selection from Answer Tests.` },
                { status: 400 },
            );
        }

        const reservation = await reserveAnswerlatticeAnswerTestRun(
            scope,
            parsed.data.requestId,
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
                run: reservation.completedRun,
                summary: reservation.summary,
                ...(launchProof ? { launchProof } : {}),
                idempotent: true,
            }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
        reservedRunId = parsed.data.requestId;

        const run = await runAnswerlatticeAnswerTests({
            actor: access.user,
            cases: selectedCases,
            mode: parsed.data.mode,
            release,
            runId: parsed.data.requestId,
            scope,
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
            run,
            summary: nextSummary,
            ...(launchProof ? { launchProof } : {}),
        }, {
            headers: { 'Cache-Control': 'private, no-store' },
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
                        'Cache-Control': 'private, no-store',
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
            }, { status: 402 });
        }
        logRuntimeFailure('answerlattice_release_answer_check_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not complete the release answer check.' }, { status: 500 });
    }
});
