import assert from 'node:assert/strict';
import { computeIntelligenceState, parseMenuIntelligenceState, type MenuIntelligenceState } from '../../functions/src/intelligence/menuIntelligence';
import {
    parseAggregatedAnalytics,
    parseIntelligenceSnapshot,
    type AggregatedAnalytics,
} from '../../functions/src/intelligence/shared/analyticsAggregator';
import { extractActiveItems } from '../../functions/src/intelligence/shared/itemExtractor';
import { projectPublicDecisionBlocks } from '../../src/lib/decisionBlocks/publicProjection';
import {
    getQuickPickThreshold,
    isQuickPickEnabledForCategory,
    compareDecisionScores,
} from '../../functions/src/intelligence/shared/scoreNormalizer';

function analytics(overrides: Partial<AggregatedAnalytics> = {}): AggregatedAnalytics {
    return {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        clicksByItem: {},
        viewsByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        itemNames: {},
        daysWithData: 0,
        source: 'intelligence_7d',
        ...overrides,
    };
}

const project = {
    files: [{
        extractedData: {
            data: {
                items: [
                    {
                        id: 'current-item',
                        extractionIdAliases: ['old-item', ' current-item ', ''],
                        name: { en: 'Current item' },
                        category: 'main',
                        price: '₹120',
                        duration: 0,
                        ownerBoost: 99,
                    },
                    {
                        id: 'inactive-item',
                        active: false,
                        name: { en: 'Inactive item' },
                    },
                ],
            },
        },
    }],
};

const extracted = extractActiveItems(project, analytics({
    totalViews: 1007,
    totalClicks: 13,
    viewsByItem: { 'current-item': 7, 'old-item': 8, 'deleted-item': 992 },
    clicksByItem: { 'current-item': 4, 'old-item': 5, 'deleted-item': 4 },
    recommendationClicksByItem: { 'old-item': 2, 'deleted-item': 30 },
    hourlyClicksByItem: {
        'current-item': { '7': 1 },
        'old-item': { '7': 2, '12': 3 },
        'deleted-item': { '20': 100 },
    },
}));

assert.equal(extracted.length, 1, 'analytics-only and inactive item IDs must not become scoreable');
assert.equal(extracted[0].itemId, 'current-item');
assert.equal(extracted[0].views, 15, 'current and retained alias views must be merged');
assert.equal(extracted[0].clicks, 9, 'current and retained alias clicks must be merged');
assert.equal(extracted[0].decisionBlockClicks, 2);
assert.deepEqual(extracted[0].hourlyClicks, { '7': 3, '12': 3 });
assert.equal(extracted[0].duration, 0, 'zero is a valid explicit duration');
assert.equal(extracted[0].price, 120);
assert.equal(extracted[0].ownerBoost, 20, 'owner boost must stay within the scoring boundary');

assert.throws(() => extractActiveItems({
    files: [{ extractedData: { data: { items: [
        { id: 'duplicate-item', name: 'First' },
        { id: 'duplicate-item', name: 'Second' },
    ] } } }],
}, analytics()), /decision_intelligence_duplicate_catalog_item/,
'duplicate current catalog IDs must not resolve by file/item order');
assert.throws(() => extractActiveItems({
    files: [{ extractedData: { data: { items: [{
        id: 'overflow-item',
        extractionIdAliases: ['overflow-alias'],
        name: 'Overflow',
    }] } } }],
}, analytics({
    viewsByItem: { 'overflow-item': Number.MAX_SAFE_INTEGER, 'overflow-alias': 1 },
})), /decision_intelligence_analytics_counter_overflow/,
'alias aggregation must not persist unsafe integer counters');

const negativePriceItem = extractActiveItems({
    files: [{ extractedData: { data: { items: [{ id: 'negative-price', name: { en: 'Invalid price' }, price: '-₹25' }] } } }],
}, analytics())[0];
assert.equal(negativePriceItem.price, 0, 'negative prices must not become positive during currency normalization');

