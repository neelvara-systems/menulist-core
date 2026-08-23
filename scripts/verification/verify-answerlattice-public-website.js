#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEBSITE_ROOT = 'src/app/sites/answerlattice';
const WEBSITE_DOCS_ROOT = '__docs__/answerlattice/answerlattice-website';

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertIncludes = (content, needle, label) => {
  assert(content.includes(needle), `${label} must include ${needle}`);
};
const assertNotIncludes = (content, needle, label) => {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
};

function listFiles(relativeDirectory, pattern) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  const result = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        result.push(path.relative(ROOT, absolutePath).split(path.sep).join('/'));
      }
    }
  }

  walk(absoluteDirectory);
  return result.sort();
}

function publicPagePathToFile(publicPath) {
  return publicPath === '/'
    ? `${WEBSITE_ROOT}/page.tsx`
    : `${WEBSITE_ROOT}${publicPath}/page.tsx`;
}

function publicPageFileToPath(relativeFile) {
  const relativeRouteFile = relativeFile.slice(`${WEBSITE_ROOT}/`.length);
  if (relativeRouteFile === 'page.tsx') return '/';
  return `/${relativeRouteFile.replace(/\/page\.tsx$/, '')}`;
}

const { getAnswerlatticePlans } = require('../../src/data/answerlattice/plans');
const { AI_ACTIONS_TYPES } = require('../../src/constants/common');
const { AI_UNIT_COSTS } = require('../../src/constants/AI/unitCosts');
const {
  ANSWERLATTICE_RETENTION_DAYS,
} = require('../../src/data/shared/answerlatticeRetention');
const {
  ANSWERLATTICE_PUBLIC_PAGES,
  ANSWERLATTICE_SITE_DESCRIPTION,
  ANSWERLATTICE_SITE_TITLE,
} = require('../../src/app/sites/answerlattice/siteConfig');
const {
  ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS,
} = require('../../src/content/answerlatticePublic/guardrails');
const {
  getAnswerlatticeResourceArticle,
} = require('../../src/content/answerlatticePublic/articles');
const {
  ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS,
  buildAnswerlatticeOnboardingProof,
} = require('../../src/lib/answerlattice/onboardingProof');

const monthlyPlans = getAnswerlatticePlans()
  .filter((plan) => plan.billingInterval === 'MONTH')
  .sort((left, right) => left.priceINR.price - right.priceINR.price);

assert(
  JSON.stringify(monthlyPlans.map((plan) => ({
    id: plan.planId,
    inr: plan.priceINR.price,
    usd: plan.priceUSD.price,
    credits: plan.priceINR.monthlyCredits,
  }))) === JSON.stringify([
    { id: 'answerlattice_starter', inr: 99900, usd: 1200, credits: 150 },
    { id: 'answerlattice_growth', inr: 299900, usd: 3600, credits: 500 },
    { id: 'answerlattice_studio', inr: 699900, usd: 8400, credits: 1200 },
  ]),
  'public monthly plan, currency, and credit packaging must match the Answerlattice plan source',
);
assert(
  ANSWERLATTICE_SITE_TITLE === 'AnswerLattice - Reviewed Support Layer for SaaS Products',
  'public site title must keep the reviewed-support category instead of an uptime-style category claim',
);
assert(
  ANSWERLATTICE_SITE_DESCRIPTION ===
    'AnswerLattice turns scattered docs, tickets, releases, screenshots, recordings, notes, and repeated replies into reviewed support knowledge for your widget, help center, FAQs, fallback, and future AI agents.',
  'public site description must explain the scattered-inputs-to-reviewed-support transformation',
);

const expectedAnswerlatticeCreditCosts = new Map([
  [AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH, 0],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_SUPPORT_SEARCH, 1],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_ANSWER_TEST, 1],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_PRODUCT_STARTER_PACK, 1],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_OCR, 1],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_TRANSCRIPTION, 2],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_DRAFT_GENERATION, 0],
  [AI_ACTIONS_TYPES.ANSWERLATTICE_INTAKE_EMBEDDING, 0],
]);
for (const [operation, expectedCost] of expectedAnswerlatticeCreditCosts) {
  assert(
    AI_UNIT_COSTS[operation] === expectedCost,
    `Answerlattice credit operation ${operation} must cost ${expectedCost}; found ${AI_UNIT_COSTS[operation]}`,
  );
}

const pricing = read(`${WEBSITE_ROOT}/pricing/page.tsx`);
const faq = read(`${WEBSITE_ROOT}/faq/page.tsx`);
const pricingArticle = read('src/content/answerlatticePublic/articles.ts');
const onboarding = read(`${WEBSITE_ROOT}/get-started/OnboardingForm.tsx`);
const onboardingProofSource = read('src/lib/answerlattice/onboardingProof.ts');
const starterQuestionsSource = read('src/lib/answerlattice/firstTrustedAnswerStarterQuestions.ts');
const onboardingResponse = read('src/lib/answerlattice/onboardingResponse.ts');
const onboardingPage = read(`${WEBSITE_ROOT}/get-started/page.tsx`);
const billingPlans = read('src/lib/billing/productBillingPlans.ts');
const structuredData = read(`${WEBSITE_ROOT}/components/StructuredData.tsx`);
const footer = read(`${WEBSITE_ROOT}/components/Footer.tsx`);
const developersPage = read(`${WEBSITE_ROOT}/developers/page.tsx`);
const openApiRoute = read(`${WEBSITE_ROOT}/openapi.json/route.ts`);
const installContract = read('src/lib/answerlattice/installContract/contract.ts');
const agentReadiness = read('src/lib/seo/answerlatticeAgentReadiness.ts');
const publicApi = read('src/lib/answerlattice/publicApi.ts');
const themeProvider = read(`${WEBSITE_ROOT}/components/AnswerlatticeThemeProvider.tsx`);
const websiteImpl = read(`${WEBSITE_DOCS_ROOT}/answerlattice-website_impl.md`);
const analytics = read(`${WEBSITE_ROOT}/components/AnswerlatticeAnalytics.tsx`);
const resourceAnalytics = read(`${WEBSITE_ROOT}/components/AnswerlatticeResourceAnalytics.tsx`);
const knowledgeMapWebsiteDoc = read('__docs__/answerlattice/knowledge-map/knowledge-map_website.md');
const operatingGuideRoute = read(`${WEBSITE_ROOT}/resources/answerlattice-operating-guide/page.tsx`);
const founderLaunchKit = read(`${WEBSITE_ROOT}/resources/founder-launch-kit/page.tsx`);
const operatingGuide = getAnswerlatticeResourceArticle('answerlattice-operating-guide');

