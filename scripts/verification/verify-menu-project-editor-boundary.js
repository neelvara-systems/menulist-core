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

function requireNamedImport(source, moduleSpecifier, names, label) {
  const escapedModule = moduleSpecifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedModule}['"]\\s*;`));
  if (!match) {
    failures.push(`${label} missing named import from ${moduleSpecifier}`);
    return;
  }

  const importedNames = new Set(
    match[1]
      .split(',')
      .map((entry) => entry.trim().split(/\\s+as\\s+/)[0])
      .filter(Boolean),
  );
  for (const name of names) {
    if (!importedNames.has(name)) {
      failures.push(`${label} missing ${name} import from ${moduleSpecifier}`);
    }
  }
}

const packageJson = read('package.json');
const projectsRoute = read('src/app/(main)/projects/page.tsx');
const projectsPage = read('src/components/templates/main-app/projects/index.tsx');
const projectSelector = read('src/components/templates/main-app/projects/ProjectDetails/ProjectSelector.tsx');
const pdfViewer = read('src/components/templates/main-app/projects/PdfViewer.tsx');
const projectCommonTypes = read('src/components/templates/main-app/projects/types/common.types.ts');
const projectsDataProvider = read('src/providers/projectsDataProvider.tsx');
const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
const editorWelcomeBanner = read('src/components/templates/main-app/projects/editorView/EditorWelcomeBanner.tsx');
const zoomableImage = read('src/components/templates/main-app/projects/editorView/ZoomableImage.tsx');
const commandCenter = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx');
const commandCenterActionFiles = [
  'ActiveInactiveAction.tsx',
  'AvailabilityAction.tsx',
  'MoveCategoryAction.tsx',
  'PricingAction.tsx',
  'TextCaseAction.tsx',
].map((file) => ({
  file,
  source: read(`src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/${file}`),
}));
const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
const mobileDesignEditor = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
const mobileProjectsProvider = read('src/components/mobile/providers/MobileProjectsProvider.tsx');
const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
const mobileProjectSelector = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
const bulkActionsSheet = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
const projectDal = read('src/database/projects/index.ts');
const projectDeleteRoute = read('src/app/api/projects/delete/route.ts');
const projectSlugOwnership = read('src/lib/menu/projectSlugOwnership.ts');
const projectDocumentScope = read('src/lib/menu/projectDocumentScope.ts');
const projectMutationAuthority = read('src/lib/menu/projectMutationAuthority.ts');
const projectOwnerScope = read('src/lib/menu/projectOwnerScope.ts');
const projectUploadIdentity = read('src/lib/menu/projectUploadIdentity.ts');
const projectUploadPayload = read('src/lib/menu/projectUploadPayload.ts');
const projectUpdateProjection = read('src/lib/menu/projectUpdateProjection.ts');
const projectImageGeneration = read('src/lib/image/projectImageGeneration.ts');
const timeSlotPresetBoundary = read('src/lib/menu/timeSlotPresetBoundary.ts');
const timedCategories = read('src/hooks/useTimedCategories.ts');
const storeDal = read('src/database/stores/index.tsx');
const publicClientCache = read('src/lib/cache/publicClientCache.ts');
const screenInvalidation = read('src/lib/screen/serverScreenInvalidation.ts');
const revalidateMenuRoute = read('src/app/api/revalidate/menu/route.ts');
const projectsReadme = read('__docs__/projects/README.md');
const editorReadme = read('__docs__/projects/editor/README.md');
const projectsMobileSupport = read('__docs__/projects/projects_mobile-support.md');
const commandCenterReadme = read('__docs__/menu-command-center/README.md');
const commandCenterMobileSupport = read('__docs__/menu-command-center/menu-command-center_mobile-support.md');
const commandCenterSpec = read('__docs__/menu-command-center/menu-command-center_spec.md');
const commandCenterWebsite = read('__docs__/menu-command-center/menu-command-center_website.md');
const commandCenterMarketing = read('__docs__/menu-command-center/menu-command-center_marketing.md');
const inventory = read('FEATURE_SWEEP_MASTER_INVENTORY.md');
const report = read('FEATURE_SWEEP_MASTER_REPORT.md');
const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

for (const { file, source } of commandCenterActionFiles) {
  forbidToken(source, 'react-hooks/exhaustive-deps', `${file} hook dependency boundary`);
  requireToken(source, 'onConfigReady', `${file} config callback dependency`);
  requireToken(source, 'onPreviewChange', `${file} preview callback dependency`);
}

