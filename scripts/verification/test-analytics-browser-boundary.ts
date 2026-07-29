import {
  normalizeAnalyticsAttributeFilterState,
  normalizeAnalyticsSessionMilestoneState,
  normalizeStoredAnalyticsEntrySource,
} from '../../src/lib/analytics/browserState';
import {
  ANALYTICS_QUEUE_MAX_ENTRIES,
  getAnalyticsQueueKey,
  mergeAnalyticsUpdateData,
  normalizePersistedAnalyticsQueue,
  subtractFlushedAnalyticsData,
} from '../../src/lib/analytics/queueBoundary';
import type { AnalyticsWriteValue } from '../../src/lib/analytics/writePolicy';
import { buildGA4DefaultEventParameters, normalizeGA4CommerceItems } from '../../src/lib/analytics/ga4Boundary';
import {
  ANALYTICS_DECISION_BLOCK_TYPES,
  buildAuthoritativeAnalyticsPayload,
  normalizeAnalyticsCount,
  normalizeAnalyticsEnum,
} from '../../src/lib/analytics/eventPayload';
import { toCoarseAnalyticsLocationKey } from '../../src/lib/analytics/geo';
import { filterAnalyticsUpdateData } from '../../src/lib/analytics/writePolicy';
import { getSearchDedupStorageKey } from '../../src/lib/analytics/searchDedup';
import { clearSession, getSessionId, refreshSession } from '../../src/lib/analytics/session';
import { withAnalyticsSource } from '../../src/lib/analytics/sourceAttribution';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  withAnalyticsSource('/menu?campaign=summer#offers', 'obp')
    === '/menu?campaign=summer&entry_source=obp#offers',
  'analytics source must be inserted before the URL fragment',
);
assert(
  withAnalyticsSource('https://example.com/menu#offers', 'qr')
    === 'https://example.com/menu?entry_source=qr#offers',
  'absolute analytics source URLs must preserve fragments',
);
const malformedAnalyticsUrl = 'https://[invalid/menu#offers';
assert(
  withAnalyticsSource(malformedAnalyticsUrl, 'obp') === malformedAnalyticsUrl,
  'unparseable analytics URLs must remain byte-identical after bounded diagnostics',
);

const now = new Date('2026-07-11T12:00:00.000Z');
const validQueued = {
  tenantId: '1',
  storeId: '101',
  projectId: 'project_1',
  dateString: '2026-07-11',
  storeTimeZone: 'UTC',
  businessDayEndTime: '03:00',
  deliveryId: 'a'.repeat(32),
  updateData: {
    totalViews: 2,
    'viewsByDevice.mobile': 2,
    unknownMetric: 99,
  },
  eventCount: 2,
};

const restored = normalizePersistedAnalyticsQueue([
  ['forged-cross-scope-key', validQueued],
], now);
assert(restored.length === 1, 'valid persisted analytics queue entry must be restored');
assert(
  restored[0].queueKey === getAnalyticsQueueKey('1', '101', 'project_1', '2026-07-11'),
  'persisted analytics queue key must be recomputed from canonical scope',
);
assert(restored[0].updateData.totalViews === 2, 'valid persisted counter must survive');
assert(!('unknownMetric' in restored[0].updateData), 'unknown persisted counter must be dropped');

const invalidEntries = [
  ['bad-tenant', { ...validQueued, tenantId: '01' }],
  ['bad-store', { ...validQueued, storeId: '-1' }],
  ['bad-project', { ...validQueued, projectId: 'project/1' }],
  ['future-date', { ...validQueued, dateString: '2026-07-12' }],
  ['stale-date', { ...validQueued, dateString: '2026-07-09' }],
  ['bad-count', { ...validQueued, eventCount: '2' }],
  ['bad-retry', { ...validQueued, retryCount: -1 }],
  ['bad-delivery', { ...validQueued, deliveryId: 'not-a-delivery-id' }],
  ['empty-policy', { ...validQueued, updateData: { unknownMetric: 1 } }],
];
assert(
  normalizePersistedAnalyticsQueue(invalidEntries, now).length === 0,
  'malformed persisted analytics queue entries must fail closed',
);

const tooWideUpdateData = Object.fromEntries(
  Array.from({ length: 101 }, (_, index) => [`searchTerms.term_${index}`, 1]),
);
assert(
  normalizePersistedAnalyticsQueue([
    ['too-wide', { ...validQueued, updateData: tooWideUpdateData }],
  ], now).length === 0,
  'persisted analytics queue entries wider than the route contract must fail closed',
);

