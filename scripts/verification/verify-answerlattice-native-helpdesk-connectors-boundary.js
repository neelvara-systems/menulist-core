#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PROVIDERS = ['zendesk', 'intercom', 'freshdesk', 'helpscout', 'help-scout', 'jira'];

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

const appFeatures = read('src/config/features.ts').toLowerCase();
const functionsFeatures = read('functions-answerlattice/src/constants/features.ts').toLowerCase();
const sourceFiles = [
  ...listSourceFiles('src'),
  ...listSourceFiles('functions-answerlattice/src'),
  ...listSourceFiles('packages/answerlattice-web/src'),
  ...listSourceFiles('public/widget'),
];
const sourceNames = sourceFiles.map((relativePath) => relativePath.toLowerCase());
const runtimeSource = sourceFiles.map((relativePath) => read(relativePath)).join('\n').toLowerCase();
const nonPublicRuntimeSource = sourceFiles
  .filter((relativePath) => !relativePath.startsWith('src/app/sites/answerlattice/'))
  .filter((relativePath) => !relativePath.startsWith('src/content/answerlatticePublic/'))
  .map((relativePath) => read(relativePath))
  .join('\n')
  .toLowerCase();
const readme = read('__docs__/answerlattice/native-helpdesk-and-jira-connectors/README.md');
const implementation = read('__docs__/answerlattice/native-helpdesk-and-jira-connectors/native-helpdesk-and-jira-connectors_impl.md');
const firebase = read('__docs__/answerlattice/native-helpdesk-and-jira-connectors/native-helpdesk-and-jira-connectors_firebase.md');
const marketing = read('__docs__/answerlattice/native-helpdesk-and-jira-connectors/native-helpdesk-and-jira-connectors_marketing.md');
const tests = read('__docs__/answerlattice/native-helpdesk-and-jira-connectors/native-helpdesk-and-jira-connectors_test-cases.md');
const tracker = read('__docs__/answerlattice/system-inventory/answerlattice-feature-flow-audit-tracker.md');
const publicCopy = [
  ...listSourceFiles('src/app/sites/answerlattice'),
  ...listSourceFiles('src/content/answerlatticePublic'),
].map((relativePath) => read(relativePath)).join('\n').toLowerCase();

PROVIDERS.forEach((provider) => {
  assert(
    !appFeatures.includes(`enable_answerlattice_${provider.replace('-', '_')}`),
    `provider-specific app flag must remain absent: ${provider}`,
  );
  assert(
    !functionsFeatures.includes(`enable_answerlattice_${provider.replace('-', '_')}`),
    `provider-specific Functions flag must remain absent: ${provider}`,
  );
  assert(
    !sourceNames.some((relativePath) => relativePath.includes(provider)),
    `provider-named runtime source must remain absent: ${provider}`,
  );
  assert(
    !nonPublicRuntimeSource.includes(provider),
    `provider-specific logic must not hide in a generic runtime source: ${provider}`,
  );
});

[
  'src/app/api/answerlattice/connectors',
  'src/app/api/answerlattice/integrations/jira',
  'src/app/api/answerlattice/integrations/zendesk',
  'src/lib/answerlattice/helpdeskConnectors',
  'functions-answerlattice/src/answerlattice/helpdeskConnectors',
  'functions-answerlattice/src/integrations/jira',
  'functions-answerlattice/src/integrations/zendesk',
].forEach((relativePath) => {
  assert(!exists(relativePath), `native helpdesk connector runtime must remain absent: ${relativePath}`);
});

[
  'answerlattice_zendesk_client_secret',
  'answerlattice_intercom_access_token',
  'answerlattice_freshdesk_api_key',
  'answerlattice_helpscout_client_secret',
  'answerlattice_jira_api_token',
].forEach((credentialName) => {
  assert(!runtimeSource.includes(credentialName), `provider credential contract must remain absent: ${credentialName}`);
});

[
  'connect zendesk',
  'connect intercom',
  'connect freshdesk',
  'connect help scout',
  'connect jira',
  'sync zendesk',
  'sync intercom',
].forEach((claim) => {
  assert(!publicCopy.includes(claim), `public copy must not claim provider availability: ${claim}`);
});

[
  'native zendesk',
  'native intercom',
  'native freshdesk',
  'native help scout',
  'native jira',
  'zendesk connector',
  'intercom connector',
  'freshdesk connector',
  'help scout connector',
  'jira connector',
].forEach((claim) => {
  assert(!publicCopy.includes(claim), `public copy must not imply a native connector: ${claim}`);
});

assert(readme.includes('DO NOT BUILD NOW'), 'connector README decision boundary');
assert(readme.includes('At least three paying workspaces request the same provider'), 'connector demand gate');
assert(readme.includes('Attachments, internal notes, requester profiles, and unrestricted conversation history stay excluded'), 'connector sensitive-data boundary');
assert(implementation.includes('No runtime implementation exists'), 'connector implementation absence');
assert(firebase.includes('operation count: zero'), 'connector zero-operation boundary');
assert(marketing.includes('Do not claim native Zendesk'), 'connector marketing hold');
assert(tests.includes('No provider-specific app or Functions feature flag exists'), 'connector absence test contract');
assert(
  tracker.includes('### Feature 43 — Native Zendesk, Intercom, Freshdesk, Help Scout, and Jira Connectors\n\n**Status:** Local source complete'),
  'connector feature tracker completion state',
);

console.log('Answerlattice native helpdesk and Jira connector boundary passed.');