requireToken(
  packageJson,
  '"verify:menu-project-editor-boundary": "node scripts/verification/verify-menu-project-editor-boundary.js && npm run test:project-partial-update-projection && npm run test:project-slug-ownership && npm run test:project-document-scope && npm run test:project-owner-scope && npm run test:project-mutation-authority && npm run test:project-upload-identity && npm run test:project-upload-payload && npm run test:time-slot-data-flow"',
  'package scripts',
);

['import ProjectsPage from "@template/main-app/projects"', '<ProjectsPage />'].forEach((token) => {
  requireToken(projectsRoute, token, 'projects route');
});

requireOrder(projectSelector, [
  'onEdit={() => {',
  'setModalOpen(false);',
  'onOpenModal(project);',
], 'desktop project selector edit modal handoff');

[
  'const [pendingAction, setPendingAction] = useState<PendingProjectAction | null>(null);',
  "setPendingAction({ type: 'duplicate', project });",
  "setPendingAction({ type: 'delete', project });",
  'open={Boolean(pendingAction)}',
  'await onDuplicateProject(action.project);',
  'await onDeleteProject(action.project);',
].forEach((token) => requireToken(projectSelector, token, 'desktop project selector controlled action confirmation'));
forbidToken(projectSelector, 'Modal.confirm(', 'desktop project selector static action confirmation');

[
  "'mobile_projects_list_load_failed'",
  "'mobile_project_detail_load_failed'",
  'hasLoadError: hasCurrentHydratedScope ? hasLoadError : false,',
  'hydratedScopeKeyRef.current = scopeKey;',
  'hasHydratedRef.current = true;',
].forEach((token) => requireToken(mobileProjectsProvider, token, 'mobile project load recovery'));
[
  'if (hasLoadError && !menuData)',
  "variant=\"serverErrorContext\"",
  'refreshProjects({ force: true, loadSelectedProject: true, showLoader: true })',
].forEach((token) => requireToken(mobileMenu, token, 'mobile menu load recovery'));
[
  'if (hasLoadError && !data)',
  "variant=\"serverErrorContext\"",
  'refreshProjects({ force: true, loadSelectedProject: true, showLoader: true })',
  "variant=\"uploadContext\"",
  "tProjectSelector('createCatalog')",
].forEach((token) => requireToken(mobileShare, token, 'mobile share load and first-use recovery'));
requireOrder(mobileDesignEditor, [
  "if (!storeDetails?.subdomain && !storeDetails?.customDomain) return '';",
  'return generateProjectUrl(',
], 'mobile design public-link tenant-host guard');

[
  'open={pdfPagesCount !== null || Boolean(pdfFiles?.images?.length)}',
  'disabled={Boolean(isStillLoading)}',
  '{Boolean(isStillLoading) && <Card',
  'setPdfFiles((previous) => previous',
].forEach((token) => requireToken(pdfViewer, token, 'PDF conversion review boundary'));
requireToken(projectCommonTypes, 'fileId: string;', 'converted PDF page source-file identity type');
forbidToken(projectCommonTypes, 'fileId: any;', 'converted PDF page any identity type');

[
  'setActiveProject: (project: Project) => void;',
  'setCurrentView: Dispatch<SetStateAction<number>>;',
  'activeBatchImageJob: BatchImageGenerationJobType | null;',
  'setActiveBatchImageJob: Dispatch<SetStateAction<BatchImageGenerationJobType | null>>;',
  '<ProjectsDataContext.Provider value={contextData}>',
].forEach((token) => requireToken(projectsDataProvider, token, 'projects data provider'));
forbidToken(projectsDataProvider, ': any', 'projects data provider');
forbidToken(projectsDataProvider, 'useState(contextData)', 'projects data provider');
forbidToken(projectsDataProvider, 'setContextState(contextData)', 'projects data provider');

