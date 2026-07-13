#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function extractBlock(content, startNeedle) {
  const start = content.indexOf(startNeedle);
  assert(start !== -1, `Missing block ${startNeedle}`);
  const assignmentStart = content.indexOf('=', start);
  assert(assignmentStart !== -1, `Missing assignment for ${startNeedle}`);
  const bodyStart = content.indexOf('[', assignmentStart);
  assert(bodyStart !== -1, `Missing array start for ${startNeedle}`);

  let depth = 0;
  for (let index = bodyStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(bodyStart, index + 1);
      }
    }
  }

  throw new Error(`Unclosed block ${startNeedle}`);
}

function extractObject(content, startNeedle) {
  const start = content.indexOf(startNeedle);
  assert(start !== -1, `Missing object ${startNeedle}`);
  const bodyStart = content.indexOf('{', start);
  assert(bodyStart !== -1, `Missing object start for ${startNeedle}`);

  let depth = 0;
  for (let index = bodyStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(bodyStart, index + 1);
      }
    }
  }

  throw new Error(`Unclosed object ${startNeedle}`);
}

function extractQuotedValues(content) {
  return Array.from(content.matchAll(/'([^']+)'/g)).map((match) => match[1]);
}

function extractMoreSubScreens(mobileMoreScreen) {
  const typeStart = mobileMoreScreen.indexOf('export type MoreSubScreen =');
  assert(typeStart !== -1, 'MobileMoreScreen must export MoreSubScreen');
  const typeEnd = mobileMoreScreen.indexOf(';', typeStart);
  assert(typeEnd !== -1, 'MoreSubScreen type must end with a semicolon');
  return new Set(extractQuotedValues(mobileMoreScreen.slice(typeStart, typeEnd)));
}

function extractRouteMapTargets(block) {
  return extractQuotedValues(block)
    .filter((value) => !value.startsWith('/'));
}

