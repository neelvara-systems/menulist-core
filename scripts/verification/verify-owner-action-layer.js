#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function requireToken(source, token, label) {
  if (!source.includes(token)) {
    failures.push(`${label} missing token: ${token}`);
  }
}

function forbidToken(source, token, label) {
  if (source.includes(token)) {
    failures.push(`${label} must not include token: ${token}`);
  }
}

const packageJson = read('package.json');
const features = read('src/config/features.ts');
const helper = read('src/lib/ownerActions/buildOwnerActionLayer.ts');
const boundaryTest = read('scripts/verification/test-owner-action-layer-boundary.ts');
const desktopDashboard = read('src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx');
const mobileDashboard = read('src/components/mobile/screens/MobileDashboardScreen.tsx');
const navigations = read('src/constants/navigations.ts');
const readme = read('__docs__/owner-action-layer/README.md');
const spec = read('__docs__/owner-action-layer/owner-action-layer_spec.md');
const impl = read('__docs__/owner-action-layer/owner-action-layer_impl.md');
const firebase = read('__docs__/owner-action-layer/owner-action-layer_firebase.md');
const mobile = read('__docs__/owner-action-layer/owner-action-layer_mobile-support.md');
const website = read('__docs__/owner-action-layer/owner-action-layer_website.md');
const tests = read('__docs__/owner-action-layer/owner-action-layer_test-cases.md');
const changelog = read('__docs__/changelog.md');

requireToken(
  packageJson,
  '"verify:owner-action-layer": "node scripts/verification/verify-owner-action-layer.js"',
  'package scripts',
);

[
  'ENABLE_OWNER_ACTION_LAYER: true',
  '@see __docs__/owner-action-layer/',
  'This must not add Firestore fields, collections, API routes, Cloud',
].forEach((token) => requireToken(features, token, 'feature flag'));

[
  'export function buildOwnerActionLayer',
  'isPublishedMenuProject(project)',
  'normalizeStarterActivationTimestamp',
  'hasNonEmptyString(storeDetails?.customDomain)',
  "id: 'set_customer_link'",
  "id: 'set_hours'",
  "id: 'publish_menu'",
  "id: 'place_customer_link'",
  "id: 'open_private_feedback'",
  "id: 'capture_daily_change'",
  "id: 'set_today_status'",
  "id: 'prepare_staff_handoff'",
  "id: 'update_prices'",
  'const PLACEMENT_STALE_DAYS = 45;',
  'menuPresence',
  'latestConfirmedLabel',
].forEach((token) => requireToken(helper, token, 'owner action helper'));

[
  'active: false',
  'deleted: true',
  "assert.equal(result.primaryAction.id, 'publish_menu')",
  "assert.equal(malformedStoreTruth.placement.confirmedCount, 1)",
].forEach((token) => requireToken(boundaryTest, token, 'owner action boundary test'));

[
  'buildOwnerActionLayer',
  'FEATURE_FLAGS.ENABLE_OWNER_ACTION_LAYER && !dashboardProjectLoading',
  "ownerActionLayer.statusLabel !== 'Stable'",
  'Next owner action',
  'ownerActionLayer.primaryAction',
  'router.push(ownerActionLayer.primaryAction.desktopHref)',
].forEach((token) => requireToken(desktopDashboard, token, 'desktop dashboard owner action layer'));
forbidToken(desktopDashboard, 'ownerActionLayer.supportingActions', 'desktop dashboard supporting action grid');
forbidToken(desktopDashboard, 'title="Update what customers see"', 'desktop dashboard duplicate quick actions');

[
  'buildOwnerActionLayer',
  'FEATURE_FLAGS.ENABLE_OWNER_ACTION_LAYER && !loadingProjects && selectedProjectId',
  "ownerActionLayer.statusLabel !== 'Stable'",
  'Next owner action',
  'handleOwnerAction',
  "target.type === 'menuTab'",
  "target.type === 'shareTab'",
  'onOpenMoreScreen?.(target.screen)',
  "screen: 'aiMenuManager'",
].forEach((token) => requireToken(mobileDashboard, token, 'mobile dashboard owner action layer'));
forbidToken(mobileDashboard, 'ownerActionLayer.supportingActions', 'mobile dashboard supporting action grid');
forbidToken(mobileDashboard, 'renderQuickActions', 'mobile dashboard duplicate quick actions');
[
  "{ label: 'QR Code', route: NAVIGARIONS_ROUTINGS.QR_CODE",
  "{ label: 'Assets', route: NAVIGARIONS_ROUTINGS.ASSETS",
].forEach((token) => requireToken(navigations, token, 'dedicated owner navigation module'));

[
  'selectedProjectSummary as any',
  'storeDetails as any',
  'const renderMetricsCards = (metrics?: any)',
  'const renderAiSummary = (summary?: any)',
  'const periodData = currentViewData as any',
  'topZeroResultSearchTerms.map((term: any)',
  'historicalWeeks.map((w: any)',
  'historicalWeeks.map((week: any',
].forEach((token) => forbidToken(mobileDashboard, token, 'mobile dashboard typed DTO boundary'));

requireToken(helper, 'lastPublishedAt?: unknown;', 'owner action minimal project contract');

[
  'Feature Flag:** `ENABLE_OWNER_ACTION_LAYER`',
  'No new Firestore collection, Firestore field, API route, Cloud Function',
  'npm run verify:owner-action-layer',
].forEach((token) => requireToken(readme, token, 'owner action README'));

[
  'Missing menu/publish state wins first.',
  'Missing hours wins before distribution.',
  'Missing customer link wins before placement.',
  'Missing or stale external placement wins before secondary actions.',
  'Feedback disabled wins before routine actions.',
  'No external profile scanning.',
].forEach((token) => requireToken(spec, token, 'owner action spec'));

[
  'storeDetails + selected project',
  'buildOwnerActionLayer()',
  'Desktop',
  'Mobile',
  'No screenshot, external fetch, or verification storage is added in this slice.',
].forEach((token) => requireToken(impl, token, 'owner action implementation doc'));

[
  'The owner action layer adds no Firebase operations.',
  '| Firestore reads | 0 new |',
  '| Firestore writes | 0 |',
  'Any future proof capture, date-specific exception schema, review ingestion',
].forEach((token) => requireToken(firebase, token, 'owner action firebase doc'));

[
  'Frequency | Pass',
  'Speed | Pass',
  'Mobile owner action layer renders inside `MobileDashboardScreen`',
  'It does not use `window.location`, forced reloads, or desktop route bypasses.',
].forEach((token) => requireToken(mobile, token, 'owner action mobile doc'));

[
  'No dedicated public website page is needed for this feature.',
  'Do not claim external-platform verification.',
].forEach((token) => requireToken(website, token, 'owner action website doc'));

[
  'No selected project loaded yet',
  'Placement confirmed over 45 days ago',
  'Feature flag off',
].forEach((token) => requireToken(tests, token, 'owner action test doc'));

[
  'Owner Action Layer',
  'one next owner action',
  'existing store and selected-menu data',
].forEach((token) => requireToken(changelog, token, 'changelog'));

[
  'fetch(',
  'getDocs(',
  'setDoc(',
  'addDoc(',
  'updateDoc(',
  'deleteDoc(',
  'collection(',
].forEach((token) => forbidToken(helper, token, 'owner action helper'));

if (failures.length) {
  console.error('Owner Action Layer verifier failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Owner Action Layer verifier passed');
