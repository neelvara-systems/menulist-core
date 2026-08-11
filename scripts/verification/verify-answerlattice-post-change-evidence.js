const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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
const contracts = read('src/lib/answerlattice/postChangeEvidence.ts');
const server = read('src/lib/answerlattice/postChangeEvidenceServer.ts');
const client = read('src/lib/answerlattice/postChangeEvidenceClient.ts');
const route = read('src/app/api/answerlattice/post-change-evidence/route.ts');
const component = read('src/components/templates/answerlattice/governance/PostChangeSupportEvidenceReview.tsx');
const frictionTab = read('src/components/templates/answerlattice/governance/FrictionTab.tsx');
const packageJson = read('package.json');
const dedicatedIndexes = JSON.parse(read('firestore-answerlattice.indexes.json'));
const sharedIndexes = JSON.parse(read('firestore.indexes.json'));

const hasOrderedIndex = (manifest, collectionGroup, expectedFields) => (
  manifest.indexes.some(index => (
    index.collectionGroup === collectionGroup
    && expectedFields.every(expected => index.fields.some(field => (
      field.fieldPath === expected.fieldPath && field.order === expected.order
    )))
  ))
);

assertIncludes(flags, 'ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW: true', 'Feature flag');
assertIncludes(contracts, 'ANSWERLATTICE_POST_CHANGE_WINDOW_DAYS = 14', 'Complete-window contract');
assertIncludes(contracts, 'ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS = 5', 'Minimum baseline contract');
assertIncludes(contracts, 'ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT = 200', 'Source cap contract');
assertIncludes(contracts, "'outside_retention',", 'Retention status');
assertIncludes(contracts, "'source_window_saturated',", 'Saturation status');
assertIncludes(contracts, "'lower_observed',", 'Observed direction vocabulary');
assertIncludes(contracts, 'does not prove that the selected change caused the result', 'Causality limitation');
assertNotIncludes(contracts, 'DB_COLLECTIONS', 'Pure contract database boundary');
assertNotIncludes(contracts, 'generateContent', 'Pure contract model boundary');

assertIncludes(route, 'withAuth(async (request: NextRequest, session)', 'Authenticated route');
assertIncludes(route, 'applyAnswerlatticeDashboardReadRateLimit(', 'Dashboard read rate limit');
assertIncludes(route, 'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE', 'Governance permission');
assertIncludes(route, 'ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS', 'Private response headers');
assertIncludes(route, "const ALLOWED_QUERY_KEYS = new Set(['mode', 'changeType', 'changeId'])", 'Strict query allowlist');
assertIncludes(route, 'tId: permission.access.scope.tenantId', 'Server-derived tenant scope');
assertIncludes(route, 'sId: permission.access.scope.storeId', 'Server-derived workspace scope');
assertNotIncludes(route, "searchParams.get('tId')", 'No client tenant scope');
assertNotIncludes(route, "searchParams.get('sId')", 'No client workspace scope');

assertIncludes(server, ".where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)", 'Exact product query scope');
assertIncludes(server, ".where('tId', '==', scope.tId)", 'Exact tenant query scope');
assertIncludes(server, ".where('sId', '==', scope.sId)", 'Exact workspace query scope');
assertIncludes(server, '.limit(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT + 1)', 'Cap-plus-one saturation read');
assertIncludes(server, ".select('pId', 'tId', 'sId', 'entityId', 'type', 'timestamp')", 'Signal field mask');
assertIncludes(server, "if (plan.status === 'waiting_for_post_window' || plan.status === 'outside_retention')", 'Pre-query window gate');
const beforeQueryIndex = server.indexOf('const beforeResult = await querySignalWindow');
const afterQueryIndex = server.indexOf('const afterResult = await querySignalWindow');
assert(beforeQueryIndex >= 0 && afterQueryIndex > beforeQueryIndex, 'signal windows must be queried sequentially');
for (const forbidden of ['.add(', '.set(', '.update(', '.delete(', 'generateContent(', 'getUpstash', 'Storage']) {
  assertNotIncludes(server, forbidden, 'Read-only server boundary');
}

