import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS,
    countAnswerlatticeFirstTrustedAnswerCases,
    createAnswerlatticeFirstTrustedAnswerCases,
    getAnswerlatticeFirstTrustedAnswerCases,
    replaceAnswerlatticeFirstTrustedAnswerCases,
} from '../../src/lib/answerlattice/answerTestStarterPack';
import {
    AnswerlatticeAnswerTestCaseSchema,
    syncAnswerlatticeLaunchPackCaseFromReview,
} from '../../src/lib/answerlattice/answerTestContracts';
import {
    ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS,
    ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE,
    AnswerlatticeProductStarterPackModelResponseSchema,
    canGenerateAnswerlatticeProductStarterPack,
    isAnswerlatticeProductStarterPackCaseId,
} from '../../src/lib/answerlattice/firstTrustedAnswerPackContracts';
import { calculateConfirmedResolutionMetrics } from '../../functions-answerlattice/src/answerlattice/confirmedResolution';
import {
    ANSWERLATTICE_PROOF_EXAMPLES,
    getAnswerlatticeVerifiedProofEntries,
    isCompleteAnswerlatticeVerifiedProofEntry,
    type AnswerlatticeVerifiedProofEntry,
} from '../../src/data/answerlattice/proofEvidence';
import { renderAnswerlatticePreOnboardingToolPrompt } from '../../src/lib/answerlattice/preOnboardingPrompt';

const fixedNow = new Date('2026-07-16T00:00:00.000Z');
const knowledgeIntakeReviewSource = readFileSync(
    'src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx',
    'utf8',
);
assert.equal(
    knowledgeIntakeReviewSource.includes('<Form.Item name="entityIds" label="Entity IDs">'),
    false,
    'First 10 review must not require owners to paste internal Product Topic IDs',
);
assert.equal(
    knowledgeIntakeReviewSource.includes('entityIds: normalizeEntitySelection(reviewValues.entityIds)'),
    true,
    'First 10 review must preserve searchable multi-select Product Topic values',
);
assert.equal(
    knowledgeIntakeReviewSource.includes("maxHeight: 'calc(100dvh - 200px)'"),
    true,
    'First 10 review must keep the complete draft form reachable inside the viewport',
);
const starters = createAnswerlatticeFirstTrustedAnswerCases([], fixedNow);
assert.equal(starters.length, 10, 'starter pack must contain ten priority questions');
assert.equal(new Set(starters.map(testCase => testCase.id)).size, 10, 'starter IDs must be unique');
assert.equal(starters.every(testCase => AnswerlatticeAnswerTestCaseSchema.safeParse(testCase).success), true, 'every starter must satisfy the runtime Answer Test schema');
assert.equal(starters.every(testCase => testCase.expected.source === 'canonical'), true, 'starter questions must default to governed canonical answers');
assert.equal(starters.filter(testCase => testCase.riskLevel === 'critical').length, 3, 'billing, plan, and cancellation truth must start release-blocking');
assert.equal(countAnswerlatticeFirstTrustedAnswerCases(starters), 10, 'starter progress must count known starter IDs');

const existingId = ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS[0];
const missingStarters = createAnswerlatticeFirstTrustedAnswerCases([existingId], fixedNow);
assert.equal(missingStarters.length, 9, 'existing starter IDs must not be duplicated');
assert.equal(missingStarters.some(testCase => testCase.id === existingId), false, 'deduplication must preserve the existing case');

