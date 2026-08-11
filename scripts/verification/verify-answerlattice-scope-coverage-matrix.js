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
const contracts = read('src/lib/answerlattice/scopeCoverageMatrix.ts');
const managementRoute = read('src/app/api/answerlattice/answer-tests/route.ts');
const runRoute = read('src/app/api/answerlattice/answer-tests/run/route.ts');
const releaseRoute = read('src/app/api/answerlattice/answer-tests/release-check/route.ts');
const client = read('src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx');
const packageJson = read('package.json');

assertIncludes(flags, 'ENABLE_ANSWERLATTICE_SCOPE_COVERAGE_MATRIX: true', 'Scope coverage flag');
assertIncludes(contracts, "'covered',", 'Covered state');
assertIncludes(contracts, "'needs_review',", 'Review state');
assertIncludes(contracts, "'missing',", 'Missing state');
assertIncludes(contracts, "'unverified',", 'Unverified state');
assertIncludes(contracts, "'other_route',", 'Intentional alternate-route state');
assertIncludes(contracts, 'answerlatticeAnswerTestSourceVersionsEqual(', 'Source-version freshness');
assertIncludes(contracts, 'caseUpdatedAtMillis <= run.completedAtMillis', 'Per-case edit invalidation');
assertIncludes(contracts, "testCase.expected.source !== 'canonical'", 'Non-canonical boundary');
assertIncludes(contracts, 'result.passed && answerId', 'Canonical identity coverage boundary');
assertNotIncludes(contracts, 'DB_COLLECTIONS', 'Pure projection database boundary');
assertNotIncludes(contracts, 'generateContent', 'No matrix model call');

for (const [route, label] of [
  [managementRoute, 'management'],
  [runRoute, 'run'],
  [releaseRoute, 'release check'],
]) {
  assertIncludes(route, "searchParams.get('includeScopeCoverage') === '1'", `${label} opt-in`);
  assertIncludes(route, 'buildAnswerlatticeScopeCoverageMatrix(', `${label} projection`);
  assertIncludes(route, 'scopeCoverageMatrix', `${label} response`);
}
assertIncludes(managementRoute, 'includeLaunchProof || includeScopeCoverage', 'Shared compact source-version read');
assertIncludes(client, "const answerTestProofQuery = scopeCoverageEnabled", 'Matrix-only request query');
assertIncludes(client, 'parseAnswerlatticeScopeCoverageMatrixForClient(', 'Strict browser admission');
assertIncludes(client, 'name="state" label="Product state"', 'Product-state editor');
assertIncludes(client, 'name="version"', 'Product-version editor');
assertIncludes(client, 'normalizeAnswerlatticeVersionLabel(value)', 'Product-version validation');
assertIncludes(client, 'title="Scope coverage"', 'Owner matrix placement');
assertIncludes(client, "value?.trim() || 'Not specified'", 'Unspecified-context evidence label');
assertNotIncludes(client, 'Empty context fields mean any value', 'Unsupported all-context claim');
assertIncludes(client, "scroll={{ x: 1270 }}", 'Stable desktop matrix width');
assertIncludes(client, 'Edit question and context', 'Existing editor handoff');
assertIncludes(client, "executeRun('canonical_only', { caseIds: [row.caseId] })", 'Existing single-case run handoff');
assertIncludes(client, 'ICON_ACTION_BUTTON_STYLE', '44px icon action contract');
assertIncludes(packageJson, 'verify:answerlattice-scope-coverage-matrix', 'Focused verifier script');

const docsDir = path.join(ROOT, '__docs__/answerlattice/scope-coverage-matrix');
[
  'README.md',
  'scope-coverage-matrix_spec.md',
  'scope-coverage-matrix_impl.md',
  'scope-coverage-matrix_marketing.md',
  'scope-coverage-matrix_website.md',
  'scope-coverage-matrix_helpdoc.md',
  'scope-coverage-matrix_firebase.md',
  'scope-coverage-matrix_mobile-support.md',
  'scope-coverage-matrix_test-cases.md',
  'scope-coverage-matrix_validation.md',
].forEach((fileName) => {
  assert(fs.existsSync(path.join(docsDir, fileName)), `Missing feature document ${fileName}`);
});

const firebaseDoc = read('__docs__/answerlattice/scope-coverage-matrix/scope-coverage-matrix_firebase.md');
assertIncludes(firebaseDoc, 'one additional compact read', 'Incremental read cost');
assertIncludes(firebaseDoc, 'No new Firestore collection', 'No new collection boundary');
assertIncludes(firebaseDoc, 'No real-time listener', 'No listener boundary');
assertIncludes(firebaseDoc, 'No scheduler', 'No scheduler boundary');
assertIncludes(firebaseDoc, 'No model', 'No model-call boundary');

process.stdout.write('Answerlattice scope coverage matrix verifier passed.\n');
