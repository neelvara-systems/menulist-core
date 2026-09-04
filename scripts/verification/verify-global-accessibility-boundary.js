#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory, predicate) {
  const absoluteDirectory = path.join(ROOT, directory);
  const results = [];
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(relPath, predicate));
    } else if (predicate(relPath)) {
      results.push(relPath);
    }
  }
  return results;
}

function sourceHasJsxTag(relPath, expectedTagName) {
  const source = read(relPath);
  const sourceFile = ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;
  const visit = (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(sourceFile) === expectedTagName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function findNestedInteractiveCompositeRows(relPath) {
  const source = read(relPath);
  const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const failures = [];

  const getAttribute = (openingElement, name) => openingElement.attributes.properties
    .filter(ts.isJsxAttribute)
    .find((attribute) => attribute.name.getText(sourceFile) === name);
  const attributeContainsInteractiveControl = (attribute) => {
    if (!attribute?.initializer || !ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) return false;
    let found = false;
    const inspect = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (['Button', 'Switch'].includes(node.tagName.getText(sourceFile))) found = true;
      }
      if (!found) ts.forEachChild(node, inspect);
    };
    inspect(attribute.initializer.expression);
    return found;
  };
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      const hasNestedControls = tagName === 'Collapse.Panel'
        ? attributeContainsInteractiveControl(getAttribute(node, 'title'))
        : tagName === 'List.Item'
          && Boolean(getAttribute(node, 'onClick'))
          && attributeContainsInteractiveControl(getAttribute(node, 'extra'));
      if (hasNestedControls) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        failures.push(`${relPath}:${line}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return failures;
}

function findUnnamedIconButtons(relPaths) {
  const failures = [];
  for (const relPath of relPaths) {
    const source = read(relPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) {
        const openingElement = ts.isJsxElement(node) ? node.openingElement : node;
        if (openingElement.tagName.getText(sourceFile) === 'Button') {
          const attributes = openingElement.attributes.properties.filter(ts.isJsxAttribute);
          const hasIcon = attributes.some((attribute) => attribute.name.text === 'icon');
          const hasAccessibleName = attributes.some(
            (attribute) => ['aria-label', 'aria-labelledby'].includes(attribute.name.text),
          );
          const hasMeaningfulChild = ts.isJsxElement(node) && node.children.some(
            (child) => !(ts.isJsxText(child) && !child.getText(sourceFile).trim())
              && !(ts.isJsxExpression(child) && !child.expression),
          );
          const meaningfulChildren = ts.isJsxElement(node)
            ? node.children.filter(
              (child) => !(ts.isJsxText(child) && !child.getText(sourceFile).trim())
                && !(ts.isJsxExpression(child) && !child.expression),
            )
            : [];
          const hasIconOnlyChild = meaningfulChildren.length === 1
            && ts.isJsxSelfClosingElement(meaningfulChildren[0])
            && /^(Lu|Md|Fi|Ai|Io|Fa|Bs|Ri|Hi|Tb|Pi|Ci|Go|Rx)/.test(
              meaningfulChildren[0].tagName.getText(sourceFile),
            );
          const hasSymbolOnlyChild = meaningfulChildren.length === 1
            && ts.isJsxText(meaningfulChildren[0])
            && /^(✕|×|✖)$/.test(meaningfulChildren[0].getText(sourceFile).trim());
          if ((hasIcon && !hasMeaningfulChild) || hasIconOnlyChild || hasSymbolOnlyChild) {
            if (hasAccessibleName) {
              ts.forEachChild(node, visit);
              return;
            }
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            failures.push(`${relPath}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return failures;
}

function findUnnamedSwitches(relPaths) {
  const failures = [];
  for (const relPath of relPaths) {
    const source = read(relPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(sourceFile) === 'Switch') {
          const hasAccessibleName = node.attributes.properties.some(
            (attribute) => ts.isJsxAttribute(attribute)
              && ['aria-label', 'aria-labelledby'].includes(attribute.name.text),
          );
          if (!hasAccessibleName) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            failures.push(`${relPath}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return failures;
}

function findUnnamedSelects(relPaths) {
  const failures = [];
  for (const relPath of relPaths) {
    const source = read(relPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(sourceFile) === 'Select') {
          const hasAccessibleName = node.attributes.properties.some(
            (attribute) => ts.isJsxAttribute(attribute)
              && ['aria-label', 'aria-labelledby'].includes(attribute.name.text),
          );
          if (!hasAccessibleName) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            failures.push(`${relPath}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return failures;
}

function findUnnamedInputs(relPaths) {
  const failures = [];
  for (const relPath of relPaths) {
    const source = read(relPath);
    const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (['Input', 'TextArea'].includes(node.tagName.getText(sourceFile))) {
          const hasAccessibleName = node.attributes.properties.some(
            (attribute) => ts.isJsxAttribute(attribute)
              && ['aria-label', 'aria-labelledby'].includes(attribute.name.text),
          );
          if (!hasAccessibleName) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            failures.push(`${relPath}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return failures;
}

function findPointerOnlyIntrinsicClickHandlers(relPaths) {
  const failures = [];
  for (const relPath of relPaths) {
    const source = read(relPath);
    const sourceFile = ts.createSourceFile(
      relPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        if (tagName === 'div' || tagName === 'span') {
          const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
          const clickAttribute = attributes.find(attribute => attribute.name.text === 'onClick');
          const isPropagationBoundary = clickAttribute?.initializer
            ?.getText(sourceFile).includes('stopPropagation');
          const hasKeyboardContract = attributes.some(
            attribute => ['onKeyDown', 'role', 'tabIndex'].includes(attribute.name.text),
          );
          if (clickAttribute && !isPropagationBoundary && !hasKeyboardContract) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
            failures.push(`${relPath}:${line}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return failures;
}

const appSourceFiles = walk('src/app', (relPath) => /\.(?:ts|tsx)$/.test(relPath));
for (const relPath of appSourceFiles) {
  const content = read(relPath);
  assert(!/maximumScale\s*:\s*1\b/.test(content), `${relPath} must not disable browser zoom`);
  assert(!/userScalable\s*:\s*false\b/.test(content), `${relPath} must not disable browser zoom`);
}

const rawImageFiles = [
  ...walk('src/app', (relPath) => relPath.endsWith('.tsx')),
  ...walk('src/components', (relPath) => relPath.endsWith('.tsx')),
];

const ownerAppFiles = walk('src/components/templates/main-app', (relPath) => relPath.endsWith('.tsx'));
const unnamedOwnerSwitches = findUnnamedSwitches(ownerAppFiles);
assert(
  unnamedOwnerSwitches.length === 0,
  `owner-app switches require accessible names:\n${unnamedOwnerSwitches.join('\n')}`,
);
const mobileOwnerFiles = walk('src/components/mobile', (relPath) => relPath.endsWith('.tsx'));
const unnamedMobileOwnerSwitches = findUnnamedSwitches(mobileOwnerFiles);
assert(
  unnamedMobileOwnerSwitches.length === 0,
  `mobile-owner switches require accessible names:\n${unnamedMobileOwnerSwitches.join('\n')}`,
);
const unnamedMobileOwnerSelects = findUnnamedSelects(mobileOwnerFiles);
assert(
  unnamedMobileOwnerSelects.length === 0,
  `mobile-owner selects require accessible names:\n${unnamedMobileOwnerSelects.join('\n')}`,
);
const governedMobileFormFiles = [
  'src/components/mobile/components/MobileTempStatusConfigurator.tsx',
  'src/components/mobile/screens/MobileHoursScreen.tsx',
  'src/components/mobile/screens/MobileMoreScreen.tsx',
  'src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx',
  'src/components/mobile/screens/MobileTimeSlotsScreen.tsx',
  'src/components/mobile/sheets/ItemEditSheet.tsx',
];
const unnamedGovernedMobileInputs = findUnnamedInputs(governedMobileFormFiles);
assert(
  unnamedGovernedMobileInputs.length === 0,
  `governed mobile form inputs require accessible names:\n${unnamedGovernedMobileInputs.join('\n')}`,
);
const unnamedMobileOwnerTextAreas = findUnnamedInputs(mobileOwnerFiles)
  .filter((failure) => {
    const [relPath, lineText] = failure.split(':');
    const sourceFile = ts.createSourceFile(relPath, read(relPath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const line = Number(lineText) - 1;
    let tagName = '';
    const visit = (node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
        && sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line === line) {
        tagName = node.tagName.getText(sourceFile);
      }
      if (!tagName) ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return tagName === 'TextArea';
  });
assert(
  unnamedMobileOwnerTextAreas.length === 0,
  `mobile-owner textareas require accessible names:\n${unnamedMobileOwnerTextAreas.join('\n')}`,
);
const mobileTimeSlotsSource = read('src/components/mobile/screens/MobileTimeSlotsScreen.tsx');
assert(
  mobileTimeSlotsSource.includes("aria-label={editingPreset ? t('editTimeSlot') : t('newTimeSlot')}"),
  'mobile Time Slots form dialog must retain its accessible name',
);
assert(
  mobileTimeSlotsSource.includes("title: t('delete')"),
  'mobile Time Slots delete confirmation must expose the localized destructive action as its dialog name',
);
const sharedMobileAntdSource = read('src/components/mobile/antd.tsx');
assert(sharedMobileAntdSource.includes('<Drawer\n            aria-label={ariaLabel}'), 'mobile Popup must forward its accessible name to the Drawer dialog');
assert(sharedMobileAntdSource.includes('aria-pressed={ariaPressed}'), 'interactive mobile Card must forward selected state');
assert(sharedMobileAntdSource.includes("function ListItem({ 'aria-pressed': ariaPressed"), 'interactive mobile List item must accept selected state');
assert(sharedMobileAntdSource.includes('<AntList.Item\n            aria-pressed={ariaPressed}'), 'interactive mobile List item must forward selected state');
[
  'function AccessibleStaticDialogContent(',
  "closest('[role=\"dialog\"]')",
  "dialog.setAttribute('aria-label', label);",
  "modalRender: renderAccessibleStaticDialog(dialogLabel)",
  "modalRender: renderAccessibleStaticDialog(resolveStaticDialogLabel(config, 'Notice'))",
].forEach((token) => assert(sharedMobileAntdSource.includes(token), `mobile static dialogs must include ${token}`));
assert(sharedMobileAntdSource.includes('<AntInput.TextArea\n            aria-label={ariaLabel}'), 'mobile TextArea must forward its accessible name to the native textarea');
const mobileAppSettingsSource = read('src/components/mobile/sheets/AppSettingsSheet.tsx');
assert(mobileAppSettingsSource.includes("aria-label={t('title')}"), 'mobile App settings dialog must retain its accessible name');
const mobileMoreSource = read('src/components/mobile/screens/MobileMoreScreen.tsx');
assert(mobileMoreSource.includes('<Popup aria-label="Edit profile"'), 'mobile profile editor must retain its visible dialog name');
const mobileQrCodeSheetSource = read('src/components/mobile/components/MobileQrCodeSheet.tsx');
assert(mobileQrCodeSheetSource.includes('<Popup\n            aria-label={title}'), 'shared mobile QR dialog must retain the visible QR title as its accessible name');
const mobileColorPickerSource = read('src/components/mobile/sheets/ColorPickerSheet.tsx');
assert(mobileColorPickerSource.includes("aria-label={t('brandColor')}"), 'mobile color picker must retain its visible dialog name');
const mobileCompliancePagesEditorSource = read('src/components/mobile/components/MobileCompliancePagesEditor.tsx');
assert(mobileCompliancePagesEditorSource.includes('<Popup\n                aria-label={pageLabel}'), 'mobile compliance policy dialog must retain the visible policy title as its accessible name');
const mobileItemEditSource = read('src/components/mobile/sheets/ItemEditSheet.tsx');
assert(mobileItemEditSource.includes("aria-label={isAddMode ? t('addItemTitle') : t('editItemTitle')}"), 'mobile item editor dialog must retain its add/edit accessible name');
[
  "event.key !== 'Escape' || !open",
  'event.stopPropagation();',
  'setOpen(false);',
  'onInputKeyDown={handleInputKeyDown}',
  'onOpenChange={setOpen}',
  'open={open}',
].forEach((token) => assert(
  sharedMobileAntdSource.includes(token),
  `shared mobile selectors must consume Escape before their parent dialog: ${token}`,
));
const mobileCategoryManagerSource = read('src/components/mobile/sheets/CategoryManagerSheet.tsx');
assert(mobileCategoryManagerSource.includes('KeyboardSensor'), 'mobile category and item reordering must retain a keyboard sensor');
assert(mobileCategoryManagerSource.includes('coordinateGetter: sortableKeyboardCoordinates'), 'mobile category and item reordering must use sortable keyboard coordinates');
assert(
  mobileCategoryManagerSource.match(/Drag the handle, or focus it and use Space plus the arrow keys\./g)?.length === 2,
  'both mobile category and item reorder screens must explain their pointer and keyboard controls',
);
assert(mobileAppSettingsSource.includes("aria-label={`${t('themeColors')} ${color}`}"), 'mobile App settings theme colors must retain accessible names');
assert(mobileAppSettingsSource.includes('aria-pressed={activeThemeColor === color}'), 'mobile App settings theme colors must expose selected state');
assert(mobileAppSettingsSource.includes("aria-label={`${t('themeColors')}: ${activeThemeColor?.toUpperCase()}`}"), 'mobile App settings custom color picker must retain a unique accessible name');
assert(mobileAppSettingsSource.includes('type="color"'), 'mobile App settings custom color control must retain native color-input semantics');
assert(mobileAppSettingsSource.includes("height: 44") && mobileAppSettingsSource.includes("width: 44"), 'mobile App settings custom color control must retain a 44px touch target');
const desktopAppSettingsColorSource = read('src/components/organisms/appSettings/EnhancedColorPicker.tsx');
assert(
  desktopAppSettingsColorSource.includes('aria-label={`${ariaLabel}: ${selectedColor.toUpperCase()}`}'),
  'desktop App settings custom color picker must retain a unique accessible name',
);
assert(
  desktopAppSettingsColorSource.includes('type="color"'),
  'desktop App settings custom color control must retain native color-input semantics',
);
assert(
  desktopAppSettingsColorSource.includes("height: 44") && desktopAppSettingsColorSource.includes("width: 44"),
  'desktop App settings custom color control must retain a 44px target',
);
assert(
  !desktopAppSettingsColorSource.includes('ColorPicker as AntColorPicker'),
  'desktop App settings must not restore the unnamed library color-panel controls',
);
const mobileSeoAnalyticsSource = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
const mobileCustomerAppSource = read('src/components/mobile/screens/MobileCustomerAppScreen.tsx');
const mobileShareSource = read('src/components/mobile/screens/MobileShareScreen.tsx');
const mobileTextCaseSource = read('src/components/mobile/sheets/TextCaseSheet.tsx');
const mobileAiDefaultsSource = read('src/components/mobile/sheets/AIDefaultsSheet.tsx');
const mobileDescriptionsSource = read('src/components/mobile/sheets/GenerateDescriptionsSheet.tsx');
const mobileManageLanguagesSource = read('src/components/mobile/sheets/ManageLanguagesSheet.tsx');
const mobileMenuCommandSource = read('src/components/mobile/components/MobileMenuCommandSheet.tsx');
const mobileMenuUploadSource = read('src/components/mobile/sheets/MenuUploadSheet.tsx');
const mobileSmartRecommendationsSource = read('src/components/mobile/sheets/SmartRecommendationsSheet.tsx');
const mobileBulkActionsSource = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
assert(mobileShareSource.includes('aria-label={guide?.title || undefined}'), 'mobile Share guide dialogs must retain the visible guide title as their accessible name');
assert(mobileShareSource.includes("aria-label={`${common('copy')} ${label}`}"), 'mobile digital-screen copy actions must include their target name');
assert(mobileShareSource.includes("aria-label={`${common('open')} ${label}`}"), 'mobile digital-screen open actions must include their target name');
assert(mobileSeoAnalyticsSource.includes("aria-label={tAnalytics('viewGuide')}"), 'mobile Analytics guide dialog must retain its accessible name');
assert(mobileSeoAnalyticsSource.includes("aria-label={tAnalytics('setupWizard')}"), 'mobile Analytics setup dialog must retain its accessible name');
assert(mobileSeoAnalyticsSource.includes('!areAnalyticsDraftsEqual(analyticsDraft, originalAnalyticsState)'), 'mobile Analytics dirty-state comparison must remain key-order independent');
assert(mobileSeoAnalyticsSource.includes("url={`${getPublicBaseUrl()}/features/analytics`}"), 'mobile Analytics guide must use the active MenuList website origin');
assert(!mobileSeoAnalyticsSource.includes('docs.menulistai.com'), 'mobile Analytics guide must not restore the retired non-resolving documentation host');
assert(mobileCustomerAppSource.includes('aria-label="Home screen name"'), 'mobile Customer App short-name input must expose its visible purpose instead of its example placeholder');
assert(mobileTextCaseSource.includes("aria-label={t('fixTextCase')}"), 'mobile Fix Text Case dialog must retain its visible title as its accessible name');
assert(mobileAiDefaultsSource.includes('aria-label="Generation defaults"'), 'mobile Generation defaults dialog must retain its visible title as its accessible name');
assert(mobileDescriptionsSource.includes("aria-label={t('menuDescriptions')}"), 'mobile Menu descriptions dialog must retain its visible localized title as its accessible name');
assert(mobileManageLanguagesSource.includes("aria-label={t('manageLanguages')}"), 'mobile Manage Languages dialog must retain its visible localized title as its accessible name');
assert(mobileMenuCommandSource.includes("aria-label={t('manageAndControl', { offering: labels.offeringTitle })}"), 'mobile Menu command dialog must retain its visible localized title as its accessible name');
assert(mobileMenuUploadSource.includes("aria-label={t('uploadAndProcess')}"), 'mobile menu upload dialog must retain its visible localized title as its accessible name');
assert(mobileMenuUploadSource.includes('aria-label="Import from existing menu link"'), 'mobile menu-link input must expose its visible purpose instead of its example placeholder');
assert(mobileSmartRecommendationsSource.includes("aria-label={t('smartRecommendationsTitle')}"), 'mobile Featured section dialog must retain its visible localized title as its accessible name');
assert(mobileSmartRecommendationsSource.includes("aria-label={`${labels.title}: ${t('smartRecommendationsPinLabel')}`}"), 'mobile Featured section item selectors must include their target choice name');
assert(mobileBulkActionsSource.includes('title: actionLabel,'), 'mobile bulk mutation confirmation must be named from the exact pending action');
assert(mobileCategoryManagerSource.includes('aria-label={categoryManagerTitle}'), 'mobile category manager dialog must retain its current visible title as its accessible name');
assert(mobileCategoryManagerSource.includes('<Flex align="center" gap={6} key={key}'), 'mobile item-reorder legend entries must retain stable React keys');
const governedMobileChoiceFiles = [
  'src/components/mobile/screens/MobileMenuScreen.tsx',
  'src/components/mobile/sheets/AIDefaultsSheet.tsx',
  'src/components/mobile/sheets/GenerateDescriptionsSheet.tsx',
  'src/components/mobile/sheets/TextCaseSheet.tsx',
];
const pointerOnlyMobileChoices = findPointerOnlyIntrinsicClickHandlers(governedMobileChoiceFiles);
assert(
  pointerOnlyMobileChoices.length === 0,
  `mobile selection cards must use native buttons or complete keyboard semantics:\n${pointerOnlyMobileChoices.join('\n')}`,
);
for (const relPath of governedMobileChoiceFiles) {
  const source = read(relPath);
  assert(source.includes('aria-pressed='), `${relPath} must expose selected state on native choice buttons`);
  assert(source.includes('minHeight: 44'), `${relPath} must retain 44px mobile choice targets`);
}
const governedOwnerChoiceFiles = [
  'src/components/organisms/headerComponent/profileActionsModal/index.tsx',
  'src/components/templates/main-app/projects/b2cView/menuPage/colorPresetsDrawer.tsx',
  'src/components/templates/main-app/projects/b2cView/menuPage/imageGalleryDrawer.tsx',
  'src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx',
  'src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx',
  'src/components/templates/main-app/projects/editorView/AIDefaultsModal.tsx',
];
const pointerOnlyOwnerChoices = findPointerOnlyIntrinsicClickHandlers(governedOwnerChoiceFiles);
assert(
  pointerOnlyOwnerChoices.length === 0,
  `owner selection and profile actions require native controls or complete keyboard semantics:\n${pointerOnlyOwnerChoices.join('\n')}`,
);
const profileActionsSource = read(governedOwnerChoiceFiles[0]);
assert(profileActionsSource.includes('role="button"'), 'profile actions must retain button semantics');
assert(profileActionsSource.includes("event.key === 'Enter' || event.key === ' '"), 'profile actions must retain Enter and Space activation');
assert(profileActionsSource.includes('className={styles.profileTrigger}'), 'profile trigger must use the governed native-control wrapper');
assert(profileActionsSource.includes("aria-label={t('myProfile')}"), 'profile trigger must expose a stable localized name');
assert(profileActionsSource.includes('aria-expanded={isOpen}'), 'profile trigger must expose expanded state');
assert(profileActionsSource.includes('aria-haspopup="dialog"'), 'profile trigger must expose its popup relationship');
const colorPresetsSource = read(governedOwnerChoiceFiles[1]);
assert(colorPresetsSource.includes('aria-label={`Select ${color} background color`}'), 'solid color controls must retain accessible names');
assert(colorPresetsSource.includes('aria-label={`Select ${gradient.name} gradient`}'), 'gradient controls must retain accessible names');
const imageGallerySource = read(governedOwnerChoiceFiles[2]);
assert(imageGallerySource.includes("aria-label={`Select ${imageData.name || imageData.tags || 'gallery image'} as background`}"), 'gallery image controls must retain accessible names');
const styleSelectorSource = read(governedOwnerChoiceFiles[3]);
assert(styleSelectorSource.includes('role="checkbox"'), 'image style choices must retain checkbox semantics');
assert(styleSelectorSource.includes('aria-checked={isSelected}'), 'image style choices must expose selected state');
const descriptionGenerationSource = read(governedOwnerChoiceFiles[4]);
assert(descriptionGenerationSource.match(/aria-pressed=/g)?.length >= 2, 'description choices must expose both selected states');
assert(descriptionGenerationSource.match(/disabled=\{isProcessing\}/g)?.length >= 2, 'description choices must disable during generation');
const desktopAiDefaultsSource = read(governedOwnerChoiceFiles[5]);
assert(desktopAiDefaultsSource.match(/aria-pressed=\{isSelected\}/g)?.length >= 2, 'desktop generation-default description choices must expose both selected states');
assert(desktopAiDefaultsSource.match(/minHeight: 44/g)?.length >= 2, 'desktop generation-default description choices must retain accessible targets');
const mobileDesignEditorSource = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
assert(
  mobileDesignEditorSource.match(/aria-pressed=\{isSelected\}/g)?.length >= 3,
  'mobile design preset, tone, and layout choices must expose selected state',
);
assert(
  mobileDesignEditorSource.match(/<button[\s\S]{0,100}aria-pressed=\{isSelected\}/g)?.length >= 3,
  'mobile design preset, tone, and layout choices must use native selected-state buttons',
);
assert(
  !/<Card\s+aria-pressed=\{isSelected\}/.test(mobileDesignEditorSource),
  'mobile design selected state must not rely on Card forwarding ARIA attributes',
);
assert(
  !/<Card[^>]*onClick=/.test(mobileDesignEditorSource),
  'mobile design action surfaces must not rely on pointer-enhanced Card controls',
);
const multiSelectAttributeSource = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx');
assert(multiSelectAttributeSource.includes('role="checkbox"'), 'image-attribute choices must retain checkbox semantics');
assert(multiSelectAttributeSource.includes('aria-checked={isSelected}'), 'image-attribute choices must expose selected state');
assert(multiSelectAttributeSource.includes("event.key === 'Enter' || event.key === ' '"), 'image-attribute choices must retain Enter and Space activation');
assert(
  !/<Button[\s\S]{0,900}<Button/.test(multiSelectAttributeSource.slice(multiSelectAttributeSource.indexOf('<Button\n        block'), multiSelectAttributeSource.indexOf('{isMobile ?'))),
  'image-attribute trigger must not nest a button inside its outer button',
);
const aiDefaultsSource = read('src/components/mobile/sheets/AIDefaultsSheet.tsx');
assert(aiDefaultsSource.includes('aria-label="Use transparent image backgrounds"'), 'mobile transparent-background switch must retain an accessible name');
const mobileMenuScreenSource = read('src/components/mobile/screens/MobileMenuScreen.tsx');
const mobileCategoryEditSheetSource = read('src/components/mobile/sheets/MobileCategoryEditSheet.tsx');
assert(mobileMenuScreenSource.includes("<Button aria-label={t('close')} fill=\"none\" onClick={() => setIsFilterSheetOpen(false)}"), 'mobile Find & Fix close control must retain an accessible name');
assert(
  mobileMenuScreenSource.includes("<Popup\n                aria-label={t('filters')}\n                bodyStyle={{ maxHeight: '72vh', overflow: 'hidden', padding: 0 }}"),
  'mobile menu status legend dialog must retain its visible localized title as its accessible name',
);
assert(
  mobileMenuScreenSource.includes("<Popup\n                aria-label={t('findAndFix')}\n                bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}"),
  'mobile Find & Fix dialog must retain its visible localized title as its accessible name',
);
assert(
  mobileCategoryEditSheetSource.includes("const sheetTitle = mode === 'add' ? t('addCategoryLabel') : (category?.name || t('categoriesTitle'));"),
  'mobile category editor must derive one title for both visible and accessible naming',
);
assert(
  mobileCategoryEditSheetSource.includes('<Popup\n            aria-label={sheetTitle}'),
  'mobile category editor dialog must retain its visible localized title as its accessible name',
);
const nestedMobileMenuControls = findNestedInteractiveCompositeRows('src/components/mobile/screens/MobileMenuScreen.tsx');
assert(
  nestedMobileMenuControls.length === 0,
  `mobile menu rows must not nest Edit or Availability controls inside another interactive row:\n${nestedMobileMenuControls.join('\n')}`,
);
const projectsSource = read('src/components/templates/main-app/projects/index.tsx');
assert(
  projectsSource.includes('<span\n                                                    aria-hidden="true"')
    && projectsSource.includes('Choose Files to Upload\n                                                </span>'),
  'the upload dropzone visual CTA must remain non-interactive inside the outer upload button',
);
assert(
  !/<Button[\s\S]{0,700}Choose Files to Upload[\s\S]{0,80}<\/Button>/.test(projectsSource),
  'the upload dropzone must not nest a Choose Files button inside its outer upload button',
);
const reorderSortableItem = read('src/components/templates/main-app/projects/editorView/ReorderSortableItem.tsx');
const reorderMenuModal = read('src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx');
[
  'setActivatorNodeRef',
  'ref={setActivatorNodeRef}',
  'aria-label={`Reorder ${label}`}',
  'aria-pressed={isSelected}',
  'touchAction: \'none\'',
].forEach((token) => assert(
  reorderSortableItem.includes(token),
  `menu reorder controls must retain ${token}`,
));
assert(
  !/onClick=\{\(\) => \{\s*\}\}/.test(reorderMenuModal),
  'menu reorder rows must not expose empty click handlers',
);
const imagesWithoutAlt = [];
for (const relPath of rawImageFiles) {
  const source = read(relPath);
  const sourceFile = ts.createSourceFile(relPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(sourceFile) === 'img') {
        const hasAlt = node.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === 'alt',
        );
        if (!hasAlt) {
          imagesWithoutAlt.push(`${relPath}:${sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
assert(imagesWithoutAlt.length === 0, `raw images require alt text:\n${imagesWithoutAlt.join('\n')}`);

const mobilePrimitives = read('src/components/mobile/antd.tsx');
[
  "minWidth: fill === 'none' ? 44 : undefined",
  "role={onClick ? 'button' : undefined}",
  'tabIndex={onClick ? 0 : undefined}',
  "event.key !== 'Enter' && event.key !== ' '",
  'aria-label={ariaLabel}',
  'const isCloseIcon = isValidElement(backIcon) && backIcon.type === LuX',
  "const effectiveBackLabel = backLabel ?? (isCloseIcon ? localeText.close : 'Back')",
  'aria-label={effectiveBackLabel}',
].forEach((token) => assert(mobilePrimitives.includes(token), `mobile primitive boundary must include ${token}`));

const pricingComparison = read('src/components/website/pricing-pages/FeatureComparisonTable.tsx');
[
  'const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null)',
  'aria-controls={descriptionId}',
  'aria-expanded={isDescriptionExpanded}',
  'onClick={() => setExpandedFeatureId((current) => current === feature.id ? null : feature.id)}',
  '<p id={descriptionId}',
  'className="flex min-h-11 items-center gap-2 cursor-help text-left"',
].forEach((token) => assert(pricingComparison.includes(token), `pricing comparison accessibility boundary must include ${token}`));

const unauthorizedPage = read('src/app/(global-pages)/unauthorized/page.tsx');
assert(
  !unauthorizedPage.includes('&apos;'),
  'global access-denied copy must not render encoded apostrophe text',
);
assert(
  unauthorizedPage.includes('This account does not have access to this business.'),
  'global access-denied primary recovery copy must remain readable',
);
assert(
  unauthorizedPage.includes('You are signed in, but this account is not connected to this business.'),
  'global access-denied secondary recovery copy must explain the business access mismatch',
);
assert(
  unauthorizedPage.includes("style={{ width: '100%', maxWidth: 560, padding: 0 }}"),
  'global access-denied result must stay within narrow mobile viewports',
);
assert(
  unauthorizedPage.includes('wrap="wrap"'),
  'global access-denied recovery actions must wrap on narrow mobile viewports',
);
assert(
  unauthorizedPage.includes("import { getPlatformWebsiteBaseUrl } from '@constant/urls';"),
  'global access-denied recovery must use the environment-governed public website URL',
);
assert(
  unauthorizedPage.includes('onClick={openProductHelp}'),
  'global access-denied help action must leave the owner-app host for the public website contact route',
);
assert(unauthorizedPage.includes('isAnswerlatticeProductHostname(window.location.hostname)'), 'global access-denied help must preserve the AnswerLattice product boundary');
assert(unauthorizedPage.includes('Try another account'), 'global access-denied recovery must offer an explicit account switch');
assert(unauthorizedPage.includes('Signed in as {maskedAccount}'), 'global access-denied recovery must identify the active account without exposing it in full');
assert(unauthorizedPage.includes('await signOutSession(signInPath, { redirectOnIntentionalSignOut: false });'), 'global access-denied account switch must clear Firebase, NextAuth, and authenticated browser state');
assert(unauthorizedPage.includes('aria-live="assertive"'), 'global access-denied account-switch failure must be announced');
assert(
  !unauthorizedPage.includes('router.push(HOME_ROUTING)'),
  'global access-denied home action must not route into the protected owner dashboard',
);
assert(
  (unauthorizedPage.match(/style=\{\{ minHeight: 44 \}\}/g) || []).length === 2,
  'both global access-denied recovery actions must meet the 44px mobile touch target',
);
assert(
  unauthorizedPage.includes("style={{ width: 'clamp(112px, 36vw, 192px)' }}"),
  'global access-denied illustration must yield vertical space to recovery actions on small mobile viewports',
);
assert(
  unauthorizedPage.includes("status={isEmailError ? 'warning' : 'info'}"),
  'global access-denied result must not use the Ant exception status that discards the contextual illustration',
);
assert(
  unauthorizedPage.includes("style={{ boxSizing: 'border-box', minHeight: '100dvh', padding: 24 }}"),
  'global access-denied viewport shell must include safe padding inside the dynamic viewport height',
);
assert(
  unauthorizedPage.includes('<Flex gap={8} justify="center" wrap="wrap"'),
  'global access-denied recovery actions must use the compact mobile-safe gap',
);

const notFoundPage = read('src/app/(global-pages)/404/page.tsx');
assert(
  notFoundPage.includes("import { PLATFORM_URL } from '@constant/urls';"),
  'global not-found recovery must use the environment-governed public website URL',
);
assert(
  notFoundPage.includes('onClick={() => window.location.assign(PLATFORM_URL)}'),
  'global not-found home action must not route public surfaces into the protected owner dashboard',
);
assert(
  !notFoundPage.includes('router.push(HOME_ROUTING)'),
  'global not-found home action must not retain the owner-app-relative root',
);
assert(
  (notFoundPage.match(/style=\{\{ minHeight: 44 \}\}/g) || []).length === 2,
  'both global not-found recovery actions must meet the 44px mobile touch target',
);
assert(
  notFoundPage.includes("style={{ width: '100%', maxWidth: 560, padding: 0 }}"),
  'global not-found recovery actions must remain in the initial small-mobile viewport',
);
assert(
  notFoundPage.includes("style={{ width: 'clamp(112px, 36vw, 192px)' }}"),
  'global not-found illustration must yield vertical space to recovery actions on small mobile viewports',
);
assert(
  notFoundPage.includes('status="info"'),
  'global not-found result must not use the Ant exception status that discards the contextual illustration',
);
assert(
  notFoundPage.includes("style={{ boxSizing: 'border-box', minHeight: '100dvh', padding: 24 }}"),
  'global not-found viewport shell must include safe padding inside the dynamic viewport height',
);

const storeAccessRecovery = read('src/components/auth/StoreAccessRecovery.tsx');
[
  'aria-labelledby="store-access-recovery-title"',
  'data-recovery-source="firebase-store-access"',
  'Try again',
  'Sign out',
  'style={{ minHeight: 44 }}',
  'status="info"',
  'variant="accessDeniedContext"',
].forEach((token) => assert(
  storeAccessRecovery.includes(token),
  `store-access recovery boundary must include ${token}`,
));
assert(
  (storeAccessRecovery.match(/style=\{\{ minHeight: 44 \}\}/g) || []).length === 2,
  'store-access recovery actions must both meet the 44px mobile touch target',
);
const sessionProvider = read('src/providers/sessionProvider.tsx');
[
  '<StoreAccessRecovery',
  'setFirebaseAuthRetryNonce((current) => current + 1)',
  'setStoreBootstrapRetryNonce((current) => current + 1)',
  "signOut({ callbackUrl: '/signin' })",
  'firebaseAuthRetryNonce,',
].forEach((token) => assert(
  sessionProvider.includes(token),
  `session provider store-access recovery must include ${token}`,
));

const layoutWrapper = read('src/components/antdComponent/layoutWrapper/index.tsx');
assert(layoutWrapper.includes('<SkipToContentLink />'), 'owner shell must expose skip navigation');
assert(layoutWrapper.includes('id="main-content"'), 'owner shell must expose a main-content target');
assert(layoutWrapper.includes('<button'), 'desktop-to-mobile return control must use a native button');

const appBreadcrumb = read('src/components/organisms/headerComponent/appBreadcrumb/appBreadcrumb.tsx');
assert(
  appBreadcrumb.includes("aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}"),
  'desktop owner sidebar toggle must expose its current action',
);
assert(
  appBreadcrumb.includes("aria-label={tHeader('goToHomePage')}"),
  'desktop owner breadcrumb home action must use its localized accessible name',
);

[
  'src/components/organisms/sidebar/index.tsx',
  'src/components/organisms/sidebar/horizontalSidebar.tsx',
].forEach((relPath) => {
  const sidebar = read(relPath);
  assert(
    /SUPPORT_MENU_OPTIONS\.map\(\(option\) => \(\s*<button\s+type="button"/.test(sidebar),
    `${relPath} support-popover actions must use native buttons`,
  );
  assert(
    !/SUPPORT_MENU_OPTIONS\.map\(\(option\) => \(\s*<div\s+key=\{option\.key\}\s+onClick=/.test(sidebar),
    `${relPath} support-popover actions must not be pointer-only divs`,
  );
});

const ownerAccessibleSources = [
  ...walk('src/components/templates/main-app', (relPath) => relPath.endsWith('.tsx')),
  ...walk('src/components/organisms', (relPath) => relPath.endsWith('.tsx')),
  ...walk('src/components/antdComponent', (relPath) => relPath.endsWith('.tsx')),
];
const unnamedOwnerButtons = findUnnamedIconButtons([...new Set([...ownerAccessibleSources, ...mobileOwnerFiles])]);
assert(
  unnamedOwnerButtons.length === 0,
  `owner-app desktop and mobile icon buttons require accessible names:\n${unnamedOwnerButtons.join('\n')}`,
);
const projectEditor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
assert(projectEditor.includes('<span className="sr-only">Advanced view</span>'), 'advanced project view selector must have an accessible name');
assert(projectEditor.includes('<span className="sr-only">Traditional view</span>'), 'traditional project view selector must have an accessible name');
const editorActionsPopover = read('src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx');
[
  'role="button"',
  'tabIndex={0}',
  'aria-label={`${action.title}: ${action.description}`}',
  "event.key === 'Enter' || event.key === ' '",
  'event.preventDefault()',
  'activateAction(action.key)',
].forEach((token) => assert(
  editorActionsPopover.includes(token),
  `project editor action cards must preserve keyboard activation: ${token}`,
));
const zoomableImage = read('src/components/templates/main-app/projects/editorView/ZoomableImage.tsx');
assert(!/<span\s+onClick=\{handleResetZoom\}/.test(zoomableImage), 'project image zoom reset must not be a pointer-only span');
assert(zoomableImage.includes('aria-label="Reset zoom to 100%"'), 'project image zoom percentage reset must have an accessible name');

assert(
  sourceHasJsxTag('src/app/(website)/layout.tsx', 'SkipToContentLink'),
  'website shell must expose skip navigation',
);

[
  'src/components/website/features/FeaturesPage.tsx',
  'src/components/website/trust-security/TrustSecurityPage.tsx',
  'src/components/website/legal/PrivacyPolicyPage.tsx',
  'src/components/website/legal/TermsOfServicePage.tsx',
  'src/components/website/legal/RefundPolicyPage.tsx',
].forEach((relPath) => assert(
  sourceHasJsxTag(relPath, 'main'),
  `${relPath} must expose a main landmark for website skip navigation`,
));

const websiteHeader = read('src/components/website/Header.tsx');
[
  'aria-hidden={openDesktopMenu !== "features"}',
  'aria-hidden={openDesktopMenu !== "resources"}',
  'data-open={openDesktopMenu === "features" ? "true" : "false"}',
  'data-open={openDesktopMenu === "resources" ? "true" : "false"}',
  'inert={openDesktopMenu !== "features" ? true : undefined}',
  'inert={openDesktopMenu !== "resources" ? true : undefined}',
  'current === "features" ? null : "features"',
  "querySelector<HTMLElement>('[aria-controls]')",
  'window.requestAnimationFrame(() => trigger?.focus())',
  'aria-label={isOpen ? t("Header.closeMenu") : t("Header.openMenu")}',
  'aria-labelledby="ws-mobile-navigation-title"',
  'id="ws-mobile-navigation-title"',
].forEach((token) => assert(
  websiteHeader.includes(token),
  `website dropdown accessibility boundary must include ${token}`,
));
assert(
  !websiteHeader.includes('aria-label={t("Header.featuresMenuAria")}'),
  'website Features trigger must use its visible label in both collapsed and expanded states',
);
assert(
  !websiteHeader.includes('aria-label={t("Header.resourcesMenuAria")}'),
  'website Resources trigger must use its visible label in both collapsed and expanded states',
);
assert(
  !websiteHeader.includes('import { signOutSession } from "@lib/auth/client";'),
  'public website header must not statically load the authenticated Firebase sign-out chain',
);
assert(
  websiteHeader.includes('await import("@lib/auth/client")'),
  'public website header must lazy-load authenticated sign-out only when requested',
);

const accessibilityStyles = read('public/styles/base/_accessibility.scss');
assert(accessibilityStyles.includes(':focus-visible'), 'global focus-visible treatment must exist');
assert(accessibilityStyles.includes('@media (prefers-reduced-motion: reduce)'), 'global reduced-motion treatment must exist');

const onboardingModal = read('src/components/website/pricing-pages/OnboardingModal.tsx');
assert(!/<span[^>]+onClick=/.test(onboardingModal), 'website sign-in control must not be a clickable span');

const editorFiltersPopover = read('src/components/templates/main-app/projects/editorView/EditorFiltersPopover.tsx');
[
  'aria-label="Category"',
  'aria-label="Price availability"',
  'aria-label="Images"',
  'aria-label="Status"',
  'aria-label="Time slot"',
].forEach((token) => assert(
  editorFiltersPopover.includes(token),
  `desktop editor filters accessibility boundary must include ${token}`,
));

const desktopItemEditor = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
[
  'aria-label="Category"',
  'aria-label="Prep time"',
  'ariaLabelForHandle="Promotion"',
  'aria-label="Calories"',
  'aria-label="Protein"',
  'aria-label="Carbs"',
  'aria-label="Fat"',
  'aria-label="Serving size"',
  'aria-label={field.label}',
].forEach((token) => assert(
  desktopItemEditor.includes(token),
  `desktop item editor accessibility boundary must include ${token}`,
));
assert(
  desktopItemEditor.split('aria-label="Category"').length - 1 === 2,
  'desktop item editor must name both locked and editable Category selectors',
);
[
  'htmlFor="edit-item-active-switch"',
  'id="edit-item-active-switch"',
  'htmlFor="edit-item-availability-switch"',
  'id="edit-item-availability-switch"',
  'htmlFor="edit-item-best-seller-switch"',
  'id="edit-item-best-seller-switch"',
].forEach((token) => assert(
  desktopItemEditor.includes(token),
  `desktop item status labels must be associated with their switches through ${token}`,
));
assert(
  !/<Text[^>]+onClick=\{\(\) => setItemData\(prev => \(\{ \.\.\.prev!,(?: active| available| isBestSeller):/.test(desktopItemEditor),
  'desktop item status labels must not remain pointer-only Text controls',
);

const mobileSources = walk('src/components/mobile', (relPath) => relPath.endsWith('.tsx'));
const mobileFeedbackSource = read('src/components/mobile/screens/MobileFeedbackScreen.tsx');
const platformSettings = read('src/components/templates/platform/settings/index.tsx');
assert(platformSettings.includes('aria-label={`Theme color ${color}`}'), 'Platform theme color choices must expose their exact color as an accessible name.');
assert(platformSettings.includes('aria-pressed={isSelected}'), 'Platform theme color choices must expose their selected state.');
const sharedDrawer = read('src/components/antdComponent/drawerElement/index.tsx');
assert(sharedDrawer.includes("aria-label={props['aria-label'] ?? (typeof props.title === 'string' ? props.title : undefined)}"), 'Shared drawers with string titles must expose that title as their accessible dialog name.');
const platformTenantDrawer = read('src/components/templates/platform/tenants/tenantDetailsModal.tsx');
assert(platformTenantDrawer.includes('aria-label="Tenant active"'), 'Platform tenant lifecycle switch must expose its purpose.');
assert(platformTenantDrawer.includes('aria-label="Business Type"'), 'Platform tenant business-type selector must expose its purpose.');
const platformAssets = read('src/components/templates/platform/assets/index.tsx');
assert(platformAssets.includes('aria-label="Add asset category"'), 'Platform Assets category icon action must expose its purpose.');
assert(platformAssets.includes('aria-label="Add asset item"'), 'Platform Assets item icon action must expose its purpose.');
assert(platformAssets.includes('aria-label={`Edit ${type} ${item.name}`}'), 'Platform Assets edit icon actions must expose their exact entity purpose.');
const platformAssetDetails = read('src/components/templates/platform/assets/detailsModal.tsx');
assert(platformAssetDetails.includes('aria-label={`${modalData.type} name`}'), 'Platform asset names must expose their entity-specific purpose.');
assert(platformAssetDetails.includes('aria-label={`${modalData.type} active`}'), 'Platform asset lifecycle switches must expose their entity-specific purpose.');
assert(platformAssetDetails.includes('aria-label="Business Types"'), 'Platform asset business-type selector must expose its purpose.');
const platformFounderMonitor = read('src/components/templates/main-app/platform/founderMonitor/index.tsx');
assert(platformFounderMonitor.includes('aria-label="Reporting window"'), 'Founder Monitor date-window selector must expose its purpose.');
const platformOpsControlRoom = read('src/components/templates/main-app/platform/opsControlRoom/index.tsx');
assert(platformOpsControlRoom.includes('aria-label="Store to force republish"'), 'Ops Control Room store selector must expose its recovery purpose.');
assert(platformOpsControlRoom.includes("modalRender: labelConfirmDialog(action === 'activate' ? 'Enable SAFE_MODE' : 'Disable SAFE_MODE')"), 'Ops Control Room SAFE_MODE confirmation must expose its dynamic title as the dialog name.');
assert(platformOpsControlRoom.includes("modalRender: labelConfirmDialog('Force Republish')"), 'Ops Control Room force-republish confirmation must expose its title as the dialog name.');
const platformSchedulerMonitor = read('src/components/templates/main-app/platform/schedulerMonitor/index.tsx');
assert(platformSchedulerMonitor.includes('aria-label="Store for nightly recovery"'), 'Scheduler Monitor recovery store selector must expose its purpose.');
assert(platformSchedulerMonitor.includes('aria-label="Run status"'), 'Scheduler Monitor status filter must expose its purpose.');
assert(platformSchedulerMonitor.includes('aria-label="Run trigger"'), 'Scheduler Monitor trigger filter must expose its purpose.');
assert(platformSchedulerMonitor.includes("modalRender: labelConfirmDialog('Run Store Nightly Recovery')"), 'Scheduler Monitor recovery confirmation must expose its title as the dialog name.');
const platformExtractionMonitor = read('src/components/templates/main-app/platform/extractionMonitor/index.tsx');
assert(platformExtractionMonitor.includes('filterIcon: () => <LuFilter aria-label="Filter extraction status" />'), 'Extraction Monitor status filter must expose its table-specific purpose.');
const platformAnswerlatticeIntake = read('src/components/templates/main-app/platform/answerlatticeIntakeMonitor/index.tsx');
assert(platformAnswerlatticeIntake.includes('aria-label="Answerlattice workspace"'), 'The isolated Answerlattice intake boundary must expose its workspace selector purpose.');
const platformEntityBlocks = read('src/components/templates/platform/settings/EntityBlockSettings.tsx');
assert(platformEntityBlocks.includes('aria-label="Entity type"'), 'Entity Blocks type selector must expose its purpose.');
assert(platformEntityBlocks.includes('aria-label="Tenant scope"'), 'Entity Blocks tenant-scope selector must expose its purpose.');
assert(platformEntityBlocks.includes('aria-label={`${entityType} entity`}'), 'Entity Blocks entity selector must expose its dynamic purpose.');
assert(platformEntityBlocks.includes('modalRender: labelConfirmDialog(nextBlockedState ? `Block this ${entityType}?` : `Unblock this ${entityType}?`)'), 'Entity Blocks confirmation must expose its dynamic title as the dialog name.');
const platformAssetTemplates = read('src/components/templates/platform/assetTemplates/index.tsx');
[
  'aria-label="Business category"',
  'aria-label="Asset type"',
  'aria-label="Template family"',
  'aria-label="Template name"',
  'aria-label="Description"',
  'aria-label="Status"',
].forEach((token) => assert(platformAssetTemplates.includes(token), `Platform Asset Templates must retain ${token}.`));
const platformTenants = read('src/components/templates/platform/tenants/index.tsx');
assert(platformTenants.includes('aria-label={`Edit tenant ${record.name || record.tenantId}`}'), 'Platform tenant rows must expose a native, entity-specific Edit action.');
assert(!platformTenants.includes('onRow={(record: PlatformTenantRecord)'), 'Platform tenant tables must not retain pointer-only row actions.');
[
  "copyLabel={t('copyLink')}",
  "shareLabel={mobileNavigation('share')}",
  "showQrLabel={t('showQr')}",
  "openLabel={`${common('open')} ${t('feedbackQrTitle')}`}",
  'aria-label={ariaLabel}',
].forEach((token) => assert(
  mobileFeedbackSource.includes(token),
  `mobile feedback icon actions must retain their accessible-name contract through ${token}`,
));
for (const relPath of mobileSources) {
  assert(!/minHeight\s*:\s*['"]auto['"]/.test(read(relPath)), `${relPath} must not override the shared touch-target height`);
}

const docs = [
  '__docs__/global-accessibility/README.md',
  '__docs__/global-accessibility/global-accessibility_spec.md',
  '__docs__/global-accessibility/global-accessibility_impl.md',
  '__docs__/global-accessibility/global-accessibility_firebase.md',
  '__docs__/global-accessibility/global-accessibility_mobile-support.md',
  '__docs__/global-accessibility/global-accessibility_test-cases.md',
  '__docs__/global-accessibility/global-accessibility_verification.md',
];
docs.forEach((relPath) => assert(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`));

console.log('Global accessibility source boundary passed.');
