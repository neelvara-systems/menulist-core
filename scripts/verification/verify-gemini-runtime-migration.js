const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertIncludes = (source, needle, message) => {
  assert(source.includes(needle), `${message}: missing ${needle}`);
};

const sharedRuntimePaths = [
  'src/data/shared/geminiRuntime.ts',
  'functions/src/sharedData/geminiRuntime.ts',
  'functions-answerlattice/src/sharedData/geminiRuntime.ts',
];
const sharedRuntime = read(sharedRuntimePaths[0]);
for (const relativePath of sharedRuntimePaths.slice(1)) {
  assert(
    read(relativePath) === sharedRuntime,
    `${relativePath} must remain byte-identical to ${sharedRuntimePaths[0]}`,
  );
}

[
  "TEXT_HIGH_THROUGHPUT: 'gemini-3.5-flash-lite'",
  "TEXT_COMPLEX: 'gemini-3.6-flash'",
  "TEXT_BALANCED: 'gemini-3.5-flash'",
  "IMAGE_HIGH_THROUGHPUT: 'gemini-3.1-flash-lite-image'",
  "IMAGE_QUALITY: 'gemini-3.1-flash-image'",
  'compileGeminiGenerateContentRequest',
  'isSupportedGeminiModel',
  'delete config.temperature',
  'delete config.candidateCount',
  'GEMINI_REQUEST_PREFILLED_MODEL_TURN',
  'GEMINI_REQUEST_FUNCTION_RESPONSE_IDENTITY_MISSING',
].forEach((needle) => assertIncludes(sharedRuntime, needle, 'Shared Gemini runtime contract'));

const expectedPackages = [
  ['package.json', '@google/genai', '2.13.0'],
  ['functions/package.json', '@google/genai', '2.13.0'],
  ['functions/package.json', 'firebase-functions', '7.3.0'],
  ['functions-answerlattice/package.json', '@google/genai', '2.13.0'],
  ['functions-answerlattice/package.json', 'firebase-functions', '7.3.0'],
  ['functions-signaldesk/package.json', 'firebase-functions', '7.3.0'],
];
for (const [relativePath, packageName, expectedVersion] of expectedPackages) {
  const packageJson = readJson(relativePath);
  const actualVersion = packageJson.dependencies?.[packageName]
    || packageJson.devDependencies?.[packageName];
  assert(
    actualVersion === expectedVersion,
    `${relativePath} must pin ${packageName} at ${expectedVersion}; found ${actualVersion || 'missing'}`,
  );
}

[
  'src/lib/google/genAi/aiGateway.ts',
  'functions/src/ai/aiGateway.ts',
  'functions-answerlattice/src/ai/aiGateway.ts',
].forEach((relativePath) => {
  const gateway = read(relativePath);
  assertIncludes(
    gateway,
    'compileGeminiGenerateContentRequest',
    `${relativePath} compatibility compiler`,
  );
  assert(
    gateway.indexOf('compileGeminiGenerateContentRequest')
      < gateway.lastIndexOf('generateContent'),
    `${relativePath} must compile requests before provider generation`,
  );
});

const activeRoots = [
  'src',
  'functions/src',
  'functions-answerlattice/src',
  'functions-signaldesk/src',
];
const allowedRetiredModelFile = path.join(ROOT, 'src/constants/signaldesk/integrations.ts');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.json']);
const violations = [];

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['lib', 'node_modules', '__tests__'].includes(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath);
      continue;
    }
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    const source = fs.readFileSync(absolutePath, 'utf8');
    if (/gemini-(?:2\.0|2\.5)/i.test(source) && absolutePath !== allowedRetiredModelFile) {
      violations.push(`${path.relative(ROOT, absolutePath)} contains a retired Gemini model`);
    }
    if (/gemini-[A-Za-z0-9._-]*(?:latest|preview|experimental|exp)(?:\b|[-_.])/i.test(source)) {
      violations.push(`${path.relative(ROOT, absolutePath)} contains an unstable Gemini alias`);
    }
  }
};
activeRoots.forEach((relativePath) => walk(path.join(ROOT, relativePath)));
assert(violations.length === 0, violations.join('\n'));

const signalDeskConstants = read('src/constants/signaldesk/integrations.ts');
assertIncludes(
  signalDeskConstants,
  'SIGNALDESK_RETIRED_GEMINI_MODEL_ROUTES',
  'SignalDesk persisted-route migration registry',
);
const signalDeskProvider = read('src/lib/signaldesk/aiProvider.ts');
const signalDeskWorkflow = read('src/lib/signaldesk/workflowServer.ts');
assertIncludes(signalDeskProvider, 'requireSupportedModel', 'SignalDesk runtime model allowlist');
assertIncludes(signalDeskWorkflow, 'isSupportedGeminiModel', 'SignalDesk persisted model route allowlist');
assertIncludes(
  signalDeskWorkflow,
  'SIGNALDESK_RETIRED_GEMINI_MODEL_ROUTES.DEFAULT',
  'SignalDesk exact retired-route migration',
);

const answerlatticeWorkflow = read('.github/workflows/answerlattice-quality.yml');
assertIncludes(
  answerlatticeWorkflow,
  'firebase-tools@15.24.0',
  'Stable Firebase CLI CI pin',
);
assert(
  !/firebase-functions["']?\s*:\s*["']7\.3\.2-rc/.test(
    expectedPackages.map(([relativePath]) => read(relativePath)).join('\n'),
  ),
  'Firebase Functions release candidates must not enter production packages',
);

console.log('Gemini runtime migration verifier passed');
