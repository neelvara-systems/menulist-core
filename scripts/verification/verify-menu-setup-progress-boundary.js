#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');

const root = process.cwd();

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function hasSingleFieldExemption(indexConfig, collectionGroup, fieldPath) {
  return indexConfig.fieldOverrides?.some((entry) => (
    entry.collectionGroup === collectionGroup
    && entry.fieldPath === fieldPath
    && Array.isArray(entry.indexes)
    && entry.indexes.length === 0
  ));
}

function assertIncludes(relativePath, expected, label = expected) {
  const content = read(relativePath);
  if (!content.includes(expected)) {
    throw new Error(`${relativePath} missing ${label}`);
  }
}

function assertNotIncludes(relativePath, unexpected, label = unexpected) {
  const content = read(relativePath);
  if (content.includes(unexpected)) {
    throw new Error(`${relativePath} contains disallowed ${label}`);
  }
}

function assertNotExists(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`Menu Setup Progress must not add backend/runtime artifact: ${relativePath}`);
  }
}

const docs = [
  '__docs__/menu-setup-progress/README.md',
  '__docs__/menu-setup-progress/menu-setup-progress_spec.md',
  '__docs__/menu-setup-progress/menu-setup-progress_impl.md',
  '__docs__/menu-setup-progress/menu-setup-progress_firebase.md',
  '__docs__/menu-setup-progress/menu-setup-progress_mobile-support.md',
  '__docs__/menu-setup-progress/menu-setup-progress_marketing.md',
  '__docs__/menu-setup-progress/menu-setup-progress_website.md',
  '__docs__/menu-setup-progress/menu-setup-progress_helpdoc.md',
  '__docs__/menu-setup-progress/menu-setup-progress_test-cases.md',
];

docs.forEach(read);
docs.forEach((docPath) => assertIncludes(docPath, 'Local source complete', 'local source status'));

assertIncludes('src/config/features.ts', 'ENABLE_MENU_SETUP_PROGRESS');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'buildMenuSetupProgress');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'lastPublishedAt');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'buildStarterActivationSummary');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'normalizeStarterActivationTimestamp');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'const hasProjectSource = hasText(project?.projectId);', 'loaded project source boundary');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'const files = Array.isArray(project?.files) ? project.files : [];', 'malformed project files boundary');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', '!starterActivation.appliesToStarterActivation', 'non-starter placement compatibility');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', '|| starterActivation.activated', 'starter activation target contract');
assertNotIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'starterActivation.signalCount > 0', 'single-signal starter completion fallback');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', "id: 'translations_ready'", 'conditional translations progress step');
assertIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', "translationSignals.length > 0", 'translation step only when language signals exist');
assertNotIncludes('src/lib/menuSetupProgress/buildMenuSetupProgress.ts', 'activeCategories.length > 0', 'category-only import completion');
assertIncludes('src/components/templates/main-app/dashboard/MenuSetupProgress.tsx', 'Menu setup');
assertIncludes('src/components/mobile/components/MenuSetupProgress.tsx', 'Menu setup');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'MenuSetupProgress');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'ownerDashboardProjectSetup');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'owner_dashboard_project_setup_load_failed', 'dashboard missing-project guard');
assertIncludes('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx', 'projectData={dashboardProjectForChildren}', 'shared project data passed to Menu Check');
assertIncludes('src/components/templates/main-app/dashboard/MenuQualitySignals.tsx', 'projectData?:', 'optional shared project prop');
assertIncludes('src/components/mobile/screens/MobileMenuScreen.tsx', 'MobileMenuSetupProgress');
assertIncludes('src/components/mobile/screens/MobileShareScreen.tsx', 'MobileMenuSetupProgress');
assertIncludes('src/components/mobile/MobileShell.tsx', 'onOpenOfficialPage');
assertIncludes('src/components/mobile/MobileShell.tsx', "'main',", 'More root selected-project provider cache');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'buildMenuSetupProgress', 'More shortcut uses shared setup computation');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'if (projectsLoading) return null;', 'More shortcut waits for project truth');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', "key: 'menuSetup'", 'More shortcut item');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'onOpenMenuTab?.()', 'More shortcut menu shell callback');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', 'onOpenShareTab?.()', 'More shortcut share shell callback');
assertIncludes('src/components/mobile/screens/MobileMoreScreen.tsx', "openOfficialPage('main')", 'More shortcut official page shell callback');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_spec.md', 'active extracted items exist', 'menu imported item-only contract');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_spec.md', 'Translations ready', 'translations optional contract');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_test-cases.md', 'categories exist but zero active items', 'category-only test case');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_test-cases.md', 'Mobile More root while setup is incomplete', 'More shortcut test case');
assertIncludes('__docs__/menu-setup-progress/menu-setup-progress_test-cases.md', 'exactly one recorded placement action', 'single-action starter test case');
assertIncludes('FEATURE_SWEEP_MASTER_INVENTORY.md', 'Menu Setup Progress and Activation Concierge Boundary', 'feature inventory boundary');
assertIncludes('FEATURE_SWEEP_MASTER_REPORT.md', 'Menu Setup Progress and Activation Concierge Boundary', 'feature report boundary');
assertIncludes('__docs__/audits/menulist-production-readiness-audit.md', 'Menu Setup Progress and Activation Concierge Boundary', 'production audit boundary');
assertIncludes('__docs__/changelog.md', 'Menu Setup Progress and Activation Concierge Boundary', 'changelog boundary');
assertIncludes('__docs__/audits/menulist-feature-flow-audit-tracker.md', '| 24 | Menu setup progress and activation concierge | Medium | Local source complete |', 'strict item 24 completion');
assertIncludes('__docs__/audits/menulist-feature-flow-audit-tracker.md', '| 25 | Menu presence and public-truth monitoring | Medium | Local source complete |', 'strict item 25 completion');

