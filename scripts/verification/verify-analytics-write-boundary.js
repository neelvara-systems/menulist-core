#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function verifyRuntimePolicy() {
  const { filterAnalyticsUpdateData } = require(path.join(ROOT, 'src/lib/analytics/writePolicy.ts'));
  const {
    normalizeAnalyticsDashboardReadModel,
    normalizeAnalyticsData,
    normalizeAnalyticsDateKey,
    normalizeAnalyticsProjectId,
    normalizeAnalyticsScopeDocumentId,
    normalizeCustomerAppDashboardReadModel,
    normalizeDailyAnalytics,
  } = require(path.join(ROOT, 'src/lib/analytics/readBoundary.ts'));
  const {
    normalizeOBPDashboardCacheValue,
    normalizeOBPDailyReadDocument,
    normalizeOBPDashboardReadModel,
    normalizeOBPTodayCacheValue,
  } = require(path.join(ROOT, 'src/lib/analytics/obpReadBoundary.ts'));

  const filtered = filterAnalyticsUpdateData({
    totalViews: 1,
    totalClicks: 'overwrite-counter',
    totalSearches: true,
    'viewsByDevice.mobile': 2,
    'viewsByDevice.desktop': 'overwrite-map-counter',
    'hourlyClicksByItem.item_1.12': 3,
    'hourlyClicksByItem.item_1.99': 3,
    languageTrackingEnabled: true,
    obpLanguageTrackingEnabled: 1,
    'itemNames.item_1': '  Lunch Special  ',
    'itemNames.item_2': 7,
    'categoryNames.cat_1': 'x'.repeat(140),
    date: '2026-07-11',
    sessionId: 'private-session',
    totalInstalled: null,
    unknownMetric: 1,
  });

  assert(filtered.totalViews === 1, 'numeric scalar counter must survive');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'totalClicks'), 'string scalar overwrite must be rejected');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'totalSearches'), 'boolean scalar overwrite must be rejected');
  assert(filtered['viewsByDevice.mobile'] === 2, 'numeric map counter must survive');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'viewsByDevice.desktop'), 'string map-counter overwrite must be rejected');
  assert(filtered['hourlyClicksByItem.item_1.12'] === 3, 'valid three-level counter must survive');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'hourlyClicksByItem.item_1.99'), 'invalid hour must be rejected');
  assert(filtered.languageTrackingEnabled === true, 'boolean control field must survive');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'obpLanguageTrackingEnabled'), 'numeric boolean overwrite must be rejected');
  assert(filtered['itemNames.item_1'] === 'Lunch Special', 'label must be trimmed');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'itemNames.item_2'), 'numeric label overwrite must be rejected');
  assert(filtered['categoryNames.cat_1'].length === 120, 'label must be bounded');
  assert(
    filterAnalyticsUpdateData({ 'searchTerms.chicken biryani': 1 })['searchTerms.chicken biryani'] === 1,
    'multi-word search term must survive',
  );
  assert(
    filterAnalyticsUpdateData({ 'zeroResultSearchTerms.हिंदी खाना': 1 })['zeroResultSearchTerms.हिंदी खाना'] === 1,
    'non-Latin search term must survive',
  );
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'date'), 'client date field must not enter analytics counter writes');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'sessionId'), 'session ID must remain denied');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'totalInstalled'), 'null counter overwrite must be rejected');
  assert(!Object.prototype.hasOwnProperty.call(filtered, 'unknownMetric'), 'unknown field must be rejected');

  assert(normalizeAnalyticsScopeDocumentId('42') === '42', 'exact analytics tenant/store ID must survive');
  for (const invalidScope of ['0', '01', '42 ', '-1', '1.5', '__name__', '1/2']) {
    assert(normalizeAnalyticsScopeDocumentId(invalidScope) === null, `invalid analytics scope must fail: ${invalidScope}`);
  }
  assert(normalizeAnalyticsProjectId('menu_project-1') === 'menu_project-1', 'valid analytics project ID must survive');
  assert(normalizeAnalyticsProjectId('menu/project') === null, 'path-shaped analytics project ID must fail');
  assert(normalizeAnalyticsDateKey('2026-02-29') === null, 'impossible analytics date must fail');
  assert(normalizeAnalyticsDateKey('2024-02-29') === '2024-02-29', 'valid leap-day analytics date must survive');

  const normalizedDay = normalizeDailyAnalytics({
    localDate: '2026-07-11',
    totalViews: 4,
    viewsByDevice: { mobile: 4 },
    itemNames: { item_1: 'Lunch' },
    lastUpdated: { toDate: () => new Date('2026-07-11T10:00:00.000Z') },
  });
  assert(normalizedDay?.date === '2026-07-11', 'daily analytics must normalize localDate to UI date');
  assert(normalizedDay?.totalViews === 4, 'daily analytics numeric field must survive');
  assert(
    normalizedDay?.lastUpdated === '2026-07-11T10:00:00.000Z',
    'daily analytics timestamp must project to a JSON-safe ISO value',
  );
  assert(
    normalizeDailyAnalytics({
      date: '2026-07-11',
      lastUpdated: { toDate: () => { throw new Error('malformed timestamp'); } },
    })?.lastUpdated === undefined,
    'throwing persisted timestamp adapter must fail closed',
  );
  assert(
    normalizeDailyAnalytics({ date: '2026-07-11', viewsByDevice: { mobile: 'forged' } })?.viewsByDevice === undefined,
    'malformed daily analytics map must fail closed',
  );
  assert(
    normalizeAnalyticsDashboardReadModel({
      tId: '1',
      sId: '101',
      projectId: 'project_1',
      lastSettledLocalDate: '2026-07-10',
      daily30d: [{ date: '2026-07-10', totalViews: 2 }],
      analyticsSummary: { lifetimeTotalViews: 2 },
    }, '1', '101', 'project_1')?.daily30d.length === 1,
    'valid scoped analytics dashboard read model must survive',
  );
  assert(
    normalizeAnalyticsDashboardReadModel({
      tId: '1',
      sId: '999',
      projectId: 'project_1',
      lastSettledLocalDate: '2026-07-10',
      daily30d: [],
    }, '1', '101', 'project_1') === null,
    'cross-store analytics dashboard read model must fail',
  );
  assert(
    normalizeAnalyticsData({
      summary: { lifetimeTotalViews: 2, lastUpdated: '2026-07-11T10:00:00.000Z' },
      daily: [{ date: '2026-07-11', totalViews: 2, lastUpdated: '2026-07-11T10:00:00.000Z' }],
    })?.daily[0]?.lastUpdated === '2026-07-11T10:00:00.000Z',
    'JSON-rehydrated analytics cache must retain its exact ISO timestamp',
  );
  assert(
    normalizeAnalyticsData({
      summary: null,
      daily: [{ date: '2026-07-11', totalViews: 'forged' }],
    })?.daily[0]?.totalViews === undefined,
    'analytics cache must normalize malformed optional counters instead of trusting generic types',
  );
  assert(
    normalizeAnalyticsData({ summary: null, daily: [{ date: 'not-a-date' }] }) === null,
    'analytics cache with malformed required rows must fail closed',
  );
  assert(
    normalizeOBPDailyReadDocument({
      analyticsScope: 'customer', date: '2026-07-10', grain: 'daily', projectId: 'obp',
      sId: '101', surface: 'obp', tId: '1', totalOBPViews: 2,
    }, { date: '2026-07-10', sId: '101', tId: '1' }) !== null,
    'valid scoped OBP daily document must survive',
  );
  assert(
    normalizeOBPDailyReadDocument({
      analyticsScope: 'customer', date: '2026-07-10', grain: 'daily', projectId: 'obp',
      sId: '101', surface: 'obp', tId: '1', totalOBPViews: '2',
    }, { date: '2026-07-10', sId: '101', tId: '1' }) === null,
    'string OBP daily counter must fail',
  );
  const emptyOBPPeriod = {
    views: 0, actionClicks: 0, menuClicks: 0, linkClicks: 0, shares: 0, daysWithData: 0,
    actions: { call: 0, whatsapp: 0, directions: 0, reserve: 0, order: 0 },
    shareMethods: { whatsapp: 0, copy_link: 0, copy_message: 0 },
    links: { google_review: 0, instagram: 0, facebook: 0, website: 0 },
    sources: [], openHoursActionBreakdown: { open: 0, closed: 0, unknown: 0, closedShare: 0 }, topLanguages: [],
  };
  const validOBPDashboard = {
    tId: '1', sId: '101', projectId: 'obp', kind: 'obpDashboardSummary', lastSettledLocalDate: '2026-07-10',
    overview: {
      status: 'no_data', statusMessage: 'No visitors yet.', yesterday: null, wtd: null, mtd: null,
      historicalWeeks: [], viewsChange: null,
    },
    overall: {
      lifetimeViews: 0, lifetimeActionClicks: 0, lifetimeMenuClicks: 0, lifetimeLinkClicks: 0, lifetimeShares: 0,
      lifetimeActions: emptyOBPPeriod.actions, lifetimeShareMethods: emptyOBPPeriod.shareMethods,
      lifetimeLinks: emptyOBPPeriod.links, lifetimeSources: [],
      lifetimeOpenHoursActionBreakdown: emptyOBPPeriod.openHoursActionBreakdown, lifetimeLanguages: [],
    },
    daily30d: [],
  };
  const normalizedOBPDashboard = normalizeOBPDashboardReadModel(validOBPDashboard, '1', '101');
  assert(normalizedOBPDashboard !== null, 'valid OBP dashboard read model must survive');
  assert(
    normalizeOBPDashboardReadModel({ ...validOBPDashboard, sId: '202' }, '1', '101') === null,
    'cross-store OBP dashboard read model must fail',
  );
  assert(
    normalizeOBPDashboardCacheValue({ ...normalizedOBPDashboard, daily30d: [], lastFetched: new Date() }, '1', '101') !== null,
    'valid normalized OBP local cache must survive',
  );
  assert(
    normalizeOBPDashboardCacheValue({ ...normalizedOBPDashboard, sId: '202', daily30d: [] }, '1', '101') === null,
    'cross-store normalized OBP local cache must fail',
  );
  assert(
    normalizeOBPTodayCacheValue({ ...emptyOBPPeriod, date: '2026-07-10', isPartial: true }) !== null,
    'valid OBP Today cache row must survive',
  );
  assert(
    normalizeOBPTodayCacheValue({ ...emptyOBPPeriod, views: '2', date: '2026-07-10', isPartial: true }) === null,
    'string OBP Today cache counter must fail',
  );
  const validCustomerAppDashboard = {
    tId: '1', sId: '101', projectId: 'customerApp', kind: 'customerAppDashboardSummary',
    generatedForLocalDate: '2026-07-11', lastSettledLocalDate: '2026-07-10',
    summary: { lifetimeTotalInstalled: 2, installsBySource: { prompt: 2 } },
    daily30d: [{ date: '2026-07-10', totalInstalled: 2 }],
  };
  assert(
    normalizeCustomerAppDashboardReadModel(validCustomerAppDashboard, '1', '101')?.daily30d.length === 1,
    'valid Customer App dashboard read model must survive',
  );
  assert(
    normalizeCustomerAppDashboardReadModel({
      ...validCustomerAppDashboard,
      summary: { lifetimeTotalInstalled: '2' },
    }, '1', '101') === null,
    'string Customer App lifetime counter must fail',
  );
  assert(
    normalizeCustomerAppDashboardReadModel({ ...validCustomerAppDashboard, sId: '202' }, '1', '101') === null,
    'cross-store Customer App dashboard read model must fail',
  );
}