const prototypeBefore = Object.getPrototypeOf({});
const unsafeItems = extractActiveItems({
    files: [{
        extractedData: {
            data: {
                items: [
                    { id: '__proto__', name: { en: 'Unsafe proto' } },
                    { id: 'constructor', name: { en: 'Unsafe constructor' } },
                    { id: 'prototype', name: { en: 'Unsafe prototype' } },
                    { id: `overlong-${'x'.repeat(513)}`, name: { en: 'Overlong' } },
                ],
            },
        },
    }],
}, analytics());
assert.deepEqual(unsafeItems, [], 'prototype-sensitive and overlong IDs must not reach dynamic score maps');
assert.equal(Object.getPrototypeOf({}), prototypeBefore, 'item extraction must not mutate object prototypes');

const boundedExtraction = extractActiveItems({
    files: [{ extractedData: { data: { items: [{ id: 'bounded', name: 'x'.repeat(600) }] } } }],
}, analytics({
    viewsByItem: { bounded: 1.5 },
    hourlyClicksByItem: { bounded: { '07': 2, '7bad': 9, '25': 4, '12': 1.5 } },
}))[0];
assert.equal(boundedExtraction.itemName.length, 500, 'derived audit names must stay within the persisted contract');
assert.equal(boundedExtraction.views, 0, 'fractional analytics counters must not enter persisted scoring state');
assert.deepEqual(boundedExtraction.hourlyClicks, { '7': 2 }, 'hour keys and counts must be canonical and bounded');

assert.throws(
    () => computeIntelligenceState(
        [{ ...extracted[0], itemId: '__proto__' }],
        analytics(),
        null,
        { tId: '1', sId: '2', projectId: 'unsafe' },
    ),
    /menu_intelligence_invalid_item_set/,
    'the computation boundary must independently reject unsafe item IDs',
);
assert.throws(
    () => computeIntelligenceState(
        [{ ...extracted[0], views: -1 }],
        analytics(),
        null,
        { tId: '1', sId: '2', projectId: 'unsafe-count' },
    ),
    /menu_intelligence_invalid_item_set/,
    'the computation boundary must reject malformed extracted counters',
);
assert.throws(
    () => computeIntelligenceState(
        [extracted[0]],
        analytics({ totalViews: -1 }),
        null,
        { tId: '1', sId: '2', projectId: 'unsafe-analytics' },
    ),
    /menu_intelligence_invalid_analytics/,
    'the computation boundary must reject malformed typed analytics',
);
assert.throws(
    () => computeIntelligenceState([extracted[0]], analytics(), null, { tId: '1', sId: '2', projectId: 'bad/id' }),
    /menu_intelligence_invalid_identity/,
);
assert.throws(
    () => computeIntelligenceState([extracted[0]], analytics(), null, { tId: '1', sId: '2', projectId: '😀'.repeat(400) }),
    /menu_intelligence_invalid_identity/,
    'the composite document ID must remain within the Firestore byte boundary',
);
assert.throws(
    () => computeIntelligenceState([extracted[0]], analytics({ lastSettledLocalDate: '2026-02-31' }), null, { tId: '1', sId: '2', projectId: 'menu' }),
    /menu_intelligence_invalid_analytics_date/,
);
assert.throws(
    () => computeIntelligenceState([extracted[0], extracted[0]], analytics(), null, { tId: '1', sId: '2', projectId: 'menu' }),
    /menu_intelligence_invalid_item_set/,
);

assert.equal(isQuickPickEnabledForCategory('food'), true);
assert.equal(isQuickPickEnabledForCategory('specialty'), true);
assert.equal(isQuickPickEnabledForCategory('retail'), false);
assert.equal(isQuickPickEnabledForCategory('health'), false);
assert.equal(getQuickPickThreshold('food'), 10);
assert.equal(getQuickPickThreshold('specialty'), 20);
assert.equal(getQuickPickThreshold('unknown'), 10, 'unknown categories use the shared food fallback');
const tiedScores = [
    { item: { itemId: 'z-item' }, score: 0.5 },
    { item: { itemId: 'a-item' }, score: 0.5 },
];
assert.deepEqual([...tiedScores].sort(compareDecisionScores).map((entry) => entry.item.itemId), ['a-item', 'z-item'],
    'equal public Decision Block scores must use a binary item-ID tie-break');

