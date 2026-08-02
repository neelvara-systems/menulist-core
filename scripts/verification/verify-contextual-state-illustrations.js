#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..', '..');
const assetDirectory = 'src/components/atoms/contextualStateIllustration/assets';
const componentPath = 'src/components/atoms/contextualStateIllustration/index.tsx';
const expectedAssets = [
  'access-denied-context.svg',
  'analytics-context.svg',
  'empty-workspace.svg',
  'feedback-context.svg',
  'not-found-context.svg',
  'onboarding-success-context.svg',
  'photo-error-context.svg',
  'photo-loading-context.svg',
  'photo-success-context.svg',
  'role-structure-context.svg',
  'schedule-context.svg',
  'server-error-context.svg',
  'team-context.svg',
  'upload-context.svg',
  'warning-context.svg',
];
const approvedConsumers = new Map([
  ['src/app/(global-pages)/404/page.tsx', { count: 1, softHaloCount: 0, variant: 'notFoundContext' }],
  ['src/app/(global-pages)/error.tsx', { count: 1, softHaloCount: 0, variant: 'serverErrorContext' }],
  ['src/app/(global-pages)/unauthorized/page.tsx', { count: 1, softHaloCount: 0, variants: ['accessDeniedContext', 'warningContext'] }],
  ['src/app/error.tsx', { count: 1, softHaloCount: 0, variant: 'serverErrorContext' }],
  ['src/app/global-error.tsx', { count: 1, softHaloCount: 0, variant: 'serverErrorContext' }],
  ['src/components/auth/OwnerPermissionGuard.tsx', { count: 1, softHaloCount: 0, variant: 'accessDeniedContext' }],
  ['src/components/mobile/screens/MobileDashboardScreen.tsx', { count: 4, softHaloCount: 4, variant: 'analyticsContext' }],
  ['src/components/mobile/screens/MobileDigitalScreensScreen.tsx', { count: 1, softHaloCount: 1, variant: 'uploadContext' }],
  ['src/components/mobile/screens/MobileFeedbackScreen.tsx', { count: 1, softHaloCount: 0, variant: 'feedbackContext' }],
  ['src/components/mobile/screens/MobileMenuScreen.tsx', { count: 3, softHaloCount: 2, variants: ['photoErrorContext', 'photoSuccessContext', 'uploadContext'] }],
  ['src/components/mobile/screens/MobileResellerOnboardingScreen.tsx', { count: 1, softHaloCount: 1, variant: 'onboardingSuccessContext' }],
  ['src/components/mobile/screens/MobileRolesScreen.tsx', { count: 1, softHaloCount: 1, variant: 'roleStructureContext' }],
  ['src/components/mobile/screens/MobileSpecialMenuScreen.tsx', { count: 1, softHaloCount: 1, variant: 'scheduleContext' }],
  ['src/components/mobile/screens/MobileTimeSlotsScreen.tsx', { count: 1, softHaloCount: 1, variant: 'scheduleContext' }],
  ['src/components/mobile/screens/MobileUsersScreen.tsx', { count: 1, softHaloCount: 1, variant: 'teamContext' }],
  ['src/components/mobile/sheets/MenuUploadSheet.tsx', { count: 1, softHaloCount: 0, variant: 'photoErrorContext' }],
  ['src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx', { count: 2, softHaloCount: 2, variants: ['roleStructureContext', 'teamContext'] }],
  ['src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx', { count: 2, softHaloCount: 2, variants: ['analyticsContext', 'feedbackContext'] }],
  ['src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx', { count: 1, softHaloCount: 1, variant: 'roleStructureContext' }],
  ['src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx', { count: 1, softHaloCount: 1, variant: 'feedbackContext' }],
  ['src/components/templates/answerlattice/governance/AnswerUsageAnalytics.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx', { count: 1, softHaloCount: 1, variant: 'feedbackContext' }],
  ['src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx', { count: 1, softHaloCount: 1, variant: 'roleStructureContext' }],
  ['src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx', { count: 2, softHaloCount: 1, variants: ['analyticsContext', 'warningContext'] }],
  ['src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx', { count: 2, softHaloCount: 1, variants: ['roleStructureContext', 'warningContext'] }],
  ['src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx', { count: 1, softHaloCount: 1, variant: 'uploadContext' }],
  ['src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx', { count: 1, softHaloCount: 1, variant: 'roleStructureContext' }],
  ['src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/campaigncue/CampaignCueVideoStudio.tsx', { count: 1, softHaloCount: 1, variant: 'emptyWorkspace' }],
  ['src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx', { count: 6, softHaloCount: 6, variants: ['emptyWorkspace', 'feedbackContext', 'scheduleContext', 'uploadContext'] }],
  ['src/components/templates/main-app/helpChat/ChatErrorBoundary.tsx', { count: 1, softHaloCount: 0, variant: 'warningContext' }],
  ['src/components/templates/main-app/businessSettings/tabs/TimeSlotPresetsTab.tsx', { count: 1, softHaloCount: 1, variant: 'scheduleContext' }],
  ['src/components/templates/main-app/dashboard/AnalyticsDashboard/index.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/main-app/dashboard/OwnerDashboard/DailyView.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/main-app/dashboard/OwnerDashboard/MonthlyView.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/main-app/dashboard/OwnerDashboard/WeeklyView.tsx', { count: 1, softHaloCount: 1, variant: 'analyticsContext' }],
  ['src/components/templates/main-app/feedback/index.tsx', { count: 1, softHaloCount: 0, variant: 'feedbackContext' }],
  ['src/components/templates/main-app/projects/EmptyProjectState.tsx', { count: 1, softHaloCount: 1, variant: 'emptyWorkspace' }],
  ['src/components/templates/main-app/projects/SpecialMenuCard.tsx', { count: 1, softHaloCount: 1, variant: 'scheduleContext' }],
  ['src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx', { count: 4, softHaloCount: 3, variants: ['photoErrorContext', 'photoLoadingContext', 'photoSuccessContext'] }],
  ['src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx', { count: 1, softHaloCount: 1, variant: 'uploadContext' }],
  ['src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx', { count: 1, softHaloCount: 0, variant: 'photoErrorContext' }],
  ['src/components/templates/main-app/reseller/OnboardingWizard.tsx', { count: 1, softHaloCount: 1, variant: 'onboardingSuccessContext' }],
  ['src/components/templates/main-app/settings/DigitalScreenSettings/OwnerUploads.tsx', { count: 1, softHaloCount: 1, variant: 'uploadContext' }],
  ['src/components/templates/main-app/users/permissions/index.tsx', { count: 1, softHaloCount: 1, variant: 'roleStructureContext' }],
  ['src/components/templates/main-app/users/usersList/index.tsx', { count: 1, softHaloCount: 1, variant: 'teamContext' }],
  ['src/components/templates/platform/assetTemplates/index.tsx', { count: 2, softHaloCount: 0, variants: ['accessDeniedContext', 'warningContext'] }],
]);
const expectedResultRenderCounts = new Map([
  ['src/app/(global-pages)/404/page.tsx', 1],
  ['src/app/(global-pages)/error.tsx', 1],
  ['src/app/(global-pages)/unauthorized/page.tsx', 1],
  ['src/app/error.tsx', 1],
  ['src/components/auth/OwnerPermissionGuard.tsx', 1],
  ['src/components/mobile/screens/MobileMenuScreen.tsx', 2],
  ['src/components/mobile/screens/MobileResellerOnboardingScreen.tsx', 1],
  ['src/components/mobile/sheets/MenuUploadSheet.tsx', 1],
  ['src/components/templates/main-app/helpChat/ChatErrorBoundary.tsx', 1],
  ['src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx', 4],
  ['src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx', 1],
  ['src/components/templates/main-app/reseller/OnboardingWizard.tsx', 1],
  ['src/components/templates/platform/assetTemplates/index.tsx', 2],
]);
const expectedAnswerlatticeEmptyRenderCounts = new Map([
  ['src/app/(answerlattice)/answerlattice/dashboard/page.tsx', 1],
  ['src/components/templates/answerlattice/AnswerlatticeTeamAccess.tsx', 2],
  ['src/components/templates/answerlattice/EntityCandidateReview.tsx', 1],
  ['src/components/templates/answerlattice/MutationProposalReview.tsx', 3],
  ['src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx', 2],
  ['src/components/templates/answerlattice/billing/AnswerlatticeBilling.tsx', 1],
  ['src/components/templates/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix.tsx', 1],
  ['src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx', 1],
  ['src/components/templates/answerlattice/governance/AnswerUsageAnalytics.tsx', 1],
  ['src/components/templates/answerlattice/governance/AnswerVersionHistory.tsx', 4],
  ['src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx', 1],
  ['src/components/templates/answerlattice/governance/DriftDashboard.tsx', 1],
  ['src/components/templates/answerlattice/governance/EntityHealthScore.tsx', 1],
  ['src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx', 1],
  ['src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx', 2],
  ['src/components/templates/answerlattice/governance/FrictionTab.tsx', 4],
  ['src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx', 2],
  ['src/components/templates/answerlattice/governance/MultiLanguageArticles.tsx', 2],
  ['src/components/templates/answerlattice/governance/PredictiveTriggerManager.tsx', 3],
  ['src/components/templates/answerlattice/governance/WhiteLabelBranding.tsx', 1],
  ['src/components/templates/answerlattice/governance/index.tsx', 1],
  ['src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx', 4],
  ['src/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues.tsx', 1],
  ['src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx', 1],
  ['src/components/templates/answerlattice/productSurfaces/AnswerlatticeProductSurfaces.tsx', 2],
  ['src/components/templates/answerlattice/supportBoard/AnswerlatticeSupportBoard.tsx', 4],
  ['src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx', 1],
  ['src/components/templates/main-app/platform/answerlatticeIntakeMonitor/index.tsx', 2],
]);
const expectedCampaignCueCustomEmptyRenderCounts = new Map([
  ['src/components/templates/campaigncue/CampaignCueVideoStudio.tsx', 2],
  ['src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx', 20],
  ['src/components/templates/campaigncue/PackTemplatePicker.tsx', 3],
]);
const expectedAnswerlatticeCustomEmptyRenderCounts = new Map([
  ['src/components/templates/answerlattice/hostedHelp/ArticleTopicMap.tsx', 1],
  ['src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx', 4],
]);
const expectedSignalDeskCustomEmptyRenderCounts = new Map([
  ['src/components/signaldesk/SignalDeskWorkspace.tsx', 32],
]);
const expectedMyCodexStateLikeJsxText = new Map([
  ['No favorites yet', 1],
  ['Queue is empty', 1],
  ['No recent doc yet', 1],
  ['No documents match your query', 1],
  ['No India voice is installed in this browser. MyCodex will use the device default until an Indian English, Hindi, or other India voice is available.', 1],
]);
const expectedGlobalAntEmptyRenderCount = 173;
const expectedGlobalAntEmptyFileCount = 121;
const expectedGlobalAntEmptyInventoryFingerprint = '81d6bb78ae771da4532d0835822643bcf502ecb20d19f5d913ab80667e5a7e31';
const codexIllustrationRulePath = '.codex/rules/CONTEXTUAL_STATE_ILLUSTRATION_RULES.md';
const cascadeIllustrationRulePath = '.cascade/rules/CONTEXTUAL_STATE_ILLUSTRATION_RULES.md';

