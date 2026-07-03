#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SELF_SCRIPT = 'verify:production-readiness-local';
const LOCAL_READINESS_BOUNDARY =
  'local source gate only; does not run Next.js production build, Firebase deploy, Vercel deploy, provider smoke, browser/device QA, live Firestore/Storage writes, or production-host behavior.';

function readPackageJson() {
  return require(path.join(ROOT, 'package.json'));
}

function runCheck(label, command, args) {
  console.log(`\n[local-readiness] ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  return {
    label,
    status: result.status,
    signal: result.signal,
  };
}

function isPassing(result) {
  return result.status === 0 && !result.signal;
}

const packageJson = readPackageJson();
const verifyScripts = Object.keys(packageJson.scripts || {})
  .filter((name) => name.startsWith('verify:') && name !== SELF_SCRIPT)
  .sort();

console.log(`[local-readiness] boundary: ${LOCAL_READINESS_BOUNDARY}`);

const checks = [
  ...verifyScripts.map((scriptName) => ({
    label: scriptName,
    command: 'npm',
    args: ['run', scriptName],
  })),
  {
    label: 'docs:check-links',
    command: 'npm',
    args: ['run', 'docs:check-links'],
  },
  {
    label: 'typecheck',
    command: 'npx',
    args: ['tsc', '--noEmit', '--incremental', 'false', '--pretty', 'false'],
  },
  {
    label: 'lint',
    command: 'npm',
    args: ['run', 'lint'],
  },
  {
    label: 'git diff --check',
    command: 'git',
    args: ['diff', '--check'],
  },
];

const results = [];

for (const check of checks) {
  const result = runCheck(check.label, check.command, check.args);
  results.push(result);
  if (!isPassing(result)) break;
}

const passedCount = results.filter(isPassing).length;
const allPassed = passedCount === checks.length;

console.log('\n[local-readiness-summary]');
for (const result of results) {
  const status = isPassing(result) ? 'PASS' : 'FAIL';
  const details = result.signal
    ? ` signal=${result.signal}`
    : result.status !== 0
      ? ` status=${result.status}`
      : '';
  console.log(`${status} ${result.label}${details}`);
}
console.log(`[local-readiness-summary] ${passedCount}/${checks.length} checks passed`);
console.log(`[local-readiness-summary] child verify scripts: ${verifyScripts.length}`);
console.log(`[local-readiness-summary] boundary: ${LOCAL_READINESS_BOUNDARY}`);

if (!allPassed) {
  process.exit(1);
}
