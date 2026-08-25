#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_DIR = path.join(ROOT, 'public', 'locales', 'menulist.ai');
const SOURCE_LOCALE = 'en-US';
const PROTECTED_PUBLIC_TERMS = [
  'MenuList.ai',
  'MenuList',
  'WhatsApp',
  'Google',
  'Safari',
  'PWA',
  'QR',
];
const PROVIDER_MARKER_PATTERN = /(?:%\s*\d+\s*\$\s*[sS]|\$\s*%\s*\d+|<\s*x\d+\s*\/\s*>|[\uE000-\uF8FF])/u;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, token, label) {
  assert(content.includes(token), `${label} must include ${token}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function mapDigest(messages) {
  return sha256(JSON.stringify(Object.entries(messages).sort(([left], [right]) => left.localeCompare(right))));
}

function placeholders(value) {
  return (value.match(/\{[^}]+\}/g) || []).sort().join('|');
}

function sentenceBoundaryCount(value) {
  return (value.match(/[.!?。！？؟…]+/gu) || []).length;
}

function stripAllowedPublicInvariants(value) {
  return value
    .replace(/\{[^}]+\}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '')
    .replace(/MenuList(?:\.ai)?|WhatsApp|Google|Safari|PWA|QR/g, '');
}

function flattenStrings(value, prefix = '', output = {}) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${prefix || 'root'} must be an object`);
  for (const [key, child] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      output[childPath] = child;
    } else {
      flattenStrings(child, childPath, output);
    }
  }
  return output;
}

function localeRegistry() {
  const common = read('src/constants/common.ts');
  const match = common.match(/export const APP_LANGUAGES = \[([\s\S]*?)\n\]/);
  assert(match, 'APP_LANGUAGES registry must be readable');
  return [...match[1].matchAll(/value:\s*"([^"]+)"/g)].map((entry) => entry[1]);
}

function publicCustomerMessages(locale) {
  const messages = readJson(`public/locales/menulist.ai/${locale}.json`);
  assert(messages?.BusinessSettings?.publicCustomer, `${locale} must contain BusinessSettings.publicCustomer`);
  return flattenStrings(messages.BusinessSettings.publicCustomer);
}

function verifyLocaleBundle() {
  const locales = localeRegistry();
  const generated = readJson('src/data/generated/publicCustomerMessages.json');
  const semanticEvidence = readJson('__docs__/global-localization/owner-locale-semantic-coverage.json');
  const publicAudit = semanticEvidence.publicCustomerSemanticAudit;
  const source = publicCustomerMessages(SOURCE_LOCALE);
  const sourceKeys = Object.keys(source).sort();

  assert(locales.length === 52, `expected 52 registered app locales, found ${locales.length}`);
  assert(publicAudit?.version === 1, 'public-customer semantic audit evidence is missing');
  assert(publicAudit.sourceMessageCount === sourceKeys.length, 'public-customer semantic source count is stale');
  assert(publicAudit.localeCount === locales.length, 'public-customer semantic locale count is stale');
  assert(publicAudit.runtimeTranslationProviderCalls === 0, 'public-customer runtime must not call a translation provider');
  assert(publicAudit.firebaseReads === 0, 'public-customer localization must not add Firebase reads');
  assert(publicAudit.firebaseWrites === 0, 'public-customer localization must not add Firebase writes');
  assert(publicAudit.firebaseDeletes === 0, 'public-customer localization must not add Firebase deletes');
  assert(
    JSON.stringify(Object.keys(generated)) === JSON.stringify(locales),
    'generated public-customer locale order must match APP_LANGUAGES',
  );

  for (const locale of locales) {
    const localeMessages = publicCustomerMessages(locale);
    assert(
      JSON.stringify(Object.keys(localeMessages).sort()) === JSON.stringify(sourceKeys),
      `${locale} public-customer keys must match ${SOURCE_LOCALE}`,
    );
    assert(
      JSON.stringify(generated[locale]) === JSON.stringify(
        Object.fromEntries(sourceKeys.map((key) => [key, localeMessages[key]])),
      ),
      `${locale} generated public-customer messages must match the locale source`,
    );
    assert(
      publicAudit.locales?.[locale]?.publicCustomerValueCount === sourceKeys.length,
      `${locale} public-customer semantic value count is stale`,
    );
    assert(
      publicAudit.locales?.[locale]?.publicCustomerSha256 === mapDigest(localeMessages),
      `${locale} public-customer messages do not match semantic evidence`,
    );

    for (const key of sourceKeys) {
      const sourceValue = source[key];
      const translated = localeMessages[key];
      assert(
        placeholders(translated) === placeholders(sourceValue),
        `${locale}:${key} public interpolation placeholders changed`,
      );
      assert(
        !PROVIDER_MARKER_PATTERN.test(translated),
        `${locale}:${key} contains a leaked provider marker`,
      );
      assert(
        !(
          sentenceBoundaryCount(sourceValue) <= 1
          && sentenceBoundaryCount(translated) >= sentenceBoundaryCount(sourceValue) + 2
        ),
        `${locale}:${key} gained unrelated sentence boundaries`,
      );
      assert(
        !(
          !/(?:@|https?:\/\/|www\.)/i.test(sourceValue)
          && /(?:@|https?:\/\/|www\.)/i.test(translated)
        ),
        `${locale}:${key} gained an unexpected email or URL`,
      );
      for (const term of PROTECTED_PUBLIC_TERMS) {
        assert(
          sourceValue.includes(term) === translated.includes(term),
          `${locale}:${key} changed protected term ${term}`,
        );
      }
    }

    assert(
      localeMessages['feedback.phonePlaceholder'] === source['feedback.phonePlaceholder'],
      `${locale}:feedback.phonePlaceholder must preserve the canonical example`,
    );
    assert(
      localeMessages['feedback.emailPlaceholder'] === source['feedback.emailPlaceholder'],
      `${locale}:feedback.emailPlaceholder must preserve the canonical example`,
    );

    const scriptBoundaryText = Object.values(localeMessages)
      .map(stripAllowedPublicInvariants)
      .join('\n');
    if (locale === 'sat-IN') {
      assert(
        !/[\u0600-\u06FF\u0900-\u0D7F\u1C80-\u1CFF]/u.test(scriptBoundaryText),
        'sat-IN public messages contain mixed-script provider leakage',
      );
    }
    if (locale === 'brx-IN') {
      assert(
        !/[\u0600-\u06FF\u0980-\u0D7F\u1C50-\u1CFF]/u.test(scriptBoundaryText),
        'brx-IN public messages contain mixed-script provider leakage',
      );
    }
    if (locale === 'ks-IN') {
      assert(
        !/[\u0900-\u0D7F\u1C50-\u1CFF]/u.test(scriptBoundaryText),
        'ks-IN public messages contain mixed-script provider leakage',
      );
    }
  }

  assert(sourceKeys.length >= 337, `expected at least 337 public-customer messages, found ${sourceKeys.length}`);
}

