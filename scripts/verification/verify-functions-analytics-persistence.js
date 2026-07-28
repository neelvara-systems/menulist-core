#!/usr/bin/env node

const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sourceFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relativePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const features = read('src/config/features.ts');
for (const flag of [
  'ENABLE_TRUST_HEALTH_SIGNAL',
  'ENABLE_LOYALTY_HEALTH_SIGNAL',
  'ENABLE_RISK_DECLINE_DETECTION',
]) {
  assert(
    new RegExp(`${flag}:\\s*false,`).test(features),
    `${flag} must remain false while exact health-signal inputs and scheduling are dormant.`,
  );
}

const healthWorkerPath = path.normalize('functions/src/analytics/healthSignalsComputation.ts');
const wiredFunctionsSource = sourceFiles('functions/src')
  .filter((file) => path.normalize(file) !== healthWorkerPath)
  .map((file) => read(file))
  .join('\n');
assert(
  !wiredFunctionsSource.includes('processHealthSignalsForAllStores'),
  'Dormant health-signal computation must not be called or exported by Functions runtime code.',
);
assert(
  !wiredFunctionsSource.includes('healthSignalsComputation'),
  'Dormant health-signal module must not be imported by Functions runtime code.',
);

const healthCardsPath = path.normalize(
  'src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx',
);
const ownerConsumerSource = [
  ...sourceFiles('src/components/templates/main-app/dashboard'),
  ...sourceFiles('src/components/mobile'),
]
  .filter((file) => path.normalize(file) !== healthCardsPath)
  .map((file) => read(file))
  .join('\n');
assert(
  !ownerConsumerSource.includes('HealthSignalCards'),
  'Dormant HealthSignalCards must not be mounted on desktop or mobile owner surfaces.',
);
assert(
  !ownerConsumerSource.includes('.healthSignals'),
  'Desktop/mobile owner surfaces must not consume dormant persisted healthSignals.',
);

const realtime = read('functions/src/analytics/realtimeTracking.ts');
[
  "updateData[data.mode === 'qna' ? 'qnaChats' : 'assistantChats'] = FieldValue.increment(1)",
  'await doc.create({',
  "const tId = requireNumericScopeDocumentId(data.tId, 'tenant ID');",
  'date: targetDate,',
].forEach((token) => assert(
  realtime.includes(token),
  `Realtime analytics persistence boundary must include ${token}`,
));
assert(
  !realtime.includes("qnaChats: data.mode === 'qna' ? FieldValue.increment(1) : 0"),
  'Realtime chat completion must not overwrite the non-selected mode counter with zero.',
);

const healthSignals = read('functions/src/analytics/healthSignalsComputation.ts');
[
  "const uniqueVisitors = readNonNegativeInteger(data.uniqueVisitors);",
  "data.analyticsScope !== 'customer'",
  "data.surface !== 'menu'",
  'id !== getAnalyticsDocId.daily(expectedTId, expectedSId, projectId, localDate)',
  '.limit(MAX_DAILY_ANALYTICS_DOCS_PER_STORE + 1)',
  'getRecentQualifyingWeeks(weeks, currentDate)',
  'normalizeStoreSummaryNumericAliases([storeData.tenantId, storeData.tId])',
  'normalizeStoreSummaryNumericAliases([storeData.storeId, storeData.sId])',
].forEach((token) => assert(
  healthSignals.includes(token),
  `Health-signal persistence boundary must include ${token}`,
));
for (const forbidden of [
  'Math.ceil(doc.totalViews * 0.7)',
  'Math.ceil(doc.totalViews * 0.4)',
  'const prefix = `${tId}_${sId}_menu_daily_`',
  'const recent = weeks.slice(-4);',
]) {
  assert(!healthSignals.includes(forbidden), `Health signals must not retain obsolete/invented input ${forbidden}`);
}

const staleness = read('functions/src/analytics/stalenessCheck.ts');
[
  'getStalenessCheckpointId(params.tId, params.sId)',
  'return db.runTransaction(async (transaction) => {',
  'normalizeOwnerNotificationNumericScopeDocumentId(storeData.tId)',
  'MAX_STALE_STORES_CHECKED_PER_NIGHT = 500',
].forEach((token) => assert(
  staleness.includes(token),
  `Staleness persistence boundary must include ${token}`,
));
assert(
  !staleness.includes('db.collection(DB_COLLECTIONS.MESSAGE_LOGS).add({'),
  'Staleness cooldown writes must not use non-atomic auto-ID additions.',
);

process.stdout.write('Functions analytics persistence verifier passed.\n');
