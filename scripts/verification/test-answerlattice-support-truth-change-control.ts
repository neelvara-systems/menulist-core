import assert from 'node:assert/strict';
import {
    getPrivateBundlePath,
    getPublicBundlePath,
} from '../../src/lib/answerlattice/compiledContext';
import {
    ANSWERLATTICE_RELEASE_ACTION_RESPONSE_MAX_BYTES,
    ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
    ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
    AnswerlatticeReleaseActionResultSchema,
    buildAnswerlatticeReleaseDirectDependencyCoverage,
} from '../../src/lib/answerlattice/releaseContracts';
import {
    ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
    ANSWERLATTICE_SOURCE_FRESHNESS_ITEM_LIMIT,
    ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT,
    ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT,
    AnswerlatticeSupportTruthChangeControlSchema,
    buildAnswerlatticeCrossSurfaceReview,
    buildAnswerlatticeReleaseTruthReview,
    buildAnswerlatticeSourceFreshnessWatch,
    buildAnswerlatticeTruthPropagationProof,
} from '../../src/lib/answerlattice/supportTruthChangeControl';

const scope = { tId: 7, sId: 11 };
const checkedAt = '2026-08-10T10:00:00.000Z';
const sourceA = `kis_${'a'.repeat(28)}`;
const sourceB = `kis_${'b'.repeat(28)}`;

const releaseReview = buildAnswerlatticeReleaseTruthReview({
    changedEntityIds: ['billing', 'invoices'],
    directActiveAnswerCount: 1,
    reviewRequiredCount: 1,
    answerTestState: 'missing',
    entityIdsWithoutVisibleDirectLinks: ['invoices'],
});
assert.equal(releaseReview.state, 'attention');
assert.equal(releaseReview.mappingScope, 'direct_entity_links_only');

const sourceWatch = buildAnswerlatticeSourceFreshnessWatch({
    checkedAt,
    evidenceLinks: [
        { sourceId: sourceA, linkedAnswerCount: 1 },
        { sourceId: sourceB, linkedAnswerCount: 1 },
        { sourceId: 'external-source', linkedAnswerCount: 1 },
    ],
    checkedSources: [
        {
            sourceId: sourceA,
            exists: true,
            data: {
                pId: 'AL',
                ...scope,
                title: 'Billing policy',
                status: 'ready',
                governance: {
                    authority: 'owner_policy',
                    owner: 'Founder',
                    approvalStatus: 'approved',
                    accessScope: 'workspace_private',
                    citationEligibility: 'internal_only',
                    effectiveDate: '2026-01-01',
                    reviewDate: '2026-08-10',
                    applicability: { products: [], plans: [], roles: [], regions: [], versions: [] },
                    conflictSourceIds: [sourceB],
                    notes: null,
                    reviewedBy: 'owner@example.com',
                    reviewedOn: checkedAt,
                },
            },
        },
        { sourceId: sourceB, exists: false },
    ],
    governanceEnabled: true,
    invalidEvidenceReferenceCount: 2,
    scope,
});
assert.equal(sourceWatch.state, 'attention');
assert.equal(sourceWatch.totalEvidenceSourceCount, 3);
assert.equal(sourceWatch.governanceEligibleSourceCount, 2);
assert.equal(sourceWatch.approvedCount, 1);
assert.equal(sourceWatch.reviewDueCount, 1);
assert.equal(sourceWatch.conflictCount, 1);
assert.equal(sourceWatch.missingCount, 1);
assert.equal(sourceWatch.untrackedSourceCount, 1);
assert.equal(sourceWatch.invalidEvidenceReferenceCount, 2);
assert.equal(sourceWatch.items[0]?.sourceId, sourceA, 'the most actionable source remains visible');

const crossScopeSourceWatch = buildAnswerlatticeSourceFreshnessWatch({
    checkedAt,
    evidenceLinks: [{ sourceId: sourceA, linkedAnswerCount: 1 }],
    checkedSources: [{
        sourceId: sourceA,
        exists: true,
        data: {
            pId: 'AL',
            tId: scope.tId + 1,
            sId: scope.sId,
            title: 'Foreign workspace policy',
            status: 'ready',
        },
    }],
    governanceEnabled: true,
    scope,
});
assert.equal(crossScopeSourceWatch.invalidCount, 1);
assert.equal(crossScopeSourceWatch.items[0]?.title, null, 'foreign source titles must not enter owner proof');

