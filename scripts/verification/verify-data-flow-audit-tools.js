#!/usr/bin/env node

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifestGenerator = readFileSync(
    path.join(root, 'scripts/audit/generate-data-flow-audit-manifest.mjs'),
    'utf8',
);
const collectionGenerator = readFileSync(
    path.join(root, 'scripts/audit/generate-firestore-collection-catalog.mjs'),
    'utf8',
);
const jsonObjectKeyIntegrity = readFileSync(
    path.join(root, 'scripts/audit/json-object-key-integrity.mjs'),
    'utf8',
);

assert.equal(
    packageJson.scripts?.['audit:data-flow:manifest'],
    'node scripts/audit/generate-data-flow-audit-manifest.mjs',
    'package scripts must expose the maintained coverage manifest generator',
);
assert.equal(
    packageJson.scripts?.['audit:data-flow:catalog'],
    'node scripts/audit/generate-firestore-collection-catalog.mjs',
    'package scripts must expose the maintained Firestore collection catalog generator',
);

for (const [label, source] of [
    ['coverage manifest generator', manifestGenerator],
    ['Firestore collection catalog generator', collectionGenerator],
]) {
    assert.match(source, /existsSync\(path\.join\(ROOT, file\)\)/, `${label} must ignore deleted tracked paths`);
    assert.match(source, /git[\s\S]*ls-files[\s\S]*--cached[\s\S]*--others[\s\S]*--exclude-standard/, `${label} must inventory tracked and non-ignored untracked files`);
}

assert.match(manifestGenerator, /assertNoDuplicateJsonObjectKeys\(source, 'Audit review state'\)/, 'coverage manifest generator must reject duplicate review-state keys');
assert.match(manifestGenerator, /if \(!isMissingFileError\(error\)\) throw error;/, 'coverage manifest generator must ignore only files that vanish during inventory');
assert.match(manifestGenerator, /vanishedDuringInventory/, 'coverage manifest generator must report live-inventory races');
assert.match(manifestGenerator, /\['\.next-audit-build', 'generated Next\.js audit build output; next\.config\.js and source inputs remain in scope'\]/, 'coverage manifest generator must exclude generated Next.js audit build output');
assert.match(
    collectionGenerator,
    /if \(\/\^\\s\*match\\s\+\\\/\/\.test\(line\)\)/,
    'collection catalog generator must restrict rule parsing to actual match declarations',
);
assert.match(
    collectionGenerator,
    /line\.matchAll\(\/\\\/\(\[A-Za-z\]\[A-Za-z0-9_-\]\*\)\\\/\\\{\[\^}\/\]\+\\\}\/g\)/,
    'collection catalog generator must inspect every nested literal/wildcard rule segment',
);
assert.match(
    collectionGenerator,
    /assertNoDuplicateJsonObjectKeys\(source, 'Firestore collection review state'\)/,
    'collection catalog generator must reject duplicate collection review-state keys',
);
assert.match(
    collectionGenerator,
    /parseConstantObject\('functions\/src\/constants\/database\.ts', 'DB_COLLECTIONS'/,
    'collection catalog generator must scope Functions constants to the collection object',
);
assert.match(
    collectionGenerator,
    /parseConstantObject\('src\/constants\/signaldesk\/database\.ts', 'SIGNALDESK_COLLECTIONS'/,
    'collection catalog generator must inventory product-local SignalDesk constants',
);
assert.match(
    collectionGenerator,
    /review\?\.reviewStatus \?\? 'inventory-only'/,
    'collection catalog generator must preserve reviewed collection status',
);
assert.match(jsonObjectKeyIntegrity, /duplicate object key/, 'JSON integrity helper must expose a fixed duplicate-key failure');
const duplicateKeyTest = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    "import { assertNoDuplicateJsonObjectKeys } from './scripts/audit/json-object-key-integrity.mjs'; assertNoDuplicateJsonObjectKeys('{\"a\":1,\"nested\":{\"b\":2}}'); try { assertNoDuplicateJsonObjectKeys('{\"a\":1,\"a\":2}', 'fixture'); process.exit(2); } catch (error) { if (!String(error).includes('duplicate object key')) throw error; }",
], { cwd: root, encoding: 'utf8' });
assert.equal(duplicateKeyTest.status, 0, `duplicate-key behavioral test failed:\n${duplicateKeyTest.stderr || duplicateKeyTest.stdout}`);

for (const script of [
    'scripts/audit/generate-data-flow-audit-manifest.mjs',
    'scripts/audit/generate-firestore-collection-catalog.mjs',
]) {
    const result = spawnSync(process.execPath, [script], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
    });
    assert.equal(result.status, 0, `${script} failed:\n${result.stderr || result.stdout}`);
}

const summary = JSON.parse(readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.manifest-summary.json'),
    'utf8',
));
assert(Number.isSafeInteger(summary.inScopeFiles) && summary.inScopeFiles > 0, 'manifest summary must report in-scope files');

const collectionCsv = readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.collections.csv'),
    'utf8',
);
assert(collectionCsv.startsWith('"collection_name","product_authority"'), 'collection catalog must retain its canonical CSV header');
assert(collectionCsv.trim().split('\n').length > 1, 'collection catalog must contain at least one collection row');
for (const documentId of ['schedulerLock', 'storesSummary', 'summary']) {
    assert(
        !collectionCsv.split('\n').some((line) => line.startsWith(`"${documentId}",`)),
        `collection catalog must not report document ID ${documentId} as a collection`,
    );
}
const campaignCueWorkspaceRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"campaigncueWorkspaces",'));
assert(campaignCueWorkspaceRow, 'collection catalog must contain CampaignCue workspace declarations');
assert(
    campaignCueWorkspaceRow.includes('"CampaignCue"')
        && !campaignCueWorkspaceRow.includes('MenuList/shared'),
    'collection catalog must preserve CampaignCue product authority for source and verifier evidence',
);
const posDeliveryLogsRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"posDeliveryLogs",'));
assert(posDeliveryLogsRow, 'collection catalog must contain posDeliveryLogs');
assert(
    posDeliveryLogsRow.includes('rule path observed;'),
    'collection catalog must recognize nested posDeliveryLogs Firestore rules',
);
assert(
    posDeliveryLogsRow.includes('"reviewed"'),
    'collection catalog must preserve reviewed posDeliveryLogs state',
);
const ownerControlUsageRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"ownerControlUsage",'));
assert(ownerControlUsageRow, 'collection catalog must contain ownerControlUsage');
assert(
    ownerControlUsageRow.includes('"reviewed"')
        && ownerControlUsageRow.includes('AUDIT-OWNER-CONTROL-WRITE-INTEGRITY-001'),
    'collection catalog must preserve owner-control review and finding evidence',
);

console.log('Data-flow audit tooling verification passed.');
