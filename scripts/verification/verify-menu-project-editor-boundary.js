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
const projectDuplicateModal = read('src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx');
const previewModal = read('src/components/templates/main-app/projects/b2cView/previewModal.tsx');
const projectsSubHeader = read('src/components/templates/main-app/projects/ProjectsSubHeader.tsx');
const b2cViewHeader = read('src/components/templates/main-app/projects/b2cView/b2CViewHeader.tsx');
const pdfViewer = read('src/components/templates/main-app/projects/PdfViewer.tsx');
const projectCommonTypes = read('src/components/templates/main-app/projects/types/common.types.ts');
const projectsDataProvider = read('src/providers/projectsDataProvider.tsx');
const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
const fileList = read('src/components/templates/main-app/projects/FileList.tsx');
const editorProjectComparison = read('src/lib/projects/editorProjectComparison.ts');
const editorProjectComparisonTest = read('scripts/verification/test-project-editor-noop-comparison.ts');
const editorKeyboardShortcuts = read('src/components/templates/main-app/projects/editorView/hooks/useEditorKeyboardShortcuts.ts');
const keyboardShortcutsHelp = read('src/components/templates/main-app/projects/editorView/KeyboardShortcutsHelp.tsx');
const languageSelectorModal = read('src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx');
const languageSelector = read('src/components/templates/main-app/projects/LanguageSelector.tsx');
const imageUploadModal = read('src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx');
const aiImageGenerator = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx');
const aiImageGeneratorChat = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx');
const aiDefaultsModal = read('src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx');
const bulkStatusMenuModal = read('src/components/templates/main-app/projects/editorView/BulkStatusMenuModal.tsx');
const reorderMenuModal = read('src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx');
const editItemModal = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
const editCategoryModal = read('src/components/templates/main-app/projects/editorView/editCategoryModal.tsx');
const mediaAspectRatioSelector = read('src/components/shared/media/MediaAspectRatioSelector.tsx');
const decisionBlocksSettingsModal = read('src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx');
const editorOperations = read('src/components/templates/main-app/projects/editorView/utils/editorOperations.ts');
const antConfirmDialog = read('src/lib/accessibility/antConfirmDialog.tsx');
const editorWelcomeBanner = read('src/components/templates/main-app/projects/editorView/EditorWelcomeBanner.tsx');
const zoomableImage = read('src/components/templates/main-app/projects/editorView/ZoomableImage.tsx');
const commandCenter = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx');
const commandCenterActionEngine = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/ActionEngine.tsx');
const commandCenterSelection = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx');
const commandCenterImpactPreview = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx');
const commandCenterBulkOperations = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts');
const commandCenterMoveCategory = read('src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/MoveCategoryAction.tsx');
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
const mobileMenuSetupProgress = read('src/components/mobile/components/MenuSetupProgress.tsx');
const mobileDesignEditor = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
const mobileProjectsProvider = read('src/components/mobile/providers/MobileProjectsProvider.tsx');
const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
const mobileProjectSelector = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
const sharedProjectSelector = read('src/components/shared/ProjectSelector.tsx');
const bulkActionsSheet = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
const mobileItemEditSheet = read('src/components/mobile/sheets/ItemEditSheet.tsx');
const mobileCategoryEditSheet = read('src/components/mobile/sheets/MobileCategoryEditSheet.tsx');
const projectDal = read('src/database/projects/index.ts');
const projectDeleteRoute = read('src/app/api/projects/delete/route.ts');
const projectDeleteErrors = read('src/lib/errors/projectDeleteErrors.ts');
const uiErrorMessages = read('src/lib/errors/uiErrorMessages.ts');
const apiCallComposerClient = read('src/lib/apiHelper/apiCallComposerClient.ts');
const processGuideModal = read('src/components/templates/main-app/projects/ProcessGuideModal.tsx');
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