const manyEntries = Array.from({ length: ANALYTICS_QUEUE_MAX_ENTRIES + 5 }, (_, index) => [
  `forged-${index}`,
  { ...validQueued, projectId: `project_${index}` },
]);
assert(
  normalizePersistedAnalyticsQueue(manyEntries, now).length === ANALYTICS_QUEUE_MAX_ENTRIES,
  'persisted analytics queue restoration must remain bounded',
);

const duplicateScope = normalizePersistedAnalyticsQueue([
  ['first', validQueued],
  ['second', { ...validQueued, updateData: { totalViews: 999 } }],
], now);
assert(duplicateScope.length === 1, 'duplicate canonical persisted scopes must not amplify counters');
assert(duplicateScope[0].updateData.totalViews === 2, 'first canonical persisted scope must remain authoritative');

const merged: Record<string, AnalyticsWriteValue> = {
  totalViews: 2,
  'itemNames.item_1': 'Lunch',
};
mergeAnalyticsUpdateData(merged, {
  totalViews: 3,
  totalClicks: 1,
  'itemNames.item_1': 'Lunch Special',
});
assert(merged.totalViews === 5, 'queued numeric counters must merge additively');
assert(merged.totalClicks === 1, 'new queued numeric counters must survive');
assert(merged['itemNames.item_1'] === 'Lunch Special', 'latest queued label must win');

const remaining = subtractFlushedAnalyticsData(
  {
    totalViews: 5,
    totalClicks: 1,
    'itemNames.item_1': 'Lunch Special',
    'itemNames.item_2': 'Dinner',
  },
  {
    totalViews: 2,
    totalClicks: 1,
    'itemNames.item_1': 'Lunch',
  },
);
assert(remaining.totalViews === 3, 'in-flight numeric events must remain after snapshot drain');
assert(!('totalClicks' in remaining), 'delivered numeric counter must be drained');
assert(
  remaining['itemNames.item_1'] === 'Lunch Special',
  'a label changed during an in-flight flush must remain queued',
);
assert(remaining['itemNames.item_2'] === 'Dinner', 'new in-flight label must remain queued');

const milestone = normalizeAnalyticsSessionMilestoneState({
  menuSession: true,
  engaged: 'true',
  itemIds: ['item_1', 'bad/item', ...Array.from({ length: 15 }, (_, index) => `item_${index + 2}`)],
  viewedItemIds: 'not-an-array',
  languageSessions: ['en', 'EN', 'hi', 'bad language'],
});
assert(milestone?.menuSession === true, 'valid stored milestone flag must survive');
assert(milestone?.engaged === undefined, 'non-boolean stored milestone flag must be rejected');
assert(milestone?.itemIds?.length === 10, 'stored milestone item IDs must be valid, unique, and bounded');
assert(milestone?.viewedItemIds === undefined, 'malformed stored milestone arrays must be rejected');
assert(milestone?.languageSessions?.join(',') === 'en,hi', 'stored languages must be canonical and bounded');
assert(normalizeAnalyticsSessionMilestoneState(true) === null, 'non-object milestone state must fail closed');

assert(normalizeStoredAnalyticsEntrySource('whatsapp') === 'whatsapp', 'known stored entry source must survive');
assert(normalizeStoredAnalyticsEntrySource('forged_source') === null, 'unknown stored entry source must fail closed');

const authoritativePayload = buildAuthoritativeAnalyticsPayload(
  {
    projectId: 'forged-project',
    storeId: '999',
    searchTerm: 'forged term',
    searchResults: 999,
    sessionId: 'allowed-context',
  },
  {
    projectId: 'obp',
    storeId: '101',
    searchTerm: 'lunch',
    searchResults: 3,
  },
);
assert(authoritativePayload.projectId === 'obp', 'explicit analytics project must outrank caller context');
assert(authoritativePayload.storeId === '101', 'explicit analytics store must outrank caller context');
assert(authoritativePayload.searchTerm === 'lunch', 'explicit analytics event value must outrank caller context');
assert(authoritativePayload.searchResults === 3, 'explicit analytics result count must outrank caller context');
assert(authoritativePayload.sessionId === 'allowed-context', 'non-authoritative analytics context must survive');
assert(normalizeAnalyticsCount(0) === 0, 'zero analytics count must survive');
assert(normalizeAnalyticsCount(-1) === undefined, 'negative analytics count must fail closed');
assert(normalizeAnalyticsCount(1.5) === undefined, 'fractional analytics count must fail closed');
assert(normalizeAnalyticsCount(Number.NaN) === undefined, 'non-finite analytics count must fail closed');
assert(
  normalizeAnalyticsEnum('popular', ANALYTICS_DECISION_BLOCK_TYPES) === 'popular',
  'known analytics enum value must survive',
);
assert(
  normalizeAnalyticsEnum('forged', ANALYTICS_DECISION_BLOCK_TYPES) === undefined,
  'unknown analytics enum value must fail closed',
);

