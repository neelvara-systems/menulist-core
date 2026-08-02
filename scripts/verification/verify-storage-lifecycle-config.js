#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const lifecyclePath = path.join(repoRoot, 'infra/storage/menulist-storage-lifecycle.json');
const trackerPath = path.join(repoRoot, '__docs__/production-readiness/infrastructure-risk-tracker.md');
const launchPath = path.join(repoRoot, '__docs__/production-readiness/launch-prerequisites.md');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const lifecycle = JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
const rules = Array.isArray(lifecycle.rule) ? lifecycle.rule : [];
const coldlineRule = rules.find((rule) => rule?.action?.type === 'SetStorageClass');

assert(rules.length === 1, 'MenuList lifecycle config keeps one scoped rule');
assert(Boolean(coldlineRule), 'MenuList lifecycle config sets a storage class');
assert(coldlineRule?.action?.storageClass === 'COLDLINE', 'MenuList lifecycle config transitions to Coldline');
assert(coldlineRule?.condition?.age === 365, 'MenuList lifecycle config transitions legacy extraction uploads after 365 days');
assert(
  Array.isArray(coldlineRule?.condition?.matchesPrefix)
    && coldlineRule.condition.matchesPrefix.length === 1
    && coldlineRule.condition.matchesPrefix[0] === 'MenuListAi/project/files/',
  'MenuList lifecycle config is scoped to legacy extraction upload prefix',
);
assert(!rules.some((rule) => rule?.action?.type === 'Delete'), 'MenuList lifecycle config does not delete owner/source uploads');

const tracker = fs.readFileSync(trackerPath, 'utf8');
[
  'infra/storage/menulist-storage-lifecycle.json',
  'SetStorageClass',
  'COLDLINE',
  'pending bucket lifecycle apply',
].forEach((token) => {
  assert(tracker.includes(token), `infrastructure risk tracker documents lifecycle token ${token}`);
});

const launchPrereqs = fs.readFileSync(launchPath, 'utf8');
[
  'Step 2D: Apply Cloud Storage Lifecycle Config',
  'gcloud storage buckets update gs://menulist-qa.appspot.com --lifecycle-file=infra/storage/menulist-storage-lifecycle.json',
  'gcloud storage buckets update gs://menulist.appspot.com --lifecycle-file=infra/storage/menulist-storage-lifecycle.json',
  'gcloud storage buckets describe gs://menulist-qa.appspot.com --format=json',
].forEach((token) => {
  assert(launchPrereqs.includes(token), `launch prerequisites document lifecycle command ${token}`);
});

const packageJson = JSON.parse(read('package.json'));
assert(
  packageJson.scripts?.['verify:storage-lifecycle'] === 'node scripts/verification/verify-storage-lifecycle-config.js',
  'package.json exposes verify:storage-lifecycle',
);

if (failures > 0) {
  console.error(`\nStorage lifecycle verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nStorage lifecycle verification passed.');
