import assert from 'assert';
import {
    isAnswerlatticeActivationSummaryForScope,
    isAnswerlatticeActivationSummaryResponse,
    isAnswerlatticeCompiledContextRebuildResponse,
    isAnswerlatticeNotificationTestResponse,
    isAnswerlatticeOperationsStatusResponse,
    normalizeAnswerlatticeOperationsMetric,
} from '@lib/answerlattice/activationDashboardResponseClient';
import {
    buildAnswerlatticeActivationFirstValueEvidence,
    buildAnswerlatticeActivationSummary,
    shouldPersistActivationFirstValueEvidenceAtomically,
} from '@lib/answerlattice/activationSummary';

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
assert.equal(summary.firstValueEvidence.knowledgeReadyObservedAt, new Date(nowMillis).toISOString());
assert.equal(summary.firstValueEvidence.trustedAnswerReadyObservedAt, new Date(nowMillis).toISOString());
assert.equal(summary.firstValueEvidence.answerTestProofReadyObservedAt, null);
assert.equal(summary.firstValueEvidence.widgetRuntimeVerifiedObservedAt, new Date(nowMillis).toISOString());
assert.equal(summary.firstValueEvidence.launchProofReadyObservedAt, null);
assert.equal(isAnswerlatticeActivationSummaryResponse({ summary }), true);
assert.equal(
    shouldPersistActivationFirstValueEvidenceAtomically(summary as unknown as Record<string, unknown>, summary),
    false,
    'an exact persisted first-value object must not require a transaction',
);
assert.equal(
    shouldPersistActivationFirstValueEvidenceAtomically(null, summary),
    true,
    'the first activation snapshot must establish its bounded evidence object atomically',
);
assert.equal(
    shouldPersistActivationFirstValueEvidenceAtomically({
        ...summary,
        firstValueEvidence: {
            ...summary.firstValueEvidence,
            launchProofReadyObservedAt: undefined,
        },
    } as unknown as Record<string, unknown>, summary),
    true,
    'a malformed persisted milestone must be repaired even when it normalizes to the next null state',
);

const completeFirstValueEvidence = buildAnswerlatticeActivationFirstValueEvidence({
    nowMillis,
    launchProof: {
        ready: true,
        score: 100,
        completeCount: 4,
        totalCount: 4,
        blockers: [],
        items: [
            { key: 'knowledge-surfaces', title: 'Knowledge', description: 'Ready', status: 'complete' },
            { key: 'ontology-canonical', title: 'Trusted answers', description: 'Ready', status: 'complete' },
            { key: 'priority-answer-checks', title: 'Answer tests', description: 'Ready', status: 'complete' },
            { key: 'widget-runtime', title: 'Widget', description: 'Ready', status: 'complete' },
        ],
    },
});
assert.deepEqual(
    Object.values(completeFirstValueEvidence),
    Array(5).fill(new Date(nowMillis).toISOString()),
    'all five first-value timestamps must be observed when every bounded threshold is ready',
);

const regressedSummary = buildAnswerlatticeActivationSummary({
    tId: 7,
    sId: 9,
    nowMillis: nowMillis + 60_000,
    storeData: {},
    existingSummary: summary as unknown as Record<string, unknown>,
});
assert.equal(
    regressedSummary.firstValueEvidence.knowledgeReadyObservedAt,
    summary.firstValueEvidence.knowledgeReadyObservedAt,
    'first-observed knowledge evidence must survive a current-state regression',
);
assert.equal(
    regressedSummary.firstValueEvidence.widgetRuntimeVerifiedObservedAt,
    summary.firstValueEvidence.widgetRuntimeVerifiedObservedAt,
    'first-observed widget evidence must survive stale or missing current runtime proof',
);
assert.equal(regressedSummary.launchProof.ready, false, 'historical evidence must not keep current launch proof green');

const concurrentEvidenceObservedAt = new Date(nowMillis + 30_000).toISOString();
const concurrentEvidence = buildAnswerlatticeActivationFirstValueEvidence({
    existingEvidence: {
        ...summary.firstValueEvidence,
        answerTestProofReadyObservedAt: concurrentEvidenceObservedAt,
    },
    launchProof: summary.launchProof,
    nowMillis: nowMillis + 60_000,
});
assert.equal(
    concurrentEvidence.answerTestProofReadyObservedAt,
    concurrentEvidenceObservedAt,
    'a transaction retry must preserve evidence committed after the original summary computation',
);

const foreignExistingSummary = buildAnswerlatticeActivationSummary({
    tId: 7,
    sId: 9,
    nowMillis: nowMillis + 60_000,
    storeData: {},
    existingSummary: {
        ...summary,
        tId: 70,
        firstValueEvidence: {
            ...summary.firstValueEvidence,
            answerTestProofReadyObservedAt: new Date(nowMillis).toISOString(),
        },
    } as unknown as Record<string, unknown>,
});
assert.deepEqual(
    Object.values(foreignExistingSummary.firstValueEvidence),
    Array(5).fill(null),
    'cross-scope activation snapshots must not contribute historical first-value evidence',
);
assert.equal(
    shouldPersistActivationFirstValueEvidenceAtomically(
        { ...summary, tId: 70 } as unknown as Record<string, unknown>,
        summary,
    ),
    true,
    'a foreign persisted summary must require fail-closed evidence replacement',
);
const substitutedEvidenceKey = {
    ...summary.firstValueEvidence,
    unexpectedObservedAt: summary.firstValueEvidence.launchProofReadyObservedAt,
} as Record<string, unknown>;
delete substitutedEvidenceKey.launchProofReadyObservedAt;
assert.equal(
    shouldPersistActivationFirstValueEvidenceAtomically({
        ...summary,
        firstValueEvidence: substitutedEvidenceKey,
    } as unknown as Record<string, unknown>, summary),
    true,
    'an unknown key cannot substitute for a required first-value evidence field',
);