const filter = normalizeAnalyticsAttributeFilterState({
  filter: 'veg',
  label: `  Vegetarian\u0000 ${'x'.repeat(150)}  `,
  selectedAt: 123,
});
assert(filter?.filter === 'veg', 'known stored attribute filter must survive');
assert(filter?.label?.length === 120, 'stored attribute-filter label must be cleaned and bounded');
assert(filter?.selectedAt === 123, 'valid stored attribute-filter timestamp must survive');
assert(
  normalizeAnalyticsAttributeFilterState({ filter: 'forged', label: 'Anything' }) === null,
  'unknown stored attribute filter must fail closed',
);

const ga4Parameters = buildGA4DefaultEventParameters({
  sessionId: 'private-session',
  tenantId: 'private-tenant',
  businessDayEndTime: '03:00',
  arbitrarySecret: 'must-not-leave-browser',
  storeId: '101',
  projectId: 'project_1',
  menuAction: 'whatsapp',
  itemName: '  Lunch\u0000 Special  ',
  searchResults: Number.NaN,
  itemId: Number.POSITIVE_INFINITY,
  blockType: 'forged',
  blocksShown: ['popular', 'popular', 'quickPick'],
}, '2026-07-11T12:00:00.000Z');
assert(ga4Parameters.store_id === '101', 'allowed GA4 store scope must survive');
assert(ga4Parameters.project_id === 'project_1', 'allowed GA4 project scope must survive');
assert(ga4Parameters.item_name === 'Lunch Special', 'GA4 text must be cleaned');
assert(
  Array.isArray(ga4Parameters.blocks_shown) && ga4Parameters.blocks_shown.join(',') === 'popular,quickPick',
  'GA4 string arrays must be deduplicated and bounded',
);
for (const blockedKey of ['sessionId', 'tenantId', 'businessDayEndTime', 'arbitrarySecret']) {
  assert(!(blockedKey in ga4Parameters), `GA4 default parameters must omit ${blockedKey}`);
}
assert(!('search_results_count' in ga4Parameters), 'GA4 non-finite numbers must be rejected');
assert(!('item_id' in ga4Parameters), 'GA4 non-finite numeric identifiers must be rejected');
assert(!('block_type' in ga4Parameters), 'GA4 unknown fixed enum values must be rejected');

const commerceItems = normalizeGA4CommerceItems([
  null,
  'bad',
  { item_id: 'item_1', item_name: ' Lunch\u0000 ', price: 10, quantity: 2, currency: 'inr' },
  { arbitrary: 'drop' },
  { itemId: 'item_2', price: -1, quantity: Number.POSITIVE_INFINITY },
]);
assert(commerceItems.length === 2, 'GA4 commerce items must admit only identified object rows');
assert(commerceItems[0].item_name === 'Lunch', 'GA4 commerce item text must be cleaned');
assert(commerceItems[0].currency === 'INR', 'GA4 commerce currency must be canonical');
assert(!('price' in commerceItems[1]), 'GA4 negative commerce prices must be rejected');
assert(!('quantity' in commerceItems[1]), 'GA4 non-finite commerce quantities must be rejected');

const coarseLocationKey = toCoarseAnalyticsLocationKey(19.076, 72.878);
assert(coarseLocationKey === 'geo_191_729', 'coarse analytics location must use integer tenths');
assert(
  filterAnalyticsUpdateData({ [`viewsByLocation.${coarseLocationKey}`]: 1 })[`viewsByLocation.${coarseLocationKey}`] === 1,
  'coarse analytics location key must survive the Firestore write policy',
);
assert(toCoarseAnalyticsLocationKey(Number.NaN, 72.878) === null, 'non-finite latitude must fail closed');
assert(toCoarseAnalyticsLocationKey(91, 72.878) === null, 'out-of-range latitude must fail closed');
assert(
  getSearchDedupStorageKey(1, 101, 'project_1') === 'menulist_search_terms_1_101_project_1',
  'search de-duplication storage must include tenant, store, and project scope',
);
assert(
  getSearchDedupStorageKey(2, 101, 'project_1') !== getSearchDedupStorageKey(1, 101, 'project_1'),
  'same-store-ID search sessions must remain isolated across tenants',
);
assert(getSearchDedupStorageKey(0, 101, 'project_1') === null, 'invalid search de-duplication scope must fail closed');

