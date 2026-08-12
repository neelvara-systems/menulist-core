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
const functionsPackage = JSON.parse(read('functions/package.json'));
const firebaserc = JSON.parse(read('.firebaserc'));

assert(
  firebaserc.projects.default === 'menulist-qa',
  '.firebaserc default project must remain menulist-qa',
);
assert(
  firebaserc.projects['menulist-qa'] === undefined,
  '.firebaserc must not define a self-alias for menulist-qa because Firebase CLI treats .env.menulist-qa as both project-id and alias dotenv files',
);

assertIncludes(
  runbook,
  'firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive',
  'Gate 1 current blocked function deploy set',
);
assertIncludes(
  runbook,
  'It does not prove Firebase CLI authentication, project IAM, enabled Google Cloud APIs, Secret Manager access, function upload, deployed revisions, scheduler execution, callable behavior, trigger delivery, or live production effect.',
  'Gate 1 external-proof boundary',
);
assertIncludes(
  launchPrerequisites,
  'Error: Failed to authenticate, have you run firebase login?',
  'Launch prerequisites current Firebase CLI authentication blocker',
);
assertIncludes(
  audit,
  'The current Firebase CLI environment is not authenticated, so current MenuList QA deploy attempts stop before predeploy or upload with `Error: Failed to authenticate, have you run firebase login?`',
  'Production audit current Functions deploy blocker',
);
assertIncludes(
  runbook,
  'Current operator boundary refreshed August 1, 2026: Firebase CLI is not authenticated',
  'Gate 1 current Firebase CLI authentication blocker',
);
assertIncludes(
  runbook,
  'The default `functions/package.json` `deploy` script intentionally fails closed',
  'Gate 1 Functions package deploy script boundary',
);
assert(
  functionsPackage.scripts.deploy.includes('Use npm run deploy:menulist-qa after root npm run verify:functions-deploy-preflight'),
  'Functions package default deploy script must fail closed with the scoped QA deploy instruction',
);
assert(
  functionsPackage.scripts['deploy:menulist-qa'] === 'firebase deploy --project menulist-qa --config ../firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive',
  'Functions package scoped QA deploy script must match Gate 1 current target set',
);
assert(
  !functionsPackage.scripts.deploy.includes('firebase deploy --only functions'),
  'Functions package default deploy script must not run a broad Functions deploy',
);

run('functions lint', 'npm', ['--prefix', 'functions', 'run', 'lint']);
run('functions build', 'npm', ['--prefix', 'functions', 'run', 'build']);

console.log('\nFunctions deploy preflight verifier passed');