const intelligenceItem = {
    ...extracted[0],
    views: 50,
    clicks: 10,
    decisionBlockClicks: 0,
    hourlyClicks: { '7': 1, '12': 19 },
};
const dayOneAnalytics = analytics({
    totalViews: 50,
    totalClicks: 20,
    daysWithData: 7,
    clicksByItem: { 'current-item': 10 },
    viewsByItem: { 'current-item': 50 },
    lastSettledLocalDate: '2026-07-14',
});
const identity = { tId: '1', sId: '2', projectId: 'menu' };
const dayOne = computeIntelligenceState([intelligenceItem], dayOneAnalytics, null, identity);
assert.ok(parseMenuIntelligenceState(dayOne, '1_2_menu'), 'current computed state must re-enter through the persisted-state projector');
assert.equal(parseMenuIntelligenceState({ ...dayOne, extra: true }, '1_2_menu'), null);
assert.equal(parseMenuIntelligenceState({ ...dayOne, tId: '9' }, '1_2_menu'), null);
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    itemConfidence: {
        ...dayOne.itemConfidence,
        'current-item': { ...dayOne.itemConfidence['current-item'], score: 2 },
    },
}, '1_2_menu'), null);
assert.equal(parseMenuIntelligenceState({ ...dayOne, computedAt: new Date() }, '1_2_menu'), null);
assert.equal(parseMenuIntelligenceState({ ...dayOne, lastAnalyticsDate: '2026-02-31' }, '1_2_menu'), null);
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    itemConfidence: {
        ...dayOne.itemConfidence,
        'current-item': {
            ...dayOne.itemConfidence['current-item'],
            trend: { toString: () => 'stable' },
        },
    },
}, '1_2_menu'), null, 'enum-like objects must not pass persisted discriminators through string coercion');
assert.equal(parseMenuIntelligenceState({ ...dayOne, stabilityModeReason: undefined }, '1_2_menu'), null,
    'stability mode and its reason must remain coherent');
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    projectCalibration: { ...dayOne.projectCalibration, lockedAt: dayOne.computedAt },
}, '1_2_menu'), null, 'unlocked calibration must not retain a lock timestamp');
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    healthSummary: { ...dayOne.healthSummary!, topItemId: undefined, topItemDays: 1 },
}, '1_2_menu'), null, 'top-item continuity requires a current rank-one item');
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    statsUsed: { ...dayOne.statsUsed, itemsWithViews: 0 },
}, '1_2_menu'), null, 'persisted view coverage must match projected confidence evidence');
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    recentAuditLog: [{
        action: 'AUTO_PROMOTE',
        timestamp: dayOne.computedAt,
        reversible: true,
        reversed: false,
        reason: {
            primary: 'malformed counter',
            factors: {
                clicks7d: -1,
                pageViews7d: 10,
                engagementRate: 0.1,
                decisionBlockClicks7d: 0,
                ownerBoost: 0,
                isBestSeller: false,
                stableDays: 1,
            },
        },
    }],
}, '1_2_menu'), null, 'negative audit counters must fail the persisted-state projector');
assert.equal(parseMenuIntelligenceState({
    ...dayOne,
    recentAuditLog: [{
        action: 'AUTO_PROMOTE',
        timestamp: dayOne.computedAt,
        reversible: true,
        reversed: true,
        reason: {
            primary: 'missing reversal timestamp',
            factors: {
                clicks7d: 1,
                pageViews7d: 10,
                engagementRate: 0.1,
                decisionBlockClicks7d: 0,
                ownerBoost: 0,
                isBestSeller: false,
                stableDays: 1,
            },
        },
    }],
}, '1_2_menu'), null, 'reversed audit entries require a reversal timestamp');
assert.equal(dayOne.daysSinceCreation, 1);
assert.equal(dayOne.itemConfidence['current-item'].stableDays, 1);
assert.equal(dayOne.timeEligibility['current-item'].breakfast, false, 'a click below 10% does not make a slot eligible');
assert.equal(dayOne.timeEligibility['current-item'].lunch, true);
assert.throws(
    () => computeIntelligenceState(
        [intelligenceItem],
        dayOneAnalytics,
        { ...dayOne, tId: '9' },
        identity,
    ),
    /menu_intelligence_invalid_persisted_state/,
    'a direct typed caller must not inject prior state from another document identity',
);

const sameDay = computeIntelligenceState([intelligenceItem], dayOneAnalytics, dayOne, identity);
assert.equal(sameDay.daysSinceCreation, 1, 'manual reruns of one settled date must not age calibration');
assert.equal(sameDay.itemConfidence['current-item'].stableDays, 1, 'manual reruns must not mature confidence');
assert.equal(sameDay.healthSummary?.topItemDays, dayOne.healthSummary?.topItemDays);

