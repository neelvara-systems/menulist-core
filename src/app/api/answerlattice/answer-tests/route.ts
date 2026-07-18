export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeActivationAnswerTestSummary } from '@lib/answerlattice/activationAnswerTestSummary';
import {
    AnswerlatticeAnswerTestSaveSchema,
    ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    getAnswerlatticeAnswerTestSummaryId,
    prepareAnswerlatticeAnswerTestCasesForWrite,
} from '@lib/answerlattice/answerTestContracts';
import {
    AnswerlatticeAnswerTestSummaryTooLargeError,
    compactAnswerlatticeAnswerTestSummaryForWrite,
    loadAnswerlatticeAnswerTestSummary,
    normalizeAnswerlatticeAnswerTestSummary,
} from '@lib/answerlattice/answerTestServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { getAnswerlatticeCompiledSourceVersionsAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const ANSWER_TEST_SAVE_MAX_BODY_BYTES = 256 * 1024;

const featureUnavailable = () => NextResponse.json(
    { error: 'Answer tests are not enabled.' },
    { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
);

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return featureUnavailable();
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'answer-tests');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    );
    if (permission.response) return permission.response;
    const access = permission.access;
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const scope = {
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
        };
        const includeLaunchProof = request.nextUrl.searchParams.get('includeLaunchProof') === '1';
        const [summary, sourceVersions] = await Promise.all([
            loadAnswerlatticeAnswerTestSummary(scope),
            includeLaunchProof
                ? getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId)
                : Promise.resolve(null),
        ]);
        if (!sourceVersions) {
            return NextResponse.json({ summary }, {
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }
        const launchProof = buildAnswerlatticeActivationAnswerTestSummary(
            summary,
            scope.tId,
            scope.sId,
            sourceVersions,
        );
        return NextResponse.json({ summary, launchProof }, {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_answer_tests_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
        });
        return NextResponse.json({ error: 'Could not load answer tests.' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return featureUnavailable();
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    const userId = session.uId || session.user?.id || 'unknown';
    try {
        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-answer-tests-save',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            ...rateLimitConfig,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many changes. Please try again shortly.' },
                { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
            );
        }
    } catch (error) {
        logRuntimeFailure('answerlattice_answer_tests_rate_limit_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not save answer tests.' },
            { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
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

    try {
        const bodyResult = await readBoundedJsonBody(request, ANSWER_TEST_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid answer test data.',
            tooLargeMessage: 'Answer test data is too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Answer test data is too large.' : 'Invalid answer test data.' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = AnswerlatticeAnswerTestSaveSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid answer test data.' }, { status: 400 });
        }
        const uniqueIds = new Set(parsed.data.cases.map(testCase => testCase.id));
        if (uniqueIds.size !== parsed.data.cases.length) {
            return NextResponse.json({ error: 'Each answer test must have a unique ID.' }, { status: 400 });
        }

        const scope = { tId: access.scope.tenantId, sId: access.scope.storeId };
        const summaryRef = answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeAnswerTestSummaryId(scope.tId, scope.sId));
        const now = new Date().toISOString();
        const updatedBy = String(access.user.email || access.user.name || access.user.id || 'unknown').slice(0, 180);
        const summary = await answerlatticeFirestoreAdmin.runTransaction(async transaction => {
            const snapshot = await transaction.get(summaryRef);
            const current = normalizeAnswerlatticeAnswerTestSummary(snapshot.exists ? snapshot.data() : undefined, scope);
            if (current.revision !== parsed.data.revision) {
                throw new Error('answer_test_revision_conflict');
            }
            const cases = prepareAnswerlatticeAnswerTestCasesForWrite(
                current.cases,
                parsed.data.cases,
                now,
            );
            const next = compactAnswerlatticeAnswerTestSummaryForWrite({
                ...current,
                schemaVersion: ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
                revision: current.revision + 1,
                cases,
                updatedAt: now,
                updatedBy,
            });
            transaction.set(summaryRef, next, { merge: false });
            return next;
        });
        const includeLaunchProof = request.nextUrl.searchParams.get('includeLaunchProof') === '1';
        if (!includeLaunchProof) {
            return NextResponse.json({ summary }, {
                headers: { 'Cache-Control': 'private, no-store' },
            });
        }
        const sourceVersions = await getAnswerlatticeCompiledSourceVersionsAdmin(scope.tId, scope.sId);
        const launchProof = buildAnswerlatticeActivationAnswerTestSummary(
            summary,
            scope.tId,
            scope.sId,
            sourceVersions,
        );

        return NextResponse.json({ summary, launchProof }, {
            headers: { 'Cache-Control': 'private, no-store' },
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'answer_test_revision_conflict') {
            return NextResponse.json(
                { error: 'These tests changed in another session. Reload before saving.' },
                { status: 409 },
            );
        }
        if (error instanceof AnswerlatticeAnswerTestSummaryTooLargeError) {
            return NextResponse.json({ error: error.message }, { status: 413 });
        }
        logRuntimeFailure('answerlattice_answer_tests_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
        });
        return NextResponse.json({ error: 'Could not save answer tests.' }, { status: 500 });
    }
});
