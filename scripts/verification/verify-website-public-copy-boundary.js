#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function verifyPricingPublicCopyBoundary() {
  const pricingFaq = read('src/components/website/pricing-pages/PricingFaq.tsx');
  const platformFeatures = read('src/data/PlatformFeaturesList.ts');

  assertIncludes(
    pricingFaq,
    'Approved updates through the public menu and business page refresh paths',
    'Pricing FAQ bounded public-update copy',
  );
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

  const pricingPublicCopy = `${pricingFaq}\n${platformFeatures}`;
  for (const staleClaim of BLOCKED_PRICING_COPY_CLAIMS) {
    assertNotIncludes(pricingPublicCopy, staleClaim, 'Pricing and feature public copy freshness boundary');
  }
}

function verifyDocsBoundary() {
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
  const mainWebsiteMarketing = read('__docs__/main-website/main-website_marketing.md');
  const stage7LaunchOutput = read(
    '__docs__/main-website/website-prep-codex-prompts/stage-07-output-final-launch-polish-production-readiness.md',
  );
  const seoVerification = read('__docs__/menulist-seo-launch/menulist-seo-launch_verification.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

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

verifyPackageScript();
verifyMountedHomepageBoundary();
verifyLocaleAndDiscoveryCopy();
verifyPricingPublicCopyBoundary();
verifyDocsBoundary();

console.log('Website public copy boundary verifier passed.');
