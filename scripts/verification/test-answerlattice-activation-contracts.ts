import assert from 'assert';
import {
    isAnswerlatticeActivationSummaryResponse,
    isAnswerlatticeCompiledContextRebuildResponse,
    isAnswerlatticeNotificationTestResponse,
    isAnswerlatticeOperationsStatusResponse,
    normalizeAnswerlatticeOperationsMetric,
} from '@lib/answerlattice/activationDashboardResponseClient';
import { buildAnswerlatticeActivationSummary } from '@lib/answerlattice/activationSummary';

const nowMillis = Date.UTC(2026, 6, 18, 12, 0, 0);
const keyHash = 'a'.repeat(64);

const summary = buildAnswerlatticeActivationSummary({
    tId: 7,
    sId: 9,
    nowMillis,
    storeData: {
        pId: 'AL',
        tenantId: 7,
        storeId: 9,
        companyName: 'Example SaaS',
        productName: 'Example Product',
        productUrl: 'https://example.com',
        supportEmail: 'support@example.com',
        answerlatticeSubscription: {
            id: 'subscription_1',
            pId: 'AL',
            productId: 'AL',
            tId: 7,
            sId: 9,
            tenantId: 7,
            storeId: 9,
            status: 'active',
        },
        answerlatticeWidgetApi: {
            apiKeyHash: keyHash,
            keyPrefix: 'al_test',
            createdAt: new Date(nowMillis).toISOString(),
        },
        widgetAllowedOrigins: ['https://app.example.com'],
        widgetRuntimeStatus: {
            lastSeenAt: new Date(nowMillis - 60_000).toISOString(),
            lastOrigin: 'https://app.example.com',
            lastPath: '/settings/billing',
            lastContextKey: 'billing_settings',
            seenCount: 1,
        },
    },
    contextSummary: {
        pId: 'AL',
        tId: 7,
        sId: 9,
        generatedAt: new Date(nowMillis - 120_000).toISOString(),
        surfaceCount: 1,
        articleCount: 1,
        faqCount: 0,
        changelogCount: 0,
        ticketCount: 1,
        surfaces: {
            billing: {
                key: 'billing',
                label: 'Billing',
                routePatterns: ['/settings/billing'],
                entityHints: [],
                entityIds: [],
                tags: [],
                articles: [{ id: 'article_1', title: 'Billing help' }],
                faqs: [],
                changelogs: [],
                tickets: { total: 1, open: 0, recentDisplayIds: [] },
            },
        },
    } as any,
    coverage: {
        coverage: { rate: 100, total: 1 },
    } as any,
    trustMetrics: {
        sourceCompleteness: { complete: true },
        drift: { activeCount: 1, rate: 0 },
        entityHealth: { totalEntities: 1 },
        entityAnswerCoverage: { totalEntities: 1, rate: 100 },
        nonEscalation: { rate: 100 },
        confirmedResolution: { explicitOutcomeTotal: 1, rate: 100 },
    } as any,
    compiledContext: {
        status: 'ready',
        bundleVersion: 1,
        activeVersion: 1,
        lastReadyVersion: 1,
        publicBundleId: 'public_1',
        publicBundlesReady: true,
        privateBundlesReady: true,
    },
    answerTests: {
        activeCaseCount: 0,
        firstTenCount: 0,
        latestProofStatus: null,
        latestCriticalFailureCount: 0,
        latestProofStale: false,
        lastRunAt: null,
    },
});

assert.ok(summary.readinessScore >= 85, 'setup score should demonstrate that a high percentage is not the launch gate');
assert.equal(summary.launchProof.ready, false, 'missing priority-answer proof must block launch proof');
assert.notEqual(summary.stage, 'live', 'high setup readiness must not select the live stage');
assert.equal(isAnswerlatticeActivationSummaryResponse({ summary }), true);

