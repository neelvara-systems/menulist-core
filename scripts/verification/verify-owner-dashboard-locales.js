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
  isProtectedInvariant,
  isReviewedExactOverride,
  providerMetadata,
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

const runtimeFallbackChecks = [
  {
    key: 'Dashboard.owner.actions.directions',
    files: [
      'src/lib/analytics/ownerDashboardDetails.ts',
      'src/components/templates/main-app/dashboard/OwnerDashboard/OwnerDashboardGraphMode.tsx',
    ],
  },
  {
    key: 'Dashboard.owner.details.metrics.engagedSessions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.health.states.watch',
    files: [
      'src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx',
      'src/database/ownerDashboard/index.ts',
    ],
  },
  {
    key: 'Dashboard.owner.details.sections.openHoursActions',
    files: [
      'src/lib/analytics/ownerDashboardDetails.ts',
      'src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx',
      'src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx',
    ],
  },
  {
    key: 'Dashboard.owner.details.descriptions.openHoursActions',
    files: ['src/lib/analytics/ownerDashboardDetails.ts'],
  },
  {
    key: 'Dashboard.owner.details.openHours.open',
    files: [
      'src/lib/analytics/ownerDashboardDetails.ts',
      'src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx',
      'src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx',
    ],
  },
  {
    key: 'Dashboard.owner.details.openHours.closed',
    files: [
      'src/lib/analytics/ownerDashboardDetails.ts',
      'src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx',
      'src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx',
    ],
  },
  {
    key: 'Dashboard.owner.details.openHours.unknown',
    files: [
      'src/lib/analytics/ownerDashboardDetails.ts',
      'src/components/templates/main-app/dashboard/OwnerDashboard/OBPMetricsCard.tsx',
      'src/components/mobile/screens/dashboardSections/MobileOBPMetricsCard.tsx',
    ],
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
