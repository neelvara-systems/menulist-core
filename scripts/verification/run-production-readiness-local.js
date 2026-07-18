#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SELF_SCRIPT = 'verify:production-readiness-local';
const LOCAL_READINESS_BOUNDARY =
  'local source gate only; does not run Next.js production build, Firebase deploy, Vercel deploy, provider smoke, browser/device QA, live Firestore/Storage writes, or production-host behavior.';
const RETRY_ONCE_VERIFY_SCRIPTS = new Set([
  'verify:menu-extraction-pipeline',
  'verify:shared-kb-generation-boundary',
]);
const listOnly = process.argv.slice(2).includes('--list');

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listProcesses() {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,command='], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) return [];
  return result.stdout
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3],
      };
    })
    .filter(Boolean);
}

function getRetryableEmulatorProcessIds() {
  const processes = listProcesses();
  const roots = new Set();
  for (const item of processes) {
    const command = item.command || '';
    if (
      (command.includes('firebase emulators:exec') && command.includes('--project demo-'))
      || (command.includes('cloud-firestore-emulator') && command.includes('--project_id demo-'))
    ) {
      roots.add(item.pid);
    }
  }

  const processIds = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of processes) {
      if (!processIds.has(item.pid) && processIds.has(item.ppid)) {
        processIds.add(item.pid);
        changed = true;
      }
    }
  }
  processIds.delete(process.pid);
  return Array.from(processIds).filter(pid => Number.isInteger(pid) && pid > 1);
}

function cleanupRetryableEmulators(reason) {
  const processIds = getRetryableEmulatorProcessIds();
  if (!processIds.length) return;

  console.log(
    `[local-readiness] cleaning ${processIds.length} lingering demo Firebase emulator process(es) before ${reason}.`,
  );
  spawnSync('kill', ['-TERM', ...processIds.map(String)], { cwd: ROOT });
  sleep(1500);

  const remaining = getRetryableEmulatorProcessIds().filter(pid => processIds.includes(pid));
  if (remaining.length) {
    console.log(
      `[local-readiness] force-cleaning ${remaining.length} demo Firebase emulator process(es) still running after TERM.`,
    );
    spawnSync('kill', ['-KILL', ...remaining.map(String)], { cwd: ROOT });
    sleep(500);
  }
}

function readPackageJson() {
  return require(path.join(ROOT, 'package.json'));
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function getLocalReadinessEnvironment() {
  const environment = { ...process.env };
  delete environment.GOOGLE_APPLICATION_CREDENTIALS;
  return environment;
}

function runCheck(label, command, args, attempt = 1) {
  const attemptLabel = attempt > 1 ? `${label} retry ${attempt}` : label;
  console.log(`\n[local-readiness] ${attemptLabel}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: getLocalReadinessEnvironment(),
    stdio: 'inherit',
  });

  return {
    label,
    status: result.status,
    signal: result.signal,
    attempts: attempt,
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
    command: 'npm',
    args: ['run', 'typecheck'],
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

if (listOnly) {
  console.log('\n[local-readiness-list]');
  for (const check of checks) {
    console.log(`${check.label}: ${formatCommand(check.command, check.args)}`);
  }
  console.log(`[local-readiness-list] ${checks.length} checks listed`);
  console.log(`[local-readiness-list] child verify scripts: ${verifyScripts.length}`);
  console.log(`[local-readiness-list] boundary: ${LOCAL_READINESS_BOUNDARY}`);
  process.exit(0);
}

const results = [];

for (const check of checks) {
  cleanupRetryableEmulators(check.label);
  let result = runCheck(check.label, check.command, check.args);
  if (!isPassing(result) && RETRY_ONCE_VERIFY_SCRIPTS.has(check.label)) {
    console.log(
      `[local-readiness] ${check.label} failed on attempt 1; retrying once because this gate starts Firebase emulators and can fail on transient local emulator startup/deadline errors.`,
    );
    cleanupRetryableEmulators(`${check.label} retry`);
    const retryResult = runCheck(check.label, check.command, check.args, 2);
    result = {
      ...retryResult,
      firstAttemptStatus: result.status,
      firstAttemptSignal: result.signal,
    };
  }
  cleanupRetryableEmulators(`${check.label} completion`);
  results.push(result);
  if (!isPassing(result)) break;
}

const passedCount = results.filter(isPassing).length;
const allPassed = passedCount === checks.length;

console.log('\n[local-readiness-summary]');
for (const result of results) {
  const status = isPassing(result) ? 'PASS' : 'FAIL';
  const statusDetails = result.signal
    ? ` signal=${result.signal}`
    : result.status !== 0
      ? ` status=${result.status}`
      : '';
  const retryDetails = result.attempts > 1
    ? ` attempts=${result.attempts} firstStatus=${result.firstAttemptStatus}${result.firstAttemptSignal ? ` firstSignal=${result.firstAttemptSignal}` : ''}`
    : '';
  console.log(`${status} ${result.label}${statusDetails}${retryDetails}`);
}
console.log(`[local-readiness-summary] ${passedCount}/${checks.length} checks passed`);
console.log(`[local-readiness-summary] child verify scripts: ${verifyScripts.length}`);
console.log(`[local-readiness-summary] boundary: ${LOCAL_READINESS_BOUNDARY}`);

if (!allPassed) {
  process.exit(1);
}