assertIncludes(structuredData, "'@type': 'ContactPoint'", 'AnswerLattice Organization support contact point');
assertNotIncludes(structuredData, "'@type': 'PostalAddress'", 'AnswerLattice unverified public address boundary');
assertIncludes(footer, '<h2>/{title}</h2>', 'AnswerLattice footer heading hierarchy');
assertIncludes(developersPage, 'disabled by default', 'AnswerLattice developer API rollout gate');
assertIncludes(developersPage, 'href="/openapi.json"', 'AnswerLattice developer OpenAPI link');
assertIncludes(developersPage, 'id="public-api-versioning"', 'AnswerLattice developer versioning policy anchor');
assertIncludes(developersPage, 'No v1 operation is currently deprecated or scheduled for removal.', 'AnswerLattice current deprecation state');
assertIncludes(openApiRoute, "openapi: '3.1.0'", 'AnswerLattice OpenAPI version');
assertIncludes(openApiRoute, "'x-versioning-policy'", 'AnswerLattice OpenAPI versioning policy');
assertIncludes(openApiRoute, 'currentDeprecations: []', 'AnswerLattice OpenAPI current deprecation state');
assertIncludes(openApiRoute, "url: 'https://answerlattice.com/developers#public-api-versioning'", 'AnswerLattice OpenAPI version policy link');
assertIncludes(openApiRoute, "operationId: 'retrieveGovernedAnswer'", 'AnswerLattice OpenAPI answer operation');
assertIncludes(openApiRoute, "operationId: 'listGovernedEntities'", 'AnswerLattice OpenAPI entity operation');
assertIncludes(openApiRoute, "operationId: 'submitGovernanceSignal'", 'AnswerLattice OpenAPI signal operation');
assertIncludes(installContract, '## When to use AnswerLattice', 'AnswerLattice agent when-to-use guidance');
assertIncludes(installContract, '/openapi.json', 'AnswerLattice agent OpenAPI discovery');
assertIncludes(agentReadiness, 'renderAnswerlatticeNotFoundMarkdown', 'AnswerLattice Markdown 404 recovery');
assertIncludes(agentReadiness, 'Accept, Accept-Encoding', 'AnswerLattice Markdown Vary contract');
assertIncludes(publicApi, 'resolution: resolutions[code]', 'AnswerLattice public API resolution hint');

assert(operatingGuide, 'public Operating Guide article must exist');
assert(
  operatingGuide.sections.map((section) => section.title).join('\n').includes('One product, three operating depths'),
  'public Operating Guide must preserve one product with progressive operating guidance',
);
assertIncludes(
  operatingGuide.sections.flatMap((section) => section.body || []).join('\n'),
  'They are not workspace modes, automatic scores, separate products, or required setup stages.',
  'public Operating Guide runtime-mode boundary',
);
assertIncludes(
  operatingGuide.sections.flatMap((section) => section.body || []).join('\n'),
  'A bounded product, support, and engineering group',
  'public Operating Guide bounded larger-company fit',
);
assertIncludes(
  operatingGuideRoute,
  '<AnswerlatticeResourceArticlePage articlePath={articlePath} />',
  'public Operating Guide shared static renderer',
);
assertNotIncludes(operatingGuideRoute, 'fetch(', 'public Operating Guide network dependency');
assertNotIncludes(operatingGuideRoute, 'firebase', 'public Operating Guide Firebase dependency');
assertIncludes(
  founderLaunchKit,
  'href="/resources/answerlattice-operating-guide"',
  'Founder Launch Kit progressive guidance handoff',
);

[
  'readStoredTheme()',
  'window.localStorage.removeItem(ANSWERLATTICE_THEME_STORAGE_KEY)',
  "logAnswerlatticeThemeStorageFailure('read', error)",
  "logAnswerlatticeThemeStorageFailure('remove', error)",
  "logAnswerlatticeThemeStorageFailure('write', error)",
].forEach((token) => assertIncludes(themeProvider, token, 'Answerlattice theme storage boundary'));
assertIncludes(websiteImpl, 'invalid values are evicted', 'Answerlattice theme persistence documentation');
assertIncludes(analytics, 'setPublicWebsiteAnalyticsRuntimeConsent(choice);', 'Answerlattice immediate runtime analytics consent projection');
assertIncludes(analytics, "trackGoogleMarketingEvent(eventName, {", 'Answerlattice consent-gated conversion event helper');
assertIncludes(resourceAnalytics, "trackGoogleMarketingEvent('answerlattice_resource_page_view', payload);", 'Answerlattice consent-gated resource event helper');
assertNotIncludes(analytics, "win.gtag('event'", 'Answerlattice direct conversion event bypass');
assertNotIncludes(resourceAnalytics, "analyticsWindow.gtag('event'", 'Answerlattice direct resource event bypass');
assertNotIncludes(onboarding, "win.gtag('event'", 'Answerlattice direct onboarding event bypass');
assertIncludes(websiteImpl, 'Every custom event rechecks the current product-specific consent choice', 'Answerlattice consent revocation documentation');

