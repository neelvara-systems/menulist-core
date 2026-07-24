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
includes(read('functions/src/intelligence/menuIntelligence.ts'), 'transaction.set(documentRef, nextState);', 'CMI must replace its complete scheduler-owned projection');
excludes(read('functions/src/intelligence/menuIntelligence.ts'), 'transaction.set(documentRef, nextState, { merge: true })', 'CMI nested maps must not retain deleted item keys');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:scheduled')", 'scheduled projection writes must invalidate public cache');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-store')", 'manual store writes must invalidate public cache');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-project')", 'manual project writes must invalidate public cache');
includes(scoring, "revalidatePublicClientCacheForStore(sId, 'decisionBlocksScoring:manual-project-clear')", 'manual stale-projection deletion must invalidate public cache');
includes(scoring, 'export async function clearStaleDecisionBlocksForProject(', 'empty projects need a no-extra-read stale-projection delete helper');
includes(scoring, 'publicDecisionBlocks: FieldValue.delete()', 'stale generated Decision Blocks must be deleted without overwriting canonical project truth');
assert.equal((scoring.match(/clearStaleDecisionBlocksForProject\(/g) || []).length, 5, 'both scheduled paths and both manual paths must clear stale projections');
includes(scoring, 'Platform-wide manual scoring is not supported', 'manual callable must reject unbounded all-store fan-out');
includes(scoring, 'assertCurrentPlatformOwner', 'manual callables must re-check current platform authority');
excludes(scoring, 'item.duration ||', 'valid zero duration must not be replaced by a default');
excludes(scoring, 'threshold * 2', 'Quick choice must use the shared eligibility threshold exactly');
excludes(scoring, 'return { success: true, projectPath, docId: projectPath, blocks }', 'callable response must not return Firestore sentinel values');

const extractor = read('functions/src/intelligence/shared/itemExtractor.ts');
includes(extractor, 'The current project catalog is authoritative', 'item extraction must document catalog authority');
includes(extractor, 'extractionIdAliases', 'item extraction must retain alias analytics continuity');
includes(extractor, "UNSAFE_ITEM_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype'])", 'item extraction must reject prototype-sensitive dynamic keys');
includes(extractor, 'MAX_ITEM_ID_LENGTH = 512', 'item extraction must bound dynamic item IDs');
includes(extractor, 'export function parseExtractedItems(', 'direct CMI item input needs a runtime projector');
includes(extractor, "throw new Error('decision_intelligence_duplicate_catalog_item')", 'duplicate current catalog IDs must fail instead of resolving by order');
includes(extractor, "throw new Error('decision_intelligence_analytics_counter_overflow')", 'merged alias counters must remain safe integers');
excludes(extractor, '// First, seed with analytics data', 'analytics must not seed scoreable item IDs');

const analyticsAggregator = read('functions/src/intelligence/shared/analyticsAggregator.ts');
includes(analyticsAggregator, 'export function parseIntelligenceSnapshot(', 'compact scoring input needs a runtime projector');
includes(analyticsAggregator, 'export function parseAggregatedAnalytics(', 'direct CMI analytics input needs a runtime projector');
includes(analyticsAggregator, "data.kind !== 'analyticsIntelligence7d'", 'compact scoring input must bind to its writer contract');
includes(analyticsAggregator, 'data.lastSettledLocalDate !== expected.lastSettledLocalDate', 'compact scoring input must bind to the requested settled date');
includes(analyticsAggregator, 'if (parsed) return parsed;', 'only projected compact analytics may reach scoring');
excludes(analyticsAggregator, "String(snapshotData?.lastSettledLocalDate || '') >= lastSettledKey", 'future or malformed snapshots must not pass a lexical freshness check');
excludes(analyticsAggregator, 'includes(String(', 'analytics discriminators must not admit coercible objects');

const dashboardAggregation = read('functions/src/analytics/dashboardSummaryAggregation.ts');
const snapshotWriter = dashboardAggregation.match(/export async function writeIntelligence7dSnapshot\([\s\S]*?\n\}/)?.[0] || '';
includes(snapshotWriter, 'buildIntelligence7dSnapshot(tId, sId, projectId, settlementDate, dailyMap)', 'the compact analytics writer must persist the complete current projection');
excludes(snapshotWriter, 'merge: true', 'the compact analytics writer must prune omitted stale map keys');
includes(dashboardAggregation, 'await writeIntelligence7dSnapshot(db, tId, sId, projectId, settlementDate, dailyMap);', 'dashboard settlement must use the complete-replacement compact writer');

const intelligence = read('functions/src/intelligence/menuIntelligence.ts');
const computeIntelligence = intelligence.match(/export function computeIntelligenceState\([\s\S]*?\n\}\n\n\/\*\*\n \* Fetch current intelligence state/)?.[0] || '';
includes(intelligence, 'advanceAnalyticsDay', 'CMI maturity must be driven by distinct settled analytics dates');
includes(intelligence, "throw new Error('menu_intelligence_out_of_order_analytics')", 'CMI must reject older analytics before replacing current evidence');
includes(intelligence, 'lastAnalyticsDate', 'CMI must persist the last progressed analytics date');
includes(intelligence, 'priorStableDays >= FATIGUE_THRESHOLD_DAYS', 'fatigue must use the stable streak before a falling day');
includes(intelligence, 'slotClicks.breakfast >= threshold', 'time eligibility must enforce the 10 percent threshold');
includes(intelligence, 'createAuditLogRunContext', 'audit context must be request-local');
includes(intelligence, 'const scoreableItems = parseExtractedItems(items);', 'CMI computation must independently project extracted item contracts');
includes(intelligence, 'const trustedAnalytics = parseAggregatedAnalytics(analytics);', 'CMI computation must independently project typed analytics contracts');
includes(intelligence, "throw new Error('menu_intelligence_invalid_identity')", 'CMI persistence identity must be validated before path construction');
includes(intelligence, 'const documentId = getMenuIntelligenceDocumentId(identity);', 'CMI transaction persistence must validate identity before constructing a Firestore reference');
includes(intelligence, "Buffer.byteLength(`${tId}_${sId}_${projectId}`, 'utf8')", 'CMI composite document IDs must respect the Firestore byte boundary');
includes(intelligence, "throw new Error('menu_intelligence_invalid_analytics_date')", 'CMI must reject impossible analytics dates');
includes(intelligence, "throw new Error('menu_intelligence_invalid_item_set')", 'CMI must reject duplicate or over-limit item sets');
includes(intelligence, 'export function parseMenuIntelligenceState(', 'CMI persisted state needs a runtime projector');
includes(intelligence, 'const trustedCurrentState = currentState', 'direct CMI callers must compute from a normalized prior-state projection');
includes(intelligence, 'parseMenuIntelligenceState(currentState, documentId)', 'direct CMI callers must not bypass prior-state identity/runtime projection');
excludes(computeIntelligence, 'currentState?.itemConfidence?.[item.itemId]', 'CMI must not validate a projection and then compute from the original caller object');
includes(intelligence, "throw new Error('menu_intelligence_invalid_persisted_state')", 'CMI must fail closed on malformed prior state');
includes(intelligence, 'return db.runTransaction(async (transaction) => {', 'CMI read-compute-replace must serialize in one transaction');
includes(intelligence, 'priorityB - priorityA || (itemIdA < itemIdB ? -1 : itemIdA > itemIdB ? 1 : 0)', 'equal-priority ranks need a runtime-locale-independent item-ID tie-break');
includes(scoring, 'sort(compareDecisionScores)', 'public Decision Block score ties need a runtime-locale-independent item-ID tie-break');
excludes(intelligence, 'MAX_SHIFT:', 'CMI must not advertise an unenforced per-run rank-shift cap');
excludes(intelligence, 'MAX_CHANGED_RATIO:', 'CMI must not advertise an unenforced changed-item ratio cap');
excludes(intelligence, 'currentRunContext', 'module-global audit context can leak across concurrent calls');
excludes(intelligence, 'new Date().getHours()', 'nightly stored priority must not depend on Function runtime hour');
excludes(intelligence, 'includes(String(', 'CMI persisted discriminators must not admit coercible objects');

const features = read('src/config/features.ts');
includes(features, 'ENABLE_DECISION_BLOCKS: true', 'app Decision Blocks flag is required');
includes(features, 'ENABLE_CONTINUOUS_MENU_INTELLIGENCE: true', 'app CMI DAL flag is required');
excludes(features, 'MENU_INTELLIGENCE_ENABLED', 'stale unused CMI flag name must not remain');

const dal = read('src/lib/intelligence/dal.ts');
includes(dal, 'FEATURE_FLAGS.ENABLE_CONTINUOUS_MENU_INTELLIGENCE', 'CMI DAL must honor the app feature gate');
includes(dal, 'No app/owner/public consumer is certified', 'CMI DAL must document its neutral uncertified boundary');
excludes(dal, "from 'firebase/firestore'", 'uncertified CMI DAL must not read raw Firestore state');
excludes(dal, 'convertTimestamps', 'uncertified CMI DAL must not cast raw persisted state');
const intelligenceTypes = read('src/types/intelligence.ts');
excludes(intelligenceTypes, 'MAX_SHIFT_PER_DAY', 'reserved app constants must not claim an unenforced movement cap');
excludes(intelligenceTypes, 'MAX_ITEMS_CHANGED_RATIO', 'reserved app constants must not claim an unenforced changed-item ratio cap');

const desktopActions = read('src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx');
includes(desktopActions, "action.key === 'decisionBlocks'", 'desktop Featured section action needs a feature gate');
const mobileScreen = read('src/components/mobile/screens/MobileMenuScreen.tsx');
includes(mobileScreen, 'menuData && FEATURE_FLAGS.ENABLE_DECISION_BLOCKS', 'mobile Featured section sheet needs a feature gate');
const publicMenu = read('src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx');
includes(publicMenu, 'FEATURE_FLAGS.ENABLE_DECISION_BLOCKS', 'public Featured section renderer needs a feature gate');
const publicMenuPage = read('src/app/client/[[...slug]]/page.tsx');
includes(publicMenuPage, 'projectPublicDecisionBlocks(rawProjectData?.publicDecisionBlocks', 'public Decision Blocks must cross an identity-bound field projector');
excludes(publicMenuPage, 'return blocks;', 'the public route must not forward the raw embedded projection');
const publicProjection = read('src/lib/decisionBlocks/publicProjection.ts');
includes(publicProjection, 'export function projectPublicDecisionBlocks(', 'Decision Blocks needs an explicit public DTO projector');
includes(publicProjection, 'itemId: raw.itemId,\n            reason: raw.reason', 'the public candidate DTO must omit internal score and duplicated catalog fields');
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
includes(rules, 'allow read: if isAuthenticated() && isPlatformAdmin();', 'private CMI state must remain platform-only until a downstream client is certified');
includes(rules, 'allow write: if false;', 'clients must not write CMI state');

const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const cmiUnindexedFields = new Set(
    firestoreIndexes.fieldOverrides
        .filter((override) => override.collectionGroup === 'menuIntelligence' && Array.isArray(override.indexes) && override.indexes.length === 0)
        .map((override) => override.fieldPath),
);
const cmiTtlPolicy = firestoreIndexes.fieldOverrides.find(
    (override) => override.collectionGroup === 'menuIntelligence' && override.fieldPath === 'validUntil',
);
assert.deepStrictEqual(
    cmiTtlPolicy,
    { collectionGroup: 'menuIntelligence', fieldPath: 'validUntil', ttl: true, indexes: [] },
    'CMI validUntil must be an unindexed Firestore TTL field so expired private projections are deleted',
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