const firestoreIndexes = readJson('firestore.indexes.json');
assert.equal(
  hasSingleFieldExemption(firestoreIndexes, 'stores', 'starterActivationSignals'),
  true,
  'starter activation evidence must not pay automatic nested-map index fanout',
);

require('ts-node').register({
  compilerOptions: { module: 'CommonJS', target: 'ES2022' },
  transpileOnly: true,
});
require('tsconfig-paths/register');

const { buildMenuSetupProgress } = require('../../src/lib/menuSetupProgress/buildMenuSetupProgress');
const {
  STARTER_ACTIVATION_SIGNALS,
  applyStarterActivationSignalToStoreDetails,
  applyStarterPresenceUpdateToStoreDetails,
  buildStarterActivationSummary,
  getStarterActivationSignalCount,
  hasStarterWorkspaceAccess,
  isStarterActivationExpired,
  isStarterPublicSurfaceExpired,
  normalizeStarterActivationTimestamp,
  shouldShowStarterPublicPlaceholders,
} = require('../../src/lib/onboarding/starterActivation');

const projectWithPublishedMenu = {
  projectId: 'menu-setup-progress-test',
  lastPublishedAt: '2026-07-15T00:00:00.000Z',
  files: [{
    uid: 'menu-file',
    extractedData: {
      data: {
        categories: [],
        items: [{ id: 'item-1', active: true, name: { en: 'Tea' }, price: '100' }],
        languages: [],
      },
    },
  }],
};

function buildProgress({ published = true, starter = true, signals = [] } = {}) {
  const actions = Object.fromEntries(signals.map((signal) => [signal, '2026-07-15T00:00:00.000Z']));
  return buildMenuSetupProgress({
    project: published ? projectWithPublishedMenu : { ...projectWithPublishedMenu, lastPublishedAt: undefined },
    qualitySignals: [],
    storeDetails: {
      ...(starter ? { onboardingSource: 'PUBLIC_MENU_ENTRY' } : {}),
      ...(signals.length ? { starterActivationSignals: { actions } } : {}),
    },
  });
}

function linkPlacementStep(summary) {
  const step = summary.requiredSteps.find(({ id }) => id === 'link_placed');
  assert.ok(step, 'link placement step must exist');
  return step;
}

const starterWithNoSignals = buildProgress();
assert.equal(linkPlacementStep(starterWithNoSignals).done, false, 'starter with no placement actions must remain incomplete');

const starterWithOneSignal = buildProgress({ signals: ['menu_link_copied'] });
assert.equal(linkPlacementStep(starterWithOneSignal).done, false, 'one starter placement action must not meet the two-action target');
assert.equal(starterWithOneSignal.phase, 'place', 'one starter placement action must keep setup in the placement phase');
assert.match(linkPlacementStep(starterWithOneSignal).description, /1 of 2/, 'one starter placement action must show truthful progress');

const starterWithTwoSignals = buildProgress({ signals: ['menu_link_copied', 'qr_downloaded'] });
assert.equal(linkPlacementStep(starterWithTwoSignals).done, true, 'two distinct starter placement actions must meet the target');
assert.equal(starterWithTwoSignals.shouldShow, false, 'optional improvements must not keep completed required setup visible');
assert.equal(starterWithTwoSignals.nextStep, undefined, 'completed required setup must not promote an optional step as required next action');