const exactSubscriptionScope = {
    pId: 'AL',
    productId: 'AL',
    tId: 7,
    sId: 9,
    tenantId: 7,
    storeId: 9,
};
const buildSubscriptionActivationSummary = (
    embeddedSubscription: Record<string, unknown> | null,
    fallbackSubscription?: Record<string, unknown> | null,
) => buildAnswerlatticeActivationSummary({
    tId: 7,
    sId: 9,
    storeData: {
        companyName: 'Example SaaS',
        productName: 'Example Product',
        productUrl: 'https://example.com',
        supportEmail: 'support@example.com',
        answerlatticeSubscription: embeddedSubscription,
    },
    subscription: fallbackSubscription,
    nowMillis,
});
const getLicenseStatus = (candidate: ReturnType<typeof buildSubscriptionActivationSummary>) => (
    candidate.steps.find(step => step.key === 'license')?.status
);

const foreignEmbeddedSubscription = buildSubscriptionActivationSummary({
    ...exactSubscriptionScope,
    tId: 70,
    tenantId: 70,
    id: 'foreign_subscription',
    status: 'active',
});
assert.equal(getLicenseStatus(foreignEmbeddedSubscription), 'pending', 'foreign embedded subscription must not complete license readiness');
assert.equal(foreignEmbeddedSubscription.subscription, null, 'foreign embedded subscription must not enter the owner DTO');

const coerciveStatusSubscription = buildSubscriptionActivationSummary({
    ...exactSubscriptionScope,
    id: 'uppercase_subscription',
    status: 'ACTIVE',
});
assert.equal(getLicenseStatus(coerciveStatusSubscription), 'pending', 'case-mutated status must not complete license readiness');

const scopedFallbackSubscription = {
    ...exactSubscriptionScope,
    id: 'fallback_subscription',
    status: 'active',
    amount: 4900,
};
const recoveredFallbackSubscription = buildSubscriptionActivationSummary(
    { id: 'malformed_embedded', status: 'active' },
    scopedFallbackSubscription,
);
assert.equal(getLicenseStatus(recoveredFallbackSubscription), 'complete', 'invalid embedded summary must not suppress scoped fallback recovery');
assert.equal(recoveredFallbackSubscription.subscription?.id, 'fallback_subscription');

const stringAmountSubscription = buildSubscriptionActivationSummary({
    ...exactSubscriptionScope,
    id: 'string_amount_subscription',
    status: 'active',
    amount: '4900',
});
assert.equal(stringAmountSubscription.subscription?.amount, null, 'numeric-string amount must not become owner billing truth');

const stringWidgetCountSummary = buildAnswerlatticeActivationSummary({
    tId: 7,
    sId: 9,
    storeData: {
        widgetRuntimeStatus: {
            lastSeenAt: '2026-07-18T12:00:00.000Z',
            seenCount: '7',
        },
    },
    nowMillis,
});
assert.equal(stringWidgetCountSummary.widget.runtimeStatus?.seenCount, 0, 'numeric-string widget count must not be coerced');

const operationsResponse = {
    operations: {
        schedule: {
            timeZone: 'Asia/Kolkata',
            businessDayEndTime: '22:00',
            settlementLocalTime: '22:15',
            settlementBufferMinutes: 15,
            description: 'After 22:00 + 15 minutes in Asia/Kolkata',
        },
        masterScheduler: {
            schedulerName: 'answerlatticeMasterScheduler',
            updatedAt: '2026-07-18T12:00:00.000Z',
            governanceTask: {
                lastStatus: 'success',
                lastRunId: 'run_1',
                lastAttemptAt: '2026-07-18T11:59:00.000Z',
                lastFinishedAt: '2026-07-18T12:00:00.000Z',
                lastDurationMs: 60_000,
                lastActivity: true,
                lastError: null,
                lastDetails: {},
            },
        },
        workspace: {
            status: 'completed',
            lastAttemptedLocalDate: '2026-07-18',
            lastAttemptedAt: '2026-07-18T11:59:00.000Z',
            lastCompletedLocalDate: '2026-07-18',
            lastCompletedAt: '2026-07-18T12:00:00.000Z',
            lastFailedLocalDate: null,
            lastFailedAt: null,
            lastDetails: {
                nightlyStatus: 'completed',
                tenantStatus: 'completed',
                taskCount: 4,
                errorCount: 0,
            },
        },
        latestRuns: [{
            id: 'run_1',
            status: 'success',
            trigger: 'scheduled',
            startedAt: '2026-07-18T11:59:00.000Z',
            completedAt: '2026-07-18T12:00:00.000Z',
            durationMs: 60_000,
            tenantStatus: 'completed',
            taskCount: 4,
            errorCount: 0,
            totals: {},
        }],
        readModel: {
            firestoreReads: 8,
            source: 'store + platformSummary scheduler state + workspace state + capped scheduler logs',
            runLogReadCap: 5,
            workspaceRunMatches: 1,
        },
    },
};

