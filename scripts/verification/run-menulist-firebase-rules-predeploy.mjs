import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT_CONFIG = 'firebase.json';
const EXCLUDED_CONFIGS = [
  'firebase-answerlattice.json',
  'firebase-campaigncue.json',
  'firebase-signaldesk.json',
  'firebase-ai-menu-manager-test.json',
];
function fail(message) {
  throw new Error(`[MenuList Firebase rules predeploy] ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function verifyRootConfig() {
  const config = readJson(ROOT_CONFIG);
  const expectedPaths = {
    'firestore-menulist.rules': config.firestore?.rules,
    'firestore.indexes.json': config.firestore?.indexes,
    'storage.rules': config.storage?.rules,
  };

  for (const [expectedPath, configuredPath] of Object.entries(expectedPaths)) {
    if (configuredPath !== expectedPath) {
      fail(`${ROOT_CONFIG} must reference ${expectedPath}, found ${configuredPath || 'nothing'}.`);
    }
    if (!fs.existsSync(path.join(ROOT, expectedPath))) {
      fail(`Required file ${expectedPath} does not exist.`);
    }
  }
}

function discoverRuleScripts() {
  const packageJson = readJson('package.json');
  const scripts = Object.entries(packageJson.scripts || {})
    .filter(([name, command]) => (
      name.includes('rules')
      && command.includes('firebase emulators:exec')
      && !EXCLUDED_CONFIGS.some((config) => command.includes(config))
    ))
    .sort(([left], [right]) => left.localeCompare(right));

  if (scripts.length === 0) {
    fail('No direct root Firebase emulator rule scripts were discovered.');
  }

  for (const [name, command] of scripts) {
    if (!command.includes('--only firestore') && !command.includes('--only storage')) {
      fail(`${name} must select the Firestore or Storage emulator explicitly.`);
    }
    if (!command.includes('--project demo-') && !command.includes('GCLOUD_PROJECT=demo-')) {
      fail(`${name} is not pinned to a demo-* project and cannot enter this local-only gate.`);
    }
    if (
      command.includes('--project menulist-qa')
      || command.includes('--project menulist-prod')
      || /--project menulist(?:\s|$)/.test(command)
    ) {
      fail(`${name} references a real MenuList cloud project.`);
    }
  }

  return scripts;
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(500, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

function unwrapEmulatorCommand(command) {
  const emulatorIndex = command.indexOf('firebase emulators:exec');
  const innerStart = command.indexOf('"', emulatorIndex);
  const innerEnd = command.lastIndexOf('"');
  if (emulatorIndex < 0 || innerStart < 0 || innerEnd <= innerStart) {
    fail('Could not unwrap a discovered Firebase emulator command.');
  }
  const prefix = command.slice(0, emulatorIndex);
  const inner = command.slice(innerStart + 1, innerEnd).replace(/\\"/g, '"');
  return `${prefix}${inner}`.trim();
}

function readDemoProjectId(command) {
  const match = command.match(/(?:--project|GCLOUD_PROJECT=)(?:\s+)?(demo-[A-Za-z0-9-]+)/);
  if (!match) fail('Could not resolve the demo project for a discovered rule script.');
  return match[1];
}

async function clearFirestoreProject(projectId) {
  const endpoint = `http://127.0.0.1:8080/emulator/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const response = await fetch(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    fail(`Could not clear reused Firestore fixture ${projectId}: HTTP ${response.status}.`);
  }
}

async function main() {
  const generatedRulesCheck = spawnSync(process.execPath, [
    path.join(ROOT, 'scripts/verification/generate-menulist-firestore-rules.mjs'),
    '--check',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  process.stdout.write(generatedRulesCheck.stdout || '');
  process.stderr.write(generatedRulesCheck.stderr || '');
  if (generatedRulesCheck.error || generatedRulesCheck.status !== 0) {
    fail('Generated MenuList Firestore rules are missing or stale.');
  }

  verifyRootConfig();
  const scripts = discoverRuleScripts();

  console.log('MenuList root Firebase rules predeploy gate');
  console.log(`Discovered ${scripts.length} direct local-emulator rule scripts.`);
  console.log('Boundary: demo-* emulator projects only; no cloud deploy, read, or write.');

  if (process.argv.includes('--list')) {
    for (const [name] of scripts) console.log(`- ${name}`);
    return;
  }

  const reuseFirestore = await canConnect(8080);
  const reuseStorage = await canConnect(9199);
  if (reuseFirestore) {
    console.log('Reusing the approved Firestore emulator on 127.0.0.1:8080.');
  }
  if (reuseStorage) {
    console.log('Reusing the approved Storage emulator on 127.0.0.1:9199.');
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  for (const [name, command] of scripts) {
    console.log(`\n[MenuList Firebase rules predeploy] npm run ${name}`);
    const requiresFirestore = command.includes('--only firestore');
    const requiresStorage = command.includes('--only storage') || command.includes('--only firestore,storage');
    // A separately managed emulator can disappear during this long gate. Recheck
    // the cached reuse decision before every script so a vanished Storage process
    // falls back to that script's isolated emulators:exec configuration instead of
    // leaving the rules client waiting forever on a dead port.
    const currentReuseFirestore = reuseFirestore && await canConnect(8080);
    const currentReuseStorage = reuseStorage && await canConnect(9199);
    const canReuse = (!requiresFirestore || currentReuseFirestore)
      && (!requiresStorage || currentReuseStorage);
    if (canReuse && requiresFirestore) {
      await clearFirestoreProject(readDemoProjectId(command));
    }
    const result = canReuse
      ? spawnSync('/bin/sh', ['-c', unwrapEmulatorCommand(command)], {
        cwd: ROOT,
        env: {
          ...process.env,
          FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
          FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
        },
        stdio: 'inherit',
      })
      : spawnSync(npmCommand, ['run', name], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
      });

    if (result.error) {
      fail(`${name} could not start: ${result.error.message}`);
    }
    if (result.signal || result.status !== 0) {
      fail(`${name} failed${result.signal ? ` with signal ${result.signal}` : ` with exit code ${result.status}`}.`);
    }
  }

  console.log(`\nMenuList root Firebase rules predeploy passed (${scripts.length} scripts).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
