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

function listSourceFiles(directory) {
  const absoluteDirectory = path.join(ROOT, directory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const features = read('src/config/features.ts');
const rules = read('firestore.rules');
const indexes = read('firestore.indexes.json');
const storageRules = read('storage.rules');
const readme = read('__docs__/qr-whatsapp-experiments/README.md');
const spec = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_spec.md');
const implementation = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_impl.md');
const firebase = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_firebase.md');
const help = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_helpdoc.md');
const marketing = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_marketing.md');
const website = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_website.md');
const mobile = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_mobile-support.md');
const tests = read('__docs__/qr-whatsapp-experiments/qr-whatsapp-experiments_test-cases.md');
const normalQrSpec = read('__docs__/branded-qr-action-templates/branded-qr-action-templates_spec.md');
const packageJson = JSON.parse(read('package.json'));

assert(
  features.includes('ENABLE_QR_WHATSAPP_EXPERIMENTS: false'),
  'QR-to-WhatsApp experiments must remain disabled',
);
assert(
  features.includes('Normal MenuList menu/service/catalog QR output stays direct'),
  'the feature flag must preserve ordinary QR output',
);

const runtimeFlagReferences = [
  ...listSourceFiles('src'),
  ...listSourceFiles('functions/src'),
].filter((relativePath) => relativePath !== 'src/config/features.ts')
  .filter((relativePath) => read(relativePath).includes('ENABLE_QR_WHATSAPP_EXPERIMENTS'));
assert(
  runtimeFlagReferences.length === 0,
  `planning-only experiment flag must have no runtime consumers: ${runtimeFlagReferences.join(', ')}`,
);

[
  'src/app/q',
  'src/app/assets/experiments',
  'src/app/api/qr-whatsapp-experiments',
  'src/lib/qr-whatsapp-experiments',
  'src/components/owner/qr-whatsapp-experiments',
  'src/components/mobile/qr-whatsapp-experiments',
].forEach((relativePath) => {
  assert(!exists(relativePath), `planning-only experiment runtime must remain absent: ${relativePath}`);
});

[
  'storeQrWhatsappExperiments',
  'storeQrWhatsappExperimentDaily',
  'qrWhatsappConsent',
].forEach((token) => {
  assert(!rules.includes(token), `MenuList rules must not admit planned experiment storage: ${token}`);
  assert(!indexes.includes(token), `MenuList indexes must not admit planned experiment storage: ${token}`);
  assert(!storageRules.includes(token), `MenuList Storage rules must not admit planned experiment storage: ${token}`);
});

assert(readme.includes('PLANNING ONLY — NO RUNTIME'), 'README must state the planning-only runtime boundary');
assert(spec.includes('PLANNING ONLY — NO RUNTIME'), 'spec must state the planning-only runtime boundary');
assert(implementation.includes('No runtime implementation exists'), 'implementation doc must state runtime absence');
assert(firebase.includes('Current Firestore operations: zero'), 'Firebase doc must state zero current operations');
assert(firebase.includes('No rules, indexes, TTL policy, listeners, scheduler, or Functions'), 'Firebase doc must reject speculative infrastructure');
assert(help.includes('NOT AN ACTIVE HELP ARTICLE'), 'help copy must remain unpublished');
assert(marketing.includes('HOLD — NOT CURRENT SALES ENABLEMENT'), 'marketing copy must remain on hold');
assert(website.includes('Do not add public website claims'), 'website copy must remain publication-blocked');
assert(mobile.includes('No mobile runtime exists'), 'mobile doc must state runtime absence');
assert(tests.includes('No runtime route, Firestore rule, API route, Storage path, Function, or deploy'), 'test docs must preserve the no-runtime boundary');
assert(normalQrSpec.includes('Normal MenuList menu/service/catalog QR codes open the live page directly.'), 'ordinary QR output must remain direct');
assert(
  packageJson.scripts['verify:qr-whatsapp-experiments-boundary']
    === 'node scripts/verification/verify-qr-whatsapp-experiments-boundary.js',
  'package must expose the QR-to-WhatsApp boundary verifier',
);

console.log('QR-to-WhatsApp experiments planning boundary verification passed.');
