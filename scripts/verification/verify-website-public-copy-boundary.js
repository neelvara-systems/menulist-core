#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const WEBSITE_LOCALE_DIR = 'public/locales/menulist.ai';
const HOMEPAGE = 'src/components/website/home/HomePage.tsx';

const BLOCKED_PUBLIC_CLAIMS = [
  { label: 'AI-powered', pattern: /\bAI-powered\b/i },
  { label: 'AI powered', pattern: /\bAI powered\b/i },
  { label: 'rank #1', pattern: /\brank\s*#?\s*1\b/i },
  { label: 'best QR menu', pattern: /\bbest QR menu\b/i },
  { label: 'traffic growth', pattern: /\btraffic growth\b/i },
  { label: 'revenue lift', pattern: /\brevenue lift\b/i },
  { label: 'Google refresh', pattern: /\bGoogle refresh\b/i },
  { label: 'guaranteed SEO', pattern: /\bguaranteed SEO\b/i },
  { label: 'guaranteed ranking', pattern: /\bguaranteed ranking\b/i },
  { label: 'automatic optimization', pattern: /\bautomatic optimization\b/i },
  { label: 'revolutionary', pattern: /\brevolutionary\b/i },
  { label: 'game-changing', pattern: /\bgame[- ]changing\b/i },
];

const BLOCKED_PRICING_COPY_CLAIMS = [
  'Real-time updates across all surfaces',
  'real-time updates across all surfaces',
  'real-time status',
  'real-time notifications',
];

const BLOCKED_LOCALE_FRESHNESS_COPY_CLAIMS = [
  'It always opens your current menu.',
  'Always up to date.',
  'Always reflects your current menu.',
  'Your menu, everywhere your customers look.',
  'All surfaces read from the same official version. Once published, your menu appears wherever customers look.',
];

const BLOCKED_LOCALE_OBP_CORRECTNESS_COPY_CLAIMS = [
  'Always Correct',
  'Siempre correcto',
  'دائماً صحيح',
  'validated and verified',
  'validados y verificados',
  'مُتحقق منها ومُوثقة',
  "Customers see what's real, not what's outdated.",
  'العملاء يرون ما هو حقيقي وليس ما هو قديم.',
  'تكون فيه قائمته دائماً صحيحة',
  'su menú siempre sea correcto',
];

function resolvePath(relativePath) {
  return path.join(ROOT, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(resolvePath(relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertNoBlockedClaims(label, content) {
  const hits = BLOCKED_PUBLIC_CLAIMS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ label: claim }) => claim);

  assert(hits.length === 0, `${label} must not include blocked public website claims: ${hits.join(', ')}`);
}

function sha256File(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(resolvePath(relativePath))).digest('hex');
}

function walkRepoFiles(relativePath) {
  const fullPath = resolvePath(relativePath);
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  if (fs.statSync(fullPath).isFile()) {
    return [relativePath];
  }

  return fs.readdirSync(fullPath).flatMap((entry) => walkRepoFiles(path.posix.join(relativePath, entry)));
}

function walkStrings(value, visitor, currentPath = '') {
  if (typeof value === 'string') {
    visitor(currentPath, value);
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    walkStrings(child, visitor, currentPath ? `${currentPath}.${key}` : key);
  }
}

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  assert(
    packageJson.scripts['verify:website-public-copy-boundary'] ===
      'node scripts/verification/verify-website-public-copy-boundary.js',
    'package.json must expose verify:website-public-copy-boundary',
  );
  assert(
    packageJson.scripts['verify:website-operational-proof-placement'] ===
      'node scripts/verification/verify-website-public-copy-boundary.js --operational-proof-only',
    'package.json must expose verify:website-operational-proof-placement',
  );
  assert(
    packageJson.scripts['test:website-product-path-boundary'] ===
      'ts-node --compiler-options \'{"module":"CommonJS","jsx":"react-jsx"}\' -r tsconfig-paths/register scripts/verification/test-website-product-path-boundary.ts',
    'package.json must expose test:website-product-path-boundary',
  );
}

function verifyWebsiteSocialMetadataBoundary() {
  const helperPath = 'src/lib/seo/websiteMetadata.ts';
  const helper = read(helperPath);
  const contactPage = read('src/app/(website)/contact/page.tsx');
  const resourceShell = read('src/components/website/resources/ResourcePageShell.tsx');
  const metadataPages = walkRepoFiles('src/app/(website)')
    .filter((relativePath) => relativePath.endsWith('/page.tsx'))
    .filter((relativePath) => read(relativePath).includes('openGraph:'));

  assert(metadataPages.length > 0, 'MenuList website must expose route-specific Open Graph metadata');

  [
    'MENULIST_SITE_IMAGE',
    'MENULIST_SITE_IMAGE_ALT',
    'siteName: "MenuList"',
    'card: "summary_large_image"',
    "const twitterTitle = typeof completedOpenGraph?.title === 'string'",
    "typeof metadata.title === 'string'",
    "const twitterDescription = typeof completedOpenGraph?.description === 'string'",
    "typeof metadata.description === 'string'",
    '...(twitterTitle ? { title: twitterTitle } : {})',
    '...(twitterDescription ? { description: twitterDescription } : {})',
  ].forEach((token) => assertIncludes(helper, token, 'MenuList website social metadata completion'));

  for (const relativePath of metadataPages) {
    assertIncludes(
      read(relativePath),
      'completeWebsiteMetadata({',
      `MenuList route social metadata completion (${relativePath})`,
    );
  }

  assertIncludes(
    resourceShell,
    'return completeWebsiteMetadata({',
    'MenuList localized resource social metadata completion',
  );
  assertIncludes(
    contactPage,
    'Send a MenuList question or product note through the contact form',
    'MenuList contact metadata acknowledgement boundary',
  );
  assertNotIncludes(
    contactPage,
    'We are here to help you get your menu online.',
    'MenuList contact metadata unmonitored-response implication',
  );
}

function verifyWebsiteAuditHardeningBoundary() {
  const websiteLayout = read('src/app/(website)/layout.tsx');
  const productPathProvider = read('src/components/website/shared/WebsiteProductPathProvider.tsx');
  const footer = read('src/components/website/Footer.tsx');
  const stickyCta = read('src/components/website/shared/StickyCta.tsx');
  const websiteStyles = read('src/styles/website.css');
  const englishLocale = read('public/locales/menulist.ai/en-US.json');
  const hindiLocale = read('public/locales/menulist.ai/hi-IN.json');

  assertNotIncludes(websiteLayout, "from 'next/headers'", 'MenuList website layout');
  assertIncludes(productPathProvider, 'const pathname = usePathname();', 'MenuList website path provider');
  assertIncludes(
    productPathProvider,
    "pathname === '/ml' || pathname?.startsWith('/ml/') ? '/ml' : ''",
    'MenuList website path provider',
  );
  assertNotIncludes(footer, 'https://twitter.com/menulistai', 'MenuList website footer');
  assertIncludes(
    stickyCta,
    "window.matchMedia('(min-width: 1024px) and (min-height: 780px)')",
    'MenuList sticky CTA viewport boundary',
  );
  assertIncludes(
    websiteStyles,
    'grid-template-columns: repeat(3, minmax(0, 1fr));',
    'MenuList customer-link card grid',
  );
  assertIncludes(englishLocale, '"successTitle": "Message received"', 'English contact acknowledgement');
  assertIncludes(englishLocale, '"heroTitle": "How MenuList helps protect "', 'English trust headline');
  assertIncludes(hindiLocale, '"successTitle": "मैसेज मिल गया"', 'Hindi contact acknowledgement');
}

