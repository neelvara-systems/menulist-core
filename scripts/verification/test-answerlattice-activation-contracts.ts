import assert from 'assert';
import {
    isAnswerlatticeActivationSummaryResponse,
    isAnswerlatticeCompiledContextRebuildResponse,
    isAnswerlatticeNotificationTestResponse,
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