for (const [manifest, label] of [
  [dedicatedIndexes, 'Dedicated indexes'],
  [sharedIndexes, 'Shared indexes'],
]) {
  assert(hasOrderedIndex(manifest, 'answerlattice_releases', [
    { fieldPath: 'pId', order: 'ASCENDING' },
    { fieldPath: 'tId', order: 'ASCENDING' },
    { fieldPath: 'sId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'versionNormalized', order: 'DESCENDING' },
  ]), `${label} must retain the active release candidate query`);
  assert(hasOrderedIndex(manifest, 'answerlattice_mutationProposals', [
    { fieldPath: 'pId', order: 'ASCENDING' },
    { fieldPath: 'tId', order: 'ASCENDING' },
    { fieldPath: 'sId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'impactTracked', order: 'ASCENDING' },
    { fieldPath: 'implementedOn', order: 'ASCENDING' },
  ]), `${label} must retain the implemented correction candidate query`);
  assert(hasOrderedIndex(manifest, 'answerlattice_signalEvents', [
    { fieldPath: 'pId', order: 'ASCENDING' },
    { fieldPath: 'tId', order: 'ASCENDING' },
    { fieldPath: 'sId', order: 'ASCENDING' },
    { fieldPath: 'entityId', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'ASCENDING' },
  ]), `${label} must retain the direct-entity signal window query`);
}

assertIncludes(client, "cache: 'no-store'", 'No browser fetch cache');
assertIncludes(client, "credentials: 'same-origin'", 'Same-origin credentials');
assertIncludes(client, "redirect: 'manual'", 'Manual redirect boundary');
assertIncludes(client, 'readJsonResponseWithLimit<unknown>', 'Bounded response parser');
assertIncludes(client, 'AnswerlatticePostChangeReviewResponseSchema.safeParse(payload)', 'Strict browser admission');

assertIncludes(component, 'onClick={loadCandidates}', 'Explicit candidate loading');
assertIncludes(component, 'onClick={compareEvidence}', 'Explicit comparison loading');
assertIncludes(component, 'Counts show association, not cause.', 'Owner causality copy');
assertIncludes(component, "const isNarrow = screens.md !== true", 'Responsive control stacking');
assertIncludes(component, 'style={{ minHeight: 44 }}', '44px primary touch target');
assertIncludes(component, 'size="large"', 'Large select touch target');
assertIncludes(component, 'candidateRequestRef.current !== requestId', 'Stale candidate response rejection');
assertIncludes(component, 'reviewRequestRef.current !== requestId', 'Stale review response rejection');
assertNotIncludes(component, 'loadCandidates();', 'No mount-time candidate fetch');
assertNotIncludes(component, 'setInterval(', 'No background polling');
assertNotIncludes(component, 'ContextualStateIllustration', 'Plain governance states');
assertIncludes(frictionTab, '<PostChangeSupportEvidenceReview key={`${tId}:${sId}`} tId={tId} sId={sId} />', 'Product Friction placement');
assertIncludes(frictionTab, 'ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW', 'UI feature gate');
assertIncludes(packageJson, 'verify:answerlattice-post-change-evidence', 'Focused verifier script');

const docsDir = path.join(ROOT, '__docs__/answerlattice/post-change-support-evidence-review');
[
  'README.md',
  'post-change-support-evidence-review_spec.md',
  'post-change-support-evidence-review_impl.md',
  'post-change-support-evidence-review_marketing.md',
  'post-change-support-evidence-review_website.md',
  'post-change-support-evidence-review_helpdoc.md',
  'post-change-support-evidence-review_firebase.md',
  'post-change-support-evidence-review_mobile-support.md',
  'post-change-support-evidence-review_test-cases.md',
  'post-change-support-evidence-review_validation.md',
].forEach((fileName) => {
  assert(fs.existsSync(path.join(docsDir, fileName)), `Missing feature document ${fileName}`);
});

const firebaseDoc = read('__docs__/answerlattice/post-change-support-evidence-review/post-change-support-evidence-review_firebase.md');
assertIncludes(firebaseDoc, '0 incremental', 'Zero mount-read contract');
assertIncludes(firebaseDoc, '403', 'Worst-case exact comparison read ceiling');
assertIncludes(firebaseDoc, 'No Firestore write', 'No write boundary');
assertIncludes(firebaseDoc, 'No Storage, Redis, model', 'No external cost boundary');
assertIncludes(firebaseDoc, 'Do not add Redis or Firestore caching at launch', 'Cache decision');

process.stdout.write('Answerlattice post-change support evidence verifier passed.\n');
