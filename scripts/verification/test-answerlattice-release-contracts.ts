import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Timestamp } from 'firebase/firestore';
import {
    ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES,
    AnswerlatticeReleaseActionResultSchema,
    AnswerlatticeStoredReleaseSchema,
    buildAnswerlatticeReleaseDirectDependencyCoverage,
    normalizeAnswerlatticeVersionLabel,
    parseAnswerlatticeReleaseAction,
} from '../../src/lib/answerlattice/releaseContracts';
import {
    denormalizeVersion,
    normalizeVersion,
    type AnswerlatticeRelease,
} from '../../src/types/answerlattice';

const validCreate = {
    action: 'create',
    requestId: 'release_request_123',
    scope: { tId: 1, sId: 101 },
    versionLabel: '2.4.1',
    versionNormalized: 2_004_001,
    releasedAt: '2026-07-11T10:00:00.000Z',
    entityChanges: ['billing', 'invoices'],
};

assert.deepEqual(parseAnswerlatticeReleaseAction(validCreate), validCreate);
assert.equal(parseAnswerlatticeReleaseAction({
    ...validCreate,
    scope: undefined,
}), null, 'initiating scope is required');
assert.equal(parseAnswerlatticeReleaseAction({
    ...validCreate,
    scope: { tId: 1, sId: 0 },
}), null, 'initiating scope must use positive integer IDs');
assert.deepEqual(normalizeAnswerlatticeVersionLabel('v2.4.1'), { label: '2.4.1', normalized: 2_004_001 });
assert.deepEqual(normalizeAnswerlatticeVersionLabel('2'), { label: '2', normalized: 2_000_000 });
assert.equal(normalizeAnswerlatticeVersionLabel('2.1000.1'), null);
assert.equal(normalizeAnswerlatticeVersionLabel('latest'), null);
assert.equal(normalizeVersion('2.4.1'), 2_004_001);
assert.equal(normalizeVersion('2'), 2_000_000);
assert.equal(Number.isNaN(normalizeVersion('1.1000.0')), true, 'overflowing components must not collide');
assert.equal(Number.isNaN(normalizeVersion('2.0.0.1')), true, 'extra components must fail closed');
assert.equal(Number.isNaN(normalizeVersion('1.invalid.2')), true, 'nonnumeric components must fail closed');
assert.equal(Number.isNaN(normalizeVersion('-1.2.3')), true, 'negative components must fail closed');
assert.equal(denormalizeVersion(2_004_001), '2.4.1');
assert.equal(denormalizeVersion(Number.NaN), '');
assert.equal(denormalizeVersion(-1), '');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, extra: true }), null, 'unknown request fields must fail closed');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, entityChanges: ['billing', 'billing'] }), null, 'duplicate entity IDs must fail');
assert.equal(parseAnswerlatticeReleaseAction({
    ...validCreate,
    entityChanges: Array.from({ length: ANSWERLATTICE_RELEASE_MAX_ENTITY_CHANGES + 1 }, (_, index) => `entity-${index}`),
}), null, 'release entity fan-out must be capped');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, releasedAt: 'not-a-date' }), null, 'release timestamps must be ISO dates');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, versionNormalized: 2_004_002 }), null, 'version labels and normalized versions must agree');
assert.equal(parseAnswerlatticeReleaseAction({ ...validCreate, versionLabel: 'v2.4.1' }), null, 'stored release labels must use canonical numeric form');
assert.equal(parseAnswerlatticeReleaseAction({
    action: 'activate',
    requestId: 'activate_12345',
    scope: validCreate.scope,
    releaseId: 'release/unsafe',
    impactFingerprint: 'b'.repeat(64),
}), null);
assert.deepEqual(parseAnswerlatticeReleaseAction({
    action: 'activate',
    requestId: 'activate_12345',
    scope: validCreate.scope,
    releaseId: 'release_safe',
    impactFingerprint: 'b'.repeat(64),
}), {
    action: 'activate',
    requestId: 'activate_12345',
    scope: validCreate.scope,
    releaseId: 'release_safe',
    impactFingerprint: 'b'.repeat(64),
});
assert.equal(parseAnswerlatticeReleaseAction({
    action: 'activate',
    requestId: 'activate_12345',
    scope: validCreate.scope,
    releaseId: 'release_safe',
}), null, 'activation requires a current impact fingerprint');
assert.deepEqual(parseAnswerlatticeReleaseAction({
    action: 'preview_impact',
    requestId: 'preview_12345',
    scope: validCreate.scope,
    releaseId: 'release_safe',
    includeAnswerTestProof: true,
}), {
    action: 'preview_impact',
    requestId: 'preview_12345',
    scope: validCreate.scope,
    releaseId: 'release_safe',
    includeAnswerTestProof: true,
});