function verifyMobileShellRouteMap() {
  const mobileShell = read('src/components/mobile/MobileShell.tsx');
  const mobileNavigation = read('src/components/mobile/MobileNavigation.tsx');
  const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const mobileOwnerMenuVerifier = read('scripts/verification/verify-mobile-owner-menu.mjs');
  const packageJson = JSON.parse(read('package.json'));
  const mobileSupportDoc = read('__docs__/mobile-operational-support/mobile-operational-support_mobile-support.md');
  const mobileScreensDoc = read('__docs__/mobile-operational-support/03-mobile-screens-spec.md');
  const mobileArchitectureDoc = read('__docs__/mobile-operational-support/04-mobile-architecture.md');
  const mobileNavigationDoc = read('__docs__/mobile-operational-support/05-mobile-navigation-spec.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelogDoc = read('__docs__/changelog.md');
  const externalCertificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');

  const moreSubScreens = extractMoreSubScreens(mobileMoreScreen);
  const routeMapBlocks = [
    extractObject(mobileShell, 'const OWNER_PATH_TO_MOBILE_ROUTE'),
    extractObject(mobileShell, 'const PLATFORM_PATH_TO_MORE_SCREEN'),
    extractObject(mobileShell, 'const OPS_PATH_TO_MORE_SCREEN'),
    extractObject(mobileShell, 'const RESELLER_PATH_TO_MORE_SCREEN'),
    extractObject(mobileShell, 'const HELP_CENTER_TAB_TO_MORE_SCREEN'),
  ];

  for (const target of routeMapBlocks.flatMap(extractRouteMapTargets)) {
    if (['today', 'menu', 'aiMenuManager', 'share', 'more', 'main', 'dashboard', 'history'].includes(target)) {
      continue;
    }
    assert(moreSubScreens.has(target), `MobileShell route-map target ${target} must be declared in MoreSubScreen`);
  }

  const platformInternalScreens = new Set([
    ...extractQuotedValues(extractBlock(mobileMoreScreen, 'const platformInternalScreens')),
    ...extractQuotedValues(extractBlock(mobileMoreScreen, 'const answerlatticeInternalScreens')),
  ]);
  const explicitSubScreenBranches = new Set(
    Array.from(mobileMoreScreen.matchAll(/subScreen === '([^']+)'/g)).map((match) => match[1]),
  );

  for (const target of routeMapBlocks.flatMap(extractRouteMapTargets)) {
    if (!moreSubScreens.has(target)) continue;
    if (target === 'main') continue;
    assert(
      explicitSubScreenBranches.has(target) || platformInternalScreens.has(target),
      `Mobile More route target ${target} must render an explicit sub-screen or platform wrapped screen`,
    );
  }

  [
    "'/dashboard': MOBILE_ROUTE_DEFAULT",
    "'/today': MOBILE_ROUTE_DEFAULT",
    "'/today/history': { tab: 'today', todayScreen: 'history', moreScreen: 'main' }",
    "'/projects': { tab: 'menu', todayScreen: 'main', moreScreen: 'main' }",
    "'/menu-manager': { tab: 'aiMenuManager', todayScreen: 'main', moreScreen: 'main' }",
    "'/use-menulist': { tab: 'share', todayScreen: 'main', moreScreen: 'main' }",
    "'/qr-code': { tab: 'share', todayScreen: 'main', moreScreen: 'main' }",
    "'/qrCode': { tab: 'share', todayScreen: 'main', moreScreen: 'main' }",
    "'/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' }",
    "'/feedback': { tab: 'more', todayScreen: 'main', moreScreen: 'feedback' }",
    "'/business-settings': { tab: 'more', todayScreen: 'main', moreScreen: 'main' }",
    "'/transactions': { tab: 'more', todayScreen: 'main', moreScreen: 'transactions' }",
    "'/users/permissions': { tab: 'more', todayScreen: 'main', moreScreen: 'roles' }",
    "'/platform/ops-control-room': 'opsControlRoom'",
    "'/ops/messaging-onboarding': 'messagingOnboardingMonitor'",
    "'/reseller/manage': 'resellerManagement'",
  ].forEach((token) => {
    assertIncludes(mobileShell, token, 'MobileShell canonical route map');
  });

  assertIncludes(mobileShell, "if (normalizedPathname.startsWith('/platform/'))", 'MobileShell platform fallback route map');
  assertIncludes(mobileShell, "moreScreen: 'platformHub'", 'MobileShell platform fallback target');
  assertIncludes(mobileShell, "return HELP_CENTER_TAB_TO_MORE_SCREEN[tab] || 'answerlatticeHelp';", 'MobileShell help-center tab fallback');
  assertIncludes(mobileShell, "buildMobileRouteHash(tab: MobileTab, todayScreen: 'main' | 'dashboard' | 'history', moreScreen: MoreSubScreen)", 'MobileShell hash builder must preserve Today dashboard/history and More sub-screen state');
  assertIncludes(mobileShell, "data-mobile-shell-scroll=\"true\"", 'MobileShell must expose the scroll container for owner-mobile QA harnesses');
  assertIncludes(mobileNavigation, 'aria-label="Primary mobile navigation"', 'Mobile navigation landmark label');
  assertIncludes(mobileNavigation, 'role="navigation"', 'Mobile navigation landmark role');
  assertIncludes(mobileNavigation, 'aria-label={tab.title}', 'Mobile navigation accessible tab label');
  assertIncludes(mobileNavigation, 'aria-pressed={isActive}', 'Mobile navigation active tab state');

  [
    'const MOBILE_REQUIRED_NAV_TABS = [',
    "{ key: 'today', label: 'Today' }",
    "{ key: 'menu', label: 'Menu' }",
    "{ key: 'share', label: 'Share' }",
    "{ key: 'more', label: 'More' }",
    'exerciseMobileNavigationTab(',
    'hasPrimaryNavigationLandmark',
    'hasPageOverflow: documentWidth > innerWidth + 1',
    'clippedInteractiveLabels',
    'navTouchTargetsMeetMinimum',
    'target.width >= 44 && target.height >= 44',
  ].forEach((token) => {
    assertIncludes(mobileOwnerMenuVerifier, token, 'Authenticated mobile owner-shell harness coverage');
  });

  assertIncludes(externalCertificationRunbook, 'traverses Today, Menu, Share, and More', 'External certification mobile harness coverage');
  assertIncludes(auditDoc, 'Authenticated mobile owner-shell harness coverage checkpoint', 'Production audit mobile harness coverage');
  assertIncludes(changelogDoc, 'Authenticated Mobile Owner-Shell Harness Coverage', 'Changelog mobile harness coverage');

  assert(
    packageJson.scripts?.['verify:mobile-shell-route-map'] === 'node scripts/verification/verify-mobile-shell-route-map.js',
    'package.json must expose verify:mobile-shell-route-map',
  );

  [
    'Mobile shell route-map source gate: `npm run verify:mobile-shell-route-map`',
    '`/dashboard` and `/today` both enter the Today tab',
    '`/business-health`, `/feedback`, `/billing`, `/transactions`, `/locations`, `/users`, and `/users/permissions` enter More sub-screens',
    '`/platform/*`, `/ops/*`, and `/reseller/*` enter platform, ops, or reseller More sub-screens for eligible roles',
  ].forEach((token) => {
    assertIncludes(mobileSupportDoc, token, 'Mobile support route-map docs');
  });

  [
    '`/dashboard` and `/today` on mobile -> MobileShell -> Today tab',
    '`/business-health`, `/feedback`, `/billing`, `/transactions`, `/locations`, `/users`, and `/users/permissions` on mobile -> MobileShell -> More sub-screen',
    '`/platform/*`, `/ops/*`, and `/reseller/*` on mobile -> MobileShell -> role-gated More sub-screen',
  ].forEach((token) => {
    assertIncludes(mobileArchitectureDoc, token, 'Mobile architecture route-map docs');
  });

  [
    'Source-bounded mobile reference; not current implementation approval or launch certification',
    'Current Release Boundary',
    '`npm run verify:mobile-shell-route-map`',
    'authenticated owner-shell mobile QA',
  ].forEach((token) => {
    assertIncludes(mobileScreensDoc, token, 'Mobile screens spec release-boundary docs');
  });

  [
    'Source-bounded navigation reference; not current implementation approval or launch certification',
    'Current Release Boundary',
    '`npm run verify:mobile-shell-route-map`',
    'authenticated owner-shell mobile QA',
  ].forEach((token) => {
    assertIncludes(mobileNavigationDoc, token, 'Mobile navigation release-boundary docs');
  });

  [
    '| `/dashboard` | DashboardPage | MobileHoursScreen / Today tab | Today |',
    '| `/feedback` | FeedbackPage | MobileFeedbackScreen | More |',
    '| `/platform/*`, `/ops/*`, `/reseller/*` | Internal/partner pages | Role-gated More sub-screens | More |',
  ].forEach((token) => {
    assertIncludes(mobileNavigationDoc, token, 'Mobile navigation route-map docs');
  });

  assert(!mobileScreensDoc.includes('SPEC COMPLETE — Ready for implementation'), 'Mobile screens spec must not present reference doc as ready for implementation');
  assert(!mobileNavigationDoc.includes('SPEC COMPLETE — Ready for implementation'), 'Mobile navigation spec must not present reference doc as ready for implementation');
  assertIncludes(auditDoc, 'Mobile, strategy, and multi-outlet reference-boundary checkpoint', 'Production audit mobile reference-boundary evidence');
  assertIncludes(auditDoc, 'Mobile shell route-map source gate', 'Production audit mobile route-map evidence');
  assertIncludes(auditDoc, 'verify:mobile-shell-route-map', 'Production audit mobile route-map verifier evidence');
}

verifyMobileShellRouteMap();
console.log('Mobile shell route-map verifier passed');