forbidToken(keyboardShortcutsHelp, '�', 'keyboard shortcuts replacement-character boundary');
requireToken(previewModal, "modalRender={labelConfirmDialog('Menu preview')}", 'project preview dialog-name boundary');
[
  [editItemModal, 'item'],
  [editCategoryModal, 'category'],
].forEach(([source, entity]) => {
  requireToken(source, 'const hasDraftChanges = currentDraftState !== initialDraftState;', `desktop ${entity} draft comparison`);
  requireToken(source, `title: 'Discard unsaved ${entity} changes?'`, `desktop ${entity} discard confirmation`);
  requireToken(source, `modalRender: labelConfirmDialog('Discard unsaved ${entity} changes?')`, `desktop ${entity} discard dialog name`);
  requireToken(source, "cancelText: 'Keep Editing'", `desktop ${entity} discard recovery`);
  requireToken(source, 'onCancel={handleClose}', `desktop ${entity} mask and keyboard close guard`);
  requireToken(source, 'onClick={handleClose}>Cancel</Button>', `desktop ${entity} cancel guard`);
  requireToken(source, 'aria-label={modalData.status === \'edit\' ? `Preview source file ${fileData.name || \'\'}`.trim() : `Preview target file ${fileData.name || \'\'}`.trim()}', `desktop ${entity} file-preview accessible name`);
  requireToken(source, "if (event.key === 'Enter' || event.key === ' ')", `desktop ${entity} file-preview keyboard activation`);
  requireToken(source, 'role="button"', `desktop ${entity} file-preview role`);
  requireToken(source, 'tabIndex={0}', `desktop ${entity} file-preview focusability`);
});
[
  [mobileItemEditSheet, 'item'],
  [mobileCategoryEditSheet, 'category'],
].forEach(([source, entity]) => {
  requireToken(source, 'const hasChanges = currentComparisonState !== initialComparisonState;', `mobile ${entity} draft comparison`);
  requireToken(source, `title: 'Discard unsaved ${entity} changes?'`, `mobile ${entity} discard confirmation`);
  requireToken(source, "cancelText: 'Keep editing'", `mobile ${entity} discard recovery`);
  requireToken(source, 'onMaskClick={() => {\n                void handleClose();', `mobile ${entity} mask close guard`);
  requireToken(source, "<NavBar onBack={() => {\n                    void handleClose();", `mobile ${entity} back close guard`);
});
requireToken(editor, 'const stageProjectUpdateForPersistence = useCallback((updatedProject: Project) => {', 'shared editor modal persistence staging boundary');
requireToken(editor, 'onApply={stageProjectUpdateForPersistence}', 'editor modal persistence callback boundary');
requireToken(editor, 'setProjectData={stageProjectUpdateForPersistence}', 'generation defaults persistence callback boundary');
if ((editor.match(/onApply=\{stageProjectUpdateForPersistence\}/g) || []).length !== 4) {
  failures.push('exactly four shared editor mutation modals must use the persistence staging callback');
}
forbidToken(
  editor,
  'setProjectData(updatedProject);\n                    setActiveProject(updatedProject);\n                    setHasChanges(true);',
  'premature shared editor persistence baseline replacement boundary',
);
requireToken(projectsPage, 'aria-label="Menu link URL"', 'menu-link import URL accessible-name boundary');
requireToken(projectsPage, 'paddingBottom: (activeProject?.files?.length || 0) > 0 ? 88 : undefined', 'fixed continue action content-clearance boundary');
requireToken(projectsPage, 'const onCloseProjectConfirmation = () => {', 'project confirmation recovery boundary');
requireToken(projectsPage, 'onCancel={onCloseProjectConfirmation}', 'project confirmation cancel recovery boundary');
requireToken(projectsPage, 'pending={projectConfirmationPending}', 'project confirmation pending-state boundary');
requireToken(projectsPage, 'if (projectConfirmationPending) return;', 'project confirmation pending cancel guard boundary');
for (const token of [
  'const resetTarget = projectFormSourceData || editingProject;',
  'const resetProjectId = editingProject?.projectId;',
  'const operationScope = projectFormScope;',
  'projectId: resetProjectId,',
  'const resetTargetsActiveProject = selectedProject?.projectId === resetProjectId',
  'if (resetTargetsActiveProject) {',
  'fileCount={(projectFormSourceData || editingProject)?.files?.length || 0}',
]) {
  requireToken(projectsPage, token, 'project confirmation edited-menu identity boundary');
}
forbidToken(projectsPage, 'projectId: selectedProject.projectId,\n                    files: [],', 'project reset must not target the currently selected menu');
forbidToken(projectsPage, 'onCancel={onCloseModal}\n                    fileCount={activeProject?.files?.length || 0}', 'project confirmation must not discard the parent form');
for (const token of [
  'pending?: boolean;',
  'closable={!pending}',
  'keyboard={!pending}',
  'maskClosable={!pending}',
  'loading={pending}',
  'disabled={pending}',
]) {
  requireToken(read('src/components/templates/main-app/projects/ProjectDetails/ProjectConfirmModal.tsx'), token, 'project confirmation pending interaction boundary');
}
for (const token of [
  "setNameError(`Enter a ${labels.offeringPhrase} name.`);",
  "aria-describedby={nameError ? 'duplicate-project-name-error' : undefined}",
  'aria-invalid={Boolean(nameError)}',
  'id="duplicate-project-name-error" role="alert" type="danger"',
]) {
  requireToken(projectDuplicateModal, token, 'duplicate project name recovery boundary');
}
requireToken(antConfirmDialog, "dialog.removeAttribute('aria-labelledby');", 'shared dialog generated-label override boundary');
requireToken(antConfirmDialog, "dialog.setAttribute('aria-label', label);", 'shared dialog explicit-label boundary');
for (const label of [
  'Please fix these issues before continuing',
  'Before publishing',
  'Repair project details?',
  'Delete processed file?',
]) {
  requireToken(editor, `modalRender: labelConfirmDialog(${JSON.stringify(label)})`, `editor ${label} dialog-name boundary`);
}
for (const [source, label] of [
  [editor, 'editor source-file preview'],
  [fileList, 'project file-list preview'],
]) {
  requireToken(
    source,
    'modalRender: labelConfirmDialog(`${previewFile.name || "Source file"} preview`)',
    `${label} dialog-name boundary`,
  );
}
forbidToken(fileList, 'hoveredCard', 'project file actions hover-only boundary');
forbidToken(fileList, 'onMouseEnter=', 'project file actions mouse-hover dependency');
requireToken(fileList, 'width: 150,', 'project file-card readable width boundary');
requireOrder(fileList, [
  'ellipsis={{ tooltip: file.name }}',
  'aria-label={`Preview ${file.name}`}',
  'aria-label={`Delete ${file.name}`}',
], 'project file name and persistent action boundary');
requireToken(languageSelectorModal, 'aria-label={isMasterLinked ? "Activate menu language" : "Add menu language"}', 'menu-language selector name boundary');
for (const token of [
  'role="button"',
  'tabIndex={0}',
  'aria-label={`Remove ${langData?.name ?? lang} language`}',
  "event.key !== 'Enter' && event.key !== ' '",
  "aria-label={t('addLanguagePlaceholder')}",
  'value={null}',
]) {
  requireToken(languageSelector, token, 'project language selector accessibility boundary');
}
forbidToken(languageSelector, 'value={undefined}', 'project add-language controlled-empty boundary');
requireToken(imageUploadModal, "return 'How would you like to add images?';", 'image-choice dialog-name boundary');
requireToken(imageUploadModal, 'aria-label="Select menu item for image"', 'image item-selector name boundary');
requireToken(imageUploadModal, 'optionRender={(option) => {', 'image item-selector rendered-option boundary');
requireToken(imageUploadModal, 'label: `${i.itemName} (${i.categoryName})`,', 'image item-selector accessible-option label boundary');
requireToken(imageUploadModal, "titleText = 'Select items for images';", 'batch-image selection visible-title boundary');
requireToken(aiImageGeneratorChat, 'aria-label="Special instructions"', 'image-generation special-instructions name boundary');
requireToken(aiImageGenerator, 'aria-label="Choose background color"', 'image-generation background-color name boundary');
requireToken(aiImageGenerator, 'aria-label="Choose foreground color"', 'image-generation foreground-color name boundary');
requireToken(aiImageGenerator, 'aria-label="Exclude from image"', 'image-generation negative-prompt name boundary');
for (const token of [
  "ariaLabel: 'Background color'",
  "ariaLabel: 'Foreground color'",
  'aria-label={ariaLabel}',
  'aria-label="Clear background color"',
  'aria-label="Clear foreground color"',
  'aria-label="Exclude from image"',
]) {
  requireToken(aiDefaultsModal, token, 'generation-defaults accessible-control boundary');
}
requireToken(aiImageGenerator, 'aria-pressed={isSelected}', 'image-type selected-state boundary');
requireToken(aiImageGenerator, 'aria-pressed={active}', 'image-type shortcut selected-state boundary');
requireToken(aiImageGenerator, 'aria-label="Choose Image Types"', 'mobile image-type dialog name boundary');
requireToken(mediaAspectRatioSelector, 'aria-pressed={isSelected}', 'shared media aspect-ratio selected-state boundary');
if (mediaAspectRatioSelector.includes('<Card')) {
  fail('desktop media aspect-ratio choices must not use pointer-only Card controls');
}
if (aiImageGenerator.includes("onClick={() => setShowStyleSelector(true)}")) {
  fail('image-generation style summary must not duplicate the nested Change action with a pointer-only parent');
}
if (aiImageGenerator.includes("if (generationConfig.isMultiMode) {\n                                                setShowImageTypeSelector(true);")) {
  fail('image-generation photo-count summary must not duplicate the nested Choose action with a pointer-only parent');
}
requireToken(imageUploadModal, 'modalRender={labelConfirmDialog(getModalAccessibleTitle())}', 'desktop image-flow explicit dialog-name boundary');
requireToken(imageUploadModal, 'aria-label={getMobileHeaderTitle()}', 'mobile image-flow explicit dialog-name boundary');
requireToken(decisionBlocksSettingsModal, 'aria-label={`Select item for ${blockLabels.title}`}', 'featured-choice selector name boundary');
requireToken(decisionBlocksSettingsModal, 'footer={(_, { CancelBtn }) => (', 'featured-choice native cancel recovery boundary');
requireToken(decisionBlocksSettingsModal, '<CancelBtn />', 'featured-choice native cancel control boundary');
requireToken(decisionBlocksSettingsModal, "maxHeight: 'calc(100vh - 260px)'", 'featured-choice viewport-height boundary');
requireToken(decisionBlocksSettingsModal, "overflowY: 'auto'", 'featured-choice scroll recovery boundary');
for (const token of [
  'role="button"',
  'aria-label={`${action.title}: ${action.description}`}',
  'aria-disabled={!isEnabled}',
  'tabIndex={isEnabled ? 0 : -1}',
  "event.key !== 'Enter' && event.key !== ' '",
]) {
  requireToken(commandCenterActionEngine, token, 'command-center action keyboard boundary');
}
for (const token of [
  'aria-label={`Select all items in ${catName}`}',
  'aria-label={`Select ${item.name}`}',
]) {
  requireToken(commandCenterSelection, token, 'command-center selection name boundary');
}
requireToken(commandCenterMoveCategory, 'aria-label="Select destination category"', 'command-center destination selector name boundary');
forbidToken(commandCenterImpactPreview, '<Panel', 'command-center collapse deprecated-child boundary');
requireToken(commandCenter, "pricingPreview?.allChanges.length ?? 0", 'command-center pricing no-op apply boundary');
requireToken(commandCenterImpactPreview, 'No price changes needed', 'command-center pricing no-op owner feedback');
requireToken(commandCenterBulkOperations, 'if (newPrice !== safeCurrentPrice)', 'command-center item-price no-op preview filter');
requireToken(commandCenterBulkOperations, 'if (newAttrPrice === safeAttrPrice) return;', 'command-center attribute-price no-op preview filter');
if ((commandCenterImpactPreview.match(/items=\{/g) || []).length < 4) {
  fail('command-center collapse items boundary is incomplete');
}
requireToken(commandCenter, "modalRender: labelConfirmDialog('Discard current action?')", 'discard-action dialog-name boundary');
requireToken(commandCenter, "modalRender: labelConfirmDialog('Discard changes?')", 'discard-command-center dialog-name boundary');
requireToken(commandCenter, "modalRender: labelConfirmDialog(activeAction === 'repairMenu' ? 'Repair menu?' : 'Apply changes?')", 'apply-action dialog-name boundary');
for (const label of ['Delete Category?', 'Delete Item?', 'Delete Option?']) {
  requireToken(editorOperations, `modalRender: labelConfirmDialog("${label}")`, `${label} dialog-name boundary`);
}

requireToken(
  packageJson,
  '"verify:menu-project-editor-boundary": "node scripts/verification/verify-menu-project-editor-boundary.js && npm run test:project-partial-update-projection && npm run test:project-slug-ownership && npm run test:project-document-scope && npm run test:project-owner-scope && npm run test:project-mutation-authority && npm run test:project-upload-identity && npm run test:project-upload-payload && npm run test:project-editor-noop-comparison && npm run test:time-slot-data-flow"',
  'package scripts',
);

for (const token of [
  'areEditorProjectsEquivalent(activeProject, comparableProjectData)',
  'areEditorProjectsEquivalent(activeProject, projectToSave)',
]) {
  requireToken(editor, token, 'editor semantic no-op comparison boundary');
}
requireToken(editorProjectComparison, 'Array.isArray(item.attributes) && item.attributes.length === 0', 'editor empty-attribute normalization boundary');
requireToken(editorProjectComparison, 'delete item.attributes;', 'editor empty-attribute canonicalization boundary');
for (const token of [
  'missing and empty item attributes must be the same editor truth',
  'empty and missing item attributes must compare symmetrically',
  'removing a persisted attribute must remain a real editor change',
  'non-attribute menu changes must remain detectable',
]) {
  requireToken(editorProjectComparisonTest, token, 'editor no-op comparison regression');
}

['import ProjectsPage from "@template/main-app/projects"', '<ProjectsPage />'].forEach((token) => {
  requireToken(projectsRoute, token, 'projects route');
});

requireOrder(projectSelector, [
  'onEdit={() => {',
  'setModalOpen(false);',
  'onOpenModal(project);',
], 'desktop project selector edit modal handoff');

[
  'aria-label={`Select ${projectName}`}',
  'aria-pressed={isSelected}',
  'aria-label={`Actions for ${projectName}`}',
  'onFocus={() => setIsMenuFocused(true)}',
  'opacity: isHovered || isMenuFocused ? 1 : 0.65',
  'role="button"',
  'tabIndex={0}',
  "if (event.key !== 'Enter' && event.key !== ' ') return;",
  'aria-label={`Close ${labels.offeringPhrase} selector`}',
  'style={{ minHeight: 44, minWidth: 44, position:',
  'label={`Add ${labels.offeringPhrase}`}',
].forEach((token) => requireToken(projectSelector, token, 'desktop project selector keyboard and recovery boundary'));

for (const [label, source] of [
  ['preview modal', previewModal],
  ['projects subheader', projectsSubHeader],
  ['customer-view header', b2cViewHeader],
]) {
  for (const device of ['Desktop', 'Tablet', 'Mobile']) {
    requireToken(source, `aria-label="${device} view"`, `${label} device selector accessibility`);
  }
  requireToken(source, 'aria-pressed={activeDeviceType === DEVICE_TYPES_LIST.', `${label} selected device semantics`);
}

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
  'const hasProjectFeatureAccess = !activeSubscriptionLoading && (hasPaidAccess || hasStarterAccess);',
  'const shouldEnableDesktopProjectsData = hasMounted && hasProjectFeatureAccess;',
  'setActiveProcessingJobIdState(null);\n        if (!hasProjectFeatureAccess) return;',
  'shouldEnableDesktopProjectsData && hasProjectReadScope && effectiveTenantId && effectiveStoreId',
  'shouldEnableDesktopProjectsData && hasProjectReadScope && selectedProjectMatchesStore',
  'useMenuProcessingJob(hasProjectFeatureAccess ? activeProcessingJobId : null)',
  'const masterProjectId = hasProjectFeatureAccess ? activeProject?.masterProjectId || null : null;',
  'project: hasProjectFeatureAccess && selectedProjectMatchesStore ? (selectedProject as Project) : null,',
  'currentView == 1 && projectsLoading',
  'currentView == 1 && projectsError',
  'onClick={() => void mutateProjects()}',
  'projectsData !== undefined && !projectsLoading && !projectsError && projectsList.length === 0',
  "currentView == 2 && selectedProject && (projectLoading || (!activeProject && !projectError))",
  'currentView == 2 && selectedProject && projectError',
  'Could not load this menu',
  'onClick={() => void mutateProject()}',
  'currentView == 2 && selectedProject && activeProject',
  '<Tooltip title="Upload JPG or PNG images">',
  '<Tooltip title="Upload PDF documents">',
  '<span aria-hidden="true" style={{ height: 56, width: 56,',
  "const mutationToken = beginProjectMutation('save', operationScope);",
  "expectedScope: operationScope,",
  'syncPublicSummary: true,',
  "uploadFile({ url: file.url, type: file.type, uid: file.uid }, 'files', operationScope)",
  "throw new Error('menu_upload_project_scope_changed');",
  'logProjectPageFailure',
].forEach((token) => requireToken(projectsPage, token, 'desktop projects page'));
requireOrder(projectsPage, [
  "currentView == 2 && selectedProject && (projectLoading || (!activeProject && !projectError))",
  'currentView == 2 && selectedProject && projectError',
  'currentView == 2 && selectedProject && activeProject',
], 'desktop editor project-load boundary');
forbidToken(projectsPage, 'const shouldEnableDesktopProjectsData = hasMounted;', 'desktop projects entitlement read gate');
forbidToken(projectsPage, "<Button shape='circle' type='text' size='large' icon={<LuFileImage", 'desktop upload decorative image control');
forbidToken(projectsPage, "<Button shape='circle' type='text' size='large' icon={<LuFileText", 'desktop upload decorative PDF control');
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
  "closable={{ 'aria-label': 'Close Bulk Active / Inactive' }}",
  'if (!hasChanges) return;',
  '{hasChanges && <Button onClick={handleClose}>Cancel</Button>}',
  'onClick={hasChanges ? handleApply : handleClose}',
  'aria-label="Set all categories active"',
  'aria-label={`Set ${cat.label} active`}',
  'aria-label={`View ${cat.label} items`}',
  'aria-pressed={selectedCategoryId === cat.id}',
  'aria-label="Set all items active"',
  'aria-label={`Set ${item.label} active`}',
  'useEffect(() => {',
  'initializeOpenState();',
  'const allCategoriesChecked = categoryRows.length > 0 && activeCategories.size === categoryRows.length;',
  'const allItemsChecked = itemRows.length > 0 && activeItems.size === itemRows.length;',
].forEach((token) => requireToken(bulkStatusMenuModal, token, 'bulk status no-change and dialog-action boundary'));
forbidToken(bulkStatusMenuModal, 'const canApply = true;', 'bulk status no-change boundary');
forbidToken(bulkStatusMenuModal, 'afterOpenChange=', 'bulk status must not delay populated-state initialization until after animation');
requireToken(bulkStatusMenuModal, "modalRender: labelConfirmDialog('Unsaved Changes')", 'bulk status unsaved-changes dialog');
requireToken(reorderMenuModal, "modalRender: labelConfirmDialog('Unsaved Changes')", 'reorder unsaved-changes dialog');
requireToken(reorderMenuModal, 'if (!hasChanges) return;', 'reorder no-change apply boundary');
requireToken(reorderMenuModal, 'disabled={!canReorder || !hasChanges}', 'reorder no-change apply control');
requireToken(reorderMenuModal, 'initializeOpenState();', 'reorder populated open-state boundary');
requireToken(reorderMenuModal, 'setSelectedCategoryId(firstCat.id);', 'reorder deterministic open selection');
requireToken(reorderMenuModal, 'setInitialItemRows([]);', 'reorder empty-project recovery');
forbidToken(reorderMenuModal, 'afterOpenChange=', 'reorder must not delay populated-state initialization until after animation');

