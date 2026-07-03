const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function walkFiles(relPath, extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md'])) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return [];
  const stat = fs.statSync(absPath);
  if (stat.isFile()) return extensions.has(path.extname(absPath)) ? [relPath] : [];

  return fs.readdirSync(absPath, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '_archive' || entry.name.includes('chatgpt-transcript')) return [];
    return walkFiles(path.join(relPath, entry.name), extensions);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNotMatches(content, pattern, label) {
  assert(!pattern.test(content), `${label} must not match ${pattern}`);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

const activePlanFiles = [
  'src/data/PlatformPlansList.ts',
  'src/data/answerlattice/plans.ts',
  'src/lib/billing/productBillingPlans.ts',
].filter(exists);

for (const relPath of activePlanFiles) {
  const content = read(relPath);
  assertNotMatches(content, /\bprice["']?\s*:\s*0\b/i, relPath);
  assertNotMatches(content, /\bplanId["']?\s*:\s*["'][^"']*(free|trial|beta)[^"']*["']/i, relPath);
  assertNotMatches(content, /\bname["']?\s*:\s*["'][^"']*free[^"']*plan[^"']*["']/i, relPath);
}

const answerlatticePlans = read('src/data/answerlattice/plans.ts');
assertNotMatches(answerlatticePlans, /answerlattice_beta/i, 'Answerlattice active plans');
assertIncludes(answerlatticePlans, 'Starter, Growth, Studio only. Active packaging has no zero-price tier.', 'Answerlattice active plans');

const answerlatticeOnboarding = read('src/app/api/answerlattice/onboard/route.ts');
assertIncludes(answerlatticeOnboarding, "default('answerlattice_starter')", 'Answerlattice onboarding default paid plan');
assertIncludes(answerlatticeOnboarding, "Paid plan is required.", 'Answerlattice onboarding paid-plan guard');
assertNotMatches(answerlatticeOnboarding, /answerlattice_beta|getAnswerlatticeBetaPlan|['"]free['"]/i, 'Answerlattice onboarding route');

const answerlatticeForm = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
assertIncludes(answerlatticeForm, "planId: 'answerlattice_starter'", 'Answerlattice public onboarding form');
assertNotMatches(answerlatticeForm, /value=["']free["']|No paid plan/i, 'Answerlattice public onboarding form');

const productBilling = read('src/lib/billing/productBillingPlans.ts');
assertIncludes(productBilling, 'normalized === PRODUCT_IDS.CAMPAIGNCUE', 'CampaignCue billing-disabled boundary');
assertIncludes(productBilling, 'normalized === PRODUCT_IDS.MYCODEX', 'MyCodex billing-disabled boundary');

const publicSurfaceRoots = [
  'src/app/sites/answerlattice',
  'src/app/sites/campaigncue',
  'src/app/sites/mycodex',
  'src/app/sites/neelvara',
  'public/locales/menulist.ai',
  '__docs__/answerlattice/client-onboarding',
  '__docs__/main-website/main-website_content.md',
  '__docs__/main-website/README.md',
  '__docs__/growthos-addon',
  '__docs__/neelvara-main-website/neelvara-main-website_marketing.md',
].filter(exists);

const forbiddenPublicPlanPhrases = [
  /\bfree\s+plan\b/i,
  /\bfree\s+trial\b/i,
  /\bstart\s+free\b/i,
  /\bget\s+started\s+free\b/i,
  /\bno\s+paid\s+plan\b/i,
  /\b6\s+months\s+free\b/i,
  /\bfree-tier\b/i,
  /\bfree\/base\b/i,
];

for (const relPath of publicSurfaceRoots.flatMap((entry) => walkFiles(entry))) {
  const content = read(relPath);
  for (const pattern of forbiddenPublicPlanPhrases) {
    assertNotMatches(content, pattern, relPath);
  }
}

console.log('No free product plans verifier passed');