requireNamedImport(projectsPage, '@database/projects', [
  'addProject',
  'assertProjectDeleteSucceeded',
  'assertProjectUpdateSucceeded',
  'deleteProject',
  'duplicateProject',
  'getProjectDataWithoutLoader',
  'getProjectsListWithoutLoader',
  'setProjectActive',
  'updateProjectMetadata',
  'updateProjectWithoutLoader',
  'uploadFile',
], 'desktop projects page');
[
  'await b2cViewRef.current.publish();',
  'assertProjectUpdateSucceeded(',
  'assertProjectDeleteSucceeded(',
  'projects_page_project_metadata_update_rejected',
  'projects_page_project_active_update_rejected',
  'projects_page_create_project_update_rejected',
  'projects_page_duplicate_project_update_rejected',
  'projects_page_reset_project_update_rejected',
  'projects_page_public_content_translation_project_update_rejected',
  'projects_page_upload_create_project_update_rejected',
  'const [projectFormScope, setProjectFormScope] = useState<ProjectExpectedScope | null>(null);',
  'const hasProjectReadScope = Boolean(currentProjectScope);',
  'shouldEnableDesktopProjectsData && hasProjectReadScope && effectiveTenantId && effectiveStoreId',
  'shouldEnableDesktopProjectsData && hasProjectReadScope && selectedProjectMatchesStore',
  'currentView == 1 && projectsLoading',
  'currentView == 1 && projectsError',
  'onClick={() => void mutateProjects()}',
  'projectsData !== undefined && !projectsLoading && !projectsError && projectsList.length === 0',
  "const mutationToken = beginProjectMutation('save', operationScope);",
  "expectedScope: operationScope,",
  'syncPublicSummary: true,',
  "uploadFile({ url: file.url, type: file.type, uid: file.uid }, 'files', operationScope)",
  "throw new Error('menu_upload_project_scope_changed');",
  'logProjectPageFailure',
].forEach((token) => requireToken(projectsPage, token, 'desktop projects page'));
forbidToken(
  projectsPage,
  'projects_page_public_content_translation_metadata_update_rejected',
  'desktop projects page atomic public translation',
);

[
  "throw new Error('Project creation scope changed');",
  '"project_upload_scope_changed"',
  '"project_active_scope_changed"',
  'expectedScope?: ProjectExpectedScope;',
].forEach((token) => requireToken(projectDal, token, 'project DAL expected-scope boundary'));

[
  'normalizeProjectOwnerScope',
  'getProjectOwnerScopeFromProjectId',
  'projectOwnerScopesMatch',
  'getProjectOwnerScopeKey',
].forEach((token) => requireToken(projectOwnerScope, token, 'shared project owner scope'));

requireNamedImport(editor, '@database/projects', [
  'appendImageBatchProjectSelections',
  'assertProjectUpdateSucceeded',
  'updateProject',
  'updateProjectMetadata',
], 'desktop editor');
[
  'const PUBLISH_GATE_FALLBACK_ERROR = "Menu check needs review before continuing.";',
  'getSafeUiErrorMessage(error.message, PUBLISH_GATE_FALLBACK_ERROR, { allowTrustedPlainText: true })',
  'menu_editor_publish_gate_validation_failed',
  'menu_editor_quality_signals_publish_intercept_failed',
  'const getProjectForPersistence = useCallback((data: Project) => (',
  'stripResolvedOutletProjectForSave(getProjectWithLinkedFieldOverrides(data), activeProject)',
  'const persistEditorProject = useCallback(async (data: Project) => {',
  'const syncChanges = useCallback(',
  'const saveRequest = updateProject({',
  'activeEditorSavePromiseRef.current = saveCompletion;',
  'const updatedProject = await saveRequest;',
  'projectId: selectedProject.projectId,',
  'menu_editor_sync_changes_project_update_rejected',
  'menu_editor_persist_project_update_rejected',
  'menu_editor_project_public_content_project_update_rejected',
  'menu_editor_project_public_content_metadata_update_rejected',
  'FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER',
  '<CommandCenterModal',
  'await appendImageBatchProjectSelections({',
].forEach((token) => requireToken(editor, token, 'desktop editor'));

[
  'getEditorOnboardingStorageKeys(tenantId, storeId)',
  'setShowWelcome(false);',
  'setShowOutletBanner(false);',
  'isMasterLinked && !isEditorOnboardingMarker(outletSeen)',
  "menu_editor_onboarding_storage_failed",
].forEach((token) => requireToken(editorWelcomeBanner, token, 'editor onboarding browser state'));
forbidToken(editorWelcomeBanner, "WELCOME_DISMISSED: 'editor_welcome_dismissed'", 'editor onboarding browser state');