const nextDay = computeIntelligenceState(
    [intelligenceItem],
    { ...dayOneAnalytics, lastSettledLocalDate: '2026-07-15' },
    sameDay,
    identity,
);
assert.equal(nextDay.daysSinceCreation, 2);
assert.equal(nextDay.itemConfidence['current-item'].stableDays, 2);

assert.throws(
    () => computeIntelligenceState(
        [intelligenceItem],
        { ...dayOneAnalytics, lastSettledLocalDate: '2026-07-14' },
        nextDay,
        identity,
    ),
    /menu_intelligence_out_of_order_analytics/,
    'a backdated replay must fail before it can regress maturity or current evidence',
);

const fatigueState: MenuIntelligenceState = {
    ...nextDay,
    runCount: 5,
    daysSinceCreation: 5,
    lastAnalyticsDate: '2026-07-15',
    suppressionWindows: {},
    itemConfidence: {
        'current-item': {
            ...nextDay.itemConfidence['current-item'],
            score: 0.8,
            trend: 'stable',
            stableDays: 5,
        },
    },
};
const fatigued = computeIntelligenceState(
    [{ ...intelligenceItem, views: 10, clicks: 0 }],
    analytics({
        totalViews: 10,
        daysWithData: 7,
        viewsByItem: { 'current-item': 10 },
        lastSettledLocalDate: '2026-07-16',
    }),
    fatigueState,
    identity,
);
assert.equal(fatigued.itemConfidence['current-item'].trend, 'falling');
assert.equal(fatigued.suppressionWindows['current-item']?.reason, 'fatigue', 'fatigue must use the stable streak before the falling day');

const noSettledDate = computeIntelligenceState([intelligenceItem], analytics(), null, identity);
assert.equal(noSettledDate.healthSummary?.topItemDays, 0, 'missing analytics must not create a settled top-item day');
assert.ok(parseMenuIntelligenceState(noSettledDate, '1_2_menu'));

const tiedItems = ['z-item', 'a-item', 'm-item'].map((itemId) => ({
    ...intelligenceItem,
    itemId,
    itemName: itemId,
    views: 40,
    clicks: 4,
}));
const tiedAnalytics = analytics({ totalViews: 120, totalClicks: 12, daysWithData: 7, lastSettledLocalDate: '2026-07-14' });
const tiedForward = computeIntelligenceState(tiedItems, tiedAnalytics, null, identity);
const tiedReverse = computeIntelligenceState([...tiedItems].reverse(), tiedAnalytics, null, identity);
assert.deepEqual(tiedForward.previousItemRanks, { 'a-item': 1, 'm-item': 2, 'z-item': 3 });
assert.deepEqual(tiedReverse.previousItemRanks, tiedForward.previousItemRanks,
    'equal priority ranks must not depend on catalog input order');

const inheritedPriorityMap = Object.assign(
    Object.create({ 'q-item': 1 }) as Record<string, number>,
    tiedForward.itemPriority,
);
const inheritedPriorityState: MenuIntelligenceState = {
    ...tiedForward,
    itemPriority: inheritedPriorityMap,
};
assert.ok(parseMenuIntelligenceState(inheritedPriorityState, '1_2_menu'),
    'the projector should normalize valid own fields without retaining inherited map values');
const inheritedPriorityReplay = computeIntelligenceState(
    [...tiedItems, { ...intelligenceItem, itemId: 'q-item', itemName: 'q-item', views: 40, clicks: 4 }],
    analytics({ totalViews: 160, totalClicks: 16, daysWithData: 7, lastSettledLocalDate: '2026-07-15' }),
    inheritedPriorityState,
    identity,
);
assert.ok(Math.abs(inheritedPriorityReplay.itemPriority['q-item'] - 0.59) < 1e-12,
    'computation must use the normalized projection rather than inherited values from the caller object');

const emptySettled = computeIntelligenceState([], analytics({
    daysWithData: 7,
    lastSettledLocalDate: '2026-07-14',
}), null, identity);
assert.equal(emptySettled.healthSummary?.topItemDays, 0, 'an empty project has no top-item continuity day');
assert.ok(parseMenuIntelligenceState(emptySettled, '1_2_menu'));

