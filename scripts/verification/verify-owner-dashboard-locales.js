#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parse } = require('@formatjs/icu-messageformat-parser');
const {
  ENGLISH_OWNER_LOCALES,
  SOURCE_LOCALE,
  getOwnerLocaleNamespaces,
} = require('../localization/owner-locale-boundary');
const {
  MAX_TRANSLATION_LENGTH_RATIO,
  MIN_TRANSLATION_LENGTH_RATIO,
  assertProviderMetadata,
  hasLeakedProviderPlaceholder,
  hasReviewedQualityOverride,
  hasDashboardScriptCorruption,
  hasNumericArtifact,
  hasSuspiciousShortLabelExpansion,
  hasUnexpectedSentenceExpansion,
  isProtectedInvariant,
  isReviewedExactOverride,
  normalizeOwnerLocaleValue,
  providerMetadata,
  qualityProviderForLocale,
  translationLengthRatio,
} = require('../localization/owner-locale-semantic');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales', 'menulist.ai');
const TRANSLATION_ASSURED_NAMESPACES = [
  'AppSettings',
  'Common',
  'Dashboard',
  'MobileDashboard',
  'Settings',
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flattenStrings(value, prefix = '', output = new Map()) {
  if (typeof value === 'string') {
    output.set(prefix, value);
    return output;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, output);
  }

  return output;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function mapDigest(messages) {
  return sha256(
    JSON.stringify(
      [...messages.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

function getByPath(value, dottedPath) {
  return dottedPath.split('.').reduce((current, key) => current?.[key], value);
}

function parseLocaleRegistry() {
  const common = read('src/constants/common.ts');
  const registryMatch = common.match(
    /export const APP_LANGUAGES = \[([\s\S]*?)\n\]/,
  );
  assert(registryMatch, 'APP_LANGUAGES registry could not be read');

  return [...registryMatch[1].matchAll(/value:\s*"([^"]+)"/g)]
    .map((match) => match[1]);
}

function readLocale(locale) {
  const localePath = path.join(LOCALE_DIR, `${locale}.json`);
  assert(fs.existsSync(localePath), `Missing locale file: ${locale}.json`);

  try {
    return JSON.parse(fs.readFileSync(localePath, 'utf8'));
  } catch (error) {
    throw new Error(`${locale}.json is not valid JSON: ${error.message}`);
  }
}

function extractIcuVariables(message) {
  return [...message.matchAll(/\{([A-Za-z_][\w.-]*)(?=[,}])/g)]
    .map((match) => match[1])
    .sort();
}

function assertValidIcu(locale, key, message) {
  try {
    parse(message);
  } catch (error) {
    throw new Error(`${locale}:${key} is not valid ICU message syntax: ${error.message}`);
  }
}

function assertVariablesMatch(locale, key, source, translated) {
  const sourceVariables = extractIcuVariables(source);
  const translatedVariables = extractIcuVariables(translated);
  assert(
    sourceVariables.join('\0') === translatedVariables.join('\0'),
    `${locale}:${key} ICU variables [${translatedVariables.join(', ')}] do not match source [${sourceVariables.join(', ')}]`,
  );
}

const locales = parseLocaleRegistry();
const pinnedProviderMetadata = providerMetadata();
assertProviderMetadata(pinnedProviderMetadata);
assert(
  (() => {
    try {
      assertProviderMetadata({
        ...pinnedProviderMetadata,
        madlad400: {
          ...pinnedProviderMetadata.madlad400,
          revision: 'untrusted-revision',
        },
      });
      return false;
    } catch {
      return true;
    }
  })(),
  'Semantic result admission must reject changed provider provenance',
);
const localeFiles = fs.readdirSync(LOCALE_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''))
  .sort();

assert(new Set(locales).size === locales.length, 'APP_LANGUAGES contains duplicate locale values');
assert(
  locales.slice().sort().join('\0') === localeFiles.join('\0'),
  'APP_LANGUAGES and public/locales/menulist.ai must contain the same locale set',
);

const source = readLocale(SOURCE_LOCALE);
const ownerNamespaces = getOwnerLocaleNamespaces(source);
const ownerSource = new Map();
for (const namespace of ownerNamespaces) {
  const namespaceValue = getByPath(source, namespace);
  assert(namespaceValue, `Source locale is missing owner namespace ${namespace}`);
  flattenStrings(namespaceValue, namespace, ownerSource);
}
const translationAssuredSource = new Map();
for (const namespace of TRANSLATION_ASSURED_NAMESPACES) {
  flattenStrings(source[namespace], namespace, translationAssuredSource);
}
const semanticEvidence = JSON.parse(
  read('__docs__/global-localization/owner-locale-semantic-coverage.json'),
);
assert(semanticEvidence.version === 1, 'Owner semantic evidence version is unsupported');
assert(
  semanticEvidence.sourceOwnerSha256 === mapDigest(ownerSource),
  'Owner semantic evidence was generated for a different en-US owner source',
);
assert(
  semanticEvidence.sourceOwnerValueCount === ownerSource.size,
  'Owner semantic evidence source-value count is stale',
);
assertProviderMetadata(semanticEvidence.providers);
assert(
  Object.keys(semanticEvidence.locales || {}).sort().join('\0')
    === locales.slice().sort().join('\0'),
  'Owner semantic evidence must cover every registered locale exactly once',
);

assert(
  ownerSource.has('AppSettings.language'),
  'Source locale must include AppSettings.language used by the owner settings sheet',
);
assert(
  ownerSource.has('AppSettings.summary'),
  'Source locale must include AppSettings.summary used by the mobile settings entry',
);
assert(
  ownerSource.has('Settings.selectTimezone'),
  'Source locale must include the shared Settings namespace used by owner settings controls',
);
assert(
  ownerSource.has('MobileNavigation.ariaLabel'),
  'Source locale must include the MobileShell navigation accessibility label',
);
assert(
  ownerSource.has('MobileShell.subscribeDescription'),
  'Source locale must include the MobileShell subscription boundary copy',
);
assert(
  ownerSource.has('MobileShell.returnToMobile'),
  'Source locale must include the forced-desktop return action',
);
assert(
  ownerSource.has('Dashboard.owner.viewModes.graph')
    && ownerSource.has('Dashboard.owner.offering.menu.viewsLabel')
    && ownerSource.has('Dashboard.owner.publicTruthStatus.title.active')
    && ownerSource.has('Dashboard.owner.ownerActions.status.openCount')
    && ownerSource.has('Dashboard.owner.menuSetup.title'),
  'Dashboard presentation dictionaries must live under Dashboard.owner',
);
assert(
  !source.MobileDashboard?.offering
    && !source.MobileDashboard?.publicTruthStatus
    && !source.MobileDashboard?.ownerActions
    && !source.MobileDashboard?.menuSetup
    && !source.MobileDashboard?.viewModes?.graph,
  'Shared dashboard dictionaries must not be duplicated under MobileDashboard',
);
assert(
  !ownerSource.has('Dashboard.owner.customerApp.returningOpens30d'),
  'Dashboard locales must not claim returning opens without a returning-open read model',
);
assert(
  ownerSource.has('Dashboard.owner.googleListing.couldNotOpen')
    && ownerSource.has('Dashboard.owner.businessHealth.assistant.englishOnlyTitle')
    && ownerSource.has('Dashboard.owner.businessHealth.publicTruth.modules.menu_freshness.title'),
  'Dashboard locales must cover errors, assistant language boundaries, and public-truth modules',
);

for (const locale of locales) {
  const messages = readLocale(locale);
  const localeOwnerMessages = new Map();
  for (const namespace of ownerNamespaces) {
    flattenStrings(messages[namespace], namespace, localeOwnerMessages);
  }
  assert(
    [...localeOwnerMessages.keys()].sort().join('\0')
      === [...ownerSource.keys()].sort().join('\0'),
    `${locale} owner messages contain stale keys outside the canonical en-US owner boundary`,
  );

  for (const [key, sourceValue] of ownerSource) {
    const translated = getByPath(messages, key);
    assert(typeof translated === 'string', `${locale}:${key} is missing`);
    assert(translated.trim().length > 0, `${locale}:${key} is empty`);
    assertValidIcu(locale, key, translated);
    assertVariablesMatch(locale, key, sourceValue, translated);
    if (!ENGLISH_OWNER_LOCALES.has(locale)) {
      if ([...sourceValue].length >= 20) {
        const ratio = translationLengthRatio(sourceValue, translated);
        assert(
          ratio >= MIN_TRANSLATION_LENGTH_RATIO
            && ratio <= MAX_TRANSLATION_LENGTH_RATIO,
          `${locale}:${key} translated/source length ratio ${ratio.toFixed(2)} is outside the semantic quality boundary`,
        );
      }
      if (
        translated === sourceValue
        && /[A-Za-z]/.test(sourceValue)
      ) {
        assert(
          isProtectedInvariant(sourceValue)
            || isReviewedExactOverride(locale, key, sourceValue),
          `${locale}:${key} remains exact English without an approved invariant or reviewed cognate`,
        );
      }
      if (key.startsWith('Dashboard.owner.')) {
        assert(
          translated === normalizeOwnerLocaleValue(locale, key, translated),
          `${locale}:${key} contains an invalid locale-specific orthography sequence`,
        );
        assert(
          !hasDashboardScriptCorruption(locale, translated),
          `${locale}:${key} contains characters from an unexpected native script`,
        );
        const qualityProvider = qualityProviderForLocale(locale);
        if (
          qualityProvider.provider !== 'indictrans2'
          && !hasReviewedQualityOverride(locale, key, sourceValue)
        ) {
          assert(
            !hasUnexpectedSentenceExpansion(sourceValue, translated),
            `${locale}:${key} adds unrelated dashboard sentences`,
          );
          assert(
            !hasSuspiciousShortLabelExpansion(sourceValue, translated),
            `${locale}:${key} contains duplicated or sentence-expanded dashboard label text`,
          );
        }
        assert(
          !hasLeakedProviderPlaceholder(translated),
          `${locale}:${key} contains a leaked translation-provider placeholder`,
        );
        assert(
          !hasNumericArtifact(sourceValue, translated),
          `${locale}:${key} changes or invents a numeric dashboard value`,
        );
        if (isProtectedInvariant(sourceValue)) {
          assert(
            translated === sourceValue,
            `${locale}:${key} changes a protected dashboard product or platform term`,
          );
        }
      }
    }
  }

  if (typeof messages.Navigation?.['App Appearance'] === 'string') {
    assert(
      messages.Navigation['App Appearance'] === messages.AppSettings.title,
      `${locale}:Navigation.App Appearance must match AppSettings.title`,
    );
  }
  if (messages.MobileMore) {
    assert(
      messages.MobileMore.appSettings === messages.AppSettings.title,
      `${locale}:MobileMore.appSettings must match AppSettings.title`,
    );
    assert(
      messages.MobileMore.appSettingsDesc === messages.AppSettings.summary,
      `${locale}:MobileMore.appSettingsDesc must match AppSettings.summary`,
    );
  }

  assert(
    semanticEvidence.locales[locale].ownerSha256
      === mapDigest(localeOwnerMessages),
    `${locale} owner messages do not match the checked-in semantic evidence hash`,
  );
  assert(
    semanticEvidence.locales[locale].ownerValueCount === localeOwnerMessages.size,
    `${locale} owner semantic evidence value count is stale`,
  );
}

const odiaMessages = flattenStrings(readLocale('or-IN'));
const odiaMixedScriptArtifacts = [
  /କ\s+[A-Za-z]+\s+ଣସି/,
  /ଗା ark/,
  /ପୁନ et/,
  /ହ୍ ats/,
  /ଦ Daily/,
  /Histor ତିହାସିକ/,
  /ଅବ alid/,
  /ଦ୍ customers/,
];
for (const [key, value] of odiaMessages) {
  for (const artifact of odiaMixedScriptArtifacts) {
    assert(
      !artifact.test(value),
      `or-IN:${key} contains a known mixed-script translation artifact`,
    );
  }
}

const ownerSettingsSurfaceChecks = [
  {
    file: 'src/components/antdComponent/layoutWrapper/index.tsx',
    snippets: [
      "useTranslations('MobileShell')",
      'isRtlLocale(appLocale)',
      "tMobileShell('returnToMobile')",
      'paddingInlineStart:',
      "transition: 'padding-inline-start 0.2s ease'",
    ],
  },
  {
    file: 'src/components/mobile/screens/MobileMoreScreen.tsx',
    snippets: ["tAppSettings('title')", "tAppSettings('summary')"],
  },
  {
    file: 'src/components/organisms/sidebar/index.tsx',
    snippets: [
      "useTranslations('AppSettings')",
      "useTranslations('Settings')",
      "tAppSettings('title')",
      "tSettings('lightMode')",
    ],
  },
  {
    file: 'src/components/organisms/sidebar/horizontalSidebar.tsx',
    snippets: [
      "useTranslations('AppSettings')",
      "useTranslations('Settings')",
      "tAppSettings('title')",
      "tSettings('lightMode')",
    ],
  },
  {
    file: 'src/components/mobile/MobileNavigation.tsx',
    snippets: [
      "useTranslations('MobileNavigation')",
      "t('ariaLabel')",
      't(tab.titleKey)',
    ],
  },
  {
    file: 'src/components/mobile/MobileShell.tsx',
    snippets: [
      "useTranslations('MobileShell')",
      "t('subscribeTitle')",
      "t('subscribeDescription')",
      "t('viewPlans')",
    ],
  },
];
for (const { file, snippets } of ownerSettingsSurfaceChecks) {
  const contents = read(file);
  for (const snippet of snippets) {
    assert(contents.includes(snippet), `${file} must use canonical owner settings copy: ${snippet}`);
  }
}

const forbiddenMobileShellCopy = [
  {
    file: 'src/components/mobile/MobileNavigation.tsx',
    snippets: [
      'aria-label="Primary mobile navigation"',
      "title: 'Today'",
      "title: 'Menu'",
      "title: 'Menu help'",
      "title: 'Share'",
      "title: 'More'",
    ],
  },
  {
    file: 'src/components/mobile/MobileShell.tsx',
    snippets: [
      '>Subscribe to Get Started<',
      'Choose a plan to start creating your digital menu and managing your business.',
      '>View Plans<',
      'page="Dashboard"',
      'page="Today"',
      'page="Business Health"',
      'page="Mobile App"',
    ],
  },
];
for (const { file, snippets } of forbiddenMobileShellCopy) {
  const contents = read(file);
  for (const snippet of snippets) {
    assert(!contents.includes(snippet), `${file} contains hardcoded owner copy: ${snippet}`);
  }
}

const ownerSourceRoots = [
  'src/app/(main)',
  'src/components/templates/main-app',
  'src/components/mobile',
  'src/components/organisms',
  'src/components/molecules',
];
const ownerSourcePathExclusions = [
  '/campaigncue/',
  '/platform/',
  '/reseller/',
];
function collectSourceFiles(relativePath, output = []) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return output;
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const childRelativePath = path.posix.join(relativePath, entry.name);
    if (ownerSourcePathExclusions.some((fragment) => `/${childRelativePath}/`.includes(fragment))) {
      continue;
    }
    if (entry.isDirectory()) {
      collectSourceFiles(childRelativePath, output);
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      output.push(childRelativePath);
    }
  }
  return output;
}

const ownerNamespaceSet = new Set(ownerNamespaces);
for (const file of ownerSourceRoots.flatMap((root) => collectSourceFiles(root))) {
  const contents = read(file);
  for (const match of contents.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const namespaceRoot = match[1].split('.')[0];
    assert(
      ownerNamespaceSet.has(namespaceRoot),
      `${file} mounts '${match[1]}' outside the canonical MenuList owner locale boundary`,
    );
  }
}

const dashboardStructuredPresentationChecks = [
  {
    file: 'src/hooks/useDashboardOfferingLabels.ts',
    snippets: [
      "useTranslations('Dashboard.owner.offering')",
      'getBusinessOfferingKind(',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx',
    snippets: [
      "useTranslations('Dashboard.owner')",
      "useTranslations('Dashboard.owner.ownerActions')",
      'translate: tOwnerActions',
      'ownerActionLayer.openCount > 0',
      'formatDashboardRelativeUpdate(',
      'getOwnerConfirmedPlacementCount(storeDetails)',
      'hasOwnerPublicLink(storeDetails)',
      'hasOwnerWorkingHours(storeDetails)',
      'isPublishedMenuProject(dashboardProjectForChildren)',
    ],
  },
  {
    file: 'src/components/mobile/screens/MobileDashboardScreen.tsx',
    snippets: [
      "useTranslations('Dashboard.owner')",
      "useTranslations('Dashboard.owner.ownerActions')",
      'translate: tOwnerActions',
      'ownerActionLayer.openCount > 0',
      'getDashboardLanguageLabel(',
      'getOwnerConfirmedPlacementCount(storeDetails)',
      'hasOwnerPublicLink(storeDetails)',
      'hasOwnerWorkingHours(storeDetails)',
      'isPublishedMenuProject(selectedProjectSummary)',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx',
    snippets: [
      'getDashboardOverviewStatusMessage(status, t)',
      'formatDashboardWeekRange(',
      '<AISummaryCard summary={aiSummary}',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/TodaySoFarCard.tsx',
    snippets: [
      'getDashboardLanguageLabel(',
      'formatDashboardPercent(',
      'formatNumber(',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerDashboardGraphMode.tsx',
    snippets: [
      'trendMetricLabel(',
      'trendStatusLabel(',
      'getOwnerDashboardSourceLabel(',
      'formatDashboardPercent(',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/MenuAnalyticsDetailsCard.tsx',
    snippets: ['buildMenuAnalyticsDetailSections(data, t, locale)'],
  },
  {
    file: 'src/components/mobile/screens/dashboardSections/MobileMenuAnalyticsDetailsCard.tsx',
    snippets: ['buildMenuAnalyticsDetailSections(data, t, locale)'],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerActionPlanCard.tsx',
    snippets: [
      'getOwnerActionDisplay(action, locale, t)',
      'getOwnerConfidenceDisplay(confidence, locale, t)',
      'getOwnerActionResultDisplay(result, locale, t)',
      'getOwnerActionPriorityLabel(action.priority, t)',
    ],
  },
  {
    file: 'src/components/mobile/screens/dashboardSections/MobileOwnerActionPlanCard.tsx',
    snippets: [
      'getOwnerActionDisplay(action, locale, t)',
      'getOwnerConfidenceDisplay(confidence, locale, t)',
      'getOwnerActionResultDisplay(result, locale, t)',
      'getOwnerActionPriorityLabel(action.priority, t)',
    ],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx',
    snippets: ['getOwnerBusinessHealthDashboardPresentation(current, formatter, t)'],
  },
  {
    file: 'src/components/mobile/components/MobileBusinessHealthCard.tsx',
    snippets: ['getOwnerBusinessHealthDashboardPresentation(current, formatter, t)'],
  },
  {
    file: 'src/lib/ownerBusinessAssistant/dashboardPresentation.ts',
    snippets: [
      'getOwnerBusinessHealthCheckPresentation(',
      'getOwnerBusinessHealthSourcePresentation(',
      'getOwnerBusinessLocationPresentation(',
      'isEnglishDashboardLocale(locale) && store.topReason',
    ],
  },
  {
    file: 'src/lib/public-truth-tools/ownerPublicTruthPresentation.ts',
    snippets: [
      'getOwnerPublicTruthStatusPresentation(',
      'getOwnerPublicTruthFactPresentation(',
      'getOwnerPublicTruthModulePresentation(',
      'getOwnerPublicTruthPrimaryAction(',
    ],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPriorityChecks.tsx',
    snippets: ['getOwnerBusinessHealthCheckPresentation(check, t)'],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthLocationSummary.tsx',
    snippets: ['getOwnerBusinessLocationPresentation(store, locale, formatter, t)'],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantSourceDisclosure.tsx',
    snippets: ['getOwnerBusinessHealthSourcePresentation(source, formatter, t)'],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx',
    snippets: [
      '!isEnglishDashboardLocale(locale)',
      "t('businessHealth.assistant.englishOnlyTitle')",
    ],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx',
    snippets: [
      'getOwnerPublicTruthFactPresentation(check, t)',
      'getOwnerPublicTruthModulePresentation(module, t)',
      'getOwnerPublicTruthSetupJobPresentation(job, t)',
    ],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/PublicTruthMonitorPanel.tsx',
    snippets: [
      'getOwnerPublicTruthStatusPresentation(latest.status, t)',
      "formatDateTime(latest.generatedAt, 'date', formatter)",
      "t('businessHealth.publicTruth.downloadEnglishReport')",
    ],
  },
  {
    file: 'src/components/mobile/screens/MobileBusinessHealthScreen.tsx',
    snippets: [
      'isEnglishDashboardLocale(locale)',
      'getOwnerBusinessHealthCheckPresentation(check, t)',
      'getOwnerBusinessLocationPresentation(store, locale, formatter, t)',
      "t('businessHealth.assistant.englishOnlyTitle')",
    ],
  },
  {
    file: 'src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx',
    snippets: [
      'getOwnerPublicTruthFactPresentation(check, t)',
      'getOwnerPublicTruthModulePresentation(module, t)',
      'getOwnerPublicTruthSetupJobPresentation(job, t)',
    ],
  },
  {
    file: 'src/components/mobile/components/MobilePublicTruthMonitorCard.tsx',
    snippets: [
      'getOwnerPublicTruthStatusPresentation(latest.status, t)',
      "formatDateTime(latest.generatedAt, 'date', formatter)",
      "t('businessHealth.publicTruth.downloadEnglishShort')",
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/MenuSetupProgress.tsx',
    snippets: ["useTranslations('Dashboard.owner.menuSetup')", 'translate: t'],
  },
  {
    file: 'src/components/mobile/components/MenuSetupProgress.tsx',
    snippets: ["useTranslations('Dashboard.owner.menuSetup')", 'translate: t'],
  },
  {
    file: 'src/components/templates/main-app/dashboard/MenuQualitySignals.tsx',
    snippets: ["useTranslations('Dashboard.owner')", 'localizeQualitySignal('],
  },
  {
    file: 'src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx',
    snippets: ['formatDashboardPercent(', 'formatNumber('],
  },
  {
    file: 'src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx',
    snippets: ['formatDashboardPercent(', 'formatNumber('],
  },
];

for (const { file, snippets } of dashboardStructuredPresentationChecks) {
  const contents = read(file);
  for (const snippet of snippets) {
    assert(contents.includes(snippet), `${file} must preserve dashboard locale projection: ${snippet}`);
  }
}

const forbiddenDashboardPresentationBypasses = [
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerDashboardGraphMode.tsx',
    snippets: ['comparison.label', 'comparison.message'],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx',
    snippets: ['statusMessage'],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerActionPlanCard.tsx',
    snippets: [
      '{action.title}',
      '{action.description}',
      '{action.reason}',
      '{action.actionLabel}',
      '{confidence.label}',
      '{confidence.message}',
      '{result.label}',
      '{result.message}',
    ],
  },
  {
    file: 'src/components/mobile/screens/dashboardSections/MobileOwnerActionPlanCard.tsx',
    snippets: [
      '{action.title}',
      '{action.description}',
      '{action.reason}',
      '{action.actionLabel}',
      '{confidence.label}',
      '{confidence.message}',
      '{result.label}',
      '{result.message}',
    ],
  },
  {
    file: 'src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthDashboardCard.tsx',
    snippets: ['current.summary.headline', 'current.summary.message', 'current.freshness'],
  },
  {
    file: 'src/components/mobile/components/MobileBusinessHealthCard.tsx',
    snippets: ['current.summary.headline', 'current.summary.message', 'current.freshness'],
  },
  {
    file: 'src/lib/analytics/ownerDashboardDetails.ts',
    snippets: ['.toLocaleString(', 'Number(row.value)', 'parseFloat(row.value)', 'parseInt(row.value'],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/TodaySoFarCard.tsx',
    snippets: ['<Text strong>{topLanguage.label}</Text>'],
  },
  {
    file: 'src/components/mobile/screens/MobileDashboardScreen.tsx',
    snippets: [
      'label: topLanguage.label || topLanguage.language',
      "['googleBusiness', 'instagramBio', 'whatsappProfile']",
      'const selectedMenuIsLive = selectedProjectSummary?.active !== false',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx',
    snippets: [
      "['googleBusiness', 'instagramBio', 'whatsappProfile']",
      '|| data?.lastFetched',
    ],
  },
  {
    file: 'src/components/templates/main-app/dashboard/AnalyticsDashboard/CustomerAppMetrics.tsx',
    snippets: ["t('customerApp.returningOpens30d')"],
  },
  {
    file: 'src/components/mobile/screens/dashboardSections/MobileCustomerAppMetrics.tsx',
    snippets: ["t('customerApp.returningOpens30d')"],
  },
];

for (const { file, snippets } of forbiddenDashboardPresentationBypasses) {
  const contents = read(file);
  for (const snippet of snippets) {
    assert(!contents.includes(snippet), `${file} bypasses the dashboard locale projection: ${snippet}`);
  }
}

const runtimeFallbackChecks = [
  {
    key: 'Dashboard.owner.actions.directions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.metrics.engagedSessions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.health.states.watch',
    files: ['src/database/ownerDashboard/index.ts'],
  },
  {
    key: 'Dashboard.owner.details.sections.openHoursActions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.descriptions.openHoursActions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.openHours.open',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.openHours.closed',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.openHours.unknown',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.openHours.closedShare',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
];

for (const { key, files } of runtimeFallbackChecks) {
  const sourceValue = getByPath(source, key).replace('{rate}', '${breakdown.closedShare || 0}');
  for (const relativePath of files) {
    assert(
      read(relativePath).includes(sourceValue),
      `${relativePath} fallback copy must match ${key}`,
    );
  }
}

const translatedLocales = locales.filter(
  (locale) => !ENGLISH_OWNER_LOCALES.has(locale),
);
console.log(
  `Owner UI locale boundary passed: ${ownerSource.size} strings in ${ownerNamespaces.length} namespaces across ${locales.length} locale files.`,
);
console.log(
  `${translationAssuredSource.size} established dashboard/settings strings and the expanded owner boundary are semantic-evidence gated in ${translatedLocales.length} non-English packs.`,
);
console.log(
  `Semantic evidence passed with ${semanticEvidence.qualityRepair?.repairedValues || 0} bounded quality repairs.`,
);
