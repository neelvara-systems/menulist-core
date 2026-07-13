#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const clientDal = read('src/database/projects/index.ts');
const clientLifecycle = read('src/database/projects/specialMenuLifecycle.ts');
const clientHook = read('src/hooks/useSpecialMenus.ts');
const scheduler = read('functions/src/decisionBlocksScoring.ts');
const schedulerLifecycle = read('functions/src/schedulers/specialMenuLifecycle.ts');
const functionFlags = read('functions/src/constants/features.ts');
const overlayResolver = read('src/lib/menu/specialMenuOverlay.ts');
const publicMenu = read('src/app/client/[[...slug]]/page.tsx');
const digitalScreen = read('src/database/campaigns/serverScreen.ts');

const failures = [];
const requireText = (source, token, message) => {
    if (!source.includes(token)) failures.push(message);
};
const forbidText = (source, token, message) => {
    if (source.includes(token)) failures.push(message);
};

requireText(clientLifecycle, 'runTransaction(params.db', 'client lifecycle must use a Firestore transaction');
requireText(clientLifecycle, "sourceProjectId: scope.project.projectId", 'client temp status must identify its source project');
requireText(clientDal, 'const transactionResult = await runTransaction(firebaseClient', 'special-menu creation must be transactional');
requireText(clientDal, 'const result = await runTransaction(firebaseClient', 'special-menu editing must be transactional');
requireText(clientDal, 'buildSummaryProjectPayload(newProjectId, summaryData)', 'create transaction must write the canonical summary shape');
requireText(clientDal, 'transitionSpecialMenuLifecycle({', 'manual lifecycle actions must use the shared transaction helper');
requireText(clientDal, 'createSpecialMenuOverlayFiles(baseData.files)', 'new overlay projects must not clone base menu rows');
requireText(clientDal, 'const [summaryDoc, storeDoc] = await Promise.all([', 'special-menu reads must share one validated scope snapshot');
forbidText(clientDal, 'activateSpecialMenuInternal(', 'legacy split-write activation helper must not return');
requireText(clientHook, '["special-menus-list", tId, sId]', 'special-menu SWR cache must be tenant/store scoped');
forbidText(clientHook, 'enabled ? "special-menus-list" : null', 'global special-menu SWR cache key must not return');

requireText(scheduler, 'parseSummaryProjects(summaryDoc.data())', 'scheduler must parse flat and nested summary shapes');
requireText(scheduler, 'transitionScheduledSpecialMenu({', 'scheduler must use the Admin transaction helper');
requireText(scheduler, "action: 'expire' as const", 'scheduler must expire ended windows before activation');
forbidText(scheduler, 'summaryDoc.data()?.projects || {}', 'scheduler must not assume a nested projects summary');
forbidText(scheduler, "'_specialMenu.status': 'active'", 'scheduler must not publish lifecycle state through split updates');
forbidText(scheduler, 'specialMenuDisplayName: projData.specialMenuDisplayName', 'scheduler logs must not include owner display copy');
requireText(schedulerLifecycle, 'params.db.runTransaction', 'Admin lifecycle must use a Firestore transaction');
requireText(schedulerLifecycle, "outcome: 'blocked'", 'Admin lifecycle must represent active-menu contention without retry noise');
requireText(schedulerLifecycle, 'sourceProjectId: projectId', 'Admin temp status must identify its source project');
requireText(functionFlags, 'ENABLE_TEMP_STATUS: true', 'Functions and app temp-status lifecycle flags must agree');
requireText(overlayResolver, 'baseCategoryIds.has(sourceId)', 'legacy overlay categories must be deduplicated');
requireText(overlayResolver, 'baseItemIds.has(sourceId)', 'legacy overlay items must be deduplicated');
requireText(overlayResolver, 'categoryIdMap.get(sourceCategoryId)', 'overlay item category references must be remapped');
requireText(publicMenu, 'mergeSpecialMenuOverlayProjects(baseResult.projectData, specialProjectData)', 'public menu must use the shared overlay resolver');
requireText(digitalScreen, 'mergeSpecialMenuOverlayProjects(baseProject, specialProject)', 'digital screen must use the shared overlay resolver');
forbidText(publicMenu, 'function mergeOverlayMenu(', 'public menu must not keep a divergent overlay implementation');
forbidText(digitalScreen, 'const mergeOverlayMenu =', 'digital screen must not keep a divergent overlay implementation');

if (failures.length) {
    console.error('Special menu lifecycle verification failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log('Special menu lifecycle source verification passed.');
