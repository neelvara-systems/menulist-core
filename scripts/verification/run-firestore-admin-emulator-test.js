#!/usr/bin/env node

const net = require('node:net');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const projectId = readArg('--project');
const testFile = readArg('--test');
const successMarker = readArg('--marker');
if (!projectId || !testFile || !successMarker) {
  throw new Error('Usage: run-firestore-admin-emulator-test --project <demo-id> --test <file> --marker <text>');
}
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing non-demo Firebase project ${projectId}`);
}

const probe = (hostPort) => new Promise((resolve) => {
  const [host, portText] = hostPort.split(':');
  const socket = net.createConnection({ host, port: Number(portText) });
  const finish = (available) => {
    socket.destroy();
    resolve(available);
  };
  socket.setTimeout(500, () => finish(false));
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
});

const requestedHost = process.env.FIRESTORE_EMULATOR_HOST;
const candidates = [...new Set([
  requestedHost,
  '127.0.0.1:8181',
  '127.0.0.1:8080',
].filter(Boolean))];

async function main() {
  let emulatorHost = null;
  for (const candidate of candidates) {
    if (await probe(candidate)) {
      emulatorHost = candidate;
      break;
    }
  }
  if (!emulatorHost) {
    throw new Error('No local Firestore emulator is available on FIRESTORE_EMULATOR_HOST, 8181, or 8080');
  }

  const tsNode = path.join(ROOT, 'node_modules', '.bin', 'ts-node');
  const result = spawnSync(tsNode, [
    '--compiler-options', '{"module":"CommonJS","target":"ES2021"}',
    '-r', 'tsconfig-paths/register',
    testFile,
  ], {
    cwd: ROOT,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: '',
      GCLOUD_PROJECT: projectId,
      FIREBASE_PROJECT_ID: projectId,
      FIRESTORE_EMULATOR_HOST: emulatorHost,
      MENULIST_FIREBASE_PROJECT_ID: projectId,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
      NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID: projectId,
    },
    encoding: 'utf8',
  });

  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`Firestore admin emulator test failed${result.signal ? ` with ${result.signal}` : ` with exit ${result.status}`}`);
  }
  if (!(result.stdout || '').includes(successMarker)) {
    throw new Error(`Firestore admin emulator test did not emit required marker: ${successMarker}`);
  }
  console.log(`[firestore-admin-emulator-test] PASS ${testFile} via ${emulatorHost}`);
}

main().catch((error) => {
  console.error(`[firestore-admin-emulator-test] FAIL ${error.message}`);
  process.exit(1);
});