const productCandidates = {
    candidates: Array.from({ length: ANSWERLATTICE_PRODUCT_STARTER_PACK_SIZE }, (_, index) => ({
        title: `Product question ${index + 1}`,
        question: `How does this product handle workflow ${index + 1}?`,
        proposedAnswer: 'Use the reviewed product workflow.',
        sourceIds: [`kis_${'a'.repeat(28)}`],
        entityIds: [],
        missingEvidence: [],
        reason: 'The selected product source identifies this launch workflow.',
        expectedSource: 'canonical',
        riskLevel: 'standard',
        requiresEscalation: false,
        applicability: { feature: `feature_${index + 1}` },
    })),
};
assert.equal(AnswerlatticeProductStarterPackModelResponseSchema.safeParse(productCandidates).success, true, 'a ten-candidate product pack must satisfy the strict model contract');
assert.equal(AnswerlatticeProductStarterPackModelResponseSchema.safeParse({ candidates: productCandidates.candidates.slice(0, 9) }).success, false, 'a partial product pack must fail closed');
const providerVariation = {
    candidates: productCandidates.candidates.map((candidate, index) => ({
        ...candidate,
        entityIds: index === 0 ? null : candidate.entityIds,
        missingEvidence: index === 1 ? undefined : candidate.missingEvidence,
        applicability: index === 2 ? null : candidate.applicability,
        unexpectedProviderKey: 'discard me',
    })),
    providerMetadata: { ignored: true },
};
const normalizedProviderVariation = AnswerlatticeProductStarterPackModelResponseSchema.parse(providerVariation);
assert.equal(normalizedProviderVariation.candidates.length, 10, 'provider variation must preserve the exact ten-candidate boundary');
assert.deepEqual(normalizedProviderVariation.candidates[0].entityIds, [], 'null provider arrays must normalize to safe empty arrays');
assert.deepEqual(normalizedProviderVariation.candidates[1].missingEvidence, [], 'missing provider arrays must normalize to safe empty arrays');
assert.deepEqual(normalizedProviderVariation.candidates[2].applicability, {}, 'null provider applicability must normalize to safe empty context');
assert.equal('unexpectedProviderKey' in normalizedProviderVariation.candidates[0], false, 'unrecognized provider keys must be stripped before persistence');
assert.equal(isAnswerlatticeProductStarterPackCaseId('product_launch_11'), false, 'a prefixed case outside the exact ten slots must not impersonate the launch pack');
assert.equal(isAnswerlatticeProductStarterPackCaseId('product_launch_custom'), false, 'a custom prefixed case must not impersonate the launch pack');
assert.equal(canGenerateAnswerlatticeProductStarterPack('published'), true, 'published source jobs must remain reusable for the next activation step');
assert.equal(canGenerateAnswerlatticeProductStarterPack('reviewing'), true, 'reviewing source jobs must remain available');
assert.equal(canGenerateAnswerlatticeProductStarterPack('publishing'), false, 'an active publish must block concurrent pack generation');
assert.equal(canGenerateAnswerlatticeProductStarterPack('cancelled'), false, 'cancelled source jobs must fail closed');
assert.equal(canGenerateAnswerlatticeProductStarterPack(undefined), false, 'missing job status must fail closed');

const productCases = starters.map((testCase, index) => ({
    ...testCase,
    id: ANSWERLATTICE_PRODUCT_STARTER_PACK_CASE_IDS[index],
    launchPack: {
        version: 1 as const,
        sourceHash: 'a'.repeat(64),
        reviewItemId: `kii_${index.toString(16).padStart(28, '0')}`,
    },
}));
const linkedProductCase = syncAnswerlatticeLaunchPackCaseFromReview(productCases[0], {
    id: productCases[0].launchPack.reviewItemId,
    title: 'Owner-edited menu input',
    question: 'Which menu files can I upload?',
    entityIds: ['entity_menu_input', 'entity_menu_input'],
    updatedAt: '2026-07-16T01:00:00.000Z',
});
assert.equal(linkedProductCase.title, 'Owner-edited menu input', 'launch review title edits must reach the linked Answer Test');
assert.equal(linkedProductCase.query, 'Which menu files can I upload?', 'launch review question edits must reach the linked Answer Test');
assert.deepEqual(linkedProductCase.relatedEntityIds, ['entity_menu_input'], 'launch review Product Topics must reach the linked Answer Test without duplicates');
assert.equal(linkedProductCase.updatedAt, '2026-07-16T01:00:00.000Z', 'linked Answer Test changes must retain an auditable update time');
assert.deepEqual(
    createAnswerlatticeFirstTrustedAnswerCases(productCases.map(testCase => testCase.id), fixedNow),
    [],
    'the generic fallback must not be added after a product-specific pack exists',
);
const customCase = { ...starters[0], id: 'custom_launch_case' };
const replacedCases = replaceAnswerlatticeFirstTrustedAnswerCases([...starters, customCase], productCases);
assert.equal(replacedCases.length, 11, 'product-specific cases must replace the generic ten without removing custom tests');
assert.equal(replacedCases.some(testCase => testCase.id === customCase.id), true, 'custom Answer Tests must survive product-pack replacement');
assert.equal(countAnswerlatticeFirstTrustedAnswerCases(productCases), 10, 'product-specific slots must satisfy launch progress');
assert.equal(
    countAnswerlatticeFirstTrustedAnswerCases(
        productCases.map((testCase, index) => index === 0 ? { ...testCase, active: false } : testCase),
        { activeOnly: true },
    ),
    9,
    'inactive launch questions must not count toward runnable First 10 proof',
);
assert.equal(
    getAnswerlatticeFirstTrustedAnswerCases([...starters, productCases[0]]).length,
    1,
    'a mixed generic and product set must select one coherent product pack rather than combine both identities',
);
assert.equal(
    countAnswerlatticeFirstTrustedAnswerCases(productCases.map((testCase, index) => (
        index === 0
            ? { ...testCase, launchPack: { ...testCase.launchPack, sourceHash: 'b'.repeat(64) } }
            : testCase
    ))),
    0,
    'product launch slots from different source snapshots must fail closed',
);
assert.equal(
    countAnswerlatticeFirstTrustedAnswerCases(productCases.map((testCase, index) => (
        index === 0
            ? { ...testCase, launchPack: { ...testCase.launchPack, reviewItemId: productCases[1].launchPack.reviewItemId } }
            : testCase
    ))),
    0,
    'product launch slots with duplicate review provenance must fail closed',
);
const editedProductCases = productCases.map((testCase, index) => index === 0 ? { ...testCase, title: 'Owner-edited title' } : testCase);
const sameSourceRefresh = replaceAnswerlatticeFirstTrustedAnswerCases(editedProductCases, productCases);
assert.equal(sameSourceRefresh[0]?.title, 'Owner-edited title', 'cached pack reuse must preserve owner edits');
const changedSourceCases = productCases.map(testCase => ({
    ...testCase,
    launchPack: { ...testCase.launchPack, sourceHash: 'b'.repeat(64) },
}));
const changedSourceRefresh = replaceAnswerlatticeFirstTrustedAnswerCases(editedProductCases, changedSourceCases);
assert.equal(changedSourceRefresh[0]?.title, productCases[0].title, 'changed source hashes must replace only product-pack slots');