assertIncludes(pricing, 'getAnswerlatticePlans', 'public pricing plan source');
assertIncludes(pricing, "plan.billingInterval === 'MONTH'", 'public pricing monthly packaging');
assertIncludes(pricing, 'plan.priceINR.price', 'public pricing INR amount');
assertIncludes(pricing, 'plan.priceUSD.price', 'public pricing USD amount');
assertIncludes(pricing, 'plan.priceINR.monthlyCredits', 'public pricing support-credit amount');
assertIncludes(onboarding, 'getAnswerlatticePlans', 'onboarding plan source');
assertIncludes(onboarding, "plan.billingInterval === 'MONTH'", 'onboarding monthly packaging');
assertIncludes(onboarding, 'normalizeAnswerlatticeOnboardResult(data)', 'onboarding response projection');
assertIncludes(onboardingResponse, "getAnswerlatticePlanById(value.plan.id, 'MONTH')", 'onboarding response current plan admission');
assertIncludes(onboardingResponse, 'value.plan.name !== plan.name', 'onboarding response current plan-name admission');
assertIncludes(onboarding, "interval: 'MONTH'", 'onboarding request interval');
assertIncludes(onboarding, 'currency,', 'onboarding request currency');
assertIncludes(billingPlans, 'getAnswerlatticePlans()', 'Billing plan source');
assertIncludes(structuredData, "getAnswerlatticePlanById('answerlattice_starter', 'MONTH')", 'structured-data plan source');
assertIncludes(structuredData, 'starterPlan.priceINR.price / 100', 'structured-data price conversion');
assertNotIncludes(structuredData, "price: '999'", 'hard-coded structured-data price');
for (const [content, label] of [
  [pricing, 'public pricing'],
  [faq, 'public FAQ'],
  [pricingArticle, 'support-credit resource'],
]) {
  const normalizedContent = content.toLowerCase();
  assertIncludes(normalizedContent, 'provider-backed fallback', `${label} charged fallback wording`);
  assertIncludes(normalizedContent, 'full-runtime answer tests', `${label} charged answer-test wording`);
  assertIncludes(normalizedContent, 'screenshot ocr', `${label} charged OCR wording`);
  assertIncludes(normalizedContent, 'short recording transcription', `${label} charged transcription wording`);
}
assertIncludes(pricing, 'Approved or cached widget answers', 'public pricing zero-credit widget wording');
assertIncludes(pricing, 'deterministic checks', 'public pricing zero-credit deterministic wording');
assertIncludes(pricing, 'draft review', 'public pricing zero-credit review wording');
assertNotIncludes(pricing, 'AI-assisted answers, fallback, review work', 'stale public pricing credit wording');
assertNotIncludes(faq, 'AI-assisted answers, fallback handling, and review work', 'stale FAQ credit wording');
assertIncludes(billingPlans, 'provider fallback answers', 'Billing credit-pack fallback wording');
assertNotIncludes(billingPlans, 'widget chat, intake media, and review credits', 'stale Billing credit-pack wording');

assertIncludes(onboardingPage, 'basePath={basePath}', 'onboarding public alias base path');
assertIncludes(onboardingPage, 'data-answerlattice-activation-primary="workspace-signup"', 'onboarding primary activation marker');
assert(
  onboardingPage.indexOf('<OnboardingForm') < onboardingPage.indexOf('<PageProofStrip'),
  'workspace signup must appear before supporting proof content',
);
assert(
  onboardingPage.indexOf('<OnboardingForm') < onboardingPage.indexOf('CRITERIA.map'),
  'workspace signup must appear before fit criteria',
);
assertIncludes(onboarding, '<form style={styles.card} onSubmit={handlePreviewProof}>', 'onboarding semantic product-details form');
assertIncludes(onboarding, '<form style={styles.card} onSubmit={handleCreateAccount}>', 'onboarding semantic paid workspace form');
assertIncludes(onboarding, 'event.preventDefault()', 'onboarding form submission boundary');
assertIncludes(onboarding, 'type="submit"', 'onboarding native submit button');
assertIncludes(onboarding, 'id="answerlattice-company-name"', 'onboarding company field label binding');
assertIncludes(onboarding, 'maxLength={120}', 'onboarding bounded company/product fields');
assertIncludes(onboarding, 'maxLength={300}', 'onboarding bounded product URL');
assertIncludes(onboarding, 'maxLength={160}', 'onboarding bounded support email');
assertIncludes(onboarding, 'Choose at least one main product page.', 'onboarding product-surface admission');
assertIncludes(onboarding, "type OnboardingStep = 'auth' | 'details' | 'proof' | 'creating' | 'done';", 'onboarding proof-before-creation state');
assertIncludes(onboarding, "trackPlausibleEvent('onboarding_proof_viewed')", 'onboarding privacy-bounded proof analytics');
assertIncludes(onboarding, 'client-only starter preview—not imported knowledge, generated answers, or approved guidance', 'onboarding proof truth boundary');
assertIncludes(onboarding, 'Preview my launch path', 'onboarding preview call to action');
assertIncludes(onboarding, 'Choose {selectedPlan.name} and create workspace', 'onboarding paid creation call to action');
assert(
  onboarding.indexOf('Preview my launch path') < onboarding.indexOf('id="answerlattice-plan"'),
  'onboarding must present the personalized proof before paid plan selection',
);
assertNotIncludes(onboardingProofSource, 'fetch(', 'onboarding proof helper network access');
assertNotIncludes(onboardingProofSource, 'generateContent', 'onboarding proof helper provider call');
assertNotIncludes(onboardingProofSource, 'firebase', 'onboarding proof helper Firebase access');
assertIncludes(starterQuestionsSource, "id: 'starter_getting_started'", 'onboarding proof shared First Trusted Answer source');
assertIncludes(onboarding, '${basePath}/terms-of-service', 'onboarding terms link');
assertIncludes(onboarding, '${basePath}/privacy-policy', 'onboarding privacy link');
assertIncludes(onboarding, 'ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES', 'onboarding bounded response');
assertIncludes(onboardingResponse, 'normalizeRazorpaySubscriptionCheckoutUrl', 'onboarding checkout URL admission');