const unpublishedStarter = buildProgress({ published: false, signals: ['menu_link_copied', 'qr_downloaded'] });
assert.equal(linkPlacementStep(unpublishedStarter).done, false, 'placement must remain blocked until the menu is published');

const publishedNonStarter = buildProgress({ starter: false });
assert.equal(linkPlacementStep(publishedNonStarter).done, true, 'published non-starter flow must preserve Link ready completion');

const nonStarterWithLegacySignal = buildProgress({ starter: false, signals: ['menu_link_copied'] });
assert.equal(linkPlacementStep(nonStarterWithLegacySignal).done, true, 'non-starter legacy signal state must remain compatible');

const starterWithoutLoadedProject = buildMenuSetupProgress({
  project: null,
  storeDetails: { onboardingSource: 'PUBLIC_MENU_ENTRY' },
});
assert.equal(starterWithoutLoadedProject.requiredSteps[0].done, false, 'onboarding source alone must not impersonate a loaded project source');
assert.equal(starterWithoutLoadedProject.phase, 'start', 'missing project truth must route to setup start');

const malformedPublishedProject = buildMenuSetupProgress({
  project: { ...projectWithPublishedMenu, lastPublishedAt: 'not-a-date' },
  qualitySignals: [],
  storeDetails: {},
});
assert.equal(
  malformedPublishedProject.requiredSteps.find(({ id }) => id === 'menu_published').done,
  false,
  'malformed publication timestamps must not mark a menu published',
);

for (const unavailableProject of [
  { ...projectWithPublishedMenu, active: false },
  { ...projectWithPublishedMenu, deleted: true },
]) {
  const unavailableProgress = buildMenuSetupProgress({
    project: unavailableProject,
    qualitySignals: [],
    storeDetails: {},
  });
  assert.equal(
    unavailableProgress.requiredSteps.find(({ id }) => id === 'menu_published').done,
    false,
    'inactive or deleted current project truth must override historical publication time',
  );
  assert.equal(unavailableProgress.phase, 'publish');
}

const malformedMenuItemProgress = buildMenuSetupProgress({
  project: {
    projectId: 'menu-setup-malformed-items',
    files: [{
      extractedData: {
        data: {
          items: [{ active: true, internalNote: 'not a menu item' }],
        },
      },
    }],
  },
  qualitySignals: [],
  storeDetails: {},
});
assert.equal(
  malformedMenuItemProgress.requiredSteps.find(({ id }) => id === 'menu_imported').done,
  false,
  'arbitrary persisted objects must not count as imported menu items',
);

const malformedSocialProgress = buildMenuSetupProgress({
  project: projectWithPublishedMenu,
  qualitySignals: [],
  storeDetails: {
    socialMedia: {
      internalMetadata: { ownerEmail: 'private@example.com' },
    },
  },
});
assert.equal(
  malformedSocialProgress.optionalSteps.find(({ id }) => id === 'obp_links_added').done,
  false,
  'nested malformed store metadata must not count as a public social link',
);

const throwingTimestampProject = buildMenuSetupProgress({
  project: { ...projectWithPublishedMenu, lastPublishedAt: { toMillis: () => { throw new Error('bad timestamp'); } } },
  qualitySignals: [],
  storeDetails: {},
});
assert.equal(
  throwingTimestampProject.requiredSteps.find(({ id }) => id === 'menu_published').done,
  false,
  'throwing timestamp adapters must fail closed without breaking setup UI',
);

const invalidEvidenceSummary = buildStarterActivationSummary({
  onboardingSource: 'PUBLIC_MENU_ENTRY',
  starterActivationSignals: { actions: { menu_link_copied: true, qr_downloaded: 'not-a-date' } },
  menuPresence: { googleBusiness: true },
});
assert.equal(invalidEvidenceSummary.signalCount, 0, 'malformed action/presence evidence must not count toward activation');
assert.equal(
  getStarterActivationSignalCount({
    starterActivationSignals: { actions: { menu_link_copied: true, qr_downloaded: 'not-a-date' } },
    menuPresence: { googleBusiness: true },
  }),
  0,
  'the compact signal count must reject the same malformed evidence as the detailed summary',
);

