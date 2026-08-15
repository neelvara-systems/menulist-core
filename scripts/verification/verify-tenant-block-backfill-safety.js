#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKFILL_SCRIPT = 'scripts/backfill-store-tenant-block-state.ts';
const TS_NODE_BIN = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'ts-node.cmd' : 'ts-node');
const TS_NODE_COMMAND = fs.existsSync(TS_NODE_BIN) ? TS_NODE_BIN : 'npx';
const TS_NODE_PREFIX_ARGS = fs.existsSync(TS_NODE_BIN)
  ? ['--compiler-options', '{"module":"CommonJS"}']
  : ['ts-node', '--compiler-options', '{"module":"CommonJS"}'];

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

function assertOrder(content, before, after, label) {
  const beforeIndex = content.indexOf(before);
  const afterIndex = content.indexOf(after);
  assert(beforeIndex !== -1, `${label} missing before token ${before}`);
  assert(afterIndex !== -1, `${label} missing after token ${after}`);
  assert(beforeIndex < afterIndex, `${label} must order ${before} before ${after}`);
}

function runRefusalCase(label, args, expectedMessage) {
  const env = { ...process.env };
  delete env.FIREBASE_PROJECT_ID;

  const result = spawnSync(
    TS_NODE_COMMAND,
    [...TS_NODE_PREFIX_ARGS, BACKFILL_SCRIPT, ...args],
    {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    },
  );

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  assert(result.status !== 0, `${label} must fail closed`);
  assertIncludes(output, 'tenant_block_backfill_failed', `${label} stable failure code`);
  assertIncludes(output, expectedMessage, `${label} refusal message`);
  assert(!output.includes('Project:'), `${label} must fail before project banner`);
  assert(!output.includes('Mode:'), `${label} must fail before mode banner`);
  assert(!output.includes('PERMISSION_DENIED'), `${label} must not reach Firestore permissions`);
  assert(!output.includes('CONSUMER_INVALID'), `${label} must not reach Firestore API access`);
}

function verifySourceGuards() {
  const backfill = read(BACKFILL_SCRIPT);

  assertIncludes(backfill, "const projectId = getArg('--project-id') || process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID || process.env.MENULIST_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;", 'Backfill explicit product-scoped project target');
  assertIncludes(backfill, "throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running tenant-block backfill.');", 'Backfill missing-project refusal');
  assertIncludes(backfill, "const confirmedProjectId = getArg('--confirm-project');", 'Backfill write confirmation argument');
  assertIncludes(backfill, 'if (write && confirmedProjectId !== projectId)', 'Backfill write target confirmation guard');
  assertIncludes(backfill, 'Refusing write: pass --confirm-project ${projectId}', 'Backfill mismatched project refusal');
  assertIncludes(backfill, 'const scopeCount = Number(Boolean(tenantScope)) + Number(Boolean(storeScope)) + Number(allStores);', 'Backfill exact scope counter');
  assertIncludes(backfill, 'if (scopeCount !== 1)', 'Backfill exact scope guard');
  assertIncludes(backfill, 'resolveTenantBlockBackfillStoreIdentity(storeDoc.id, store)', 'Backfill exact persisted store/tenant identity projector');
  assertIncludes(backfill, 'normalizePositiveNumericDocumentIdAliases([', 'Backfill all-alias identity agreement');
  assert(!backfill.includes('store.tenantId ?? store.tId'), 'Backfill must not prefer one persisted tenant alias');
  assertIncludes(backfill, 'Pass exactly one of --tenant-id, --store-id, or --all-stores.', 'Backfill missing or ambiguous scope refusal');
  assertIncludes(backfill, 'db = initializeFirestore(projectId);', 'Backfill Firestore initialization point');
  assertOrder(backfill, 'if (write && confirmedProjectId !== projectId)', 'db = initializeFirestore(projectId);', 'Backfill target guard before Firebase initialization');
  assertOrder(backfill, 'if (scopeCount !== 1)', 'db = initializeFirestore(projectId);', 'Backfill scope guard before Firebase initialization');
}

verifySourceGuards();
runRefusalCase(
  'missing project write',
  ['--write', '--confirm-project', 'menulist-qa', '--store-id', '42'],
  'Set FIREBASE_PROJECT_ID or pass --project-id before running tenant-block backfill.',
);
runRefusalCase(
  'mismatched project write',
  ['--project-id', 'menulist-qa', '--write', '--confirm-project', 'menulist-prod', '--store-id', '42'],
  'Refusing write: pass --confirm-project menulist-qa',
);
runRefusalCase(
  'unscoped project write',
  ['--project-id', 'menulist-qa', '--write', '--confirm-project', 'menulist-qa'],
  'Pass exactly one of --tenant-id, --store-id, or --all-stores.',
);

console.log('Tenant-block backfill safety verifier passed');