const onboardingProof = buildAnswerlatticeOnboardingProof({
  companyName: 'Example Company',
  productName: 'Example Product',
  primarySurfaces: ['integrations', 'billing', 'integrations', 'unknown'],
});
assert(onboardingProof.subjectLabel === 'Example Product', 'onboarding proof must prefer the bounded product label');
assert(
  JSON.stringify(onboardingProof.selectedSurfaces) === JSON.stringify([
    { key: 'integrations', label: 'Connected apps' },
    { key: 'billing', label: 'Billing' },
  ]),
  'onboarding proof must preserve admitted surface order while dropping duplicates and unknown values',
);
assert(
  JSON.stringify(onboardingProof.priorityQuestions.map((question) => question.id)) === JSON.stringify([
    'starter_integration_setup',
    'starter_common_error',
    'starter_billing_charge',
    'starter_plan_limits',
  ]),
  'onboarding proof must deterministically prioritize First Trusted Answer checks for selected surfaces',
);
assert(onboardingProof.totalStarterQuestionCount === 10, 'onboarding proof must preserve the First 10 launch contract');
assert(ANSWERLATTICE_ONBOARDING_SURFACE_OPTIONS.length === 6, 'onboarding proof must preserve the six admitted product surfaces');

const registeredPaths = ANSWERLATTICE_PUBLIC_PAGES.map((page) => page.path);
const publicRouteAliases = new Map([
  ['/home', '/'],
  ['/use-cases/vibe-coded-saas', '/use-cases/ai-built-saas'],
]);
assert(
  new Set(registeredPaths).size === registeredPaths.length,
  'Answerlattice public page registry must not contain duplicate paths',
);
for (const publicPath of registeredPaths) {
  for (const privatePrefix of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.privateRoutePrefixes) {
    assert(!publicPath.startsWith(privatePrefix), `public registry must not expose ${publicPath}`);
  }
  assert(exists(publicPagePathToFile(publicPath)), `public route file missing for ${publicPath}`);
}
const publicRouteFiles = listFiles(WEBSITE_ROOT, /^page\.tsx$/);
const discoveredPublicPaths = publicRouteFiles.map(publicPageFileToPath);
for (const publicPath of discoveredPublicPaths) {
  assert(
    registeredPaths.includes(publicPath) || publicRouteAliases.has(publicPath),
    `public route ${publicPath} must be registered or declared as an intentional alias`,
  );
}
for (const [aliasPath, canonicalPath] of publicRouteAliases) {
  assert(discoveredPublicPaths.includes(aliasPath), `public alias route file missing for ${aliasPath}`);
  assert(registeredPaths.includes(canonicalPath), `public alias ${aliasPath} targets unregistered ${canonicalPath}`);
}
assert(
  discoveredPublicPaths.length === registeredPaths.length + publicRouteAliases.size,
  'every Answerlattice page.tsx must be either one canonical public route or one intentional alias',
);

const sitemap = read(`${WEBSITE_ROOT}/sitemap.xml/route.ts`);
const robots = read(`${WEBSITE_ROOT}/robots.txt/route.ts`);
const robotsPolicy = read('src/lib/seo/answerlatticeRobotsPolicy.ts');
const notFound = read(`${WEBSITE_ROOT}/not-found.tsx`);
assertIncludes(sitemap, 'ANSWERLATTICE_PUBLIC_PAGES.map', 'sitemap public registry');
assertNotIncludes(sitemap, '<lastmod>', 'sitemap synthetic modified time');
assertNotIncludes(sitemap, 'new Date()', 'sitemap synthetic modified time');
assertIncludes(
  robots,
  'renderAnswerlatticeRobotsTxt(ANSWERLATTICE_SITE_URL)',
  'robots route policy wiring',
);
assertIncludes(robotsPolicy, 'Sitemap: ${siteUrl}/sitemap.xml', 'robots sitemap link');
assertIncludes(robotsPolicy, "'/answerlattice/'", 'robots private dashboard boundary');
assertIncludes(robotsPolicy, "'/api/'", 'robots private API boundary');
assertIncludes(robotsPolicy, '.map((crawler) => `User-agent: ${crawler}\\nAllow: /\\n${disallowRules}`)', 'named crawler private-path boundaries');
assertIncludes(notFound, "h.get('x-product-base-path')", 'not-found proxy-owned base path');
assertIncludes(notFound, "href={basePath ? `${basePath}/` : '/'}", 'not-found product-local home recovery');
assertNotIncludes(notFound, 'href="/"', 'not-found cross-product root recovery');