function verifyCrossProductTaglineBoundary() {
  const neelvaraConstants = read('src/constants/neelvara/website.ts');
  const neelvaraHome = read('src/app/sites/neelvara/page.tsx');
  const neelvaraGenerator = read('scripts/website-assets/generate-neelvara-logo-assets.js');
  const menulistConstants = read('src/constants/menulist/website.ts');
  const menulistHero = read('src/components/website/home/HeroSection.tsx');
  const menulistOgGenerator = read('scripts/website-assets/generate-stage6-assets.mjs');
  const englishLocale = read('public/locales/menulist.ai/en-US.json');
  const hindiLocale = read('public/locales/menulist.ai/hi-IN.json');
  const websiteLocales = Object.fromEntries(
    ['en-US', 'hi-IN', 'ta-IN', 'te-IN', 'mr-IN', 'bn-IN', 'ar-SA', 'es-ES'].map((locale) => [
      locale,
      JSON.parse(read(`public/locales/menulist.ai/${locale}.json`)).Website,
    ]),
  );
  const answerlatticeConstants = read('src/constants/answerlattice/website.ts');
  const answerlatticeHome = read('src/app/sites/answerlattice/page.tsx');
  const answerlatticeFooter = read('src/app/sites/answerlattice/components/Footer.tsx');
  const answerlatticeContract = read('src/lib/answerlattice/installContract/contract.ts');

  assertIncludes(neelvaraConstants, 'The trusted information layer between businesses and customers.', 'Neelvara tagline source');
  assertIncludes(neelvaraConstants, 'keep customer answers grounded in approved knowledge.', 'Neelvara supporting line source');
  assertIncludes(neelvaraHome, 'NEELVARA_TAGLINE', 'Neelvara homepage tagline binding');
  assertIncludes(neelvaraHome, 'NEELVARA_SUPPORTING_LINE', 'Neelvara homepage supporting-line binding');
  assertIncludes(neelvaraHome, 'MenuList keeps public business information official.', 'Neelvara MenuList product job');
  assertIncludes(neelvaraHome, 'Answerlattice keeps customer answers grounded in approved knowledge.', 'Neelvara Answerlattice product job');
  assertIncludes(neelvaraGenerator, 'The official customer-facing version of your business.', 'Neelvara generated product tagline');
  assertNotIncludes(neelvaraGenerator, 'The source of truth behind every customer answer.', 'Neelvara generated stale absolute tagline');

  assertIncludes(menulistConstants, 'The official customer-facing version of your business.', 'MenuList tagline source');
  assertIncludes(menulistConstants, 'from one owner-approved source.', 'MenuList supporting line source');
  assertIncludes(menulistHero, "t('Hero.tagline')", 'MenuList homepage tagline binding');
  assertIncludes(englishLocale, '"tagline": "The official customer-facing version of your business."', 'MenuList English tagline');
  assertIncludes(hindiLocale, '"tagline": "आपके business का official customer-facing version."', 'MenuList Hindi tagline');
  const expectedEyebrows = {
    'en-US': 'One approved list. Customer links stay aligned.',
    'hi-IN': 'One approved list. Customer links aligned रहें.',
    'ta-IN': 'ஒரே approved list. Customer links ஒரே நிலையில் இருக்கும்.',
    'te-IN': 'ఒక approved list. Customer links aligned‌గా ఉంటాయి.',
    'mr-IN': 'एक approved list. Customer links aligned राहतात.',
    'bn-IN': 'একটি approved list. Customer links aligned থাকে।',
    'ar-SA': 'قائمة واحدة معتمدة. تبقى روابط العملاء متسقة.',
    'es-ES': 'Una lista aprobada. Los enlaces para clientes siguen alineados.',
  };
  const expectedReviewTokens = {
    'en-US': 'review',
    'hi-IN': 'review',
    'ta-IN': 'review',
    'te-IN': 'review',
    'mr-IN': 'review',
    'bn-IN': 'review',
    'ar-SA': 'للمراجعة',
    'es-ES': 'revisión',
  };
  const expectedFlowTitles = {
    'en-US': 'One approved list. Supported outputs stay connected.',
    'hi-IN': 'One approved list. Supported outputs connected रहें.',
    'ta-IN': 'ஒரே approved list. Supported outputs இணைந்தே இருக்கும்.',
    'te-IN': 'ఒక approved list. Supported outputs connected‌గా ఉంటాయి.',
    'mr-IN': 'एक approved list. Supported outputs connected राहतात.',
    'bn-IN': 'একটি approved list. Supported outputs connected থাকে।',
    'ar-SA': 'قائمة واحدة معتمدة. تبقى المخرجات المدعومة مرتبطة.',
    'es-ES': 'Una lista aprobada. Los recursos compatibles siguen conectados.',
  };
  const expectedFeatureTitles = {
    'en-US': ['One approved list.', 'Supported outputs stay connected.'],
    'hi-IN': ['One approved list.', 'Supported outputs connected रहें.'],
    'ta-IN': ['ஒரே approved list.', 'Supported outputs இணைந்தே இருக்கும்.'],
    'te-IN': ['ఒక approved list.', 'Supported outputs connected‌గా ఉంటాయి.'],
    'mr-IN': ['एक approved list.', 'Supported outputs connected राहतात.'],
    'bn-IN': ['একটি approved list.', 'Supported outputs connected থাকে।'],
    'ar-SA': ['قائمة واحدة معتمدة.', 'تبقى المخرجات المدعومة مرتبطة.'],
    'es-ES': ['Una lista aprobada.', 'Los recursos compatibles siguen conectados.'],
  };
  const expectedWorkflowTitles = {
    'en-US': 'One approved list connects supported customer outputs.',
    'hi-IN': 'One approved list supported customer outputs को connected रखता है।',
    'ta-IN': 'ஒரே approved list supported customer outputs-ஐ இணைக்கிறது.',
    'te-IN': 'ఒక approved list supported customer outputs‌ను connected‌గా ఉంచుతుంది.',
    'mr-IN': 'एक approved list supported customer outputs connected ठेवते.',
    'bn-IN': 'একটি approved list supported customer outputs-কে connected রাখে।',
    'ar-SA': 'تربط قائمة واحدة معتمدة مخرجات العملاء المدعومة.',
    'es-ES': 'Una lista aprobada conecta los recursos compatibles para clientes.',
  };
  const staleMultilingualPresentationClaim = /(10\s*(minutes?|mins?)|10\s*நிமிட|10\s*నిమి|10\s*मिनिट|১০\s*মিনিট|10\s*دقائق|No ongoing work|no extra work|Every customer (link|surface|touchpoint)|हर customer (link|touchpoint)|كل واجهة للعميل|Cada superficie del cliente|all surfaces|all.*surface|அனைத்து மேற்பரப்பு|అన్ని సర్ఫేస్|सर्व सर्फेस|সব সারফেস|جميع الأسطح|en vivo en todas las superficies|publica en minutos)/iu;
  const presentationBoundaryPaths = [
    ['Stats', 'stat2Desc'],
    ['Workflow', 'step2Title'],
    ['Faq', 'a1'],
    ['Features', 'group4Heading'],
    ['HowItWorks', 'ctaCaption'],
    ['HowItWorks', 'surfacesSubtitle'],
  ];
  for (const [locale, expectedEyebrow] of Object.entries(expectedEyebrows)) {
    assert(
      websiteLocales[locale]?.Hero?.eyebrow === expectedEyebrow,
      `MenuList ${locale} homepage eyebrow must use the approved-list boundary`,
    );
    assert(
      typeof websiteLocales[locale]?.Hero?.subtitle === 'string'
        && websiteLocales[locale].Hero.subtitle.includes(expectedReviewTokens[locale]),
      `MenuList ${locale} homepage subtitle must preserve owner review`,
    );
    assert(
      websiteLocales[locale]?.HowItWorks?.flowTitle === expectedFlowTitles[locale],
      `MenuList ${locale} How It Works flow must use the supported-output boundary`,
    );
    assert(
      websiteLocales[locale]?.Features?.heroTitle1 === expectedFeatureTitles[locale][0]
        && websiteLocales[locale]?.Features?.heroTitle2 === expectedFeatureTitles[locale][1],
      `MenuList ${locale} Features hero must use the approved-list boundary`,
    );
    assert(
      websiteLocales[locale]?.Workflow?.title === expectedWorkflowTitles[locale],
      `MenuList ${locale} workflow heading must use the supported-output boundary`,
    );
    assert(
      websiteLocales[locale].Workflow.title.includes(websiteLocales[locale].Workflow.highlight),
      `MenuList ${locale} workflow highlight must remain inside its heading`,
    );
    for (const [namespace, key] of presentationBoundaryPaths) {
      const value = websiteLocales[locale]?.[namespace]?.[key];
      assert(
        typeof value === 'string' && !staleMultilingualPresentationClaim.test(value),
        `MenuList ${locale} ${namespace}.${key} must avoid stale timed, universal-surface, or no-work claims`,
      );
    }
  }
  assert(
    websiteLocales['en-US']?.Footer?.sourceLine
      === 'MenuList keeps its customer links, QR files, and print materials tied to your approved list.',
    'MenuList English footer must use the bounded approved-list source line',
  );
  assert(
    websiteLocales['hi-IN']?.Footer?.sourceLine
      === 'MenuList अपने customer links, QR files और print materials को आपकी approved list से connected रखता है।',
    'MenuList Hindi footer must use the bounded approved-list source line',
  );
  assertIncludes(menulistOgGenerator, 'The official customer-facing version of your business.', 'MenuList OG card tagline');
  assertIncludes(menulistOgGenerator, 'from one owner-approved source.', 'MenuList OG card supporting line');

  assertIncludes(answerlatticeConstants, 'The governed source behind customer answers.', 'AnswerLattice tagline source');
  assertIncludes(answerlatticeConstants, 'structured, reviewable, and current across support, docs, search, and AI-assisted surfaces.', 'AnswerLattice supporting line source');
  assertIncludes(answerlatticeHome, 'ANSWERLATTICE_TAGLINE', 'AnswerLattice homepage tagline binding');
  assertIncludes(answerlatticeHome, 'Approved answers come first; missing coverage becomes visible review work.', 'AnswerLattice bounded homepage description');
  assertIncludes(answerlatticeFooter, 'ANSWERLATTICE_SUPPORTING_LINE', 'AnswerLattice footer supporting-line binding');
  assertIncludes(answerlatticeFooter, 'al-site-footer__category', 'AnswerLattice footer category hierarchy');
  assertIncludes(answerlatticeFooter, 'al-site-footer__tagline', 'AnswerLattice footer tagline hierarchy');
  assertIncludes(answerlatticeFooter, 'al-site-footer__description', 'AnswerLattice footer supporting hierarchy');
  assertIncludes(answerlatticeContract, '${ANSWERLATTICE_TAGLINE}', 'AnswerLattice agent context tagline binding');
  assertIncludes(read('scripts/website-assets/generate-answerlattice-logo-assets.js'), 'The governed source behind customer', 'AnswerLattice OG card tagline');
  assertIncludes(read('public/answerlattice-og-image.svg'), 'The governed source behind customer', 'AnswerLattice OG SVG tagline');
  assertIncludes(read('public/answerlattice-og-image.svg'), 'AI-assisted surfaces.', 'AnswerLattice OG SVG supporting line');
  assertNotIncludes(answerlatticeHome, 'The source of truth behind every customer answer.', 'AnswerLattice homepage stale absolute tagline');
  assertNotIncludes(answerlatticeHome, 'turns every miss into review work', 'AnswerLattice homepage stale absolute review wording');
}

function verifyWebsiteThemeStorageBoundary() {
  const provider = read('src/components/website/shadcn/theme-provider.tsx');
  const preference = read('src/lib/website/themePreference.ts');
  const implDoc = read('__docs__/main-website/main-website_impl.md');

  [
    'normalizeWebsiteThemePreference(rawTheme)',
    'window.localStorage.removeItem(WEBSITE_THEME_STORAGE_KEY)',
    "logWebsiteThemeStorageFailure('read', error)",
    "logWebsiteThemeStorageFailure('remove', error)",
    "logWebsiteThemeStorageFailure('write', error)",
  ].forEach((token) => assertIncludes(provider, token, 'Main website theme storage boundary'));
  assertIncludes(preference, "value === 'light' || value === 'dark' || value === 'system'", 'Main website exact theme projector');
  assertNotIncludes(provider, 'as Theme | null', 'Main website theme storage unchecked assertion');
  assertIncludes(implDoc, 'invalid values are evicted', 'Main website theme persistence documentation');
}

function verifyMountedHomepageBoundary() {
  const homepage = read(HOMEPAGE);
  const mountedFiles = new Set([HOMEPAGE]);
  const importPattern = /import\s+[\w{}*,\s]+\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  assertNotIncludes(homepage, 'SmartFeaturesSection', 'Mounted MenuList homepage');

  while ((match = importPattern.exec(homepage))) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) {
      continue;
    }

    const resolved = path.resolve(resolvePath(path.dirname(HOMEPAGE)), importPath);
    const candidates = [`${resolved}.tsx`, `${resolved}.ts`, path.join(resolved, 'index.tsx')];
    const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (sourcePath) {
      mountedFiles.add(path.relative(ROOT, sourcePath));
    }
  }

  for (const relativePath of [...mountedFiles].sort()) {
    assertNoBlockedClaims(relativePath, read(relativePath));
  }
}

function verifyLocaleAndDiscoveryCopy() {
  const localeDir = resolvePath(WEBSITE_LOCALE_DIR);
  const localeFiles = fs
    .readdirSync(localeDir)
    .filter((filename) => filename.endsWith('.json'))
    .sort();
  const blockedHits = [];
  const freshnessHits = [];
  const obpCorrectnessHits = [];

  for (const filename of localeFiles) {
    const data = JSON.parse(read(path.join(WEBSITE_LOCALE_DIR, filename)));
    walkStrings(data.Website || {}, (keyPath, value) => {
      for (const { label, pattern } of BLOCKED_PUBLIC_CLAIMS) {
        if (pattern.test(value)) {
          blockedHits.push(`${filename}:Website.${keyPath}:${label}`);
        }
      }
    });
    walkStrings(data, (keyPath, value) => {
      for (const claim of BLOCKED_LOCALE_FRESHNESS_COPY_CLAIMS) {
        if (value.includes(claim)) {
          freshnessHits.push(`${filename}:${keyPath}:${claim}`);
        }
      }
      for (const claim of BLOCKED_LOCALE_OBP_CORRECTNESS_COPY_CLAIMS) {
        if (value.includes(claim)) {
          obpCorrectnessHits.push(`${filename}:${keyPath}:${claim}`);
        }
      }
    });
  }

  assert(blockedHits.length === 0, `Website locale namespace blocked-copy hits:\n${blockedHits.join('\n')}`);
  assert(freshnessHits.length === 0, `Website locale freshness-copy hits:\n${freshnessHits.join('\n')}`);
  assert(obpCorrectnessHits.length === 0, `Website locale OBP correctness-copy hits:\n${obpCorrectnessHits.join('\n')}`);

  assertNoBlockedClaims('public/llms.txt', read('public/llms.txt'));
  assertNoBlockedClaims('public/llms-full.txt', read('public/llms-full.txt'));
}

