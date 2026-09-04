const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ts = require('typescript');

const root = process.cwd();
const websiteStyles = fs.readFileSync(path.join(root, 'src/styles/website.css'), 'utf8');
const inventoryPath = path.join(
  root,
  '__docs__/audits/menulist-rc-certification-inventory.csv',
);
const runtimeEvidencePath = path.join(
  root,
  '__docs__/audits/menulist-rc-runtime-evidence.json',
);

const INTERACTIVE_JSX_TAG_KINDS = new Map([
  ['Segmented', 'selection'],
  ['ColorPicker', 'selection'],
  ['Rate', 'selection'],
  ['Slider', 'selection'],
  ['RangePicker', 'selection'],
  ['TreeSelect', 'selection'],
  ['Tree', 'selection'],
  ['Collapse', 'disclosure'],
  ['Tabs', 'disclosure'],
  ['Dropdown', 'disclosure'],
  ['Menu', 'disclosure'],
  ['Popover', 'disclosure'],
  ['AccordionTrigger', 'disclosure'],
  ['Modal', 'dialog-action-surface'],
  ['Drawer', 'dialog-action-surface'],
  ['Popconfirm', 'dialog-action-surface'],
]);
const CONCRETE_JSX_TAGS = new Set([
  'button', 'Button', 'IconButton', 'WebsiteButton',
  'a', 'Link', 'NavLink',
  'form', 'Form',
  'input', 'Input', 'InputNumber', 'TextArea', 'textarea',
  'select', 'Select', 'Checkbox', 'Radio', 'Switch', 'DatePicker', 'TimePicker',
  'Segmented', 'ColorPicker', 'Rate', 'Slider', 'RangePicker', 'TreeSelect', 'Tree',
  'Collapse', 'Tabs', 'Dropdown', 'Menu', 'Popover', 'AccordionTrigger',
  'Modal', 'Drawer', 'Popconfirm', 'Upload',
]);
const ANSWERLATTICE_MOBILE_MORE_ACTION_KEYS = new Set([
  'answerlatticeIntakeMonitor',
  'answerlatticeHub',
  'knowledgeBase',
  'kbGeneration',
  'changelog',
  'answerlatticeWidget',
  'supportTickets',
  'feedbackAdmin',
  'answerlatticeIntake',
  'chatManagement',
  'chatInsights',
  'chatBackfill',
  'chatWeeklyDigest',
  'chatRoiCalculator',
]);
const ANSWERLATTICE_LEGACY_COMPONENT_PREFIXES = [
  'src/components/templates/main-app/platform/answerlatticeIntakeMonitor/',
  'src/components/templates/platform/changelog/',
  'src/components/templates/platform/chatManagement/',
  'src/components/templates/platform/feedbackAdmin/',
  'src/components/templates/platform/KBGeneration/',
  'src/components/templates/platform/knowledgeBase/',
  'src/components/templates/platform/supportTickets/',
  'src/components/organisms/KnowledgeBaseExplorer/',
  'src/components/organisms/SupportTicket/',
  'src/components/organisms/addSupportTicket/',
];

