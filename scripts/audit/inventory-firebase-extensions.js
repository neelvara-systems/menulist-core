const { spawnSync } = require('node:child_process');

const FIREBASE_CLI_VERSION = '15.24.0';
const DEFAULT_PROJECTS = [
  'menulist-qa',
  'menulist-prod',
  'answerlattice-qa',
  'answerlattice',
  'campaigncue-qa',
  'campaigncue',
  'menulist-signaldesk-qa',
  'menulist-signaldesk',
];
const projects = process.argv.slice(2).filter((value) => !value.startsWith('-'));
const targets = projects.length ? projects : DEFAULT_PROJECTS;
const inventory = [];
let blocked = false;

for (const project of targets) {
  const result = spawnSync(
    'npx',
    [
      '--yes',
      `firebase-tools@${FIREBASE_CLI_VERSION}`,
      'ext:list',
      '--project',
      project,
      '--json',
      '--non-interactive',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    blocked = true;
    inventory.push({
      project,
      status: 'blocked',
      reason: 'Firebase project access or extension inventory command failed',
    });
    continue;
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    blocked = true;
    inventory.push({
      project,
      status: 'blocked',
      reason: 'Firebase CLI returned an unreadable inventory response',
    });
    continue;
  }

  const instances = Array.isArray(payload.result)
    ? payload.result
    : Array.isArray(payload.instances)
      ? payload.instances
      : [];
  inventory.push({
    project,
    status: 'ok',
    count: instances.length,
    instances: instances.map((instance) => ({
      instanceId: instance.instanceId || instance.name || 'unknown',
      ref: instance.ref || instance.extensionRef || 'unknown',
      state: instance.state || instance.status || 'unknown',
    })),
  });
}

console.log(JSON.stringify({
  firebaseCliVersion: FIREBASE_CLI_VERSION,
  generatedAt: new Date().toISOString(),
  inventory,
}, null, 2));

if (blocked) process.exitCode = 2;
