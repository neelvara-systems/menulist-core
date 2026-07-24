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
const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
const functionFlags = read('functions/src/constants/features.ts');
const sharedSchedule = read('src/data/shared/specialMenuSchedule.ts');
const functionSharedSchedule = read('functions/src/sharedData/specialMenuSchedule.ts');
const mobileProjectSelector = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
const mobileProjectsProvider = read('src/components/mobile/providers/MobileProjectsProvider.tsx');
const mobileSpecialMenuScreen = read('src/components/mobile/screens/MobileSpecialMenuScreen.tsx');
const ownerProjectSelection = read('src/lib/projects/projectSelection.ts');
const analyticsDashboard = read('src/components/templates/main-app/dashboard/AnalyticsDashboard/index.tsx');
const ownerDashboard = read('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx');
const desktopCreateModal = read('src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx');
const desktopProjectEditModal = read('src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx');
const desktopProjectSelector = read('src/components/templates/main-app/projects/ProjectDetails/ProjectSelector.tsx');
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
requireText(clientLifecycle, "let shouldReadStore = params.action !== 'cancel';", 'cancel must preserve missing-store compatibility');
requireText(clientLifecycle, 'const storeSnapshot = shouldReadStore ? await transaction.get(storeRef) : null;', 'cancel must repair readable store lifecycle state');
requireText(clientLifecycle, 'specialMenuNextTransitionAt:', 'manual lifecycle must maintain the due-work marker');
requireText(clientLifecycle, "sourceProjectId: scope.project.projectId", 'client temp status must identify its source project');
requireText(clientLifecycle, 'hasLiveCompetingActiveMenu', 'client activation must distinguish live contention from a stale store pointer');
requireText(clientLifecycle, 'isLiveCompetingSpecialMenuProject(', 'client activation must validate a competing pointer target');
requireText(clientDal, 'const transactionResult = await runTransaction(firebaseClient', 'special-menu creation must be transactional');
requireText(clientDal, 'const result = await runTransaction(firebaseClient', 'special-menu editing must be transactional');
requireText(clientDal, 'buildSummaryProjectPayload(newProjectId, summaryData)', 'create transaction must write the canonical summary shape');
requireText(clientDal, 'transitionSpecialMenuLifecycle({', 'manual lifecycle actions must use the shared transaction helper');
requireText(clientDal, 'End or cancel this special menu before deleting it.', 'active and scheduled special menus must not use generic deletion');
requireText(clientDal, 'End or cancel this special menu before making it inactive.', 'active and scheduled special menus must not use generic active toggles');
requireText(clientDal, 'assertGenericSpecialMenuUpdateBoundary(freshProject, data);', 'generic project saves must revalidate special-menu lifecycle fields inside the transaction');
requireText(clientDal, 'specialMenuNextTransitionAt:', 'special-menu create/edit must maintain the due-work marker');
requireText(clientDal, 'createSpecialMenuOverlayFiles(baseData.files)', 'new overlay projects must not clone base menu rows');
requireText(clientDal, 'const [summaryDoc, storeDoc] = await Promise.all([', 'special-menu reads must share one validated scope snapshot');
requireText(clientDal, 'assertExpectedSpecialMenuScope(scope, expectedScope);', 'special-menu DAL calls must require caller/session scope agreement');
requireText(clientDal, 'resolveExpectedProjectScope(session, expectedScope, "projects_list_scope_changed")', 'mobile project lists must require caller/session scope agreement');
requireText(clientDal, 'resolveExpectedProjectScope(session, expectedScope, "project_read_scope_changed")', 'mobile project details must require caller/session scope agreement');
forbidText(clientDal, 'activateSpecialMenuInternal(', 'legacy split-write activation helper must not return');
requireText(clientHook, '["special-menus-list", tId, sId]', 'special-menu SWR cache must be tenant/store scoped');
requireText(clientHook, 'return getSpecialMenus(expectedScope);', 'special-menu SWR fetchers must bind the cache key scope to the DAL read');
requireText(clientHook, 'dalCreate(data, expectedScope)', 'special-menu creates must retain hook scope');
requireText(clientHook, 'dalUpdate(data, expectedScope)', 'special-menu updates must retain hook scope');
requireText(clientHook, 'dalDeactivate(projectId, expectedScope)', 'special-menu deactivation must retain hook scope');
requireText(clientHook, 'dalCancel(projectId, expectedScope)', 'special-menu cancellation must retain hook scope');
forbidText(clientHook, 'enabled ? "special-menus-list" : null', 'global special-menu SWR cache key must not return');
requireText(mobileProjectsProvider, 'resolveMobileProjectScope(storeDetails, loggedInSession)', 'mobile project cache must require session/context scope agreement');
requireText(mobileProjectsProvider, 'latestProjectsRequestRef.current', 'mobile project list settlement must use latest-request ownership');
requireText(mobileProjectsProvider, 'inFlightProjectLoadsRef.current[requestKey] !== request', 'mobile project detail settlement must use latest-request ownership');
requireText(mobileProjectsProvider, 'getProjectsListWithoutLoader(true, expectedScope)', 'mobile project list DAL calls must retain expected scope');
requireText(mobileProjectsProvider, 'getProjectDataWithoutLoader(nextProjectId, expectedScope)', 'mobile project detail DAL calls must retain expected scope');
requireText(mobileProjectsProvider, 'hydratedScopeKeyRef.current === `${currentScope.tId}:${currentScope.sId}`', 'mobile project output must be masked until exact tenant/store hydration');
requireText(ownerProjectSelection, '`${OWNER_SELECTED_PROJECT_KEY}:${tenantScope}:${storeScope}`', 'owner project selection storage must be tenant/store partitioned');
requireText(analyticsDashboard, '[storeDetails?.storeId, storeDetails?.tenantId]', 'analytics project selection must refresh when either tenant or store changes');
requireText(ownerDashboard, '[storeDetails?.storeId, storeDetails?.tenantId]', 'owner dashboard project-selection callbacks must refresh when either tenant or store changes');
requireText(ownerDashboard, '[selectedProjectId, storeDetails?.storeId, storeDetails?.tenantId]', 'owner dashboard project selection persistence must retain current tenant/store');