const hour = 60 * 60 * 1000;
const metrics = calculateConfirmedResolutionMetrics([
    { createdOnMillis: hour, resolutionSubmittedAtMillis: hour, widgetSessionId: 'session-a', resolutionOutcome: 'resolved' },
    { createdOnMillis: hour * 2, widgetSessionId: 'session-a' },
    { createdOnMillis: hour, resolutionSubmittedAtMillis: hour, widgetSessionId: 'session-b', resolutionOutcome: 'resolved' },
    { createdOnMillis: hour, resolutionSubmittedAtMillis: hour, widgetSessionId: 'session-c', resolutionOutcome: 'not_resolved' },
    { createdOnMillis: hour, resolutionSubmittedAtMillis: hour, resolutionOutcome: 'resolved' },
], 24);
assert.deepEqual(metrics, {
    rate: 75,
    confirmedResolved: 3,
    confirmedNotResolved: 1,
    explicitOutcomeTotal: 4,
    recontactEligible: 2,
    recontactedSameSession: 1,
    observationWindowHours: 24,
});

const outsideWindow = calculateConfirmedResolutionMetrics([
    { createdOnMillis: hour, resolutionSubmittedAtMillis: hour, widgetSessionId: 'session-d', resolutionOutcome: 'resolved' },
    { createdOnMillis: hour * 26, widgetSessionId: 'session-d' },
], 24);
assert.equal(outsideWindow.recontactedSameSession, 0, 'queries outside the observation window must not count as recontact');
assert.equal('withoutObservedRecontact' in outsideWindow, false, 'bounded samples must not claim that no recontact occurred');

assert.equal(ANSWERLATTICE_PROOF_EXAMPLES.every(entry => entry.label.startsWith('Example -')), true, 'public workload examples must identify themselves as examples');
assert.deepEqual(getAnswerlatticeVerifiedProofEntries(), [], 'customer proof must remain empty until consented evidence is registered');
const incompleteProof = {
    id: 'proof-one',
    publicLabel: 'Anonymous SaaS founder',
    verifiedOn: '2026-07-16',
    consentGrantedOn: '2026-07-16',
    consentScope: 'anonymous',
    situation: 'Repeated billing questions',
    answerlattice: 'Reviewed ten questions',
    outcome: 'Reduced repeat founder replies',
    measurementMethod: 'Compared reviewed support questions',
    evidenceSummary: 'Owner-reviewed workload evidence',
    approvedClaims: [],
    sourceRef: '__docs__/answerlattice/private-evidence/example.md',
} satisfies AnswerlatticeVerifiedProofEntry;
assert.equal(isCompleteAnswerlatticeVerifiedProofEntry(incompleteProof), false, 'proof without an approved public claim must fail closed');
assert.equal(isCompleteAnswerlatticeVerifiedProofEntry({
    ...incompleteProof,
    verifiedOn: '2026-02-30',
    approvedClaims: ['Reviewed support workload'],
}), false, 'proof with an impossible calendar date must fail closed');

for (const tool of ['codex', 'cursor', 'claude-code', 'replit', 'lovable'] as const) {
    const prompt = renderAnswerlatticePreOnboardingToolPrompt(tool);
    assert.equal(prompt.includes('Shared Master Prompt'), true, `${tool} package must include the shared master prompt`);
    assert.equal(prompt.includes('Do not include secrets'), true, `${tool} package must preserve private-data boundaries`);
    assert.equal(prompt.includes('not a product integration or endorsement'), true, `${tool} package must not imply an integration`);
}

process.stdout.write('Answerlattice First Trusted Answers contracts passed.\n');