const cappedSourceLinks = Array.from(
    { length: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT + 1 },
    (_, index) => ({
        sourceId: `kis_${index.toString(16).padStart(28, '0')}`,
        linkedAnswerCount: 1,
    }),
);
const partialWatch = buildAnswerlatticeSourceFreshnessWatch({
    checkedAt,
    evidenceLinks: cappedSourceLinks,
    checkedSources: cappedSourceLinks.slice(0, ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT).map(link => ({
        sourceId: link.sourceId,
        exists: false,
    })),
    governanceEnabled: true,
    invalidEvidenceReferenceCount: 0,
    scope,
});
assert.equal(partialWatch.state, 'partial');
assert.equal(partialWatch.checkedSourceCount, ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT);
assert.equal(partialWatch.items.length, 25, 'owner response samples remain bounded');

const disabledWatch = buildAnswerlatticeSourceFreshnessWatch({
    checkedAt,
    evidenceLinks: [{ sourceId: sourceA, linkedAnswerCount: 1 }],
    checkedSources: [],
    governanceEnabled: false,
    invalidEvidenceReferenceCount: 0,
    scope,
});
assert.equal(disabledWatch.state, 'not_enabled');
assert.equal(disabledWatch.checkedSourceCount, 0, 'disabled governance performs no source reads');

const surfaceReview = buildAnswerlatticeCrossSurfaceReview({
    changedEntityIds: ['billing', 'invoices'],
    documentExists: true,
    documentValue: {
        pId: 'AL',
        ...scope,
        generatedAt: checkedAt,
        surfaceCount: 2,
        articleCount: 2,
        faqCount: 1,
        changelogCount: 1,
        ticketCount: 0,
        surfaces: {
            billing: {
                key: 'billing',
                label: 'Billing settings',
                routePatterns: ['/settings/billing', '/settings/billing/*'],
                entityIds: ['billing'],
                visibility: { helpWidget: true, helpCenter: true, changelog: true },
                articles: [{ id: 'article-billing', title: 'Manage billing' }],
                faqs: [{ id: 'faq-billing', question: 'Where are invoices?' }],
                changelogs: [{ id: 'change-billing', pageId: 'page-main', title: 'Billing update' }],
                tickets: { total: 0, open: 0, recentDisplayIds: [] },
            },
            profile: {
                key: 'profile',
                label: 'Profile',
                routePatterns: ['/settings/profile'],
                entityIds: ['profile'],
                visibility: { helpWidget: true, helpCenter: true, changelog: true },
                articles: [{ id: 'article-profile', title: 'Edit profile' }],
                faqs: [],
                changelogs: [],
                tickets: { total: 0, open: 0, recentDisplayIds: [] },
            },
        },
    },
    scope,
});
assert.equal(surfaceReview.state, 'available');
assert.equal(surfaceReview.mappedSurfaceCount, 1);
assert.deepEqual(surfaceReview.mappedEntityIds, ['billing']);
assert.deepEqual(surfaceReview.entityIdsWithoutDirectSurfaceLinks, ['invoices']);
assert.equal(surfaceReview.visibleMappedArticleCount, 1);
assert.equal(surfaceReview.visibleMappedFaqCount, 1);
assert.equal(surfaceReview.visibleMappedChangelogCount, 1);

const missingSurfaceReview = buildAnswerlatticeCrossSurfaceReview({
    changedEntityIds: ['billing'],
    documentExists: false,
    documentValue: undefined,
    scope,
});
assert.equal(missingSurfaceReview.state, 'missing');
assert.deepEqual(missingSurfaceReview.entityIdsWithoutDirectSurfaceLinks, ['billing']);