function verifySourceBoundaries() {
  const rules = read('firestore.rules');
  const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
  const clientDal = read('src/database/analytics/index.ts');
  const publicRoute = read('src/app/api/public/analytics/track/route.ts');
  const serverWrite = read('src/lib/analytics/serverWrite.ts');
  const browserState = read('src/lib/analytics/browserState.ts');
  const eventPayload = read('src/lib/analytics/eventPayload.ts');
  const ga4Boundary = read('src/lib/analytics/ga4Boundary.ts');
  const geoBoundary = read('src/lib/analytics/geo.ts');
  const writePolicy = read('src/lib/analytics/writePolicy.ts');
  const queueBoundary = read('src/lib/analytics/queueBoundary.ts');
  const unifiedAnalytics = read('src/lib/analytics/unified.ts');
  const analyticsHook = read('src/hooks/useAnalyticsData.ts');
  const customerAppDashboardHook = read('src/hooks/useCustomerAppDashboard.ts');
  const obpDashboardHook = read('src/hooks/useOBPDashboard.ts');
  const analyticsDatabase = read('src/database/analytics/index.ts');
  const ownerDashboardDatabase = read('src/database/ownerDashboard/index.ts');
  const analyticsAggregation = read('functions/src/aggregateCustomerAnalytics.ts');
  const dashboardAggregation = read('functions/src/analytics/dashboardSummaryAggregation.ts');
  const obpAggregation = read('functions/src/analytics/obpAnalyticsAggregation.ts');
  const packageJson = JSON.parse(read('package.json'));
  const analyticsRules = rules.slice(
    rules.indexOf('match /analytics/{docId}'),
    rules.indexOf('match /chatAnalytics/{docId}'),
  );

  const analyticsIndexExemptions = new Set(
    (firestoreIndexes.fieldOverrides || [])
      .filter((override) => override.collectionGroup === 'analytics' && Array.isArray(override.indexes) && override.indexes.length === 0)
      .map((override) => override.fieldPath),
  );
  for (const fieldPath of [
    'hourlyClicksByItem',
    'itemNames',
    'searchTerms',
    'viewsByContent',
    'zeroResultSearchTerms',
  ]) {
    assert(analyticsIndexExemptions.has(fieldPath), `analytics ${fieldPath} must stay exempt from unused single-field indexing`);
  }
  assert(
    (firestoreIndexes.fieldOverrides || []).some((override) => (
      override.collectionGroup === 'analyticsDeliveryReceipts'
      && override.fieldPath === 'expiresAt'
      && override.ttl === true
      && Array.isArray(override.indexes)
      && override.indexes.length === 0
    )),
    'analytics delivery receipts must retain native TTL without indexes',
  );

  assertIncludes(analyticsRules, 'allow create, update, delete: if false;', 'analytics client mutation rule');
  assertNotIncludes(analyticsRules, 'isTenantStoreCreate(request.resource.data)', 'analytics client create admission');
  assertIncludes(clientDal, "fetch('/api/public/analytics/track'", 'browser analytics public API boundary');
  assertIncludes(clientDal, "if (typeof window === 'undefined') return false;", 'browser-only analytics admission');
  assertNotIncludes(clientDal, 'setDoc(dailyDocRef', 'browser analytics direct Firestore mutation');
  assertNotIncludes(clientDal, 'writeAnalyticsEventNow', 'browser analytics dead direct writer');
  assertIncludes(clientDal, 'if (!queued.activeDelivery) {', 'analytics exact in-flight delivery snapshot boundary');
  assertIncludes(clientDal, 'deliveryId: queued.deliveryId,', 'analytics retry-stable delivery identity snapshot');
  assertIncludes(clientDal, 'queued.deliveryId = createRandomIdSegment(32);', 'analytics pending delivery identity rotation before network work');
  assertIncludes(clientDal, 'queued.updateData = {};', 'analytics pending counters separated from in-flight delivery');
  assertIncludes(clientDal, 'activeDelivery.deliveryId,', 'analytics retry reuses exact in-flight delivery identity');
  assertIncludes(clientDal, 'current.activeDelivery = undefined;', 'analytics active delivery clears only after acknowledgement');
  assertIncludes(queueBoundary, 'activeDelivery?: AnalyticsDeliverySnapshot;', 'analytics persisted split delivery contract');
  assertIncludes(clientDal, 'if (!canMergeAnalyticsUpdateData(existing.updateData, policyData)) {', 'analytics live queue field-cap admission');
  assertNotIncludes(clientDal, 'if (mergedFieldCount > 200)', 'analytics undeliverable 200-field queue allowance');
  assertIncludes(queueBoundary, 'size <= ANALYTICS_QUEUE_MAX_FIELDS;', 'analytics live/persisted route field-cap parity');
  assertIncludes(clientDal, 'isRetryableAnalyticsFlushError', 'analytics retry classification');
  assertIncludes(clientDal, 'current.retryCount >= ANALYTICS_QUEUE_MAX_RETRY_COUNT', 'analytics bounded retry count');
  assertIncludes(clientDal, 'normalizePersistedAnalyticsQueue(', 'analytics persisted queue DTO admission');
  assertIncludes(queueBoundary, 'const queueKey = getAnalyticsQueueKey(tenantId, storeId, projectId, dateString);', 'analytics canonical restored queue key');
  assertIncludes(queueBoundary, 'ANALYTICS_DELIVERY_ID_PATTERN', 'analytics persisted delivery identity contract');
  assertIncludes(queueBoundary, 'dateString > currentDate', 'analytics future persisted date rejection');
  assertIncludes(browserState, 'normalizeAnalyticsSessionMilestoneState', 'analytics session milestone DTO boundary');
  assertIncludes(browserState, 'normalizeStoredAnalyticsEntrySource', 'analytics stored source DTO boundary');
  assertIncludes(browserState, 'normalizeAnalyticsAttributeFilterState', 'analytics stored filter DTO boundary');
  assertIncludes(eventPayload, 'buildAuthoritativeAnalyticsPayload', 'analytics explicit event argument precedence boundary');
  assertIncludes(eventPayload, 'normalizeAnalyticsCount', 'analytics finite non-negative count boundary');
  assertIncludes(unifiedAnalytics, 'buildAuthoritativeAnalyticsPayload(additionalData, {', 'analytics event wrapper authoritative payload usage');
  assertNotIncludes(unifiedAnalytics, '...additionalData', 'analytics event wrappers must not permit trailing context overrides');
  assertIncludes(unifiedAnalytics, 'normalizedSearchResults === 0', 'analytics zero-result classification uses validated count');
  assertNotIncludes(unifiedAnalytics, '(data.searchResults || 0) === 0', 'analytics malformed result count zero coercion');
  assertIncludes(unifiedAnalytics, "if (typeof window === 'undefined' || typeof window.gtag !== 'function'", 'analytics GA4 SSR guard');
  assertIncludes(unifiedAnalytics, 'buildGA4DefaultEventParameters(data)', 'analytics GA4 exact default projector');
  assertIncludes(unifiedAnalytics, 'if (!accepted) return;', 'analytics session milestone commit only after queue admission');
  assertNotIncludes(unifiedAnalytics, '...data,\n          timestamp:', 'analytics GA4 broad default serialization');
  assertIncludes(ga4Boundary, 'buildGA4DefaultEventParameters', 'analytics GA4 parameter allowlist');
  assertIncludes(ga4Boundary, 'normalizeGA4CommerceItems', 'analytics GA4 commerce item DTO boundary');
  assertIncludes(ga4Boundary, 'normalizeAnalyticsEnum(data.blockType, ANALYTICS_DECISION_BLOCK_TYPES)', 'analytics GA4 fixed enum boundary');
  assertNotIncludes(ga4Boundary, 'sessionId:', 'analytics GA4 internal session projection');
  assertIncludes(geoBoundary, 'toCoarseAnalyticsLocationKey', 'analytics coarse-location field-path boundary');
  assertIncludes(writePolicy, "const UNSAFE_ANALYTICS_PATH_SEGMENTS = new Set([", 'analytics object-meta path denylist');
  assertIncludes(writePolicy, "parts.some((part) => UNSAFE_ANALYTICS_PATH_SEGMENTS.has(part))", 'analytics object-meta path admission');
  assertNotIncludes(geoBoundary, 'geo_${roundedLat}_${roundedLng}', 'analytics dotted coordinate map key');
  assertNotIncludes(unifiedAnalytics, "SUBDOMAIN_MUTATION_BLOCKED = 'subdomain_mutation_blocked'", 'dead server-to-browser GA4 event');
  assertIncludes(analyticsDatabase, 'normalizeAnalyticsDashboardReadModel(', 'analytics persisted dashboard DTO boundary');
  assertIncludes(ownerDashboardDatabase, 'normalizeOBPDashboardReadModel(summarySnap.data(), tenantId, storeId)', 'OBP persisted dashboard DTO boundary');
  assertIncludes(ownerDashboardDatabase, 'normalizeOBPDailyReadDocument(docSnap.data(), {', 'OBP live daily DTO boundary');
  assertIncludes(ownerDashboardDatabase, 'normalizeAnalyticsScopeDocumentId(tId)', 'OBP tenant scope document ID boundary');
  assertIncludes(ownerDashboardDatabase, 'normalizeCustomerAppDashboardReadModel(summarySnap.data(), tenantId, storeId)', 'Customer App persisted dashboard DTO boundary');
  assertNotIncludes(ownerDashboardDatabase, 'summary: data.summary || null', 'Customer App raw summary projection');
  assertIncludes(customerAppDashboardHook, 'normalizeCustomerAppDashboardReadModel(value, tId, sId)', 'Customer App local cache DTO admission');
  assertIncludes(customerAppDashboardHook, 'removeCachedData(cacheKey);', 'Customer App invalid local cache eviction');
  assertNotIncludes(customerAppDashboardHook, 'getCachedData<T>', 'Customer App unchecked generic local cache read');
  assertIncludes(obpDashboardHook, 'normalizeScopedCache(cached, tId, sId, normalize)', 'OBP local cache scope/value admission');
  assertIncludes(obpDashboardHook, 'normalizeOBPDashboardCacheValue(value, tId!, sId!)', 'OBP settled local cache DTO admission');
  assertIncludes(obpDashboardHook, 'normalizeOBPTodayCacheValue', 'OBP Today local cache DTO admission');
  assertIncludes(obpDashboardHook, 'removeCachedData(cacheKey);', 'OBP invalid local cache eviction');
  assertIncludes(analyticsDatabase, "throw new Error('Invalid analytics dashboard read model');", 'analytics malformed dashboard failure');
  assertNotIncludes(analyticsDatabase, 'export const getDailyAnalyticsRange', 'analytics dead unbounded daily-range reader');
  assertNotIncludes(analyticsDatabase, 'export const getTopItems', 'analytics dead raw summary reader');
  assertIncludes(analyticsAggregation, 'yesterdayDoc.data, yesterdayStr', 'analytics settlement explicit idempotency date');
  assertNotIncludes(analyticsAggregation, "dailyData.date || new Date().toISOString().split('T')[0]", 'analytics UTC fallback idempotency date');
  assertIncludes(analyticsAggregation, 'const corrected = await db.runTransaction(async (transaction) => {', 'analytics atomic late correction');
  assertIncludes(analyticsAggregation, 'transaction.set(summaryRef, updates, { merge: true });', 'analytics late-correction summary transaction write');
  assertIncludes(analyticsAggregation, 'transaction.set(dashboardRef, {', 'analytics late-correction dashboard transaction write');
  assertNotIncludes(analyticsAggregation, 'const { updates, hasDelta } = buildLateCorrectionSummaryUpdates(currentDaily, previousRow, correctionDate);\n    if (!hasDelta) return false;\n\n    const updatedRows', 'analytics late correction must not calculate/write outside the transaction');
  assertIncludes(analyticsAggregation, 'summaryUpdated,', 'analytics manual trigger truthful summary acknowledgement');
  assertIncludes(analyticsAggregation, "const CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID = 'CUSTOMER_ANALYTICS_DAILY_CONTRACT_INVALID';", 'analytics invalid daily contract code');
  assertIncludes(analyticsAggregation, 'function normalizeAnalyticsDailyDocument(', 'analytics Functions daily DTO boundary');
  assertIncludes(analyticsAggregation, 'function assertValidAnalyticsSummaryForSettlement(', 'analytics Functions summary write DTO boundary');
  assertIncludes(analyticsAggregation, 'if (existingData) assertValidAnalyticsSummaryForSettlement(existingData, { projectId, sId, tId });', 'analytics summary validation before increment');
  assertIncludes(analyticsAggregation, 'assertValidAnalyticsSummaryForSettlement(summarySnap.data(), { projectId, sId, tId });', 'analytics late correction summary validation');
  assertIncludes(analyticsAggregation, 'assertValidAnalyticsDashboardIdentity(dashboardData, { projectId, sId, tId });', 'analytics late correction dashboard identity validation');
  assertIncludes(analyticsAggregation, "grain: 'summary',", 'analytics summary persisted identity');
  assertIncludes(analyticsAggregation, 'expected.docId !== getAnalyticsDocId.daily(expected.tId, expected.sId, expected.projectId, expected.date)', 'analytics Functions daily document identity boundary');
  assertIncludes(analyticsAggregation, 'const normalized = normalizeAnalyticsDailyDocument(data, {', 'analytics settlement query daily DTO admission');
  assertIncludes(analyticsAggregation, 'const currentDaily = normalizeAnalyticsDailyDocument(dailySnap.data(), {', 'analytics late-correction daily DTO admission');
  assertIncludes(analyticsAggregation, 'const normalizedDaily = dailyDoc.exists', 'analytics manual daily DTO admission');
  assertIncludes(analyticsAggregation, 'const previousRow = normalizeAnalyticsDailyMetrics(previousRowValue, correctionDate);', 'analytics late-correction baseline DTO admission');
  assertIncludes(analyticsAggregation, 'const hasValidDailyCache = dailyRows.length === rawDailyRows.length;', 'analytics rollup cache DTO completeness');
  assertIncludes(analyticsAggregation, 'const canUseCache = hasValidDailyCache', 'analytics invalid rollup cache fallback');
  assertNotIncludes(analyticsAggregation, 'normalizeManualAnalyticsProjectId', 'analytics duplicate loose manual project ID boundary');
  assertIncludes(analyticsAggregation, 'const ANALYTICS_CLEANUP_BATCH_SIZE = 400;', 'analytics bounded cleanup batch size');
  assertIncludes(analyticsAggregation, '.limit(ANALYTICS_CLEANUP_BATCH_SIZE)', 'analytics bounded cleanup query');
  assertIncludes(analyticsAggregation, 'const batch = db.batch();', 'analytics fresh cleanup batch');
  assertNotIncludes(analyticsAggregation, 'if (deleteCount % 500 === 0)', 'analytics reused committed cleanup batch');
  assertIncludes(dashboardAggregation, 'function isAnalyticsRow(', 'analytics dashboard compact-row DTO boundary');
  assertIncludes(dashboardAggregation, 'normalizedExistingRows.length === existingRows.length', 'analytics dashboard complete cache admission');
  assertIncludes(dashboardAggregation, "data.analyticsScope === 'customer'", 'analytics dashboard rebuild scope contract');
  assertIncludes(dashboardAggregation, 'doc.id === getAnalyticsDocId.daily(tId, sId, projectId, date)', 'analytics dashboard rebuild document identity');
  assertIncludes(dashboardAggregation, 'function normalizeAnalyticsSummaryRecord(', 'analytics dashboard summary DTO boundary');
  assertIncludes(dashboardAggregation, "throw new Error('CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID');", 'analytics invalid summary visible failure');
  assertIncludes(dashboardAggregation, 'function normalizeAnalyticsDashboardIdentity(', 'analytics dashboard embedded identity boundary');
  assertIncludes(dashboardAggregation, "throw new Error('CUSTOMER_ANALYTICS_DASHBOARD_CONTRACT_INVALID');", 'analytics invalid dashboard identity visible failure');
  assertIncludes(obpAggregation, 'function normalizeOBPDailyDocument(', 'OBP analytics daily DTO boundary');
  assertIncludes(obpAggregation, 'normalizedExistingRows.length === existingRows.length', 'OBP analytics complete compact cache admission');
  assertIncludes(obpAggregation, 'normalizeOBPDashboardIdentity(existingDashboardSnap.data(), tId, sId)', 'OBP analytics dashboard identity admission');
  assertIncludes(obpAggregation, 'throw new Error(OBP_ANALYTICS_DAILY_CONTRACT_INVALID);', 'OBP invalid daily visible failure');
  assertIncludes(obpAggregation, 'const corrected = await db.runTransaction(async (transaction) => {', 'OBP atomic late correction');
  assertIncludes(obpAggregation, 'transaction.set(summaryRef, updates, { merge: true });', 'OBP correction summary transaction write');
  assertIncludes(obpAggregation, 'transaction.set(dashboardRef, {', 'OBP correction dashboard transaction write');
  assertNotIncludes(obpAggregation, 'await Promise.all([\n        db.collection(DB_COLLECTIONS.ANALYTICS).doc(getAnalyticsDocId.summary', 'OBP independent correction writes');
  assertIncludes(obpAggregation, 'const summaryState = await db.runTransaction(async (transaction) => {', 'OBP atomic lifetime settlement');
  assertIncludes(obpAggregation, 'lastProcessedDate: lastProcessedDate > yesterdayStr ? lastProcessedDate : yesterdayStr,', 'OBP monotonic settlement date');
  assertIncludes(obpAggregation, 'assertValidOBPAnalyticsSummary(rawExistingData, tId, sId);', 'OBP summary contract before lifetime update');
  assertIncludes(obpAggregation, 'processedLifetimeDates: boundedProcessedLifetimeDates,', 'OBP bounded per-date lifetime idempotency ledger');
  assertIncludes(obpAggregation, 'if (latestSettledDate > yesterdayStr) return;', 'OBP dashboard out-of-order regression guard');
  assertIncludes(publicRoute, 'tenant?.active === false', 'analytics inactive tenant rejection');
  assertIncludes(publicRoute, 'tenant?.deleted === true', 'analytics deleted tenant rejection');
  assertIncludes(publicRoute, 'filterAnalyticsUpdateData(filterAnalyticsFieldsForPreferences(', 'analytics field policy before Admin write');
  assertIncludes(publicRoute, "import { normalizeAnalyticsDateKey } from '@lib/analytics/readBoundary';", 'analytics shared calendar-date boundary');
  assertIncludes(publicRoute, 'if (data.dateString && !normalizeAnalyticsDateKey(data.dateString))', 'analytics invalid calendar date rejection before target reads');
  assertIncludes(publicRoute, 'dateString > currentDate', 'analytics future public date rejection');
  assert(
    publicRoute.indexOf('if (data.dateString && !normalizeAnalyticsDateKey(data.dateString))')
      < publicRoute.indexOf('const validTarget = await validateAnalyticsTarget('),
    'analytics calendar date must fail before target Firestore reads',
  );
  assertNotIncludes(publicRoute, 'newestAcceptedDate', 'analytics future accepted date window');
  assertIncludes(publicRoute, 'deliveryId: z.string().regex(/^[a-z0-9]{32}$/)', 'public analytics delivery identity schema');
  assertIncludes(publicRoute, 'deliveryId: data.deliveryId', 'public analytics delivery identity forwarding');
  assertIncludes(serverWrite, 'const policyData = filterAnalyticsUpdateData(updateData);', 'Admin analytics shared field policy');
  assertIncludes(serverWrite, 'DB_COLLECTIONS.ANALYTICS_DELIVERY_RECEIPTS', 'public analytics durable delivery receipt collection');
  assertIncludes(serverWrite, 'return firestoreAdmin.runTransaction(async (transaction) => {', 'public analytics atomic receipt/counter transaction');
  assertIncludes(serverWrite, "if (receiptSnapshot.exists) return { status: 'duplicate' as const };", 'public analytics exact delivery replay');
  assertIncludes(serverWrite, 'transaction.create(receiptRef, {', 'public analytics delivery receipt creation');
  assertIncludes(serverWrite, 'date: analyticsDateKey,', 'Admin analytics UI date compatibility field');
  assertIncludes(serverWrite, 'localDate: analyticsDateKey,', 'Admin analytics settlement date field');
  assertIncludes(rules, 'match /analyticsDeliveryReceipts/{receiptId}', 'analytics delivery receipt server-only rules boundary');
  assertIncludes(analyticsHook, 'return `analytics:${type}:${JSON.stringify(parts)}`;', 'analytics collision-safe browser cache key');
  assertIncludes(analyticsHook, 'const cached = getCachedData<unknown>', 'analytics local cache enters as unknown');
  assertIncludes(analyticsHook, 'normalizeAnalyticsData,', 'analytics local cache uses its DTO boundary');
  assertIncludes(analyticsHook, 'removeCachedData(cacheKey);', 'analytics malformed local cache is evicted');
  assertNotIncludes(analyticsHook, 'getCachedData<T>', 'analytics hook must not trust generic local-cache data');
  assertNotIncludes(analyticsHook, 'parts.filter(Boolean).join', 'analytics ambiguous browser cache key');
  assert(
    packageJson.scripts['verify:analytics-write-boundary'] === 'node scripts/verification/verify-analytics-write-boundary.js && npm run test:analytics:browser-boundary && npm run test:analytics:normalizer && npm run test:analytics:admin-write && npm run test:analytics:owner-action-receipts && npm run test:analytics:rules',
    'package.json must expose verify:analytics-write-boundary',
  );
  assert(
    packageJson.scripts['test:analytics:browser-boundary']?.includes('scripts/verification/test-analytics-browser-boundary.ts'),
    'package.json must expose test:analytics:browser-boundary',
  );
  assert(
    packageJson.scripts['test:analytics:normalizer']?.includes('scripts/verification/test-analytics-normalizer.ts'),
    'package.json must expose test:analytics:normalizer',
  );
  assert(
    packageJson.scripts['test:analytics:admin-write']?.includes('scripts/verification/test-analytics-admin-write-emulator.ts'),
    'package.json must expose test:analytics:admin-write',
  );
  assert(
    packageJson.scripts['test:analytics:owner-action-receipts']?.includes('scripts/verification/test-owner-action-receipt-transaction-emulator.ts'),
    'package.json must expose test:analytics:owner-action-receipts',
  );
  assert(
    packageJson.scripts['test:analytics:rules']?.includes('scripts/verification/test-analytics-rules.ts'),
    'package.json must expose test:analytics:rules',
  );
  assert(
    packageJson.scripts['test:analytics:settlement']?.includes('scripts/verification/test-analytics-settlement-emulator.ts'),
    'package.json must expose test:analytics:settlement',
  );
}

verifyRuntimePolicy();
verifySourceBoundaries();
process.stdout.write('Analytics write boundary verification passed.\n');
