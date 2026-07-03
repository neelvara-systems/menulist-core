#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function run(label, command, args) {
  console.log(`\n[functions-deploy-preflight] ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  assert(
    result.status === 0 && !result.signal,
    `${label} failed${result.signal ? ` with signal ${result.signal}` : ` with status ${result.status}`}`,
  );
}

const runbook = read('__docs__/production-readiness/external-certification-runbook.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const launchPrerequisites = read('__docs__/production-readiness/launch-prerequisites.md');

assertIncludes(
  runbook,
  'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --non-interactive',
  'Gate 1 current blocked function deploy set',
);
assertIncludes(
  runbook,
  'It does not prove Firebase CLI authentication, project IAM, enabled Google Cloud APIs, Secret Manager access, function upload, deployed revisions, scheduler execution, callable behavior, trigger delivery, or live production effect.',
  'Gate 1 external-proof boundary',
);
assertIncludes(
  launchPrerequisites,
  'Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/menulist-qa had HTTP Error: 403, The caller does not have permission',
  'Launch prerequisites current Cloud Resource Manager blocker',
);
assertIncludes(
  audit,
  'Cloud Resource Manager HTTP 403 caller permission before upload',
  'Production audit current Functions deploy blocker',
);

run('functions lint', 'npm', ['--prefix', 'functions', 'run', 'lint']);
run('functions build', 'npm', ['--prefix', 'functions', 'run', 'build']);

console.log('\nFunctions deploy preflight verifier passed');