const crossScopeSurfaceReview = buildAnswerlatticeCrossSurfaceReview({
    changedEntityIds: ['billing'],
    documentExists: true,
    documentValue: {
        pId: 'AL',
        tId: scope.tId + 1,
        sId: scope.sId,
        articleCount: 0,
        faqCount: 0,
        changelogCount: 0,
        ticketCount: 0,
        surfaces: {},
    },
    scope,
});
assert.equal(crossScopeSurfaceReview.state, 'invalid');

const sourceVersions = {
    pId: 'AL',
    ...scope,
    workspaceProfile: 1,
    widgetConfig: 1,
    kb: 2,
    docsNav: 2,
    entities: 3,
    entityRelations: 3,
    canonical: 4,
    surfaces: 5,
    releases: 6,
    branding: 1,
    mcpPolicy: 0,
    predictiveTriggers: 1,
};
const publicBundleId = 'pb_12345678';
const bundleVersion = 2;
const bundleHash = `sha256:${'f'.repeat(64)}`;
const manifest = {
    schemaVersion: 1,
    pId: 'AL',
    ...scope,
    status: 'ready',
    bundleVersion,
    activeVersion: bundleVersion,
    lastReadyVersion: bundleVersion,
    publicBundleId,
    sourceVersions,
    bundles: {
        'public:widget-bootstrap.json': {
            path: getPublicBundlePath(publicBundleId, bundleVersion, 'widget-bootstrap.json'),
            bytes: 100,
            hash: bundleHash,
        },
        'public:canonical-lite.json': {
            path: getPublicBundlePath(publicBundleId, bundleVersion, 'canonical-lite.json'),
            bytes: 100,
            hash: bundleHash,
        },
        'private:mcp/product-summary.json': {
            path: getPrivateBundlePath(scope.tId, scope.sId, bundleVersion, 'mcp/product-summary.json'),
            bytes: 100,
            hash: bundleHash,
        },
        'private:mcp/canonical-index.json': {
            path: getPrivateBundlePath(scope.tId, scope.sId, bundleVersion, 'mcp/canonical-index.json'),
            bytes: 100,
            hash: bundleHash,
        },
    },
};
const propagationProof = buildAnswerlatticeTruthPropagationProof({
    checkedAt,
    features: {
        contextBundlesEnabled: true,
        helpCenterEnabled: true,
        mcpEnabled: false,
        publicApiBundleReadsEnabled: true,
        publicApiEnabled: false,
        widgetBundleBootstrapEnabled: false,
        widgetEnabled: true,
    },
    manifestExists: true,
    manifestValue: manifest,
    scope,
    sourceVersionsExists: true,
    sourceVersionsValue: sourceVersions,
});
assert.equal(propagationProof.state, 'ready');
assert.equal(propagationProof.publicBundleReady, true);
assert.equal(propagationProof.privateBundleReady, true);
assert.equal(propagationProof.channels.find(channel => channel.channel === 'widget')?.currentMode, 'direct_runtime');
assert.equal(propagationProof.channels.find(channel => channel.channel === 'public_api')?.currentState, 'disabled');

const stalePropagationProof = buildAnswerlatticeTruthPropagationProof({
    checkedAt,
    features: {
        contextBundlesEnabled: true,
        helpCenterEnabled: true,
        mcpEnabled: true,
        publicApiBundleReadsEnabled: true,
        publicApiEnabled: true,
        widgetBundleBootstrapEnabled: true,
        widgetEnabled: true,
    },
    manifestExists: true,
    manifestValue: { ...manifest, status: 'stale' },
    scope,
    sourceVersionsExists: true,
    sourceVersionsValue: sourceVersions,
});
assert.equal(stalePropagationProof.state, 'rebuild_required');
assert.equal(
    stalePropagationProof.channels.find(channel => channel.channel === 'widget')?.afterActivationState,
    'rebuild_required',
);

const crossScopePropagationProof = buildAnswerlatticeTruthPropagationProof({
    checkedAt,
    features: {
        contextBundlesEnabled: true,
        helpCenterEnabled: true,
        mcpEnabled: false,
        publicApiBundleReadsEnabled: true,
        publicApiEnabled: false,
        widgetBundleBootstrapEnabled: false,
        widgetEnabled: true,
    },
    manifestExists: true,
    manifestValue: manifest,
    scope,
    sourceVersionsExists: true,
    sourceVersionsValue: { ...sourceVersions, tId: scope.tId + 1 },
});
assert.equal(crossScopePropagationProof.state, 'invalid');
assert.equal(crossScopePropagationProof.sourceVersionsState, 'invalid');