[
  'ref={imageRef}',
  'imageRef.current.offsetWidth * zoom',
  'imageRef.current.offsetHeight * zoom',
  "menu_editor_zoom_hint_storage_failed",
].forEach((token) => requireToken(zoomableImage, token, 'editor zoom browser state'));
forbidToken(zoomableImage, 'image.width * zoom', 'editor zoom browser state');
requireOrder(
  editor,
  [
    'const syncChanges = useCallback(',
    'const saveRequest = updateProject({',
    'activeEditorSavePromiseRef.current = saveCompletion;',
    'const updatedProject = await saveRequest;',
    'assertProjectUpdateSucceeded(',
    'menu_editor_sync_changes_project_update_rejected',
  ],
  'desktop editor save path order',
);
requireOrder(
  editor,
  [
    'let saveCompletion: Promise<void> | null = null;',
    'activeEditorSavePromiseRef.current = saveCompletion;',
    'if (activeEditorSavePromiseRef.current === saveCompletion) {',
    'activeEditorSavePromiseRef.current = null;',
  ],
  'desktop editor in-flight save cleanup order',
);
forbidToken(editor, 'console.error(', 'desktop editor direct error logging');
forbidToken(editor, 'triggerPosSyncDebounced(', 'desktop editor direct POS delivery trigger');
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
  'export const publishProject = async (',
  'options: ProjectPublishOptions = {},',
  'const requestedModifiedOn = options.expectedModifiedOn',
  '(data as Partial<Project> & { modifiedOn?: unknown }).modifiedOn;',
  'const currentProjectDoc = await getDoc(operationProjectRef);',
  "throw new Error('Project update identity mismatch');",
  "throw new Error('Project publish identity mismatch');",
  'const storedMasterProjectId = resolveStoredProjectMasterId(oldProject, data)',
  'const storedMasterProjectId = resolveStoredProjectMasterId(currentProject, data)',
  'body: JSON.stringify({',
  'project: { ...data, masterProjectId: storedMasterProjectId }',
  'extractedVisualDefaults',
  'const transactionResult = await runTransaction(firebaseClient, async (transaction) => {',
  "throw new Error('Project update state changed');",
  'previousProject: freshProject,',
  'const savedProject = buildProjectAfterPartialUpdate(freshProject, persistedUpdateData);',
  'const publishTransactionResult = await runTransaction(firebaseClient, async (transaction) => {',
  'persistedPublishData._mce = publishMceRuntime.toMCEMetadata(mceResult);',
  "throw new Error('Invalid project publish precondition');",
  "throw new Error('Project publish state changed');",
  '...(expectedModifiedOnMillis !== null ? { expectedModifiedOnMillis } : {}),',
  'projectDocumentMutationVersionMillis(',
  'const nextMenuVersion = nextProjectMenuVersion(freshProject.menuVersion);',
  'menuVersion: nextMenuVersion,',
  'lastPublishedAt: publishedAt,',
  'await revalidatePublicClientCacheForProject(operationProjectId, "publishProject");',
  'LINKED_OUTLET_SAVE_REQUEST_POLICY',
  'project_linked_outlet_save_rejected',
  'project_linked_outlet_publish_rejected',
  'menu_observation_publish_event_failed',
  'recordPublishedMenuTruth(\n                    operationProjectId,\n                    publishedProject,',
  'uploadedProjectFileUrls.map((url) => deleteFileByUrl(url))',
  'sanitizeProjectPartialUpdate(stripGeneratedProjectReadModels(data))',
  'projectData: projectForValidation,',
  'buildProjectAfterPartialUpdate(freshProject, persistedUpdateData)',
  'const buildProjectSummaryMutation = (',
  'const suppliedProjectId = Boolean(data.projectId);',
  'const existingProjectDoc = suppliedProjectId',
  'const SLUG_RESERVATION_QUERY_LIMIT = 25;',
  "where('slug', '==', normalized)",
  "where('previousSlugs', 'array-contains', normalized)",
  'currentSlugSnapshot.size === SLUG_RESERVATION_QUERY_LIMIT',
  'previousSlugSnapshot.size === SLUG_RESERVATION_QUERY_LIMIT',
  'transaction.set(projectDocRef, projectData, { merge: false });',
  'created && FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION',
  "throw new Error('Invalid project metadata scope');",
  "throw new Error('Project summary not found');",
  'const transactionResult = await runTransaction(firebaseClient, async (transaction) => {',
  'const currentAwareData = options.preserveExistingProjectImage',
  'preserveExistingProjectImageMetadata(data, freshCurrentSummary)',
  'const { slug: _ignoredSlug, previousSlugs: _ignoredPreviousSlugs, ...safeData } = currentAwareData;',
  "throw new Error('This menu URL is already in use. Please choose a different name.');",
  'const newProjectId = `${scope.tId}-${timestamp}-${entropy}-${scope.sId}`;',
  'delete duplicateSource._specialMenu;',
  'transaction.set(newProjectDocRef, newProjectData, { merge: false });',
  "throw new Error('Invalid project read scope');",
  "throw new Error('Legacy project read identity mismatch');",
  "throw new Error('Invalid cross-store project read scope');",
  "throw new Error('Legacy cross-store project read identity mismatch');",
  "throw new Error('Invalid project active scope');",
  "throw new Error('Project active identity mismatch');",
  'fetch("/api/projects/delete", {',
  'readJsonResponseWithLimit<unknown>(',
  'assertProjectDeleteSucceeded(result, projectId);',
  'return await updateProjectMetadata(projectId, data, {',
  "throw new Error('Invalid project summary removal scope');",
  "throw new Error('Project summary removal requires a deleted project');",
  'const filterProjectsSummaryMapForScope = (',
  "throw new Error('Invalid combined project read scope');",
  "throw new Error('Combined project read identity mismatch');",
  'const PROJECT_PRESET_CASCADE_PAGE_SIZE = 100;',
  'const PROJECT_PRESET_CASCADE_CONCURRENCY = 4;',
  'orderBy(documentId())',
  'const currentDoc = await transaction.get(projectDoc.ref);',
  'const projection = projectTimeSlotPresetReferences(currentProject, mutation);',
  'files: projection.files,',
  'persistenceOutcomeAmbiguous = true;',
  'persistenceCommitted = true;',
  '!persistenceCommitted && !persistenceOutcomeAmbiguous',
  'buildProjectUploadObjectId({',
  'import { triggerPosSyncForAcknowledgedProjectSave } from "@lib/posSync/eventBuilder";',
  'triggerPosSyncForAcknowledgedProjectSave(',
  'current.deleted === true',
  '!projectDocumentMatchesScope(current, {',
].forEach((token) => requireToken(projectDal, token, 'project DAL'));

