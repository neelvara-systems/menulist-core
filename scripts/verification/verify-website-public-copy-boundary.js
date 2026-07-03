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

  for (const filename of localeFiles) {
    const data = JSON.parse(read(path.join(WEBSITE_LOCALE_DIR, filename)));
    walkStrings(data.Website || {}, (keyPath, value) => {
      for (const { label, pattern } of BLOCKED_PUBLIC_CLAIMS) {
        if (pattern.test(value)) {
          blockedHits.push(`${filename}:Website.${keyPath}:${label}`);
        }
      }
    });
  }

  assert(blockedHits.length === 0, `Website locale namespace blocked-copy hits:\n${blockedHits.join('\n')}`);

  assertNoBlockedClaims('public/llms.txt', read('public/llms.txt'));
  assertNoBlockedClaims('public/llms-full.txt', read('public/llms-full.txt'));
}

function verifyDocsBoundary() {
  const mainWebsiteReadme = read('__docs__/main-website/README.md');
  const mainWebsiteContent = read('__docs__/main-website/main-website_content.md');
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
}

verifyPackageScript();
verifyMountedHomepageBoundary();
verifyLocaleAndDiscoveryCopy();
verifyDocsBoundary();

console.log('Website public copy boundary verifier passed.');