const changeControl = AnswerlatticeSupportTruthChangeControlSchema.parse({
    contractVersion: 1,
    generatedAt: checkedAt,
    releaseReview,
    sourceWatch,
    surfaceReview,
    propagationProof,
});
const directDependencyCoverage = buildAnswerlatticeReleaseDirectDependencyCoverage({
    activeLinkedTestCount: 1,
    answerEntityIds: ['billing'],
    changedEntityIds: ['billing', 'invoices'],
    directActiveAnswerCount: 1,
    testEntityIds: ['billing'],
    testLinkEvidence: 'available',
});
const preview = {
    success: true,
    action: 'preview_impact',
    releaseId: 'release-safe',
    status: 'pending',
    impactFingerprint: 'c'.repeat(64),
    affectedAnswerCount: 1,
    reviewRequiredCount: 1,
    affectedAnswers: [{
        answerId: 'answer-billing',
        title: 'Billing limits',
        lastValidatedInVersion: 1_000_000,
        currentDriftFlag: false,
        currentReviewRequired: false,
        willRequireReview: true,
        matchReason: 'direct_entity_binding',
        matchedEntityCount: 1,
    }],
    answerTestProof: {
        state: 'missing',
        linkedCaseCount: 1,
        criticalCaseCount: 1,
        failedCaseCount: 0,
        criticalFailureCount: 0,
        lastRunAt: null,
    },
    directDependencyCoverage,
    changeControl,
    scope,
};
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse(preview).success, true);
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...preview,
    changeControl: {
        ...changeControl,
        releaseReview: { ...changeControl.releaseReview, reviewRequiredCount: 0 },
    },
}).success, false, 'change-control release proof must agree with the activation projection');