[
  'export const POST = withAuth(async (request: NextRequest, session) => {',
  'verifyTenantAccess(session, tenantScope.numericId, storeScope.numericId, request)',
  'requireAnyStorePermissionForStoreData(',
  'const result = await db.runTransaction(async (transaction) => {',
  'const linkedOutletQueries = tenantStoreIds',
  'throw new ProjectDeleteRejection(409, "Project is already deleted");',
  'transaction.set(projectRef, projectUpdate, { merge: true });',
  'fallbackProjectId: fallbackDefaultEntry?.[0],',
  'runStorePublicTruthPostCommitEffects({',
  'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
].forEach((token) => requireToken(projectDeleteRoute, token, 'project delete route'));
[
  'export const preserveExistingProjectImageMetadata',
  "patch.projectImage === undefined",
  'resolveProjectImageUrl(currentSummary.projectImage)',
  "const { projectImage: _ignoredProjectImage, ...preservedPatch } = patch;",
].forEach((token) => requireToken(projectUpdateProjection, token, 'project update projection'));
[
  'expectedScope: params.expectedScope,',
  'preserveExistingProjectImage: true,',
  "} as any, 'project-images', params.expectedScope);",
  'if (metadataResult.projectImage !== imageUrl) {',
  "return { skippedReason: 'existing-image' };",
].forEach((token) => requireToken(projectImageGeneration, token, 'generated project image persistence'));
forbidToken(
  projectImageGeneration,
  'updateProjectMetadata(projectId, { projectImage: imageUrl });',
  'generated project image stale metadata write',
);
forbidToken(projectDal, 'void detectAndLogChanges(data.projectId, oldProject, data, operationScope);', 'project DAL partial observation');
forbidToken(projectDal, 'await syncProjectToSummary(newProjectId, summaryData);', 'project DAL split duplicate summary write');
forbidToken(projectDal, 'batch.set(doc(projectCollectionRef, projectId), projectData, { merge: true });', 'project DAL destructive deterministic create merge');
forbidToken(projectDal, 'await setDoc(projectDocRef, { active }, { merge: true });', 'project DAL split active project write');
forbidToken(projectDal, 'batch.set(docSnap.ref, project, { merge: true });', 'project DAL stale preset cascade write');
forbidToken(projectDal, 'await setDoc(await getDataDocRef(project.projectId), project, {', 'project DAL stale preset update write');
forbidToken(projectDal, 'FEATURE_FLAGS.ENABLE_MULTI_OUTLET && data.projectId && data.masterProjectId', 'project DAL caller-controlled linked outlet routing');
forbidToken(projectDal, "where('deleted', '==', true),\n            limit(50)", 'project DAL arbitrary deleted-project slug scan');
forbidToken(projectDal, 'console.error(', 'project DAL direct error logging');
forbidToken(projectDal, 'console.warn(', 'project DAL direct warn logging');
[
  'export type ProjectRestoreResult = {',
  'apiCallComposer<ProjectRestoreResult>',
  'async (): Promise<ProjectRestoreResult> => {',
].forEach((token) => requireToken(projectDal, token, 'project restore result contract'));

