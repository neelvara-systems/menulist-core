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
if (menuListRouteHandlers.length !== 140) {
  fail(`expected 140 MenuList route handlers, found ${menuListRouteHandlers.length}`);
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
]) {
  creativeEditorSourceManifest.update(relativePath);
  creativeEditorSourceManifest.update('\0');
  creativeEditorSourceManifest.update(fs.readFileSync(path.join(root, relativePath)));
  creativeEditorSourceManifest.update('\0');
}
if (creativeEditorEvidence?.sourceManifestSha256 !== creativeEditorSourceManifest.digest('hex')) {
  fail('Creative Editor local control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.creativeEditorControlInteractions, 'Creative Editor local', 14, {
  testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
  finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
});
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
  'src/components/mobile/screens/MobileShareScreen.tsx',
  'src/components/mobile/components/MobileProjectSelectorSheet.tsx',
  'src/components/mobile/components/MobileLinkCard.tsx',
  'src/components/mobile/components/CommunicationKit.tsx',
  'src/components/mobile/components/MobileQrCodeSheet.tsx',
  'src/components/mobile/components/MobileCompliancePagesEditor.tsx',
  'src/components/mobile/components/MobileTempStatusConfigurator.tsx',
  'src/components/mobile/screens/MobileDomainSettingsScreen.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/components/mobile/screens/MobileResellerDashboardScreen.tsx',
  'src/components/mobile/screens/MobileResellerOnboardingScreen.tsx',
  'src/components/mobile/screens/MobileBillingScreen.tsx',
  'src/components/mobile/screens/MobileLocationsScreen.tsx',
  'src/components/mobile/screens/MobileTransactionsScreen.tsx',
  'src/components/mobile/screens/MobileHelpScreen.tsx',
  'src/components/mobile/screens/MobileFeedbackScreen.tsx',
  'src/components/mobile/screens/MobileDigitalScreensScreen.tsx',
  'src/components/mobile/screens/MobileBasicSettingsScreen.tsx',
  'src/components/mobile/screens/MobileOfficialPageScreen.tsx',
  'src/components/mobile/sheets/ColorPickerSheet.tsx',
  'src/components/mobile/sheets/MobileOfficialPagePreviewSheet.tsx',
  'src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx',
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
  'src/components/mobile/sheets/BulkActionsSheet.tsx',
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
  'src/components/templates/main-app/printableAssetTemplates/PrintableAssetTemplatesRoute.tsx',
  'src/lib/printable-asset-templates/renderPrintableAsset.ts',
  'src/lib/printable-asset-templates/editorDocumentAdapter.ts',
  'src/lib/print-menu-surfaces/templates/tableTentTemplate.ts',
  'src/lib/print-menu-surfaces/templates/singleTableCardTemplate.ts',
  'src/lib/menu-kit/templates/entrancePosterTemplate.ts',
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
if (localMobileOwnerEvidence?.sourceManifestSha256 !== localMobileOwnerManifest.digest('hex')) {
  fail('local mobile owner control evidence is stale');
}
verifyControlEvidenceSet(runtimeEvidence.localMobileOwnerControlInteractions, 'local mobile/desktop owner', 55, {
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
const verifySingleSourceControlEvidence = (evidenceSet, label, relativePath, minimumRows) => {
  const manifest = createHash('sha256');
  manifest.update(relativePath);
  manifest.update('\0');
  manifest.update(fs.readFileSync(path.join(root, relativePath)));
  manifest.update('\0');
  if (evidenceSet?.sourceManifestSha256 !== manifest.digest('hex')) {
    fail(`${label} local control evidence is stale`);
  }
  verifyControlEvidenceSet(evidenceSet, `${label} local`, minimumRows, {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  });
};
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
  5,
  {
    testResult: 'PASS_LOCAL_BROWSER_INTERACTION',
    finalStatus: 'LOCAL_BROWSER_INTERACTION_PASSED_HOSTED_CURRENT_CANDIDATE_PENDING',
  },
);
const apiAnonymousBoundaryEvidence = runtimeEvidence.apiAnonymousBoundary;
if (apiAnonymousBoundaryEvidence?.result !== 'PASS') fail('anonymous API boundary evidence is not passing');
if (
  apiAnonymousBoundaryEvidence.handlers !== 140
  || apiAnonymousBoundaryEvidence.methodProbes !== 157
) fail('anonymous API boundary evidence must cover 140 handlers and 157 exported methods');
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
  && ['input@7641', 'input@7652', 'input@7664'].includes(row.control_or_action)
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

console.log(`MenuList RC inventory verified: ${objects.length} rows, ${functionExports.length} Function exports.`);