function verifyOperationalProofPlacementBoundary() {
  const homepage = read(HOMEPAGE);
  const ownerProof = read('src/components/website/home/OwnerProofSection.tsx');
  const businessHealthPage = read('src/components/website/features/BusinessHealthFeaturePage.tsx');
  const featuresPage = read('src/components/website/features/FeaturesPage.tsx');
  const multiLocationPage = read('src/components/website/multi-location/MultiLocationPage.tsx');
  const english = JSON.parse(read('public/locales/menulist.ai/en-US.json')).Website;
  const hindi = JSON.parse(read('public/locales/menulist.ai/hi-IN.json')).Website;
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
  const mainWebsiteSpec = read('__docs__/main-website/main-website_spec.md');
  const mainWebsiteDesignSystem = read('__docs__/main-website/main-website_design-system.md');
  const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
  const businessHealthWebsite = read('__docs__/owner-business-assistant/owner-business-assistant_website.md');
  const menuSetupWebsite = read('__docs__/menu-setup-progress/menu-setup-progress_website.md');
  const multiOutletWebsite = read('__docs__/multi-outlet-consistency/multi-outlet-consistency_website.md');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(homepage, '<OwnerProofSection />', 'Mounted compact Business Health homepage proof');
  assertNotIncludes(homepage, 'import BusinessHealthSection', 'Unmounted deep Business Health homepage section');
  assertIncludes(ownerProof, "'healthWeeklyPoint'", 'Homepage Weekly Menu Review locale key');
  assertIncludes(ownerProof, "'OwnerProof.healthWeeklyDesc'", 'Homepage weekly-review description locale key');
  assertIncludes(businessHealthPage, "{ icon: LuBarChart3, key: 'weeklyReview' }", 'Business Health weekly-review proof card');
  assertIncludes(businessHealthPage, "navSummaryKey: 'storyChecksWeeklySummary'", 'Business Health weekly-review navigation summary');
  assertIncludes(featuresPage, "['4-1', 'Features.group4F1WeeklyDesc']", 'Features Business Health weekly-review proof');
  assertIncludes(featuresPage, "['4-4', 'Features.group4F4LaunchDesc']", 'Features Multi-location readiness proof');
  assertIncludes(multiLocationPage, "t('MultiLocation.step3ReadinessPoint')", 'Multi-location owner-view readiness proof');

  assert(
    english.OwnerProof.healthWeeklyPoint === 'Weekly menu review',
    'English homepage owner proof must name Weekly menu review',
  );
  assert(
    english.BusinessHealthFeature.weeklyReviewDesc ===
      'See this week’s selected-menu activity alongside last week, then check whether the location needs attention.',
    'English Business Health page must preserve weekly selected-menu and location-level scope',
  );
  assert(
    english.Features.group4F4LaunchDesc.includes('next menu, publish, or customer-link step'),
    'English Features card must keep location launch readiness bounded to MenuList steps',
  );
  assert(
    english.MultiLocation.step3ReadinessPoint.includes('menu and price review to publishing and sharing its customer link'),
    'English Multi-location page must explain the bounded outlet next step',
  );
  assert(
    hindi.OwnerProof.healthWeeklyPoint === 'Weekly menu review' &&
      hindi.BusinessHealthFeature.weeklyReviewDesc.includes('selected-menu activity') &&
      hindi.MultiLocation.step3ReadinessPoint.includes('customer link'),
    'Hindi website proof must preserve Weekly Menu Review and outlet-readiness meaning',
  );

  const operationalProofCopy = [
    english.OwnerProof.healthWeeklyDesc,
    english.BusinessHealthFeature.weeklyReviewDesc,
    english.Features.group4F1WeeklyDesc,
    english.Features.group4F4LaunchDesc,
    english.MultiLocation.step3ReadinessSubtitle,
    english.MultiLocation.step3ReadinessPoint,
  ].join('\n');
  [
    'POS sales',
    'margin',
    'competitor',
    'vendor',
    'compliance audit',
    'HQ approval',
  ].forEach((claim) => assertNotIncludes(operationalProofCopy, claim, 'Bounded operational website proof'));

  [
    'Version 3.6.119 adds the smallest public proof for two shipped owner improvements',
    'Weekly Menu Review and outlet launch readiness appear as narrow proof',
  ].forEach((token) => assertIncludes(mainWebsiteReadme, token, 'Main website operational proof release boundary'));
  assertIncludes(mainWebsiteContent, '### Supporting Homepage Proof: Business Health', 'Main website compact homepage proof docs');
  assertIncludes(mainWebsiteContent, 'not general franchise opening management', 'Main website outlet-readiness claim boundary');
  assertIncludes(mainWebsiteSpec, '6. OwnerProofSection', 'Canonical homepage section order');
  assertNotIncludes(mainWebsiteSpec, '8. BusinessHealthSection', 'Retired full Business Health homepage section order');
  assertIncludes(mainWebsiteDesignSystem, 'Business Health card inside `src/components/website/home/OwnerProofSection.tsx`', 'Mounted Business Health design-system proof');
  assertIncludes(mainWebsiteImpl, 'The current compressed homepage no longer mounts that deeper section', 'Business Health implementation history and current mount boundary');
  assertIncludes(businessHealthWebsite, 'The deeper `BusinessHealthSection` component remains intentionally unmounted', 'Business Health homepage placement docs');
  assertIncludes(businessHealthWebsite, '`src/components/website/home/OwnerProofSection.tsx`', 'Business Health website runtime-impact boundary');
  assertIncludes(menuSetupWebsite, 'narrow `/features` and `/multi-location` proof implemented', 'Location Launch Readiness website docs');
  assertIncludes(multiOutletWebsite, '**CTA Link:** /multi-location', 'Canonical Multi-location website CTA route');
  assertIncludes(multiOutletWebsite, '## Location Launch Readiness Boundary', 'Multi-location launch-readiness claim boundary');
  assertNotIncludes(multiOutletWebsite, 'Once set up, you never think about menu consistency again', 'Multi-location no-maintenance absolute claim');
  assertIncludes(llms, 'weekly comparison of existing MenuList menu activity', 'Business Health discovery proof');
  assertIncludes(llms, 'next required menu, publish, or customer-link step', 'Multi-location discovery proof');
  assertIncludes(llmsFull, 'not POS sales analysis, menu-profit optimization, competitor monitoring, or general franchise-opening management', 'LLM claim boundary');
  assertIncludes(changelog, 'Added narrow website proof without adding a route or homepage section', 'Operational website proof changelog');
}