[
  'export const isProjectSlugClaimed = (',
  'const previousClaim = previousSlugsClaim(previousSlugs.value, normalized);',
  'return !previousClaim.ok || previousClaim.claimed;',
  'const entries = Object.entries(projects);',
  'export const isRecentlyDeletedProjectSlugReservation = (',
  'deletedAtMillis === null || deletedAtMillis < cutoffMillis',
  'export const resolveAvailableProjectSlug = (',
  'for (let attempt = 2; attempt <= 100; attempt += 1)',
].forEach((token) => requireToken(projectSlugOwnership, token, 'project slug ownership'));

[
  'export const normalizeProjectDocumentScope = (',
  'projectId.startsWith(`${tId}-`)',
  'projectId.endsWith(`-${sId}`)',
  'export const projectDocumentMatchesScope = (',
  '["tId", "tenantId", "tenantID"]',
  '["sId", "storeId", "storeID"]',
].forEach((token) => requireToken(projectDocumentScope, token, 'project document scope'));

[
  'export const resolveStoredProjectMasterId = (',
  'Object.prototype.hasOwnProperty.call(requestedUpdate, "masterProjectId")',
  'project_master_linkage_mutation_rejected',
  'export const nextProjectMenuVersion = (',
  'export const nextProjectLocalVersion = (',
  'project_menu_version_exhausted',
  'project_local_version_exhausted',
  'Number.isSafeInteger(currentVersion)',
].forEach((token) => requireToken(projectMutationAuthority, token, 'project mutation authority'));

[
  'export const buildProjectUploadObjectId = ({',
  'if (!cleanAttemptId) throw new Error("project_upload_attempt_id_invalid");',
  'return `${stablePrefix}-${cleanAttemptId}`.slice(0, 120);',
].forEach((token) => requireToken(projectUploadIdentity, token, 'project upload identity'));

[
  'export const validateProjectUploadDataUrl = ({',
  'PROJECT_UPLOAD_MAX_IMAGE_BYTES',
  'PROJECT_UPLOAD_MAX_PDF_BYTES',
  'project_file_upload_type_mismatch',
  'project_file_upload_signature_mismatch',
  'project_file_upload_too_large',
].forEach((token) => requireToken(projectUploadPayload, token, 'project upload payload'));
forbidToken(projectDal, "'image/svg+xml'", 'project DAL active SVG upload');
forbidToken(projectDal, 'SUPPORTED_PROJECT_UPLOAD_FILE_TYPES', 'project DAL duplicated upload allowlist');
forbidToken(projectDal, 'data.url.includes("base64")', 'project DAL substring-based base64 admission');
requireToken(projectDal, 'const validatedPayload = validateProjectUploadDataUrl({', 'project DAL fallback upload payload validation');
requireToken(projectDal, 'type: validatedPayload.mimeType,', 'project DAL canonical fallback upload MIME');

[
  'export const parseClockMinutes = (',
  'export const isMinuteWithinClockRange = (',
  'return currentMinutes >= startMinutes || currentMinutes < endMinutes;',
  'export const normalizeTimeSlotPresets = (',
  'export const projectTimeSlotPresetReferences = (',
].forEach((token) => requireToken(timeSlotPresetBoundary, token, 'time-slot preset boundary'));

