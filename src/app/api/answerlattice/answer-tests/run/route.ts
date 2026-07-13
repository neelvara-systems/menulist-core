export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    AnswerlatticeAnswerTestRunRequestSchema,
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
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const ANSWER_TEST_RUN_MAX_BODY_BYTES = 8 * 1024;

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

        const bodyResult = await readBoundedJsonBody(request, ANSWER_TEST_RUN_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid answer test request.',
            tooLargeMessage: 'Answer test request is too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json({ error: 'Invalid answer test request.' }, { status: bodyResult.response.status });
        }
        const parsed = AnswerlatticeAnswerTestRunRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid answer test request.' }, { status: 400 });
        }
        if (parsed.data.mode === 'full_runtime') {
            const { checkSafeMode } = await import('@lib/ops/safeMode');
            const safeModeResponse = await checkSafeMode();
            if (safeModeResponse) return safeModeResponse;
        }

        const scope = { tId: access.scope.tenantId, sId: access.scope.storeId };
        const summary = await loadAnswerlatticeAnswerTestSummary(scope);
        const priorRun = summary.runs.find(run => run.id === parsed.data.requestId);
        if (priorRun) {
            return NextResponse.json({ run: priorRun, summary, idempotent: true }, {
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }

        const selectedIds = new Set(parsed.data.caseIds || []);
        const selectedCases = summary.cases
            .filter(testCase => testCase.active && (selectedIds.size === 0 || selectedIds.has(testCase.id)));
        if (selectedCases.length === 0) {
            return NextResponse.json({ error: 'Select at least one active answer test.' }, { status: 400 });
        }
        if (selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            return NextResponse.json(
                { error: `Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests for one run.` },
                { status: 400 },
            );
        }
        if (
            parsed.data.mode === 'full_runtime'
            && selectedCases.length > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES
        ) {
            return NextResponse.json(
                { error: `Full-runtime runs are limited to ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} tests at a time.` },
                { status: 400 },
            );
        }

        const reservation = await reserveAnswerlatticeAnswerTestRun(
            scope,
            parsed.data.requestId,
            String(access.user.email || access.user.name || access.user.id || 'unknown'),
        );
        if (reservation.completedRun) {
            return NextResponse.json({
                run: reservation.completedRun,
                summary: reservation.summary,
                idempotent: true,
            }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
        reservedRunId = parsed.data.requestId;

        const run = await runAnswerlatticeAnswerTests({
            actor: access.user,
            cases: selectedCases,
            mode: parsed.data.mode,
            runId: parsed.data.requestId,
            scope,
        });
        executionCompleted = true;
        const nextSummary = await saveAnswerlatticeAnswerTestRun(scope, run);
        reservedRunId = null;
        return NextResponse.json({ run, summary: nextSummary }, {
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
        logRuntimeFailure('answerlattice_answer_test_run_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json({ error: 'Could not complete the answer test run.' }, { status: 500 });
    }
});