function propertyNameText(property) {
  const name = property?.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function keyedMenuActionsByLine(source, relativePath) {
  const scriptKind = relativePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : relativePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : relativePath.endsWith('.ts')
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const actions = new Map();
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const keyProperty = node.properties.find((property) => (
        ts.isPropertyAssignment(property) && propertyNameText(property) === 'key'
      ));
      const hasAction = node.properties.some((property) => (
        ['onClick', 'onPress', 'onAction'].includes(propertyNameText(property))
      ));
      if (keyProperty && hasAction) {
        const keyValue = keyProperty.initializer;
        if (ts.isStringLiteral(keyValue) || ts.isNoSubstitutionTemplateLiteral(keyValue)) {
          actions.set(
            sourceFile.getLineAndCharacterOfPosition(keyProperty.getStart(sourceFile)).line + 1,
            keyValue.text,
          );
        } else {
          actions.set(
            sourceFile.getLineAndCharacterOfPosition(keyProperty.getStart(sourceFile)).line + 1,
            keyValue.getText(sourceFile),
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return actions;
}

function jsxBackingHandlerLines(source, relativePath) {
  const scriptKind = relativePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : relativePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : relativePath.endsWith('.ts')
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const lines = new Set();
  const tagNameText = (tagName) => {
    if (ts.isIdentifier(tagName)) return tagName.text;
    if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
    return tagName.getText(sourceFile);
  };
  const visit = (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && CONCRETE_JSX_TAGS.has(tagNameText(node.tagName))
    ) {
      for (const property of node.attributes.properties) {
        if (
          ts.isJsxAttribute(property)
          && ['onClick', 'onPress', 'onAction', 'onSubmit'].includes(property.name.text)
        ) {
          lines.add(sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return lines;
}

function fail(message) {
  console.error(`MenuList RC inventory verification failed: ${message}`);
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

if (!fs.existsSync(inventoryPath)) fail('generated CSV is missing');
const parsed = parseCsv(fs.readFileSync(inventoryPath, 'utf8'));
if (parsed.length < 2) fail('generated CSV contains no inventory rows');
const headers = parsed[0];
const required = [
  'inventory_id',
  'item_type',
  'product_area',
  'route_or_component',
  'control_or_action',
  'test_result',
  'final_verification_status',
  'evidence_or_notes',
];
for (const column of required) {
  if (!headers.includes(column)) fail(`required column ${column} is missing`);
}
const objects = parsed.slice(1).map((cells) => Object.fromEntries(
  headers.map((header, index) => [header, cells[index] ?? '']),
));
if (!fs.existsSync(runtimeEvidencePath)) fail('runtime evidence registry is missing');
const runtimeEvidence = JSON.parse(fs.readFileSync(runtimeEvidencePath, 'utf8'));
const sourceFilesForFlagReaders = [];
const collectSourceFiles = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectSourceFiles(absolute);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) sourceFilesForFlagReaders.push(absolute);
  }
};
collectSourceFiles(path.join(root, 'src'));
const featureReaderSources = sourceFilesForFlagReaders
  .filter((file) => path.relative(root, file).split(path.sep).join('/') !== 'src/config/features.ts')
  .map((file) => fs.readFileSync(file, 'utf8'));
const featureReaderFiles = sourceFilesForFlagReaders
  .filter((file) => path.relative(root, file).split(path.sep).join('/') !== 'src/config/features.ts')
  .filter((file) => /\bFEATURE_FLAGS\.ENABLE_[A-Z0-9_]+\b/.test(fs.readFileSync(file, 'utf8')))
  .sort();
const featureFlagSourceManifest = createHash('sha256');
for (const file of [path.join(root, 'src/config/features.ts'), ...featureReaderFiles]) {
  featureFlagSourceManifest.update(path.relative(root, file).split(path.sep).join('/'));
  featureFlagSourceManifest.update('\0');
  featureFlagSourceManifest.update(fs.readFileSync(file));
  featureFlagSourceManifest.update('\0');
}
const currentFeatureFlagSourceManifestSha256 = featureFlagSourceManifest.digest('hex');
const featureFlagRuntimeEvidence = runtimeEvidence.featureFlagRegistryRuntime;
if (
  featureFlagRuntimeEvidence?.result !== 'PASS_REGISTRY_RUNTIME_BOUNDARY'
  || featureFlagRuntimeEvidence?.sourceManifestSha256 !== currentFeatureFlagSourceManifestSha256
) fail('feature-flag registry runtime evidence is missing or stale');
const featureFlagPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!String(featureFlagPackage.scripts?.['test:menulist-feature-flag-runtime'] || '').includes('scripts/verification/test-menulist-feature-flag-runtime.ts')) {
  fail('feature-flag runtime regression is not registered in package.json');
}
const ids = new Set();
for (const row of objects) {
  if (ids.has(row.inventory_id)) fail(`duplicate inventory ID ${row.inventory_id}`);
  ids.add(row.inventory_id);
  if (!row.product_area) fail(`row ${row.inventory_id} has no product classification`);
  if (!row.final_verification_status) fail(`row ${row.inventory_id} has no status`);
}
for (const row of objects.filter((candidate) => candidate.item_type === 'feature-flag')) {
  const hasRuntimeReader = featureReaderSources.some((source) => (
    new RegExp(`\\bFEATURE_FLAGS\\.${row.screen_or_tab}\\b`).test(source)
  ));
  const classifiedDormant = row.final_verification_status === 'DECLARED_FLAG_WITHOUT_RUNTIME_READER';
  if (classifiedDormant === hasRuntimeReader) {
    fail(`feature flag ${row.screen_or_tab} has stale runtime-reader classification`);
  }
  if (
    hasRuntimeReader
    && (
      row.test_result !== 'PASS_PARTIAL_FLAG_REGISTRY_BOUNDARY'
      || row.regression_test_added !== 'YES'
      || row.final_verification_status !== 'PARTIAL_FLAG_READER_AND_REGISTRY_BOUNDARY'
    )
  ) fail(`feature flag ${row.screen_or_tab} lacks current registry/runtime-reader evidence`);
}
const functionExports = objects.filter((row) => row.item_type === 'firebase-function-export');
if (functionExports.length !== 28) fail(`expected 28 Firebase Function exports, found ${functionExports.length}`);
const expectedAnswerlatticeCompatibilityExports = new Set([
  'backfillAggregates',
  'embedArticleWorker',
  'publishApprovedJobFn',
  'regenerateEmbedding',
  'triggerAggregationManual',
]);
const answerlatticeCompatibilityExports = functionExports.filter((row) => (
  row.product_area === 'Answerlattice boundary'
));
if (
  answerlatticeCompatibilityExports.length !== expectedAnswerlatticeCompatibilityExports.size
  || answerlatticeCompatibilityExports.some((row) => (
    !expectedAnswerlatticeCompatibilityExports.has(row.screen_or_tab)
  ))
) fail('Answerlattice compatibility Function export classification is incomplete or stale');
const menuListFunctionExports = functionExports.filter((row) => row.product_area === 'MenuList');
if (menuListFunctionExports.length !== 23) {
  fail(`expected 23 MenuList Function exports, found ${menuListFunctionExports.length}`);
}
const expectedConditionalFunctionExports = new Set([
  'dev_triggerFinalizePublish',
  'dev_triggerProcessMenuImages',
  'dev_triggerStartGeneration',
  'finalizePublish',
  'processMenuImagesJob',
  'retryGeneration',
  'startGeneration',
]);
for (const name of expectedConditionalFunctionExports) {
  if (!menuListFunctionExports.some((row) => row.screen_or_tab === name)) {
    fail(`conditional Function export ${name} is missing from inventory`);
  }
}
const functionRuntimeEvidence = runtimeEvidence.menuListFunctionExportRuntimeBoundary;
if (functionRuntimeEvidence?.result !== 'PASS_PARTIAL_RUNTIME_BOUNDARIES') {
  fail('MenuList Function runtime-boundary evidence is missing or not passing');
}
const functionRuntimeSourceFiles = [
  'functions/src/aggregateCustomerAnalytics.ts',
  'functions/src/config/secrets.ts',
  'functions/src/decisionBlocksScoring.ts',
  'functions/src/dev-triggers.ts',
  'functions/src/emailOs/http.ts',
  'functions/src/emailOs/webhook.ts',
  'functions/src/index.ts',
  'functions/src/messagingOnboarding/webhookHandler.ts',
  'functions/src/schedulers/masterScheduler.ts',
  'functions/src/schedulers/menulistMaintenanceScheduler.ts',
  'functions/src/triggers/messaging.ts',
  'functions/src/triggers/operations.ts',
  'functions/src/triggers/production.ts',
  'functions/src/triggers/shared.ts',
];
const functionSourceHash = createHash('sha256');
for (const relativePath of functionRuntimeSourceFiles) {
  functionSourceHash.update(relativePath);
  functionSourceHash.update('\0');
  functionSourceHash.update(fs.readFileSync(path.join(root, relativePath)));
  functionSourceHash.update('\0');
}
const currentFunctionSourceManifestSha256 = functionSourceHash.digest('hex');
if (functionRuntimeEvidence.sourceManifestSha256 !== currentFunctionSourceManifestSha256) {
  fail('MenuList Function runtime evidence source manifest is stale');
}
const fullLocalFunctionContracts = new Set(functionRuntimeEvidence.fullLocalContractExports || []);
const partialFunctionRuntimeBoundaries = new Set(functionRuntimeEvidence.partialRuntimeBoundaryExports || []);
const allRuntimeFunctionEvidence = new Set([
  ...fullLocalFunctionContracts,
  ...partialFunctionRuntimeBoundaries,
]);
const currentMenuListFunctionNames = new Set(menuListFunctionExports.map((row) => row.screen_or_tab));
if (
  fullLocalFunctionContracts.size + partialFunctionRuntimeBoundaries.size !== currentMenuListFunctionNames.size
  || allRuntimeFunctionEvidence.size !== currentMenuListFunctionNames.size
  || [...allRuntimeFunctionEvidence].some((name) => !currentMenuListFunctionNames.has(name))
) fail('MenuList Function runtime evidence does not partition all current exports exactly once');
for (const row of menuListFunctionExports) {
  if (fullLocalFunctionContracts.has(row.screen_or_tab)) {
    if (
      row.test_result !== 'PASS_LOCAL_CURRENT_CONTRACT'
      || row.final_verification_status !== 'PASS_LOCAL_DEPLOYED_RETEST_PENDING'
      || row.regression_test_added !== 'YES'
    ) fail(`full local Function contract evidence was not applied to ${row.screen_or_tab}`);
  } else if (
    row.test_result !== 'PASS_PARTIAL_RUNTIME_BOUNDARY'
    || row.final_verification_status !== 'PARTIAL_LOCAL_RUNTIME_BOUNDARY'
    || row.regression_test_added !== 'YES'
  ) fail(`partial Function runtime evidence was not applied to ${row.screen_or_tab}`);
}
const functionRuntimeScriptPath = path.join(root, 'scripts/verification/test-menulist-function-exports-runtime.js');
if (!fs.existsSync(functionRuntimeScriptPath)) fail('MenuList Function runtime regression is missing');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!String(packageJson.scripts?.['test:menulist-function-exports-runtime'] || '').includes(functionRuntimeScriptPath.slice(root.length + 1))) {
  fail('MenuList Function runtime regression is not registered in package.json');
}
const menuListRouteHandlers = objects.filter((row) => (
  row.item_type === 'api-route'
  && row.product_area === 'MenuList'
));
if (menuListRouteHandlers.length !== 141) {
  fail(`expected 141 MenuList route handlers, found ${menuListRouteHandlers.length}`);
}
for (const row of menuListRouteHandlers) {
  if (row.control_or_action === 'UNRESOLVED_METHOD') {
    fail(`route handler ${row.route_or_component} has unresolved exported methods`);
  }
  if (row.role === 'PUBLIC_OR_GUARD_TRACE_REQUIRED') {
    fail(`route handler ${row.route_or_component} has no explicit access-boundary classification`);
  }
}
const answerlatticeWidgetHandlers = objects.filter((row) => (
  row.item_type === 'api-route'
  && row.route_or_component.startsWith('/api/widget/')
));
if (
  answerlatticeWidgetHandlers.length !== 5
  || answerlatticeWidgetHandlers.some((row) => row.product_area !== 'Answerlattice boundary')
) fail('all five /api/widget handlers must remain classified as Answerlattice separation boundaries');
const answerlatticeWidgetControls = objects.filter((row) => (
  row.item_type === 'user-control-candidate'
  && row.route_or_component === 'src/app/widget/[apiKey]/WidgetClient.tsx'
));
if (
  answerlatticeWidgetControls.length !== 31
  || answerlatticeWidgetControls.some((row) => row.product_area !== 'Answerlattice boundary')
) fail('all 31 Answerlattice widget controls must remain outside the MenuList certification denominator');
const legacyCustomDomainControls = objects.filter((row) => (
  row.item_type === 'user-control-candidate'
  && row.route_or_component === 'src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx'
));
if (
  legacyCustomDomainControls.length !== 18
  || legacyCustomDomainControls.some((row) => (
    row.test_result !== 'PASS_NOT_SHIPPED'
    || row.final_verification_status !== 'SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE'
  ))
) fail('all 18 legacy CustomDomainTab controls must remain source-unreachable; DomainSettingsTab is the active surface');
const signIn = objects.find((row) => row.item_type === 'page' && row.route_or_component === '/signin');
if (!signIn || signIn.product_area !== 'MenuList') fail('MenuList /signin page classification is missing');
const mainPages = objects.filter((row) => (
  row.item_type === 'page'
  && row.product_area === 'MenuList'
  && row.screen_or_tab.startsWith('src/app/(main)/')
));
if (mainPages.length !== 49) fail(`expected 49 MenuList private pages, found ${mainPages.length}`);
const expectedAnswerlatticeLegacyPrivateRoutes = new Set([
  '/platform/answerlattice-early-access',
  '/platform/answerlattice-intake',
  '/platform/changelog',
  '/platform/chat-backfill',
  '/platform/chat-insights',
  '/platform/chat-management',
  '/platform/chat-roi-calculator',
  '/platform/chat-weekly-digest',
  '/platform/feedback-admin',
  '/platform/kb-generation',
  '/platform/knowledge-base',
  '/platform/support-tickets',
]);
const answerlatticeLegacyPrivatePages = objects.filter((row) => (
  row.item_type === 'page'
  && row.product_area === 'Answerlattice boundary'
  && row.screen_or_tab.startsWith('src/app/(main)/platform/')
));
if (
  answerlatticeLegacyPrivatePages.length !== expectedAnswerlatticeLegacyPrivateRoutes.size
  || answerlatticeLegacyPrivatePages.some((row) => !expectedAnswerlatticeLegacyPrivateRoutes.has(row.route_or_component))
) fail('legacy Answerlattice private-page separation classification is incomplete or stale');
const privateAccessEvidence = runtimeEvidence.privateRouteAccess;
if (privateAccessEvidence?.result !== 'PASS') fail('private-route browser access evidence is not passing');
const answerlatticePrivateRoutesPendingBrowserAccess = new Set([
  '/platform/answerlattice-early-access',
  '/platform/answerlattice-intake',
]);
const expectedPrivateAccessRoutes = new Set([
  ...mainPages.map((row) => row.route_or_component),
  ...[...expectedAnswerlatticeLegacyPrivateRoutes].filter((route) => (
    !answerlatticePrivateRoutesPendingBrowserAccess.has(route)
  )),
]);
const privateAccessRoutes = new Set(privateAccessEvidence.routes);
const missingPrivateAccessRoutes = [...expectedPrivateAccessRoutes]
  .filter((route) => !privateAccessRoutes.has(route));
const unexpectedPrivateAccessRoutes = [...privateAccessRoutes]
  .filter((route) => !expectedPrivateAccessRoutes.has(route));
if (
  privateAccessRoutes.size !== expectedPrivateAccessRoutes.size
  || missingPrivateAccessRoutes.length > 0
  || unexpectedPrivateAccessRoutes.length > 0
) {
  fail([
    'private-route browser access evidence does not match the current private-page inventory',
    `missing: ${missingPrivateAccessRoutes.join(', ') || 'none'}`,
    `unexpected: ${unexpectedPrivateAccessRoutes.join(', ') || 'none'}`,
  ].join('; '));
}
for (const row of answerlatticeLegacyPrivatePages.filter((candidate) => (
  !answerlatticePrivateRoutesPendingBrowserAccess.has(candidate.route_or_component)
))) {
  if (
    row.test_result !== 'PASS_SEPARATION_ACCESS_BOUNDARY'
    || row.final_verification_status !== 'SEPARATION_ACCESS_BOUNDARY_PASSED'
  ) fail(`Answerlattice legacy route ${row.route_or_component} is missing signed-out separation evidence`);
}
const authenticatedOwnerNavigationEvidence = runtimeEvidence.authenticatedOwnerNavigation;
if (authenticatedOwnerNavigationEvidence?.result !== 'PASS') {
  fail('authenticated owner navigation evidence is not passing');
}
const authenticatedOwnerNavigationRoutes = new Set(authenticatedOwnerNavigationEvidence.routes);
const growthKitsPage = objects.find((row) => (
  row.item_type === 'page'
  && row.route_or_component === '/growth-kits'
));
if (
  !growthKitsPage
  || growthKitsPage.product_area !== 'MenuList'
  || growthKitsPage.test_result !== 'PASS_AUTHENTICATED_RENDER'
  || !authenticatedOwnerNavigationRoutes.has('/growth-kits')
) fail('Growth Kits must remain an in-scope authenticated MenuList owner surface');
const recordedControlEvidenceKeys = new Set();
const verifyControlEvidenceSet = (evidenceSet, label, minimumRows, expected = {
  testResult: 'PASS_HOSTED_INTERACTION',
  finalStatus: 'HOSTED_INTERACTION_PASSED',
}) => {
  if (evidenceSet?.result !== 'PASS') fail(`${label} control-interaction evidence is not passing`);
  let recordedRows = 0;
  for (const interaction of evidenceSet.interactions ?? []) {
    if (!interaction.source || !interaction.evidence || !interaction.controlActions?.length) {
      fail(`${label} control-interaction evidence has an incomplete entry`);
    }
    for (const controlAction of interaction.controlActions) {
      const key = `${interaction.source}|${controlAction}`;
      if (recordedControlEvidenceKeys.has(key)) fail(`duplicate runtime control evidence ${key}`);
      recordedControlEvidenceKeys.add(key);
      recordedRows += 1;
      const row = objects.find((candidate) => (
        candidate.item_type === 'user-control-candidate'
        && candidate.route_or_component === interaction.source
        && candidate.control_or_action === controlAction
      ));
      if (!row) fail(`${label} control evidence no longer resolves ${key}`);
      if (
        row.test_result !== expected.testResult
        || row.final_verification_status !== expected.finalStatus
      ) fail(`${label} control evidence was not applied to ${key}`);
    }
  }
  if (recordedRows < minimumRows) fail(`only ${recordedRows} ${label} control rows have runtime evidence`);
};
const verifySupplementalControlEvidenceSet = (evidenceSet, label, minimumRows, expected = null) => {
  if (evidenceSet?.result !== 'PASS') fail(`${label} supplemental control-interaction evidence is not passing`);
  let recordedRows = 0;
  for (const interaction of evidenceSet.interactions ?? []) {
    if (!interaction.source || !interaction.evidence || !interaction.controlActions?.length) {
      fail(`${label} supplemental control-interaction evidence has an incomplete entry`);
    }
    for (const controlAction of interaction.controlActions) {
      recordedRows += 1;
      const row = objects.find((candidate) => (
        candidate.item_type === 'user-control-candidate'
        && candidate.route_or_component === interaction.source
        && candidate.control_or_action === controlAction
      ));
      if (!row) fail(`${label} supplemental control evidence no longer resolves ${interaction.source}|${controlAction}`);
      if (expected && (
        row.test_result !== expected.testResult
        || row.final_verification_status !== expected.finalStatus
      )) fail(`${label} supplemental control evidence was not applied to ${interaction.source}|${controlAction}`);
    }
  }
  if (recordedRows < minimumRows) fail(`only ${recordedRows} ${label} supplemental control rows have runtime evidence`);
};
const currentInteractionEvidenceManifest = (evidenceSet) => {
  const sourceFiles = [...new Set((evidenceSet?.interactions ?? []).map((interaction) => interaction.source))];
  const manifest = createHash('sha256');
  for (const relativePath of sourceFiles) {
    manifest.update(relativePath);
    manifest.update('\0');
    manifest.update(fs.readFileSync(path.join(root, relativePath)));
    manifest.update('\0');
  }
  return manifest.digest('hex');
};
verifyControlEvidenceSet(runtimeEvidence.authenticatedOwnerControlInteractions, 'authenticated owner', 30);
verifyControlEvidenceSet(runtimeEvidence.localPlatformControlInteractions, 'local platform', 143, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyControlEvidenceSet(runtimeEvidence.publicCustomerControlInteractions, 'public customer', 10);
const creativeEditorEvidence = runtimeEvidence.creativeEditorControlInteractions;
const creativeEditorSourceManifest = createHash('sha256');
for (const relativePath of [
  'src/modules/creative-editor/CreativeEditor.tsx',
  'src/app/(internal)/creative-editor-smoke/CreativeEditorSmokeClient.tsx',
  'src/app/(internal)/creative-editor-smoke/page.tsx',
]) {
  creativeEditorSourceManifest.update(relativePath);
  creativeEditorSourceManifest.update('\0');
  creativeEditorSourceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  creativeEditorSourceManifest.update('\0');
}
if (creativeEditorEvidence?.sourceManifestSha256 !== creativeEditorSourceManifest.digest('hex')) {
  fail('Creative Editor local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.creativeEditorControlInteractions, 'Creative Editor local', 276, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyControlEvidenceSet(runtimeEvidence.creativeEditorNativeBoundaryControls, 'Creative Editor native boundary', 19, {
  testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
  finalStatus: 'BLOCKED_NATIVE_FILE_COLOR_OR_CLIPBOARD_BOUNDARY_NOT_INDEPENDENTLY_VERIFIED',
});
verifyControlEvidenceSet(runtimeEvidence.creativeEditorNotShippedControls, 'Creative Editor MenuList not-shipped', 5, {
  testResult: 'PASS_NOT_SHIPPED',
  finalStatus: 'CURRENT_MENULIST_ADAPTER_DOES_NOT_SHIP_AI_EDITOR_ACTIONS',
});
const exactCreativeEditorEvidenceActions = (evidenceSet) => (evidenceSet?.interactions ?? [])
  .flatMap((interaction) => interaction.controlActions ?? [])
  .sort();
const expectedCreativeEditorNativeActions = ['button@5864', 'input@6247', 'input@6256', 'button@6294', 'button@6761', 'input@6923', 'button@7241', 'input@7298', 'button@7570', 'input@7679', 'button@7848', 'button@7853', 'input@8628', 'input@8638', 'input@8698', 'input@8934', 'button@8998', 'input@9018', 'button@9062'].sort();
const expectedCreativeEditorNotShippedActions = ['button@5599', 'button@5603', 'button@5666', 'button@6873', 'button@7664'].sort();
if (JSON.stringify(exactCreativeEditorEvidenceActions(runtimeEvidence.creativeEditorNativeBoundaryControls)) !== JSON.stringify(expectedCreativeEditorNativeActions)) {
  fail('Creative Editor native boundary actions drifted');
}
if (JSON.stringify(exactCreativeEditorEvidenceActions(runtimeEvidence.creativeEditorNotShippedControls)) !== JSON.stringify(expectedCreativeEditorNotShippedActions)) {
  fail('Creative Editor MenuList not-shipped actions drifted');
}
const websiteHeaderEvidence = runtimeEvidence.websiteHeaderControlInteractions;
const websiteHeaderSourceManifest = createHash('sha256');
for (const relativePath of [
  'src/components/website/Header.tsx',
  'src/components/website/WebsiteAnalyticsConsent.tsx',
  'src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx',
]) {
  websiteHeaderSourceManifest.update(relativePath);
  websiteHeaderSourceManifest.update('\0');
  websiteHeaderSourceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteHeaderSourceManifest.update('\0');
}
if (websiteHeaderEvidence?.sourceManifestSha256 !== websiteHeaderSourceManifest.digest('hex')) {
  fail('website header local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.websiteHeaderControlInteractions, 'website header local', 6, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const localMobileOwnerEvidence = runtimeEvidence.localMobileOwnerControlInteractions;
const localMobileOwnerManifest = createHash('sha256');
for (const relativePath of [
  'src/app/(website)/create-menu/PreviewClient.tsx',
  'src/components/mobile/antd.tsx',
  'src/components/mobile/MobileShell.tsx',
  'src/components/mobile/MobileNavigation.tsx',
  'src/components/mobile/screens/MobileHoursScreen.tsx',
  'src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx',
  'src/components/mobile/components/MobileSpecialHoursManager.tsx',
  'src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/screens/MobileSpecialMenuScreen.tsx',
  'src/components/mobile/screens/MobileUsersScreen.tsx',
  'src/components/mobile/screens/MobileRolesScreen.tsx',
  'src/components/mobile/components/MobileProjectSelectorSheet.tsx',
  'src/components/mobile/components/MobileLinkCard.tsx',
  'src/components/mobile/components/CommunicationKit.tsx',
  'src/lib/communication/messageTemplates.ts',
  'src/components/mobile/components/MobileQrCodeSheet.tsx',
  'src/components/mobile/components/MobileCompliancePagesEditor.tsx',
  'src/components/mobile/components/MobileTempStatusConfigurator.tsx',
  'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
  'src/components/mobile/screens/MobileNotificationSettingsScreen.tsx',
  'src/components/mobile/screens/MobileResellerDashboardScreen.tsx',
  'src/components/mobile/screens/MobileResellerOnboardingScreen.tsx',
  'src/components/mobile/screens/MobileResellerManagementScreen.tsx',
  'src/lib/reseller/resellerManagementProfile.ts',
  'src/components/mobile/screens/MobileBillingScreen.tsx',
  'src/components/mobile/screens/MobileLocationsScreen.tsx',
  'src/components/mobile/screens/MobileTransactionsScreen.tsx',
  'src/components/mobile/screens/MobileHelpScreen.tsx',
  'src/components/mobile/screens/MobileFeedbackScreen.tsx',
  'src/components/mobile/screens/MobileDigitalScreensScreen.tsx',
  'src/components/mobile/screens/MobileBasicSettingsScreen.tsx',
  'src/lib/validation/optionalContactEmail.ts',
  'src/components/mobile/sheets/ColorPickerSheet.tsx',
  'src/components/mobile/sheets/MobileOfficialPagePreviewSheet.tsx',
  'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx',
  'src/lib/obp/ownerSocialMediaBoundary.ts',
  'src/app/client/obp/OBPResolvedSurface.tsx',
  'src/app/client/obp/OBPExternalLinks.tsx',
  'src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx',
  'src/lib/schema/index.ts',
  'src/components/mobile/components/PresenceMonitor.tsx',
  'src/components/mobile/screens/MobileBusinessAttributesScreen.tsx',
  'src/components/mobile/screens/MobileCustomerAppScreen.tsx',
  'src/components/mobile/screens/MobileLocaleSettingsScreen.tsx',
  'src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx',
  'src/components/mobile/screens/MobileTimeSlotsScreen.tsx',
  'src/components/mobile/screens/MobilePosSyncScreen.tsx',
  'src/components/mobile/sheets/AppSettingsSheet.tsx',
  'src/components/mobile/screens/MobileDesignEditorScreen.tsx',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  'src/components/mobile/sheets/CategoryManagerSheet.tsx',
  'src/components/mobile/sheets/MobileCategoryEditSheet.tsx',
  'src/components/mobile/sheets/AIDefaultsSheet.tsx',
  'src/components/mobile/sheets/GenerateDescriptionsSheet.tsx',
  'src/components/mobile/sheets/TextCaseSheet.tsx',
  'src/components/atoms/IconPicker/index.tsx',
  'src/components/atoms/IconPicker/LucideIconGrid.tsx',
  'src/components/atoms/IconPicker/EmojiGrid.tsx',
  'src/components/atoms/phoneNumberInput/index.tsx',
  'src/components/shared/ProjectSelector.tsx',
  'src/components/atoms/OutletContextBanner/index.tsx',
  'src/components/molecules/StoreSwitcher/index.tsx',
  'src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx',
  'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader.tsx',
  'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthProjectScopeSelector.tsx',
  'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx',
  'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx',
  'src/components/templates/main-app/feedback/FeedbackQrDownload.tsx',
  'src/components/organisms/headerComponent/profileActionsModal/index.tsx',
  'src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx',
  'src/components/templates/main-app/businessSettings/index.tsx',
  'src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/LocationInfoTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/ContactPersonTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/AnalyticsTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx',
  'src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx',
  'src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/SocialMediaTab.tsx',
  'src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx',
  'src/components/templates/main-app/projects/index.tsx',
  'src/components/templates/main-app/projects/FileList.tsx',
  'src/components/templates/main-app/ShareLinkCard.tsx',
  'src/components/templates/main-app/projects/ProjectsSubHeader.tsx',
  'src/components/templates/main-app/projects/ProcessGuideModal.tsx',
  'src/components/templates/main-app/projects/editorView/Editor.tsx',
  'src/components/templates/main-app/projects/editorView/EditorContent.tsx',
  'src/components/templates/main-app/projects/editorView/EditorQualityBanner.tsx',
  'src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx',
  'src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx',
  'src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx',
  'src/components/templates/main-app/projects/editorView/ReorderSortableItem.tsx',
  'src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx',
  'src/components/templates/main-app/projects/editorView/editCategoryModal.tsx',
  'src/components/templates/main-app/projects/b2cView/previewModal.tsx',
  'src/components/templates/main-app/projects/b2cView/sidebar/index.tsx',
  'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
  'src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx',
  'src/components/templates/main-app/projects/editorView/EditorFiltersPopover.tsx',
  'src/components/templates/main-app/projects/editorView/KeyboardShortcutsHelp.tsx',
  'src/components/templates/main-app/projects/LanguageSelector.tsx',
  'src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx',
  'src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx',
  'src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/ActionEngine.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/ActiveInactiveAction.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/MoveCategoryAction.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction.tsx',
  'src/components/templates/main-app/projects/editorView/editItemModal.tsx',
  'src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx',
  'src/components/templates/main-app/projects/editorView/utils/editorOperations.ts',
  'src/components/templates/main-app/reseller/ResellerDashboard.tsx',
  'src/components/templates/main-app/reseller/OnboardingWizard.tsx',
  'src/components/templates/main-app/transactions/index.tsx',
  'src/components/templates/main-app/menuListHelpCenter/index.tsx',
  'src/components/templates/main-app/useMenuList/index.tsx',
  'src/components/templates/main-app/billing/index.tsx',
  'src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx',
  'src/components/templates/main-app/today/index.tsx',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  'src/app/(main)/layout.tsx',
  'src/app/(main)/locations/page.tsx',
  'src/components/organisms/OutletRenameModal/index.tsx',
  'src/lib/accessibility/antConfirmDialog.tsx',
  'src/lib/projects/projectSelection.ts',
  'src/lib/projects/editorProjectComparison.ts',
  'src/lib/media/itemPhotoCaptureAssist.ts',
  'src/hooks/useSpecialMenus.ts',
  'src/database/projects/index.ts',
  'src/app/api/projects/delete/route.ts',
  'src/lib/firestore/summaryProjectsWriter.ts',
  'src/lib/firestore/parseSummaryProjects.ts',
  'src/lib/staffManagement/client.ts',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/SubjectProfileSelector.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx',
  'src/components/shared/media/ItemPhotoCaptureAssist.tsx',
  'src/components/shared/media/MediaAspectRatioSelector.tsx',
  'src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx',
  'src/app/client/obp/OBPResolvedSurface.tsx',
  'src/app/client/obp/OBPActions.tsx',
  'src/lib/phone/phoneNumber.ts',
  'src/lib/obp/publicLinks.ts',
  'src/lib/obp/generateOBPUrl.ts',
  'src/components/customer/PublicMenuListAttribution.tsx',
  'src/constants/urls.ts',
  'src/app/screen/[token]/MenuBoardDisplay.tsx',
  'src/app/screen/[token]/ScreenDisplay.tsx',
  'src/app/screen/[token]/ScreenAttribution.tsx',
  'src/app/screen/[token]/page.tsx',
  'src/app/api/digital-screens/route.ts',
  'src/hooks/useDigitalScreenSeenSignal.ts',
]) {
  localMobileOwnerManifest.update(relativePath);
  localMobileOwnerManifest.update('\0');
  localMobileOwnerManifest.update(fs.readFileSync(path.join(root, relativePath)));
  localMobileOwnerManifest.update('\0');
}
const localMobileOwnerEvidenceIsCurrent = (
  localMobileOwnerEvidence?.sourceManifestSha256 === localMobileOwnerManifest.digest('hex')
);
if (localMobileOwnerEvidenceIsCurrent) {
  verifySupplementalControlEvidenceSet(runtimeEvidence.localMobileOwnerControlInteractions, 'local mobile/desktop owner', 55);
}
const currentLocalOwnerEvidence = runtimeEvidence.currentLocalOwnerControlInteractions;
const currentLocalOwnerManifest = createHash('sha256');
for (const relativePath of [
  'scripts/verification/test-menulist-host-routing.ts',
  'src/components/atoms/OutletContextBanner/index.tsx',
  'src/components/molecules/StoreSwitcher/index.tsx',
  'src/components/organisms/appLayoutSwitcher/index.tsx',
  'src/components/organisms/appSettings/AdvancedSettings.tsx',
  'src/components/organisms/appSettings/EnhancedColorPicker.tsx',
  'src/components/organisms/appSettings/index.tsx',
  'src/components/organisms/dateFormatSwitcher/index.tsx',
  'src/components/organisms/timeFormatSwitcher/index.tsx',
  'src/components/mobile/components/MobileCompliancePagesEditor.tsx',
  'src/components/mobile/components/MenuQualitySignals.tsx',
  'src/components/mobile/components/MobileMenuCommandSheet.tsx',
  'src/components/mobile/components/MobileSettingsScreenHeader.tsx',
  'src/components/mobile/screens/MobileDigitalScreensScreen.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/components/mobile/screens/MobileOfficialPageScreen.tsx',
  'src/lib/media/obpMediaCleanupJournal.ts',
  'src/components/mobile/screens/MobileSpecialMenuScreen.tsx',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx',
  'src/components/mobile/sheets/CategoryManagerSheet.tsx',
  'src/components/mobile/sheets/MobileCategoryEditSheet.tsx',
  'src/components/mobile/sheets/AIDefaultsSheet.tsx',
  'src/components/shared/media/MediaAspectRatioSelector.tsx',
  'src/components/templates/main-app/projects/ProjectsSubHeader.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/AspectRatioSelector.tsx',
  'src/components/templates/main-app/projects/b2cView/previewModal.tsx',
  'src/components/templates/main-app/projects/b2cView/index.tsx',
  'src/components/templates/main-app/projects/b2cView/sidebar/index.tsx',
  'src/components/templates/main-app/projects/b2cView/projectPublishState.ts',
  'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
  'src/lib/obp/ownerPublicPresenceBoundary.ts',
  'src/constants/urls.ts',
]) {
  currentLocalOwnerManifest.update(relativePath);
  currentLocalOwnerManifest.update('\0');
  currentLocalOwnerManifest.update(fs.readFileSync(path.join(root, relativePath)));
  currentLocalOwnerManifest.update('\0');
}
if (currentLocalOwnerEvidence?.sourceManifestSha256 !== currentLocalOwnerManifest.digest('hex')) {
  fail('current local owner control evidence is stale');
}
verifyControlEvidenceSet(currentLocalOwnerEvidence, 'current local owner', 6, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const unauthorizedRecoveryEvidence = runtimeEvidence.unauthorizedRecoveryControlInteractions;
const unauthorizedRecoverySourceManifest = createHash('sha256');
const unauthorizedRecoverySource = 'src/app/(global-pages)/unauthorized/page.tsx';
unauthorizedRecoverySourceManifest.update(unauthorizedRecoverySource);
unauthorizedRecoverySourceManifest.update('\0');
unauthorizedRecoverySourceManifest.update(fs.readFileSync(path.join(root, unauthorizedRecoverySource)));
unauthorizedRecoverySourceManifest.update('\0');
if (unauthorizedRecoveryEvidence?.sourceManifestSha256 !== unauthorizedRecoverySourceManifest.digest('hex')) {
  fail('unauthorized recovery local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.unauthorizedRecoveryControlInteractions, 'unauthorized recovery local', 2, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const notFoundRecoveryEvidence = runtimeEvidence.notFoundRecoveryControlInteractions;
const notFoundRecoverySourceManifest = createHash('sha256');
const notFoundRecoverySource = 'src/app/(global-pages)/404/page.tsx';
notFoundRecoverySourceManifest.update(notFoundRecoverySource);
notFoundRecoverySourceManifest.update('\0');
notFoundRecoverySourceManifest.update(fs.readFileSync(path.join(root, notFoundRecoverySource)));
notFoundRecoverySourceManifest.update('\0');
if (notFoundRecoveryEvidence?.sourceManifestSha256 !== notFoundRecoverySourceManifest.digest('hex')) {
  fail('not-found recovery local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.notFoundRecoveryControlInteractions, 'not-found recovery local', 2, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const msgPreviewRecoveryEvidence = runtimeEvidence.msgPreviewRecoveryControlInteractions;
const msgPreviewRecoverySourceManifest = createHash('sha256');
const msgPreviewRecoverySource = 'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx';
msgPreviewRecoverySourceManifest.update(msgPreviewRecoverySource);
msgPreviewRecoverySourceManifest.update('\0');
msgPreviewRecoverySourceManifest.update(fs.readFileSync(path.join(root, msgPreviewRecoverySource)));
msgPreviewRecoverySourceManifest.update('\0');
if (msgPreviewRecoveryEvidence?.sourceManifestSha256 !== msgPreviewRecoverySourceManifest.digest('hex')) {
  fail('message-preview recovery local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.msgPreviewRecoveryControlInteractions, 'message-preview recovery local', 1, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const authEntryEvidence = runtimeEvidence.authEntryControlInteractions;
const authEntrySourceManifest = createHash('sha256');
for (const relativePath of [
  'src/components/templates/loginPage/index.tsx',
  'src/components/templates/forgotPassword/index.tsx',
]) {
  authEntrySourceManifest.update(relativePath);
  authEntrySourceManifest.update('\0');
  authEntrySourceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  authEntrySourceManifest.update('\0');
}
if (authEntryEvidence?.sourceManifestSha256 !== authEntrySourceManifest.digest('hex')) {
  fail('auth-entry local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.authEntryControlInteractions, 'auth-entry local', 16, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const pricingEvidence = runtimeEvidence.pricingControlInteractions;
const pricingSourceManifest = createHash('sha256');
for (const relativePath of [
  'src/components/website/pricing-pages/index.tsx',
  'src/components/website/pricing-pages/CurrencySwitcher.tsx',
  'src/components/website/pricing-pages/OnboardingModal.tsx',
  'src/components/website/pricing-pages/PlanCard.tsx',
  'src/components/website/pricing-pages/PricingFaq.tsx',
  'src/components/website/pricing-pages/SubscriptionManagement.tsx',
]) {
  pricingSourceManifest.update(relativePath);
  pricingSourceManifest.update('\0');
  pricingSourceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  pricingSourceManifest.update('\0');
}
if (pricingEvidence?.sourceManifestSha256 !== pricingSourceManifest.digest('hex')) {
  fail('pricing local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.pricingControlInteractions, 'pricing local', 14, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
const verifySingleSourceControlEvidence = (
  evidenceSet,
  label,
  relativePath,
  minimumRows,
  expected = {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
) => {
  const manifest = createHash('sha256');
  manifest.update(relativePath);
  manifest.update('\0');
  manifest.update(fs.readFileSync(path.join(root, relativePath)));
  manifest.update('\0');
  if (evidenceSet?.sourceManifestSha256 !== manifest.digest('hex')) {
    fail(`${label} local control evidence is stale`);
  }
  verifyControlEvidenceSet(evidenceSet, `${label} local`, minimumRows, expected);
};
const verifyMultiSourceControlEvidence = (
  evidenceSet,
  label,
  relativePaths,
  minimumRows,
  expected,
) => {
  const manifest = createHash('sha256');
  for (const relativePath of relativePaths) {
    manifest.update(relativePath);
    manifest.update('\0');
    manifest.update(fs.readFileSync(path.join(root, relativePath)));
    manifest.update('\0');
  }
  if (evidenceSet?.sourceManifestSha256 !== manifest.digest('hex')) {
    fail(`${label} local control evidence is stale`);
  }
  verifyControlEvidenceSet(evidenceSet, `${label} local`, minimumRows, expected);
};
const exactEvidenceActions = (evidenceSet) => (evidenceSet?.interactions ?? [])
  .flatMap((interaction) => interaction.controlActions ?? [])
  .sort();
const verifyExactEvidenceActions = (evidenceSet, label, expectedActions) => {
  if (JSON.stringify(exactEvidenceActions(evidenceSet)) !== JSON.stringify([...expectedActions].sort())) {
    fail(`${label} control evidence does not match the exact governed action set`);
  }
};
verifySingleSourceControlEvidence(
  runtimeEvidence.platformNotificationMonitorControlInteractions,
  'platform notification monitor',
  'src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx',
  19,
);
verifyExactEvidenceActions(
  runtimeEvidence.platformNotificationMonitorControlInteractions,
  'platform notification monitor',
  [
    'button@446',
    'button@453',
    'button@466',
    'button@474',
    'dialog-action-surface@580',
    'button@588',
    'button@596',
    'button@597',
    'dialog-action-surface@649',
    'button@656',
    'button@657',
    'button@667',
    'selection@697',
    'input@711',
    'input@718',
    'input@725',
    'selection@781',
    'selection@784',
    'selection@787',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformNotificationMonitorNativeBoundaryControls,
  'platform notification monitor native boundary',
  'src/components/templates/main-app/platform/platformNotificationMonitor/index.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_OR_EXTERNAL_CLIENT_BOUNDARY_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.platformNotificationMonitorNativeBoundaryControls,
  'platform notification monitor native boundary',
  ['button@664'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.ownerNotificationMonitorControlInteractions,
  'owner notification monitor',
  'src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx',
  15,
);
verifyExactEvidenceActions(
  runtimeEvidence.ownerNotificationMonitorControlInteractions,
  'owner notification monitor',
  [
    'button@436',
    'button@456',
    'button@466',
    'button@565',
    'dialog-action-surface@628',
    'button@643',
    'button@649',
    'dialog-action-surface@730',
    'button@737',
    'button@738',
    'button@747',
    'selection@784',
    'input@798',
    'input@808',
    'input@818',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.ownerNotificationMonitorSafetyBlockedControls,
  'owner notification monitor safe-execution blocker',
  'src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx',
  2,
  {
    testResult: 'BLOCKED_SAFE_EXECUTION',
    finalStatus: 'BLOCKED_EXTERNAL_NOTIFICATION_PROVIDER_SIDE_EFFECT_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.ownerNotificationMonitorSafetyBlockedControls,
  'owner notification monitor safe-execution blocker',
  ['button@445', 'button@636'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.ownerNotificationMonitorNativeBoundaryControls,
  'owner notification monitor native boundary',
  'src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_OR_EXTERNAL_CLIENT_BOUNDARY_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.ownerNotificationMonitorNativeBoundaryControls,
  'owner notification monitor native boundary',
  ['button@744'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.opsControlRoomContinuationInteractions,
  'Ops Control Room continuation',
  'src/components/templates/main-app/platform/opsControlRoom/index.tsx',
  8,
);
verifyExactEvidenceActions(
  runtimeEvidence.opsControlRoomContinuationInteractions,
  'Ops Control Room continuation',
  ['button@290', 'button@292', 'button@293', 'button@294', 'button@295', 'button@399', 'button@408', 'button@417'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.opsControlRoomSafetyBlockedControls,
  'Ops Control Room safe-execution blocker',
  'src/components/templates/main-app/platform/opsControlRoom/index.tsx',
  1,
  {
    testResult: 'BLOCKED_SAFE_EXECUTION',
    finalStatus: 'BLOCKED_FORCE_REPUBLISH_FUNCTION_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.opsControlRoomSafetyBlockedControls,
  'Ops Control Room safe-execution blocker',
  ['button@440'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.resellerDesktopOnboardingContinuationInteractions,
  'desktop reseller onboarding continuation',
  'src/components/templates/main-app/reseller/OnboardingWizard.tsx',
  3,
);
verifyExactEvidenceActions(
  runtimeEvidence.resellerDesktopOnboardingContinuationInteractions,
  'desktop reseller onboarding continuation',
  ['selection@291', 'input@344', 'input@352'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileResellerOnboardingContinuationInteractions,
  'mobile reseller onboarding continuation',
  'src/components/mobile/screens/MobileResellerOnboardingScreen.tsx',
  3,
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileResellerOnboardingContinuationInteractions,
  'mobile reseller onboarding continuation',
  ['selection@510', 'input@530', 'input@534'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileResellerManagementContinuationInteractions,
  'mobile reseller management continuation',
  'src/components/mobile/screens/MobileResellerManagementScreen.tsx',
  18,
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileResellerManagementContinuationInteractions,
  'mobile reseller management continuation',
  [
    'input@351', 'input@352', 'input@353', 'input@354', 'input@355',
    'input@361', 'input@362', 'input@363', 'input@364', 'input@365',
    'input@371', 'selection@374', 'input@376', 'button@381', 'button@382',
    'button@395', 'button@412', 'button@497',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileResellerDashboardContinuationInteractions,
  'mobile reseller dashboard continuation',
  'src/components/mobile/screens/MobileResellerDashboardScreen.tsx',
  4,
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileResellerDashboardContinuationInteractions,
  'mobile reseller dashboard continuation',
  ['button@540', 'button@554', 'button@559', 'button@624'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopResellerManagementContinuationInteractions,
  'desktop reseller management continuation',
  'src/components/templates/main-app/reseller/ResellerManagement.tsx',
  1,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopResellerManagementContinuationInteractions,
  'desktop reseller management continuation',
  ['button@369'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopResellerOfflineFeatureDisabledControls,
  'desktop reseller offline feature-disabled controls',
  'src/components/templates/main-app/reseller/ResellerDashboard.tsx',
  6,
  {
    testResult: 'PASS_FEATURE_DISABLED_BOUNDARY',
    finalStatus: 'FEATURE_DISABLED_OFFLINE_RESELLER_ACTION_NOT_RENDERED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopResellerOfflineFeatureDisabledControls,
  'desktop reseller offline feature-disabled controls',
  ['button@477', 'button@485', 'dialog-action-surface@633', 'input@647', 'dialog-action-surface@666', 'selection@678'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileResellerOfflineFeatureDisabledControls,
  'mobile reseller offline feature-disabled controls',
  'src/components/mobile/screens/MobileResellerDashboardScreen.tsx',
  10,
  {
    testResult: 'PASS_FEATURE_DISABLED_BOUNDARY',
    finalStatus: 'FEATURE_DISABLED_OFFLINE_RESELLER_ACTION_NOT_RENDERED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileResellerOfflineFeatureDisabledControls,
  'mobile reseller offline feature-disabled controls',
  [
    'button@273', 'button@278', 'dialog-action-surface@657', 'input@673',
    'button@688', 'button@689', 'dialog-action-surface@703', 'selection@716',
    'button@735', 'button@736',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformAssetTemplateLifecycleInteractions,
  'platform asset-template lifecycle',
  'src/components/templates/platform/assetTemplates/index.tsx',
  11,
);
verifyExactEvidenceActions(
  runtimeEvidence.platformAssetTemplateLifecycleInteractions,
  'platform asset-template lifecycle',
  [
    'form@482', 'form@539', 'input@541', 'selection@555', 'button@563',
    'button@573', 'button@581', 'action-handler@625', 'button@652', 'button@661',
    'button@684',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.reportLeadMonitorContinuationInteractions,
  'report lead monitor continuation',
  'src/components/templates/main-app/platform/reportLeadMonitor/index.tsx',
  5,
);
verifyExactEvidenceActions(
  runtimeEvidence.reportLeadMonitorContinuationInteractions,
  'report lead monitor continuation',
  ['button@282', 'button@283', 'button@320', 'dialog-action-surface@394', 'button@437'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.reportLeadMonitorNativeBoundaryControls,
  'report lead monitor native boundary',
  'src/components/templates/main-app/platform/reportLeadMonitor/index.tsx',
  2,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_OR_EXTERNAL_CLIENT_BOUNDARY_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.reportLeadMonitorNativeBoundaryControls,
  'report lead monitor native boundary',
  ['button@284', 'button@438'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.websiteEnquiryMonitorContinuationInteractions,
  'website enquiry monitor continuation',
  'src/components/templates/main-app/platform/websiteEnquiryMonitor/index.tsx',
  3,
);
verifyExactEvidenceActions(
  runtimeEvidence.websiteEnquiryMonitorContinuationInteractions,
  'website enquiry monitor continuation',
  ['button@186', 'button@226', 'dialog-action-surface@291'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.websiteEnquiryMonitorNativeBoundaryControls,
  'website enquiry monitor native boundary',
  'src/components/templates/main-app/platform/websiteEnquiryMonitor/index.tsx',
  2,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_OR_EXTERNAL_CLIENT_BOUNDARY_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.websiteEnquiryMonitorNativeBoundaryControls,
  'website enquiry monitor native boundary',
  ['button@187', 'button@317'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformUserContinuationInteractions,
  'platform user continuation',
  'src/components/templates/platform/users/index.tsx',
  7,
);
verifyExactEvidenceActions(
  runtimeEvidence.platformUserContinuationInteractions,
  'platform user continuation',
  [
    'button@392', 'button@393', 'selection@437', 'selection@461',
    'button@493', 'button@510', 'selection@515',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.bulkActionsControlInteractions,
  'bulk actions',
  'src/components/mobile/sheets/BulkActionsSheet.tsx',
  23,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileMoreControlInteractions,
  'Mobile More',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  81,
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.mobileMoreFeatureDisabledControls,
  'Mobile More feature-disabled',
  [
    'src/components/mobile/screens/MobileMoreScreen.tsx',
    'src/config/features.ts',
  ],
  2,
  {
    testResult: 'PASS_FEATURE_DISABLED_BOUNDARY',
    finalStatus: 'CURRENT_FEATURE_DISABLED_NOT_USER_TRIGGERABLE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMoreFeatureDisabledControls,
  'Mobile More feature-disabled',
  ['menu-action@606', 'menu-action@654'],
);
const featureRegistrySource = fs.readFileSync(path.join(root, 'src/config/features.ts'), 'utf8');
if (
  !/ENABLE_PAST_ACTIVITY_HISTORY:\s*false/.test(featureRegistrySource)
  || !/ENABLE_GBP_SYNC:\s*false/.test(featureRegistrySource)
) fail('Mobile More feature-disabled evidence requires both governed feature flags to remain false');
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileMoreSafetyBlockedControls,
  'Mobile More safe-execution blocker',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  1,
  {
    testResult: 'BLOCKED_SAFE_EXECUTION',
    finalStatus: 'BLOCKED_EXTERNAL_MONITORING_SIDE_EFFECT_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMoreSafetyBlockedControls,
  'Mobile More safe-execution blocker',
  ['menu-action@685'],
);
const mobileMenuRuntimeSources = [
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  'src/components/mobile/sheets/CategoryManagerSheet.tsx',
  'src/components/mobile/sheets/MobileCategoryEditSheet.tsx',
];
verifyMultiSourceControlEvidence(
  runtimeEvidence.mobileMenuControlInteractions,
  'Mobile Menu',
  mobileMenuRuntimeSources,
  78,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_REVALIDATED_ON_CURRENT_HANDLERS_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMenuControlInteractions,
  'Mobile Menu',
  [
    'button@2447', 'button@2396', 'action-handler@3298', 'input@3377', 'button@3384',
    'button@3408', 'button@3424', 'button@3437', 'button@3466', 'button@3482',
    'button@3500', 'button@3514', 'button@3527',
    'button@3627', 'button@3652', 'button@3710', 'button@3715',
    'button@3733', 'disclosure@3803', 'disclosure@3813',
    'button@3875', 'button@3906', 'action-handler@3927', 'selection@3895', 'selection@3931', 'button@3933',
    'button@4017', 'button@4043', 'action-handler@4045', 'dialog-action-surface@4158',
    'button@4182', 'dialog-action-surface@4258', 'button@4280', 'button@4298', 'button@4468',
    'button@4480', 'input@482', 'input@490', 'input@498', 'input@506',
    'input@514', 'selection@533', 'input@850', 'button@878', 'button@893',
    'input@904', 'input@921', 'selection@934', 'dialog-action-surface@960',
    'selection@984', 'button@1040', 'input@1089', 'selection@1107',
    'selection@1117', 'disclosure@1149', 'disclosure@1150', 'selection@1174',
    'input@1191', 'button@1217', 'button@1227', 'button@1234',
    'disclosure@1249', 'disclosure@1250', 'disclosure@1294',
    'disclosure@1295', 'button@1333', 'button@1364', 'button@1386',
    'button@1389', 'dialog-action-surface@503', 'button@804',
    'action-handler@830', 'dialog-action-surface@251', 'button@308',
    'input@351', 'selection@372', 'button@448', 'button@460',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiImageGeneratorControlInteractions,
  'desktop AI image generator',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx',
  8,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiImageGeneratorControlInteractions,
  'desktop AI image generator',
  [
    'button@276', 'button@409', 'button@436', 'dialog-action-surface@458',
    'button@849', 'disclosure@912', 'selection@1018', 'input@1170',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiImageGeneratorProviderBlockedControls,
  'desktop AI image generator provider boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx',
  4,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_PROVIDER_RESULT_CONTROLS_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiImageGeneratorProviderBlockedControls,
  'desktop AI image generator provider boundary',
  ['selection@560', 'dialog-action-surface@572', 'button@579', 'button@588'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiImageGeneratorNativeBoundaryControls,
  'desktop AI image generator native boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx',
  5,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_REFERENCE_UPLOAD_AND_COLOR_CHOOSERS_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiImageGeneratorNativeBoundaryControls,
  'desktop AI image generator native boundary',
  ['action-handler@703', 'input@1065', 'button@1082', 'input@1129', 'button@1145'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopPosSyncContinuationInteractions,
  'desktop POS sync continuation',
  'src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx',
  11,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopPosSyncContinuationInteractions,
  'desktop POS sync continuation',
  [
    'selection@1032', 'input@1038', 'button@1046', 'button@1080', 'input@1090',
    'button@1097', 'button@1160', 'input@1192', 'button@1198',
    'dialog-action-surface@1230', 'input@1253',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopPosSyncProviderBlockedControls,
  'desktop POS sync provider boundary',
  'src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx',
  1,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_EXTERNAL_POS_PROVIDER_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopPosSyncProviderBlockedControls,
  'desktop POS sync provider boundary',
  ['button@1118'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopPosSyncNativeBoundaryControls,
  'desktop POS sync native boundary',
  'src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx',
  3,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_CLIPBOARD_AND_DOWNLOAD_ARTIFACT_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopPosSyncNativeBoundaryControls,
  'desktop POS sync native boundary',
  ['button@1071', 'button@1210', 'button@1217'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileSharedControlContinuationInteractions,
  'mobile shared controls continuation',
  'src/components/mobile/antd.tsx',
  11,
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileSharedControlContinuationInteractions,
  'mobile shared controls continuation',
  [
    'action-handler@296', 'action-handler@329', 'action-handler@364',
    'action-handler@422', 'dialog-action-surface@558', 'action-handler@1021',
    'button@1090', 'dialog-action-surface@1167', 'button@1191', 'button@1202',
    'input@1218', 'action-handler@1232',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileSharedNativeBoundaryControls,
  'mobile shared native boundary',
  'src/components/mobile/antd.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_TIME_PICKER_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileSharedNativeBoundaryControls,
  'mobile shared native boundary',
  ['action-handler@1349'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopProjectShareContinuationInteractions,
  'desktop project share continuation',
  'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
  8,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopProjectShareContinuationInteractions,
  'desktop project share continuation',
  [
    'dialog-action-surface@381', 'button@462', 'selection@484', 'button@485',
    'selection@494', 'button@495', 'selection@503', 'button@613',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopProjectShareExternalHandoffControls,
  'desktop project share external handoff',
  'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
  3,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_EXTERNAL_SOCIAL_HANDOFF_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopProjectShareExternalHandoffControls,
  'desktop project share external handoff',
  ['button@514', 'button@525', 'button@534'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopProjectShareNativeBoundaryControls,
  'desktop project share native boundary',
  'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
  3,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_DOWNLOAD_ARTIFACT_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopProjectShareNativeBoundaryControls,
  'desktop project share native boundary',
  ['button@471', 'button@560', 'button@568'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopMenuCardExportContinuationInteractions,
  'desktop menu-card export continuation',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  7,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopMenuCardExportContinuationInteractions,
  'desktop menu-card export continuation',
  ['button@159', 'selection@180', 'selection@194', 'selection@258', 'selection@262', 'selection@266', 'selection@270'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopMenuCardExportProviderBlockedControls,
  'desktop menu-card export provider boundary',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_LAYOUT_ENHANCEMENT_PROVIDER_AND_CREDIT_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopMenuCardExportProviderBlockedControls,
  'desktop menu-card export provider boundary',
  ['button@216', 'button@241'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopMenuCardExportNativeBoundaryControls,
  'desktop menu-card export native boundary',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  2,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_PDF_DOWNLOAD_AND_SHARE_ARTIFACT_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopMenuCardExportNativeBoundaryControls,
  'desktop menu-card export native boundary',
  ['button@331', 'button@340'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopMenuCardExportFixtureBlockedControls,
  'desktop menu-card export fixture boundary',
  'src/components/templates/main-app/menu-card-export/MenuCardExportRoute.tsx',
  2,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_MULTI_PROJECT_SELECTOR_NOT_REACHABLE_IN_SINGLE_PROJECT_FIXTURE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopMenuCardExportFixtureBlockedControls,
  'desktop menu-card export fixture boundary',
  ['action-handler@150', 'dialog-action-surface@377'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopActiveSubscriptionLifecycleInteractions,
  'desktop active-subscription lifecycle',
  'src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx',
  11,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopActiveSubscriptionLifecycleInteractions,
  'desktop active-subscription lifecycle',
  ['button@260', 'button@282', 'button@293', 'button@294', 'button@296', 'button@307', 'button@311', 'button@317', 'button@322', 'button@328', 'button@617'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopActiveSubscriptionProviderBlockedControls,
  'desktop active-subscription provider boundary',
  'src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_LIVE_RAZORPAY_CONTINUE_AND_RETRY_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopActiveSubscriptionProviderBlockedControls,
  'desktop active-subscription provider boundary',
  ['button@270', 'button@324'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopActiveSubscriptionFeatureDisabledControls,
  'desktop active-subscription feature-disabled boundary',
  'src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx',
  2,
  {
    testResult: 'PASS_FEATURE_DISABLED_BOUNDARY',
    finalStatus: 'FEATURE_DISABLED_SUBSCRIPTION_PAUSE_ACTIONS_NOT_RENDERED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopActiveSubscriptionFeatureDisabledControls,
  'desktop active-subscription feature-disabled boundary',
  ['button@295', 'button@305'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopTraditionalEditorContinuationInteractions,
  'desktop traditional editor continuation',
  'src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx',
  12,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopTraditionalEditorContinuationInteractions,
  'desktop traditional editor continuation',
  ['action-handler@614', 'selection@623', 'button@632', 'action-handler@679', 'button@778', 'button@795', 'action-handler@884', 'selection@893', 'button@902', 'action-handler@944', 'button@1122', 'button@1142'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopTraditionalEditorFixtureBlockedControls,
  'desktop traditional editor fixture boundary',
  'src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx',
  2,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_MULTI_LANGUAGE_AND_EXISTING_IMAGE_CONTROLS_NOT_REACHABLE_IN_BASE_FIXTURE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopTraditionalEditorFixtureBlockedControls,
  'desktop traditional editor fixture boundary',
  ['action-handler@500', 'action-handler@1001'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopCategoryEditorContinuationInteractions,
  'desktop category editor continuation',
  'src/components/templates/main-app/projects/editorView/editCategoryModal.tsx',
  12,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopCategoryEditorContinuationInteractions,
  'desktop category editor continuation',
  ['input@406', 'dialog-action-surface@415', 'button@422', 'button@432', 'action-handler@452', 'action-handler@500', 'selection@501', 'action-handler@562', 'selection@565', 'disclosure@602', 'button@615', 'button@626'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopCategoryEditorProviderBlockedControls,
  'desktop category editor provider boundary',
  'src/components/templates/main-app/projects/editorView/editCategoryModal.tsx',
  1,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_CATEGORY_TRANSLATION_PROVIDER_AND_CREDIT_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopCategoryEditorProviderBlockedControls,
  'desktop category editor provider boundary',
  ['action-handler@427'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopCategoryEditorFixtureBlockedControls,
  'desktop category editor fixture boundary',
  'src/components/templates/main-app/projects/editorView/editCategoryModal.tsx',
  1,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_EXISTING_TIME_SLOT_PRESET_NOT_PRESENT_IN_BASE_FIXTURE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopCategoryEditorFixtureBlockedControls,
  'desktop category editor fixture boundary',
  ['action-handler@593'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiMenuManagerContinuationInteractions,
  'desktop AI Menu Manager continuation',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  5,
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiMenuManagerContinuationInteractions,
  'desktop AI Menu Manager continuation',
  ['button@1180', 'button@1335', 'button@1347', 'button@1370', 'button@1500'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiMenuManagerProviderBlockedControls,
  'desktop AI Menu Manager provider boundary',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_MENU_MANAGER_PROVIDER_REQUEST_AND_RESULT_APPROVAL_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiMenuManagerProviderBlockedControls,
  'desktop AI Menu Manager provider boundary',
  ['button@1281', 'button@1767'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiMenuManagerFixtureBlockedControls,
  'desktop AI Menu Manager fixture boundary',
  'src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx',
  6,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_MULTI_PROJECT_ERROR_EMPTY_AND_LARGE_CONTEXT_STATES_NOT_REACHABLE_IN_BASE_FIXTURE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiMenuManagerFixtureBlockedControls,
  'desktop AI Menu Manager fixture boundary',
  ['action-handler@1088', 'button@1107', 'button@1121', 'button@1135', 'input@1575', 'dialog-action-surface@1872'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopPastActivityFeatureDisabledControls,
  'desktop Past Activity feature-disabled boundary',
  'src/components/templates/main-app/today/PastActivity/index.tsx',
  13,
  {
    testResult: 'PASS_FEATURE_DISABLED_BOUNDARY',
    finalStatus: 'CURRENT_FEATURE_DISABLED_NOT_USER_TRIGGERABLE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopPastActivityFeatureDisabledControls,
  'desktop Past Activity feature-disabled boundary',
  ['selection@164', 'button@182', 'button@190', 'dialog-action-surface@203', 'button@212', 'button@240', 'button@248', 'dialog-action-surface@265', 'button@274', 'button@301', 'button@309', 'dialog-action-surface@343', 'button@352'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopResellerOnboardingProviderResultControls,
  'desktop reseller onboarding provider-result boundary',
  'src/components/templates/main-app/reseller/OnboardingWizard.tsx',
  15,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_LIVE_RAZORPAY_ONBOARDING_RESULT_NOT_GENERATED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopResellerOnboardingProviderResultControls,
  'desktop reseller onboarding provider-result boundary',
  ['input@484', 'button@485', 'input@495', 'button@496', 'input@501', 'button@502', 'input@506', 'button@507', 'input@516', 'button@517', 'input@525', 'button@526', 'button@530', 'button@533', 'button@581'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileExtractionReviewFixtureBlockedControls,
  'mobile extraction review fixture boundary',
  'src/components/mobile/sheets/ExtractionReviewSheet.tsx',
  15,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_EXTRACTION_JOB_REVIEW_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileExtractionReviewFixtureBlockedControls,
  'mobile extraction review fixture boundary',
  ['selection@78', 'selection@111', 'dialog-action-surface@340', 'button@361', 'button@367', 'button@373', 'button@376', 'disclosure@397', 'disclosure@398', 'disclosure@413', 'disclosure@428', 'disclosure@443', 'disclosure@458', 'button@507', 'button@510'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiEditProviderResultControls,
  'desktop AI edit provider-result boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx',
  6,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_IMAGE_EDIT_PROVIDER_AND_GENERATED_RESULT_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiEditProviderResultControls,
  'desktop AI edit provider-result boundary',
  ['button@296', 'button@310', 'button@322', 'action-handler@356', 'action-handler@385', 'action-handler@438'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiEditNativeBoundaryControls,
  'desktop AI edit native boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_PROMPT_IMAGE_CHOOSER_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiEditNativeBoundaryControls,
  'desktop AI edit native boundary',
  ['button@518'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopAiEditFixtureBlockedControls,
  'desktop AI edit fixture boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx',
  7,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_EXISTING_ITEM_IMAGE_EDIT_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopAiEditFixtureBlockedControls,
  'desktop AI edit fixture boundary',
  ['action-handler@252', 'button@292', 'action-handler@420', 'action-handler@512', 'input@521', 'dialog-action-surface@536', 'dialog-action-surface@561'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mediaImageAdjustNativeBoundaryControls,
  'media image adjustment native boundary',
  'src/components/shared/media/MediaImageAdjustModal.tsx',
  13,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_UPSTREAM_NATIVE_IMAGE_SELECTION_AND_ADJUSTMENT_ARTIFACT_NOT_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mediaImageAdjustNativeBoundaryControls,
  'media image adjustment native boundary',
  ['input@374', 'button@391', 'button@394', 'button@397', 'button@400', 'dialog-action-surface@412', 'action-handler@420', 'action-handler@427', 'action-handler@430', 'dialog-action-surface@443', 'button@452', 'button@455', 'button@458'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.batchImageGenerationProviderResultControls,
  'batch image generation provider-result boundary',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx',
  13,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_BATCH_IMAGE_PROVIDER_RESULT_AND_JOB_MUTATIONS_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.batchImageGenerationProviderResultControls,
  'batch image generation provider-result boundary',
  ['selection@461', 'selection@476', 'button@499', 'button@502', 'button@503', 'button@509', 'button@510', 'dialog-action-surface@523', 'button@528', 'button@531', 'dialog-action-surface@565', 'button@570', 'button@571'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformSentrySafetyBlockedControls,
  'platform Sentry safety boundary',
  'src/components/pages/TestSentryPage/index.tsx',
  10,
  {
    testResult: 'BLOCKED_SAFETY_BOUNDARY',
    finalStatus: 'BLOCKED_INTENTIONAL_SENTRY_EVENT_AND_ERROR_INJECTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.platformSentrySafetyBlockedControls,
  'platform Sentry safety boundary',
  ['button@163', 'button@166', 'button@169', 'button@178', 'button@181', 'button@184', 'button@207', 'button@210', 'button@213', 'button@234'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformSentryExternalHandoffControls,
  'platform Sentry external handoff boundary',
  'src/components/pages/TestSentryPage/index.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_EXTERNAL_SENTRY_DASHBOARD_HANDOFF_NOT_OPENED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.platformSentryExternalHandoffControls,
  'platform Sentry external handoff boundary',
  ['link@274', 'link@284'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformFontPresetFixtureBlockedControls,
  'platform font preset fixture boundary',
  'src/components/templates/platform/fontPresets/index.tsx',
  12,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_PLATFORM_ADMIN_FONT_PRESET_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.platformFontPresetFixtureBlockedControls,
  'platform font preset fixture boundary',
  ['button@187', 'button@205', 'input@226', 'input@239', 'input@252', 'input@268', 'input@282', 'button@295', 'button@320', 'dialog-action-surface@321', 'button@325', 'button@327'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformFontPresetNativeBoundaryControls,
  'platform font preset native boundary',
  'src/components/templates/platform/fontPresets/index.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_FONT_FILE_CHOOSER_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.platformFontPresetNativeBoundaryControls,
  'platform font preset native boundary',
  ['upload@333'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileBillingAlternateLifecycleControls,
  'mobile billing alternate-lifecycle boundary',
  'src/components/mobile/screens/MobileBillingScreen.tsx',
  12,
  {
    testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE',
    finalStatus: 'BLOCKED_MOBILE_ALTERNATE_SUBSCRIPTION_PROVIDER_AND_HISTORY_STATES_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileBillingAlternateLifecycleControls,
  'mobile billing alternate-lifecycle boundary',
  ['button@828', 'button@841', 'button@883', 'button@903', 'button@910', 'button@917', 'button@926', 'button@939', 'action-handler@1120', 'action-handler@1177', 'button@1225', 'button@1239'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileMenuAlternateFixtureControls,
  'mobile Menu alternate fixture boundary',
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  12,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_MOBILE_BULK_UNDO_LOAD_ERROR_MULTILINGUAL_EMPTY_AND_EXTRACTION_JOB_STATES',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMenuAlternateFixtureControls,
  'mobile Menu alternate fixture boundary',
  ['button@1215', 'button@1239', 'button@3266', 'action-handler@3590', 'button@3780', 'button@3986', 'dialog-action-surface@4052', 'button@4065', 'dialog-action-surface@4071', 'button@4087', 'dialog-action-surface@4134', 'button@4148'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileMenuUploadNativeExtractionControls,
  'mobile menu-upload native/extraction boundary',
  'src/components/mobile/sheets/MenuUploadSheet.tsx',
  12,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_OR_EXTRACTION_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_MENU_FILE_SELECTION_AND_EXTRACTION_PROCESSING_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMenuUploadNativeExtractionControls,
  'mobile menu-upload native/extraction boundary',
  ['selection@112', 'dialog-action-surface@896', 'button@965', 'input@1016', 'selection@1028', 'button@1035', 'button@1083', 'button@1174', 'button@1177', 'button@1209', 'button@1221', 'button@1236'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopDomainSettingsExternalBoundaryControls,
  'desktop domain settings external boundary',
  'src/components/templates/main-app/businessSettings/tabs/DomainSettingsTab.tsx',
  12,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_CUSTOM_DOMAIN_DNS_PROVIDER_AND_VERIFIED_DOMAIN_FIXTURE_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopDomainSettingsExternalBoundaryControls,
  'desktop domain settings external boundary',
  ['input@836', 'button@858', 'button@868', 'button@902', 'button@908', 'button@911', 'button@942', 'button@961', 'input@977', 'button@993', 'button@1003', 'dialog-action-surface@1025'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileHoursAlternateStateControls,
  'mobile Hours alternate-state boundary',
  'src/components/mobile/screens/MobileHoursScreen.tsx',
  13,
  {
    testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE',
    finalStatus: 'BLOCKED_LIVE_PREVIEW_HISTORY_TEMP_STATUS_DOWNLOAD_NUDGE_AND_CAMPAIGN_STATES_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileHoursAlternateStateControls,
  'mobile Hours alternate-state boundary',
  ['action-handler@994', 'action-handler@1002', 'button@1038', 'button@1057', 'button@1157', 'button@1232', 'button@1251', 'button@1283', 'button@1313', 'button@1316', 'button@1340', 'button@1343', 'button@1384'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileFeedbackFixtureBlockedControls,
  'mobile Feedback fixture boundary',
  'src/components/mobile/screens/MobileFeedbackScreen.tsx',
  12,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_FEEDBACK_DATASET_PAGINATION_DETAIL_AND_NATIVE_SHARE_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileFeedbackFixtureBlockedControls,
  'mobile Feedback fixture boundary',
  ['action-handler@429', 'disclosure@452', 'disclosure@453', 'disclosure@454', 'disclosure@455', 'action-handler@496', 'button@526', 'action-handler@647', 'action-handler@648', 'action-handler@649', 'action-handler@650', 'button@663'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.phoneOtpProviderBoundaryControls,
  'phone OTP provider boundary',
  'src/components/auth/PhoneOtpAuthPanel.tsx',
  10,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_REAL_WHATSAPP_OTP_SEND_AND_VERIFY_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.phoneOtpProviderBoundaryControls,
  'phone OTP provider boundary',
  ['selection@380', 'input@412', 'button@426', 'button@440', 'input@451', 'button@467', 'button@477', 'button@480', 'form@503', 'form@515'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileDomainSettingsExternalBoundaryControls,
  'mobile domain settings external boundary',
  'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
  10,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_MOBILE_DOMAIN_DNS_PROVIDER_AND_VERIFIED_DOMAIN_FIXTURE_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileDomainSettingsExternalBoundaryControls,
  'mobile domain settings external boundary',
  ['button@818', 'button@825', 'button@855', 'button@858', 'button@861', 'button@864', 'input@897', 'button@914', 'button@921', 'button@954'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.growthOsEntitlementProviderBoundaryControls,
  'GrowthOS entitlement/provider boundary',
  'src/components/templates/main-app/growthos/index.tsx',
  11,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_GROWTHOS_ADDON_GENERATION_OUTPUT_AND_EXPORT_LIFECYCLE_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.growthOsEntitlementProviderBoundaryControls,
  'GrowthOS entitlement/provider boundary',
  ['button@437', 'button@450', 'selection@468', 'button@476', 'button@513', 'button@519', 'button@543', 'button@562', 'button@563', 'button@572', 'button@614'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.analyticsGuideExternalHandoffControls,
  'analytics guide external handoff boundary',
  'src/components/templates/main-app/businessSettings/tabs/AnalyticsGuideModal.tsx',
  11,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_EXTERNAL_GOOGLE_AND_META_HELP_HANDOFFS_NOT_OPENED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.analyticsGuideExternalHandoffControls,
  'analytics guide external handoff boundary',
  ['link@22', 'link@34', 'link@47', 'button@134', 'button@137', 'button@144', 'button@147', 'button@150', 'button@157', 'button@160', 'button@163'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.publicObpExternalHandoffControls,
  'public OBP external handoff boundary',
  'src/app/client/obp/OBPExternalLinks.tsx',
  9,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_PUBLIC_REVIEW_SOCIAL_WEBSITE_AND_CUSTOM_EXTERNAL_HANDOFFS_NOT_OPENED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.publicObpExternalHandoffControls,
  'public OBP external handoff boundary',
  ['link@139', 'link@158', 'link@175', 'link@192', 'link@209', 'link@226', 'link@243', 'link@260', 'link@277'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.publicObpPlaceholderFixtureControl,
  'public OBP placeholder fixture boundary',
  'src/app/client/obp/OBPExternalLinks.tsx',
  1,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_OBP_PLACEHOLDER_SOCIAL_CONFIGURATION_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.publicObpPlaceholderFixtureControl,
  'public OBP placeholder fixture boundary',
  ['button@291'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileResellerOnboardingProviderResultControls,
  'mobile reseller onboarding provider-result boundary',
  'src/components/mobile/screens/MobileResellerOnboardingScreen.tsx',
  11,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_MOBILE_LIVE_RAZORPAY_ONBOARDING_RESULT_NOT_GENERATED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileResellerOnboardingProviderResultControls,
  'mobile reseller onboarding provider-result boundary',
  ['button@408', 'button@409', 'button@423', 'button@432', 'button@440', 'button@450', 'button@451', 'button@461', 'button@462', 'button@467', 'button@638'],
);
if (
  runtimeEvidence.remainingCurrentFixtureBoundaryControls?.sourceManifestSha256
  !== currentInteractionEvidenceManifest(runtimeEvidence.remainingCurrentFixtureBoundaryControls)
) fail('remaining current fixture-boundary evidence is stale');
verifySupplementalControlEvidenceSet(
  runtimeEvidence.remainingCurrentFixtureBoundaryControls,
  'remaining current fixture boundary',
  84,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'DETERMINISTIC_ROLE_OR_DATA_FIXTURE_NOT_ADMITTED',
  },
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentPrintableDesktopBrowserControls,
  'current printable desktop browser',
  [
    'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
    'src/components/shared/printableAssets/PostcardContentFields.tsx',
  ],
  11,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableDesktopBrowserControls,
  'current printable desktop browser',
  ['button@1424', 'button@1471', 'button@1562', 'action-handler@1683', 'dialog-action-surface@1757', 'button@1895', 'button@1913', 'button@1934', 'input@80', 'input@90', 'button@99'],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentItemProductTagDesktopBrowserControls,
  'current item Product Tag desktop browser',
  [
    'src/components/templates/main-app/projects/editorView/editItemModal.tsx',
    'src/components/shared/printableAssets/PrintableAssetWorkflowModal.tsx',
  ],
  5,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentItemProductTagDesktopBrowserControls,
  'current item Product Tag desktop browser',
  ['button@811', 'dialog-action-surface@154', 'button@158', 'button@159', 'button@160'],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentPrintableAlternateLifecycleControls,
  'current printable alternate-state boundary',
  [
    'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
    'src/components/mobile/screens/MobileShareScreen.tsx',
  ],
  2,
  {
    testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE',
    finalStatus: 'ALTERNATE_LIFECYCLE_NOT_ADMITTED_IN_CURRENT_FIXTURE',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableAlternateLifecycleControls,
  'current printable alternate-state boundary',
  ['button@1336', 'button@1491'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.currentPrintableSafetyControls,
  'current printable safety boundary',
  'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
  3,
  {
    testResult: 'BLOCKED_SAFETY_BOUNDARY',
    finalStatus: 'MUTATING_OR_DESTRUCTIVE_ACTION_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableSafetyControls,
  'current printable safety boundary',
  ['button@1480', 'button@1489', 'button@1624'],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentPrintableFixtureControls,
  'current printable fixture boundary',
  [
    'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
    'src/components/mobile/screens/MobileShareScreen.tsx',
  ],
  9,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'DETERMINISTIC_ROLE_OR_DATA_FIXTURE_NOT_ADMITTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableFixtureControls,
  'current printable fixture boundary',
  ['action-handler@1397', 'selection@1776', 'button@1640', 'button@2403', 'action-handler@2057', 'action-handler@2072', 'button@2103', 'selection@2711', 'button@3094'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.currentPrintableNativeControls,
  'current printable native boundary',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  4,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BROWSER_NATIVE_EXECUTION_NOT_PERFORMED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableNativeControls,
  'current printable native boundary',
  ['action-handler@2227', 'action-handler@2262', 'action-handler@2271', 'button@2922'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.currentPrintableExternalControls,
  'current printable external boundary',
  'src/components/mobile/screens/MobileShareScreen.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'EXTERNAL_HANDOFF_NOT_OPENED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentPrintableExternalControls,
  'current printable external boundary',
  ['button@2396', 'button@3088'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.loginClaimLifecycleBoundaryControls,
  'login claim lifecycle boundary',
  'src/components/templates/loginPage/index.tsx',
  11,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_UNCLAIMED_ACCOUNT_EMAIL_AND_WHATSAPP_CLAIM_LIFECYCLE_NOT_RUN',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.loginClaimLifecycleBoundaryControls,
  'login claim lifecycle boundary',
  ['form@980', 'input@1005', 'button@1031', 'button@1032', 'form@1038', 'button@1070', 'button@1071', 'button@1079', 'button@1091', 'button@1095', 'button@1108'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopUseMenuListAlternateStateControls,
  'desktop Use MenuList alternate-state boundary',
  'src/components/templates/main-app/useMenuList/index.tsx',
  10,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_NO_MENU_MISSING_LINK_MULTI_PROJECT_SCREEN_OUTPUT_AND_MODAL_STATES',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopUseMenuListAlternateStateControls,
  'desktop Use MenuList alternate-state boundary',
  ['button@745', 'button@761', 'action-handler@855', 'button@867', 'dialog-action-surface@1059', 'action-handler@1123', 'button@1585', 'button@1775', 'button@1795', 'dialog-action-surface@1911'],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.desktopProjectLifecycleCurrentBrowserControls,
  'desktop project lifecycle current browser',
  [
    'src/components/templates/main-app/projects/ProjectDetails/ProjectSelector.tsx',
    'src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx',
    'src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx',
    'src/components/templates/main-app/projects/editorView/BulkStatusMenuModal.tsx',
  ],
  39,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopProjectLifecycleCurrentBrowserControls,
  'desktop project lifecycle current browser',
  [
    'menu-action@142', 'menu-action@144', 'menu-action@148', 'disclosure@159', 'button@164', 'action-handler@202', 'action-handler@342', 'button@464', 'dialog-action-surface@500', 'button@527', 'action-handler@578', 'dialog-action-surface@587',
    'dialog-action-surface@169', 'button@189', 'button@200', 'form@206', 'input@253', 'input@274', 'selection@302', 'selection@321',
    'dialog-action-surface@208', 'form@223', 'input@258', 'selection@309', 'selection@311', 'selection@320', 'selection@351', 'selection@384',
    'dialog-action-surface@255', 'button@283', 'button@286', 'button@287', 'selection@347', 'input@363', 'selection@401', 'button@410', 'selection@467', 'input@487', 'selection@550',
  ],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopProjectEditAlternateProviderControls,
  'desktop project edit provider boundary',
  'src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx',
  2,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_PROJECT_TRANSLATION_AND_GENERATED_IMAGE_PROVIDER_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(runtimeEvidence.desktopProjectEditAlternateProviderControls, 'desktop project edit provider boundary', ['button@240', 'button@373']);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopProjectEditLanguageFixtureControls,
  'desktop project edit language fixture boundary',
  'src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx',
  2,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_MULTI_LANGUAGE_PROJECT_EDIT_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(runtimeEvidence.desktopProjectEditLanguageFixtureControls, 'desktop project edit language fixture boundary', ['selection@228', 'button@435']);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopSpecialMenuLanguageProviderControls,
  'desktop special-menu language/provider boundary',
  'src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx',
  3,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_MULTI_LANGUAGE_SPECIAL_MENU_TRANSLATION_PROVIDER_NOT_RUN',
  },
);
verifyExactEvidenceActions(runtimeEvidence.desktopSpecialMenuLanguageProviderControls, 'desktop special-menu language/provider boundary', ['selection@239', 'button@248', 'button@289']);
verifySingleSourceControlEvidence(
  runtimeEvidence.desktopStoreCustomizationFixtureControls,
  'desktop store customization fixture boundary',
  'src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx',
  11,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_LINKED_OUTLET_STORE_CUSTOMIZATION_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.desktopStoreCustomizationFixtureControls,
  'desktop store customization fixture boundary',
  ['selection@299', 'selection@318', 'input@345', 'selection@379', 'input@398', 'input@424', 'selection@468', 'dialog-action-surface@488', 'button@516', 'input@547', 'disclosure@557'],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentOwnerSettingsProjectReboundControls,
  'current owner settings/project rebound',
  [
    'src/components/mobile/components/MobileProjectSelectorSheet.tsx',
    'src/components/mobile/screens/MobileCustomerAppScreen.tsx',
    'src/components/mobile/screens/MobileRolesScreen.tsx',
    'src/components/mobile/sheets/AppSettingsSheet.tsx',
    'src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx',
    'src/components/templates/main-app/projects/editorView/EditorContent.tsx',
    'src/components/mobile/screens/MobileLocaleSettingsScreen.tsx',
    'src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx',
    'src/components/templates/main-app/projects/index.tsx',
  ],
  73,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.currentOwnerSettingsProjectReboundControls,
  'current owner settings/project rebound',
  [
    'menu-action@1537', 'menu-action@1546', 'menu-action@1555', 'button@1689', 'button@1779', 'action-handler@1804', 'selection@1966',
    'input@615', 'button@768', 'action-handler@795', 'dialog-action-surface@821', 'button@830', 'button@998', 'selection@1076',
    'dialog-action-surface@145', 'button@159', 'input@173', 'input@184', 'selection@196', 'selection@226', 'selection@244', 'button@278', 'button@349', 'action-handler@367', 'button@375',
    'dialog-action-surface@201', 'button@212', 'selection@227', 'button@239', 'selection@276', 'selection@292', 'selection@308', 'selection@327', 'selection@346', 'selection@354',
    'button@488', 'button@494', 'selection@543', 'selection@566', 'selection@582', 'input@597', 'button@621', 'input@776',
    'action-handler@195', 'button@277', 'button@293', 'button@307', 'button@412', 'button@498', 'disclosure@629', 'button@682', 'button@694', 'button@706', 'button@754',
    'selection@268', 'selection@285', 'selection@299', 'selection@313', 'selection@331', 'selection@370', 'selection@387', 'button@411',
    'input@228', 'input@262', 'input@296', 'selection@325', 'input@371', 'button@403', 'button@406',
    'button@3259', 'button@3512', 'button@3572', 'button@3605',
  ],
);
verifyMultiSourceControlEvidence(
  runtimeEvidence.ownerProjectProviderBoundaryControls,
  'owner project provider boundary',
  ['src/components/mobile/components/MobileProjectSelectorSheet.tsx', 'src/components/templates/main-app/projects/index.tsx'],
  3,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_PROJECT_AI_GENERATION_TRANSLATION_AND_EXTERNAL_IMPORT_EXECUTION_NOT_RUN',
  },
);
verifyExactEvidenceActions(runtimeEvidence.ownerProjectProviderBoundaryControls, 'owner project provider boundary', ['button@1878', 'button@1943', 'button@3024']);
verifyMultiSourceControlEvidence(
  runtimeEvidence.ownerSettingsNativeBoundaryControls,
  'owner settings native boundary',
  [
    'src/components/mobile/screens/MobileCustomerAppScreen.tsx',
    'src/components/mobile/sheets/AppSettingsSheet.tsx',
    'src/components/templates/main-app/businessSettings/tabs/CustomerAppTab.tsx',
    'src/components/templates/main-app/projects/index.tsx',
  ],
  8,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_ICON_COLOR_AND_MENU_FILE_CHOOSERS_NOT_PHYSICALLY_VERIFIED',
  },
);
verifyExactEvidenceActions(runtimeEvidence.ownerSettingsNativeBoundaryControls, 'owner settings native boundary', ['button@683', 'button@695', 'action-handler@718', 'input@259', 'button@680', 'button@690', 'action-handler@711', 'button@3541']);
verifyMultiSourceControlEvidence(
  runtimeEvidence.ownerSettingsAlternateFixtureControls,
  'owner settings alternate fixture boundary',
  [
    'src/components/mobile/components/MobileProjectSelectorSheet.tsx',
    'src/components/mobile/screens/MobileCustomerAppScreen.tsx',
    'src/components/mobile/screens/MobileLocaleSettingsScreen.tsx',
    'src/components/templates/main-app/businessSettings/tabs/SeoTab.tsx',
    'src/components/templates/main-app/projects/index.tsx',
  ],
  14,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_ALTERNATE_LANGUAGE_INSTALL_LINK_SPECIAL_MENU_AND_ERROR_FIXTURES_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(runtimeEvidence.ownerSettingsAlternateFixtureControls, 'owner settings alternate fixture boundary', ['input@1989', 'input@1997', 'button@2103', 'button@569', 'button@782', 'button@355', 'button@414', 'selection@194', 'selection@430', 'button@473', 'selection@210', 'button@3080', 'button@3515', 'button@3575']);
verifySingleSourceControlEvidence(
  runtimeEvidence.billingCancellationLifecycleControls,
  'billing cancellation lifecycle boundary',
  'src/components/templates/main-app/billing/CancellationModal.tsx',
  10,
  {
    testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE',
    finalStatus: 'BLOCKED_RECURRING_SUBSCRIPTION_CANCELLATION_LIFECYCLE_NOT_AVAILABLE_ON_OFFLINE_PREPAID_FIXTURE',
  },
);
verifyExactEvidenceActions(runtimeEvidence.billingCancellationLifecycleControls, 'billing cancellation lifecycle boundary', ['dialog-action-surface@76', 'form@101', 'selection@102', 'selection@105', 'input@111', 'button@121', 'button@122', 'selection@145', 'button@149', 'button@150']);
verifyMultiSourceControlEvidence(
  runtimeEvidence.currentOwnerMediaAnalyticsLifecycleControls,
  'current owner media and analytics lifecycle',
  [
    'src/components/mobile/components/MobileSpecialHoursManager.tsx',
    'src/components/mobile/screens/MobileDigitalScreensScreen.tsx',
    'src/components/mobile/sheets/ItemEditSheet.tsx',
    'src/components/templates/main-app/businessSettings/tabs/AnalyticsSetupWizard.tsx',
    'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx',
    'src/components/templates/main-app/projects/FileList.tsx',
    'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx',
    'src/components/templates/main-app/projects/editorView/editItemModal.tsx',
  ],
  44,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.currentOwnerMediaAnalyticsLifecycleControls, 'current owner media and analytics lifecycle', [
  'input@203', 'input@204', 'selection@211', 'input@222', 'input@223', 'button@227', 'button@236', 'button@260', 'button@269',
  'button@488', 'selection@564', 'input@600', 'button@605', 'input@631', 'button@637', 'button@648', 'button@665', 'button@678',
  'selection@552', 'input@570', 'input@862', 'disclosure@1314', 'disclosure@1316',
  'selection@155', 'selection@168', 'selection@181', 'selection@194', 'selection@207', 'button@286', 'button@878',
  'button@54', 'button@158', 'dialog-action-surface@240', 'button@245', 'dialog-action-surface@284', 'button@289',
  'selection@230', 'button@274', 'selection@114', 'button@778', 'dialog-action-surface@787', 'button@831', 'disclosure@1122', 'action-handler@1168',
]);
verifySingleSourceControlEvidence(runtimeEvidence.analyticsWizardExternalHandoffControls, 'analytics wizard external handoff', 'src/components/templates/main-app/businessSettings/tabs/AnalyticsSetupWizard.tsx', 3, {
  testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_EXTERNAL_ANALYTICS_SEARCH_CONSOLE_AND_META_HANDOFFS_NOT_OPENED',
});
verifyExactEvidenceActions(runtimeEvidence.analyticsWizardExternalHandoffControls, 'analytics wizard external handoff', ['link@60', 'link@95', 'link@125']);
const ownerMediaBoundarySources = [
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx',
  'src/components/templates/platform/assets/detailsModal.tsx',
  'src/components/templates/main-app/projects/editorView/editItemModal.tsx',
];
verifyMultiSourceControlEvidence(runtimeEvidence.ownerMediaNativeBoundaryControls, 'owner media native boundary', ownerMediaBoundarySources, 3, {
  testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY', finalStatus: 'BLOCKED_NATIVE_ITEM_IMAGE_COLOR_ASSET_UPLOAD_AND_SHARE_UI_NOT_PHYSICALLY_VERIFIED',
});
verifyExactEvidenceActions(runtimeEvidence.ownerMediaNativeBoundaryControls, 'owner media native boundary', ['input@858', 'button@542', 'button@805']);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerMediaProviderBoundaryControls, 'owner media provider boundary', ownerMediaBoundarySources, 4, {
  testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION', finalStatus: 'BLOCKED_AI_IMAGE_DESCRIPTION_AND_REMOTE_ASSET_PROVIDER_EXECUTION_NOT_RUN',
});
verifyExactEvidenceActions(runtimeEvidence.ownerMediaProviderBoundaryControls, 'owner media provider boundary', ['button@678', 'input@550', 'button@555', 'action-handler@828']);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerMediaFixtureBlockedControls, 'owner media fixture boundary', [
  'src/components/shared/media/PublicImageViewer.tsx',
  'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx',
  'src/components/templates/main-app/projects/FileList.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx',
  'src/components/templates/platform/assets/detailsModal.tsx',
], 35, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_IMAGE_GALLERY_UPLOAD_ERROR_BATCH_EXTRACTION_AND_PLATFORM_ASSET_FIXTURES_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.ownerMediaFixtureBlockedControls, 'owner media fixture boundary', [
  'action-handler@328', 'button@359', 'button@368', 'button@376', 'button@385', 'button@397', 'button@417',
  'selection@545', 'button@656', 'button@1044', 'button@1056', 'button@1057', 'button@1300', 'button@146',
  'input@131', 'button@143', 'selection@158', 'selection@167', 'action-handler@178', 'selection@214', 'button@272',
  'selection@117', 'selection@154', 'action-handler@215', 'button@425', 'button@443', 'button@444', 'button@445', 'button@599', 'button@607',
  'dialog-action-surface@569', 'button@573', 'action-handler@608', 'button@623', 'button@624',
]);
verifySingleSourceControlEvidence(runtimeEvidence.publicImageViewerInternalHandlers, 'public image viewer internal handlers', 'src/components/shared/media/PublicImageViewer.tsx', 2, {
  testResult: 'PASS_NOT_USER_TRIGGERABLE', finalStatus: 'EVENT_PROPAGATION_GUARD_NOT_A_USER_CONTROL',
});
verifyExactEvidenceActions(runtimeEvidence.publicImageViewerInternalHandlers, 'public image viewer internal handlers', ['action-handler@342', 'action-handler@441']);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerMediaDestructiveSafetyControls, 'owner media destructive safety boundary', [
  'src/components/templates/main-app/projects/FileList.tsx',
  'src/components/templates/platform/assets/detailsModal.tsx',
], 3, {
  testResult: 'BLOCKED_SAFETY_BOUNDARY', finalStatus: 'BLOCKED_DESTRUCTIVE_PROCESSED_FILE_AND_PLATFORM_ASSET_DELETION_NOT_RUN',
});
verifyExactEvidenceActions(runtimeEvidence.ownerMediaDestructiveSafetyControls, 'owner media destructive safety boundary', ['button@248', 'button@292', 'button@570']);
verifySingleSourceControlEvidence(runtimeEvidence.pricingOnboardingAlternateLifecycleControls, 'pricing onboarding alternate lifecycle', 'src/components/website/pricing-pages/OnboardingModal.tsx', 9, {
  testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE', finalStatus: 'BLOCKED_PRICING_ONBOARDING_MODAL_NOT_REACHABLE_FOR_ACTIVE_PREPAID_OWNER',
});
verifyExactEvidenceActions(runtimeEvidence.pricingOnboardingAlternateLifecycleControls, 'pricing onboarding alternate lifecycle', ['input@133', 'selection@144', 'selection@168', 'selection@206', 'input@221', 'input@238', 'input@247', 'button@253', 'button@260']);
const publicBusinessActionSources = ['src/app/client/obp/OBPActions.tsx', 'src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx'];
verifyMultiSourceControlEvidence(runtimeEvidence.publicBusinessActionExternalHandoffControls, 'public business action external handoff', publicBusinessActionSources, 14, {
  testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_PUBLIC_CALL_DIRECTIONS_WHATSAPP_REVIEW_RESERVATION_ORDER_AND_SOCIAL_HANDOFFS_NOT_OPENED',
});
verifyExactEvidenceActions(runtimeEvidence.publicBusinessActionExternalHandoffControls, 'public business action external handoff', ['link@176', 'link@190', 'link@207', 'link@224', 'link@241', 'link@258', 'link@275', 'link@442', 'link@460', 'link@496', 'link@514', 'link@543', 'link@578', 'link@602']);
verifyMultiSourceControlEvidence(runtimeEvidence.publicBusinessActionFixtureControls, 'public business action fixture boundary', publicBusinessActionSources, 2, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_PUBLIC_PLACEHOLDER_AND_ALTERNATE_LANGUAGE_FIXTURES_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.publicBusinessActionFixtureControls, 'public business action fixture boundary', ['button@294', 'button@701']);
verifySingleSourceControlEvidence(runtimeEvidence.feedbackQrNativeAndExternalControls, 'feedback QR native and external boundary', 'src/components/templates/main-app/feedback/FeedbackQrDownload.tsx', 8, {
  testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY', finalStatus: 'BLOCKED_FEEDBACK_QR_CLIPBOARD_SHARE_EXTERNAL_OPEN_AND_DOWNLOAD_ARTIFACT_NOT_PHYSICALLY_VERIFIED',
});
verifyExactEvidenceActions(runtimeEvidence.feedbackQrNativeAndExternalControls, 'feedback QR native and external boundary', ['button@264', 'button@267', 'button@275', 'button@278', 'button@282', 'dialog-action-surface@288', 'button@293', 'button@296']);
verifySingleSourceControlEvidence(runtimeEvidence.currentAnalyticsSettingsDraftControls, 'current analytics settings draft', 'src/components/templates/main-app/businessSettings/tabs/AnalyticsTab.tsx', 8, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.currentAnalyticsSettingsDraftControls, 'current analytics settings draft', ['input@99', 'input@120', 'input@141', 'selection@195', 'selection@211', 'selection@227', 'selection@243', 'selection@259']);
const ownerAlternateFeatureFixtureSources = [
  'src/components/atoms/timeSlotPresetForm/index.tsx',
  'src/components/mobile/sheets/SmartRecommendationsSheet.tsx',
  'src/components/templates/main-app/businessSettings/tabs/LocaleSettingsTab.tsx',
  'src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx',
  'src/components/atoms/IconPicker/index.tsx',
];
verifyMultiSourceControlEvidence(runtimeEvidence.ownerAlternateFeatureFixtureControls, 'owner alternate feature fixture boundary', ownerAlternateFeatureFixtureSources, 39, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_PRESET_RECOMMENDATION_LOCALE_IMPACT_AND_ICON_FIXTURES_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.ownerAlternateFeatureFixtureControls, 'owner alternate feature fixture boundary', [
  'input@48', 'selection@57', 'selection@65', 'button@76', 'input@109', 'selection@122', 'selection@135', 'button@158',
  'selection@252', 'selection@270', 'button@279', 'dialog-action-surface@326', 'disclosure@370', 'disclosure@371', 'button@396', 'button@399',
  'selection@93', 'selection@108', 'selection@122', 'selection@133', 'selection@148', 'selection@183', 'selection@217', 'button@242',
  'action-handler@286', 'disclosure@353', 'action-handler@450', 'disclosure@493', 'action-handler@576', 'disclosure@631', 'action-handler@714', 'disclosure@757',
  'button@83', 'button@102', 'input@122', 'button@170', 'button@178', 'dialog-action-surface@198', 'disclosure@218',
]);
const ownerAiGenerationProviderSources = [
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx',
  'src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx',
  'src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx',
  'src/components/templates/main-app/projects/editorView/LanguageSelectorModal.tsx',
];
verifyMultiSourceControlEvidence(runtimeEvidence.ownerAiGenerationProviderBoundaryControls, 'owner AI generation provider boundary', ownerAiGenerationProviderSources, 32, {
  testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION', finalStatus: 'BLOCKED_AI_BATCH_DESCRIPTION_IMAGE_AND_LANGUAGE_PROVIDER_EXECUTION_NOT_RUN',
});
verifyExactEvidenceActions(runtimeEvidence.ownerAiGenerationProviderBoundaryControls, 'owner AI generation provider boundary', [
  'selection@109', 'action-handler@121', 'button@128', 'selection@190', 'selection@205', 'selection@223', 'input@249', 'input@265',
  'dialog-action-surface@188', 'dialog-action-surface@224', 'button@239', 'button@265', 'button@299', 'button@352', 'dialog-action-surface@365', 'button@380',
  'button@666', 'button@683', 'selection@705', 'button@841', 'button@871', 'button@874', 'button@900', 'button@903',
  'button@231', 'dialog-action-surface@235', 'button@267', 'action-handler@337', 'selection@400', 'button@515', 'button@518', 'button@531',
]);
verifySingleSourceControlEvidence(runtimeEvidence.digitalScreenOwnerUploadNativeControls, 'digital screen owner upload native boundary', 'src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx', 8, {
  testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY', finalStatus: 'BLOCKED_NATIVE_DIGITAL_SCREEN_UPLOAD_AND_ASSET_REMOVAL_ARTIFACT_NOT_PHYSICALLY_VERIFIED',
});
verifyExactEvidenceActions(runtimeEvidence.digitalScreenOwnerUploadNativeControls, 'digital screen owner upload native boundary', ['input@215', 'button@220', 'button@237', 'dialog-action-surface@249', 'button@257', 'input@291', 'button@296', 'button@303']);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerAlternateLifecycleComponentControls, 'owner alternate lifecycle components', [
  'src/components/mobile/components/PresenceMonitor.tsx', 'src/components/mobile/screens/MobileFeedbackDetail.tsx',
  'src/components/mobile/sheets/CategoryManagerSheet.tsx', 'src/components/mobile/sheets/MobileCategoryEditSheet.tsx', 'src/components/templates/main-app/projects/SpecialMenuCard.tsx',
], 35, {testResult:'BLOCKED_FIXTURE_STATE', finalStatus:'BLOCKED_ALTERNATE_HEALTH_PRESENCE_FEEDBACK_CATEGORY_AND_SPECIAL_MENU_FIXTURES_NOT_PRESENT'});
verifyExactEvidenceActions(runtimeEvidence.ownerAlternateLifecycleComponentControls, 'owner alternate lifecycle components', [
  'button@464','dialog-action-surface@538','button@548','button@594','button@620','button@636','button@646',
  'button@211','button@219','button@241','input@253','button@264','button@271','button@286',
  'button@613','button@623','action-handler@655','button@733','button@748','action-handler@772','action-handler@787',
  'disclosure@323','disclosure@327','input@336','selection@394','button@417','button@432','button@463',
  'button@86','dialog-action-surface@91','button@98','dialog-action-surface@104','button@111','button@180','button@224',
]);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerNativeArtifactComponentControls, 'owner native artifact components', [
  'src/components/mobile/menu-card-export/MobileMenuCardExportScreen.tsx','src/components/templates/main-app/projects/PdfViewer.tsx',
  'src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx','src/components/templates/main-app/projects/editorView/ZoomableImage.tsx',
  'src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx',
],35,{testResult:'BLOCKED_BROWSER_NATIVE_BOUNDARY',finalStatus:'BLOCKED_NATIVE_EXPORT_SHARE_DOWNLOAD_ZOOM_AND_FILE_PREVIEW_ARTIFACTS_NOT_PHYSICALLY_VERIFIED'});
verifyExactEvidenceActions(runtimeEvidence.ownerNativeArtifactComponentControls,'owner native artifact components',[
  'button@181','button@281','button@300','button@418','button@427','dialog-action-surface@440','action-handler@454',
  'dialog-action-surface@45','dialog-action-surface@61','button@70','button@74','action-handler@126','dialog-action-surface@132','button@142',
  'button@225','button@238','button@241','button@244','button@264','button@268','button@299',
  'action-handler@257','button@326','button@336','button@361','button@372','button@405','button@410',
  'button@274','button@285','button@290','disclosure@349','button@356','button@364','button@374']);
verifyMultiSourceControlEvidence(runtimeEvidence.ownerProviderDependentComponentControls,'owner provider-dependent components',[
  'src/components/mobile/sheets/ManageLanguagesSheet.tsx','src/components/shared/media/MediaImageCard.tsx','src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx','src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx','src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx',
],42,{testResult:'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',finalStatus:'BLOCKED_LANGUAGE_MEDIA_PROPOSAL_STYLE_ATTRIBUTE_AND_COMMAND_PROVIDER_EXECUTION_NOT_RUN'});
verifyExactEvidenceActions(runtimeEvidence.ownerProviderDependentComponentControls,'owner provider-dependent components',[
  'dialog-action-surface@545','button@602','button@664','button@672','button@682','selection@707','button@726',
  'input@156','action-handler@169','button@215','button@229','button@243','button@257','button@271',
  'button@345','button@416','button@448','button@459','button@470','button@480','button@490',
  'action-handler@81','button@146','button@167','button@173','button@189','dialog-action-surface@239','dialog-action-surface@262',
  'action-handler@134','button@201','button@283','button@303','button@312','dialog-action-surface@327','dialog-action-surface@353',
  'button@120','input@158','selection@169','button@178','disclosure@208','selection@222','selection@250']);
verifyMultiSourceControlEvidence(runtimeEvidence.publicSharingExternalComponentControls,'public sharing external components',[
  'src/components/templates/main-app/businessSettings/OBPLinkCard.tsx','src/components/templates/main-app/projects/ShareModal.tsx','src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx',
],21,{testResult:'BLOCKED_EXTERNAL_HANDOFF',finalStatus:'BLOCKED_PUBLIC_LINK_CLIPBOARD_SHARE_MESSAGE_AND_EXTERNAL_ITEM_HANDOFFS_NOT_OPENED'});
verifyExactEvidenceActions(runtimeEvidence.publicSharingExternalComponentControls,'public sharing external components',[
  'button@303','button@311','button@318','button@319','button@320','selection@332','button@356',
  'dialog-action-surface@136','form@143','input@162','button@187','button@190','action-handler@207','action-handler@225',
  'action-handler@686','action-handler@741','action-handler@831','button@834','button@849','button@858','link@1106']);
const currentBehavioralContractSources = [
  'src/components/templates/main-app/businessSettings/tabs/SpecialHoursEditor.tsx','src/components/mobile/screens/MobileBusinessHealthScreen.tsx',
  'src/components/mobile/screens/MobileOfficialPageScreen.tsx','src/components/mobile/screens/MobilePosSyncScreen.tsx','src/components/mobile/screens/MobileSpecialMenuScreen.tsx',
  'src/components/molecules/FeedbackSection/index.tsx','src/components/atoms/GuestFeedbackForm/index.tsx','src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx','src/components/mobile/sheets/MobileOwnerReferralSheet.tsx',
];
verifyMultiSourceControlEvidence(runtimeEvidence.currentBehavioralContractControlCoverage,'current behavioral contract controls',currentBehavioralContractSources,60,{testResult:'PASS_LOCAL_CURRENT_CONTRACT',finalStatus:'LOCAL_BEHAVIORAL_CONTRACT_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING'});
verifyExactEvidenceActions(runtimeEvidence.currentBehavioralContractControlCoverage,'current behavioral contract controls',[
  'selection@216','input@222','selection@229','selection@238','button@255','button@282','dialog-action-surface@285','button@291',
  'button@313','action-handler@437','button@474','button@597','input@616','button@622','dialog-action-surface@669','button@684',
  'button@439','input@506','input@1464','button@1524','button@1549','button@1875','input@2126','button@2339',
  'button@765','button@771','button@777','button@789','dialog-action-surface@827','input@850',
  'button@486','input@559','button@991','input@1066','input@1077','button@1735',
  'button@55','button@68','dialog-action-surface@85','button@90','button@93','form@103','input@110',
  'link@513','link@523','link@540','form@577','input@718','input@789',
  'button@54','dialog-action-surface@57','button@74','button@108','button@111','button@114',
  'dialog-action-surface@55','button@73','button@107','button@111','button@114']);
verifyMultiSourceControlEvidence(runtimeEvidence.remainingAlternateFixtureComponentControls,'remaining alternate fixture components',[
  'src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx','src/components/mobile/screens/MobileTransactionsScreen.tsx','src/components/mobile/screens/MobileUsersScreen.tsx','src/components/mobile/screens/MobileLocationsScreen.tsx',
  'src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx','src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx','src/components/mobile/components/MobileMasterUpdateNotice.tsx','src/components/organisms/MasterUpdateBanner/MasterUpdateDetailModal.tsx',
  'src/components/templates/main-app/businessSettings/TempStatusCard.tsx','src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx','src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx','src/components/templates/main-app/today/index.tsx',
  'src/components/templates/main-app/users/StaffLoginDetailsContent.tsx','src/components/templates/main-app/users/usersList/userForm/storesMapping.tsx',
],75,{testResult:'BLOCKED_FIXTURE_STATE',finalStatus:'BLOCKED_ALTERNATE_SUCCESS_TRANSACTION_USER_LOCATION_EXTRACTION_UPDATE_AND_REORDER_FIXTURES_NOT_PRESENT'});
verifyMultiSourceControlEvidence(runtimeEvidence.remainingProviderDependentComponentControls,'remaining provider-dependent components',[
  'src/components/mobile/components/GrowthKitsMobileCard.tsx','src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx','src/components/mobile/sheets/AIDefaultsSheet.tsx','src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx','src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx','src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx','src/components/mobile/sheets/GenerateDescriptionsSheet.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/SubjectProfileSelector.tsx','src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx','src/modules/creative-editor/DesignCuePanel.tsx',
],61,{testResult:'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',finalStatus:'BLOCKED_GROWTH_SEO_AI_DEFAULT_CHAT_DESCRIPTION_SUBJECT_COMMAND_AND_DESIGN_PROVIDER_EXECUTION_NOT_RUN'});
verifyMultiSourceControlEvidence(runtimeEvidence.remainingNativeArtifactComponentControls,'remaining native artifact components',['src/components/mobile/sheets/ColorPickerSheet.tsx','src/components/templates/platform/assets/index.tsx'],12,{testResult:'BLOCKED_BROWSER_NATIVE_BOUNDARY',finalStatus:'BLOCKED_NATIVE_COLOR_PICKER_ASSET_UPLOAD_DOWNLOAD_AND_DELETE_ARTIFACTS_NOT_PHYSICALLY_VERIFIED'});
verifyMultiSourceControlEvidence(runtimeEvidence.currentAdjacentContractComponentControls,'current adjacent contract components',[
  'src/components/mobile/screens/MobileBusinessAttributesScreen.tsx','src/components/mobile/screens/MobileDashboardScreen.tsx','src/components/mobile/screens/MobileOpsControlRoomScreen.tsx','src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx','src/components/shared/printableAssets/FlyerCampaignFields.tsx','src/components/templates/main-app/projects/b2bView.tsx',
],36,{testResult:'PASS_LOCAL_CURRENT_CONTRACT',finalStatus:'LOCAL_BEHAVIORAL_CONTRACT_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING'});
verifyMultiSourceControlEvidence(runtimeEvidence.aiSearchExternalBoundaryControls,'AI search external boundary',['src/components/organisms/AISearchModal/FeedbackModal.tsx','src/components/organisms/AISearchModal/SearchResultDisplay.tsx'],12,{testResult:'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',finalStatus:'BLOCKED_AI_SEARCH_RESULT_FEEDBACK_AND_EXTERNAL_SOURCE_EXECUTION_NOT_RUN'});
verifySingleSourceControlEvidence(
  runtimeEvidence.notificationPreferredChannelBrowserControls,
  'notification preferred-channel browser',
  'src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx',
  1,
);
verifyExactEvidenceActions(runtimeEvidence.notificationPreferredChannelBrowserControls, 'notification preferred-channel browser', [
  'selection@132', 'selection@133', 'selection@134',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.notificationWhatsAppFixtureBlockedControls,
  'notification WhatsApp fixture boundary',
  'src/components/templates/main-app/businessSettings/NotificationSettingsTab.tsx',
  1,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_VERIFIED_WHATSAPP_CONTACT_AND_CONSENT_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(runtimeEvidence.notificationWhatsAppFixtureBlockedControls, 'notification WhatsApp fixture boundary', [
  'selection@148',
]);
verifyMultiSourceControlEvidence(
  runtimeEvidence.businessSettingsReversibleBrowserControls,
  'business settings reversible browser',
  [
    'src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx',
    'src/components/templates/main-app/businessSettings/tabs/BusinessAttributesTab.tsx',
    'src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx',
  ],
  7,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.businessSettingsReversibleBrowserControls, 'business settings reversible browser', [
  'selection@124', 'selection@60', 'input@100', 'selection@96', 'selection@115', 'selection@143', 'input@209',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.feedbackReviewExternalHandoffControl,
  'feedback review external handoff',
  'src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx',
  1,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_EXTERNAL_GOOGLE_REVIEW_HANDOFF_NOT_OPENED',
  },
);
verifyExactEvidenceActions(runtimeEvidence.feedbackReviewExternalHandoffControl, 'feedback review external handoff', [
  'link@218',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformPullApiKeyBrowserControls,
  'Platform Pull API key browser lifecycle',
  'src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx',
  3,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.platformPullApiKeyBrowserControls, 'Platform Pull API key browser lifecycle', [
  'input@371', 'button@389', 'button@399',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.platformPullApiKeyNativeClipboardControl,
  'Platform Pull API key native clipboard boundary',
  'src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx',
  1,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_CLIPBOARD_WRITE_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(runtimeEvidence.platformPullApiKeyNativeClipboardControl, 'Platform Pull API key native clipboard boundary', [
  'button@376',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.socialMediaDraftBrowserControls,
  'social-media draft browser',
  'src/components/templates/main-app/businessSettings/tabs/SocialMediaTab.tsx',
  3,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.socialMediaDraftBrowserControls, 'social-media draft browser', [
  'input@87', 'input@113', 'input@154',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.compliancePageLifecycleBrowserControls,
  'compliance-page lifecycle browser',
  'src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx',
  3,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.compliancePageLifecycleBrowserControls, 'compliance-page lifecycle browser', [
  'input@418', 'button@431', 'button@459',
]);
verifySingleSourceControlEvidence(
  runtimeEvidence.googleListingReminderBrowserControl,
  'Google-listing reminder browser',
  'src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx',
  1,
  { testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING' },
);
verifyExactEvidenceActions(runtimeEvidence.googleListingReminderBrowserControl, 'Google-listing reminder browser', ['button@357']);
verifySingleSourceControlEvidence(
  runtimeEvidence.googleListingNativeClipboardControls,
  'Google-listing native clipboard boundary',
  'src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx',
  2,
  { testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY', finalStatus: 'BLOCKED_NATIVE_CLIPBOARD_WRITES_NOT_INDEPENDENTLY_VERIFIED' },
);
verifyExactEvidenceActions(runtimeEvidence.googleListingNativeClipboardControls, 'Google-listing native clipboard boundary', ['button@258', 'button@288']);
verifySingleSourceControlEvidence(
  runtimeEvidence.googleListingExternalHandoffControls,
  'Google-listing external handoff boundary',
  'src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx',
  2,
  { testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_EXTERNAL_GOOGLE_PROFILE_HANDOFF_AND_OWNER_CONFIRMATION_NOT_EXECUTED' },
);
verifyExactEvidenceActions(runtimeEvidence.googleListingExternalHandoffControls, 'Google-listing external handoff boundary', ['button@347', 'button@354']);
verifySingleSourceControlEvidence(runtimeEvidence.businessSettingsSaveLifecycleControls, 'business-settings save lifecycle', 'src/components/templates/main-app/businessSettings/index.tsx', 2, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.businessSettingsSaveLifecycleControls, 'business-settings save lifecycle', ['form@1853', 'button@1891']);
verifySingleSourceControlEvidence(runtimeEvidence.timeSlotPresetEntryBrowserControl, 'time-slot preset entry browser', 'src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx', 1, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.timeSlotPresetEntryBrowserControl, 'time-slot preset entry browser', ['button@293']);
verifySingleSourceControlEvidence(runtimeEvidence.workingHoursDraftBrowserControl, 'working-hours draft browser', 'src/components/templates/main-app/businessSettings/tabs/WorkingHoursTab.tsx', 1, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.workingHoursDraftBrowserControl, 'working-hours draft browser', ['selection@130']);
verifySingleSourceControlEvidence(runtimeEvidence.businessCopyProviderBoundaryControl, 'business-copy provider boundary', 'src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx', 1, {
  testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION', finalStatus: 'BLOCKED_GEMINI_BUSINESS_COPY_PROVIDER_EXECUTION_NOT_RUN_RECOVERY_UI_PASSED',
});
verifyExactEvidenceActions(runtimeEvidence.businessCopyProviderBoundaryControl, 'business-copy provider boundary', ['button@370']);
verifySingleSourceControlEvidence(runtimeEvidence.businessCopyRepairFixtureControl, 'business-copy repair fixture boundary', 'src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx', 1, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_GENERATED_BUSINESS_COPY_REPAIRABLE_GAP_FIXTURE_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.businessCopyRepairFixtureControl, 'business-copy repair fixture boundary', ['button@339']);
verifySingleSourceControlEvidence(runtimeEvidence.websiteAuthenticatedDashboardControl, 'website authenticated dashboard browser', 'src/components/website/Header.tsx', 1, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.websiteAuthenticatedDashboardControl, 'website authenticated dashboard browser', ['link@441']);
verifySingleSourceControlEvidence(runtimeEvidence.websiteLogoutSafetyControl, 'website logout safety boundary', 'src/components/website/Header.tsx', 1, {
  testResult: 'BLOCKED_SAFETY_BOUNDARY', finalStatus: 'BLOCKED_ACTIVE_CERTIFICATION_SESSION_LOGOUT_NOT_RUN',
});
verifyExactEvidenceActions(runtimeEvidence.websiteLogoutSafetyControl, 'website logout safety boundary', ['button@457']);
verifySingleSourceControlEvidence(runtimeEvidence.transactionsPaginationFixtureControls, 'transactions pagination fixture boundary', 'src/components/templates/main-app/transactions/index.tsx', 4, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_MULTI_PAGE_TRANSACTION_FIXTURE_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.transactionsPaginationFixtureControls, 'transactions pagination fixture boundary', ['button@378', 'button@381', 'button@408', 'button@411']);
verifySingleSourceControlEvidence(runtimeEvidence.feedbackCardExternalReplyControls, 'feedback-card external reply boundary', 'src/components/templates/main-app/feedback/FeedbackCard.tsx', 3, {
  testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_FEEDBACK_CONTACT_FIXTURE_AND_EXTERNAL_REPLY_HANDOFFS_NOT_EXECUTED',
});
verifyExactEvidenceActions(runtimeEvidence.feedbackCardExternalReplyControls, 'feedback-card external reply boundary', ['link@229', 'link@249', 'button@295']);
verifySingleSourceControlEvidence(runtimeEvidence.feedbackCardNativeReplyCopyControl, 'feedback-card native reply copy boundary', 'src/components/templates/main-app/feedback/FeedbackCard.tsx', 1, {
  testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY', finalStatus: 'BLOCKED_FEEDBACK_CARD_FIXTURE_AND_NATIVE_REPLY_CLIPBOARD_NOT_VERIFIED',
});
verifyExactEvidenceActions(runtimeEvidence.feedbackCardNativeReplyCopyControl, 'feedback-card native reply copy boundary', ['button@287']);
verifySingleSourceControlEvidence(runtimeEvidence.messagePreviewSuccessFixtureControls, 'message-preview success fixture boundary', 'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx', 4, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_VALID_MESSAGE_PREVIEW_PUBLISH_AND_FIX_SESSION_FIXTURE_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.messagePreviewSuccessFixtureControls, 'message-preview success fixture boundary', ['link@364', 'link@407', 'button@650', 'button@680']);
verifySingleSourceControlEvidence(runtimeEvidence.messagePreviewWhatsAppHandoffControl, 'message-preview WhatsApp handoff boundary', 'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx', 1, {
  testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_VALID_PUBLISHED_PREVIEW_AND_EXTERNAL_WHATSAPP_HANDOFF_NOT_EXECUTED',
});
verifyExactEvidenceActions(runtimeEvidence.messagePreviewWhatsAppHandoffControl, 'message-preview WhatsApp handoff boundary', ['button@383']);
verifySingleSourceControlEvidence(runtimeEvidence.obpMenuCtaAlternateLifecycleControls, 'OBP menu CTA alternate lifecycle', 'src/app/client/obp/OBPMenuCTA.tsx', 3, {
  testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE', finalStatus: 'BLOCKED_MUTUALLY_EXCLUSIVE_OBP_PROJECT_COUNT_CTA_STATES_NOT_ALL_RENDERED',
});
verifyExactEvidenceActions(runtimeEvidence.obpMenuCtaAlternateLifecycleControls, 'OBP menu CTA alternate lifecycle', ['link@153', 'link@172', 'link@211']);
verifySingleSourceControlEvidence(runtimeEvidence.obpMenuCtaCommentCandidate, 'OBP menu CTA comment candidate', 'src/app/client/obp/OBPMenuCTA.tsx', 1, {
  testResult: 'PASS_NOT_USER_TRIGGERABLE', finalStatus: 'SOURCE_COMMENT_NOT_A_RENDERED_USER_CONTROL',
});
verifyExactEvidenceActions(runtimeEvidence.obpMenuCtaCommentCandidate, 'OBP menu CTA comment candidate', ['link@10']);
verifySingleSourceControlEvidence(runtimeEvidence.menuBreadcrumbAlternateLayoutControls, 'menu breadcrumb alternate layout', 'src/app/client/[[...slug]]/MenuBreadcrumb.tsx', 3, {
  testResult: 'BLOCKED_ALTERNATE_LIFECYCLE_STATE', finalStatus: 'BLOCKED_MUTUALLY_EXCLUSIVE_COMPACT_OUTLET_AND_PROJECT_BREADCRUMB_STATES_NOT_ALL_RENDERED',
});
verifyExactEvidenceActions(runtimeEvidence.menuBreadcrumbAlternateLayoutControls, 'menu breadcrumb alternate layout', ['link@268', 'link@330', 'link@342']);
verifySingleSourceControlEvidence(runtimeEvidence.globalErrorRuntimeControls, 'global error runtime controls', 'src/app/(global-pages)/error.tsx', 3, {
  testResult: 'PASS_LOCAL_CURRENT_CONTRACT', finalStatus: 'LOCAL_BEHAVIORAL_CONTRACT_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.globalErrorRuntimeControls, 'global error runtime controls', ['button@47', 'button@48', 'button@49']);
verifySingleSourceControlEvidence(runtimeEvidence.rootErrorRuntimeControls, 'root error runtime controls', 'src/app/error.tsx', 2, {
  testResult: 'PASS_LOCAL_CURRENT_CONTRACT', finalStatus: 'LOCAL_BEHAVIORAL_CONTRACT_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.rootErrorRuntimeControls, 'root error runtime controls', ['button@96', 'button@105']);
verifySingleSourceControlEvidence(runtimeEvidence.storeAccessRecoveryRuntimeControls, 'store-access recovery runtime controls', 'src/components/auth/StoreAccessRecovery.tsx', 2, {
  testResult: 'PASS_LOCAL_CURRENT_CONTRACT', finalStatus: 'LOCAL_BEHAVIORAL_CONTRACT_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.storeAccessRecoveryRuntimeControls, 'store-access recovery runtime controls', ['button@39', 'button@47']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileTextCaseReversibleControls, 'mobile Text Case reversible controls', 'src/components/mobile/sheets/TextCaseSheet.tsx', 3, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.mobileTextCaseReversibleControls, 'mobile Text Case reversible controls', ['button@87', 'selection@145', 'button@164']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileTextCaseMaskBoundaryControl, 'mobile Text Case mask boundary', 'src/components/mobile/sheets/TextCaseSheet.tsx', 1, {
  testResult: 'BLOCKED_BROWSER_INTERACTION_NOT_CAPTURED', finalStatus: 'BLOCKED_POPUP_MASK_DISMISSAL_NOT_INDEPENDENTLY_ACTIVATED',
});
verifyExactEvidenceActions(runtimeEvidence.mobileTextCaseMaskBoundaryControl, 'mobile Text Case mask boundary', ['dialog-action-surface@61']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileTextCaseApplySafetyControl, 'mobile Text Case apply safety boundary', 'src/components/mobile/sheets/TextCaseSheet.tsx', 1, {
  testResult: 'BLOCKED_SAFETY_BOUNDARY', finalStatus: 'BLOCKED_CANONICAL_MENU_TEXT_CASE_MUTATION_NOT_APPLIED',
});
verifyExactEvidenceActions(runtimeEvidence.mobileTextCaseApplySafetyControl, 'mobile Text Case apply safety boundary', ['button@167']);
verifySingleSourceControlEvidence(runtimeEvidence.decisionBlocksReversibleBrowserControls, 'decision-blocks reversible browser controls', 'src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx', 4, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.decisionBlocksReversibleBrowserControls, 'decision-blocks reversible browser controls', ['selection@225', 'selection@244', 'dialog-action-surface@297', 'disclosure@373']);
verifySingleSourceControlEvidence(runtimeEvidence.decisionBlocksSaveSafetyControl, 'decision-blocks save safety boundary', 'src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx', 1, {
  testResult: 'BLOCKED_SAFETY_BOUNDARY', finalStatus: 'BLOCKED_FEATURED_SECTION_PUBLIC_MUTATION_NOT_APPLIED',
});
verifyExactEvidenceActions(runtimeEvidence.decisionBlocksSaveSafetyControl, 'decision-blocks save safety boundary', ['button@319']);
verifySingleSourceControlEvidence(
  runtimeEvidence.decisionChoicePosterDesktopBrowserControl,
  'desktop saved-choice Campaign Poster',
  'src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx',
  1,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.decisionChoicePosterDesktopBrowserControl,
  'desktop saved-choice Campaign Poster',
  ['button@275'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.decisionChoicePosterMobileComponentControl,
  'mobile saved-choice Campaign Poster',
  'src/components/mobile/sheets/SmartRecommendationsSheet.tsx',
  1,
  {
    testResult: 'PASS_COMPONENT_RUNTIME_INTERACTION',
    finalStatus: 'LOCAL_COMPONENT_RUNTIME_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.decisionChoicePosterMobileComponentControl,
  'mobile saved-choice Campaign Poster',
  ['button@303'],
);
verifySingleSourceControlEvidence(runtimeEvidence.mobileNotificationReversibleBrowserControls, 'mobile notification reversible browser controls', 'src/components/mobile/screens/MobileNotificationSettingsScreen.tsx', 2, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.mobileNotificationReversibleBrowserControls, 'mobile notification reversible browser controls', ['selection@105', 'selection@137']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileNotificationWhatsAppFixtureControl, 'mobile notification WhatsApp fixture boundary', 'src/components/mobile/screens/MobileNotificationSettingsScreen.tsx', 1, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_VERIFIED_WHATSAPP_CONTACT_AND_CONSENT_FIXTURE_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.mobileNotificationWhatsAppFixtureControl, 'mobile notification WhatsApp fixture boundary', ['selection@153']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileNotificationSaveSafetyControl, 'mobile notification save safety boundary', 'src/components/mobile/screens/MobileNotificationSettingsScreen.tsx', 1, {
  testResult: 'BLOCKED_SAFETY_BOUNDARY', finalStatus: 'BLOCKED_MOBILE_NOTIFICATION_PREFERENCE_WRITE_NOT_APPLIED',
});
verifyExactEvidenceActions(runtimeEvidence.mobileNotificationSaveSafetyControl, 'mobile notification save safety boundary', ['button@168']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileAdvancedSocialEditorBrowserControls, 'mobile advanced social editor browser controls', 'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx', 2, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION', finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
verifyExactEvidenceActions(runtimeEvidence.mobileAdvancedSocialEditorBrowserControls, 'mobile advanced social editor browser controls', ['button@731', 'action-handler@770']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileAdvancedSocialExternalControl, 'mobile advanced social external boundary', 'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx', 1, {
  testResult: 'BLOCKED_EXTERNAL_HANDOFF', finalStatus: 'BLOCKED_OWNER_SOCIAL_PROFILE_EXTERNAL_HANDOFF_NOT_OPENED',
});
verifyExactEvidenceActions(runtimeEvidence.mobileAdvancedSocialExternalControl, 'mobile advanced social external boundary', ['button@555']);
verifySingleSourceControlEvidence(runtimeEvidence.mobileAdvancedSocialRemoveFixtureControl, 'mobile advanced social remove fixture boundary', 'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx', 1, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_EXISTING_PERSISTED_SOCIAL_LINK_FIXTURE_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.mobileAdvancedSocialRemoveFixtureControl, 'mobile advanced social remove fixture boundary', ['button@848']);
verifySingleSourceControlEvidence(runtimeEvidence.creativeEditorAlternateDraftQrControls, 'Creative Editor alternate draft and QR controls', 'src/modules/creative-editor/CreativeEditor.tsx', 4, {
  testResult: 'BLOCKED_FIXTURE_STATE', finalStatus: 'BLOCKED_BROWSER_AUTOSAVE_AND_LEGACY_NONWHITE_QR_FIXTURES_NOT_PRESENT',
});
verifyExactEvidenceActions(runtimeEvidence.creativeEditorAlternateDraftQrControls, 'Creative Editor alternate draft and QR controls', ['button@7307', 'button@7998', 'button@7999', 'button@9027']);
if (
  !/final owner and fresh public reads both show Filter Coffee available/.test(
    runtimeEvidence.mobileMenuControlInteractions?.publicTruthEvidence ?? '',
  )
) fail('Mobile Menu evidence must retain the final restored public-truth readback');
verifyMultiSourceControlEvidence(
  runtimeEvidence.mobileMenuNativeBoundaryControls,
  'Mobile Menu native boundary',
  mobileMenuRuntimeSources,
  2,
  {
    testResult: 'BLOCKED_BROWSER_NATIVE_BOUNDARY',
    finalStatus: 'BLOCKED_NATIVE_SHARE_AND_DOWNLOAD_ARTIFACT_NOT_INDEPENDENTLY_VERIFIED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileMenuNativeBoundaryControls,
  'Mobile Menu native boundary',
  ['input@1023', 'button@1031', 'button@1059', 'button@1065'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileItemEditAlternateFixtureControls,
  'Mobile item editor alternate fixture boundary',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  1,
  {
    testResult: 'BLOCKED_FIXTURE_STATE',
    finalStatus: 'BLOCKED_ALTERNATE_METADATA_AND_MULTILINGUAL_ITEM_FIXTURE_NOT_PRESENT',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileItemEditAlternateFixtureControls,
  'Mobile item editor alternate fixture boundary',
  ['button@833'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileItemEditProviderBoundaryControl,
  'Mobile item editor provider boundary',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  1,
  {
    testResult: 'BLOCKED_EXTERNAL_PROVIDER_EXECUTION',
    finalStatus: 'BLOCKED_AI_IMAGE_PROVIDER_NOT_EXECUTED',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileItemEditProviderBoundaryControl,
  'Mobile item editor provider boundary',
  ['button@1047'],
);
verifySingleSourceControlEvidence(
  runtimeEvidence.mobileItemProductTagCurrentIntegrationControl,
  'Mobile item Product Tag current integration',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
  1,
  {
    testResult: 'PASS_SHARED_BROWSER_AND_DETERMINISTIC_MOBILE_INTEGRATION',
    finalStatus: 'SHARED_MODAL_BROWSER_PASSED_AUTHENTICATED_PHYSICAL_MOBILE_DEVICE_PENDING',
  },
);
verifyExactEvidenceActions(
  runtimeEvidence.mobileItemProductTagCurrentIntegrationControl,
  'Mobile item Product Tag current integration',
  ['button@1075'],
);
const featureRegistry = fs.readFileSync(path.join(root, 'src/config/features.ts'), 'utf8');
if (
  !/ENABLE_OWNER_REFERRAL:\s*false/.test(featureRegistry)
  || !/ENABLE_OWNER_REFERRAL_REWARD_PROCESSING:\s*false/.test(featureRegistry)
  || !/OWNER_REFERRAL_PILOT_STORE_IDS:\s*\[\]/.test(featureRegistry)
) fail('Mobile Share owner-referral evidence requires the complete governed pilot boundary to remain disabled');
verifySingleSourceControlEvidence(
  runtimeEvidence.contactFormControlInteractions,
  'contact form',
  'src/components/website/contact/ContactPage.tsx',
  8,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.createMenuEntryControlInteractions,
  'create-menu entry',
  'src/app/(website)/create-menu/CreateMenuClient.tsx',
  5,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.hoursCheckControlInteractions,
  'hours check',
  'src/components/website/hoursCheck/HoursCheckPage.tsx',
  13,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.publicTruthCheckControlInteractions,
  'public truth check',
  'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx',
  10,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.photoGapCheckControlInteractions,
  'photo gap check',
  'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx',
  8,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.qrLinkHealthCheckControlInteractions,
  'QR link health check',
  'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx',
  8,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.googleProfileBasicsControlInteractions,
  'Google Profile Basics checklist',
  'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx',
  7,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.menuReadabilityControlInteractions,
  'menu readability check',
  'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx',
  9,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.socialBioLinkControlInteractions,
  'social bio link check',
  'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx',
  8,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.bookingInquiryControlInteractions,
  'booking inquiry readiness check',
  'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx',
  11,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.customerLinkPreviewControlInteractions,
  'customer link preview',
  'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx',
  7,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.priceAvailabilityControlInteractions,
  'price availability gap check',
  'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx',
  11,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.whatsappActionControlInteractions,
  'WhatsApp action link check',
  'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx',
  11,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.menuPdfCleanupControlInteractions,
  'menu PDF cleanup check',
  'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx',
  11,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.customerQuestionCoverageControlInteractions,
  'customer question coverage check',
  'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx',
  10,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.businessFactsCopyPackControlInteractions,
  'business facts copy pack',
  'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx',
  14,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.customerFaqReplyPackControlInteractions,
  'customer FAQ reply pack',
  'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx',
  15,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.whatsappReplyPackControlInteractions,
  'WhatsApp reply pack',
  'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx',
  15,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.printShareToolControlInteractions,
  'Print and Share tool family',
  'src/components/website/printShareTools/PrintShareToolPage.tsx',
  10,
);
verifySingleSourceControlEvidence(
  runtimeEvidence.toolReportControlInteractions,
  'shareable tool report',
  'src/components/website/toolReports/ToolReportPage.tsx',
  12,
);
const publicToolFollowupSourceFiles = [
  'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx',
  'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx',
  'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx',
  'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx',
  'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx',
  'src/components/website/hoursCheck/HoursCheckPage.tsx',
  'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx',
  'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx',
  'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx',
  'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx',
  'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx',
  'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx',
  'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx',
  'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx',
];
const publicToolFollowupManifest = createHash('sha256');
for (const relativePath of publicToolFollowupSourceFiles) {
  publicToolFollowupManifest.update(relativePath);
  publicToolFollowupManifest.update('\0');
  publicToolFollowupManifest.update(fs.readFileSync(path.join(root, relativePath)));
  publicToolFollowupManifest.update('\0');
}
if (
  runtimeEvidence.publicToolFollowupControlInteractions?.sourceManifestSha256
  !== publicToolFollowupManifest.digest('hex')
) fail('public-tool follow-up local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.publicToolFollowupControlInteractions,
  'public-tool follow-up local',
  84,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
if (
  runtimeEvidence.publicToolReportActionControlInteractions?.sourceManifestSha256
  !== runtimeEvidence.publicToolFollowupControlInteractions?.sourceManifestSha256
) fail('public-tool report-action local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.publicToolReportActionControlInteractions,
  'public-tool report action local',
  60,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const customerLinkSocialBioSourceFiles = [
  'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx',
  'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx',
];
const customerLinkSocialBioManifest = createHash('sha256');
for (const relativePath of customerLinkSocialBioSourceFiles) {
  customerLinkSocialBioManifest.update(relativePath);
  customerLinkSocialBioManifest.update('\0');
  customerLinkSocialBioManifest.update(fs.readFileSync(path.join(root, relativePath)));
  customerLinkSocialBioManifest.update('\0');
}
if (
  runtimeEvidence.customerLinkSocialBioCompletionControlInteractions?.sourceManifestSha256
  !== customerLinkSocialBioManifest.digest('hex')
) fail('customer-link/social-bio completion local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.customerLinkSocialBioCompletionControlInteractions,
  'customer-link/social-bio completion local',
  24,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websitePreferenceSourceFiles = [
  'src/components/website/shared/StickyCta.tsx',
  'src/components/website/shared/WebsiteThemeSwitcher.tsx',
  'src/components/website/shared/WebsiteLanguageSwitcher.tsx',
  'src/components/website/shared/WebsiteAnalyticsPreferencesButton.tsx',
  'src/components/website/shared/ScrollToTopButton.tsx',
];
const websitePreferenceManifest = createHash('sha256');
for (const relativePath of websitePreferenceSourceFiles) {
  websitePreferenceManifest.update(relativePath);
  websitePreferenceManifest.update('\0');
  websitePreferenceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websitePreferenceManifest.update('\0');
}
if (
  runtimeEvidence.websitePreferenceControlInteractions?.sourceManifestSha256
  !== websitePreferenceManifest.digest('hex')
) fail('website preference local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websitePreferenceControlInteractions,
  'website preference local',
  6,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteHomepageSourceFiles = [
  'src/components/website/home/BeforeAfterSection.tsx',
  'src/components/website/home/CreateMenuPreviewSection.tsx',
  'src/components/website/home/FaqSection.tsx',
  'src/components/website/home/FinalCtaSection.tsx',
  'src/components/website/home/HeroSection.tsx',
  'src/components/website/home/OwnerProofSection.tsx',
];
const websiteHomepageManifest = createHash('sha256');
for (const relativePath of websiteHomepageSourceFiles) {
  websiteHomepageManifest.update(relativePath);
  websiteHomepageManifest.update('\0');
  websiteHomepageManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteHomepageManifest.update('\0');
}
if (
  runtimeEvidence.websiteHomepageControlInteractions?.sourceManifestSha256
  !== websiteHomepageManifest.digest('hex')
) fail('website homepage local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteHomepageControlInteractions,
  'website homepage local',
  10,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteFaqSourceFiles = [
  'src/components/website/faq/FaqPage.tsx',
];
const websiteFaqManifest = createHash('sha256');
for (const relativePath of websiteFaqSourceFiles) {
  websiteFaqManifest.update(relativePath);
  websiteFaqManifest.update('\0');
  websiteFaqManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteFaqManifest.update('\0');
}
if (
  runtimeEvidence.websiteFaqControlInteractions?.sourceManifestSha256
  !== websiteFaqManifest.digest('hex')
) fail('website FAQ local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteFaqControlInteractions,
  'website FAQ local',
  3,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteIndustrySourceFiles = [
  'src/components/website/industries/IndustryLandingPage.tsx',
  'src/content/websiteIndustries.ts',
];
const websiteIndustryManifest = createHash('sha256');
for (const relativePath of websiteIndustrySourceFiles) {
  websiteIndustryManifest.update(relativePath);
  websiteIndustryManifest.update('\0');
  websiteIndustryManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteIndustryManifest.update('\0');
}
if (
  runtimeEvidence.websiteIndustryControlInteractions?.sourceManifestSha256
  !== websiteIndustryManifest.digest('hex')
) fail('website industry local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteIndustryControlInteractions,
  'website industry local',
  4,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteInformationalSourceFiles = [
  'src/components/website/about/AboutPage.tsx',
  'src/components/website/product/ProductPage.tsx',
  'src/components/website/trust-security/TrustSecurityPage.tsx',
  'src/components/website/legal/RefundPolicyPage.tsx',
  'src/components/website/legal/TermsOfServicePage.tsx',
  'src/components/website/developers/DevelopersPage.tsx',
  'src/components/website/get-started/GetStartedPage.tsx',
  'src/components/website/shared/WebsitePageHero.tsx',
];
const websiteInformationalManifest = createHash('sha256');
for (const relativePath of websiteInformationalSourceFiles) {
  websiteInformationalManifest.update(relativePath);
  websiteInformationalManifest.update('\0');
  websiteInformationalManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteInformationalManifest.update('\0');
}
if (
  runtimeEvidence.websiteInformationalControlInteractions?.sourceManifestSha256
  !== websiteInformationalManifest.digest('hex')
) fail('website informational-page local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteInformationalControlInteractions,
  'website informational-page local',
  10,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteWhatsappSourceFile = 'src/components/website/whatsapp/WhatsAppOnboardingPage.tsx';
const websiteWhatsappManifest = createHash('sha256');
websiteWhatsappManifest.update(websiteWhatsappSourceFile);
websiteWhatsappManifest.update('\0');
websiteWhatsappManifest.update(fs.readFileSync(path.join(root, websiteWhatsappSourceFile)));
websiteWhatsappManifest.update('\0');
if (
  runtimeEvidence.websiteWhatsappControlInteractions?.sourceManifestSha256
  !== websiteWhatsappManifest.digest('hex')
) fail('website WhatsApp local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteWhatsappControlInteractions,
  'website WhatsApp local',
  4,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteResourceArticleSourceFiles = [
  'src/components/website/resources/ArticleLayout.tsx',
  'src/components/website/resources/ArticleSection.tsx',
  'src/components/website/resources/ResourceTrackedLink.tsx',
];
const websiteResourceArticleManifest = createHash('sha256');
for (const relativePath of websiteResourceArticleSourceFiles) {
  websiteResourceArticleManifest.update(relativePath);
  websiteResourceArticleManifest.update('\0');
  websiteResourceArticleManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteResourceArticleManifest.update('\0');
}
if (
  runtimeEvidence.websiteResourceArticleControlInteractions?.sourceManifestSha256
  !== websiteResourceArticleManifest.digest('hex')
) fail('website resource-article local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteResourceArticleControlInteractions,
  'website resource-article local',
  3,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websitePublicFeatureSourceFiles = [
  'src/components/website/features/BusinessHealthFeaturePage.tsx',
  'src/components/website/ai-menu-manager/AiMenuManagerPage.tsx',
  'src/components/website/features/FeatureDetailPage.tsx',
  'src/components/website/features/FeatureDetailJourney.tsx',
  'src/components/website/features/FeaturesPage.tsx',
  'src/components/website/multi-location/MultiLocationPage.tsx',
  'src/components/website/toolsHub/ToolsHubPage.tsx',
  'src/components/website/shared/WebsiteLink.tsx',
];
const websitePublicFeatureManifest = createHash('sha256');
for (const relativePath of websitePublicFeatureSourceFiles) {
  websitePublicFeatureManifest.update(relativePath);
  websitePublicFeatureManifest.update('\0');
  websitePublicFeatureManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websitePublicFeatureManifest.update('\0');
}
if (
  runtimeEvidence.websitePublicFeatureControlInteractions?.sourceManifestSha256
  !== websitePublicFeatureManifest.digest('hex')
) fail('website public-feature local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websitePublicFeatureControlInteractions,
  'website public-feature local',
  25,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const websiteFooterSourceFiles = [
  'src/components/website/Footer.tsx',
  'src/components/website/SchemaMarkup.tsx',
];
const websiteFooterManifest = createHash('sha256');
for (const relativePath of websiteFooterSourceFiles) {
  websiteFooterManifest.update(relativePath);
  websiteFooterManifest.update('\0');
  websiteFooterManifest.update(fs.readFileSync(path.join(root, relativePath)));
  websiteFooterManifest.update('\0');
}
if (
  runtimeEvidence.websiteFooterControlInteractions?.sourceManifestSha256
  !== websiteFooterManifest.digest('hex')
) fail('website footer local control evidence is stale');
verifyControlEvidenceSet(
  runtimeEvidence.websiteFooterControlInteractions,
  'website footer local',
  9,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const apiAnonymousBoundaryEvidence = runtimeEvidence.apiAnonymousBoundary;
if (apiAnonymousBoundaryEvidence?.result !== 'PASS') fail('anonymous API boundary evidence is not passing');
if (
  apiAnonymousBoundaryEvidence.handlers !== 141
  || apiAnonymousBoundaryEvidence.methodProbes !== 162
) fail('anonymous API boundary evidence must cover 141 handlers and 162 exported methods');
const currentApiRouteManifestSha256 = createHash('sha256')
  .update(menuListRouteHandlers.map((row) => [
    row.route_or_component,
    row.control_or_action,
    row.role,
    row.screen_or_tab,
  ].join('|')).join('\n'))
  .digest('hex');
if (apiAnonymousBoundaryEvidence.routeManifestSha256 !== currentApiRouteManifestSha256) {
  fail('anonymous API boundary evidence is stale for the current route/method/access manifest');
}
if (Object.keys(apiAnonymousBoundaryEvidence.statusCounts || {}).some((status) => Number(status) >= 500)) {
  fail('anonymous API boundary evidence must not contain 5xx responses');
}
const publicWebsiteRouteRenderEvidence = runtimeEvidence.publicWebsiteRouteRender;
if (publicWebsiteRouteRenderEvidence?.result !== 'PASS') {
  fail('public website route-render evidence is not passing');
}
const publicSitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const publicSitemapPaths = [...publicSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => new URL(match[1]).pathname);
const currentPublicRouteManifestSha256 = createHash('sha256')
  .update(publicSitemapPaths.join('\n'))
  .digest('hex');
if (
  publicSitemapPaths.length !== 186
  || publicWebsiteRouteRenderEvidence.sitemapRouteCount !== 186
  || publicWebsiteRouteRenderEvidence.uniqueRouteCount !== 186
  || publicWebsiteRouteRenderEvidence.routeManifestSha256 !== currentPublicRouteManifestSha256
) fail('public website route-render evidence is incomplete or stale for the current sitemap');
const browserRenderedWebsitePages = objects.filter((row) => (
  row.product_area === 'MenuList'
  && row.item_type === 'page'
  && row.screen_or_tab.startsWith('src/app/(website)/')
  && row.test_result === 'PASS_BROWSER_RENDER'
));
if (browserRenderedWebsitePages.length !== 62) {
  fail(`expected 62 sitemap-backed website page patterns, found ${browserRenderedWebsitePages.length}`);
}
for (const row of browserRenderedWebsitePages) {
  if (row.final_verification_status !== 'RENDER_PASSED_CONTROL_INTERACTION_PENDING') {
    fail(`website page ${row.route_or_component} is missing bounded render evidence`);
  }
}
const localPageRenderEvidence = runtimeEvidence.currentLocalProductionRouteSmoke;
const nonDynamicMenuListPageRoutes = [...new Set(objects
  .filter((row) => (
    row.item_type === 'page'
    && row.product_area === 'MenuList'
    && !row.route_or_component.includes('[')
  ))
  .map((row) => row.route_or_component))]
  .sort();
const currentLocalPageManifestSha256 = createHash('sha256')
  .update(nonDynamicMenuListPageRoutes.join('\n'))
  .digest('hex');
if (
  localPageRenderEvidence?.result !== 'PASS_RENDER_BOUNDARY'
  || localPageRenderEvidence.nonDynamicMenuListPageRoutes !== nonDynamicMenuListPageRoutes.length
  || localPageRenderEvidence.routeManifestSha256 !== currentLocalPageManifestSha256
) fail('local non-dynamic page-render evidence is incomplete or stale');
for (const row of objects.filter((candidate) => (
  candidate.item_type === 'page'
  && candidate.product_area === 'MenuList'
  && !candidate.route_or_component.includes('[')
))) {
  const acceptedResults = new Set([
    'PASS_BROWSER_RENDER',
    'PASS_AUTHENTICATED_RENDER',
    'PASS_ACCESS_BOUNDARY',
    'PASS_LOCAL_HTTP_RENDER',
  ]);
  if (!acceptedResults.has(row.test_result)) {
    fail(`non-dynamic page ${row.route_or_component} is missing current render/access evidence`);
  }
}
const dynamicRouteRecoveryEvidence = runtimeEvidence.dynamicRouteRecoveryBoundary;
const dynamicRouteRecoverySourceFiles = [
  'src/app/(global-pages)/msg-preview/[sessionId]/page.tsx',
  'src/app/(website)/create-menu/preview/[draftId]/page.tsx',
  'src/app/client/[[...slug]]/page.tsx',
  'src/app/feedback/[projectId]/page.tsx',
  'src/app/feedback/[projectId]/not-found.tsx',
  'src/app/screen/[token]/page.tsx',
  'src/app/not-found.tsx',
  'src/proxy.ts',
];
const dynamicRouteRecoveryHash = createHash('sha256');
for (const relativePath of dynamicRouteRecoverySourceFiles) {
  dynamicRouteRecoveryHash.update(relativePath);
  dynamicRouteRecoveryHash.update('\0');
  dynamicRouteRecoveryHash.update(fs.readFileSync(path.join(root, relativePath)));
  dynamicRouteRecoveryHash.update('\0');
}
if (
  dynamicRouteRecoveryEvidence?.result !== 'PASS_INVALID_STATE_RECOVERY'
  || dynamicRouteRecoveryEvidence.sourceManifestSha256 !== dynamicRouteRecoveryHash.digest('hex')
) fail('dynamic route recovery evidence is incomplete or stale');
const expectedDynamicRecoveryRoutes = new Set([
  '/msg-preview/[sessionId]',
  '/create-menu/preview/[draftId]',
  '/client/[[...slug]]',
  '/feedback/[projectId]',
  '/screen/[token]',
]);
const dynamicRecoveryPages = objects.filter((candidate) => (
  candidate.item_type === 'page'
  && candidate.product_area === 'MenuList'
  && expectedDynamicRecoveryRoutes.has(candidate.route_or_component)
));
if (dynamicRecoveryPages.length !== expectedDynamicRecoveryRoutes.size) {
  fail(`expected five recovery-specific MenuList dynamic pages, found ${dynamicRecoveryPages.length}`);
}
for (const row of dynamicRecoveryPages) {
  if (
    row.test_result !== 'PASS_INVALID_STATE_RECOVERY'
    || row.final_verification_status !== 'INVALID_STATE_RECOVERY_PASSED_VALID_STATE_SEPARATELY_SCOPED'
  ) fail(`dynamic page ${row.route_or_component} is missing source-current recovery evidence`);
}
const appShellCompositionEvidence = runtimeEvidence.appShellCompositionBoundary;
const appShellCompositionSourceFiles = [
  'src/app/(global-pages)/layout.tsx',
  'src/app/(global-pages)/msg-preview/[sessionId]/layout.tsx',
  'src/app/(main)/layout.tsx',
  'src/app/(main)/ops/layout.tsx',
  'src/app/(main)/platform/layout.tsx',
  'src/app/(main)/reseller/layout.tsx',
  'src/app/(main)/reseller/manage/layout.tsx',
  'src/app/(website)/[locale]/layout.tsx',
  'src/app/(website)/layout.tsx',
  'src/app/client/layout.tsx',
  'src/app/layout.tsx',
  'src/app/client/not-found.tsx',
  'src/app/feedback/[projectId]/not-found.tsx',
  'src/app/not-found.tsx',
  'src/app/loading.tsx',
];
const appShellCompositionHash = createHash('sha256');
for (const relativePath of appShellCompositionSourceFiles) {
  appShellCompositionHash.update(relativePath);
  appShellCompositionHash.update('\0');
  appShellCompositionHash.update(fs.readFileSync(path.join(root, relativePath)));
  appShellCompositionHash.update('\0');
}
if (
  appShellCompositionEvidence?.result !== 'PASS_COMPOSED_RUNTIME_BOUNDARY'
  || appShellCompositionEvidence.sourceManifestSha256 !== appShellCompositionHash.digest('hex')
) fail('app shell composition evidence is incomplete or stale');
const composedSpecialRows = objects.filter((candidate) => (
  candidate.product_area === 'MenuList'
  && appShellCompositionSourceFiles.includes(candidate.screen_or_tab)
));
if (composedSpecialRows.length !== appShellCompositionSourceFiles.length) {
  fail(`expected ${appShellCompositionSourceFiles.length} composed special rows, found ${composedSpecialRows.length}`);
}
for (const row of composedSpecialRows) {
  if (
    row.test_result !== 'PASS_COMPOSED_RUNTIME_BOUNDARY'
    || row.final_verification_status !== 'COMPOSED_RUNTIME_BOUNDARY_PASSED'
  ) fail(`special file ${row.screen_or_tab} is missing composed runtime evidence`);
}
const appErrorBoundaryRuntimeEvidence = runtimeEvidence.appErrorBoundaryRuntime;
const appErrorBoundarySourceFiles = [
  'src/app/(global-pages)/error.tsx',
  'src/app/client/error.tsx',
  'src/app/error.tsx',
];
const appErrorBoundaryHash = createHash('sha256');
for (const relativePath of appErrorBoundarySourceFiles) {
  appErrorBoundaryHash.update(relativePath);
  appErrorBoundaryHash.update('\0');
  appErrorBoundaryHash.update(fs.readFileSync(path.join(root, relativePath)));
  appErrorBoundaryHash.update('\0');
}
if (
  appErrorBoundaryRuntimeEvidence?.result !== 'PASS_COMPONENT_RUNTIME'
  || appErrorBoundaryRuntimeEvidence.sourceManifestSha256 !== appErrorBoundaryHash.digest('hex')
) fail('App Router error-boundary runtime evidence is incomplete or stale');
const appErrorRows = objects.filter((candidate) => (
  candidate.product_area === 'MenuList'
  && appErrorBoundarySourceFiles.includes(candidate.screen_or_tab)
));
if (appErrorRows.length !== appErrorBoundarySourceFiles.length) {
  fail(`expected three MenuList error-boundary rows, found ${appErrorRows.length}`);
}
for (const row of appErrorRows) {
  if (
    row.test_result !== 'PASS_COMPONENT_RUNTIME'
    || row.final_verification_status !== 'COMPONENT_RUNTIME_PASSED'
    || row.regression_test_added !== 'YES'
  ) fail(`error boundary ${row.screen_or_tab} is missing component-runtime evidence`);
}
if (packageJson.scripts?.['test:menulist-app-special-states'] === undefined) {
  fail('MenuList App Router special-state runtime regression is not registered');
}
for (const row of menuListRouteHandlers) {
  if (
    row.test_result !== 'PASS_ANONYMOUS_BOUNDARY'
    || row.final_verification_status !== 'ANONYMOUS_BOUNDARY_PASSED_FUNCTIONAL_STATE_PENDING'
  ) fail(`route handler ${row.route_or_component} is missing bounded anonymous runtime evidence`);
}
for (const row of mainPages) {
  for (const column of [
    'role',
    'tenant_state',
    'store_state',
    'subscription_or_entitlement_state',
    'feature_flag_state',
    'viewport',
  ]) {
    if (!row[column] || row[column].startsWith('DERIVE_')) {
      fail(`private page ${row.route_or_component} has unresolved ${column}`);
    }
  }
  const hasAccessBoundary = (
    row.test_result === 'PASS_ACCESS_BOUNDARY'
    && row.final_verification_status === 'ACCESS_PASSED_FUNCTIONAL_INTERACTION_PENDING'
  );
  const hasAuthenticatedRender = (
    row.test_result === 'PASS_AUTHENTICATED_RENDER'
    && row.final_verification_status === 'AUTHENTICATED_RENDER_PASSED_CONTROL_INTERACTION_PENDING'
  );
  if (!hasAccessBoundary && !hasAuthenticatedRender) {
    fail(`private page ${row.route_or_component} is missing bounded browser evidence`);
  }
}
const recoveryRoutes = mainPages
  .filter((row) => row.subscription_or_entitlement_state.includes('UNPAID'))
  .map((row) => row.route_or_component)
  .sort();
const expectedRecoveryRoutes = ['/billing', '/help-center', '/help-center/[...segments]'].sort();
if (JSON.stringify(recoveryRoutes) !== JSON.stringify(expectedRecoveryRoutes)) {
  fail(`owner recovery route inventory drifted: ${recoveryRoutes.join(', ')}`);
}
const desktopOnlyPrivatePages = mainPages.filter((row) => row.viewport === 'DESKTOP_ONLY');
if (
  desktopOnlyPrivatePages.length !== 1
  || desktopOnlyPrivatePages[0].route_or_component !== '/platform/test-sentry'
) fail('private viewport inventory must retain only /platform/test-sentry as desktop-only');
const allControls = objects.filter((row) => row.item_type === 'user-control-candidate');
const formContainerFalsePositives = allControls.filter((row) => (
  row.control_or_action.startsWith('form@')
  && !/<(?:form\b|Form(?!\.)\b)/.test(
    fs.readFileSync(path.join(root, row.route_or_component), 'utf8')
      .split(/\r?\n/)[Number(row.control_or_action.slice('form@'.length)) - 1]
      ?? '',
  )
));
if (formContainerFalsePositives.length > 0) {
  fail(`${formContainerFalsePositives.length} non-form source lines are misclassified as controls`);
}
const menuListControls = allControls.filter((row) => row.product_area === 'MenuList');
const unresolvedRenderTree = menuListControls.filter((row) => row.screen_or_tab === 'DERIVE_FROM_RENDER_TREE');
if (unresolvedRenderTree.length > 0) fail(`${unresolvedRenderTree.length} MenuList controls still lack static page reachability`);
const staticallyReachedControls = menuListControls.filter((row) => row.screen_or_tab !== 'UNREACHED_BY_APP_PAGE_STATIC_GRAPH');
const staticallyUnreachedControls = menuListControls.filter((row) => row.screen_or_tab === 'UNREACHED_BY_APP_PAGE_STATIC_GRAPH');
const staticallyHiddenControls = menuListControls.filter((row) => row.final_verification_status === 'STATICALLY_HIDDEN_NOT_USER_TRIGGERABLE');
const staticallyDisabledControls = menuListControls.filter((row) => row.final_verification_status === 'STATICALLY_DISABLED_NOT_USER_TRIGGERABLE');
for (const row of staticallyHiddenControls) {
  if (
    row.test_result !== 'PASS_NOT_USER_TRIGGERABLE'
    || row.test_type !== 'static-hidden-control-contract'
    || row.regression_test_added !== 'YES'
  ) fail(`statically hidden control ${row.inventory_id} lacks the non-user-triggerable contract`);
}
for (const row of staticallyDisabledControls) {
  if (
    row.test_result !== 'PASS_NOT_USER_TRIGGERABLE'
    || row.test_type !== 'static-disabled-control-contract'
    || row.regression_test_added !== 'YES'
  ) fail(`statically disabled control ${row.inventory_id} lacks the non-user-triggerable contract`);
}
const bareDisabledLineCache = new Map();
function getBareDisabledControlLines(relativePath) {
  if (bareDisabledLineCache.has(relativePath)) return bareDisabledLineCache.get(relativePath);
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith('.tsx') || relativePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lines = new Set();
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const hasBareDisabledAttribute = node.attributes.properties.some((property) => (
        ts.isJsxAttribute(property)
        && property.name.text === 'disabled'
        && property.initializer === undefined
      ));
      if (hasBareDisabledAttribute) {
        lines.add(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  bareDisabledLineCache.set(relativePath, lines);
  return lines;
}
const bareDisabledMenuListControls = menuListControls.filter((row) => {
  const separator = row.control_or_action.lastIndexOf('@');
  const sourceLine = Number(row.control_or_action.slice(separator + 1));
  return getBareDisabledControlLines(row.route_or_component).has(sourceLine);
});
for (const row of bareDisabledMenuListControls) {
  if (row.final_verification_status !== 'STATICALLY_DISABLED_NOT_USER_TRIGGERABLE') {
    fail(`bare disabled control ${row.inventory_id} must be statically classified as non-user-triggerable`);
  }
}
if (!bareDisabledMenuListControls.some((row) => (
  row.route_or_component === 'src/components/templates/main-app/businessSettings/tabs/BasicInfoTab.tsx'
  && row.control_or_action === 'input@196'
))) fail('Business Settings disabled Domain field must be classified as non-user-triggerable');
const shareableReportHoneypot = staticallyHiddenControls.find((row) => (
  row.route_or_component === 'src/components/website/toolReports/ToolReportPage.tsx'
  && row.control_or_action === 'input@551'
));
if (!shareableReportHoneypot) fail('shareable tool-report honeypot must remain classified as hidden and non-user-triggerable');
const officialPageHiddenAccentField = staticallyHiddenControls.find((row) => (
  row.route_or_component === 'src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx'
  && row.control_or_action === 'input@851'
));
if (!officialPageHiddenAccentField) fail('Official Page hidden accent form field must remain classified as non-user-triggerable');
const creativeEditorHiddenFileInputs = staticallyHiddenControls.filter((row) => (
  row.route_or_component === 'src/modules/creative-editor/CreativeEditor.tsx'
  && ['input@7776', 'input@7787', 'input@7799'].includes(row.control_or_action)
));
if (creativeEditorHiddenFileInputs.length !== 3) {
  fail('Creative Editor hidden file inputs must remain classified as non-user-triggerable');
}
const controlKindsBySourceLine = new Map();
for (const row of allControls) {
  const separator = row.control_or_action.lastIndexOf('@');
  if (separator < 0) fail(`control ${row.inventory_id} has no source-line identity`);
  const sourceLine = `${row.route_or_component}@${row.control_or_action.slice(separator + 1)}`;
  const kinds = controlKindsBySourceLine.get(sourceLine) ?? [];
  kinds.push(row.control_or_action.slice(0, separator));
  controlKindsBySourceLine.set(sourceLine, kinds);
}
for (const sourceRoot of ['src/components', 'src/modules', 'src/app']) {
  const pending = [path.join(root, sourceRoot)];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) pending.push(path.join(current, entry));
      continue;
    }
    if (!/\.(?:tsx?|jsx?)$/.test(current)) continue;
    const relativeSource = path.relative(root, current).split(path.sep).join('/');
    const source = fs.readFileSync(current, 'utf8');
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      for (const [tag, expectedKind] of INTERACTIVE_JSX_TAG_KINDS) {
        if (!new RegExp(`<${tag}\\b`).test(lines[index])) continue;
        const sourceLine = `${relativeSource}@${index + 1}`;
        const discoveredKinds = controlKindsBySourceLine.get(sourceLine) ?? [];
        if (!discoveredKinds.includes(expectedKind)) {
          fail(`${sourceLine} omits interactive <${tag}> as ${expectedKind}`);
        }
      }
    }
    for (const lineNumber of keyedMenuActionsByLine(source, relativeSource).keys()) {
      const sourceLine = `${relativeSource}@${lineNumber}`;
      const discoveredKinds = controlKindsBySourceLine.get(sourceLine) ?? [];
      if (!discoveredKinds.includes('menu-action')) {
        fail(`${sourceLine} omits keyed menu action`);
      }
    }
    for (const lineNumber of jsxBackingHandlerLines(source, relativeSource)) {
      const sourceLine = `${relativeSource}@${lineNumber}`;
      const discoveredKinds = controlKindsBySourceLine.get(sourceLine) ?? [];
      if (discoveredKinds.includes('action-handler')) {
        fail(`${sourceLine} double-counts a multiline concrete control and its backing action handler`);
      }
    }
  }
}
const mobileMoreSource = 'src/components/mobile/screens/MobileMoreScreen.tsx';
const mobileMoreActions = keyedMenuActionsByLine(
  fs.readFileSync(path.join(root, mobileMoreSource), 'utf8'),
  mobileMoreSource,
);
const answerlatticeMobileMoreRows = allControls.filter((row) => (
  row.route_or_component === mobileMoreSource
  && row.control_or_action.startsWith('menu-action@')
  && ANSWERLATTICE_MOBILE_MORE_ACTION_KEYS.has(
    mobileMoreActions.get(Number(row.control_or_action.slice('menu-action@'.length))),
  )
));
if (
  answerlatticeMobileMoreRows.length !== ANSWERLATTICE_MOBILE_MORE_ACTION_KEYS.size
  || answerlatticeMobileMoreRows.some((row) => row.product_area !== 'Answerlattice boundary')
) fail('all Answerlattice Mobile More actions must remain outside the MenuList certification denominator');
const answerlatticeLegacyComponentControls = allControls.filter((row) => (
  ANSWERLATTICE_LEGACY_COMPONENT_PREFIXES.some((prefix) => (
    row.route_or_component.startsWith(prefix)
  ))
));
if (
  answerlatticeLegacyComponentControls.length !== 264
  || answerlatticeLegacyComponentControls.some((row) => row.product_area !== 'Answerlattice boundary')
) fail('all legacy Answerlattice component controls must remain outside the MenuList certification denominator');
for (const [sourceLine, kinds] of controlKindsBySourceLine) {
  const concreteKinds = kinds.filter((kind) => [
    'button',
    'link',
    'form',
    'input',
    'selection',
    'disclosure',
    'dialog-action-surface',
    'upload',
  ].includes(kind));
  if (kinds.includes('action-handler') && concreteKinds.length > 0) {
    fail(`${sourceLine} double-counts a concrete control and its backing action handler`);
  }
  if (kinds.includes('upload') && kinds.includes('input')) {
    fail(`${sourceLine} double-counts one file upload as both input and upload`);
  }
}
for (const row of staticallyUnreachedControls) {
  if (
    row.test_result !== 'PASS_NOT_SHIPPED'
    || row.test_type !== 'static-app-page-reachability'
    || row.final_verification_status !== 'SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE'
  ) fail(`statically unreachable control ${row.inventory_id} lacks an explicit non-shipped classification`);
}
if (staticallyReachedControls.length / menuListControls.length < 0.95) {
  fail(`only ${staticallyReachedControls.length}/${menuListControls.length} MenuList controls map to an App Router page`);
}
if (!/\.ws-drawer-brand\s*\{[^}]*min-height:\s*2\.75rem;/s.test(websiteStyles)) {
  fail('mobile drawer brand target must retain a 44px minimum height');
}
if (
  fs.existsSync(path.join(root, 'public/sitemap.xml'))
  && fs.existsSync(path.join(root, 'src/app/sitemap.ts'))
) fail('public/sitemap.xml conflicts with the App Router sitemap route');
const mixedAnswerlattice = objects.find((row) => (
  row.product_area === 'MenuList'
  && row.item_type !== 'user-control-candidate'
  && /answerlattice/i.test(`${row.route_or_component} ${row.screen_or_tab}`)
));
if (mixedAnswerlattice) fail(`Answerlattice boundary misclassified at ${mixedAnswerlattice.inventory_id}`);
const answerlatticeLegacyPlatformRoutes = [
  '/platform/changelog',
  '/platform/chat-backfill',
  '/platform/chat-insights',
  '/platform/chat-management',
  '/platform/chat-roi-calculator',
  '/platform/chat-weekly-digest',
  '/platform/feedback-admin',
  '/platform/kb-generation',
  '/platform/knowledge-base',
  '/platform/support-tickets',
];
for (const route of answerlatticeLegacyPlatformRoutes) {
  const routeRows = objects.filter((row) => row.item_type !== 'user-control-candidate' && row.route_or_component === route);
  if (!routeRows.length || routeRows.some((row) => row.product_area !== 'Answerlattice boundary')) {
    fail(`legacy Answerlattice platform route ${route} is not isolated from MenuList certification`);
  }
}
const misplacedSharedHelpCenter = objects.find((row) => (
  row.item_type === 'user-control-candidate'
  && row.route_or_component.startsWith('src/components/templates/main-app/helpCenter/')
  && row.product_area !== 'Answerlattice boundary'
));
if (misplacedSharedHelpCenter) {
  fail(`shared Answerlattice Help Center control misclassified at ${misplacedSharedHelpCenter.inventory_id}`);
}
for (const [evidenceSet, label, source, actions] of [
  [runtimeEvidence.starRatingRuntimeControl, 'Star Rating component runtime', 'src/components/atoms/GuestFeedbackForm/StarRating.tsx', ['button@39']],
  [runtimeEvidence.mediaAspectRatioRuntimeControl, 'media aspect-ratio component runtime', 'src/components/shared/media/MediaAspectRatioSelector.tsx', ['button@50']],
  [runtimeEvidence.ownerAssistantInputRuntimeControls, 'owner assistant input component runtime', 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantInput.tsx', ['input@23', 'button@33']],
  [runtimeEvidence.reorderSortableItemRuntimeControls, 'reorder item component runtime', 'src/components/templates/main-app/projects/editorView/ReorderSortableItem.tsx', ['button@51', 'button@76']],
  [runtimeEvidence.analyticsEmptyStateRuntimeControl, 'analytics empty-state component runtime', 'src/components/analytics/EmptyState.tsx', ['button@58']],
  [runtimeEvidence.analyticsRefreshRuntimeControl, 'analytics refresh component runtime', 'src/components/analytics/RefreshButton.tsx', ['button@47']],
  [runtimeEvidence.analyticsMetricCardRuntimeControl, 'analytics metric-card component runtime', 'src/components/analytics/MetricCard.tsx', ['action-handler@66']],
  [runtimeEvidence.analyticsStatCardRuntimeControl, 'analytics statistic-card component runtime', 'src/components/analytics/StatCard.tsx', ['action-handler@82']],
  [runtimeEvidence.mobileLocalizedLanguageRuntimeControl, 'mobile localized-language component runtime', 'src/components/mobile/components/MobileLocalizedLanguageSelector.tsx', ['selection@32']],
  [runtimeEvidence.searchSuggestionsRuntimeControl, 'search-suggestions component runtime', 'src/components/molecules/SearchSuggestions/index.tsx', ['action-handler@114']],
  [runtimeEvidence.businessHealthSuggestedQuestionRuntimeControl, 'business-health suggested-question component runtime', 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthSuggestedQuestions.tsx', ['button@25']],
  [runtimeEvidence.ownerAssistantSourceDisclosureRuntimeControl, 'owner-assistant source-disclosure component runtime', 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure.tsx', ['disclosure@15']],
  [runtimeEvidence.menuFilterChipsRuntimeControl, 'public menu-filter chips component runtime', 'src/components/templates/main-app/projects/b2cView/output/MenuFilterChips.tsx', ['button@210']],
  [runtimeEvidence.analyticsDataTableSearchRuntimeControl, 'analytics data-table search component runtime', 'src/components/analytics/DataTable.tsx', ['input@125']],
  [runtimeEvidence.analyticsFeedbackListRuntimeControl, 'analytics feedback-list component runtime', 'src/components/analytics/FeedbackList.tsx', ['action-handler@74']],
  [runtimeEvidence.analyticsKnowledgeGapsRuntimeControl, 'analytics knowledge-gaps component runtime', 'src/components/analytics/KnowledgeGaps.tsx', ['action-handler@104']],
  [runtimeEvidence.analyticsTopQuestionsRuntimeControl, 'analytics top-questions component runtime', 'src/components/analytics/TopQuestions.tsx', ['action-handler@97']],
  [runtimeEvidence.skipToContentRuntimeControl, 'skip-to-content component runtime', 'src/components/shared/accessibility/SkipToContentLink.tsx', ['link@50']],
  [runtimeEvidence.scrollToBottomRuntimeControl, 'scroll-to-bottom component runtime', 'src/components/atoms/ScrollToBottomButton/ScrollToBottomButton.tsx', ['button@100']],
  [runtimeEvidence.backToTopRuntimeControl, 'back-to-top component runtime', 'src/components/templates/main-app/projects/b2cView/output/BackToTop.tsx', ['button@177']],
  [runtimeEvidence.emojiGridSearchRuntimeControl, 'emoji-grid search component runtime', 'src/components/atoms/IconPicker/EmojiGrid.tsx', ['button@302']],
  [runtimeEvidence.todayPrimaryCardRuntimeControls, 'today primary-card component runtime', 'src/components/templates/main-app/today/components/PrimaryCard/index.tsx', ['button@95', 'button@110']],
  [runtimeEvidence.businessHealthHeaderRuntimeControl, 'business-health header component runtime', 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthHeader.tsx', ['button@34']],
  [runtimeEvidence.loadingMessageCancelRuntimeControl, 'loading-message cancellation component runtime', 'src/components/antdComponent/loadingMessage/index.tsx', ['button@56']],
  [runtimeEvidence.aiButtonIconRuntimeControl, 'AI button-icon component runtime', 'src/components/atoms/aiButtonIcon/index.tsx', ['button@24']],
  [runtimeEvidence.knowledgeBaseSourceFileRuntimeControl, 'knowledge-base source-file component runtime', 'src/components/atoms/KbSourceFile/index.tsx', ['button@15']],
  [runtimeEvidence.todayOperationalSectionRuntimeControl, 'today operational-section component runtime', 'src/components/templates/main-app/today/components/OperationalSection/index.tsx', ['button@57']],
  [runtimeEvidence.noSubscriptionViewPlansRuntimeControl, 'no-subscription View Plans component runtime', 'src/components/templates/main-app/billing/NoSubscriptionView.tsx', ['button@39']],
  [runtimeEvidence.emptyProjectStateRuntimeControl, 'empty-project recovery component runtime', 'src/components/templates/main-app/projects/EmptyProjectState.tsx', ['button@42']],
  [runtimeEvidence.feedbackIntelligenceDisclosureRuntimeControl, 'feedback-intelligence disclosure component runtime', 'src/components/analytics/FeedbackIntelligenceCard.tsx', ['disclosure@134']],
]) {
  verifySingleSourceControlEvidence(evidenceSet, label, source, actions.length, {
    testResult: 'PASS_COMPONENT_RUNTIME_INTERACTION',
    finalStatus: 'LOCAL_COMPONENT_RUNTIME_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  });
  verifyExactEvidenceActions(evidenceSet, label, actions);
}
verifySingleSourceControlEvidence(
  runtimeEvidence.billingHistoryEmailRuntimeControl,
  'billing history email component runtime',
  'src/components/templates/main-app/billing/BillingHistory.tsx',
  1,
  {
    testResult: 'PASS_COMPONENT_RUNTIME_INTERACTION',
    finalStatus: 'LOCAL_COMPONENT_RUNTIME_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
verifyExactEvidenceActions(runtimeEvidence.billingHistoryEmailRuntimeControl, 'billing history email component runtime', ['button@199']);
verifySingleSourceControlEvidence(
  runtimeEvidence.billingHistoryInvoiceExternalBoundaryControl,
  'billing history invoice external boundary',
  'src/components/templates/main-app/billing/BillingHistory.tsx',
  1,
  {
    testResult: 'BLOCKED_EXTERNAL_HANDOFF',
    finalStatus: 'BLOCKED_EXTERNAL_INVOICE_HANDOFF_NOT_OPENED',
  },
);
verifyExactEvidenceActions(runtimeEvidence.billingHistoryInvoiceExternalBoundaryControl, 'billing history invoice external boundary', ['button@189']);
const pendingCurrentSourceControls = allControls.filter((row) => (
  row.product_area === 'MenuList'
  && row.test_result === 'BLOCKED_CURRENT_SOURCE_INTERACTION_PENDING'
));
if (pendingCurrentSourceControls.length !== 0) {
  fail(`expected zero generic current-source interaction-pending controls, found ${pendingCurrentSourceControls.length}`);
}
if (pendingCurrentSourceControls.some((row) => (
  row.test_type !== 'current-source-interaction-pending-boundary'
  || row.final_verification_status !== 'CURRENT_SOURCE_CONTROL_REQUIRES_BROWSER_OR_DETERMINISTIC_FIXTURE_INTERACTION'
  || row.regression_test_added !== 'NO'
))) fail('current-source interaction-pending controls must retain explicit non-passing metadata');
if (objects.some((row) => row.test_result === 'NOT_RUN')) {
  fail('inventory rows must not retain ambiguous NOT_RUN status after in-scope and product-boundary classification');
}
const outOfScopeProductBoundaryRows = objects.filter((row) => (
  row.test_result === 'PASS_OUT_OF_SCOPE_PRODUCT_BOUNDARY'
));
if (outOfScopeProductBoundaryRows.length !== 2124) {
  fail(`expected 2124 explicit out-of-scope product-boundary rows, found ${outOfScopeProductBoundaryRows.length}`);
}
if (outOfScopeProductBoundaryRows.some((row) => (
  row.product_area === 'MenuList'
  || row.final_verification_status !== 'OUT_OF_SCOPE_PRODUCT_BOUNDARY_INVENTORIED'
))) fail('out-of-scope product-boundary rows must remain isolated from MenuList and explicitly classified');

console.log(`MenuList RC inventory verified: ${objects.length} rows, ${functionExports.length} Function exports.`);