[
  'isMinuteWithinClockRange(current.minutes, slot.startTime, slot.endTime)',
  'clockRangeAppliesOnDay(',
  'const futureMinutes = dayOffset * 24 * 60 + startMinutes - current.minutes;',
].forEach((token) => requireToken(timedCategories, token, 'timed category visibility'));

[
  "await assertActiveSessionStore(storeId, 'time_slot_preset_store_scope_mismatch');",
  'const normalizedPresets = normalizeTimeSlotPresets(timeSlotPresets);',
  'timeSlotPresets: normalizedPresets',
  'timeSlotPresetCascadePending: pendingCascade',
  "throw new Error('time_slot_preset_cascade_pending');",
  'export const completeTimeSlotPresetCascade = async (',
  'timeSlotPresetCascadePending: deleteField(),',
].forEach((token) => requireToken(storeDal, token, 'store time-slot preset persistence'));

[
  'export const revalidatePublicClientCacheForProject = async (',
  'invalidateOwnerBusinessAssistantBrowserCache({ storeId, projectId });',
  'await revalidatePublicClientCache(storeId, context, {',
  'projectId,',
  'touchScreen: true,',
  'const pendingRevalidations = new Map<string, PendingPublicCacheRevalidation>();',
  'pending.rerunRequested = true;',
  '} while (entry.rerunRequested);',
  "credentials: 'same-origin'",
  "cache: 'no-store'",
  "redirect: 'manual'",
].forEach((token) => requireToken(publicClientCache, token, 'public client cache'));

[
  'mutation.type === "remove"',
  '|| projectReferencesTimeSlotPreset(project, presetId)',
  'await revalidatePublicClientCacheForProject(projectDoc.id, cacheContext);',
].forEach((token) => requireToken(projectDal, token, 'retry-safe preset cascade cache recovery'));
forbidToken(publicClientCache, 'const pendingRevalidations = new Map<string, Promise<void>>();', 'public client cache');

[
  'export async function touchDigitalScreenContentVersionForStoreServer(',
  'if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId) {',
  'await firestoreAdmin.runTransaction(async (transaction) => {',
  '"screen.contentVersion": nextContentVersion',
  'transaction.set(publicScreenRef, {',
  'digital_screen_server_content_version_touch_failed',
  'getPrivateScreenTokenCacheTag(screenToken)',
  'revalidateTag(result.tokenCacheTag, { expire: 0 });',
].forEach((token) => requireToken(screenInvalidation, token, 'digital screen invalidation'));
[
  'touchDigitalScreenContentVersionForStoreServer(',
  'body.touchScreen === true',
].forEach((token) => requireToken(revalidateMenuRoute, token, 'protected digital screen invalidation route'));
forbidToken(revalidateMenuRoute, "'screen-data'", 'protected digital screen invalidation route');

requireNamedImport(mobileMenu, '@database/projects', [
  'appendImageBatchProjectSelections',
  'assertProjectUpdateSucceeded',
  'updateProjectWithoutLoader',
  'uploadFile',
], 'mobile menu screen');
[
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
  'const savedProject = await appendImageBatchProjectSelections({',
].forEach((token) => requireToken(mobileMenu, token, 'mobile menu screen'));
forbidToken(mobileMenu, 'console.error(', 'mobile menu direct error logging');
forbidToken(mobileMenu, 'console.warn(', 'mobile menu direct warn logging');

requireNamedImport(mobileProjectSelector, '@database/projects', [
  'addProject',
  'assertProjectDeleteSucceeded',
  'assertProjectUpdateSucceeded',
  'deleteProject',
  'duplicateProject',
  'getProjectDataWithoutLoader',
  'setProjectActive',
  'updateProjectMetadata',
  'updateProjectWithoutLoader',
], 'mobile project selector');
[
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
  'const [formScope, setFormScope] = useState<ProjectOwnerScope | null>(null);',
  "const mutationToken = beginMutation('save', operationScope);",
  "} as any, 'project-images', operationScope);",
  'expectedScope: operationScope,',
  'syncPublicSummary: true,',
  'logMobileProjectFailure',
].forEach((token) => requireToken(mobileProjectSelector, token, 'mobile project selector'));
forbidToken(
  mobileProjectSelector,
  'mobile_project_public_content_translation_metadata_update_rejected',
  'mobile project selector atomic public translation',
);

requireNamedImport(bulkActionsSheet, '@database/projects', [
  'assertProjectUpdateSucceeded',
  'updateProjectMetadata',
], 'mobile bulk actions');
[
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
