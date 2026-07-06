#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

function requireOrder(source, tokens, label) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previousIndex + 1);
    if (index === -1) {
      failures.push(`${label} missing ordered token: ${token}`);
      return;
    }
    if (index <= previousIndex) {
      failures.push(`${label} token out of order: ${token}`);
      return;
    }
    previousIndex = index;
  }
}

function requireAny(source, tokens, label) {
  if (!tokens.some((token) => source.includes(token))) {
    failures.push(`${label} missing one of: ${tokens.join(' | ')}`);
  }
}

const packageJson = read('package.json');
const projectsRoute = read('src/app/(main)/projects/page.tsx');
const projectsPage = read('src/components/templates/main-app/projects/index.tsx');
const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
const commandCenter = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx');
const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
const mobileProjectSelector = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
const bulkActionsSheet = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
const projectDal = read('src/database/projects/index.ts');
const publicClientCache = read('src/lib/cache/publicClientCache.ts');
const screenInvalidation = read('src/lib/screen/screenInvalidation.ts');
const projectsReadme = read('__docs__/projects/README.md');
const editorReadme = read('__docs__/projects/Editor/README.md');
const projectsMobileSupport = read('__docs__/projects/projects_mobile-support.md');
const commandCenterReadme = read('__docs__/menu-command-center/README.md');
const commandCenterMobileSupport = read('__docs__/menu-command-center/menu-command-center_mobile-support.md');
const commandCenterSpec = read('__docs__/menu-command-center/menu-command-center_spec.md');
const commandCenterWebsite = read('__docs__/menu-command-center/menu-command-center_website.md');
const commandCenterMarketing = read('__docs__/menu-command-center/menu-command-center_marketing.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/CHANGELOG.md');

requireToken(
  packageJson,
  '"verify:menu-project-editor-boundary": "node scripts/verification/verify-menu-project-editor-boundary.js"',
  'package scripts',
);

['import ProjectsPage from "@template/main-app/projects"', '<ProjectsPage />'].forEach((token) => {
  requireToken(projectsRoute, token, 'projects route');
});

[
  'import { addProject, assertProjectDeleteSucceeded, assertProjectUpdateSucceeded, deleteProject, duplicateProject, getMetadataProjectsList, getProjectData, getProjectDataWithoutLoader, setProjectActive, updateProject, updateProjectMetadata, updateProjectWithoutLoader, uploadFile } from \'@database/projects\';',
  'await b2cViewRef.current.publish();',
  'assertProjectUpdateSucceeded(',
  'assertProjectDeleteSucceeded(',
  'projects_page_project_metadata_update_rejected',
  'projects_page_project_active_update_rejected',
  'projects_page_create_project_update_rejected',
  'projects_page_duplicate_project_update_rejected',
  'projects_page_reset_project_update_rejected',
  'projects_page_public_content_translation_project_update_rejected',
  'projects_page_public_content_translation_metadata_update_rejected',
  'projects_page_upload_create_project_update_rejected',
  'logProjectPageFailure',
].forEach((token) => requireToken(projectsPage, token, 'desktop projects page'));

[
  'import { assertProjectUpdateSucceeded, updateProject, updateProjectMetadata } from "@database/projects";',
  'const PUBLISH_GATE_FALLBACK_ERROR = "Menu check needs review before continuing.";',
  'getSafeUiErrorMessage(error.message, PUBLISH_GATE_FALLBACK_ERROR, { allowTrustedPlainText: true })',
  'menu_editor_publish_gate_validation_failed',
  'menu_editor_quality_signals_publish_intercept_failed',
  'const getProjectForPersistence = useCallback((data: Project) => (',
  'stripResolvedOutletProjectForSave(getProjectWithLinkedFieldOverrides(data), activeProject)',
  'const persistEditorProject = useCallback(async (data: Project) => {',
  'const syncChanges = useCallback(',
  'const updatedProject = await updateProject({',
  'projectId: selectedProject.projectId,',
  'menu_editor_sync_changes_project_update_rejected',
  'menu_editor_persist_project_update_rejected',
  'triggerPosSyncDebounced(',
  'menu_editor_project_public_content_project_update_rejected',
  'menu_editor_project_public_content_metadata_update_rejected',
  'FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER',
  '<CommandCenterModal',
].forEach((token) => requireToken(editor, token, 'desktop editor'));
requireOrder(
  editor,
  [
    'const syncChanges = useCallback(',
    'const updatedProject = await updateProject({',
    'assertProjectUpdateSucceeded(',
    'menu_editor_sync_changes_project_update_rejected',
    'triggerPosSyncDebounced(',
  ],
  'desktop editor save path order',
);
forbidToken(editor, 'console.error(', 'desktop editor direct error logging');
forbidToken(editor, 'validationErrors.push(error.message)', 'desktop editor raw publish-gate error exposure');