const demo = read(`${WEBSITE_ROOT}/demo/AnswerlatticePublicDemo.tsx`);
const supportLoopDemo = read(`${WEBSITE_ROOT}/demo/AnswerlatticeSupportLoopDemo.tsx`);
assertIncludes(demo, 'const DEMO_STAGES = [', 'deterministic demo stage registry');
assertIncludes(demo, 'Seeded product simulation', 'deterministic demo sample disclosure');
assertIncludes(demo, 'No Firebase or AI provider call is made in this public demo.', 'deterministic demo runtime disclosure');
assertNotIncludes(demo, 'fetch(', 'deterministic demo network path');
assertNotIncludes(demo, '@google/genai', 'deterministic demo model dependency');
assertNotIncludes(demo, 'getFirestore', 'deterministic demo Firebase dependency');
assertIncludes(supportLoopDemo, 'const SUPPORT_DEMO_STAGES = [', 'support-loop demo stage registry');
assertIncludes(supportLoopDemo, 'Seeded support simulation', 'support-loop demo sample disclosure');
assertIncludes(supportLoopDemo, 'Known question', 'support-loop known-answer path');
assertIncludes(supportLoopDemo, 'Safe fallback', 'support-loop fallback path');
assertIncludes(supportLoopDemo, 'Founder review', 'support-loop human review path');
assertIncludes(supportLoopDemo, 'Answer Test passed', 'support-loop pre-use test path');
assertIncludes(supportLoopDemo, 'No Firebase or AI provider call is made in this public demo.', 'support-loop demo runtime disclosure');
assertNotIncludes(supportLoopDemo, 'fetch(', 'support-loop demo network path');
assertNotIncludes(supportLoopDemo, '@google/genai', 'support-loop demo model dependency');
assertNotIncludes(supportLoopDemo, 'getFirestore', 'support-loop demo Firebase dependency');

const homepage = read(`${WEBSITE_ROOT}/page.tsx`);
const productPage = read(`${WEBSITE_ROOT}/product/page.tsx`);
const widgetProductPage = read(`${WEBSITE_ROOT}/product/page-aware-widget/page.tsx`);
const supportControlProductPage = read(`${WEBSITE_ROOT}/product/support-control/page.tsx`);
const knowledgeGovernanceProductPage = read(`${WEBSITE_ROOT}/product/knowledge-governance/page.tsx`);
const productFeatures = read(`${WEBSITE_ROOT}/productFeatures.ts`);
const websiteAssets = read(`${WEBSITE_ROOT}/answerlatticeWebsiteAssets.ts`);
const productCapabilityLandingPage = read(`${WEBSITE_ROOT}/components/ProductCapabilityLandingPage.tsx`);
const productFeatureLandingPage = read(`${WEBSITE_ROOT}/components/ProductFeatureLandingPage.tsx`);
const updatesPage = read(`${WEBSITE_ROOT}/updates/page.tsx`);
const websiteStyles = read(`${WEBSITE_ROOT}/styles.css`);
assertIncludes(homepage, 'Scattered product knowledge into structured support', 'homepage whole-product eyebrow');
assertIncludes(
  homepage,
  'Turn scattered product knowledge into reviewed support for your widget, help center, docs, search, and AI-assisted surfaces.',
  'homepage buyer-facing transformation',
);
assertIncludes(
  homepage,
  'Approved answers come first; missing coverage becomes visible review work.',
  'homepage approved-answer and missing-coverage boundary',
);
assertNotIncludes(
  homepage,
  'AnswerLattice turns scattered docs, tickets, release notes, screenshots, recordings, owner notes, and repeated replies',
  'homepage retired long-form source inventory',
);
for (const surface of [
  'In-app widget',
  'Hosted help center',
  'Docs and FAQs',
  'Changelog',
  'Ticket fallback',
  'Feedback review',
  'Approved answers',
]) {
  assertIncludes(homepage, `'${surface}'`, `homepage ${surface} surface`);
}
assertIncludes(homepage, 'Run deterministic checks', 'homepage deterministic Answer Test boundary');
assertNotIncludes(homepage, 'Run free checks first', 'homepage unsupported free-tier implication');
assertIncludes(homepage, 'Answer what is known. Catch what is missing. Improve it once.', 'homepage support-loop focus');
assertIncludes(homepage, 'Why this answer is trusted', 'homepage trusted-answer proof');
assertIncludes(homepage, '<FounderReviewSection basePath={basePath} />', 'homepage active owner-decision section');
assertIncludes(homepage, 'id="owner-decision-system"', 'homepage owner-decision anchor');
assertIncludes(homepage, 'Review the support decisions that actually need you.', 'homepage founder-review promise');
assertIncludes(homepage, 'ANSWERLATTICE_OWNER_DECISION_ASSET', 'homepage owner-decision proof asset');
assertIncludes(homepage, 'assetSlotId="home.owner-decision-system"', 'homepage owner-decision AssetOS slot');
assertIncludes(homepage, 'Help readers scan long guides', 'homepage public article-navigation outcome');
assertIncludes(homepage, 'They never publish answers, activate releases, or create a second task system.', 'homepage owner-decision mutation boundary');

