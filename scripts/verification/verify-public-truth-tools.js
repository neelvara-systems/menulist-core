const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertSameSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const extra = actual.filter((value) => !expectedSet.has(value));

  assert(
    missing.length === 0 && extra.length === 0,
    `${label} mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
  );
}

function listPublicTruthToolModules() {
  return fs.readdirSync(path.join(ROOT, 'src', 'lib', 'public-truth-tools'), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.ts'))
    .sort();
}

const PUBLIC_TOOL_MANIFEST = [
  {
    slug: 'public-truth-check',
    label: 'Public Truth Check',
    key: 'publicTruthCheck',
    localePage: 'PublicTruthCheckPage',
    verifier: 'verify-public-truth-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CHECK',
    componentPath: 'src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/publicTruthCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/publicTruthCheckTypes.ts',
  },
  {
    slug: 'qr-link-health-check',
    label: 'QR Link Health Check',
    key: 'qrLinkHealthCheck',
    localePage: 'QrLinkHealthCheckPage',
    verifier: 'verify-qr-link-health-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK',
    componentPath: 'src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/qrLinkHealthReport.ts',
    typesPath: 'src/lib/public-truth-tools/qrLinkHealthTypes.ts',
  },
  {
    slug: 'menu-readability-check',
    label: 'Menu Readability Check',
    key: 'menuReadabilityCheck',
    localePage: 'MenuReadabilityCheckPage',
    verifier: 'verify-menu-readability-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK',
    componentPath: 'src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/menuReadabilityReport.ts',
    typesPath: 'src/lib/public-truth-tools/menuReadabilityTypes.ts',
  },
  {
    slug: 'customer-question-coverage-check',
    label: 'Customer Question Coverage Check',
    key: 'customerQuestionCoverageCheck',
    localePage: 'CustomerQuestionCoverageCheckPage',
    verifier: 'verify-customer-question-coverage-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_QUESTION_COVERAGE_CHECK',
    componentPath: 'src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerQuestionCoverageReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerQuestionCoverageTypes.ts',
  },
  {
    slug: 'customer-faq-reply-pack',
    label: 'Customer FAQ Reply Pack',
    key: 'customerFaqReplyPack',
    localePage: 'CustomerFaqReplyPackPage',
    verifier: 'verify-customer-faq-reply-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK',
    componentPath: 'src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerFaqReplyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerFaqReplyPackTypes.ts',
  },
  {
    slug: 'booking-inquiry-readiness-check',
    label: 'Booking Inquiry Readiness Check',
    key: 'bookingInquiryReadinessCheck',
    localePage: 'BookingInquiryReadinessCheckPage',
    verifier: 'verify-booking-inquiry-readiness-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK',
    componentPath: 'src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/bookingInquiryReadinessReport.ts',
    typesPath: 'src/lib/public-truth-tools/bookingInquiryReadinessTypes.ts',
  },
  {
    slug: 'price-availability-gap-check',
    label: 'Price Availability Gap Check',
    key: 'priceAvailabilityGapCheck',
    localePage: 'PriceAvailabilityGapCheckPage',
    verifier: 'verify-price-availability-gap-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK',
    componentPath: 'src/components/website/priceAvailabilityGapCheck/PriceAvailabilityGapCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/priceAvailabilityGapReport.ts',
    typesPath: 'src/lib/public-truth-tools/priceAvailabilityGapTypes.ts',
  },
  {
    slug: 'menu-pdf-cleanup-check',
    label: 'Menu PDF Cleanup Check',
    key: 'menuPdfCleanupCheck',
    localePage: 'MenuPdfCleanupCheckPage',
    verifier: 'verify-menu-pdf-cleanup-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK',
    componentPath: 'src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/menuPdfCleanupReport.ts',
    typesPath: 'src/lib/public-truth-tools/menuPdfCleanupTypes.ts',
  },
  {
    slug: 'google-profile-basics-checklist',
    label: 'Google Profile Basics Checklist',
    key: 'googleProfileBasicsChecklist',
    localePage: 'GoogleProfileBasicsChecklistPage',
    verifier: 'verify-google-profile-basics-checklist.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST',
    componentPath: 'src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx',
    reportPath: 'src/lib/public-truth-tools/googleProfileBasicsReport.ts',
    typesPath: 'src/lib/public-truth-tools/googleProfileBasicsTypes.ts',
  },
  {
    slug: 'business-facts-copy-pack',
    label: 'Business Facts Copy Pack',
    key: 'businessFactsCopyPack',
    localePage: 'BusinessFactsCopyPackPage',
    verifier: 'verify-business-facts-copy-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_BUSINESS_FACTS_COPY_PACK',
    componentPath: 'src/components/website/businessFactsCopyPack/BusinessFactsCopyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/businessFactsCopyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/businessFactsCopyPackTypes.ts',
  },
  {
    slug: 'customer-link-preview',
    label: 'One Customer Link Preview',
    key: 'customerLinkPreview',
    localePage: 'CustomerLinkPreviewPage',
    verifier: 'verify-customer-link-preview.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW',
    componentPath: 'src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx',
    reportPath: 'src/lib/public-truth-tools/customerLinkPreviewReport.ts',
    typesPath: 'src/lib/public-truth-tools/customerLinkPreviewTypes.ts',
  },
  {
    slug: 'social-bio-link-check',
    label: 'Social Bio Link Consistency Check',
    key: 'socialBioLinkCheck',
    localePage: 'SocialBioLinkCheckPage',
    verifier: 'verify-social-bio-link-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK',
    componentPath: 'src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/socialBioLinkCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/socialBioLinkCheckTypes.ts',
  },
  {
    slug: 'whatsapp-action-link-check',
    label: 'WhatsApp Action Link Check',
    key: 'whatsappActionLinkCheck',
    localePage: 'WhatsAppActionLinkCheckPage',
    verifier: 'verify-whatsapp-action-link-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK',
    componentPath: 'src/components/website/whatsappActionLinkCheck/WhatsAppActionLinkCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/whatsappActionLinkReport.ts',
    typesPath: 'src/lib/public-truth-tools/whatsappActionLinkTypes.ts',
  },
  {
    slug: 'whatsapp-reply-pack',
    label: 'WhatsApp Reply Pack',
    key: 'whatsappReplyPack',
    localePage: 'WhatsAppReplyPackPage',
    verifier: 'verify-whatsapp-reply-pack.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_WHATSAPP_REPLY_PACK',
    componentPath: 'src/components/website/whatsappReplyPack/WhatsAppReplyPackPage.tsx',
    reportPath: 'src/lib/public-truth-tools/whatsappReplyPackReport.ts',
    typesPath: 'src/lib/public-truth-tools/whatsappReplyPackTypes.ts',
  },
  {
    slug: 'hours-check',
    label: 'Hours Check',
    key: 'hoursCheck',
    localePage: 'HoursCheckPage',
    verifier: 'verify-hours-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_HOURS_CHECK',
    componentPath: 'src/components/website/hoursCheck/HoursCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/hoursCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/hoursCheckTypes.ts',
  },
  {
    slug: 'photo-gap-check',
    label: 'Photo Gap Check',
    key: 'photoGapCheck',
    localePage: 'PhotoGapCheckPage',
    verifier: 'verify-photo-gap-check.js',
    featureFlag: 'ENABLE_PUBLIC_TRUTH_PHOTO_GAP_CHECK',
    componentPath: 'src/components/website/photoGapCheck/PhotoGapCheckPage.tsx',
    reportPath: 'src/lib/public-truth-tools/photoGapCheckReport.ts',
    typesPath: 'src/lib/public-truth-tools/photoGapCheckTypes.ts',
  },
];

const VERIFIERS = [
  'verify-tools-hub.js',
  'verify-shareable-tool-reports.js',
  'verify-report-leads-boundary.js',
  ...PUBLIC_TOOL_MANIFEST.map((tool) => tool.verifier),
];

const ACTIVE_TOOL_DOC_DIRS = [
  '__docs__/menulist-tools',
  '__docs__/menulist-tools/public-truth-tools',
  '__docs__/menulist-tools/tools-hub',
  '__docs__/menulist-tools/shareable-tool-reports',
  ...PUBLIC_TOOL_MANIFEST.map((tool) => `__docs__/menulist-tools/${tool.slug}`),
];

const CURRENT_DOC_DATE = 'July 4, 2026';

function getActualToolRoutes() {
  const toolsRoot = path.join(ROOT, 'src', 'app', '(website)', 'tools');

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== 'reports')
    .filter((name) => exists(`src/app/(website)/tools/${name}/page.tsx`))
    .sort();
}

function assertPublicToolInventoryBoundary() {
  const manifestSlugs = PUBLIC_TOOL_MANIFEST.map((tool) => tool.slug).sort();
  const actualSlugs = getActualToolRoutes();
  const expectedToolModules = [
    'ownerPublicTruthReadiness.ts',
    'shareableToolReport.ts',
    ...PUBLIC_TOOL_MANIFEST.flatMap((tool) => [
      path.basename(tool.reportPath),
      path.basename(tool.typesPath),
    ]),
  ].sort();
  const actualToolModules = listPublicTruthToolModules();

  assertSameSet(actualSlugs, manifestSlugs, 'Public Truth Tools route inventory');
  assertSameSet(actualToolModules, expectedToolModules, 'Public Truth Tools report/type module inventory');
  assertSameSet(
    PUBLIC_TOOL_MANIFEST.map((tool) => tool.verifier).sort(),
    VERIFIERS.filter((verifier) => verifier.startsWith('verify-') && ![
      'verify-tools-hub.js',
      'verify-shareable-tool-reports.js',
      'verify-report-leads-boundary.js',
    ].includes(verifier)).sort(),
    'Public Truth Tools verifier inventory',
  );

  const packageJson = JSON.parse(read('package.json'));
  const packageScripts = packageJson.scripts || {};
  const features = read('src/config/features.ts');
  const discoveryPolicy = read('src/lib/seo/discoveryPolicy.ts');
  const sitemap = read('public/sitemap.xml');
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');
  const toolsReadme = read('__docs__/menulist-tools/README.md');
  const familyReadme = read('__docs__/menulist-tools/public-truth-tools/README.md');
  const familyImpl = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md');
  const familyFirebase = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md');
  const familyTests = read('__docs__/menulist-tools/public-truth-tools/public-truth-tools_test-cases.md');
  const headerComponent = read('src/components/website/Header.tsx');
  const footerComponent = read('src/components/website/Footer.tsx');
  const websiteCss = read('src/styles/website.css');
  const toolsHubComponent = read('src/components/website/toolsHub/ToolsHubPage.tsx');
  const toolsHubVerifier = read('scripts/verification/verify-tools-hub.js');
  const shareableVerifier = read('scripts/verification/verify-shareable-tool-reports.js');
  const enUS = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
  const hiIN = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));

  assertIncludes(features, 'ENABLE_PUBLIC_TRUTH_TOOLS: true', 'Public Truth Tools family feature flag');
  assertIncludes(familyReadme, 'sixteen public tools', 'Public Truth Tools family count');
  assertIncludes(familyReadme, 'owner fix lists', 'Public Truth Tools owner fix-list boundary');
  assertIncludes(familyImpl, 'buildOwnerPublicTruthSetupJobList', 'Public Truth Tools owner fix-list implementation');
  assertIncludes(familyTests, 'PTT-021', 'Public Truth Tools owner fix-list test boundary');
  assertIncludes(toolsReadme, '16 | Social Bio Link Consistency Check', 'MenuList Tools ranked tool count');

  assertIncludes(headerComponent, '{ href: "/tools", key: "resourceToolsHub", icon: LuWrench }', 'desktop Resources dropdown Tools Hub link');
  assertIncludes(headerComponent, 'resourceDropdownLinks.map', 'shared resource dropdown renderer');
  assertIncludes(headerComponent, 'ws-header-resource-menu__panel', 'desktop resource dropdown panel');
  assertIncludes(headerComponent, 'ws-mobile-resource-links', 'mobile hamburger resource links');
  assertIncludes(headerComponent, 'ws-mobile-resource-link', 'mobile hamburger resource link item');
  assertIncludes(headerComponent, 'resources: isResourcesPath || isToolsPath', 'mobile hamburger opens Resources on tools routes');
  assertIncludes(footerComponent, "{ href: '/tools', key: 'toolsHub' }", 'footer Tools Hub source link');
  assertIncludes(footerComponent, 'sourceLinks.map', 'footer source link renderer');
  assertIncludes(websiteCss, '@media (max-width: 960px)', 'mobile hamburger breakpoint');
  assertIncludes(websiteCss, '.ws-mobile-nav-toggle', 'mobile hamburger toggle style');
  assertIncludes(websiteCss, '.ws-mobile-resource-link', 'mobile resource link style');
  assertIncludes(websiteCss, '.ws-footer-link-grid a', 'footer link mobile touch style');

  for (const docDir of ACTIVE_TOOL_DOC_DIRS) {
    const absoluteDocDir = path.join(ROOT, docDir);
    const docFiles = fs.readdirSync(absoluteDocDir)
      .filter((fileName) => fileName.endsWith('.md'))
      .sort();

    for (const docFile of docFiles) {
      assertIncludes(
        read(`${docDir}/${docFile}`),
        `Last Updated:** ${CURRENT_DOC_DATE}`,
        `${docDir}/${docFile} current documentation date`,
      );
    }
  }

  for (const tool of PUBLIC_TOOL_MANIFEST) {
    const routePath = `/tools/${tool.slug}`;
    const routeFile = `src/app/(website)/tools/${tool.slug}/page.tsx`;
    const docRoot = `__docs__/menulist-tools/${tool.slug}`;
    const packageScript = `verify:${tool.slug}`;
    const packageCommand = `node scripts/verification/${tool.verifier}`;

    for (const file of [
      routeFile,
      tool.componentPath,
      tool.reportPath,
      tool.typesPath,
      `scripts/verification/${tool.verifier}`,
      `${docRoot}/README.md`,
      `${docRoot}/${tool.slug}_spec.md`,
      `${docRoot}/${tool.slug}_impl.md`,
      `${docRoot}/${tool.slug}_marketing.md`,
      `${docRoot}/${tool.slug}_website.md`,
      `${docRoot}/${tool.slug}_helpdoc.md`,
      `${docRoot}/${tool.slug}_firebase.md`,
      `${docRoot}/${tool.slug}_mobile-support.md`,
      `${docRoot}/${tool.slug}_test-cases.md`,
    ]) {
      assert(exists(file), `Public Truth Tools inventory file missing for ${tool.slug}: ${file}`);
    }

    assert(packageScripts[packageScript] === packageCommand, `${packageScript} must run ${packageCommand}`);
    assertIncludes(features, `${tool.featureFlag}: true`, `${tool.slug} feature flag`);
    assertIncludes(features, `${docRoot}/${tool.slug}_impl.md`, `${tool.slug} feature flag doc pointer`);

    const route = read(routeFile);
    assertIncludes(route, `path="${routePath}"`, `${tool.slug} structured data path`);
    assertIncludes(route, 'FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS', `${tool.slug} family feature flag route guard`);
    assertIncludes(route, `FEATURE_FLAGS.${tool.featureFlag}`, `${tool.slug} feature flag route guard`);

    assertIncludes(discoveryPolicy, `path: '${routePath}'`, `${tool.slug} discovery policy`);
    assertIncludes(sitemap, `https://menulist.ai${routePath}`, `${tool.slug} sitemap`);
    assertIncludes(llms, `https://menulist.ai${routePath}`, `${tool.slug} llms.txt`);
    assertIncludes(llmsFull, `https://menulist.ai${routePath}`, `${tool.slug} llms-full.txt`);

    assertIncludes(toolsReadme, `[${tool.slug}](./${tool.slug}/README.md)`, `${tool.slug} MenuList Tools README`);
    assertIncludes(familyReadme, routePath, `${tool.slug} Public Truth Tools README route list`);
    assertIncludes(familyImpl, tool.reportPath.split('/').pop(), `${tool.slug} Public Truth Tools implementation docs`);
    assertIncludes(familyFirebase, `${docRoot}/${tool.slug}_firebase.md`, `${tool.slug} Public Truth Tools Firebase docs`);
    assertIncludes(familyTests, tool.label, `${tool.slug} Public Truth Tools test docs`);

    assertIncludes(toolsHubComponent, `href: '${routePath}'`, `${tool.slug} Tools Hub route`);
    assertIncludes(toolsHubComponent, `key: '${tool.key}'`, `${tool.slug} Tools Hub key`);
    assertIncludes(toolsHubVerifier, routePath, `${tool.slug} Tools Hub verifier route`);
    assertIncludes(toolsHubVerifier, tool.key, `${tool.slug} Tools Hub verifier key`);

    assertIncludes(shareableVerifier, tool.componentPath, `${tool.slug} shareable report source component`);
    assertIncludes(shareableVerifier, `'${tool.slug}'`, `${tool.slug} shareable report tool id`);

    assert(enUS.Website?.[tool.localePage], `en-US ${tool.localePage} locale namespace must exist`);
    assert(hiIN.Website?.[tool.localePage], `hi-IN ${tool.localePage} locale namespace must exist`);
    assert(enUS.Website.ToolsHubPage?.tools?.[tool.key], `en-US Tools Hub ${tool.key} locale card must exist`);
    assert(hiIN.Website.ToolsHubPage?.tools?.[tool.key], `hi-IN Tools Hub ${tool.key} locale card must exist`);
  }

  console.log(`Public Truth Tools inventory verification passed (${PUBLIC_TOOL_MANIFEST.length} public tools)`);
}

assertPublicToolInventoryBoundary();

for (const verifier of VERIFIERS) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'verification', verifier)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('Public Truth Tools verification passed');