function verifyRuntimeBoundary() {
  const runtime = read('src/lib/localization/publicCustomerMessages.ts');
  [
    "import publicCustomerMessages from '@data/generated/publicCustomerMessages.json';",
    'getNextIntlLocaleForPublicLanguage',
    'normalizePublicLanguageCode',
    'getPublicCustomerLanguageDirection',
    'getPublicSpiceLevelLabel',
    "'menu.spiceMild'",
    "'menu.spiceVeryHot'",
    'selectedMessages[key] || fallbackMessages[key]',
  ].forEach((token) => assertIncludes(runtime, token, 'public customer runtime'));
  assert(!runtime.includes('@lib/firebase'), 'public customer runtime must not import Firebase');
  assert(!runtime.includes('fetch('), 'public customer runtime must not call a provider');

  const publicLanguages = read('src/data/languages.ts');
  assertIncludes(
    publicLanguages,
    "{ code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', direction: 'rtl' }",
    'public customer Kashmiri direction',
  );
}

function verifyPublicSurfaces() {
  const surfaceContracts = [
    {
      path: 'src/app/client/obp/OBPResolvedSurface.tsx',
      tokens: [
        'resolveStorePublicLanguage',
        'appendPublicLanguageParam',
        'dir={activeLanguageDirection}',
        'lang={contentLanguage}',
        "ariaLabel={publicCustomerT('common.createOfficialCustomerLink')}",
      ],
    },
    {
      path: 'src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        'getPublicCustomerLanguageDirection(activeLanguage)',
        'dir={languageDirection}',
        'lang={activeLanguage}',
        'getPublicSpiceLevelLabel(spiceLevel, t)',
        "t('menu.viewOfferingFrom'",
      ],
    },
    {
      path: 'src/app/feedback/[projectId]/page.tsx',
      tokens: [
        'resolveStorePublicLanguage(storeData, requestedLanguage)',
        'appendPublicLanguageParam(',
        'dir={languageDirection}',
        'lang={storeInfo.contentLanguage}',
      ],
    },
    {
      path: 'src/components/atoms/GuestFeedbackForm/index.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        'activeLanguage={activeLanguage}',
        "t('feedback.submitFeedback')",
      ],
    },
    {
      path: 'src/app/feedback/[projectId]/not-found.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        'getPublicCustomerLanguageDirection(activeLanguage)',
        "new URLSearchParams(window.location.search).get('lang')",
        "import { PLATFORM_URL } from '@constant/urls';",
        'appendPublicLanguageParam(PLATFORM_URL, activeLanguage)',
        'dir={direction}',
        'lang={activeLanguage}',
      ],
    },
    {
      path: 'src/app/client/[[...slug]]/MenuNotFoundFallback.tsx',
      tokens: [
        'appendPublicLanguageParam(',
        'activeLanguage',
        "t('menu.redirectingIn'",
        'dir={direction}',
      ],
    },
    {
      path: 'src/app/client/not-found.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        "const pageTitle = t('menu.menuNotFound');",
        'document.title = pageTitle;',
        "appendPublicLanguageParam('/', activeLanguage)",
        'dir={direction}',
      ],
    },
    {
      path: 'src/app/client/error.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        "const pageTitle = t('menu.temporarilyUnavailable');",
        'document.title = pageTitle;',
        'dir={direction}',
      ],
    },
    {
      path: 'src/components/customer/StarterActivationHoldingPage.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        "t('menu.notFinalizedYet'",
        'dir={direction}',
      ],
    },
    {
      path: 'src/components/customerApp/InstallPrompt.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        'dir={languageDirection}',
        "t('menu.installTitle'",
      ],
    },
    {
      path: 'src/app/client/obp/OBPCustomerAppMount.tsx',
      tokens: [
        'activeLanguage?: string;',
        '<CustomerAppController {...props} />',
      ],
    },
    {
      path: 'src/app/client/pwa/PwaExternalRedirectClient.tsx',
      tokens: [
        'createPublicCustomerTranslator(activeLanguage)',
        'dir={direction}',
        "t('menu.shortcutUnavailable')",
      ],
    },
  ];

  for (const contract of surfaceContracts) {
    const content = read(contract.path);
    for (const token of contract.tokens) {
      assertIncludes(content, token, contract.path);
    }
  }

  const compliance = read('src/app/client/compliance/CompliancePageContent.tsx');
  assertIncludes(compliance, 'resolveStorePublicLanguage(storeData, requestedLanguage)', 'public compliance language selection');
  assertIncludes(compliance, "lang={contentLanguage.startsWith('en') ? contentLanguage : 'en'}", 'public compliance legal-body language truth');

  const viewer = read('src/components/shared/media/PublicImageViewer.tsx');
  assertIncludes(viewer, "direction === 'rtl'", 'public image viewer RTL navigation');
  assertIncludes(viewer, 'insetInlineStart', 'public image viewer logical previous control');
  assertIncludes(viewer, 'insetInlineEnd', 'public image viewer logical next control');

  const itemDetails = read('src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx');
  assertIncludes(
    itemDetails,
    'getPublicSpiceLevelLabel(spiceLevel, t)',
    'public item-details spice-level localization',
  );

  const obpSurface = read('src/app/client/obp/OBPResolvedSurface.tsx');
  assertIncludes(obpSurface, '<OBPCustomerAppMount', 'OBP customer app mount');
  assertIncludes(obpSurface, 'activeLanguage={contentLanguage}', 'OBP customer app owner-controlled language');

  const manifestRoute = read('src/app/manifest.webmanifest/route.ts');
  assertIncludes(manifestRoute, 'const contentLanguage = resolveStorePublicLanguage(store);', 'customer app manifest owner-controlled language');
  assertIncludes(manifestRoute, "const t = createPublicCustomerTranslator(contentLanguage);", 'customer app manifest translator');
  assertIncludes(manifestRoute, 'language: contentLanguage,', 'customer app manifest language pass-through');

  const manifestGenerator = read('src/lib/pwa/manifestGenerator.ts');
  assertIncludes(manifestGenerator, 'lang: activeLanguage,', 'customer app manifest language');
  assertIncludes(manifestGenerator, 'dir: getPublicCustomerLanguageDirection(activeLanguage)', 'customer app manifest direction');
  assertIncludes(manifestGenerator, "label: `${input.displayName} — ${t('menu.menuOffering')}`", 'customer app manifest localized screenshot labels');

  const shortcuts = read('src/lib/pwa/shortcutsBuilder.ts');
  assertIncludes(shortcuts, 'const t = createPublicCustomerTranslator(activeLanguage);', 'customer app localized shortcut labels');
  assertIncludes(shortcuts, 'appendPublicLanguageParam(url, activeLanguage)', 'customer app shortcut language query');
}

function verifyPackageScript() {
  const packageJson = readJson('package.json');
  assert(
    packageJson.scripts['verify:public-customer-localization']
      === 'node scripts/verification/verify-public-customer-localization.js && node scripts/localization/generate-public-customer-messages.js --check',
    'package.json must expose verify:public-customer-localization',
  );
  assert(
    packageJson.scripts['verify:global-localization-boundary']?.includes('verify:public-customer-localization'),
    'global localization gate must include the public customer localization gate',
  );
}

verifyLocaleBundle();
verifyRuntimeBoundary();
verifyPublicSurfaces();
verifyPackageScript();
console.log('Public customer localization boundary passed.');