const heroMotionEnd = websiteStyles.indexOf('.al-site-footer {');
const heroMotionStart = websiteStyles.lastIndexOf('.al-home-hero-title__word {', heroMotionEnd);
const heroKeyframesStart = websiteStyles.indexOf('@keyframes al-hero-word-reveal {');
const heroKeyframesEnd = websiteStyles.indexOf('@keyframes al-map-pulse-flow {', heroKeyframesStart);
assert(heroMotionStart >= 0 && heroMotionEnd > heroMotionStart, 'homepage hero motion styles must remain discoverable');
assert(heroKeyframesStart >= 0 && heroKeyframesEnd > heroKeyframesStart, 'homepage hero keyframes must remain discoverable');
const heroMotionStyles = websiteStyles.slice(heroMotionStart, heroMotionEnd);
const heroKeyframeStyles = websiteStyles.slice(heroKeyframesStart, heroKeyframesEnd);
assertIncludes(heroMotionStyles, 'animation: al-hero-word-reveal 360ms', 'homepage title motion duration');
assertIncludes(heroMotionStyles, 'animation: al-hero-block-reveal 360ms', 'homepage content motion duration');
assertIncludes(heroMotionStyles, 'animation-delay: 40ms;', 'homepage subtitle motion timing');
assertIncludes(heroMotionStyles, 'animation-duration: 520ms;', 'homepage media motion duration');
assertIncludes(heroMotionStyles, 'animation-delay: 160ms;', 'homepage media motion timing');
assertNotIncludes(heroMotionStyles, 'filter: blur(', 'homepage first-fold motion');
assertNotIncludes(heroKeyframeStyles, 'filter: blur(', 'homepage first-fold keyframes');
assertNotIncludes(heroMotionStyles, 'animation-delay: 760ms;', 'homepage delayed subtitle motion');
assertNotIncludes(heroMotionStyles, 'animation-delay: 1260ms;', 'homepage delayed proof motion');
assertIncludes(
    homepage,
    'Deferred homepage sections retained for one-line reactivation.',
    'homepage deferred section retention marker',
);
assertIncludes(
    homepage,
    '* <SupportSuiteSection basePath={basePath} />',
    'homepage commented support-suite mount',
);
assertIncludes(homepage, '* <SupportSurfaceStorySection />', 'homepage commented support-surface mount');
assertIncludes(
    homepage,
    '* <ProductOverviewSection basePath={basePath} />',
    'homepage commented product-overview mount',
);
const homepageWithoutJsxBlockComments = homepage.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
assertNotIncludes(
    homepageWithoutJsxBlockComments,
    '<SupportSuiteSection basePath={basePath} />',
    'homepage active support-suite mount',
);
assertNotIncludes(
    homepageWithoutJsxBlockComments,
    '<SupportSurfaceStorySection />',
    'homepage active support-surface mount',
);
assertNotIncludes(
    homepageWithoutJsxBlockComments,
    '<ProductOverviewSection basePath={basePath} />',
    'homepage active product-overview mount',
);
assertNotIncludes(productPage, 'Everything your SaaS needs', 'product hero broad inventory headline');
for (const capability of [
  'Start with a daily support brief',
  'Inspect the Knowledge Map',
  'Prioritize friction with evidence',
  'Review release impact',
  'Run saved Answer Tests',
]) {
  assertIncludes(productPage, capability, `product owner-decision capability ${capability}`);
}
assertIncludes(productPage, 'Provider-backed fallback cannot certify critical proof.', 'product critical-proof boundary');
assertIncludes(supportControlProductPage, 'clear quiet state when the evidence needs no action', 'Support Control focused quiet state');
assertIncludes(supportControlProductPage, 'safe published headings', 'Support Control public topic-map boundary');
assertIncludes(knowledgeGovernanceProductPage, 'One product model, several owner decisions.', 'Knowledge Governance connected model');
assertIncludes(knowledgeGovernanceProductPage, 'ANSWERLATTICE_KNOWLEDGE_MAP_ASSET', 'Knowledge Governance curated map proof');
assertIncludes(knowledgeGovernanceProductPage, 'heroAssetSlotId="product.knowledge-map"', 'Knowledge Governance map AssetOS slot');
assertIncludes(knowledgeGovernanceProductPage, 'ANSWERLATTICE_RELEASE_ASSURANCE_ASSET', 'Knowledge Governance release assurance proof');
assertIncludes(knowledgeGovernanceProductPage, 'workflowAssetSlotId="product.release-assurance"', 'Knowledge Governance release assurance AssetOS slot');
assertIncludes(knowledgeGovernanceProductPage, 'Knowledge Map helps owners make a decision; it is not a raw graph or diagram editor.', 'Knowledge Map raw-graph boundary');
assertIncludes(knowledgeGovernanceProductPage, 'No map, metric, test, or impact preview changes official support automatically.', 'Knowledge Governance mutation boundary');
assertIncludes(productFeatures, 'Help readers navigate long articles', 'Knowledge Base topic-map capability');
assertIncludes(websiteAssets, "'knowledge-base': ANSWERLATTICE_ARTICLE_TOPIC_MAP_ASSET", 'Knowledge Base public topic-map proof');
assertIncludes(productFeatureLandingPage, "'knowledge-base': 'product.article-topic-map'", 'Knowledge Base topic-map AssetOS slot');
assertIncludes(productCapabilityLandingPage, 'assetRole="product-area-workflow-proof"', 'product capability workflow proof mounting');
assertIncludes(productFeatures, 'Reject stale previews', 'Changelog stale-impact boundary');
assertIncludes(faq, 'a clear quiet state when the available evidence needs no action', 'FAQ focused Daily Brief truth');
assertIncludes(faq, 'does not expose a raw graph or become a diagram editor', 'FAQ Knowledge Map boundary');
assertIncludes(faq, 'Private relationship, source, approved-answer, ticket, and review records do not enter the public payload.', 'FAQ public topic-map boundary');
assertNotIncludes(faq, 'Knowledge Intake review counts', 'stale Daily Brief intake-count claim');
assertIncludes(updatesPage, 'Owner decisions now keep their product context', 'public owner-decision update');
assertIncludes(updatesPage, 'validated product-area context into governed answer review', 'public Knowledge Map handoff boundary');
assertNotIncludes(updatesPage, 'exact validated answer context', 'unsupported public answer-specific handoff');
assertNotIncludes(updatesPage, 'Daily Founder Brief', 'retired public Daily Brief label');
assertIncludes(knowledgeMapWebsiteDoc, 'validated product-area context into governed answer review', 'Knowledge Map website handoff contract');
assertIncludes(widgetProductPage, 'Opt-in guided resolution', 'widget bounded guided-resolution copy');
assertIncludes(widgetProductPage, 'AnswerLattice does not click controls or change product data.', 'widget guided-resolution action boundary');
assertIncludes(websiteStyles, '.al-page-flow > section.al-page-hero', 'mobile structured-data hero spacing boundary');
for (const assetPath of [
  'public/answerlattice-owner-decision-system.webp',
  'public/answerlattice-knowledge-map.webp',
  'public/answerlattice-release-assurance.webp',
  'public/answerlattice-article-topic-map.webp',
]) {
  assert(exists(assetPath), `Answerlattice governed proof asset must exist: ${assetPath}`);
}

