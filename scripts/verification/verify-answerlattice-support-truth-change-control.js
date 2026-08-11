const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertIncludes = (content, value, label) => {
  assert(content.includes(value), `${label} must include ${value}`);
};
const assertNotIncludes = (content, value, label) => {
  assert(!content.includes(value), `${label} must not include ${value}`);
};

const flags = read('src/config/features.ts');
const contracts = read('src/lib/answerlattice/supportTruthChangeControl.ts');
const server = read('src/lib/answerlattice/supportTruthChangeControlServer.ts');
const releaseContracts = read('src/lib/answerlattice/releaseContracts.ts');
const releaseServer = read('src/lib/answerlattice/releaseServer.ts');
const releaseClient = read('src/database/answerlattice/releases.ts');
const changelogEditor = read('src/components/templates/platform/changelog/addEditChangelog.tsx');
const intake = read('src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx');
const packageJson = read('package.json');

assertIncludes(
  flags,
  'ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_CHANGE_CONTROL: true',
  'Support truth change-control flag',
);
assertIncludes(contracts, 'ANSWERLATTICE_SOURCE_FRESHNESS_LOOKUP_LIMIT = 50', 'Source lookup cap');
assertIncludes(contracts, 'ANSWERLATTICE_SURFACE_REVIEW_ITEM_LIMIT = 10', 'Surface response cap');
assertIncludes(contracts, "mappingScope: z.literal('direct_canonical_evidence_ids')", 'Direct source evidence boundary');
assertIncludes(contracts, "mappingScope: z.literal('direct_surface_entity_links')", 'Direct surface evidence boundary');
assertIncludes(contracts, "proofScope: z.literal('answerlattice_control_plane_only')", 'Propagation proof boundary');
assertIncludes(server, '{ fieldMask: [...SOURCE_WATCH_FIELDS] }', 'Metadata-only source read');
assertIncludes(server, "'governance.approvalStatus'", 'Approval-only governance field mask');
assertIncludes(server, "'governance.conflictSourceIds'", 'Conflict-only governance field mask');
assertNotIncludes(server, "    'governance',", 'Whole governance map read');
assertIncludes(server, 'getContextContentSummaryDocId', 'Compact surface summary read');
assertIncludes(server, 'getAnswerlatticeSourceVersionsDocId', 'Source-version control read');
assertIncludes(server, 'getAnswerlatticeBundleManifestDocId', 'Bundle-manifest control read');
assertIncludes(releaseContracts, 'changeControl: AnswerlatticeSupportTruthChangeControlSchema.optional()', 'Additive release response');
assertIncludes(releaseContracts, 'ANSWERLATTICE_RELEASE_ACTION_RESPONSE_MAX_BYTES = 256 * 1024', 'Shared release response cap');
assertIncludes(releaseClient, 'ANSWERLATTICE_RELEASE_ACTION_RESPONSE_MAX_BYTES', 'Bounded release response reader');
assertIncludes(releaseServer, 'loadAnswerlatticeSupportTruthChangeControl', 'Release preview wiring');
assertIncludes(releaseServer, 'normalizeAffectedAnswerEvidenceSourceIds', 'Non-blocking legacy evidence normalization');
assertIncludes(releaseServer, 'buildReleaseImpactFingerprint(action.releaseId, release, affectedAnswers)', 'Existing activation fingerprint');
assertIncludes(changelogEditor, 'Source freshness and conflicts', 'Owner source review');
assertIncludes(changelogEditor, 'more sampled source records', 'Bounded actionable source sample');
assertIncludes(changelogEditor, 'Cross-surface dependency review', 'Owner surface review');
assertIncludes(changelogEditor, 'Truth propagation proof', 'Owner distribution review');
assertIncludes(changelogEditor, 'ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE', 'Source handoff');
assertIncludes(changelogEditor, 'ANSWERLATTICE_ROUTES.PRODUCT_SURFACES', 'Surface handoff');
assertIncludes(changelogEditor, 'ANSWERLATTICE_ROUTES.ACTIVATION', 'Activation handoff');
assertIncludes(intake, 'sourceGovernanceSummary', 'Zero-read Knowledge Intake freshness summary');
assertIncludes(packageJson, 'test:answerlattice-support-truth-change-control', 'Focused contract test');

const docsDir = path.join(ROOT, '__docs__/answerlattice/support-truth-change-control');
[
  'README.md',
  'support-truth-change-control_spec.md',
  'support-truth-change-control_impl.md',
  'support-truth-change-control_marketing.md',
  'support-truth-change-control_website.md',
  'support-truth-change-control_helpdoc.md',
  'support-truth-change-control_firebase.md',
  'support-truth-change-control_mobile-support.md',
  'support-truth-change-control_test-cases.md',
  'support-truth-change-control_validation.md',
].forEach((fileName) => {
  assert(fs.existsSync(path.join(docsDir, fileName)), `Missing feature document ${fileName}`);
});

const firebaseDoc = read('__docs__/answerlattice/support-truth-change-control/support-truth-change-control_firebase.md');
assertIncludes(firebaseDoc, 'No new Firestore collection', 'Firebase collection boundary');
assertIncludes(firebaseDoc, 'listener, or scheduler', 'Firebase listener boundary');
assertIncludes(firebaseDoc, 'Preview performs zero writes', 'Preview write boundary');

process.stdout.write('Answerlattice support truth change-control verifier passed.\n');