const intelligenceSnapshot = {
    tId: '1',
    sId: '2',
    projectId: 'menu',
    kind: 'analyticsIntelligence7d',
    startDate: '2026-07-08',
    endDate: '2026-07-14',
    lastSettledLocalDate: '2026-07-14',
    totalViews: 50,
    totalClicks: 10,
    totalSessions: 8,
    viewsByItem: { 'current-item': 50 },
    clicksByItem: { 'current-item': 10 },
    recommendationClicksByItem: { 'current-item': 2 },
    hourlyClicksByItem: { 'current-item': { '07': 2, '12': 8 } },
    itemNames: { 'current-item': 'Current item' },
    daysWithData: 7,
};
assert.equal(parseAggregatedAnalytics({
    ...analytics(),
    source: { toString: () => 'intelligence_7d' },
}), null, 'analytics source must be an exact primitive discriminator');
const parsedSnapshot = parseIntelligenceSnapshot(intelligenceSnapshot, {
    tId: '1', sId: '2', projectId: 'menu', lastSettledLocalDate: '2026-07-14',
});
assert.ok(parsedSnapshot, 'the current compact analytics writer shape must pass its consumer projector');
assert.deepEqual(parsedSnapshot.hourlyClicksByItem['current-item'], { '7': 2, '12': 8 });
assert.equal(parseIntelligenceSnapshot({ ...intelligenceSnapshot, sId: '3' }, {
    tId: '1', sId: '2', projectId: 'menu', lastSettledLocalDate: '2026-07-14',
}), null, 'snapshot identity must bind to the requested tenant/store/project');
assert.equal(parseIntelligenceSnapshot({ ...intelligenceSnapshot, totalViews: -1 }, {
    tId: '1', sId: '2', projectId: 'menu', lastSettledLocalDate: '2026-07-14',
}), null, 'negative analytics totals must fail closed');
assert.equal(parseIntelligenceSnapshot({
    ...intelligenceSnapshot,
    clicksByItem: JSON.parse('{"__proto__": 3}'),
}, {
    tId: '1', sId: '2', projectId: 'menu', lastSettledLocalDate: '2026-07-14',
}), null, 'prototype-sensitive analytics map keys must fail closed');
assert.equal(parseIntelligenceSnapshot({
    ...intelligenceSnapshot,
    hourlyClicksByItem: { 'current-item': { '7': 1, '07': 2 } },
}, {
    tId: '1', sId: '2', projectId: 'menu', lastSettledLocalDate: '2026-07-14',
}), null, 'duplicate normalized hour keys must fail closed');

const projectionNow = Date.parse('2026-07-21T00:00:00.000Z');
const rawPublicBlocks = {
    tId: '1',
    sId: '2',
    projectId: 'menu',
    popular: [{
        itemId: 'current-item',
        itemName: 'Current item',
        category: 'main',
        score: 0.8,
        reason: 'decision.popular.default.popular',
        price: 120,
    }],
    quickPick: [],
    bestValue: [],
    computedAt: new Date(projectionNow - 60_000),
    validUntil: new Date(projectionNow + 60_000),
    statsUsed: {
        totalItems: 1,
        itemsWithViews: 1,
        itemsWithDuration: 0,
        totalViews: 50,
        totalClicks: 10,
        itemsWithClicks: 1,
        itemsWithPrice: 1,
        durationCoverage: 0,
        priceCoverage: 1,
        daysWithData: 7,
    },
};
const publicBlocks = projectPublicDecisionBlocks(rawPublicBlocks, identity, projectionNow);
assert.deepEqual(publicBlocks?.popular, [{
    itemId: 'current-item',
    reason: 'decision.popular.default.popular',
}], 'the public projection must omit score and duplicated catalog fields');
assert.equal(projectPublicDecisionBlocks({ ...rawPublicBlocks, privateDebug: 'secret' }, identity, projectionNow), null,
    'unknown top-level fields must never cross the public server/client boundary');
assert.equal(projectPublicDecisionBlocks({ ...rawPublicBlocks, sId: '3' }, identity, projectionNow), null,
    'the embedded projection must bind to the resolved tenant/store/project');
assert.equal(projectPublicDecisionBlocks({ ...rawPublicBlocks, validUntil: new Date(projectionNow - 1) }, identity, projectionNow), null,
    'expired projections must remain unavailable');

console.log('Decision Intelligence and CMI boundary tests passed');