function verifyWhatsAppOnboardingFailClosedBoundary() {
  const component = read('src/components/website/whatsapp/WhatsAppOnboardingPage.tsx');
  const page = read('src/app/(website)/whatsapp/page.tsx');
  const englishLocale = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
  const hindiLocale = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
  const llms = read('public/llms.txt');
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
  const mainWebsiteMarketing = read('__docs__/main-website/main-website_marketing.md');
  const messagingWebsite = read('__docs__/messaging-onboarding/messaging-onboarding_website.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const forbiddenTestNumber = '15556571424';
  const createMenuActionCount = (component.match(/<WebsiteButton href="\/create-menu">/g) || []).length;

  assert(createMenuActionCount === 2, 'WhatsApp onboarding page must route both primary actions to /create-menu');
  assertIncludes(
    component,
    "t('WhatsAppOnboardingPage.availability')",
    'WhatsApp onboarding page localized availability state',
  );
  [
    'WHATSAPP_ONBOARDING_TEST_NUMBER',
    'getWhatsAppOnboardingUrl',
    'WhatsAppActionLink',
    'wa.me/',
    'data-testid="whatsapp-onboarding-cta"',
  ].forEach((token) => assertNotIncludes(component, token, 'WhatsApp onboarding page provider-action boundary'));

  assertIncludes(
    page,
    'See how WhatsApp-first onboarding will prepare an owner-reviewed preview and official customer link. Start now with a photo or public menu link.',
    'WhatsApp onboarding metadata availability boundary',
  );
  assertNotIncludes(page, 'Send a menu, service list, rate card, package list, or PDF on WhatsApp.', 'WhatsApp onboarding stale active metadata');

  const englishWhatsApp = englishLocale.Website?.WhatsAppOnboardingPage;
  const hindiWhatsApp = hindiLocale.Website?.WhatsAppOnboardingPage;
  assert(
    englishWhatsApp?.availability === 'WhatsApp intake is not open yet. Start now with a photo or public menu link.',
    'English WhatsApp onboarding availability copy must fail closed',
  );
  assert(
    englishWhatsApp?.primaryCta === 'Start with a photo or link' &&
      englishWhatsApp?.finalCta === 'Start with a photo or link',
    'English WhatsApp onboarding actions must describe the current intake path',
  );
  assert(
    typeof hindiWhatsApp?.availability === 'string' && hindiWhatsApp.availability.includes('अभी शुरू नहीं हुआ है'),
    'Hindi WhatsApp onboarding availability copy must fail closed',
  );
  assert(
    hindiWhatsApp?.primaryCta === 'Photo या link से शुरू करें' &&
      hindiWhatsApp?.finalCta === 'Photo या link से शुरू करें',
    'Hindi WhatsApp onboarding actions must describe the current intake path',
  );
  assert(!('whatsAppPrefillMessage' in englishWhatsApp), 'English locale must not keep the inactive provider prefill');
  assert(!('whatsAppPrefillMessage' in hindiWhatsApp), 'Hindi locale must not keep the inactive provider prefill');

  assertIncludes(
    llms,
    'current setup starts with signed-in photo or public-link intake while provider activation remains gated',
    'WhatsApp onboarding LLM discovery availability boundary',
  );

  [
    ['component', component],
    ['page metadata', page],
    ['English locale', JSON.stringify(englishWhatsApp)],
    ['Hindi locale', JSON.stringify(hindiWhatsApp)],
    ['LLM discovery', llms],
    ['main website README', mainWebsiteReadme],
    ['main website implementation', mainWebsiteImpl],
    ['main website content', mainWebsiteContent],
    ['main website marketing', mainWebsiteMarketing],
    ['messaging website reference', messagingWebsite],
  ].forEach(([label, source]) => {
    assertNotIncludes(source, forbiddenTestNumber, `WhatsApp onboarding ${label} test-number boundary`);
  });

  [
    [mainWebsiteReadme, 'Version 3.6.109 removes the hardcoded test-number action from `/whatsapp`.', 'Main website README WhatsApp fail-closed boundary'],
    [mainWebsiteImpl, 'The component must not contain a test number or active `wa.me` onboarding action.', 'Main website implementation WhatsApp fail-closed boundary'],
    [mainWebsiteContent, 'It must not contain a test number or active provider deep link before current provider activation evidence exists.', 'Main website content WhatsApp fail-closed boundary'],
    [mainWebsiteMarketing, 'The current action routes to `/create-menu` while checked-in Functions targets remain disabled.', 'Main website marketing WhatsApp fail-closed boundary'],
    [messagingWebsite, 'The page must not expose a test number or active `wa.me` onboarding action before provider activation is certified.', 'Messaging website WhatsApp fail-closed boundary'],
    [productionAudit, 'Messaging Onboarding Public Intake Fail-Closed Boundary checkpoint', 'Production audit WhatsApp fail-closed checkpoint'],
    [changelog, 'Messaging Onboarding Public Intake Fail-Closed Boundary', 'Changelog WhatsApp fail-closed entry'],
  ].forEach(([source, token, label]) => assertIncludes(source, token, label));
}

function verifyMenuListLaunchAssetPackBoundary() {
  const launchPack = read('__docs__/main-website/asset-production/launch-pack-2026-07/menulist-launch-pack.md');
  const frameExtractor = read('scripts/website-assets/extract-menulist-launch-frames.mjs');
  const frameIndex = JSON.parse(read('packages/asset-factory/published/menulist/launch-video-frames/index.json'));
  const manifest = JSON.parse(read('packages/asset-factory/manifest/assets.json'));
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const finalFrame = frameIndex.frames.find((frame) => frame.id === 'final-proof');
  const reviewedSlotIds = [
    'menulist.home.hero.official-source',
    'menulist.home.og.official-source',
    'menulist.home.public-surfaces.matrix',
    'menulist.launch.social.square',
    'menulist.launch.device.owner-pwa-dashboard',
    'menulist.launch.social.linkedin',
    'menulist.home.hero.business-truth-loop',
    'menulist.launch.video.frame.approved-source',
    'menulist.launch.video.frame.public-surfaces',
    'menulist.launch.video.frame.stable-loop',
    'menulist.launch.video.frame.final-proof',
  ];

  [
    'AssetOS-approved synthetic asset set — not launch, publication, or deploy certification',
    'AssetOS approval means a named file passed its slot, brand, source, size, and synthetic-data review.',
    'It does not authorize MenuList launch, public distribution, website deployment, social posting, paid use, or production certification.',
    'The closing frame uses the clean 5.40-second proof state',
    'Current approval is per manifest slot and per file.',
  ].forEach((token) => {
    assertIncludes(launchPack, token, 'MenuList launch asset pack publication boundary');
  });
  assertNotIncludes(launchPack, 'Production-ready synthetic launch pack', 'MenuList launch asset pack stale readiness status');
  assertIncludes(
    frameExtractor,
    "{ id: 'final-proof', time: 5.4, filename: '04-final-proof.png' }",
    'MenuList launch final-frame clean timestamp',
  );
  assertNotIncludes(
    frameExtractor,
    "{ id: 'final-proof', time: 4.9, filename: '04-final-proof.png' }",
    'MenuList launch final-frame occluded timestamp',
  );
  assert(finalFrame?.timeSeconds === 5.4, 'MenuList launch frame index must record the clean 5.40-second final frame');

  for (const slotId of reviewedSlotIds) {
    const entry = manifest.assets?.[slotId];
    assert(entry, `AssetOS manifest must include reviewed MenuList slot ${slotId}`);
    assert(entry.review?.decision === 'approved', `AssetOS slot ${slotId} must retain an approved review decision`);

    for (const outputPath of Object.values(entry.files || {})) {
      assert(typeof outputPath === 'string' && fs.existsSync(resolvePath(outputPath)), `AssetOS slot ${slotId} output must exist: ${outputPath}`);
      assert(fs.statSync(resolvePath(outputPath)).size > 0, `AssetOS slot ${slotId} output must be non-empty: ${outputPath}`);
    }

    for (const [sourcePath, expectedHash] of Object.entries(entry.sourceFingerprint?.files || {})) {
      assert(fs.existsSync(resolvePath(sourcePath)), `AssetOS slot ${slotId} watched source must exist: ${sourcePath}`);
      assert(
        sha256File(sourcePath) === expectedHash,
        `AssetOS slot ${slotId} watched source fingerprint must be current: ${sourcePath}`,
      );
    }
  }

  const finalFrameEntry = manifest.assets['menulist.launch.video.frame.final-proof'];
  assert(finalFrameEntry.version === 2, 'AssetOS final proof frame must record corrected version 2');
  assertIncludes(finalFrameEntry.review.notes, 'clean 5.40-second proof state', 'AssetOS final proof frame review note');
  assertIncludes(productionAudit, 'MenuList coordinated launch-pack AssetOS checkpoint', 'Production readiness audit launch-pack AssetOS boundary');
  assertIncludes(changelog, 'MenuList Launch Pack AssetOS Publication Boundary', 'Changelog launch-pack AssetOS boundary');
}

function verifyAssetOsPublicMediaBoundary() {
  const assetAudit = read('packages/asset-factory/scripts/lib/asset-audit.ts');
  const slotRegistry = read('packages/asset-factory/slots/menulist.asset-slots.ts');
  const manifest = JSON.parse(read('packages/asset-factory/manifest/assets.json'));
  const screenshotGallery = read('src/components/website/features/FeatureScreenshotProofGallery.tsx');
  const englishLocale = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
  const hindiLocale = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
  const imageAssetDocs = read('__docs__/main-website/main-website_image-assets.md');
  const placeholderDocs = read(
    '__docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-placeholder-assets.md',
  );
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const retiredIndustrySlotIds = [
    'menulist.industry.salons-spas.demo-placeholder',
    'menulist.industry.service-list-businesses.proof-placeholder',
    'menulist.industry.local-service-businesses.demo-placeholder',
  ];
  const governedSlotIds = [
    'menulist.industry.service-businesses.hero-source',
    'menulist.marketing.launch-video.poster-placeholder',
    'menulist.feature.customer-feedback-loop.public-form',
    'menulist.feature.menu-import.source-link',
    'menulist.feature.public-discovery.presence-checklist',
    'menulist.feature.qr-menu-links.share-kit',
    'menulist.feature.print-ready-kit.dashboard',
    'menulist.feature.print-ready-kit.editor',
    'menulist.home.owner-proof.ai-menu-manager',
    'menulist.home.owner-proof.business-health',
  ];
  const declaredPublicFiles = new Set(
    Object.values(manifest.assets || {}).flatMap((entry) => Object.values(entry.files || {}).filter(Boolean)),
  );
  const manifestFileOwners = new Map();
  const trackedWebsiteFiles = walkRepoFiles('public/images/website').filter((repoPath) => !repoPath.endsWith('.map'));

  for (const [slotId, entry] of Object.entries(manifest.assets || {})) {
    for (const repoPath of Object.values(entry.files || {})) {
      if (!repoPath) continue;
      manifestFileOwners.set(repoPath, [...(manifestFileOwners.get(repoPath) || []), slotId]);
    }
  }

  assert(
    /severity: 'error',\s+message: 'Public asset is not connected to an asset slot\.'/m.test(assetAudit),
    'AssetOS disconnected public media must remain an audit error',
  );
  assertIncludes(assetAudit, 'Manifest does not declare the slot destination.', 'AssetOS slot-destination audit contract');
  assertIncludes(assetAudit, 'Manifest is missing required ${output.role} output.', 'AssetOS required-output audit contract');
  assertIncludes(assetAudit, 'Manifest entry has no slot declaration.', 'AssetOS orphan-manifest audit contract');
  assertIncludes(assetAudit, 'Asset file is owned by multiple slots:', 'AssetOS duplicate-file ownership audit contract');
  assertIncludes(assetAudit, 'declared source file(s) are missing.', 'AssetOS missing watched-source audit contract');
  assertIncludes(assetAudit, 'changed, appeared, or disappeared since manifest approval.', 'AssetOS exact fingerprint drift contract');
  assertIncludes(assetAudit, 'Manifest brief path does not match the slot ID.', 'AssetOS slot-brief path contract');
  assertIncludes(assetAudit, 'Asset brief is owned by multiple slots:', 'AssetOS exclusive brief ownership contract');
  assertIncludes(assetAudit, 'Approved asset status does not have an approved review decision.', 'AssetOS approved-status review contract');
  assertIncludes(assetAudit, 'Approved review must have passing performance and 1-10 review scores.', 'AssetOS coherent approved-review contract');
  assertIncludes(assetAudit, 'file does not match required ${outputContract.format} format.', 'AssetOS output-format contract');
  assert(
    [...manifestFileOwners.entries()].every(([, owners]) => owners.length === 1),
    `AssetOS manifest files must have one owner:\n${[...manifestFileOwners.entries()]
      .filter(([, owners]) => owners.length > 1)
      .map(([repoPath, owners]) => `${repoPath}: ${owners.join(', ')}`)
      .join('\n')}`,
  );
  assert(
    trackedWebsiteFiles.every((repoPath) => declaredPublicFiles.has(repoPath)),
    `AssetOS manifest must own every public website media file:\n${trackedWebsiteFiles
      .filter((repoPath) => !declaredPublicFiles.has(repoPath))
      .join('\n')}`,
  );

  for (const slotId of governedSlotIds) {
    assertIncludes(slotRegistry, `id: '${slotId}'`, `AssetOS governed MenuList slot ${slotId}`);
    const entry = manifest.assets?.[slotId];
    assert(entry, `AssetOS manifest must include governed MenuList slot ${slotId}`);
    assert(entry.status === 'approved', `AssetOS governed slot ${slotId} must be approved`);
    assert(entry.review?.decision === 'approved', `AssetOS governed slot ${slotId} review must be approved`);
    assert(entry.brief && fs.existsSync(resolvePath(entry.brief)), `AssetOS governed slot ${slotId} brief must exist`);
    assert(
      Object.keys(entry.sourceFingerprint?.files || {}).length > 0,
      `AssetOS governed slot ${slotId} must have a locked source fingerprint`,
    );

    for (const outputPath of Object.values(entry.files || {})) {
      assert(fs.existsSync(resolvePath(outputPath)), `AssetOS governed slot ${slotId} output must exist: ${outputPath}`);
      assert(fs.statSync(resolvePath(outputPath)).size > 0, `AssetOS governed slot ${slotId} output must be non-empty: ${outputPath}`);
    }

    for (const [sourcePath, expectedHash] of Object.entries(entry.sourceFingerprint?.files || {})) {
      assert(fs.existsSync(resolvePath(sourcePath)), `AssetOS governed slot ${slotId} source must exist: ${sourcePath}`);
      assert(
        sha256File(sourcePath) === expectedHash,
        `AssetOS governed slot ${slotId} watched source fingerprint must be current: ${sourcePath}`,
      );
    }
  }

  retiredIndustrySlotIds.forEach((slotId) => {
    assertIncludes(slotRegistry, `id: '${slotId}'`, `AssetOS retired MenuList slot ${slotId}`);
    const entry = manifest.assets?.[slotId];
    assert(entry?.status === 'retired', `AssetOS retired industry placeholder ${slotId} must stay retired`);
    assert(entry.review?.decision === 'approved', `AssetOS retired industry placeholder ${slotId} must preserve its historical review`);
    assertIncludes(entry.review.notes, 'Retired from the public website', `AssetOS retired-placeholder review ${slotId}`);
    for (const outputPath of Object.values(entry.files || {})) {
      assert(
        outputPath.startsWith('packages/asset-factory/published/placeholders/'),
        `AssetOS retired industry placeholder ${slotId} must remain outside public media`,
      );
      assert(fs.existsSync(resolvePath(outputPath)), `AssetOS retired industry placeholder ${slotId} must be preserved internally`);
    }
  });
  assertIncludes(placeholderDocs, 'They are not customer proof.', 'AssetOS industry placeholder customer-proof boundary');
  assertIncludes(placeholderDocs, 'removed from the public routes on July 18, 2026', 'AssetOS retired industry placeholder boundary');

  assert(!manifest.assets['menulist.feature.customer-feedback-loop.owner-inbox'], 'Loading-state owner inbox must not remain an approved public AssetOS slot');
  assert(!manifest.assets['menulist.feature.qr-menu-links.public-menu'], 'Broken feature-local public menu must not remain an approved public AssetOS slot');
  assert(!fs.existsSync(resolvePath('public/images/website/features/customer-feedback-loop/owner-feedback-inbox.webp')), 'Loading-state owner inbox must stay out of public media');
  assert(!fs.existsSync(resolvePath('public/images/website/features/qr-menu-links/public-menu.webp')), 'Broken feature-local public menu must stay out of public media');
  assertIncludes(
    screenshotGallery,
    "src: '/images/website/menulist-public-menu-mobile.webp'",
    'QR Menu Links clean customer-menu proof reuse',
  );
  assertNotIncludes(screenshotGallery, 'owner-feedback-inbox.webp', 'Customer Feedback loading-state proof');
  assertNotIncludes(screenshotGallery, 'features/qr-menu-links/public-menu.webp', 'QR Menu Links broken public-menu proof');
  assertIncludes(
    englishLocale.Website.FeatureDetailScreenshots.customerFeedbackLoop.subtitle,
    'private owner review surface remains held back until a clean ready-state screenshot is approved',
    'English Customer Feedback screenshot boundary',
  );
  assertIncludes(
    hindiLocale.Website.FeatureDetailScreenshots.customerFeedbackLoop.subtitle,
    'Private owner review surface clean ready-state screenshot approve होने तक held back है',
    'Hindi Customer Feedback screenshot boundary',
  );
  assertNotIncludes(
    englishLocale.Website.FeatureDetailScreenshots.customerFeedbackLoop.subtitle,
    'These captures show the public report path and the private owner review view',
    'English Customer Feedback stale plural screenshot copy',
  );
  assertIncludes(imageAssetDocs, 'former feature-local capture was removed because visual review found a broken logo and empty media block', 'Main website rejected QR proof record');
  assertIncludes(imageAssetDocs, 'owner-inbox proof remains held back because the current raw capture shows a loading state', 'Main website held-back owner inbox record');
  assertIncludes(productionAudit, 'AssetOS disconnected public-media governance checkpoint', 'Production readiness audit AssetOS public-media boundary');
  assertIncludes(productionAudit, 'AssetOS manifest-contract integrity checkpoint', 'Production readiness audit AssetOS manifest contract');
  assertIncludes(productionAudit, 'AssetOS watched-source completeness checkpoint', 'Production readiness audit AssetOS watched-source contract');
  assertIncludes(productionAudit, 'AssetOS brief-integrity checkpoint', 'Production readiness audit AssetOS brief contract');
  assertIncludes(productionAudit, 'AssetOS approval-state coherence checkpoint', 'Production readiness audit AssetOS approval contract');
  assertIncludes(productionAudit, 'AssetOS output-format checkpoint', 'Production readiness audit AssetOS format contract');
  assertIncludes(changelog, 'AssetOS Public Media Ownership Boundary', 'Changelog AssetOS public-media boundary');
  assertIncludes(changelog, 'Manifest ownership now means one valid slot contract', 'Changelog AssetOS manifest contract');
  assertIncludes(changelog, 'Watched evidence cannot disappear silently', 'Changelog AssetOS watched-source contract');
  assertIncludes(changelog, 'Approved media cannot bypass its brief', 'Changelog AssetOS brief contract');
  assertIncludes(changelog, 'Approved now has one coherent meaning', 'Changelog AssetOS approval contract');
  assertIncludes(changelog, 'Required roles now require the declared media format', 'Changelog AssetOS format contract');
}

function verifyPricingPublicCopyBoundary() {
  const pricingFaq = read('src/components/website/pricing-pages/PricingFaq.tsx');
  const platformFeatures = read('src/data/PlatformFeaturesList.ts');
  const onboardingModal = read('src/components/website/pricing-pages/OnboardingModal.tsx');
  const pricingPage = read('src/components/website/pricing-pages/index.tsx');
  const createMenuPreview = read('src/components/website/home/CreateMenuPreviewSection.tsx');
  const interactiveWorkflow = read('src/components/website/home/InteractiveWorkflowSection.tsx');
  const industries = read('src/content/websiteIndustries.ts');
  const footer = read('src/components/website/Footer.tsx');
  const englishLocale = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
  const hindiLocale = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
  const englishPricing = englishLocale.Website?.Pricing;
  const hindiPricing = hindiLocale.Website?.Pricing;
  const englishHero = englishLocale.Website?.Hero;
  const englishCreateMenuPreview = englishLocale.Website?.CreateMenuPreview;

  assertIncludes(
    industries,
    'export type WebsiteIndustrySlug = (typeof WEBSITE_INDUSTRY_SLUGS)[number];',
    'Website industry closed slug contract',
  );
  assertIncludes(
    industries,
    'export function getRequiredWebsiteIndustryPage(slug: WebsiteIndustrySlug): WebsiteIndustryPage',
    'Website industry required lookup contract',
  );
  [
    'restaurants',
    'cafes-bakeries',
    'takeaway-cloud-kitchens',
    'multi-location-food-businesses',
    'salons-spas',
    'service-list-businesses',
    'local-service-businesses',
  ].forEach((slug) => {
    const route = read(`src/app/(website)/industries/${slug}/page.tsx`);
    assertIncludes(
      route,
      `getRequiredWebsiteIndustryPage('${slug}')`,
      `Website industry ${slug} required route lookup`,
    );
    assertNotIncludes(route, `getWebsiteIndustryPage('${slug}')!`, `Website industry ${slug} non-null assertion`);
  });

  assertIncludes(
    pricingFaq,
    "{ category: 'gettingStarted', key: 'dayEight' }",
    'Pricing FAQ seven-day setup boundary',
  );
  assertIncludes(pricingPage, '<main id="main-content"', 'Pricing page main-content landmark');
  assertIncludes(
    platformFeatures,
    'A professional business page with your menu, hours, location, and current status.',
    'Platform features bounded OBP status copy',
  );
  assertIncludes(
    platformFeatures,
    'Receive event notifications for supported account activity.',
    'Platform features bounded webhook notification copy',
  );
  [
    'Start with a clear photo or an owned public menu, service-list, image, or PDF link.',
    'keeps supported MenuList public outputs connected to the version you approve',
  ].forEach((token) => assertIncludes(englishHero?.subtitle || '', token, 'Homepage supported intake copy'));
  assert(
    englishPricing?.setupStateBody ===
      'Seven-day setup access lets you publish and review the real link and QR. It is not the Official paid plan. Choose a paid plan before the deadline to keep the same URL live after day seven.',
    'English pricing setup state must distinguish setup access from the Official paid plan',
  );
  assert(
    typeof hindiPricing?.setupStateBody === 'string'
      && hindiPricing.setupStateBody.includes('setup access में real link और QR publish')
      && hindiPricing.setupStateBody.includes('Official paid plan नहीं है')
      && hindiPricing.setupStateBody.includes('deadline से पहले paid plan'),
    'Hindi pricing setup state must distinguish setup access from the Official paid plan',
  );
  assert(
    typeof englishPricing?.faqDayEightAnswer === 'string'
      && englishPricing.faqDayEightAnswer.includes('setup access stops after the deadline'),
    'English pricing FAQ must explain the no-plan state after day seven',
  );
  assert(
    typeof hindiPricing?.faqDayEightAnswer === 'string'
      && hindiPricing.faqDayEightAnswer.includes('setup access deadline के बाद रुक जाता है'),
    'Hindi pricing FAQ must explain the no-plan state after day seven',
  );
  [
    'Custom domains',
    'Supported content enhancements use the capacity included with Official.',
  ].forEach((token) => assertIncludes(englishPricing?.officialNotIncluded || '', token, 'Official plan capacity copy'));
  assert(!('typedTitle' in englishCreateMenuPreview), 'English create-menu preview locale must not advertise unsupported typed intake');
  assert(!('typedTitle' in (hindiLocale.Website?.CreateMenuPreview || {})), 'Hindi create-menu preview locale must not advertise unsupported typed intake');
  assertNotIncludes(createMenuPreview, "{ key: 'typed'", 'Homepage create-menu preview source boundary');
  assertIncludes(interactiveWorkflow, "{ key: 'pipelineServiceListLink'", 'Homepage workflow supported link intake boundary');
  assertNotIncludes(interactiveWorkflow, "{ key: 'pipelineText'", 'Homepage workflow unsupported typed intake boundary');
  assertNotIncludes(industries, 'Placeholder proof asset', 'Industry public proof boundary');
  assertNotIncludes(industries, 'Replace this placeholder', 'Industry public proof boundary');
  assertNotIncludes(onboardingModal, '[Animation Here]', 'Pricing onboarding owner-copy boundary');
  assertNotIncludes(onboardingModal, 'Look Brilliant', 'Pricing onboarding owner-copy boundary');
  [
    "{ href: '/#included-with-link', key: 'publicProof' }",
    "{ href: '/features/official-business-page', key: 'officialPage' }",
    "{ href: '/about', key: 'about' }",
    "{ href: '/contact', key: 'contact' }",
  ].forEach((token) => assertIncludes(footer, token, 'Website footer route boundary'));
  assertNotIncludes(footer, "{ href: '/#public-proof'", 'Website footer stale public-proof anchor');

  const pricingPublicCopy = `${pricingFaq}\n${platformFeatures}`;
  for (const staleClaim of BLOCKED_PRICING_COPY_CLAIMS) {
    assertNotIncludes(pricingPublicCopy, staleClaim, 'Pricing and feature public copy freshness boundary');
  }
  [
    'from any uploaded menu',
    'SEO-friendly descriptions',
    'Generate stunning',
    'Virtual Try-On',
    'Directly share your catalog',
    'to appear in search results',
    'Remove MenulListAI',
    '100% accuracy',
  ].forEach((claim) => assertNotIncludes(pricingPublicCopy, claim, 'Pricing and feature unsupported-claim boundary'));
}

function verifyWebsiteAliasAndLocaleRoutingBoundary() {
  const pathProvider = read('src/components/website/shared/WebsiteProductPathProvider.tsx');
  const languageSwitcher = read('src/components/website/shared/WebsiteLanguageSwitcher.tsx');
  const header = read('src/components/website/Header.tsx');
  const createMenuClient = read('src/app/(website)/create-menu/CreateMenuClient.tsx');
  const createMenuPreviewPage = read('src/app/(website)/create-menu/preview/[draftId]/page.tsx');
  const createMenuSuccessPage = read('src/app/(website)/create-menu/success/page.tsx');
  const ownerLayout = read('src/app/(main)/layout.tsx');
  const ownerLayoutWrapper = read('src/components/antdComponent/layoutWrapper/index.tsx');
  const legacyHeadMetaTags = read('src/components/organisms/headMetaTags/index.tsx');
  const legacyMetaDefaults = read('src/constants/defaultValues.ts');

  [
    "'/faq'",
    "'/invite'",
    "'/tools'",
    "'/whatsapp'",
    'isReviewedWebsiteResourceLocale(firstPathPart)',
    "secondPathPart === 'resources'",
    'export function withoutWebsiteBasePath(pathname: string, basePath: string): string',
    'export function useWebsiteBasePath(): string',
  ].forEach((token) => assertIncludes(pathProvider, token, 'MenuList website product-alias route boundary'));
  [
    'const publicPathname = withoutWebsiteBasePath(pathname, basePath);',
    'const aliasedNextPath = withWebsiteBasePath(nextPath, basePath);',
    'aria-expanded={open}',
    'aria-haspopup="menu"',
    'btnRef.current?.focus();',
  ].forEach((token) => assertIncludes(languageSwitcher, token, 'MenuList alias-safe resource language switcher'));
  assertNotIncludes(languageSwitcher, "const pathParts = pathname.split('/').filter(Boolean);", 'MenuList resource locale routing must not inspect the raw aliased pathname');
  [
    'const basePath = useWebsiteBasePath();',
    'withoutWebsiteBasePath(pathname, basePath)',
    'const isFeaturesPath = Boolean(publicPathname?.startsWith("/features"));',
    'const isActive = publicPathname === item.href',
  ].forEach((token) => assertIncludes(header, token, 'MenuList alias-safe website header state'));
  [
    "const createMenuPath = useWebsitePath(buildCreateMenuPath(growthAcquisition));",
    "const createMenuPreviewPath = useWebsitePath('/create-menu/preview');",
  ].forEach((token) => assertIncludes(createMenuClient, token, 'MenuList alias-safe create-menu route boundary'));
  [
    "title: 'MenuList Owner Dashboard'",
    'index: false',
    'follow: false',
    'nocache: true',
  ].forEach((token) => assertIncludes(ownerLayout, token, 'MenuList protected owner metadata boundary'));
  [
    'index: false',
    'follow: false',
    'nocache: true',
    'noimageindex: true',
    "'max-image-preview': 'none'",
    "'max-snippet': 0",
  ].forEach((token) => {
    assertIncludes(createMenuPreviewPage, token, 'MenuList private draft-preview metadata boundary');
    assertIncludes(createMenuSuccessPage, token, 'MenuList private publish-success metadata boundary');
  });
  [
    'MenuList AI Dashboard Main',
    'The everything app',
    '🄴🄲🄾🄼🅂🄰🄸',
  ].forEach((token) => assertNotIncludes(ownerLayout, token, 'MenuList protected owner stale metadata boundary'));
  assertNotIncludes(ownerLayoutWrapper, 'HeadMetaTags', 'Protected owner shell must not override noindex App Router metadata with client next/head tags');
  [
    'The Jawed Habib',
    'Best Respark in the world',
    'Ecoms.ai Salon',
    'content="Respark"',
  ].forEach((token) => {
    assertNotIncludes(legacyHeadMetaTags, token, 'Legacy head helper stale product metadata');
    assertNotIncludes(legacyMetaDefaults, token, 'Legacy metadata default stale product metadata');
  });
  [
    'MENULIST_SITE_TITLE',
    'MENULIST_SITE_DESCRIPTION',
    'MENULIST_SITE_IMAGE',
  ].forEach((token) => assertIncludes(legacyMetaDefaults, token, 'Legacy metadata defaults derive from the MenuList website source of truth'));
}

function verifyWebsiteLegalRuntimeTruthBoundary() {
  const refundPolicy = read('src/components/website/legal/RefundPolicyPage.tsx');
  const terms = read('src/components/website/legal/TermsOfServicePage.tsx');
  const commercialIdentity = read('src/constants/menulist/commercialIdentity.ts');

  [
    'August 22, 2026',
    'Current paid plan continues until the end of its billing period',
    'purpose-based retention terms in our Privacy Policy',
    'applicable law requires otherwise or MenuList confirms a duplicate or incorrect charge',
    'Features and limits remain specific to the purchased plan',
  ].forEach((token) => assertIncludes(refundPolicy, token, 'MenuList refund policy runtime-truth boundary'));
  [
    'Preserved for 30 days after subscription expires',
    'Data preserved for 30 days',
    'All features unlocked without delay',
    'All fees are final and non-refundable.',
  ].forEach((token) => assertNotIncludes(refundPolicy, token, 'MenuList refund policy stale absolute claim boundary'));
  [
    'August 22, 2026',
    'You retain the rights you already hold in content you upload',
    'subject to applicable law, your input rights, and relevant provider terms',
    'MENULIST_PAYMENT_PROCESSOR_DISCLOSURE',
    'MenuList QR links, web pages, screens, and fresh downloadable assets',
  ].forEach((token) => assertIncludes(terms, token, 'MenuList terms runtime-truth boundary'));
  assertIncludes(
    commercialIdentity,
    'Razorpay processes checkout and payment-method details. MenuList records the payment and prepares the applicable billing document.',
    'MenuList shared payment-processor disclosure',
  );
  [
    'Publish everywhere',
    'All generated content belongs to you',
    'You own 100% of your uploaded content',
    'No attribution required to MenuList',
    'Razorpay (PCI-DSS compliant)',
  ].forEach((token) => assertNotIncludes(terms, token, 'MenuList terms stale absolute claim boundary'));
}

function verifyWebsiteAnalyticsBoundary() {
  const websiteLayout = read('src/app/(website)/layout.tsx');
  const websiteAnalyticsConsent = read('src/components/website/WebsiteAnalyticsConsent.tsx');
  const publicCookieConsentBanner = read('src/components/shared/publicCookieConsent/PublicCookieConsentBanner.tsx');
  const googleAnalytics = read('src/components/website/GoogleAnalytics.tsx');
  const plausibleHelper = read('src/lib/website/plausible.ts');
  const plausibleScript = read('src/components/shared/analytics/PlausibleAnalyticsScript.tsx');
  const publicAnalyticsContext = read('src/lib/website/publicAnalyticsContext.ts');
  const clarityAnalytics = read('src/components/website/ClarityAnalytics.tsx');
  const clientPage = read('src/app/client/[[...slug]]/page.tsx');
  const clientRenderer = read('src/components/templates/website/clientWebsite/index.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const mobileSeoAnalytics = read('src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx');
  const resourceAnalytics = read('src/components/website/resources/ResourceAnalytics.tsx');
  const resourceTrackedLink = read('src/components/website/resources/ResourceTrackedLink.tsx');
  const articleSection = read('src/components/website/resources/ArticleSection.tsx');
  const marketingClickTracker = read('src/components/website/WebsiteMarketingClickTracker.tsx');
  const resourceArticleSection = read('src/components/website/resources/ArticleSection.tsx');
  const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  assertIncludes(
    websiteLayout,
    '<WebsiteAnalyticsConsent />',
    'Main website layout analytics consent mount',
  );
  assertNotIncludes(websiteLayout, '<GoogleAnalytics', 'Main website layout direct Google Analytics mount');
  assertNotIncludes(websiteLayout, '<ClarityAnalytics', 'Main website layout direct Clarity mount');
  assertIncludes(
    websiteAnalyticsConsent,
    '<PublicCookieConsentBanner',
    'Main website analytics consent component',
  );
  assertIncludes(
    websiteAnalyticsConsent,
    '<PlausibleAnalytics />',
    'Main website analytics consent children',
  );
  assertIncludes(
    websiteAnalyticsConsent,
    '<GoogleAnalytics />',
    'Main website analytics consent children',
  );
  assertIncludes(
    websiteAnalyticsConsent,
    '<ClarityAnalytics />',
    'Main website analytics consent children',
  );
  [
    "process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ''",
    'const IS_CONFIGURED_GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);',
    'if (!IS_CONFIGURED_GA_MEASUREMENT_ID) return null;',
    'function getMenulistAnalyticsPageLocation()',
    "url.search = '';",
    "url.hash = '';",
    'page_location: getMenulistAnalyticsPageLocation(),',
  ].forEach((token) => assertIncludes(googleAnalytics, token, 'Main website Google Analytics page-location boundary'));
  assertNotIncludes(
    googleAnalytics,
    'page_location: window.location.href',
    'Main website Google Analytics raw page-location boundary',
  );
  assertNotIncludes(
    googleAnalytics,
    'process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;',
    'Main website Google Analytics permissive env fallback',
  );
  assertIncludes(
    publicCookieConsentBanner,
    "{choice === 'accepted' ? children : null}",
    'Public cookie consent accepted-only child rendering',
  );
  assertIncludes(
    publicCookieConsentBanner,
    "logRuntimeFailure('public_cookie_consent_storage_failed'",
    'Public cookie consent storage fallback diagnostics',
  );
  assertIncludes(
    publicCookieConsentBanner,
    "operation === 'remove'",
    'Public cookie consent storage fallback policy',
  );
  assertIncludes(
    publicCookieConsentBanner,
    "window.localStorage.removeItem(storageKey)",
    'Public cookie consent invalid-choice eviction',
  );
  assertIncludes(
    publicCookieConsentBanner,
    "getBoundedRuntimeStringContext('storageKey', storageKey)",
    'Public cookie consent bounded storage-key context',
  );
  assertIncludes(
    plausibleHelper,
    "logAnalyticsFailure('public_website_plausible_consent_read_failed'",
    'Public website Plausible consent read diagnostics',
  );
  assertIncludes(
    plausibleHelper,
    "fallbackPolicy: 'skip_plausible_event_until_consent_known'",
    'Public website Plausible consent fail-closed policy',
  );
  assertIncludes(
    plausibleHelper,
    "getBoundedAnalyticsStringContext('consentKey', consentKey)",
    'Public website Plausible bounded consent-key context',
  );
  assertNotIncludes(
    publicCookieConsentBanner,
    '} catch {\n        return null;\n    }',
    'Public cookie consent read fallback silent catch',
  );
  assertNotIncludes(
    publicCookieConsentBanner,
    '} catch {\n            // If localStorage is unavailable, keep the runtime choice for this page.',
    'Public cookie consent write fallback silent catch',
  );
  assertNotIncludes(
    plausibleHelper,
    '} catch {\n        return false;\n    }',
    'Public website Plausible consent read silent catch',
  );
  [
    'setPublicWebsiteAnalyticsRuntimeConsent',
    'if (!hasAcceptedPublicWebsiteAnalyticsConsent()) return;',
    'MARKETING_EVENT_PARAM_MAX_LENGTH_BY_KEY',
    'stripAnalyticsControlCharacters',
    'getBoundedMarketingEventParams',
    'const boundedParams = getBoundedMarketingEventParams(params);',
    "analyticsWindow.gtag('event', normalizedEventName, boundedParams);",
  ].forEach((token) => assertIncludes(plausibleHelper, token, 'Public website Google marketing event payload boundary'));
  [
    'normalizePlausibleScriptSource',
    "if (url.protocol !== 'https:' || url.username || url.password) return undefined;",
  ].forEach((token) => assertIncludes(plausibleHelper, token, 'Public website Plausible script-source boundary'));
  assertIncludes(
    plausibleScript,
    'normalizePlausibleScriptSource',
    'Public website Plausible component script-source admission',
  );
  [
    'getPublicAnalyticsAttributionToken',
    'getPublicAnalyticsPath',
    'getPublicAnalyticsReferrerGroup',
    'getPublicAnalyticsSessionEntryPage',
    "sameOrigin ? `${url.origin}${url.pathname || '/'}` : url.origin",
  ].forEach((token) => assertIncludes(publicAnalyticsContext, token, 'Public resource analytics context minimization'));
  [
    'referrer: document.referrer',
    'referrer_host:',
    'target_url: window.location.href',
    '`${window.location.pathname}${window.location.search}`',
  ].forEach((token) => assertNotIncludes(resourceAnalytics, token, 'Public resource analytics raw browser context'));
  [
    'getPublicAnalyticsAttributionToken',
    'getPublicAnalyticsReferrerGroup',
    'getPublicAnalyticsSessionEntryPage',
    'getPublicAnalyticsUrl',
  ].forEach((token) => assertIncludes(resourceTrackedLink, token, 'Public resource link-click analytics minimization'));
  [
    'referrer: document.referrer',
    'referrer_host:',
    '`${window.location.pathname}${window.location.search}`',
    'target_url: href',
  ].forEach((token) => assertNotIncludes(resourceTrackedLink, token, 'Public resource link-click raw browser context'));
  assertIncludes(
    articleSection,
    'target_url: getPublicAnalyticsUrl(window.location.href)',
    'Public resource checklist analytics URL minimization',
  );
  [
    'link_url: getPublicAnalyticsUrl(url?.href)',
    'page_path: getPublicAnalyticsPagePath()',
  ].forEach((token) => assertIncludes(marketingClickTracker, token, 'Public marketing click URL minimization'));
  [
    'link_url: url?.href',
    'target_url: window.location.href',
  ].forEach((token) => assertNotIncludes(
    `${articleSection}\n${marketingClickTracker}`,
    token,
    'Public click/checklist analytics raw URL exclusion',
  ));
  [
    "const OMITTED_PUBLIC_ANALYTICS_PARAM_KEYS = new Set(['referrer', 'referrer_host']);",
    "const PUBLIC_ANALYTICS_URL_PARAM_KEYS = new Set(['destination', 'link_url', 'target_url']);",
    "const PUBLIC_ANALYTICS_PATH_PARAM_KEYS = new Set(['entry_page', 'page_path']);",
    'normalizeMarketingEventStringParam',
  ].forEach((token) => assertIncludes(plausibleHelper, token, 'Central public marketing payload minimization'));
  assertNotIncludes(
    plausibleHelper,
    "analyticsWindow.gtag('event', normalizedEventName, params);",
    'Public website Google marketing event unbounded payload call',
  );
  assertIncludes(
    websiteAnalyticsConsent,
    'setPublicWebsiteAnalyticsRuntimeConsent(consent);',
    'Main website immediate runtime consent projection',
  );
  [
    [resourceAnalytics, 'ResourceAnalytics'],
    [resourceTrackedLink, 'ResourceTrackedLink'],
    [resourceArticleSection, 'ArticleSection'],
  ].forEach(([source, label]) => {
    assertIncludes(source, 'trackGoogleMarketingEvent', `${label} bounded Google marketing event helper`);
    assertNotIncludes(source, "gtag('event'", `${label} direct Google event call`);
    assertNotIncludes(source, 'analyticsWindow.gtag', `${label} direct Google analytics window call`);
  });
  assertIncludes(
    clarityAnalytics,
    "process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || ''",
    'Clarity analytics explicit env gate',
  );
  assertIncludes(
    clarityAnalytics,
    'const isConfiguredClarityId = /^[a-z0-9]+$/i.test(CLARITY_ID);',
    'Clarity analytics ID shape gate',
  );
  assertIncludes(
    clarityAnalytics,
    'if (!isConfiguredClarityId) return null;',
    'Clarity analytics fail-closed config boundary',
  );
  assertNotIncludes(clarityAnalytics, 'sc0tsmzg6b', 'Clarity analytics hardcoded project fallback');
  assertNotIncludes(
    clarityAnalytics,
    'process.env.NEXT_PUBLIC_CLARITY_ID ||',
    'Clarity analytics permissive env fallback',
  );
  assertIncludes(clientPage, "function getGoogleVerificationMetadata(storeData: any): Pick<Metadata, 'verification'>", 'App Router Search Console metadata boundary');
  assertIncludes(clientPage, 'normalizeGoogleSearchConsoleVerification(storeData?.analytics?.googleSearchConsole)', 'public Search Console verification token projection');
  assertIncludes(clientPage, '...getGoogleVerificationMetadata(metadataStore)', 'outlet/project Search Console metadata projection');
  assertNotIncludes(clientRenderer, '<GoogleSearchConsole', 'legacy client next/head Search Console projection');
  assertIncludes(businessSettings, 'normalizeGoogleSearchConsoleVerification(next.googleSearchConsole)', 'desktop Search Console write normalization');
  assertIncludes(mobileSeoAnalytics, 'normalizeGoogleSearchConsoleVerification(analyticsDraft.googleSearchConsole)', 'mobile Search Console write normalization');
  assertIncludes(
    mainWebsiteImpl,
    'Microsoft Clarity remains MenuList-only and env-gated by `NEXT_PUBLIC_CLARITY_ID`',
    'Main website implementation Clarity env-gated boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Clarity is MenuList-only and env-gated by `NEXT_PUBLIC_CLARITY_ID`',
    'Main website content Clarity env-gated boundary',
  );
  assertIncludes(
    mainWebsiteImpl,
    'Public website consent storage diagnostics',
    'Main website implementation public consent storage diagnostics',
  );
  assertIncludes(
    mainWebsiteContent,
    'Consent storage fallback diagnostics',
    'Main website content public consent storage diagnostics',
  );
  assertIncludes(
    mainWebsiteImpl,
    'Resource GA4 page-view, link-click, checklist-copy, and delegated website-click',
    'Main website implementation resource analytics payload boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Resource GA4 custom-event payloads are bounded through `trackGoogleMarketingEvent`',
    'Main website content resource analytics payload boundary',
  );
  assertIncludes(
    mainWebsiteImpl,
    'Google Analytics page views strip query strings and hash fragments',
    'Main website implementation Google Analytics page-location boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Google Analytics page views strip query strings and hash fragments',
    'Main website content Google Analytics page-location boundary',
  );
  assertIncludes(
    productionAudit,
    'Website analytics Clarity configuration checkpoint',
    'Production readiness audit website analytics Clarity checkpoint',
  );
  assertIncludes(
    productionAudit,
    'Website analytics consent storage diagnostics checkpoint',
    'Production readiness audit website analytics consent storage diagnostics checkpoint',
  );
  assertIncludes(
    productionAudit,
    'Website resource analytics custom-event payload boundary checkpoint',
    'Production readiness audit website resource analytics payload boundary',
  );
  assertIncludes(
    productionAudit,
    'Website Google Analytics page-location boundary checkpoint',
    'Production readiness audit website Google Analytics page-location boundary',
  );
  assertIncludes(
    changelog,
    'Website Analytics Clarity Configuration Boundary',
    'Changelog website analytics Clarity boundary entry',
  );
  assertIncludes(
    changelog,
    'Website Analytics Consent Storage Diagnostics',
    'Changelog website analytics consent storage diagnostics entry',
  );
  assertIncludes(
    changelog,
    'Website Resource Analytics Payload Boundary',
    'Changelog website resource analytics payload boundary entry',
  );
  assertIncludes(
    changelog,
    'Website Google Analytics Page-Location Boundary',
    'Changelog website Google Analytics page-location boundary entry',
  );
}

function verifyDocsBoundary() {
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
  const mainWebsiteMarketing = read('__docs__/main-website/main-website_marketing.md');
  const mainWebsiteImpl = read('__docs__/main-website/main-website_impl.md');
  const mainWebsiteDesignSystem = read('__docs__/main-website/main-website_design-system.md');
  const stage7LaunchOutput = read(
    '__docs__/main-website/website-prep-codex-prompts/stage-07-output-final-launch-polish-production-readiness.md',
  );
  const seoVerification = read('__docs__/menulist-seo-launch/menulist-seo-launch_verification.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    'Version 3.6.118 closes the locally actionable findings from the July website audit',
    'Version 3.6.115 remains Website Truth and Owner Journey Audit',
    'the supported public entry is a photo/image upload or an owned public menu/service-list/image/PDF link',
    'accepted MenuList contact rows can now be reviewed manually by a verified platform operator at `/ops/website-enquiries`',
    'No public form, extraction, publishing, pricing/payment, owner data, Firebase rule/index, Cloud Function, dependency, production build, Vercel deployment, or domain contract changed',
  ].forEach((token) => assertIncludes(mainWebsiteReadme, token, 'Main website owner-journey canonical boundary'));
  [
    '`WebsiteProductPathProvider` remains the browser routing boundary for canonical website paths',
    'Cancelled/paused subscriptions keep the purchased plan mirror only through a valid paid `cycleEndDate`',
    '**Alias-safe resource switching:**',
  ].forEach((token) => assertIncludes(mainWebsiteImpl, token, 'Main website alias and paid-cycle implementation docs'));
  [
    'The v3.6.115 audit aligns the complete acquisition journey with current runtime',
    'The general `/contact` success state confirms successful admission and availability in the private platform inbox',
    'Protected owner pages emit `noindex, nofollow, nocache`',
  ].forEach((token) => assertIncludes(mainWebsiteImpl, token, 'Main website owner-journey implementation docs'));
  [
    'Website alias and legal truth note (updated July 29, 2026)',
    'Generated-output use stays subject to input rights, applicable law, and provider terms',
    'Do not promise all-plan features or fixed 30-day deletion',
  ].forEach((token) => assertIncludes(mainWebsiteContent, token, 'Main website legal content governance'));
  [
    'Header active state must use the public pathname',
    'The language trigger exposes `aria-expanded` and `aria-haspopup`',
    '--text-muted: #64748b',
  ].forEach((token) => assertIncludes(mainWebsiteDesignSystem, token, 'Main website alias accessibility design governance'));
  assertIncludes(mainWebsiteMarketing, 'Legal, billing, and alias truth note (updated July 29, 2026)', 'Main website marketing runtime-truth boundary');
  assertIncludes(productionAudit, 'Main Website, Legal, I18n/SEO And Paid-Cycle Truth', 'Production audit item 30 website boundary');
  assertIncludes(changelog, 'Main Website Alias, Legal And Paid-Cycle Truth Boundary', 'Changelog item 30 website boundary');
  assertIncludes(productionAudit, 'Main Website Truth And Owner Journey Audit', 'Production audit website owner-journey boundary');
  assertIncludes(changelog, 'Main Website Truth And Owner Journey Audit', 'Changelog website owner-journey boundary');

  assertIncludes(
    mainWebsiteReadme,
    'Homepage has source-gated local website evidence only; current launch or founder-review approval still requires the active production-readiness audit',
    'Main website README homepage launch-boundary wording',
  );
  assertIncludes(
    mainWebsiteReadme,
    'founder-approved demo tenant screenshots, target Vercel deploy evidence, and production-host smoke',
    'Main website README external launch evidence boundary',
  );
  assertNotIncludes(
    mainWebsiteReadme,
    'Homepage is ready for controlled launch/founder review.',
    'Main website README stale controlled-launch approval',
  );
  assertIncludes(
    stage7LaunchOutput,
    'Historical Stage 7 planning output; not current launch or founder-review approval',
    'Main website Stage 7 output launch-boundary status',
  );
  assertIncludes(
    stage7LaunchOutput,
    'Current website launch or founder-review approval requires the active',
    'Main website Stage 7 output current approval routing',
  );
  assertIncludes(
    stage7LaunchOutput,
    'founder-approved demo tenant screenshots, target Vercel deploy evidence, and production-host smoke',
    'Main website Stage 7 output external launch evidence boundary',
  );
  assertNotIncludes(
    stage7LaunchOutput,
    'The homepage is ready for a controlled launch or founder review after this Stage 7 pass.',
    'Main website Stage 7 output stale controlled-launch approval',
  );
  assertNotIncludes(
    stage7LaunchOutput,
    'Good enough for launch; `get-started` remains simple',
    'Main website Stage 7 output stale launch-good-enough wording',
  );
  assertNotIncludes(
    stage7LaunchOutput,
    'Can Wait Until V2',
    'Main website Stage 7 output stale V2 waiting label',
  );
  assertIncludes(
    mainWebsiteContent,
    '`RevenuePathSection`, `StatsSection`, `SearchDiscoverySection`, `AnalyticsInsightsSection`, `SmartFeaturesSection`, `BusinessSection`, `IndustrySection`, `WebsiteReplacementBlock`, and `PreparedForYouSection` remain in the repo as supporting components/future page material, but they are not mounted in the current homepage composition.',
    'Main website current homepage composition boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Do not use `AI-powered` as public shorthand.',
    'Main website AI Menu Manager public shorthand ban',
  );
  assertIncludes(mainWebsiteContent, 'No "AI-powered" in public copy', 'Main website language governance checklist');
  assertIncludes(
    mainWebsiteContent,
    'No "Smart" / "Intelligent" / "Dynamic"',
    'Main website language governance checklist',
  );
  assertIncludes(
    mainWebsiteContent,
    'Source gate: `npm run verify:website-public-copy-boundary` locks the mounted homepage copy, Website locale namespace blocked-claim scan, LLM context files, and the documented unmounted `SmartFeaturesSection` exception.',
    'Main website public-copy source gate note',
  );
  assertIncludes(
    mainWebsiteContent,
    'Live surfaces refresh through their supported cache, listener, or device paths',
    'Main website controlled-surface refresh boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Fresh PDF downloads should replace older downloaded or printed copies',
    'Main website generated artifact replacement boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'One approved menu source; replace old links and PDFs so customers see it',
    'Main website communication doctrine bounded core argument',
  );
  assertIncludes(
    mainWebsiteContent,
    'Your approved menu, ready for the places customers look.',
    'Main website where-it-lives bounded heading',
  );
  assertIncludes(
    mainWebsiteContent,
    'External profiles and printed copies still need owner placement or fresh replacement.',
    'Main website where-it-lives external/profile artifact boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Replace older downloaded or printed copies after changes.',
    'Main website where-it-lives print replacement boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'approved update → menu link refreshes',
    'Main website communication doctrine bounded story example',
  );
  assertIncludes(
    mainWebsiteContent,
    'One approved source becomes your customer links and assets.',
    'Main website source-to-public bounded heading',
  );
  assertIncludes(
    mainWebsiteContent,
    'supported public paths refresh through their own cache, device, or replacement rules',
    'Main website daily-change supported-refresh boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    'Keep one approved menu source current.',
    'Main website current-source bounded heading',
  );
  assertIncludes(
    mainWebsiteContent,
    'Supported customer-facing pages refresh through their configured paths; external profiles and older print/download files still need placement or replacement.',
    'Main website current-source external artifact boundary',
  );
  assertIncludes(
    mainWebsiteContent,
    "Hours display from weekly hours, today's-hours edits, or Temporary Status when owners set it",
    'Main website current-source hours boundary',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Atomic publishing — all surfaces update together',
    'Main website stale atomic all-surface publishing claim',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Your menu, from one place, correct everywhere',
    'Main website stale correct-everywhere core argument',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Your menu, everywhere your customers look.',
    'Main website stale every-surface heading',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Once published, your menu appears across every surface customers already use.',
    'Main website stale every-surface publish body',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'One menu becomes every customer surface.',
    'Main website stale source-to-public every-surface heading',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Your menu stays correct. You never check again.',
    'Main website stale never-check-again currentness claim',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Customer-facing pages can reflect the current published version without separate manual copies.',
    'Main website stale broad currentness body',
  );
  assertNotIncludes(
    mainWebsiteContent,
    'Hours displayed accurately — customers see "Open" or "Closed" in real time',
    'Main website stale real-time hours claim',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'One approved source. Fewer old-menu moments.',
    'Main website marketing bounded ad copy',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'Share the approved link.',
    'Main website marketing bounded share copy',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'Have you replaced the old links elsewhere?',
    'Main website marketing bounded distribution nudge',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'replace older PDFs or external links that customers may still find',
    'Main website marketing artifact/provider replacement boundary',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'Owner approves and publishes',
    'Main website transformation demo review-before-publish step',
  );
  assertIncludes(
    mainWebsiteMarketing,
    'Review first. Publish the approved menu link.',
    'Main website transformation demo bounded speed-copy replacement',
  );
  assertNotIncludes(mainWebsiteMarketing, 'One menu. Always correct.', 'Main website marketing stale always-correct copy');
  assertNotIncludes(mainWebsiteMarketing, 'Correct everywhere.', 'Main website marketing stale correct-everywhere copy');
  assertNotIncludes(
    mainWebsiteMarketing,
    'Your menu is correct here. Is it correct everywhere?',
    'Main website marketing stale distribution nudge',
  );
  assertNotIncludes(
    mainWebsiteMarketing,
    'Share it everywhere — it stays correct.',
    'Main website marketing stale universal-correctness copy',
  );
  assertNotIncludes(
    mainWebsiteMarketing,
    'Business online in under a minute',
    'Main website marketing stale transformation-demo speed claim',
  );
  assertIncludes(
    seoVerification,
    'npm run verify:website-public-copy-boundary',
    'MenuList SEO verification public-copy source gate command',
  );
  assertIncludes(
    seoVerification,
    'No blocked Website namespace copy hits',
    'MenuList SEO verification blocked-copy scan evidence',
  );
  assertIncludes(
    seoVerification,
    'Pre-existing `Smart`/`Smart Picks` wording exists in older/unmounted website components and shared locale/runtime strings.',
    'MenuList SEO verification Smart exception boundary',
  );
  assertIncludes(
    productionAudit,
    'Website public copy boundary source-gate checkpoint: `npm run verify:website-public-copy-boundary`',
    'Production readiness audit website public-copy source gate',
  );
  assertIncludes(
    productionAudit,
    'Main website README launch-boundary checkpoint',
    'Production readiness audit main website README launch-boundary source gate',
  );
  assertIncludes(
    productionAudit,
    'Main website Stage 7 output launch-boundary checkpoint',
    'Production readiness audit main website Stage 7 launch-boundary source gate',
  );
  assertIncludes(changelog, 'Website Public Copy Boundary Source Gate', 'Changelog website public-copy source gate entry');
  assertIncludes(changelog, 'Main Website README Launch Boundary', 'Changelog main website README launch-boundary entry');
  assertIncludes(changelog, 'Main Website Stage 7 Launch Boundary', 'Changelog main website Stage 7 launch-boundary entry');
  assertIncludes(
    productionAudit,
    'Main website publish-surface copy checkpoint',
    'Production readiness audit main website publish-surface boundary',
  );
  assertIncludes(
    changelog,
    'Main Website Publish-Surface Copy Boundary',
    'Changelog main website publish-surface boundary',
  );
  assertIncludes(
    productionAudit,
    'Main website marketing distribution-copy checkpoint',
    'Production readiness audit main website marketing distribution boundary',
  );
  assertIncludes(
    changelog,
    'Main Website Marketing Distribution Copy Boundary',
    'Changelog main website marketing distribution boundary',
  );
  assertIncludes(
    productionAudit,
    'Main website where-it-lives surface-copy checkpoint',
    'Production readiness audit main website where-it-lives surface boundary',
  );
  assertIncludes(
    changelog,
    'Main Website Where-It-Lives Surface Copy Boundary',
    'Changelog main website where-it-lives surface boundary',
  );
  assertIncludes(
    productionAudit,
    'Main website transformation-demo speed-copy checkpoint',
    'Production readiness audit main website transformation-demo speed boundary',
  );
  assertIncludes(
    changelog,
    'Main Website Transformation Demo Speed Copy Boundary',
    'Changelog main website transformation-demo speed boundary',
  );
  assertIncludes(
    productionAudit,
    'Main website current-source copy checkpoint',
    'Production readiness audit main website current-source copy boundary',
  );
  assertIncludes(
    changelog,
    'Main Website Current-Source Copy Boundary',
    'Changelog main website current-source copy boundary',
  );
  assertIncludes(
    productionAudit,
    'Pricing public-copy freshness-boundary checkpoint',
    'Production readiness audit pricing public-copy freshness source gate',
  );
  assertIncludes(
    productionAudit,
    '`npm run verify:website-public-copy-boundary` now source-gates pricing FAQ and shared plan-feature copy',
    'Production readiness audit pricing public-copy verifier boundary',
  );
  assertIncludes(changelog, 'Pricing Public Copy Freshness Boundary', 'Changelog pricing public-copy freshness boundary entry');
  assertIncludes(
    changelog,
    '`npm run verify:website-public-copy-boundary` now rejects stale pricing and plan-feature real-time/all-surface public claims',
    'Changelog pricing public-copy verifier boundary',
  );
  assertIncludes(
    productionAudit,
    'Locale freshness public-copy checkpoint',
    'Production readiness audit locale freshness public-copy source gate',
  );
  assertIncludes(
    productionAudit,
    '`npm run verify:website-public-copy-boundary` now rejects stale locale QR/PDF freshness claims',
    'Production readiness audit locale freshness verifier boundary',
  );
  assertIncludes(changelog, 'Locale Freshness Public Copy Boundary', 'Changelog locale freshness public-copy boundary entry');
  assertIncludes(
    changelog,
    '`npm run verify:website-public-copy-boundary` now rejects stale locale QR/PDF freshness claims',
    'Changelog locale freshness verifier boundary',
  );
  assertIncludes(
    productionAudit,
    'Localized OBP correctness public-copy checkpoint',
    'Production readiness audit localized OBP correctness source gate',
  );
  assertIncludes(
    productionAudit,
    '`npm run verify:website-public-copy-boundary` now rejects stale localized OBP blanket-correctness claims',
    'Production readiness audit localized OBP correctness verifier boundary',
  );
  assertIncludes(changelog, 'Localized OBP Correctness Public Copy Boundary', 'Changelog localized OBP correctness boundary entry');
  assertIncludes(
    changelog,
    '`npm run verify:website-public-copy-boundary` now rejects stale localized OBP blanket-correctness claims',
    'Changelog localized OBP correctness verifier boundary',
  );
}

if (process.argv.includes('--operational-proof-only')) {
  verifyPackageScript();
  verifyOperationalProofPlacementBoundary();
  console.log('Website operational proof placement verifier passed.');
} else {
  verifyPackageScript();
  verifyWebsiteSocialMetadataBoundary();
  verifyWebsiteAuditHardeningBoundary();
  verifyCrossProductTaglineBoundary();
  verifyWebsiteThemeStorageBoundary();
  verifyMountedHomepageBoundary();
  verifyLocaleAndDiscoveryCopy();
  verifyOperationalProofPlacementBoundary();
  verifyWhatsAppOnboardingFailClosedBoundary();
  verifyMenuListLaunchAssetPackBoundary();
  verifyAssetOsPublicMediaBoundary();
  verifyPricingPublicCopyBoundary();
  verifyWebsiteAliasAndLocaleRoutingBoundary();
  verifyWebsiteLegalRuntimeTruthBoundary();
  verifyWebsiteAnalyticsBoundary();
  verifyDocsBoundary();

  console.log('Website public copy boundary verifier passed.');
}