const searchPolicy = filterAnalyticsUpdateData({
  'searchTerms.chicken biryani': 1,
  'zeroResultSearchTerms.हिंदी खाना': 1,
  'searchTerms.bad.term': 1,
  'searchTerms.<script>': 1,
  'decisionBlocksRendered.forged': 1,
  'menuActionClicks.forged': 1,
  'viewsByEntrySource.forged': 1,
  'installsByPlatform.forged': 1,
  'hourlyViews.99': 1,
  'viewsByItem.constructor': 1,
  'itemNames.prototype': 'forged',
  'hourlyClicksByItem.__proto__.12': 1,
  'decisionBlocksRendered.popular': 1,
  'menuActionClicks.whatsapp': 1,
  'viewsByEntrySource.qr': 1,
  'installsByPlatform.ios': 1,
  'hourlyViews.23': 1,
});
assert(searchPolicy['searchTerms.chicken biryani'] === 1, 'multi-word search term must survive write policy');
assert(searchPolicy['zeroResultSearchTerms.हिंदी खाना'] === 1, 'non-Latin search term must survive write policy');
assert(!('searchTerms.bad.term' in searchPolicy), 'dotted search term must fail closed');
assert(!('searchTerms.<script>' in searchPolicy), 'unsafe search term must fail closed');
for (const rejectedKey of [
  'decisionBlocksRendered.forged',
  'menuActionClicks.forged',
  'viewsByEntrySource.forged',
  'installsByPlatform.forged',
  'hourlyViews.99',
  'viewsByItem.constructor',
  'itemNames.prototype',
  'hourlyClicksByItem.__proto__.12',
]) {
  assert(!(rejectedKey in searchPolicy), `${rejectedKey} must fail its semantic key policy`);
}
for (const acceptedKey of [
  'decisionBlocksRendered.popular',
  'menuActionClicks.whatsapp',
  'viewsByEntrySource.qr',
  'installsByPlatform.ios',
  'hourlyViews.23',
]) {
  assert(searchPolicy[acceptedKey] === 1, `${acceptedKey} must survive its semantic key policy`);
}

class AnalyticsSessionStorageMock {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const analyticsSessionStorage = new AnalyticsSessionStorageMock();
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: analyticsSessionStorage,
});
const storedSessionId = '11111111-1111-4111-8111-111111111111';
analyticsSessionStorage.setItem('menulist_session_id', storedSessionId);
analyticsSessionStorage.setItem('menulist_session_timestamp', String(Date.now()));
assert(getSessionId() === storedSessionId, 'canonical active analytics session must be reused');

analyticsSessionStorage.setItem('menulist_session_id', 'attacker-controlled');
analyticsSessionStorage.setItem('menulist_session_timestamp', String(Date.now()));
assert(
  getSessionId() !== 'attacker-controlled',
  'malformed persisted analytics session ID must be replaced',
);

analyticsSessionStorage.setItem('menulist_session_id', storedSessionId);
analyticsSessionStorage.setItem('menulist_session_timestamp', '1e3');
assert(getSessionId() !== storedSessionId, 'coercible analytics timestamp must be rejected');

analyticsSessionStorage.setItem('menulist_session_id', storedSessionId);
analyticsSessionStorage.setItem('menulist_session_timestamp', String(Date.now() + 60_000));
assert(getSessionId() !== storedSessionId, 'future analytics timestamp must be rejected');

analyticsSessionStorage.setItem('menulist_session_id', 'attacker-controlled');
analyticsSessionStorage.setItem('menulist_session_timestamp', String(Date.now()));
refreshSession();
assert(
  analyticsSessionStorage.getItem('menulist_session_id') === null
  && analyticsSessionStorage.getItem('menulist_session_timestamp') === null,
  'refresh must evict a malformed analytics session envelope',
);
clearSession();

process.stdout.write('Analytics browser boundary tests passed.\n');