const activationNow = Date.parse('2026-07-16T00:00:00.000Z');
const futureStarter = {
  onboardingSource: 'PUBLIC_MENU_ENTRY',
  activationDeadline: { seconds: Math.floor((activationNow + 60_000) / 1000), nanoseconds: 500_000_000 },
};
assert.equal(isStarterActivationExpired(futureStarter, activationNow), false, 'a valid future Firebase timestamp must remain active');
assert.equal(hasStarterWorkspaceAccess(futureStarter, false, activationNow), true, 'a valid future starter deadline must grant workspace access');
assert.equal(
  normalizeStarterActivationTimestamp(futureStarter.activationDeadline),
  '2026-07-16T00:01:00.500Z',
  'Firebase timestamp seconds and nanoseconds must retain millisecond precision',
);

for (const invalidDeadline of [undefined, null, 'not-a-date', { seconds: 1, nanoseconds: 1_000_000_000 }]) {
  const malformedStarter = {
    onboardingSource: 'PUBLIC_MENU_ENTRY',
    activationDeadline: invalidDeadline,
  };
  assert.equal(isStarterActivationExpired(malformedStarter, activationNow), true, 'missing or malformed starter deadlines must fail closed');
  assert.equal(hasStarterWorkspaceAccess(malformedStarter, false, activationNow), false, 'invalid deadlines must not grant indefinite workspace access');
  assert.equal(isStarterPublicSurfaceExpired(malformedStarter, activationNow), true, 'invalid deadlines must not grant indefinite public access');
  assert.equal(shouldShowStarterPublicPlaceholders(malformedStarter, activationNow), false, 'invalid deadlines must not render active-starter placeholders');
}

const malformedPlanStarter = {
  onboardingSource: 'PUBLIC_MENU_ENTRY',
  activationDeadline: 'not-a-date',
  activePlanType: { internal: 'premium' },
};
assert.equal(
  isStarterPublicSurfaceExpired(malformedPlanStarter, activationNow),
  true,
  'a malformed truthy plan value must not bypass starter expiry',
);
assert.equal(
  isStarterPublicSurfaceExpired({ ...malformedPlanStarter, activePlanType: ' premium ' }, activationNow),
  false,
  'a bounded non-empty plan string must preserve paid public access',
);

let timestampAdapterCalls = 0;
const methodOnlyTimestamp = {
  toMillis() {
    timestampAdapterCalls += 1;
    return activationNow + 60_000;
  },
};
assert.equal(normalizeStarterActivationTimestamp(methodOnlyTimestamp), null, 'method-only persisted objects are not admitted as timestamps');
assert.equal(timestampAdapterCalls, 0, 'timestamp normalization must not execute methods from persisted objects');

const baseStarterStore = { storeId: 10, onboardingSource: 'PUBLIC_MENU_ENTRY' };
const wrongStoreMerge = applyStarterActivationSignalToStoreDetails(
  baseStarterStore,
  STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
  '2026-07-16T00:00:00.000Z',
  11,
);
assert.equal(wrongStoreMerge, baseStarterStore, 'late acknowledgement must not mutate a newly selected store');
const signalMergedStore = applyStarterActivationSignalToStoreDetails(
  baseStarterStore,
  STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
  '2026-07-16T00:00:00.000Z',
  10,
);
assert.equal(buildStarterActivationSummary(signalMergedStore).signalCount, 1, 'acknowledged owner action must update loaded activation truth');
const presenceMergedStore = applyStarterPresenceUpdateToStoreDetails(
  signalMergedStore,
  'googleBusiness',
  true,
  '2026-07-16T00:01:00.000Z',
  STARTER_ACTIVATION_SIGNALS.GOOGLE_BUSINESS_MARKED,
  10,
);
assert.equal(buildStarterActivationSummary(presenceMergedStore).signalCount, 2, 'acknowledged external confirmation must update loaded activation truth');
const presenceRemovedStore = applyStarterPresenceUpdateToStoreDetails(
  presenceMergedStore,
  'googleBusiness',
  false,
  '2026-07-16T00:02:00.000Z',
  STARTER_ACTIVATION_SIGNALS.GOOGLE_BUSINESS_MARKED,
  10,
);
assert.equal(buildStarterActivationSummary(presenceRemovedStore).signalCount, 1, 'removed external confirmation must stop counting as activation evidence');

assertNotExists('src/app/api/menu-setup-progress');
assertNotExists('src/app/api/menuSetupProgress');
assertNotExists('functions/src/menuSetupProgress');
assertNotExists('functions/src/menu-setup-progress');

console.log('verify-menu-setup-progress-boundary: PASS');