[
  'Single onApply(updatedProject) callback → Editor → syncChanges() → Firebase.',
  'assertProjectUpdateSucceeded(',
  'command_center_project_metadata_translation_update_rejected',
  'onApply(updated);',
  'onApply(updatedProject);',
].forEach((token) => requireToken(commandCenter, token, 'desktop command center'));

[
  'export function assertProjectUpdateSucceeded',
  'export function assertProjectDeleteSucceeded',
  '// INVARIANT: All customer-facing truth must pass through updateProject().',
  'await revalidatePublicClientCacheForProject(data.projectId as string, "updateProject");',
  'export const publishProject = async (data: Partial<Project>) => {',
  'updatedData.menuVersion = increment(1);',
  'updatedData.lastPublishedAt = Timestamp.now();',
  'await revalidatePublicClientCacheForProject(data.projectId, "publishProject");',
  'LINKED_OUTLET_SAVE_REQUEST_POLICY',
  'project_linked_outlet_save_rejected',
  'project_linked_outlet_publish_rejected',
  'menu_observation_publish_event_failed',
  'detectAndLogChanges(data.projectId, oldProject, data);',
].forEach((token) => requireToken(projectDal, token, 'project DAL'));
forbidToken(projectDal, 'console.error(', 'project DAL direct error logging');
forbidToken(projectDal, 'console.warn(', 'project DAL direct warn logging');

[
  'export const revalidatePublicClientCacheForProject = async (',
  'invalidateOwnerBusinessAssistantBrowserCache({ storeId, projectId });',
  'await revalidatePublicClientCache(storeId, context);',
  'await touchDigitalScreenContentVersion(storeId, context, { projectId });',
  "credentials: 'same-origin'",
  "cache: 'no-store'",
  "redirect: 'manual'",
].forEach((token) => requireToken(publicClientCache, token, 'public client cache'));

[
  'export const touchDigitalScreenContentVersion = async (',
  'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId || typeof window === "undefined") {',
  '"screen.contentVersion": increment(1)',
  'await syncPublicScreenState(normalizedStoreId, {',
  'digital_screen_content_version_touch_failed',
].forEach((token) => requireToken(screenInvalidation, token, 'digital screen invalidation'));

[
  'import { assertProjectUpdateSucceeded, updateProjectWithoutLoader, uploadFile } from \'@database/projects\';',
  'const MOBILE_MENU_PERSIST_DEBOUNCE_MS = 700;',
  'const MOBILE_MENU_PERSIST_RETRY_MS = 2500;',
  'const persistMenuProjectImmediately = useCallback(async (project: any) => {',
  'const flushPendingMenuPersist = useCallback(async () => {',
  'const savedProject = await updateProjectWithoutLoader(snapshot);',
  'mobile_menu_project_persist_project_update_rejected',
  'mobile_menu_project_persist_failed',
  'mobile_menu_item_image_project_update_rejected',
  'mobile_menu_item_image_project_update_failed',
  'logMobileMenuFailure',
].forEach((token) => requireToken(mobileMenu, token, 'mobile menu screen'));
forbidToken(mobileMenu, 'console.error(', 'mobile menu direct error logging');
forbidToken(mobileMenu, 'console.warn(', 'mobile menu direct warn logging');

[
  'import { addProject, assertProjectDeleteSucceeded, assertProjectUpdateSucceeded, deleteProject, duplicateProject, getProjectDataWithoutLoader, setProjectActive, updateProjectMetadata, updateProjectWithoutLoader } from \'@database/projects\';',
  'copyMobileProjectSelectorText',
  'MOBILE_PROJECT_SELECTOR_COPY_UNAVAILABLE',
  'MOBILE_PROJECT_SELECTOR_COPY_FALLBACK_FAILED',
  'assertProjectUpdateSucceeded(',
  'assertProjectDeleteSucceeded(',
  'mobile_project_selector_create_project_update_rejected',
  'mobile_project_selector_duplicate_project_update_rejected',
  'mobile_project_selector_metadata_update_rejected',
  'mobile_project_selector_active_project_update_rejected',
  'mobile_project_selector_delete_project_rejected',
  'mobile_project_public_content_translation_project_update_rejected',
  'logMobileProjectFailure',
].forEach((token) => requireToken(mobileProjectSelector, token, 'mobile project selector'));

[
  'import { assertProjectUpdateSucceeded, updateProjectMetadata } from \'@database/projects\';',
  'applyBulkAvailability',
  'applyBulkActiveInactive',
  'onApply(updated,',
  'mobile_bulk_actions_project_metadata_translation_update_rejected',
].forEach((token) => requireToken(bulkActionsSheet, token, 'mobile bulk actions'));

