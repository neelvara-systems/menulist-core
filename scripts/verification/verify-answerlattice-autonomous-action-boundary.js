#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listSourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const procedureTypes = read('src/types/answerlattice/index.ts');
const procedureValidation = read('src/lib/answerlattice/procedureValidation.ts');
const guidanceContracts = read('src/lib/answerlattice/guidedResolutionContracts.ts');
const loader = read('public/widget/answerlattice-widget.js');
const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
const sdk = read('packages/answerlattice-web/src/index.ts');
const readme = read('__docs__/answerlattice/autonomous-browser-and-account-actions/README.md');
const implementation = read('__docs__/answerlattice/autonomous-browser-and-account-actions/autonomous-browser-and-account-actions_impl.md');
const firebase = read('__docs__/answerlattice/autonomous-browser-and-account-actions/autonomous-browser-and-account-actions_firebase.md');
const marketing = read('__docs__/answerlattice/autonomous-browser-and-account-actions/autonomous-browser-and-account-actions_marketing.md');
const tests = read('__docs__/answerlattice/autonomous-browser-and-account-actions/autonomous-browser-and-account-actions_test-cases.md');
const tracker = read('__docs__/answerlattice/system-inventory/answerlattice-feature-flow-audit-tracker.md');
const answerlatticeRuntimeFiles = [
  ...listSourceFiles('src/app/(answerlattice)'),
  ...listSourceFiles('src/app/api/answerlattice'),
  ...listSourceFiles('src/app/api/widget'),
  ...listSourceFiles('src/lib/answerlattice'),
  ...listSourceFiles('src/components/answerlattice'),
  ...listSourceFiles('src/components/templates/answerlattice'),
  ...listSourceFiles('functions-answerlattice/src'),
  ...listSourceFiles('packages/answerlattice-web/src'),
  ...listSourceFiles('public/widget'),
];

assert(
  procedureTypes.includes('Human instruction label, never an executable command'),
  'procedure action type must preserve its instructional-only boundary',
);
assert(
  widgetClient.includes('Presentation vocabulary only. Host execution is deliberately unsupported.'),
  'widget action vocabulary must preserve its presentation-only boundary',
);
assert(
  loader.includes('Instruction labels only; never dispatch these values into host actions.'),
  'loader action vocabulary must preserve its instruction-only boundary',
);
assert(loader.includes("querySelectorAll('[data-answerlattice-target]')"), 'semantic target lookup');
assert(loader.includes("pointerEvents: 'none'"), 'non-interactive target highlight');
assert(loader.includes('target.scrollIntoView('), 'guidance may only scroll the declared target');
assert(!loader.includes('activeGuidanceTarget.click('), 'guidance must not click the host target');
assert(!loader.includes('.click('), 'widget loader must not programmatically click any element');
assert(!loader.includes('.submit('), 'widget loader must not submit host forms');
assert(!loader.includes('.requestSubmit('), 'widget loader must not request host form submission');
assert(!loader.includes('target.dispatchEvent('), 'guidance must not synthesize host events');
assert(!loader.includes('eval('), 'guidance must not evaluate arbitrary code');
assert(!loader.includes('new Function('), 'guidance must not construct arbitrary code');
assert(loader.includes('if (e.origin !== widgetHost) return;'), 'guidance messages require the configured widget origin');
assert(loader.includes('if (!iframe || e.source !== iframe.contentWindow) return;'), 'guidance messages require the active widget iframe source');

[
  'registerAction',
  'registerActions',
  'executeAction',
  'invokeAction',
  'dispatchAction',
].forEach((method) => {
  assert(!sdk.includes(method), `SDK action method must remain absent: ${method}`);
  assert(!loader.includes(`${method}: function`), `loader action method must remain absent: ${method}`);
  const hiddenRuntimeFiles = answerlatticeRuntimeFiles
    .filter((relativePath) => read(relativePath).includes(method));
  assert(
    hiddenRuntimeFiles.length === 0,
    `action execution API must not hide in Answerlattice runtime: ${method} in ${hiddenRuntimeFiles.join(', ')}`,
  );
});

[
  'actionBroker',
  'browserControl',
].forEach((runtimeName) => {
  const hiddenRuntimeFiles = answerlatticeRuntimeFiles
    .filter((relativePath) => read(relativePath).includes(runtimeName));
  assert(
    hiddenRuntimeFiles.length === 0,
    `autonomous runtime must remain absent: ${runtimeName} in ${hiddenRuntimeFiles.join(', ')}`,
  );
});

[
  'actionId',
  'actionArguments',
  'requiresConfirmation',
  'executeCallback',
  'cssSelector',
].forEach((field) => {
  assert(!procedureValidation.includes(`${field}:`), `procedure executable field must remain absent: ${field}`);
  assert(!guidanceContracts.includes(`${field}:`), `guidance executable field must remain absent: ${field}`);
});

[
  'src/app/api/answerlattice/actions',
  'src/app/api/widget/actions',
  'src/lib/answerlattice/actionBroker',
  'src/lib/answerlattice/browserControl',
  'functions-answerlattice/src/answerlattice/actionBroker',
  'functions-answerlattice/src/answerlattice/browserControl',
].forEach((relativePath) => {
  assert(!exists(relativePath), `autonomous action runtime must remain absent: ${relativePath}`);
});

assert(readme.includes('DO NOT BUILD'), 'autonomous action decision boundary');
assert(readme.includes('procedure `action` field is an instructional verb'), 'instruction-versus-execution explanation');
assert(readme.includes('client-reported event'), 'guided completion must not be described as independently verified');
assert(readme.includes('not independent proof of backend state'), 'guided outcome evidence limitation');
assert(implementation.includes('No action runtime exists'), 'autonomous action implementation absence');
assert(firebase.includes('Autonomous-action Firestore reads'), 'autonomous action zero-cost boundary');
assert(marketing.includes('Do not claim that Answerlattice'), 'autonomous action marketing prohibition');
assert(tests.includes('Host guidance never calls the selected target'), 'autonomous action test contract');
assert(tests.includes('matching client-reported event'), 'autonomous action event-evidence test contract');
assert(
  tracker.includes('### Feature 44 — Autonomous Browser and Account-Changing Actions\n\n**Status:** Local source complete'),
  'autonomous action feature tracker completion state',
);

console.log('Answerlattice autonomous browser and account-action boundary passed.');
