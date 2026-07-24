const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assertIncludes = (source, value, label) => {
    if (!source.includes(value)) throw new Error(`${label}: missing ${value}`);
};
const assertNotIncludes = (source, value, label) => {
    if (source.includes(value)) throw new Error(`${label}: stale ${value}`);
};

const projects = read('src/database/projects/index.ts');
const menuPage = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
const mce = read('src/lib/mce/correctnessResolver.ts');
const quality = read('src/lib/mce/qualitySignals.ts');
const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const snapshotRetention = read('functions/src/schedulers/menuSnapshotRetention.ts');
const verification = read('__docs__/menu-correctness-engine/menu-correctness-engine_verification-2026-07-16.md');

assertIncludes(projects, 'persistedPublishData._mce = publishMceRuntime.toMCEMetadata(mceResult);', 'standalone publish MCE stamp');
assertIncludes(projects, 'populateMasterCache(storedMasterProjectId, linkedMasterProject);', 'linked publish master reuse');
assertIncludes(projects, 'const publishedTruthProject = await resolveProjectForRender({', 'linked resolved publish truth');
assertIncludes(projects, 'storeProject: result.project as Project,', 'linked committed outlet project input');
assertIncludes(projects, "publishedTruthProject._resolved?.isMasterLinked !== true", 'linked publish resolved-truth fail closed');
assertIncludes(projects, "project_snapshot_skipped_oversize", 'snapshot size guard diagnostics');
assertNotIncludes(menuPage, 'showContextLine={false}', 'public trust context visibility');
assertIncludes(mce, 'validatePrice(price).success', 'canonical stored-price validation');
assertIncludes(quality, 'isDescriptionMissing(item, [lang])', 'primary-language description signal');
assertIncludes(maintenanceScheduler, 'selectDeterministicRetentionStorePage(', 'menu snapshot deterministic retention paging');
assertIncludes(maintenanceScheduler, 'including inactive stores whose old snapshots still need expiry', 'inactive-store snapshot retention boundary');
assertIncludes(maintenanceScheduler, 'deleteExpiredMenuSnapshotsInCollectionRef({', 'menu snapshot shared retention helper');
assertIncludes(snapshotRetention, ".where('createdAt', '<=', cutoff)", 'legacy/current snapshot creation-time retention query');
assertNotIncludes(snapshotRetention, ".where('expiresAt', '<=', params.now)", 'legacy snapshot expiry-only orphaning query');
assertNotIncludes(read('scripts/setup-firestore-ttl.sh'), '--collection-group=menuSnapshots', 'ineffective dynamic-subcollection TTL policy');
assertIncludes(verification, 'Linked outlet ordinary saves remain protected by the authenticated outlet-save schema and policy transaction', 'linked MCE truth boundary');
assertIncludes(verification, 'Owner/release pending', 'external evidence boundary');

console.log('Menu correctness, quality, trust, and snapshot source boundary verified.');