[
  '`npm run verify:menu-project-editor-boundary`',
  'Project editor boundary source gate',
  'browser/mobile editor QA',
  'publish/cache evidence for edited public truth',
].forEach((token) => requireToken(editorReadme, token, 'editor README'));

[
  '`npm run verify:menu-project-editor-boundary`',
  'Project editor boundary source gate',
  'Current release readiness must be decided from the active',
].forEach((token) => requireToken(projectsReadme, token, 'projects README'));

[
  '`npm run verify:menu-project-editor-boundary`',
  'Same project DAL/cache path as desktop',
  'MobileMenuScreen',
  'MobileProjectSelectorSheet',
  'BulkActionsSheet',
  'updateProjectWithoutLoader',
].forEach((token) => requireToken(projectsMobileSupport, token, 'projects mobile support docs'));

[
  '`npm run verify:menu-project-editor-boundary`',
  'Current release approval still requires',
  'single `updateProject()` DAL path',
].forEach((token) => requireToken(commandCenterReadme, token, 'command center README'));
forbidToken(commandCenterReadme, 'Key Files in Codebase (planned)', 'command center stale planned key-files heading');

[
  '`npm run verify:menu-project-editor-boundary`',
  'Mobile bulk actions stay on the same project persistence contract',
  'updateProjectWithoutLoader',
  'assertProjectUpdateSucceeded',
].forEach((token) => requireToken(commandCenterMobileSupport, token, 'command center mobile support docs'));

[
  ['command center spec', commandCenterSpec, 'Source documentation; not current launch certification'],
  ['command center spec', commandCenterSpec, 'configured screens follow their supported refresh paths'],
  ['command center spec', commandCenterSpec, 'POS, downloaded PDFs, printed menus, and external systems stay behind integration, export, replacement, or provider evidence'],
  ['command center spec', commandCenterSpec, 'saved customer output follows the supported refresh path after persistence'],
  ['command center website', commandCenterWebsite, 'MenuList-controlled live surfaces refresh through supported paths'],
  ['command center website', commandCenterWebsite, 'downloaded PDFs, printed menus, and external systems need their own replacement or connected integration evidence'],
  ['command center website', commandCenterWebsite, 'configured screens through their supported refresh paths'],
  ['command center marketing', commandCenterMarketing, 'Apply in one click through the editor save path'],
  ['command center marketing', commandCenterMarketing, 'POS/external systems need their own replacement or connected integration evidence'],
  ['command center marketing', commandCenterMarketing, 'saved master menu changes follow the outlet sync/cache path'],
].forEach(([label, source, token]) => requireToken(source, token, label));

[
  'Update your entire menu in seconds',
  'entire menu in seconds',
  'entire menu in under 30 seconds',
  'updates everywhere automatically',
  'Updates everywhere automatically',
  'Update Everywhere at Once',
  'Update everywhere at once',
  'One change → updates everywhere',
  'everything updates everywhere',
  'all updated across every surface automatically',
  'connected systems automatically',
  'Safe, instant, and reversible',
  'QR updated, screens updated, PDF updated, POS updated',
  'POS, QR, screens, and PDF all follow',
  'instant update everywhere',
  'Price changes propagate across all digital surfaces instantly',
  'Changes propagate silently to all surfaces',
  'correct everywhere',
].forEach((token) => {
  forbidToken(commandCenterSpec, token, 'command center spec');
  forbidToken(commandCenterWebsite, token, 'command center website');
  forbidToken(commandCenterMarketing, token, 'command center marketing');
});

[
  ['inventory', inventory, 'menu_project_editor'],
  ['inventory', inventory, 'menu-project-editor boundary source gate passed'],
  ['report', report, '## Menu Project Editor Boundary'],
  ['report', report, '`npm run verify:menu-project-editor-boundary`'],
  ['audit', audit, 'Menu Project Editor boundary checkpoint'],
  ['audit', audit, '`npm run verify:menu-project-editor-boundary`'],
  ['audit', audit, 'Menu Command Center public claim boundary checkpoint'],
  ['changelog', changelog, 'Menu Project Editor Boundary'],
  ['changelog', changelog, '`npm run verify:menu-project-editor-boundary`'],
  ['changelog', changelog, 'Menu Command Center Public Claim Boundary'],
].forEach(([label, source, token]) => requireToken(source, token, `menu project editor ledger ${label}`));

requireAny(
  report,
  [
    'desktop/mobile browser editor QA pending',
    'desktop editor browser QA pending',
  ],
  'menu project editor report browser boundary',
);

if (failures.length > 0) {
  console.error('FAIL verify-menu-project-editor-boundary');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PASS verify-menu-project-editor-boundary');
console.log('Validated projects route, desktop editor persistence, project DAL cache/screen invalidation, mobile menu persistence, mobile project mutations, docs, and ledger boundary.');