const timestamp = Timestamp.fromMillis(1_700_000_000_000);
const releaseTypeContract: Pick<AnswerlatticeRelease, 'impactFingerprint' | 'activation'> = {
    impactFingerprint: 'b'.repeat(64),
    activation: {
        requestId: 'activate_12345',
        impactFingerprint: 'b'.repeat(64),
        startedAt: timestamp,
        leaseExpiresAt: timestamp,
    },
};
assert.equal(releaseTypeContract.activation?.impactFingerprint, releaseTypeContract.impactFingerprint);
const stored = {
    pId: 'AL',
    tId: 1,
    sId: 101,
    versionLabel: '2.4.1',
    versionNormalized: 2_004_001,
    releasedAt: timestamp,
    entityChanges: ['billing'],
    status: 'pending',
    requestId: 'release_request_123',
    requestFingerprint: 'a'.repeat(64),
    createdOn: timestamp,
    createdBy: 'owner@example.com',
    modifiedOn: timestamp,
    modifiedBy: 'owner@example.com',
};
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse(stored).success, true);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, pId: 'ML' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, tId: '1' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, status: 'published' }).success, false);
assert.equal(AnswerlatticeStoredReleaseSchema.safeParse({ ...stored, versionNormalized: 2_004_002 }).success, false);
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    success: true,
    action: 'activate',
    releaseId: 'release_safe',
    status: 'active',
    evaluatedAnswers: 2,
    driftedAnswers: 1,
    replayed: false,
    scope: validCreate.scope,
}).success, true);
const validImpactPreview = {
    success: true,
    action: 'preview_impact',
    releaseId: 'release_safe',
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
    directDependencyCoverage: buildAnswerlatticeReleaseDirectDependencyCoverage({
        activeLinkedTestCount: 1,
        answerEntityIds: ['billing'],
        changedEntityIds: ['billing', 'invoices', 'refunds'],
        directActiveAnswerCount: 1,
        testEntityIds: ['invoices'],
        testLinkEvidence: 'available',
    }),
    scope: validCreate.scope,
};
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse(validImpactPreview).success, true);
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...validImpactPreview,
    affectedAnswerCount: 0,
}).success, false, 'preview answer totals must match the bounded projection');
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...validImpactPreview,
    reviewRequiredCount: 0,
}).success, false, 'preview review totals must be derived from the bounded projection');
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...validImpactPreview,
    directDependencyCoverage: {
        ...validImpactPreview.directDependencyCoverage,
        entityIdsWithoutVisibleDirectLinks: [],
    },
}).success, false, 'preview dependency evidence must disclose every changed entity without a visible direct link');
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...validImpactPreview,
    directDependencyCoverage: {
        ...validImpactPreview.directDependencyCoverage,
        directActiveAnswerCount: 0,
    },
}).success, false, 'preview direct answer counts must agree with linked changed entities');
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    ...validImpactPreview,
    directDependencyCoverage: {
        ...validImpactPreview.directDependencyCoverage,
        activeLinkedTestCount: 0,
    },
}).success, false, 'preview direct Answer Test counts must agree with linked changed entities');
assert.equal(AnswerlatticeReleaseActionResultSchema.safeParse({
    success: true,
    action: 'create',
    releaseId: 'release_safe',
    status: 'pending',
    replayed: false,
}).success, false, 'release responses must acknowledge their exact workspace');

const changelogEditor = readFileSync(
    path.join(process.cwd(), 'src/components/templates/platform/changelog/addEditChangelog.tsx'),
    'utf8',
);
assert.match(changelogEditor, /getAnswerlatticeAnswerContextRoute\(/);
assert.match(changelogEditor, /Review answer/);
assert.match(changelogEditor, /getAnswerlatticeReleaseContextRoute\(/);
assert.match(changelogEditor, /Review linked Answer Tests/);

process.stdout.write('Answerlattice release contract tests passed.\n');
