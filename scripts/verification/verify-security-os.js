const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, token, message) {
  assert(content.includes(token), message);
}

const requiredPaths = [
  'SECURITY.md',
  'packages/security-os/README.md',
  'packages/security-os/schemas/security-os-schema.ts',
  'packages/security-os/products/security-profiles.ts',
  'packages/security-os/manifest/security-surfaces.json',
  'packages/security-os/evidence/verifier-evidence.json',
  'packages/security-os/scripts/audit-security-os.ts',
  'packages/security-os/scripts/lib/security-os-audit.ts',
  'packages/security-os/scripts/plan-security-os.ts',
  'packages/security-os/scripts/lib/security-os-plan.ts',
  'packages/security-os/provenance/external-tool-review.md',
  'packages/security-os/private/.gitignore',
  '.agents/skills/security-os/SKILL.md',
  '.agents/skills/security-os/agents/openai.yaml',
  '__docs__/security/security-operating-system/README.md',
  '__docs__/security/security-operating-system/security-operating-system_spec.md',
  '__docs__/security/security-operating-system/security-operating-system_impl.md',
  '__docs__/security/security-operating-system/security-operating-system_marketing.md',
  '__docs__/security/security-operating-system/security-operating-system_website.md',
  '__docs__/security/security-operating-system/security-operating-system_helpdoc.md',
  '__docs__/security/security-operating-system/security-operating-system_firebase.md',
  '__docs__/security/security-operating-system/security-operating-system_mobile-support.md',
  '__docs__/security/security-operating-system/security-operating-system_test-cases.md',
  '__docs__/security/security-operating-system/security-operating-system_validation.md',
];

for (const relativePath of requiredPaths) {
  assert(fs.existsSync(path.join(ROOT, relativePath)), `Missing SecurityOS file: ${relativePath}`);
}

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['security-os:audit'], 'package.json must register security-os:audit');
assert(packageJson.scripts['security-os:plan'], 'package.json must register security-os:plan');
assert(packageJson.scripts['verify:security-os'], 'package.json must register verify:security-os');

const flags = read('src/config/features.ts');
assertIncludes(flags, 'ENABLE_SECURITY_OPERATING_SYSTEM: true', 'SecurityOS internal feature flag must be enabled');

const manifest = JSON.parse(read('packages/security-os/manifest/security-surfaces.json'));
const expectedBoundary = {
  internalOnly: true,
  publicRuntime: false,
  publicMarketing: false,
  firebaseOperations: false,
  externalCodeUpload: false,
  automaticFixes: false,
  automaticDeploys: false,
};
for (const [key, expected] of Object.entries(expectedBoundary)) {
  assert(manifest.boundary[key] === expected, `SecurityOS boundary ${key} must be ${expected}`);
}
assert(manifest.surfaces.every((surface) => surface.verificationStatus === 'not-run'), 'Initial surfaces must not claim unexecuted verification');

const packageCode = [
  'packages/security-os/schemas/security-os-schema.ts',
  'packages/security-os/products/security-profiles.ts',
  'packages/security-os/scripts/audit-security-os.ts',
  'packages/security-os/scripts/lib/security-os-audit.ts',
  'packages/security-os/scripts/plan-security-os.ts',
  'packages/security-os/scripts/lib/security-os-plan.ts',
].map(read).join('\n');

for (const token of [
  '@openai/codex-security',
  'OPENAI_API_KEY',
  'CODEX_API_KEY',
  'fetch(',
  'axios',
  'firebase-admin',
  'firebase/app',
  'child_process',
]) {
  assert(!packageCode.includes(token), `SecurityOS Phase one must not include ${token}`);
}

const securityPolicy = read('SECURITY.md');
for (const token of [
  'Assess only systems',
  'untrusted input',
  'outside the enclosing Git worktree',
  'Review every proposed patch',
  'No public vulnerability-reporting address',
]) {
  assertIncludes(securityPolicy, token, `SECURITY.md must include: ${token}`);
}

const skill = read('.agents/skills/security-os/SKILL.md');
for (const token of [
  'npm run security-os:audit',
  'npm run security-os:plan',
  'verificationStatus',
  'Do not',
]) {
  assertIncludes(skill, token, `SecurityOS skill must include: ${token}`);
}

console.log('SecurityOS source contract verification passed');