const header = read(`${WEBSITE_ROOT}/components/Header.tsx`);
assertIncludes(header, 'aria-controls="answerlattice-mobile-navigation"', 'mobile drawer trigger relationship');
assertIncludes(header, 'drawerRef.current', 'mobile drawer focus boundary');
assertIncludes(header, "event.key !== 'Tab'", 'mobile drawer focus trap');
assertIncludes(header, 'menuButtonRef.current?.focus()', 'mobile drawer focus restoration');
assertIncludes(header, 'const shouldCloseMobileNavigation = hasMounted && !isMobile;', 'mobile navigation desktop-resize close boundary');
assertNotIncludes(header, 'shouldShowMobileNavigation', 'mobile navigation hydration-gated trigger');
assertIncludes(header, 'xl:!hidden', 'mobile navigation desktop visibility boundary');
assertIncludes(header, 'if (!isDrawerMounted) return undefined;', 'mobile drawer scoped body scroll lock');
assertIncludes(header, 'const originalOverflow = document.body.style.overflow;', 'mobile drawer previous body scroll state capture');
assertIncludes(header, 'document.body.style.overflow = originalOverflow;', 'mobile drawer previous body scroll state restoration');
assertNotIncludes(header, "document.body.style.overflow = isDrawerMounted ? 'hidden' : '';", 'mobile drawer closed-state scroll overwrite');
assertNotIncludes(header, 'onTouchStart={openDrawer}', 'mobile drawer duplicate touch activation');
assertIncludes(
  header,
  "{ label: 'Operating Guide', href: '/resources/answerlattice-operating-guide', icon: LuBookOpen }",
  'desktop Operating Guide navigation',
);
assertIncludes(
  header,
  "{ label: 'Operating Guide', href: '/resources/answerlattice-operating-guide' }",
  'mobile Operating Guide navigation',
);
assertNotIncludes(footer, 'The first 24/7 support layer', 'unsupported public category superlative');
assertIncludes(footer, 'A reviewed support layer for founder-led SaaS.', 'public footer category');
assertIncludes(footer, '/resources/answerlattice-operating-guide', 'footer Operating Guide navigation');

const contact = read(`${WEBSITE_ROOT}/contact/ContactForm.tsx`);
const contactRoute = read('src/app/api/answerlattice/public/contact/route.ts');
assertIncludes(contact, '<form onSubmit={onSubmit}', 'contact semantic form');
assertIncludes(contact, 'type="tel"', 'contact telephone input');
assertIncludes(contact, 'type="url"', 'contact URL input');
assertIncludes(contact, 'ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES', 'contact bounded response');
assertIncludes(contact, "linkTo('/privacy-policy')", 'contact privacy consent link');
assertIncludes(contact, "linkTo('/terms-of-service')", 'contact terms consent link');
assertIncludes(contactRoute, 'ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES', 'contact bounded request');
assertIncludes(contactRoute, 'AnswerlatticePublicContactRequestSchema', 'contact strict normalized request schema');
assertIncludes(contactRoute, 'failClosed: true', 'contact limiter provider outage fail-closed policy');
assertIncludes(contactRoute, 'verifyTurnstileToken', 'contact abuse verification');
assertIncludes(contactRoute, 'getAnswerlatticeRetentionFields', 'contact retention policy');
assertIncludes(contactRoute, "'Cache-Control': 'no-store'", 'contact response no-store policy');
assertIncludes(contactRoute, "'X-Content-Type-Options': 'nosniff'", 'contact response nosniff policy');
assertIncludes(contactRoute, 'return contactJson({ accepted: true });', 'contact success response boundary');
assertNotIncludes(contactRoute, 'return NextResponse.json(', 'contact response boundary bypass');