function absolutePath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolutePath(relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listSourceFiles(directory) {
  return fs.readdirSync(absolutePath(directory), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const actualAssets = fs.readdirSync(absolutePath(assetDirectory)).sort();
assert(
  JSON.stringify(actualAssets) === JSON.stringify(expectedAssets),
  `State illustration assets must stay on the reviewed allowlist. Found: ${actualAssets.join(', ')}`,
);

for (const assetName of expectedAssets) {
  const source = read(path.join(assetDirectory, assetName));
  const sourceWithoutNamespace = source.replace('http://www.w3.org/2000/svg', '');

  assert(source.startsWith('<svg '), `${assetName} must remain a standalone SVG`);
  assert(source.includes('fill="currentColor"'), `${assetName} must inherit the product theme color`);
  assert(/viewBox="0 0 \d+ \d+"/.test(source), `${assetName} must keep a bounded viewBox`);
  assert(source.trim().endsWith('</svg>'), `${assetName} must close its SVG root`);

  for (const forbiddenToken of [
    'aria-label',
    '<desc',
    '<foreignObject',
    '<script',
    '<style',
    '<title',
    'data:',
    'href=',
    'http://',
    'https://',
    'onload=',
    'url(',
  ]) {
    assert(
      !sourceWithoutNamespace.includes(forbiddenToken),
      `${assetName} contains forbidden SVG content: ${forbiddenToken}`,
    );
  }
}

const componentSource = read(componentPath);
assert(componentSource.includes('aria-hidden="true"'), 'State illustrations must remain decorative');
assert(componentSource.includes('focusable="false"'), 'State illustrations must not enter keyboard focus order');
assert(componentSource.includes("'plain' | 'softHalo'"), 'State illustrations must keep the plain and soft-halo treatment contract');
assert(componentSource.includes('color-mix(in srgb, currentColor 16%, transparent)'), 'The branded halo must inherit the active theme color');
assert(!/#[\da-f]{3,8}/i.test(componentSource), 'The shared illustration component must not hardcode a brand color');
assert(componentSource.includes('accessDeniedContext: AccessDeniedContextIllustration'), 'Access-denied-context variant is missing');
assert(componentSource.includes('analyticsContext: AnalyticsContextIllustration'), 'Analytics-context variant is missing');
assert(componentSource.includes('emptyWorkspace: EmptyWorkspaceIllustration'), 'Empty-workspace variant is missing');
assert(componentSource.includes('feedbackContext: FeedbackContextIllustration'), 'Feedback-context variant is missing');
assert(componentSource.includes('notFoundContext: NotFoundContextIllustration'), 'Not-found-context variant is missing');
assert(componentSource.includes('onboardingSuccessContext: OnboardingSuccessContextIllustration'), 'Onboarding-success-context variant is missing');
assert(componentSource.includes('photoErrorContext: PhotoErrorContextIllustration'), 'Photo-error-context variant is missing');
assert(componentSource.includes('photoLoadingContext: PhotoLoadingContextIllustration'), 'Photo-loading-context variant is missing');
assert(componentSource.includes('photoSuccessContext: PhotoSuccessContextIllustration'), 'Photo-success-context variant is missing');
assert(componentSource.includes('roleStructureContext: RoleStructureContextIllustration'), 'Role-structure-context variant is missing');
assert(componentSource.includes('scheduleContext: ScheduleContextIllustration'), 'Schedule-context variant is missing');
assert(componentSource.includes('serverErrorContext: ServerErrorContextIllustration'), 'Server-error-context variant is missing');
assert(componentSource.includes('teamContext: TeamContextIllustration'), 'Team-context variant is missing');
assert(componentSource.includes('uploadContext: UploadContextIllustration'), 'Upload-context variant is missing');
assert(componentSource.includes('warningContext: WarningContextIllustration'), 'Warning-context variant is missing');

const actualConsumers = listSourceFiles('src')
  .filter((relativePath) => /from ['"]@atoms\/contextualStateIllustration['"]/.test(read(relativePath)))
  .sort();
const expectedConsumers = [...approvedConsumers.keys()].sort();
assert(
  JSON.stringify(actualConsumers) === JSON.stringify(expectedConsumers),
  `State illustration imports changed outside the reviewed product surfaces. Found:\n${actualConsumers.join('\n')}`,
);

for (const [relativePath, {
  count: expectedCount,
  softHaloCount: expectedSoftHaloCount,
  variant: expectedVariant,
  variants: expectedVariants,
}] of approvedConsumers) {
  const source = read(relativePath);
  const usageCount = (source.match(/<ContextualStateIllustration\b/g) || []).length;
  const softHaloCount = (source.match(/treatment=["']softHalo["']/g) || []).length;
  assert(
    usageCount === expectedCount,
    `${relativePath} must render exactly ${expectedCount} contextual state illustration${expectedCount === 1 ? '' : 's'}`,
  );
  assert(
    softHaloCount === expectedSoftHaloCount,
    `${relativePath} must render exactly ${expectedSoftHaloCount} theme-aware soft-halo illustration${expectedSoftHaloCount === 1 ? '' : 's'}`,
  );
  for (const requiredVariant of expectedVariants || [expectedVariant]) {
    assert(
      source.includes(requiredVariant),
      `${relativePath} must use the ${requiredVariant} variant`,
    );
  }
}

const resultComponentAudit = {
  imports: [],
  reExports: [],
  renders: [],
};
const contextualIllustrationAudit = [];
const globalAntEmptyRenderCounts = new Map();
const answerlatticeEmptyRenderCounts = new Map();
const answerlatticeCustomEmptyRenderCounts = new Map();
const campaignCueCustomEmptyRenderCounts = new Map();
const signalDeskCustomEmptyRenderCounts = new Map();
const myCodexStateLikeJsxText = new Map();

function incrementCount(counts, relativePath) {
  counts.set(relativePath, (counts.get(relativePath) || 0) + 1);
}

for (const relativePath of listSourceFiles('src')) {
  const source = read(relativePath);
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const lineFor = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const findJsxAttribute = (node, attributeName) => node.attributes.properties.find((attribute) => (
    ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === attributeName
  ));
  const getStaticStringAttribute = (attribute) => {
    if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer) return null;
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
    if (
      ts.isJsxExpression(attribute.initializer)
      && attribute.initializer.expression
      && ts.isStringLiteral(attribute.initializer.expression)
    ) {
      return attribute.initializer.expression.text;
    }
    return null;
  };

  const visit = (node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
      && node.tagName.getText(sourceFile) === 'ContextualStateIllustration'
    ) {
      const colorAttribute = findJsxAttribute(node, 'color');
      const treatmentAttribute = findJsxAttribute(node, 'treatment');
      const variantAttribute = findJsxAttribute(node, 'variant');
      const variant = getStaticStringAttribute(variantAttribute);
      const treatment = getStaticStringAttribute(treatmentAttribute) || 'plain';
      const colorSource = colorAttribute && ts.isJsxAttribute(colorAttribute)
        ? colorAttribute.initializer?.getText(sourceFile) || ''
        : '';

      contextualIllustrationAudit.push({
        colorSource,
        line: lineFor(node),
        relativePath,
        treatment,
        variant,
      });

      assert(
        treatment === 'plain' || treatment === 'softHalo',
        `${relativePath}:${lineFor(node)} uses an unsupported illustration treatment`,
      );

      if (treatment === 'softHalo') {
        assert(
          colorSource === '{token.colorPrimary}',
          `${relativePath}:${lineFor(node)} must use the active product primary color with the soft halo`,
        );
      }

      if (relativePath.startsWith('src/components/templates/campaigncue/')) {
        let ancestor = node.parent;
        let isInsideEmptyRegion = false;
        while (ancestor) {
          if (ts.isJsxElement(ancestor)) {
            const classAttribute = findJsxAttribute(ancestor.openingElement, 'className');
            if (classAttribute?.initializer?.getText(sourceFile) === '{styles.empty}') {
              isInsideEmptyRegion = true;
              break;
            }
          }
          ancestor = ancestor.parent;
        }
        assert(
          isInsideEmptyRegion,
          `${relativePath}:${lineFor(node)} must keep CampaignCue illustrations inside shell-level empty regions`,
        );
      }
    }

    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
      && node.tagName.getText(sourceFile) === 'Empty'
    ) {
      incrementCount(globalAntEmptyRenderCounts, relativePath);
      if (relativePath.toLowerCase().includes('answerlattice')) {
        incrementCount(answerlatticeEmptyRenderCounts, relativePath);
      }
    }

    if (
      ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)
    ) {
      const classAttribute = findJsxAttribute(node, 'className');
      if (classAttribute?.initializer?.getText(sourceFile) === '{styles.empty}') {
        if (relativePath.startsWith('src/components/templates/answerlattice/')) {
          incrementCount(answerlatticeCustomEmptyRenderCounts, relativePath);
        }
        if (relativePath.startsWith('src/components/templates/campaigncue/')) {
          incrementCount(campaignCueCustomEmptyRenderCounts, relativePath);
        }
        if (relativePath.startsWith('src/components/signaldesk/')) {
          incrementCount(signalDeskCustomEmptyRenderCounts, relativePath);
        }
      }
    }

    if (
      ts.isJsxText(node)
      && relativePath === 'src/app/sites/mycodex/components/MyCodexClientContainer.tsx'
    ) {
      const normalizedText = node.text.replace(/\s+/g, ' ').trim();
      if (normalizedText && /\b(?:no|empty|nothing|none)\b/i.test(normalizedText)) {
        incrementCount(myCodexStateLikeJsxText, normalizedText);
      }
    }

    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
      && node.tagName.getText(sourceFile) === 'Result'
    ) {
      const iconAttribute = node.attributes.properties.find((attribute) => (
        ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'icon'
      ));
      resultComponentAudit.renders.push({
        hasContextualIllustration: Boolean(
          iconAttribute
          && ts.isJsxAttribute(iconAttribute)
          && iconAttribute.initializer?.getText(sourceFile).includes('<ContextualStateIllustration'),
        ),
        line: lineFor(node),
        relativePath,
      });
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const importSource = node.moduleSpecifier.text;
      const namedBindings = node.importClause?.namedBindings;
      if (
        (importSource === 'antd' || importSource.endsWith('/antd'))
        && namedBindings
        && ts.isNamedImports(namedBindings)
      ) {
        for (const specifier of namedBindings.elements) {
          const importedName = specifier.propertyName?.text || specifier.name.text;
          if (importedName === 'Result') {
            resultComponentAudit.imports.push({
              line: lineFor(specifier),
              localName: specifier.name.text,
              relativePath,
            });
          }
        }
      }
    }

    if (ts.isVariableStatement(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name)
          && declaration.name.text === 'Result'
          && declaration.initializer?.getText(sourceFile) === 'AntResult'
        ) {
          resultComponentAudit.reExports.push({
            line: lineFor(declaration),
            relativePath,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function sortedEntries(counts) {
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function assertInventory(actual, expected, label) {
  assert(
    JSON.stringify(sortedEntries(actual)) === JSON.stringify(sortedEntries(expected)),
    `${label} changed and requires contextual-state classification. Found:\n${sortedEntries(actual).map(([file, count]) => `${file}: ${count}`).join('\n')}`,
  );
}

assertInventory(
  answerlatticeEmptyRenderCounts,
  expectedAnswerlatticeEmptyRenderCounts,
  'Answerlattice Ant Empty inventory',
);
assertInventory(
  answerlatticeCustomEmptyRenderCounts,
  expectedAnswerlatticeCustomEmptyRenderCounts,
  'Answerlattice hosted-help custom empty-state inventory',
);
assertInventory(
  campaignCueCustomEmptyRenderCounts,
  expectedCampaignCueCustomEmptyRenderCounts,
  'CampaignCue custom empty-state inventory',
);
assertInventory(
  signalDeskCustomEmptyRenderCounts,
  expectedSignalDeskCustomEmptyRenderCounts,
  'SignalDesk custom empty-state inventory',
);
assertInventory(
  myCodexStateLikeJsxText,
  expectedMyCodexStateLikeJsxText,
  'MyCodex state-like JSX text inventory',
);
assert(
  [...globalAntEmptyRenderCounts.values()].reduce((total, count) => total + count, 0) === expectedGlobalAntEmptyRenderCount,
  `Global Ant Empty inventory changed and requires contextual-state classification. Found ${[...globalAntEmptyRenderCounts.values()].reduce((total, count) => total + count, 0)} renders`,
);
assert(
  globalAntEmptyRenderCounts.size === expectedGlobalAntEmptyFileCount,
  `Global Ant Empty file inventory changed and requires contextual-state classification. Found ${globalAntEmptyRenderCounts.size} files`,
);
const globalAntEmptyInventoryFingerprint = crypto
  .createHash('sha256')
  .update(JSON.stringify(sortedEntries(globalAntEmptyRenderCounts)))
  .digest('hex');
assert(
  globalAntEmptyInventoryFingerprint === expectedGlobalAntEmptyInventoryFingerprint,
  `Global Ant Empty per-file inventory changed and requires contextual-state classification. Found fingerprint ${globalAntEmptyInventoryFingerprint}`,
);

assert(
  read(codexIllustrationRulePath) === read(cascadeIllustrationRulePath),
  'Codex and Cascade contextual state illustration rules must remain byte-identical',
);
const agentsSource = read('AGENTS.md');
assert(
  agentsSource.includes(codexIllustrationRulePath)
    && agentsSource.includes(cascadeIllustrationRulePath)
    && agentsSource.includes('verify:contextual-state-illustrations'),
  'AGENTS.md must load and enforce the cross-product contextual state illustration rule',
);

assert(
  contextualIllustrationAudit.length === 66,
  `Expected 66 reviewed contextual illustration renders, found ${contextualIllustrationAudit.length}`,
);
assert(
  contextualIllustrationAudit.filter(({ treatment }) => treatment === 'softHalo').length === 49,
  'Expected 49 positive or first-use illustrations to use the branded soft halo',
);

const actualResultRenderCounts = new Map();
for (const render of resultComponentAudit.renders) {
  actualResultRenderCounts.set(render.relativePath, (actualResultRenderCounts.get(render.relativePath) || 0) + 1);
  assert(
    render.hasContextualIllustration,
    `${render.relativePath}:${render.line} contains an Ant Result without the shared contextual illustration component`,
  );
}

assert(
  JSON.stringify([...actualResultRenderCounts.entries()].sort())
    === JSON.stringify([...expectedResultRenderCounts.entries()].sort()),
  `Ant Result render inventory changed. Found:\n${[...actualResultRenderCounts.entries()].sort().map(([file, count]) => `${file}: ${count}`).join('\n')}`,
);
assert(resultComponentAudit.renders.length === 18, `Expected 18 rendered Ant Result states, found ${resultComponentAudit.renders.length}`);
assert(resultComponentAudit.imports.length === 14, `Expected 14 Ant Result import locations, found ${resultComponentAudit.imports.length}`);
assert(resultComponentAudit.reExports.length === 1, `Expected one mobile Ant Result re-export, found ${resultComponentAudit.reExports.length}`);
assert(
  resultComponentAudit.renders.length + resultComponentAudit.imports.length + resultComponentAudit.reExports.length === 33,
  'Expected 33 Ant Result source locations: 18 renders, 14 imports, and one mobile re-export',
);

assert(
  read('src/components/templates/main-app/feedback/index.tsx').includes("image={filter === 'all' ? ("),
  'Desktop feedback filters must not decorate zero-result states',
);
assert(
  read('src/components/mobile/screens/MobileFeedbackScreen.tsx').includes("image={filter === 'all' ? ("),
  'Mobile feedback filters must not decorate zero-result states',
);
assert(
  read('src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx')
    .includes('image={entities.length === 0 && !searchText ? ('),
  'Answerlattice entity artwork must appear only for first use, not search or table-filter misses',
);
assert(
  read('src/components/templates/answerlattice/governance/CanonicalAnswerEditor.tsx')
    .includes('image={answers.length === 0 && !requestedEntityId ? ('),
  'Answerlattice canonical-answer artwork must appear only for first use, not scoped or table-filter misses',
);
assert(
  read('src/components/templates/main-app/users/usersList/index.tsx').includes("searchQuery\n                                    ? 'No staff matched your search.'"),
  'Desktop staff search must keep a plain zero-result state',
);
assert(
  read('src/components/templates/main-app/users/usersList/usersListTable.tsx').includes('<Tag color="warning">No role</Tag>'),
  'Desktop staff without a current-store role must keep an explicit warning label',
);
assert(
  read('src/components/mobile/screens/MobileUsersScreen.tsx').includes("getUserRoleId(user) ? 'primary' : 'warning'"),
  'Mobile staff without a current-store role must keep an explicit warning label',
);
assert(
  read('src/app/(global-pages)/404/page.tsx').includes('variant="notFoundContext"'),
  'The global MenuList 404 must use the approved contextual illustration',
);
assert(
  read('src/app/global-error.tsx').includes('variant="serverErrorContext"')
    && !/[⚠️🔄🏠]/u.test(read('src/app/global-error.tsx')),
  'The root error boundary must use reviewed artwork and Lucide action icons instead of emoji',
);
assert(
  read('src/app/client/not-found.tsx').includes('<LuBookX'),
  'The lightweight customer-menu not-found page must keep its product-specific Lucide marker',
);
assert(
  read('src/app/feedback/[projectId]/not-found.tsx').includes('<LuMessageSquareDashed'),
  'The public feedback not-found page must keep its product-specific Lucide marker',
);

const campaignCueWorkspaceSource = read('src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx');
const campaignCueChannelStudioStart = campaignCueWorkspaceSource.indexOf('const renderChannelStudio =');
const campaignCueChannelStudioEnd = campaignCueWorkspaceSource.indexOf('if (state.loading && !data)', campaignCueChannelStudioStart);
const campaignCueEditorStart = campaignCueWorkspaceSource.indexOf('{tab === "editor" ? (');
const campaignCueEditorEnd = campaignCueWorkspaceSource.indexOf('{tab === "video" ? (', campaignCueEditorStart);
const campaignCueAssetsStart = campaignCueWorkspaceSource.indexOf('{tab === "assets" ? (', campaignCueEditorEnd);
const campaignCueAssetsEnd = campaignCueWorkspaceSource.indexOf('{tab === "analytics" ? (', campaignCueAssetsStart);
assert(
  campaignCueChannelStudioStart >= 0
    && campaignCueChannelStudioEnd > campaignCueChannelStudioStart
    && !campaignCueWorkspaceSource.slice(campaignCueChannelStudioStart, campaignCueChannelStudioEnd).includes('<ContextualStateIllustration'),
  'CampaignCue generated-output studios must stay free of shared contextual illustrations',
);
assert(
  campaignCueEditorStart >= 0
    && campaignCueEditorEnd > campaignCueEditorStart
    && !campaignCueWorkspaceSource.slice(campaignCueEditorStart, campaignCueEditorEnd).includes('<ContextualStateIllustration'),
  'CampaignCue creative-editor surfaces must stay free of shared contextual illustrations',
);
assert(
  campaignCueAssetsStart >= 0
    && campaignCueAssetsEnd > campaignCueAssetsStart
    && !campaignCueWorkspaceSource.slice(campaignCueAssetsStart, campaignCueAssetsEnd).includes('<ContextualStateIllustration'),
  'CampaignCue Asset Library surfaces must stay free of shared contextual illustrations',
);

assert(
  read('src/components/shared/media/MediaImageCard.tsx').includes('<LuUpload'),
  'The interactive upload control must keep its Lucide upload icon',
);
assert(
  read('src/components/templates/main-app/projects/editorView/editItemModal.tsx').includes('icon={<LuPlus />}'),
  'The item-photo action must keep its Lucide add icon',
);
assert(
  read('src/components/templates/main-app/projects/b2cView/output/MenuItem.tsx').includes('showImage && item.image'),
  'Public menu items must continue omitting empty image frames',
);
assert(
  !fs.existsSync(absolutePath('public/assets/contextual-state-illustrations')),
  'State illustrations must not be exposed as a public asset library',
);

console.log('Cross-product contextual state boundary verified (66 illustrations; MenuList Result, Answerlattice Empty, CampaignCue, SignalDesk, and MyCodex inventories reviewed).');