const malformedFirstValueEvidenceSummary = JSON.parse(JSON.stringify(summary));
malformedFirstValueEvidenceSummary.firstValueEvidence.extra = 'not allowed';
assert.equal(
    isAnswerlatticeActivationSummaryResponse({ summary: malformedFirstValueEvidenceSummary }),
    false,
    'activation responses must reject uncontracted first-value evidence fields',
);
const futureFirstValueEvidenceSummary = JSON.parse(JSON.stringify(summary));
futureFirstValueEvidenceSummary.firstValueEvidence.knowledgeReadyObservedAt = new Date(nowMillis + 60_000).toISOString();
assert.equal(
    isAnswerlatticeActivationSummaryResponse({ summary: futureFirstValueEvidenceSummary }),
    false,
    'first-value evidence cannot be later than the summary computation time',
);
assert.equal(
    isAnswerlatticeActivationSummaryForScope(summary, { tenantId: 7, storeId: 9 }),
    true,
    'activation summary must be accepted for its exact browser workspace scope',
);
assert.equal(
    isAnswerlatticeActivationSummaryForScope(summary, { tenantId: 70, storeId: 9 }),
    false,
    'activation summary must be rejected after a tenant switch',
);
assert.equal(
    isAnswerlatticeActivationSummaryForScope(summary, { tenantId: 7, storeId: 90 }),
    false,
    'activation summary must be rejected after a store switch',
);
const objectStageSummary = JSON.parse(JSON.stringify(summary));
objectStageSummary.stage = { toString: () => summary.stage };
assert.equal(
    isAnswerlatticeActivationSummaryResponse({ summary: objectStageSummary }),
    false,
    'object activation stages must not be coerced into trusted response values',
);

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
assert.equal(stringAmountSubscription.subscription, null, 'numeric-string amount must not become owner billing truth');
assert.equal(getLicenseStatus(stringAmountSubscription), 'pending');

const expiredActiveSubscription = buildSubscriptionActivationSummary({
    ...exactSubscriptionScope,
    id: 'expired_active_subscription',
    status: 'active',
    cycleEndDate: { seconds: Math.floor((nowMillis - 60_000) / 1_000), nanoseconds: 0 },
});
assert.equal(getLicenseStatus(expiredActiveSubscription), 'pending', 'an elapsed active subscription must not complete license readiness');
assert.equal(expiredActiveSubscription.subscription?.status, 'expired', 'owner activation truth must expose elapsed active state as expired');

const currentFallbackAfterExpiredEmbedded = buildSubscriptionActivationSummary(
    {
        ...exactSubscriptionScope,
        id: 'expired_embedded_subscription',
        status: 'active',
        cycleEndDate: { seconds: Math.floor((nowMillis - 60_000) / 1_000), nanoseconds: 0 },
    },
    {
        ...exactSubscriptionScope,
        id: 'current_fallback_subscription',
        status: 'active',
        cycleEndDate: { seconds: Math.floor((nowMillis + 60_000) / 1_000), nanoseconds: 0 },
    },
);
assert.equal(
    getLicenseStatus(currentFallbackAfterExpiredEmbedded),
    'complete',
    'an elapsed embedded summary must not suppress an exact current fallback',
);
assert.equal(currentFallbackAfterExpiredEmbedded.subscription?.id, 'current_fallback_subscription');

const coerciveEndDateSubscription = buildSubscriptionActivationSummary({
    ...exactSubscriptionScope,
    id: 'string_end_subscription',
    status: 'active',
    cycleEndDate: new Date(nowMillis + 60_000).toISOString(),
});
assert.equal(coerciveEndDateSubscription.subscription, null, 'string-like lifecycle dates must not enter owner activation truth');
assert.equal(getLicenseStatus(coerciveEndDateSubscription), 'pending');

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

const objectWorkspaceStatus = cloneOperationsResponse();
objectWorkspaceStatus.operations.workspace.status = { toString: () => 'completed' };
assert.equal(
    isAnswerlatticeOperationsStatusResponse(objectWorkspaceStatus),
    false,
    'object operation statuses must not be coerced into trusted response values',
);

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
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: false,
    manifest: {
        status: { toString: () => 'failed' },
        bundleVersion: 2,
    },
}), false, 'object statuses must not be coerced into trusted response values');
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: true,
    manifest: { status: 'ready', bundleVersion: 2 },
    internalStoragePath: 'private/workspaces/1/2/bundle.json',
}), false, 'unexpected top-level fields must fail closed');
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: true,
    manifest: {
        status: 'ready',
        bundleVersion: 2,
        sourceVersions: { kb: 9 },
    },
}), false, 'unexpected manifest fields must fail closed');
assert.equal(isAnswerlatticeCompiledContextRebuildResponse({
    ok: true,
    manifest: {
        status: 'ready',
        bundleVersion: 2,
        stats: {
            routes: 3,
            privateStoragePath: 1,
        },
    },
}), false, 'unexpected stats fields must fail closed');
assert.doesNotThrow(() => {
    const throwingResponse = new Proxy({}, {
        ownKeys: () => {
            throw new Error('ownKeys trap');
        },
    });
    assert.equal(
        isAnswerlatticeCompiledContextRebuildResponse(throwingResponse),
        false,
        'throwing response objects must be failure-contained',
    );
});

console.log('Answerlattice activation readiness and dashboard response contracts passed.');
