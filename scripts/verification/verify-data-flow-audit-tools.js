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
const fingerprintBackfill = readFileSync(
    path.join(root, 'scripts/audit/backfill-review-fingerprints.mjs'),
    'utf8',
);
const jsonObjectKeyIntegrity = readFileSync(
    path.join(root, 'scripts/audit/json-object-key-integrity.mjs'),
    'utf8',
);
const auditReport = readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.md'),
    'utf8',
);

assert.equal(
    packageJson.scripts?.['audit:data-flow:manifest'],
    'node scripts/audit/generate-data-flow-audit-manifest.mjs',
    'package scripts must expose the maintained coverage manifest generator',
);

const parseSummaryCount = (label) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = auditReport.match(new RegExp(`^\\| ${escapedLabel} \\| \\*?\\*?([\\d,]+)\\*?\\*? \\|`, 'm'));
    assert(match, `audit report must expose the canonical ${label} findings summary row`);
    return Number(match[1].replaceAll(',', ''));
};
const severityCounts = ['P0', 'P1', 'P2', 'P3'].map(parseSummaryCount);
const reportedFindingTotal = parseSummaryCount('**Total**');
assert.equal(
    severityCounts.reduce((total, count) => total + count, 0),
    reportedFindingTotal,
    'audit findings summary total must equal the P0-P3 row sum',
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
assert.match(
    manifestGenerator,
    /const exactState = reviewState\[file\];[\s\S]*const state = exactState \|\| categoryDefaults \|\| \{\};/,
    'coverage manifest generator must preserve exact per-file review state before category metadata',
);
assert.match(
    fingerprintBackfill,
    /latestCommitDate >= review\.reviewedAt/,
    'review fingerprint backfill must reject same-day and later commits',
);
assert.match(
    fingerprintBackfill,
    /dirtyPaths\.has\(file\)/,
    'review fingerprint backfill must reject dirty and untracked paths',
);
assert.match(
    fingerprintBackfill,
    /review\.reviewedSha256 = digest/,
    'review fingerprint backfill must write only the current complete file digest',
);
assert.match(
    manifestGenerator,
    /exactState\.reviewedSha256 === sha256/,
    'coverage manifest generator must bind reviewed status to the current file digest',
);
assert.match(
    manifestGenerator,
    /Review status reopened: no exact reviewedSha256 matches the current file content\./,
    'coverage manifest generator must expose stale or unfingerprinted review evidence',
);
assert.doesNotMatch(
    manifestGenerator,
    /omitted-large-binary/,
    'coverage manifest generator must not substitute a shared placeholder for large-file content digests',
);
assert.match(manifestGenerator, /if \(!isMissingFileError\(error\)\) throw error;/, 'coverage manifest generator must ignore only files that vanish during inventory');
assert.match(manifestGenerator, /vanishedDuringInventory/, 'coverage manifest generator must report live-inventory races');
assert.match(manifestGenerator, /'\.py'/, 'coverage manifest generator must include first-party Python scripts');
assert.match(manifestGenerator, /\['\.next-audit-build', 'generated Next\.js audit build output; next\.config\.js and source inputs remain in scope'\]/, 'coverage manifest generator must exclude generated Next.js audit build output');
assert.match(
    manifestGenerator,
    /'src\/scripts\/fabric\.min\.js'[\s\S]*vendored minified Fabric\.js 1\.6\.4 bundle with no first-party callers/,
    'coverage manifest generator must explicitly exclude the dormant vendored Fabric 1.6.4 bundle',
);
assert.match(
    collectionGenerator,
    /if \(\/\^\\s\*match\\s\+\\\/\/\.test\(line\)\)/,
    'collection catalog generator must restrict rule parsing to actual match declarations',
);
assert.match(
    collectionGenerator,
    /for \(let segmentIndex = 0; segmentIndex < pathSegments\.length; segmentIndex \+= 2\)/,
    'collection catalog generator must inspect every literal collection-position rule segment',
);
assert.match(
    collectionGenerator,
    /FIRESTORE_RULE_PATH_WRAPPERS\.has\(segment\)/,
    'collection catalog generator must exclude Firestore grammar wrappers from collection rows',
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
    /function resolveCollectionConstant\(file, constantKey\)[\s\S]*productFor\(file\)/,
    'collection catalog generator must resolve ambiguous DB constant aliases by source product',
);
assert.match(
    collectionGenerator,
    /product === 'Answerlattice'[\s\S]*ANSWERLATTICE_DB_COLLECTIONS\.\$\{suffix\}[\s\S]*ANSWERLATTICE_FUNCTIONS_DB_COLLECTIONS\.\$\{suffix\}/,
    'collection catalog generator must resolve app and Functions Answerlattice DB_COLLECTIONS aliases through their product-local registries',
);
assert.doesNotMatch(
    collectionGenerator,
    /const valuesByKey = new Map\(\)/,
    'collection catalog generator must not collapse same-suffix product constants into a global alias map',
);
assert.match(
    collectionGenerator,
    /parseConstantObject\('src\/constants\/signaldesk\/database\.ts', 'SIGNALDESK_COLLECTIONS'/,
    'collection catalog generator must inventory product-local SignalDesk constants',
);
for (const productFirestoreFile of [
    'firestore-campaigncue.rules',
    'firestore-campaigncue.indexes.json',
    'firestore-signaldesk.rules',
    'firestore-signaldesk.indexes.json',
]) {
    assert(
        collectionGenerator.includes(`'${productFirestoreFile}'`),
        `collection catalog generator must inventory ${productFirestoreFile}`,
    );
}
assert.match(
    collectionGenerator,
    /for \(const \[constantKey, collectionName\] of constantValues\)[\s\S]*constantKey\.includes\('\.'\)/,
    'collection catalog generator must follow scalar collection constants into their producers and consumers',
);
assert.match(
    collectionGenerator,
    /const localCollectionConstants = new Map\(\)/,
    'collection catalog generator must follow file-local collection constants',
);
assert.match(
    collectionGenerator,
    /parseCollectionProperties\([\s\S]*CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY/,
    'collection catalog generator must follow collection-valued properties in non-database runtime registries',
);
assert.match(
    collectionGenerator,
    /function parseCollectionRegistryDefinitions\(\)[\s\S]*\\bcollection\\s\*:[\s\S]*collectionRegistryDefinitions[\s\S]*for \(const \[registryName, members\]/,
    'collection catalog generator must follow collection-valued runtime arrays into their generic consumers',
);
assert.match(
    collectionGenerator,
    /findModularFirestoreCalls\(content\)[\s\S]*pathArguments\.length < 2[\s\S]*resolveCollectionArgument/,
    'collection catalog generator must follow each collection-position argument in modular multi-segment Firestore calls without treating document ids as collections',
);
assert.match(
    collectionGenerator,
    /const templatePathAliases = new Map\(\)/,
    'collection catalog generator must follow composed collection-path aliases',
);
assert.match(
    collectionGenerator,
    /\[A-Z\]\[A-Z0-9_\]\*_PATHS[\s\S]*addLiteralPathEvidence/,
    'collection catalog generator must follow immutable Firestore path-fixture matrices',
);
assert.match(
    collectionGenerator,
    /pathSegments: match\[1\]\.split\('\/'\)/,
    'collection catalog generator must split slash-delimited SDK path literals into collection positions',
);
assert.match(
    collectionGenerator,
    /\[A-Za-z_\$\]\[\\w\$\]\*Collections[\s\S]*operations: \['security-rule'\]/,
    'collection catalog generator must follow dynamic security-verifier collection lists',
);
assert.match(
    collectionGenerator,
    /function evidenceFingerprint\(entry\)/,
    'collection catalog generator must fingerprint the current reverse-flow evidence and source files',
);
assert.match(
    collectionGenerator,
    /review\?\.reviewedEvidenceSha256 !== evidenceSha256[\s\S]*\? 'in-progress'/,
    'collection catalog generator must reopen reviewed collections whose evidence fingerprint changed',
);
assert.match(
    collectionGenerator,
    /unreviewedSourceFiles\.length > 0/,
    'collection catalog generator must reopen collections with any non-current source review',
);
assert.match(
    collectionGenerator,
    /review\.reviewedSha256 === digest/,
    'collection catalog generator must compare every source review to current content',
);
assert.match(
    collectionGenerator,
    /Invalid reviewedEvidenceSha256 for \$\{collectionName\}/,
    'collection catalog generator must reject malformed review fingerprints',
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
assert(
    summary.byCategoryAndReviewStatus
        && typeof summary.byCategoryAndReviewStatus === 'object',
    'manifest summary must expose category/status routing counts',
);
const manifestCsv = readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.manifest.csv'),
    'utf8',
);
const exclusionsCsv = readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.exclusions.csv'),
    'utf8',
);
assert(
    manifestCsv.includes('"scripts/localization/translate-owner-locale-units.py","script/maintenance"'),
    'coverage manifest must inventory the first-party owner-locale Python pipeline',
);
assert(
    !manifestCsv.includes('"src/scripts/fabric.min.js",'),
    'coverage manifest must not count the dormant vendored Fabric 1.6.4 bundle as first-party runtime',
);
assert(
    exclusionsCsv.includes('"src/scripts/fabric.min.js","vendored minified Fabric.js 1.6.4 bundle with no first-party callers; active Fabric dependency, adapters, editor source, and lockfiles remain in scope","upstream Fabric.js distribution"'),
    'coverage exclusions must record the exact vendored Fabric bundle and retained first-party sources',
);

const collectionCsv = readFileSync(
    path.join(root, '__docs__/audits/data-flow-pipeline-deep-audit.collections.csv'),
    'utf8',
);
assert(
    !collectionCsv.split('\n').some((line) => line.startsWith('"documents",')),
    'collection catalog must not emit the Firestore documents grammar wrapper as a collection',
);
assert(collectionCsv.startsWith('"collection_name","product_authority"'), 'collection catalog must retain its canonical CSV header');
assert(collectionCsv.trim().split('\n').length > 1, 'collection catalog must contain at least one collection row');
for (const documentId of ['schedulerLock', 'storesSummary', 'summary']) {
    assert(
        !collectionCsv.split('\n').some((line) => line.startsWith(`"${documentId}",`)),
        `collection catalog must not report document ID ${documentId} as a collection`,
    );
}
assert(
    !collectionCsv.split('\n').some((line) => line.startsWith('"databases",')),
    'collection catalog must not report the Firestore databases rule wrapper as a collection',
);
const campaignCueWorkspaceRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"campaigncueWorkspaces",'));
assert(campaignCueWorkspaceRow, 'collection catalog must contain CampaignCue workspace declarations');
assert(
    campaignCueWorkspaceRow.includes('"CampaignCue"')
        && !campaignCueWorkspaceRow.includes('MenuList/shared'),
    'collection catalog must preserve CampaignCue product authority for source and verifier evidence',
);
const campaignCueAgencyLinksRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"agencyClientLinks",'));
assert(
    campaignCueAgencyLinksRow?.includes('firestore-campaigncue.rules')
        && campaignCueAgencyLinksRow.includes('security-rule'),
    'collection catalog must include CampaignCue nested rule evidence',
);
const signalDeskContentPerformanceRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"signaldeskContentPerformanceSummaries",'));
assert(
    signalDeskContentPerformanceRow?.includes('firestore-signaldesk.rules')
        && signalDeskContentPerformanceRow.includes('firestore-signaldesk.indexes.json')
        && signalDeskContentPerformanceRow.includes('security-rule')
        && signalDeskContentPerformanceRow.includes('index definition'),
    'collection catalog must include SignalDesk rule and index evidence',
);
const fontPresetRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"fontPreset",'));
assert(fontPresetRow, 'collection catalog must contain the scalar fontPreset collection');
assert(
    fontPresetRow.includes('src/database/static/fontPresets.ts')
        && fontPresetRow.includes('read/query')
        && fontPresetRow.includes('write')
        && fontPresetRow.includes('delete')
        && fontPresetRow.includes('firestore.rules')
        && fontPresetRow.includes('"in-progress"'),
    'collection catalog must trace scalar collection constants and reopen when newly associated rule evidence is not fully reviewed',
);
for (const sharedAssetCollection of ['graphics', 'illustrations', 'images']) {
    const sharedAssetRow = collectionCsv
        .split('\n')
        .find((line) => line.startsWith(`"${sharedAssetCollection}",`));
    assert(
        sharedAssetRow?.includes(`STATIC_ASSET_COLLECTIONS.${sharedAssetCollection.toUpperCase()}`)
            && sharedAssetRow.includes('src/database/static/static.ts')
            && sharedAssetRow.includes('read/query')
            && sharedAssetRow.includes('write')
            && sharedAssetRow.includes('delete')
            && sharedAssetRow.includes('firestore.rules')
            && sharedAssetRow.includes('security-rule'),
        `collection catalog must trace dynamic shared asset collection ${sharedAssetCollection}`,
    );
}
const commonCollectionRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"common",'));
assert(
    commonCollectionRow?.includes('firestore.rules')
        && commonCollectionRow.includes('security-rule'),
    'collection catalog must preserve the literal common root collection in nested rule paths',
);
const notificationLogsRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"notificationLogs",'));
assert(
    notificationLogsRow?.includes('src/lib/notifications/index.ts')
        && notificationLogsRow.includes('read/query')
        && notificationLogsRow.includes('write')
        && notificationLogsRow.includes('transaction/batch'),
    'collection catalog must trace file-local notification targets and their indirect operations',
);
const answerlatticeNotificationLogsRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"answerlattice_notificationLogs",'));
assert(
    answerlatticeNotificationLogsRow?.includes('src/lib/notifications/index.ts')
        && answerlatticeNotificationLogsRow.includes('scripts/verification/test-notification-delivery-claim-emulator.ts')
        && answerlatticeNotificationLogsRow.includes('write')
        && answerlatticeNotificationLogsRow.includes('transaction/batch'),
    'collection catalog must resolve generic product aliases and their indirect operations',
);
for (const collectionName of [
    'ownerNotificationEvents',
    'ownerNotificationDeliveries',
    'ownerNotificationRateLimits',
]) {
    const ownerNotificationRow = collectionCsv
        .split('\n')
        .find((line) => line.startsWith(`"${collectionName}",`));
    assert(
        ownerNotificationRow?.includes('src/lib/owner-notifications/index.ts')
            && ownerNotificationRow.includes('functions/src/ownerNotifications/processor.ts')
            && ownerNotificationRow.includes('transaction/batch'),
        `collection catalog must trace active app and Functions consumers of ${collectionName}`,
    );
}
const campaignCuePackTemplateIndexesRow = collectionCsv
    .split('\n')
    .find((line) => line.startsWith('"packTemplateIndexes",'));
assert(
    campaignCuePackTemplateIndexesRow?.includes('src/lib/campaigncue/pack-templates/catalog.ts')
        && campaignCuePackTemplateIndexesRow.includes('src/lib/campaigncue/pack-templates/workspaceTemplates.ts')
        && campaignCuePackTemplateIndexesRow.includes('scripts/verification/test-campaigncue-rules.ts')
        && campaignCuePackTemplateIndexesRow.includes('scripts/verification/verify-campaigncue-pack-templates.js'),
    'collection catalog must trace the CampaignCue workspace template index through its registry alias, readers, writers, rules emulator and source verifier',
);
for (const pricingCollection of ['projectsData', 'projectsMetadata']) {
    const pricingCollectionRow = collectionCsv
        .split('\n')
        .find((line) => line.startsWith(`"${pricingCollection}",`));
    assert(
        pricingCollectionRow?.includes('src/lib/pricing/integrityEngine.ts'),
        `collection catalog must trace ${pricingCollection} template-path aliases into the pricing engine`,
    );
}
const changelogPagesRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"changelogPages",'));
assert(
    changelogPagesRow?.includes('scripts/verification/test-tenant-store-scoped-rules.ts'),
    'collection catalog must associate static rules-emulator path fixtures with changelogPages',
);
const signalDeskChannelIdentitiesRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"signaldeskChannelIdentities",'));
assert(
    signalDeskChannelIdentitiesRow?.includes('scripts/verification/verify-signaldesk-security-rules.js'),
    'collection catalog must associate dynamic SignalDesk rule-verifier lists with their collections',
);
const campaignCueIdempotencyRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"idempotencyKeys",'));
assert(
    campaignCueIdempotencyRow?.includes('src/lib/campaigncue/server.ts')
        && campaignCueIdempotencyRow.includes('src/lib/campaigncue/cue-layers/server.ts'),
    'collection catalog must retain active CampaignCue callers when another product shares the IDEMPOTENCY_KEYS suffix',
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
    posDeliveryLogsRow.includes('scripts/verification/test-pos-sync-secret-rules.ts'),
    'collection catalog must bind posDeliveryLogs status and evidence to its rules emulator instead of a stale fixed fingerprint',
);
const ownerControlUsageRow = collectionCsv
    .split('\n')
    .find((row) => row.startsWith('"ownerControlUsage",'));
assert(ownerControlUsageRow, 'collection catalog must contain ownerControlUsage');
assert(
    ownerControlUsageRow.includes('"in-progress"')
        && ownerControlUsageRow.includes('firestore.rules')
        && ownerControlUsageRow.includes('AUDIT-OWNER-CONTROL-WRITE-INTEGRITY-001'),
    'collection catalog must retain owner-control evidence while reopening it after the shared rules source changes',
);
for (const collectionName of ['applicationLogs', 'errorLogs']) {
    const row = collectionCsv
        .split('\n')
        .find((entry) => entry.startsWith(`"${collectionName}",`));
    assert(row, `collection catalog must retain reserved Firestore ${collectionName}`);
    assert(
        !row.includes(`src/database/loggers/${collectionName === 'applicationLogs' ? 'applicationLogger' : 'errorLogger'}.ts`),
        `collection catalog must not misclassify Realtime Database ${collectionName} helpers as Firestore sources`,
    );
}

console.log('Data-flow audit tooling verification passed.');