requireToken(
  editor,
  "content: 'Could not save changes. Your edits are still here. Try again.',",
  'desktop editor save failure recovery',
);
requireToken(
  editor,
  "key: 'menu-editor-save-failed',",
  'desktop editor save failure feedback deduplication',
);
forbidToken(
  editorKeyboardShortcuts,
  'message.success("Changes saved")',
  'keyboard save must not claim success before persistence',
);

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
  'shouldPropagateProjectAfterSourceSave({',
  'project_outlet_propagation_source_ready_failed',
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
  'PROJECT_DELETE_REJECTION_CODES.ALREADY_DELETED',
  'PROJECT_DELETE_REJECTION_CODES.LINKED_OUTLETS',
  'return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });',
  'transaction.set(projectRef, projectUpdate, { merge: true });',
  'fallbackProjectId: fallbackDefaultEntry?.[0],',
  'runStorePublicTruthPostCommitEffects({',
  'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
].forEach((token) => requireToken(projectDeleteRoute, token, 'project delete route'));
[
  'PROJECT_DELETE_REJECTION_CODES',
  "LINKED_OUTLETS: 'project_delete_linked_outlets'",
  "'This menu is used by another location and cannot be deleted. Contact MenuList support if it must be removed.'",
  'isProjectDeleteRejectionResponse',
].forEach((token) => requireToken(projectDeleteErrors, token, 'project delete error contract'));
[
  'getProjectDeleteSafeUiMessage',
  "Reflect.get(error, 'code')",
].forEach((token) => requireToken(uiErrorMessages, token, 'safe UI error mapping'));
[
  'isProjectDeleteRejectionResponse(responseBody)',
  'PROJECT_DELETE_REJECTION_CODES.FAILED',
  'rejectionCode,\n                    response.status,\n                    rejectionCode,',
].forEach((token) => requireToken(projectDal, token, 'project delete client contract'));
if ((projectsPage.match(/await deleteProject\([^)]*\)\.catch\(\(\) => null\)/g) || []).length !== 2) {
  failures.push('desktop project deletion must catch globally handled request rejections before the preflight recovery catch');
}
if ((mobileProjectSelector.match(/await deleteProject\([^)]*\)\.catch\(\(\) => null\)/g) || []).length !== 1) {
  failures.push('mobile project deletion must catch the globally handled request rejection without duplicate diagnostics');
}
[
  'getProjectDeleteSafeUiMessage(getBoundedErrorCode(error))',
  'if (!expectedProjectDeleteMessage) {',
  "secureError('[DAL Client] API call failed'",
  'reduxStore.dispatch(showErrorToast(getSafeUiErrorMessage(error, fallbackMessage)))',
].forEach((token) => requireToken(apiCallComposerClient, token, 'project delete expected-rejection diagnostics'));
[
  "modalRender={labelConfirmDialog('How It Works')}",
  "maxHeight: 'calc(100dvh - 180px)'",
  "overflowY: 'auto'",
  "gridTemplateColumns: compact ? '1fr' : '1fr 1fr'",
  '<Flex justify="center">',
  "Got It, Let&apos;s Start!",
].forEach((token) => requireToken(processGuideModal, token, 'project setup guide viewport and accessibility boundary'));
if ((projectsPage.match(/if \(!deleteResult\) return;/g) || []).length < 2) {
  failures.push('desktop project deletion must stop after the single global request-rejection toast');
}
requireToken(
  mobileProjectSelector,
  'await deleteProject(project.projectId).catch(() => null)',
  'mobile project delete rejection ownership',
);
requireToken(mobileProjectSelector, 'if (!deleteResult) return;', 'mobile project delete rejection ownership');
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
  'const persistExplicitMenuUpdate = useCallback(async (updatedProject: any) => {',
  "throw new Error('mobile_menu_explicit_persist_project_required');",
  "throw new Error('mobile_menu_explicit_persist_pending');",
  'const savedProject = await updateProjectWithoutLoader(snapshot);',
  'mobile_menu_project_persist_project_update_rejected',
  'mobile_menu_project_persist_failed',
  'mobile_menu_item_image_project_update_rejected',
  'mobile_menu_item_image_project_update_failed',
  'logMobileMenuFailure',
  'const savedProject = await appendImageBatchProjectSelections({',
].forEach((token) => requireToken(mobileMenu, token, 'mobile menu screen'));
if ((mobileMenu.match(/await persistExplicitMenuUpdate\(updated\);/g) || []).length !== 10) {
  failures.push('mobile explicit category and item mutations must share the acknowledged persistence boundary');
}
if ((mobileMenu.match(/if \(shouldUploadImage\) \{\n\s+applyLocalMenuUpdate\(updated\);\n\s+\} else \{\n\s+await persistExplicitMenuUpdate\(updated\);\n\s+\}/g) || []).length !== 2) {
  failures.push('mobile item editor must await explicit non-image persistence in both linked and normal save branches');
}
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
[
  "aria-label={t('selectCatalog')}",
  "aria-label={`${resolveProjectName(managingProject?.name, t('catalogActions'))} menu actions`}",
  "aria-label={formMode === 'create' ? t('createCatalog')",
  "<Input aria-label={t('catalogName')}",
].forEach((token) => requireToken(mobileProjectSelector, token, 'mobile project selector dialog naming'));
[
  "aria-label={`Manage ${projectName || t('untitled')}`}",
  "aria-label={`Select ${projectName || t('untitled')}`}",
  'aria-pressed={isSelected}',
  "aria-label={t('createCatalog')}",
].forEach((token) => requireToken(sharedProjectSelector, token, 'shared project selector accessibility'));
forbidToken(sharedProjectSelector, 'hoverable\n                        onClick={() => onSelect(project.id)}', 'shared project selector composite card');
forbidToken(sharedProjectSelector, 'hoverable\n                    onClick={onCreate}', 'shared project create card');
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
  'await onApply(updated,',
  'aria-label={actionTitle}',
  "aria-pressed={statusFilter === option.key}",
  "{allCategorySelected ? 'Deselect' : 'Select'} all items in {categoryName}",
  "style={{ minHeight: 44, width: '100%' }}",
  'mobile_bulk_actions_project_metadata_translation_update_rejected',
].forEach((token) => requireToken(bulkActionsSheet, token, 'mobile bulk actions'));
if ((bulkActionsSheet.match(/await onApply\(updated,/g) || []).length !== 3) {
  failures.push('mobile bulk actions must await acknowledged persistence before closing every update path');
}
forbidToken(bulkActionsSheet, '<Flex\n            align="center"\n            gap={10}\n            onClick=', 'mobile bulk selection shortcuts');
forbidToken(bulkActionsSheet, '<div onClick={(event) => event.stopPropagation()}>\n                                                        <Checkbox', 'mobile bulk category and item selection');

[
  'const applyUndoableBulkMenuUpdate = useCallback(async',
  'await persistExplicitMenuUpdate(linkedUpdate.project);',
  'await applyUndoableBulkMenuUpdate(updatedProject,',
  'void persistExplicitMenuUpdate(removeObjRef(previousProject))',
].forEach((token) => requireToken(mobileMenu, token, 'mobile bulk acknowledged persistence'));

requireNamedImport(mobileMenu, '@database/projects', [
  'assertProjectUpdateSucceeded',
  'publishProject',
], 'mobile menu publish');
[
  'const handlePublishMenu = useCallback(async',
  'publishMenuInFlightRef.current = true;',
  'await flushPendingMenuPersist();',
  'await waitForMenuPersistenceIdle();',
  "throw new Error('mobile_menu_publish_pending_save');",
  'const updatedProject = await publishProject(projectToPublish, {',
  'expectedModifiedOn: projectToPublish.modifiedOn,',
  "'mobile_menu_publish_project_update_rejected'",
  'syncSavedMenuProject(publishedProject);',
  "logMobileMenuFailure('mobile_menu_publish_failed'",
  "logMobileMenuFailure('mobile_menu_publish_verification_setup_failed'",
  "logMobileMenuFailure('mobile_menu_publish_verification_failed'",
  'onPublish={handlePublishMenu}',
  'actionLoading={isPublishingMenu}',
].forEach((token) => requireToken(mobileMenu, token, 'mobile menu publish'));
requireOrder(mobileMenu, [
  'await flushPendingMenuPersist();',
  'await waitForMenuPersistenceIdle();',
  'const updatedProject = await publishProject(projectToPublish, {',
  'assertProjectUpdateSucceeded(',
  'syncSavedMenuProject(publishedProject);',
], 'mobile menu publish acknowledgement order');
[
  "action.id === 'open_publish' && onPublish",
  'onPublish();',
  'disabled={actionLoading}',
  'loading={actionLoading}',
].forEach((token) => requireToken(mobileMenuSetupProgress, token, 'mobile menu setup publish handoff'));

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