requireText(scheduler, 'parseSummaryProjects(summaryDoc.data())', 'scheduler must parse flat and nested summary shapes');
requireText(scheduler, 'transitionScheduledSpecialMenu({', 'scheduler must use the Admin transaction helper');
requireText(scheduler, 'resolveNextSpecialMenuTransitionAt(parsedSummaryProjects)', 'nightly recovery must backfill or repair due-work markers');
requireText(scheduler, "action: 'expire' as const", 'scheduler must expire ended windows before activation');
requireText(scheduler, "if (result.outcome === 'noop') continue;", 'scheduler must refresh repaired public state');
requireText(scheduler, "'repair_special_menu_state'", 'scheduler must identify repaired public state refreshes');
forbidText(scheduler, "result.outcome === 'noop' || result.outcome === 'repaired'", 'scheduler must not skip cache refresh after repairing public state');
forbidText(scheduler, 'summaryDoc.data()?.projects || {}', 'scheduler must not assume a nested projects summary');
forbidText(scheduler, "'_specialMenu.status': 'active'", 'scheduler must not publish lifecycle state through split updates');
forbidText(scheduler, 'specialMenuDisplayName: projData.specialMenuDisplayName', 'scheduler logs must not include owner display copy');
requireText(schedulerLifecycle, 'params.db.runTransaction', 'Admin lifecycle must use a Firestore transaction');
requireText(schedulerLifecycle, "outcome: 'blocked'", 'Admin lifecycle must represent active-menu contention without retry noise');
requireText(schedulerLifecycle, 'sourceProjectId: projectId', 'Admin temp status must identify its source project');
requireText(schedulerLifecycle, 'specialMenuNextTransitionAt:', 'Admin lifecycle must maintain the due-work marker');
requireText(schedulerLifecycle, 'hasLiveCompetingActiveMenu', 'Admin activation must distinguish live contention from a stale store pointer');
requireText(schedulerLifecycle, 'isLiveCompetingSpecialMenuProject(', 'Admin activation must validate a competing pointer target');
requireText(maintenanceScheduler, "name: 'special_menu_lifecycle'", 'consolidated maintenance scheduler must own precise lifecycle switching');
requireText(maintenanceScheduler, "isFunctionFeatureEnabled('ENABLE_SPECIAL_MENU_SWITCHING')", 'precise lifecycle task must honor the Functions feature flag');
requireText(maintenanceScheduler, ".where('specialMenuNextTransitionAt', '<=', now.toISOString())", 'maintenance scheduler must query only due special-menu summaries');
requireText(maintenanceScheduler, 'transitionScheduledSpecialMenu({', 'maintenance scheduler must use the Admin transaction helper');
requireText(maintenanceScheduler, 'revalidatePublicClientCacheForStore(', 'scheduled transitions must refresh public and configured-screen state');
if (sharedSchedule !== functionSharedSchedule) failures.push('app and Functions special-menu schedule helpers must remain byte-identical');
requireText(mobileProjectSelector, 'const specialMenuResult = await updateSpecialMenuProject({', 'alternate mobile edit path must use the canonical special-menu transaction');
forbidText(mobileProjectSelector, '_specialMenu: {\n                            displayName: localizedName,', 'alternate mobile edit path must not partially overwrite lifecycle metadata');
requireText(mobileSpecialMenuScreen, 'Adjust the dates so only one special menu can be active.', 'mobile scheduling must enforce the one-active non-overlap boundary');
requireText(mobileSpecialMenuScreen, 'return <MobileSpecialMenuScreenContent key={scopeKey} {...props} />;', 'mobile special-menu drafts must remount on exact tenant/store changes');
requireText(mobileSpecialMenuScreen, 'getProjectDataWithoutLoader(projectId, expectedScope)', 'mobile special-menu project reads must retain expected scope');
requireText(mobileSpecialMenuScreen, 'if (!isExpectedScope(expectedScope)) return;', 'mobile special-menu async settlement must require its initiating scope');
requireText(mobileSpecialMenuScreen, 'submitInFlightRef.current', 'mobile special-menu sheets must reject duplicate submissions synchronously');
requireText(mobileSpecialMenuScreen, 'translationInFlightRef.current', 'mobile special-menu sheets must reject duplicate translations synchronously');
forbidText(mobileSpecialMenuScreen, 'Continue anyway?', 'mobile scheduling must not bypass the one-active boundary');
forbidText(desktopCreateModal, 'values.displayName', 'desktop create success copy must use the controlled localized name');
requireText(desktopCreateModal, "projects_page_special_menu_create_failed", 'desktop create failures must be observable');
requireText(desktopProjectEditModal, 'End or cancel this menu from Special Menus.', 'generic desktop edit must not expose lifecycle-breaking active controls');
requireText(desktopProjectSelector, "project.specialMenuStatus === 'expired'", 'desktop selector must hide generic delete until persisted special-menu state is terminal');
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