const cloneOperationsResponse = () => JSON.parse(JSON.stringify(operationsResponse));
assert.equal(isAnswerlatticeOperationsStatusResponse(operationsResponse), true);

const stringDuration = cloneOperationsResponse();
stringDuration.operations.masterScheduler.governanceTask.lastDurationMs = '60000';
assert.equal(isAnswerlatticeOperationsStatusResponse(stringDuration), false, 'numeric-string task duration must fail closed');

const fractionalCount = cloneOperationsResponse();
fractionalCount.operations.workspace.lastDetails.taskCount = 1.5;
assert.equal(isAnswerlatticeOperationsStatusResponse(fractionalCount), false, 'fractional workspace counts must fail closed');

const invalidNestedStatus = cloneOperationsResponse();
invalidNestedStatus.operations.latestRuns[0].tenantStatus = 'complete_enough';
assert.equal(isAnswerlatticeOperationsStatusResponse(invalidNestedStatus), false, 'unknown nested statuses must fail closed');

const missingRequiredNestedField = cloneOperationsResponse();
delete missingRequiredNestedField.operations.masterScheduler.governanceTask.lastRunId;
assert.equal(isAnswerlatticeOperationsStatusResponse(missingRequiredNestedField), false, 'missing required nested fields must fail closed');

const mismatchedReadModel = cloneOperationsResponse();
mismatchedReadModel.operations.readModel.workspaceRunMatches = 0;
assert.equal(isAnswerlatticeOperationsStatusResponse(mismatchedReadModel), false, 'run-match evidence must agree with the projected runs');

const invalidLocalDate = cloneOperationsResponse();
invalidLocalDate.operations.workspace.lastCompletedLocalDate = '2026-02-31';
assert.equal(isAnswerlatticeOperationsStatusResponse(invalidLocalDate), false, 'nonexistent local dates must fail closed');

assert.equal(normalizeAnswerlatticeOperationsMetric(12), 12);
assert.equal(normalizeAnswerlatticeOperationsMetric('12'), 0, 'numeric-string persisted metrics must not be coerced');
assert.equal(normalizeAnswerlatticeOperationsMetric(1.5), 0, 'fractional persisted metrics must not be projected');
assert.equal(normalizeAnswerlatticeOperationsMetric(-1), 0, 'negative persisted metrics must not be projected');
assert.equal(normalizeAnswerlatticeOperationsMetric(Number.MAX_SAFE_INTEGER + 1), 0, 'unsafe persisted metrics must not be projected');

assert.equal(isAnswerlatticeNotificationTestResponse({
    sent: true,
    recipientEmail: 'support@example.com',
}), true);
assert.equal(isAnswerlatticeNotificationTestResponse({
    sent: true,
    recipientEmail: 'not-an-email',
}), false);
assert.equal(isAnswerlatticeNotificationTestResponse({
    sent: true,
    recipientEmail: `${'a'.repeat(310)}@example.com`,
}), false);

assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: true,
    manifest: {
        status: 'ready',
        bundleVersion: 2,
        activeVersion: 2,
        lastReadyVersion: 2,
        stats: { bytesTotal: 1024, routes: 3 },
        lastBuildError: null,
        staleReason: null,
    },
}), true);
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: true,
    manifest: { status: 'failed', bundleVersion: 2 },
}), false, 'ready flag and manifest status must agree');
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: false,
    manifest: { status: 'unknown', bundleVersion: 2 },
}), false, 'unknown manifest statuses must fail closed');
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: false,
    manifest: { status: 'failed', bundleVersion: 1.5 },
}), false, 'bundle versions must be non-negative safe integers');

console.log('Answerlattice activation readiness and dashboard response contracts passed.');