const buildMaximumDocumentId = (prefix: string, index: number) => (
    `${prefix}_${String(index).padStart(3, '0')}_`.padEnd(180, 'x')
);
const maximumEntityIds = Array.from(
    { length: ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES },
    (_, index) => buildMaximumDocumentId('entity', index),
);
const maximumDirectDependencyCoverage = buildAnswerlatticeReleaseDirectDependencyCoverage({
    activeLinkedTestCount: 0,
    answerEntityIds: maximumEntityIds,
    changedEntityIds: maximumEntityIds,
    directActiveAnswerCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
    testEntityIds: [],
    testLinkEvidence: 'available',
});
const maximumChangeControl = AnswerlatticeSupportTruthChangeControlSchema.parse({
    contractVersion: 1,
    generatedAt: checkedAt,
    releaseReview: {
        state: 'attention',
        mappingScope: 'direct_entity_links_only',
        changedEntityCount: ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
        directActiveAnswerCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
        reviewRequiredCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
        answerTestState: 'no_linked_tests',
        entityIdsWithoutVisibleDirectLinks: [],
    },
    sourceWatch: {
        state: 'partial',
        mappingScope: 'direct_canonical_evidence_ids',
        checkedAt,
        totalEvidenceSourceCount: 4_000,
        governanceEligibleSourceCount: 4_000,
        checkedSourceCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        approvedCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        unreviewedCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        nonApprovedCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        reviewDateMissingCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        reviewDueCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        notYetEffectiveCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        conflictCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        missingCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        invalidCount: ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT,
        invalidEvidenceReferenceCount: 4_000,
        untrackedSourceCount: 0,
        truncated: true,
        items: Array.from({ length: ANSWERLATTICE_SOURCE_FRESHNESS_ITEM_LIMIT }, (_, index) => ({
            sourceId: buildMaximumDocumentId('source', index),
            title: 't'.repeat(180),
            status: 'processing',
            approvalStatus: 'superseded',
            reviewDate: '2026-08-10',
            linkedAnswerCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
            reasons: [
                'record_missing',
                'record_invalid',
                'governance_unreviewed',
                'not_approved',
                'review_date_missing',
                'review_due',
                'not_yet_effective',
                'conflict_recorded',
                'source_not_ready',
            ],
        })),
    },
    surfaceReview: {
        state: 'partial',
        mappingScope: 'direct_surface_entity_links',
        summaryGeneratedAt: checkedAt,
        summarySurfaceCount: 300,
        mappedSurfaceCount: 300,
        sampledSurfaceCount: ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT,
        changedEntityIds: maximumEntityIds,
        mappedEntityIds: maximumEntityIds,
        entityIdsWithoutDirectSurfaceLinks: [],
        visibleMappedArticleCount: 7_500,
        visibleMappedFaqCount: 7_500,
        visibleMappedChangelogCount: 7_500,
        items: Array.from({ length: ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT }, (_, index) => ({
            key: `surface_${String(index).padStart(2, '0')}_`.padEnd(80, 'k'),
            label: 'l'.repeat(120),
            matchedEntityIds: maximumEntityIds,
            routePatternCount: 25,
            routePatterns: Array.from(
                { length: ANSWERLATTICE_SURFACE_ROUTE_SAMPLE_LIMIT },
                (_, routeIndex) => `/${routeIndex}/`.padEnd(180, 'r'),
            ),
            routePatternsTruncated: true,
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
            visibleArticleCount: 25,
            visibleFaqCount: 25,
            visibleChangelogCount: 25,
        })),
    },
    propagationProof: {
        state: 'ready',
        proofScope: 'answerlattice_control_plane_only',
        checkedAt,
        sourceVersionsState: 'available',
        manifestState: 'ready',
        manifestMatchesCurrentSourceVersions: true,
        activeVersion: Number.MAX_SAFE_INTEGER,
        lastReadyVersion: Number.MAX_SAFE_INTEGER,
        publicBundleReady: true,
        privateBundleReady: true,
        channels: [
            { channel: 'help_center', enabled: true, currentMode: 'direct_runtime', currentState: 'current', afterActivationState: 'current' },
            { channel: 'widget', enabled: true, currentMode: 'compiled_bundle', currentState: 'current', afterActivationState: 'rebuild_required' },
            { channel: 'public_api', enabled: true, currentMode: 'compiled_bundle', currentState: 'current', afterActivationState: 'rebuild_required' },
            { channel: 'mcp', enabled: true, currentMode: 'compiled_bundle', currentState: 'current', afterActivationState: 'rebuild_required' },
        ],
    },
});
const maximumPreview = AnswerlatticeReleaseActionResultSchema.parse({
    success: true,
    action: 'preview_impact',
    releaseId: buildMaximumDocumentId('release', 0),
    status: 'pending',
    impactFingerprint: 'e'.repeat(64),
    affectedAnswerCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
    reviewRequiredCount: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS,
    affectedAnswers: Array.from(
        { length: ANSWERLATTICE_RELEASE_MAX_AFFECTED_ANSWERS },
        (_, index) => ({
            answerId: buildMaximumDocumentId('answer', index),
            title: 'a'.repeat(180),
            lastValidatedInVersion: Number.MAX_SAFE_INTEGER,
            currentDriftFlag: true,
            currentReviewRequired: true,
            willRequireReview: true,
            matchReason: 'direct_entity_binding',
            matchedEntityCount: ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
        }),
    ),
    answerTestProof: {
        state: 'no_linked_tests',
        linkedCaseCount: 0,
        criticalCaseCount: 0,
        failedCaseCount: 0,
        criticalFailureCount: 0,
        lastRunAt: checkedAt,
    },
    directDependencyCoverage: maximumDirectDependencyCoverage,
    changeControl: maximumChangeControl,
    scope,
});
assert.ok(
    Buffer.byteLength(JSON.stringify(maximumPreview), 'utf8')
        <= ANSWERLATTICE_RELEASE_ACTION_RESPONSE_MAX_BYTES,
    'the maximum valid release preview must remain within the browser response cap',
);

process.stdout.write('Answerlattice support truth change-control tests passed.\n');
