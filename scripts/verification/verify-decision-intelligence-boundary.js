const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const includes = (source, value, message) => assert.ok(source.includes(value), message);
const excludes = (source, value, message) => assert.ok(!source.includes(value), message);

const appConfig = read('src/data/shared/decisionBlockConfig.ts');
const functionsConfig = read('functions/src/sharedData/decisionBlockConfig.ts');
assert.equal(appConfig, functionsConfig, 'app and Functions Decision Block configuration must be byte-identical');

const scoring = read('functions/src/decisionBlocksScoring.ts');
includes(scoring, 'extractActiveItems(projectData, analyticsForScoring)', 'Decision Blocks must use the shared catalog-first extractor');
includes(scoring, 'getBehavioralClickCount(item) >= 3', 'automatic popular candidates need per-item behavioral evidence');
includes(scoring, 'item.price > 0 && item.price <= avgPrice', 'Value candidates must stay within the bounded current-menu price comparison');
includes(scoring, "isFunctionFeatureEnabled('ENABLE_DECISION_BLOCKS_SCORING')", 'Functions scoring feature gate is required');
includes(scoring, "isFunctionFeatureEnabled('ENABLE_CONTINUOUS_MENU_INTELLIGENCE')", 'CMI Functions feature gate is required');
includes(scoring, "return { projectEntries: [], activeProjectIds: [], source: 'summary' }", 'valid empty project summaries must not open a collection scan');
includes(scoring, ".set(intelligence);", 'CMI must replace its complete scheduler-owned projection');
excludes(scoring, ".set(intelligence, { merge: true })", 'CMI nested maps must not retain deleted item keys');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:scheduled')", 'scheduled projection writes must invalidate public cache');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-store')", 'manual store writes must invalidate public cache');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-project')", 'manual project writes must invalidate public cache');
includes(scoring, 'Platform-wide manual scoring is not supported', 'manual callable must reject unbounded all-store fan-out');
includes(scoring, 'assertCurrentPlatformOwner', 'manual callables must re-check current platform authority');
excludes(scoring, 'item.duration ||', 'valid zero duration must not be replaced by a default');
excludes(scoring, 'threshold * 2', 'Quick choice must use the shared eligibility threshold exactly');
excludes(scoring, 'return { success: true, projectPath, docId: projectPath, blocks }', 'callable response must not return Firestore sentinel values');

const extractor = read('functions/src/intelligence/shared/itemExtractor.ts');
includes(extractor, 'The current project catalog is authoritative', 'item extraction must document catalog authority');
includes(extractor, 'extractionIdAliases', 'item extraction must retain alias analytics continuity');
excludes(extractor, '// First, seed with analytics data', 'analytics must not seed scoreable item IDs');

const intelligence = read('functions/src/intelligence/menuIntelligence.ts');
includes(intelligence, 'advanceAnalyticsDay', 'CMI maturity must be driven by distinct settled analytics dates');
includes(intelligence, 'lastAnalyticsDate', 'CMI must persist the last progressed analytics date');
includes(intelligence, 'priorStableDays >= FATIGUE_THRESHOLD_DAYS', 'fatigue must use the stable streak before a falling day');
includes(intelligence, 'slotClicks.breakfast >= threshold', 'time eligibility must enforce the 10 percent threshold');
includes(intelligence, 'createAuditLogRunContext', 'audit context must be request-local');
excludes(intelligence, 'currentRunContext', 'module-global audit context can leak across concurrent calls');
excludes(intelligence, 'new Date().getHours()', 'nightly stored priority must not depend on Function runtime hour');

const features = read('src/config/features.ts');
includes(features, 'ENABLE_DECISION_BLOCKS: true', 'app Decision Blocks flag is required');
includes(features, 'ENABLE_CONTINUOUS_MENU_INTELLIGENCE: true', 'app CMI DAL flag is required');
excludes(features, 'MENU_INTELLIGENCE_ENABLED', 'stale unused CMI flag name must not remain');

const dal = read('src/lib/intelligence/dal.ts');
includes(dal, 'FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE', 'CMI DAL must honor the app feature gate');
includes(dal, 'new Date(state.validUntil).getTime() <= Date.now()', 'CMI presentation helpers must fail neutral when expired');

const desktopActions = read('src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx');
includes(desktopActions, "action.key === 'decisionBlocks'", 'desktop Featured section action needs a feature gate');
const mobileScreen = read('src/components/mobile/screens/MobileMenuScreen.tsx');
includes(mobileScreen, 'menuData && FEATURE_FLAGS.ENABLE_DECISION_BLOCKS', 'mobile Featured section sheet needs a feature gate');
const publicMenu = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
includes(publicMenu, 'FEATURE_FLAGS.ENABLE_DECISION_BLOCKS', 'public Featured section renderer needs a feature gate');
const websiteEn = read('public/locales/menulist.ai/en-US.json');
excludes(websiteEn, 'Owners can pin what should be noticed.', 'website owner-control copy must not guarantee pinned placement');

const staleReplacementClaim = 'The next best available item will be shown to customers instead.';
const staleSignalExplanation = 'Best seller, prep time, price, and customer activity help automatic choices.';
const desktopSettings = read('src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx');
excludes(desktopSettings, staleReplacementClaim, 'desktop owner copy must not guarantee a replacement');
excludes(desktopSettings, staleSignalExplanation, 'desktop owner copy must not explain internal scoring signals');
for (const file of fs.readdirSync(path.join(root, 'public/locales/menulist.ai')).filter((name) => name.endsWith('.json'))) {
    const source = read(`public/locales/menulist.ai/${file}`);
    JSON.parse(source);
    excludes(source, staleReplacementClaim, `${file} must not guarantee a replacement`);
    excludes(source, staleSignalExplanation, `${file} must not expose internal scoring signals`);
}

const rules = read('firestore.rules');
includes(rules, 'match /menuIntelligence/{docId}', 'CMI Firestore rule boundary is required');
includes(rules, 'allow write: if false;', 'clients must not write CMI state');

const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const cmiUnindexedFields = new Set(
    firestoreIndexes.fieldOverrides
        .filter((override) => override.collectionGroup === 'menuIntelligence' && Array.isArray(override.indexes) && override.indexes.length === 0)
        .map((override) => override.fieldPath),
);
for (const fieldPath of [
    'itemConfidence',
    'itemPriority',
    'previousItemRanks',
    'suppressionWindows',
    'timeEligibility',
    'recentAuditLog',
]) {
    assert.ok(cmiUnindexedFields.has(fieldPath), `CMI high-cardinality field ${fieldPath} must remain exempt from unused single-field indexes`);
}

const diSpec = read('__docs__/decision-intelligence/decision-intelligence_spec.md');
includes(diSpec, 'It is not shown on every menu.', 'Decision Intelligence docs must state conditional display');
includes(diSpec, 'MenuList does not have POS sales', 'Decision Intelligence docs must state the missing sales boundary');
const cmiSpec = read('__docs__/continuous-menu-intelligence/continuous-menu-intelligence_spec.md');
includes(cmiSpec, 'must not advance confidence', 'CMI docs must state same-date idempotency');
includes(cmiSpec, 'not adjusted using the Cloud Function server hour', 'CMI docs must state the store-time boundary');

console.log('Decision Intelligence and CMI source boundary verification passed');