const trust = read(`${WEBSITE_ROOT}/trust/page.tsx`);
const privacy = read(`${WEBSITE_ROOT}/privacy-policy/page.tsx`);
const terms = read(`${WEBSITE_ROOT}/terms-of-service/page.tsx`);
assertIncludes(trust, 'No public certification claim', 'trust certification boundary');
assertIncludes(trust, 'No public residency promise', 'trust residency boundary');
assertIncludes(trust, 'not a contractual subprocessor schedule', 'trust provider-map boundary');
assertIncludes(trust, 'No public no-training or zero-retention claim', 'trust AI-provider data-use boundary');
for (const retentionKey of [
  'queryEmbeddings',
  'aiSearchHistory',
  'notificationLogs',
  'ownerNotificationRateLimits',
  'contactEnquiries',
  'signalEvents',
]) {
  assert(Number.isInteger(ANSWERLATTICE_RETENTION_DAYS[retentionKey]), `retention source missing ${retentionKey}`);
  assertIncludes(trust, `ANSWERLATTICE_RETENTION_DAYS.${retentionKey}`, `trust retention source ${retentionKey}`);
  assertIncludes(privacy, `ANSWERLATTICE_RETENTION_DAYS.${retentionKey}`, `privacy retention source ${retentionKey}`);
}
assertIncludes(privacy, 'AnswerLattice does not sell customer support content or widget conversation data.', 'privacy data-sale boundary');
assertIncludes(privacy, 'Optional Plausible and Google Analytics', 'privacy analytics consent disclosure');
assertIncludes(privacy, 'does not make a public no-training or zero-data-retention promise', 'privacy AI-provider data-use boundary');
assertIncludes(terms, 'AnswerLattice is operated by Neelvara Systems', 'terms operating-entity relationship');
assertIncludes(terms, 'Drafts are not final support guidance until a workspace owner reviews and approves them.', 'terms approval boundary');
assertIncludes(terms, 'You keep ownership of the support content you provide.', 'terms customer-content ownership boundary');
assertIncludes(terms, 'After provider cancellation succeeds, recorded access remains active until the current cycle end.', 'terms cancellation lifecycle');
assertIncludes(terms, 'does not currently promise a one-click full-workspace deletion flow', 'terms deletion boundary');
assertIncludes(terms, 'governing law, jurisdiction, negotiated warranties, liability limits, service levels', 'terms legal-completion boundary');
assertIncludes(terms, 'contact hello@answerlattice.com', 'terms contact path');

const publicClaimFiles = [
  ...listFiles(WEBSITE_ROOT, /\.(ts|tsx)$/),
  ...listFiles('src/content/answerlatticePublic', /\.(ts|tsx)$/)
    .filter((file) => !file.endsWith('/guardrails.ts')),
  'src/lib/answerlattice/installContract/contract.ts',
  'src/app/widget/v1/answerlattice-widget.js/route.ts',
].filter(exists);
const publicClaimSource = publicClaimFiles.map(read).join('\n');
const publicClaimCopy = publicClaimSource.toLowerCase();
const answerlatticeManifest = JSON.parse(read('public/answerlattice.webmanifest'));
assert(answerlatticeManifest.start_url === '/', 'AnswerLattice manifest start_url must remain same-origin across preview and production domains');
assert(answerlatticeManifest.scope === '/', 'AnswerLattice manifest scope must remain same-origin across preview and production domains');
assert(!/\bCanonica\b/.test(publicClaimSource), 'public copy must not use Canonica as a standalone brand');
for (const phrase of ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS.forbiddenPhrases.filter((value) => value !== 'Canonica')) {
  assertNotIncludes(publicClaimCopy, phrase.toLowerCase(), `public forbidden claim ${phrase}`);
}

const requiredDocs = [
  'README.md',
  'answerlattice-website_spec.md',
  'answerlattice-website_impl.md',
  'answerlattice-website_marketing.md',
  'answerlattice-website_website.md',
  'answerlattice-website_helpdoc.md',
  'answerlattice-website_firebase.md',
  'answerlattice-website_mobile-support.md',
  'answerlattice-website_test-cases.md',
];
for (const doc of requiredDocs) {
  assert(exists(`${WEBSITE_DOCS_ROOT}/${doc}`), `Answerlattice website dossier missing ${doc}`);
}

const packageJson = JSON.parse(read('package.json'));
assert(
  packageJson.scripts['verify:answerlattice-public-website']
    === 'node scripts/verification/verify-answerlattice-public-website.js && npm run test:answerlattice-agent-readiness && npm run test:answerlattice-public-resource-boundary && npm run test:answerlattice-public-roi-calculator && npm run test:answerlattice-public-contact-contracts && npm run test:answerlattice-robots-policy',
  'package must expose the Answerlattice public-website verifier',
);
assert(
  packageJson.scripts['test:answerlattice-agent-readiness']
    === 'ts-node --compiler-options \'{"module":"CommonJS","target":"ES2022"}\' -r tsconfig-paths/register scripts/verification/test-answerlattice-agent-readiness.ts',
  'package must expose the AnswerLattice agent-readiness regression test',
);
assert(
  packageJson.scripts['test:answerlattice-public-resource-boundary']
    === 'ts-node --compiler-options \'{"module":"CommonJS","target":"ES2022"}\' -r tsconfig-paths/register scripts/verification/test-answerlattice-public-resource-boundary.ts',
  'package must expose the Answerlattice public-resource boundary regression test',
);
assert(
  packageJson.scripts['test:answerlattice-public-roi-calculator']
    === 'ts-node --compiler-options \'{"module":"CommonJS","target":"ES2022","jsx":"react-jsx"}\' -r tsconfig-paths/register scripts/verification/test-answerlattice-public-roi-calculator.ts',
  'package must expose the Answerlattice public ROI calculator regression test',
);
assert(
  packageJson.scripts['test:answerlattice-robots-policy']
    === "ts-node --compiler-options '{\"module\":\"CommonJS\"}' -r tsconfig-paths/register scripts/verification/test-answerlattice-robots-policy.ts",
  'Answerlattice robots runtime policy test must remain registered',
);
assert(
  packageJson.scripts['test:answerlattice-public-contact-contracts']
    === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/test-answerlattice-public-contact-contracts.ts',
  'package must expose the Answerlattice public-contact contract regression test',
);
assertIncludes(
  packageJson.scripts['verify:answerlattice-runtime-truth'],
  'npm run verify:answerlattice-public-website',
  'Answerlattice aggregate runtime verification',
);

process.stdout.write('Answerlattice public website verification passed.\n');
