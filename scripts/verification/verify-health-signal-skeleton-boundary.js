#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listSourceFiles(directory) {
  const absoluteDirectory = path.join(ROOT, directory);
  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const features = read('src/config/features.ts');
const computation = read('functions/src/analytics/healthSignalsComputation.ts');
const storeType = read('src/types/platform/store.ts');
const indexes = JSON.parse(read('firestore.indexes.json'));
const validation = read('__docs__/trust-health-signal/health-signals_validation.md');
const trustReadme = read('__docs__/trust-health-signal/README.md');
const loyaltyReadme = read('__docs__/loyalty-health-signal/README.md');
const riskReadme = read('__docs__/risk-decline-detection/README.md');
const trustFirebase = read('__docs__/trust-health-signal/trust-health-signal_firebase.md');
const loyaltyFirebase = read('__docs__/loyalty-health-signal/loyalty-health-signal_firebase.md');
const riskFirebase = read('__docs__/risk-decline-detection/risk-decline-detection_firebase.md');
const packageJson = JSON.parse(read('package.json'));

[
  'ENABLE_TRUST_HEALTH_SIGNAL: false',
  'ENABLE_LOYALTY_HEALTH_SIGNAL: false',
  'ENABLE_RISK_DECLINE_DETECTION: false',
].forEach((token) => assert(features.includes(token), `health-signal flag must remain off: ${token}`));
assert(
  features.includes('Daily unique totals and page-view ratios do not prove weekly distinct'),
  'feature flags must record the unvalidated visitor-counter boundary',
);
assert(
  computation.includes("throw new Error('HEALTH_SIGNALS_DORMANT_UNVALIDATED_COUNTERS')")
    && computation.includes('rejectDormantHealthSignalExecution();'),
  'the retained Firestore helper must fail before scanning stores',
);
assert(
  computation.indexOf('rejectDormantHealthSignalExecution();')
    < computation.indexOf('const result = { processed: 0, updated: 0, errors: 0 };'),
  'the dormant execution guard must run before Firestore work',
);
assert(
  computation.includes('Summed daily unique counts are not weekly distinct visitors'),
  'computation source must reject daily-unique sums as weekly visitor truth',
);

const functionsConsumers = listSourceFiles('functions/src')
  .filter((relativePath) => relativePath !== 'functions/src/analytics/healthSignalsComputation.ts')
  .filter((relativePath) => read(relativePath).includes('processHealthSignalsForAllStores'));
assert(
  functionsConsumers.length === 0,
  `health-signal processor must have no Function/scheduler consumer: ${functionsConsumers.join(', ')}`,
);

const ownerConsumers = listSourceFiles('src')
  .filter((relativePath) => relativePath !== 'src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx')
  .filter((relativePath) => relativePath !== 'src/types/platform/store.ts')
  .filter((relativePath) => read(relativePath).includes('HealthSignalCards'));
assert(
  ownerConsumers.length === 0,
  `health-signal cards must remain unmounted: ${ownerConsumers.join(', ')}`,
);

assert(
  storeType.includes('Reserved dormant compatibility shape; there is no active writer or reader.'),
  'store type must not claim an active weekly writer',
);
const healthSignalsOverride = indexes.fieldOverrides.filter((override) => (
  override.collectionGroup === 'stores' && override.fieldPath === 'healthSignals'
));
assert(
  healthSignalsOverride.length === 1
    && Array.isArray(healthSignalsOverride[0].indexes)
    && healthSignalsOverride[0].indexes.length === 0,
  'stores.healthSignals must have one automatic-index exemption',
);

[
  [trustReadme, 'weekly distinct and returning-customer counters'],
  [loyaltyReadme, 'cannot prove that the same customer returned'],
  [riskReadme, 'cannot become owner-facing truth'],
  [validation, 'HEALTH_SIGNALS_DORMANT_UNVALIDATED_COUNTERS'],
  [trustFirebase, 'stores.healthSignals'],
  [loyaltyFirebase, 'cannot infer returning customers'],
  [riskFirebase, 'no independent scheduler, listener, collection, or write'],
].forEach(([source, token]) => assert(source.includes(token), `health-signal docs missing boundary: ${token}`));

assert(
  packageJson.scripts['verify:health-signal-skeleton-boundary']
    === 'node scripts/verification/verify-health-signal-skeleton-boundary.js',
  'package must expose the health-signal skeleton verifier',
);
assert(
  packageJson.scripts['verify:functions-analytics-persistence']?.includes('test:functions-analytics-persistence'),
  'aggregate analytics verification must retain the executable dormant guard test',
);

console.log('Trust, loyalty, and risk health-signal skeleton boundary verification passed.');
