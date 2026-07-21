#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FLAG = 'ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listSourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const features = read('src/config/features.ts');
const functionsFeatures = read('functions-answerlattice/src/constants/features.ts');
const readme = read('__docs__/answerlattice/native-knowledge-intake-connectors/README.md');
const spec = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_spec.md');
const implementation = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_impl.md');
const firebase = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_firebase.md');
const marketing = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_marketing.md');
const tests = read('__docs__/answerlattice/native-knowledge-intake-connectors/native-knowledge-intake-connectors_test-cases.md');
const tracker = read('__docs__/answerlattice/system-inventory/answerlattice-feature-flow-audit-tracker.md');

assert(features.includes(`${FLAG}: false`), 'native intake connector placeholder must remain disabled');
assert(features.includes('RESERVED ONLY: no app, API, OAuth, credential, provider, sync worker, or'), 'feature comment must state the no-runtime boundary');
assert(!functionsFeatures.includes(FLAG), 'a phantom Functions connector flag must not exist');

const runtimeFlagReferences = [
  ...listSourceFiles('src'),
  ...listSourceFiles('functions-answerlattice/src'),
  ...listSourceFiles('packages/answerlattice-web/src'),
  ...listSourceFiles('public/widget'),
].filter((relativePath) => relativePath !== 'src/config/features.ts')
  .filter((relativePath) => read(relativePath).includes(FLAG));
assert(
  runtimeFlagReferences.length === 0,
  `reserved native intake connector flag must have no runtime consumers: ${runtimeFlagReferences.join(', ')}`,
);

[
  'src/app/api/answerlattice/knowledge-intake/connectors',
  'src/app/api/answerlattice/knowledge-intake/oauth',
  'src/lib/answerlattice/nativeIntakeConnectors',
  'src/lib/answerlattice/intakeConnectorCredentials',
  'functions-answerlattice/src/answerlattice/nativeIntakeConnectors',
  'functions-answerlattice/src/answerlattice/intakeConnectorSync',
].forEach((relativePath) => {
  assert(!exists(relativePath), `native connector runtime must remain absent: ${relativePath}`);
});

const publicCopy = [
  ...listSourceFiles('src/app/sites/answerlattice'),
  ...listSourceFiles('src/content/answerlatticePublic'),
].map((relativePath) => read(relativePath)).join('\n');
[
  'Connect Notion',
  'Connect Google Drive',
  'Sync your GitHub',
  'Native connector import',
].forEach((claim) => {
  assert(!publicCopy.toLowerCase().includes(claim.toLowerCase()), `public copy must not claim ${claim}`);
});

assert(readme.includes('DO NOT BUILD NOW - RESERVED PLACEHOLDER ONLY'), 'connector README decision boundary');
assert(spec.includes('one provider only'), 'connector future-scope limit');
assert(implementation.includes('No runtime implementation exists'), 'connector implementation absence');
assert(firebase.includes('Current Firebase operations: zero'), 'connector zero-cost boundary');
assert(marketing.includes('No connector claim is approved'), 'connector marketing hold');
assert(tests.includes('runtimeFlagReferences.length === 0'), 'connector no-consumer test contract');
assert(
  tracker.includes('### Feature 41 — Native Knowledge Intake Connectors\n\n**Status:** Local source complete'),
  'connector feature tracker completion state',
);

console.log('Answerlattice native Knowledge Intake connector boundary passed.');
