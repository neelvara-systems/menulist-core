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

const { getAnswerlatticePlans } = require('../../src/data/answerlattice/plans');
const { AI_ACTIONS_TYPES } = require('../../src/constants/common');
const { AI_UNIT_COSTS } = require('../../src/constants/AI/unitCosts');
const {
  ANSWERLATTICE_RETENTION_DAYS,
} = require('../../src/data/shared/answerlatticeRetention');
const {
  ANSWERLATTICE_PUBLIC_PAGES,
  ANSWERLATTICE_SITE_TITLE,
} = require('../../src/app/sites/answerlattice/siteConfig');
const {
  ANSWERLATTICE_PUBLIC_CLAIM_GUARDRAILS,
} = require('../../src/content/answerlatticePublic/guardrails');

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
  ANSWERLATTICE_SITE_TITLE === 'AnswerLattice - Governed Support Layer for Founder-Led SaaS',
  'public site title must keep the governed-support category instead of an uptime-style category claim',
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
const onboardingPage = read(`${WEBSITE_ROOT}/get-started/page.tsx`);
const billingPlans = read('src/lib/billing/productBillingPlans.ts');
const structuredData = read(`${WEBSITE_ROOT}/components/StructuredData.tsx`);

assertIncludes(pricing, 'getAnswerlatticePlans', 'public pricing plan source');
assertIncludes(pricing, "plan.billingInterval === 'MONTH'", 'public pricing monthly packaging');
assertIncludes(pricing, 'plan.priceINR.price', 'public pricing INR amount');
assertIncludes(pricing, 'plan.priceUSD.price', 'public pricing USD amount');
assertIncludes(pricing, 'plan.priceINR.monthlyCredits', 'public pricing support-credit amount');
assertIncludes(onboarding, 'getAnswerlatticePlans', 'onboarding plan source');
assertIncludes(onboarding, "plan.billingInterval === 'MONTH'", 'onboarding monthly packaging');
assertIncludes(onboarding, 'ONBOARDING_PLAN_IDS.has(value.plan.id)', 'onboarding response plan admission');
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
assertIncludes(onboarding, '<form style={styles.card} onSubmit={handleCreateAccount}>', 'onboarding semantic details form');
assertIncludes(onboarding, 'event.preventDefault()', 'onboarding form submission boundary');
assertIncludes(onboarding, 'type="submit"', 'onboarding native submit button');
assertIncludes(onboarding, 'id="answerlattice-company-name"', 'onboarding company field label binding');
assertIncludes(onboarding, 'maxLength={120}', 'onboarding bounded company/product fields');
assertIncludes(onboarding, 'maxLength={300}', 'onboarding bounded product URL');
assertIncludes(onboarding, 'maxLength={160}', 'onboarding bounded support email');
assertIncludes(onboarding, 'Choose at least one main product page.', 'onboarding product-surface admission');
assertIncludes(onboarding, '${basePath}/terms-of-service', 'onboarding terms link');
assertIncludes(onboarding, '${basePath}/privacy-policy', 'onboarding privacy link');
assertIncludes(onboarding, 'ANSWERLATTICE_ONBOARD_RESPONSE_JSON_MAX_BYTES', 'onboarding bounded response');
assertIncludes(onboarding, 'normalizeRazorpaySubscriptionCheckoutUrl', 'onboarding checkout URL admission');

const registeredPaths = ANSWERLATTICE_PUBLIC_PAGES.map((page) => page.path);
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

const sitemap = read(`${WEBSITE_ROOT}/sitemap.xml/route.ts`);
const robots = read(`${WEBSITE_ROOT}/robots.txt/route.ts`);
assertIncludes(sitemap, 'ANSWERLATTICE_PUBLIC_PAGES.map', 'sitemap public registry');
assertNotIncludes(sitemap, '<lastmod>', 'sitemap synthetic modified time');
assertNotIncludes(sitemap, 'new Date()', 'sitemap synthetic modified time');
assertIncludes(robots, 'Sitemap: ${ANSWERLATTICE_SITE_URL}/sitemap.xml', 'robots sitemap link');
assertIncludes(robots, 'Disallow: /answerlattice/', 'robots private dashboard boundary');
assertIncludes(robots, 'Disallow: /api/', 'robots private API boundary');

const demo = read(`${WEBSITE_ROOT}/demo/AnswerlatticePublicDemo.tsx`);
assertIncludes(demo, 'const DEMO_STAGES = [', 'deterministic demo stage registry');
assertIncludes(demo, 'Seeded product simulation', 'deterministic demo sample disclosure');
assertIncludes(demo, 'No Firebase or AI provider call is made in this public demo.', 'deterministic demo runtime disclosure');
assertNotIncludes(demo, 'fetch(', 'deterministic demo network path');
assertNotIncludes(demo, '@google/genai', 'deterministic demo model dependency');
assertNotIncludes(demo, 'getFirestore', 'deterministic demo Firebase dependency');

const header = read(`${WEBSITE_ROOT}/components/Header.tsx`);
const footer = read(`${WEBSITE_ROOT}/components/Footer.tsx`);
assertIncludes(header, 'aria-controls="answerlattice-mobile-navigation"', 'mobile drawer trigger relationship');
assertIncludes(header, 'drawerRef.current', 'mobile drawer focus boundary');
assertIncludes(header, "event.key !== 'Tab'", 'mobile drawer focus trap');
assertIncludes(header, 'menuButtonRef.current?.focus()', 'mobile drawer focus restoration');
assertNotIncludes(header, 'onTouchStart={openDrawer}', 'mobile drawer duplicate touch activation');
assertNotIncludes(footer, 'The first 24/7 support layer', 'unsupported public category superlative');
assertIncludes(footer, 'The governed support layer for founder-led SaaS.', 'public footer category');

const contact = read(`${WEBSITE_ROOT}/contact/ContactForm.tsx`);
const contactRoute = read('src/app/api/answerlattice/public/contact/route.ts');
assertIncludes(contact, '<form onSubmit={onSubmit}', 'contact semantic form');
assertIncludes(contact, 'type="tel"', 'contact telephone input');
assertIncludes(contact, 'type="url"', 'contact URL input');
assertIncludes(contact, 'ANSWERLATTICE_CONTACT_RESPONSE_JSON_MAX_BYTES', 'contact bounded response');
assertIncludes(contact, "linkTo('/privacy-policy')", 'contact privacy consent link');
assertIncludes(contact, "linkTo('/terms-of-service')", 'contact terms consent link');
assertIncludes(contactRoute, 'ANSWERLATTICE_PUBLIC_CONTACT_MAX_BODY_BYTES', 'contact bounded request');
assertIncludes(contactRoute, 'ContactRequestSchema', 'contact strict request schema');
assertIncludes(contactRoute, 'verifyTurnstileToken', 'contact abuse verification');
assertIncludes(contactRoute, 'getAnswerlatticeRetentionFields', 'contact retention policy');

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
    === 'node scripts/verification/verify-answerlattice-public-website.js',
  'package must expose the Answerlattice public-website verifier',
);
assertIncludes(
  packageJson.scripts['verify:answerlattice-runtime-truth'],
  'npm run verify:answerlattice-public-website',
  'Answerlattice aggregate runtime verification',
);

process.stdout.write('Answerlattice public website verification passed.\n');
